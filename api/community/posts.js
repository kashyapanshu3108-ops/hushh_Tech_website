import { listCommunityPosts, setCommunityCacheHeaders } from "./content-service.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const posts = await listCommunityPosts();
  setCommunityCacheHeaders(res);
  res.status(200).json({
    posts: posts.map(({ bodyMarkdown, bodyHtml, ...post }) => post),
  });
}
