import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { google } from "googleapis";
import { STATIC_COMMUNITY_POSTS } from "./staticPosts.generated.js";

const PROJECT_ID =
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCP_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  "";

const CONTENT_BACKEND = (process.env.COMMUNITY_CONTENT_BACKEND || "static").trim().toLowerCase();
const COLLECTION = process.env.COMMUNITY_CONTENT_COLLECTION || "community_posts";
const BUCKET = process.env.COMMUNITY_CONTENT_BUCKET || "";
const CACHE_SECONDS = Number.parseInt(process.env.COMMUNITY_CONTENT_CACHE_SECONDS || "300", 10);

const LOCAL_ASSET_ALLOWLIST = new Set(
  STATIC_COMMUNITY_POSTS.map((post) => post.pdfUrl).filter(Boolean).map((pdfUrl) =>
    pdfUrl.replace(/^\/+/, ""),
  ),
);

const auth = new google.auth.GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

const isGcpEnabled = () => CONTENT_BACKEND === "gcp" && Boolean(PROJECT_ID && COLLECTION);

const fieldValue = (field) => {
  if (!field) return undefined;
  if ("stringValue" in field) return field.stringValue;
  if ("integerValue" in field) return Number.parseInt(field.integerValue, 10);
  if ("doubleValue" in field) return Number(field.doubleValue);
  if ("booleanValue" in field) return Boolean(field.booleanValue);
  if ("timestampValue" in field) return field.timestampValue;
  if ("arrayValue" in field) {
    return (field.arrayValue.values || []).map(fieldValue);
  }
  if ("mapValue" in field) {
    return Object.fromEntries(
      Object.entries(field.mapValue.fields || {}).map(([key, value]) => [key, fieldValue(value)]),
    );
  }
  return undefined;
};

const communityAssetUrl = (objectName) =>
  `/api/community/assets/${encodeURIComponent(String(objectName).replace(/^\/+/, "")).replace(/%2F/g, "/")}`;

const mediaTypeFor = (value) => (/\.(mp4|mov|webm)$/i.test(value || "") ? "video" : "image");

const normalizeMediaItems = (items) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      const value = typeof item === "string" ? { object: item } : item || {};
      const objectName = value.object || value.assetObject || "";
      const suppliedUrl = typeof value.url === "string" ? value.url : "";
      const url = objectName
        ? communityAssetUrl(objectName)
        : suppliedUrl.startsWith("/api/community/assets/")
          ? suppliedUrl
          : "";

      if (!url) return null;

      return {
        name: value.name || objectName.split("/").pop() || `media-${index + 1}`,
        url,
        type: value.type || mediaTypeFor(objectName || url),
        alt: value.alt || "",
      };
    })
    .filter(Boolean);
};

const firestoreDocToPost = (doc) => {
  const fields = doc.fields || {};
  return normalizePost({
    slug: fieldValue(fields.slug) || doc.name?.split("/").pop(),
    title: fieldValue(fields.title),
    publishedAt: fieldValue(fields.publishedAt),
    description: fieldValue(fields.description),
    category: fieldValue(fields.category),
    accessLevel: fieldValue(fields.accessLevel) || "Public",
    status: fieldValue(fields.status) || "published",
    sourceKind: fieldValue(fields.sourceKind) || "article",
    bodyMarkdown: fieldValue(fields.bodyMarkdown),
    bodyHtml: fieldValue(fields.bodyHtml),
    contentObject: fieldValue(fields.contentObject),
    assetObject: fieldValue(fields.assetObject),
    assetUrl: fieldValue(fields.assetUrl),
    mediaItems: fieldValue(fields.mediaItems),
  });
};

export const normalizePost = (post) => {
  const sourceKind = post.sourceKind || (post.pdfUrl ? "document" : "legacy");
  const assetUrl =
    post.assetUrl ||
    (post.pdfUrl ? `/api/community/assets/public/${encodeURIComponent(post.pdfUrl.replace(/^\/+/, ""))}` : "");

  return {
    id: post.slug,
    slug: post.slug,
    title: post.title,
    date: post.publishedAt || post.date,
    publishedAt: post.publishedAt || post.date,
    description: post.description || "",
    category: post.category || "general",
    accessLevel: post.accessLevel || "Public",
    status: post.status || "published",
    sourceKind,
    componentName: post.componentName || "",
    contentObject: post.contentObject || "",
    assetObject: post.assetObject || "",
    assetUrl,
    mediaItems: normalizeMediaItems(post.mediaItems),
    bodyMarkdown: post.bodyMarkdown || "",
    bodyHtml: post.bodyHtml || "",
  };
};

const publicPublished = (post) => post.accessLevel === "Public" && post.status !== "draft";

export const staticPosts = () =>
  STATIC_COMMUNITY_POSTS.map(normalizePost)
    .filter(publicPublished)
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));

const getAuthHeaders = async () => {
  const client = await auth.getClient();
  return client.getRequestHeaders();
};

const fetchJson = async (url) => {
  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GCP content request failed with HTTP ${response.status}`);
  }
  return response.json();
};

const fetchGcsText = async (objectName) => {
  if (!BUCKET || !objectName) return "";
  const encodedObject = encodeURIComponent(objectName);
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}/o/${encodedObject}?alt=media`;
  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });
  if (!response.ok) return "";
  return response.text();
};

export const listCommunityPosts = async () => {
  if (!isGcpEnabled()) return staticPosts();

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}`;
    const data = await fetchJson(url);
    const posts = (data.documents || [])
      .map(firestoreDocToPost)
      .filter(publicPublished)
      .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));

    return posts.length ? posts : staticPosts();
  } catch (error) {
    console.error("[community] Falling back to static post snapshot:", error.message);
    return staticPosts();
  }
};

export const getCommunityPost = async (slug) => {
  if (!slug) return null;

  if (isGcpEnabled()) {
    try {
      const encodedSlug = encodeURIComponent(slug).replace(/%2F/g, "%2F");
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${encodedSlug}`;
      const data = await fetchJson(url);
      const post = firestoreDocToPost(data);

      if (!publicPublished(post)) return null;
      if (!post.bodyMarkdown && post.contentObject) {
        post.bodyMarkdown = await fetchGcsText(post.contentObject);
      }
      if (!post.assetUrl && post.assetObject) {
        post.assetUrl = `/api/community/assets/${encodeURIComponent(post.assetObject).replace(/%2F/g, "/")}`;
      }
      return post;
    } catch (error) {
      console.error("[community] Falling back to static post detail:", error.message);
    }
  }

  return staticPosts().find((post) => post.slug === slug) || null;
};

export const setCommunityCacheHeaders = (res) => {
  const maxAge = Number.isFinite(CACHE_SECONDS) && CACHE_SECONDS >= 0 ? CACHE_SECONDS : 300;
  res.setHeader("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${maxAge}`);
};

export const streamCommunityAsset = async (req, res) => {
  const rawObject = req.params?.[0] || req.params?.object || "";
  const objectName = decodeURIComponent(rawObject).replace(/^\/+/, "");

  if (objectName.startsWith("public/")) {
    const fileName = objectName.slice("public/".length);
    if (!LOCAL_ASSET_ALLOWLIST.has(fileName)) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }

    const distPath = join(process.cwd(), "dist", fileName);
    const publicPath = join(process.cwd(), "public", fileName);
    const filePath = existsSync(distPath) ? distPath : publicPath;
    const normalized = normalize(filePath);
    if (!existsSync(normalized)) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }

    res.setHeader("Content-Type", extname(fileName).toLowerCase() === ".pdf" ? "application/pdf" : "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=3600");
    createReadStream(normalized).pipe(res);
    return;
  }

  if (!BUCKET || !objectName) {
    res.status(404).json({ error: "Asset not configured" });
    return;
  }

  const encodedObject = encodeURIComponent(objectName);
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}/o/${encodedObject}?alt=media`;
  const headers = await getAuthHeaders();
  const upstream = await fetch(url, { headers });
  if (!upstream.ok || !upstream.body) {
    res.status(upstream.status).json({ error: "Asset not found" });
    return;
  }

  res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
  res.setHeader("Cache-Control", "public, max-age=3600");
  const reader = upstream.body.getReader();
  const pump = async () => {
    const { done, value } = await reader.read();
    if (done) {
      res.end();
      return;
    }
    res.write(Buffer.from(value));
    await pump();
  };
  await pump();
};
