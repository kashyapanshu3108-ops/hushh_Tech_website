/**
 * Community Post — Logic / ViewModel
 * Slug parsing, post lookup, NDA access check, loading state.
 * UI stays in post-ui.tsx — zero rendering here.
 */
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@chakra-ui/react";
import { getPostBySlug, getPostBySlugOrComponentName, PostData } from "../../data/posts";
import { useAuthSession } from "../../auth/AuthSessionProvider";
import { checkAccessStatus } from "../../services/access/accessControlApi";
import {
  fetchCommunityPost,
  type CommunityPostDetail,
} from "../../services/communityContent";

export const useCommunityPostLogic = () => {
  const { "*": slug } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { session, status } = useAuthSession();
  const toastShownRef = useRef<Record<string, boolean>>({});

  const [post, setPost] = useState<CommunityPostDetail | null>(null);
  const [legacyPost, setLegacyPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);

  /** Show a toast only once per key to avoid duplicates */
  const showToastOnce = (id: string, options: any) => {
    if (!toastShownRef.current[id]) {
      toast(options);
      toastShownRef.current[id] = true;
    }
  };

  useEffect(() => {
    const loadPost = async () => {
      setLoading(true);
      setLegacyPost(null);
      const activeSlug = slug || "";
      let gcpPost: CommunityPostDetail | null = null;
      const foundPost = getPostBySlug(activeSlug);
      try {
        gcpPost = await fetchCommunityPost(activeSlug);
      } catch (error) {
        console.error("Error loading community post:", error);
      }

      if (gcpPost) {
        setPost(gcpPost);
        setLegacyPost(getPostBySlugOrComponentName(activeSlug, gcpPost.componentName) || null);
        setLoading(false);
        return;
      }

      /* post not found */
      if (!foundPost) {
        showToastOnce(`post-not-found-${activeSlug}`, {
          title: "Post Not Found",
          description: `The post with slug "${activeSlug}" was not found.`,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
        navigate("/community");
        return;
      }

      /* NDA-protected post — verify access */
      if (foundPost.accessLevel === "NDA") {
        if (status === "booting") {
          return;
        }

        if (status !== "authenticated" || !session?.access_token) {
          showToastOnce("access-restricted-no-session", {
            title: "Access Restricted",
            description:
              "You must be logged in and complete the NDA process to view confidential posts.",
            status: "error",
            duration: 4000,
            isClosable: true,
          });
          navigate("/community");
          return;
        }

        try {
          const response = await checkAccessStatus(session.access_token);

          if (response !== "Approved") {
            showToastOnce("access-restricted-nda", {
              title: "Access Restricted",
              description:
                "You are not approved to view this confidential post. Please complete the NDA process.",
              status: "error",
              duration: 4000,
              isClosable: true,
            });
            navigate("/community");
            return;
          }
        } catch (error) {
          console.error("Error checking NDA status:", error);
          showToastOnce("access-error-nda", {
            title: "Error",
            description:
              "Error checking NDA access status. Please try again later.",
            status: "error",
            duration: 4000,
            isClosable: true,
          });
          navigate("/community");
          return;
        }
      }

      /* all checks passed */
      setPost({
        id: foundPost.slug,
        slug: foundPost.slug,
        title: foundPost.title,
        date: foundPost.publishedAt,
        publishedAt: foundPost.publishedAt,
        description: foundPost.description,
        category: foundPost.category,
        accessLevel: foundPost.accessLevel,
        status: "published",
        sourceKind: foundPost.pdfUrl ? "document" : "legacy",
        assetUrl: foundPost.pdfUrl
          ? `/api/community/assets/public/${encodeURIComponent(foundPost.pdfUrl.replace(/^\/+/, ""))}`
          : undefined,
        mediaItems: foundPost.mediaItems?.map((item, index) => {
          if (typeof item === "string") {
            return {
              name: item.split("/").pop() || `media-${index + 1}`,
              url: `/api/community/assets/${encodeURIComponent(item).replace(/%2F/g, "/")}`,
              type: /\.(mp4|mov|webm)$/i.test(item) ? "video" : "image",
            };
          }

          const objectName = item.object || item.assetObject;
          const sameOriginAssetUrl = item.url?.startsWith("/api/community/assets/")
            ? item.url
            : "";
          return {
            name: item.name || objectName?.split("/").pop() || `media-${index + 1}`,
            url:
              sameOriginAssetUrl ||
              (objectName
                ? `/api/community/assets/${encodeURIComponent(objectName).replace(/%2F/g, "/")}`
                : ""),
            type: item.type || (/\.(mp4|mov|webm)$/i.test(objectName || item.url || "") ? "video" : "image"),
            alt: item.alt,
          };
        }).filter((item) => item.url),
      });
      setLegacyPost(foundPost);
      setLoading(false);
    };

    void loadPost();
  }, [navigate, session?.access_token, slug, status, toast]);

  const handleBack = () => navigate("/community");

  return {
    post,
    legacyPost,
    loading,
    handleBack,
  };
};
