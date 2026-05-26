/**
 * Community List — Logic / ViewModel
 * All state, API calls, filtering, search, NDA workflow.
 * UI stays in ui.tsx — zero rendering here.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@chakra-ui/react";
import { getPosts, PostData } from "../../data/posts";
import { formatShortDate, parseDate } from "../../utils/dateFormatter";
import { useAuthSession } from "../../auth/AuthSessionProvider";
import {
  checkAccessStatus,
  getNdaMetadata,
} from "../../services/access/accessControlApi";
import {
  trackSearchEvent,
  trackSiteEvent,
} from "../../services/analytics/siteAnalytics";
import {
  fetchCommunityPosts,
  type CommunityPostSummary,
} from "../../services/communityContent";

/* ── Constants ── */
export const NDA_OPTION = "Sensitive Documents (NDA approval Req.)";
export const MARKET_UPDATES_OPTION = "Market Updates";
export const PINNED_SLUGS = [
  "general/ai-powered-berkshire-hathaway",
  "general/sell-the-wall-featured",
];

/* ── Types ── */
export interface UnifiedPost {
  id: string;
  title: string;
  date: string;
  slug: string;
  description?: string;
  category?: string;
}

/* ── Helpers ── */
export const toTitleCase = (s: string) =>
  s.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.substr(1).toLowerCase());

export const getPostDescription = (post: UnifiedPost): string => {
  if (post.description) return post.description;

  if (
    post.title.toLowerCase().includes("ai") ||
    post.title.toLowerCase().includes("artificial intelligence")
  ) {
    return "Exploring how artificial intelligence is revolutionizing portfolio management and risk assessment in modern financial markets.";
  } else if (post.title.toLowerCase().includes("market")) {
    return "Our latest analysis of market trends and investment opportunities in the current economic climate.";
  } else if (
    post.title.toLowerCase().includes("review") ||
    post.title.toLowerCase().includes("performance")
  ) {
    return "Comprehensive review of performance metrics and strategic adjustments for optimal results.";
  }
  return "Stay informed with our latest market insights, research findings, and company updates.";
};

export const formatDisplayDate = (dateStr: string): string =>
  formatShortDate(dateStr).toUpperCase();

export const getPostUrl = (post: UnifiedPost): string => {
  return `/community/${post.slug}`;
};

/* ── Hook ── */
export const useCommunityListLogic = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const mountRef = useRef(true);
  const lastTrackedSearchRef = useRef("");
  const { session } = useAuthSession();

  /* local posts */
  const localPosts = useMemo<PostData[]>(() => getPosts(), []);

  /* Public GCP-backed community posts */
  const [publicPosts, setPublicPosts] = useState<CommunityPostSummary[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  /* UI state */
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [ndaApproved, setNdaApproved] = useState(false);
  const [showNdaModal, setShowNdaModal] = useState(false);
  const [showNdaDocModal, setShowNdaDocModal] = useState(false);
  const [ndaMetadata, setNdaMetadata] = useState<any>(null);
  const [ndaLoading, setNdaLoading] = useState(false);

  /* fetch public community posts through the same-origin Cloud Run API */
  useEffect(() => {
    const fetchPosts = async () => {
      setApiLoading(true);
      setApiError(null);
      try {
        setPublicPosts(await fetchCommunityPosts());
      } catch (err: any) {
        console.error(err);
        setPublicPosts([]);
        setApiError(err.message || "Failed to fetch community posts");
      } finally {
        setApiLoading(false);
        mountRef.current = false;
      }
    };
    if (mountRef.current) fetchPosts();
  }, []);

  /* category lists */
  const ndaPosts = useMemo(
    () => localPosts.filter((p) => p.accessLevel === "NDA"),
    [localPosts]
  );

  const categories = useMemo(() => {
    const cats = Array.from(new Set(publicPosts.map((p) => p.category)));
    return cats.filter(
      (c) => !["market", "market updates"].includes(c.trim().toLowerCase())
    );
  }, [publicPosts]);

  const dropdownOptions = useMemo(
    () => ["All", ...categories, MARKET_UPDATES_OPTION, NDA_OPTION],
    [categories]
  );

  /* combine + sort all posts */
  const allContentSorted = useMemo<UnifiedPost[]>(() => {
    return publicPosts.map((p) => ({
      id: p.slug,
      title: p.title,
      date: p.publishedAt || p.date,
      slug: p.slug,
      description:
        p.description ||
        getPostDescription({ id: p.slug, title: p.title, date: p.publishedAt || p.date }),
      category: p.category,
    })).sort((a, b) => {
      const da = parseDate(a.date)?.getTime() || 0;
      const db = parseDate(b.date)?.getTime() || 0;
      return db - da;
    });
  }, [publicPosts]);

  /* pinning */
  const pinnedAllContent = useMemo<UnifiedPost[]>(() => {
    const orderMap = new Map(PINNED_SLUGS.map((slug, idx) => [slug, idx]));
    const pinned: UnifiedPost[] = [];
    const rest: UnifiedPost[] = [];

    allContentSorted.forEach((post) => {
      const order = orderMap.get(post.slug || post.id);
      if (order !== undefined) {
        pinned[order] = post;
      } else {
        rest.push(post);
      }
    });
    return [...pinned.filter(Boolean), ...rest];
  }, [allContentSorted]);

  /* filtered content */
  const filteredContent = useMemo(() => {
    let dataToSearch = pinnedAllContent;

    if (selectedCategory === NDA_OPTION) {
      if (!ndaApproved) return [];
      dataToSearch = ndaPosts.map((p) => ({
        id: p.slug,
        title: p.title,
        date: p.publishedAt,
        slug: p.slug,
        description:
          p.description ||
          getPostDescription({ id: p.slug, title: p.title, date: p.publishedAt }),
        category: p.category,
      }));
    } else if (selectedCategory === MARKET_UPDATES_OPTION) {
      dataToSearch = pinnedAllContent.filter(
        (p) =>
          p.category?.toLowerCase().includes("market") ||
          p.slug?.toLowerCase().includes("market")
      );
    } else if (selectedCategory !== "All") {
      dataToSearch = pinnedAllContent.filter(
        (p) => p.category === selectedCategory
      );
    }

    if (!searchQuery.trim()) return dataToSearch;

    const query = searchQuery.toLowerCase();
    return dataToSearch.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(query);
      const descMatch = (item.description || "").toLowerCase().includes(query);
      const categoryMatch = (item.category || "").toLowerCase().includes(query);
      return titleMatch || descMatch || categoryMatch;
    });
  }, [searchQuery, selectedCategory, pinnedAllContent, ndaPosts, ndaApproved]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      lastTrackedSearchRef.current = "";
      return;
    }

    const trackingKey = `${selectedCategory}:${query.toLowerCase()}`;
    if (lastTrackedSearchRef.current === trackingKey) return;

    const timeoutId = window.setTimeout(() => {
      lastTrackedSearchRef.current = trackingKey;
      void trackSearchEvent(
        "community",
        query,
        filteredContent.length,
        "/community"
      );
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [filteredContent.length, searchQuery, selectedCategory]);

  /* NDA check */
  const checkNda = useCallback(async () => {
    if (!session) {
      toast({ title: "Please sign in to view the files", status: "error" });
      return false;
    }
    setNdaLoading(true);
    try {
      const status = await checkAccessStatus(session.access_token);
      if (status === "Approved") {
        setNdaApproved(true);
        return true;
      }
      if (status === "Pending: Waiting for NDA Process") {
        const meta = await getNdaMetadata(session.access_token);
        setNdaMetadata(meta.metadata);
        setShowNdaDocModal(true);
        return false;
      }
      toast({ title: status, status: "error" });
      return false;
    } catch (e: any) {
      toast({ title: e.message || "NDA check failed", status: "error" });
      return false;
    } finally {
      setNdaLoading(false);
    }
  }, [session, toast]);

  /* category change handler */
  const onCategoryChange = useCallback(
    async (cat: string) => {
      if (cat === NDA_OPTION) {
        const ok = await checkNda();
        if (!ok) return;
      }
      void trackSiteEvent("community_filter_selected", {
        routePath: "/community",
        routeGroup: "community",
        properties: {
          surface: "community",
          category: cat,
        },
      });
      setSelectedCategory(cat);
    },
    [checkNda]
  );

  const handleBackClick = useCallback(() => navigate(-1), [navigate]);
  const handlePostClick = useCallback((post: UnifiedPost) => {
    void trackSiteEvent("community_result_clicked", {
      routePath: "/community",
      routeGroup: "community",
      properties: {
        surface: "community",
        category: post.category || "unknown",
        result: selectedCategory === NDA_OPTION ? "local-nda-post" : "gcp-community-post",
      },
    });
  }, [selectedCategory]);

  return {
    /* data */
    filteredContent,
    dropdownOptions,
    apiLoading,
    apiError,
    /* UI state */
    selectedCategory,
    searchQuery,
    setSearchQuery,
    ndaApproved,
    showNdaModal,
    setShowNdaModal,
    showNdaDocModal,
    setShowNdaDocModal,
    ndaMetadata,
    ndaLoading,
    session,
    /* actions */
    onCategoryChange,
    handleBackClick,
    handlePostClick,
    setNdaApproved,
    /* helpers (re-exported for UI) */
    getPostDescription,
    formatDisplayDate,
    getPostUrl,
    toTitleCase,
    /* constants */
    NDA_OPTION,
  };
};
