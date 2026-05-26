import { getCommunityPost, setCommunityCacheHeaders } from "./content-service.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const slug = req.params?.slug || req.params?.[0] || req.query?.slug || "";
  const post = await getCommunityPost(slug);
  if (!post) {
    res.status(404).json({ error: "Community post not found" });
    return;
  }

  setCommunityCacheHeaders(res);
  res.status(200).json({ post });
}
