export interface CommunityMediaItem {
  name?: string;
  url: string;
  type?: "image" | "video";
  alt?: string;
}

export interface CommunityPostSummary {
  id: string;
  slug: string;
  title: string;
  date: string;
  publishedAt: string;
  description: string;
  category: string;
  accessLevel: string;
  status: string;
  sourceKind: "article" | "deck" | "document" | "legacy" | string;
  componentName?: string;
  assetUrl?: string;
  mediaItems?: CommunityMediaItem[];
}

export interface CommunityPostDetail extends CommunityPostSummary {
  bodyMarkdown?: string;
  bodyHtml?: string;
}

export const fetchCommunityPosts = async (
  fetcher: typeof fetch = fetch,
): Promise<CommunityPostSummary[]> => {
  const response = await fetcher("/api/community/posts", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Community posts request failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { posts?: CommunityPostSummary[] };
  return payload.posts || [];
};

export const fetchCommunityPost = async (
  slug: string,
  fetcher: typeof fetch = fetch,
): Promise<CommunityPostDetail | null> => {
  const encodedSlug = slug.split("/").map(encodeURIComponent).join("/");
  const response = await fetcher(`/api/community/posts/${encodedSlug}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Community post request failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { post?: CommunityPostDetail };
  return payload.post || null;
};
