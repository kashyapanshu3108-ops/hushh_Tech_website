import { describe, expect, it, vi } from "vitest";
import postsHandler from "../api/community/posts.js";
import postDetailHandler from "../api/community/post-detail.js";
import { normalizePost } from "../api/community/content-service.js";

const createRes = () => {
  const res: any = {
    statusCode: 200,
    headers: new Map<string, string>(),
    payload: undefined,
    setHeader: vi.fn((key: string, value: string) => {
      res.headers.set(key, value);
    }),
    status: vi.fn((statusCode: number) => {
      res.statusCode = statusCode;
      return res;
    }),
    json: vi.fn((payload: unknown) => {
      res.payload = payload;
      return res;
    }),
  };
  return res;
};

describe("community API routes", () => {
  it("returns public community posts from the Cloud Run API fallback", async () => {
    const res = createRes();

    await postsHandler({ method: "GET" } as any, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.posts.length).toBeGreaterThan(0);
    expect(res.payload.posts[0]).not.toHaveProperty("bodyMarkdown");
    expect(res.payload.posts.some((post: any) => post.slug === "general/the-perpetual-alpha-engine")).toBe(true);
  });

  it("returns a post detail by slash slug", async () => {
    const res = createRes();

    await postDetailHandler(
      {
        method: "GET",
        params: { 0: "general/the-perpetual-alpha-engine" },
      } as any,
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.post).toMatchObject({
      slug: "general/the-perpetual-alpha-engine",
      title: "The Perpetual Alpha Engine",
      accessLevel: "Public",
      sourceKind: "deck",
    });
  });

  it("normalizes media object names to same-origin community asset URLs", () => {
    const post = normalizePost({
      slug: "market/hushh-market-update-7-april",
      title: "Hushh Market Update - 7 April",
      publishedAt: "2025-04-07",
      mediaItems: [
        "market-updates/dmu7apr/1.png",
        {
          object: "market-updates/dmu7apr/m2.png",
          alt: "Momentum chart",
        },
      ],
    });

    expect(post.mediaItems).toEqual([
      {
        name: "1.png",
        url: "/api/community/assets/market-updates/dmu7apr/1.png",
        type: "image",
        alt: "",
      },
      {
        name: "m2.png",
        url: "/api/community/assets/market-updates/dmu7apr/m2.png",
        type: "image",
        alt: "Momentum chart",
      },
    ]);
  });
});
