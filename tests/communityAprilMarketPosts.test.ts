// @vitest-environment jsdom

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChakraProvider } from "@chakra-ui/react";
import { describe, expect, it, vi } from "vitest";

import { getPostBySlug, getPostBySlugOrComponentName } from "../src/data/posts";

const communityPostState = vi.hoisted(() => ({
  value: {
    post: null,
    legacyPost: null,
    loading: false,
    handleBack: () => undefined,
  } as any,
}));

vi.mock("../src/pages/community/post-logic", () => ({
  useCommunityPostLogic: () => communityPostState.value,
}));

vi.mock("../src/components/hushh-tech-back-header/HushhTechBackHeader", () => ({
  default: () => React.createElement("header", null, "Back"),
}));

vi.mock("../src/components/hushh-tech-footer/HushhTechFooter", () => ({
  HushhFooterTab: { COMMUNITY: "community" },
  default: () => React.createElement("footer", null, "Community footer"),
}));

import CommunityPostPage from "../src/pages/community/post-ui";
import {
  getMarketUpdateMediaItems,
  getMarketUpdateMediaObjects,
} from "../src/content/marketUpdateMedia";

const renderLegacyPost = (slug: string) => {
  const post = getPostBySlug(slug);
  if (!post || typeof post.Component === "string") {
    throw new Error(`Expected renderable legacy post for ${slug}`);
  }

  const originalConsoleError = console.error;
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((message, ...args) => {
    if (typeof message === "string" && message.includes("useLayoutEffect does nothing on the server")) {
      return;
    }
    originalConsoleError(message, ...args);
  });

  try {
    return renderToStaticMarkup(
      React.createElement(
        ChakraProvider,
        null,
        React.createElement(post.Component),
      ),
    );
  } finally {
    consoleErrorSpy.mockRestore();
  }
};

describe("April market community posts", () => {
  it.each([
    ["dmu2apr", 10],
    ["dmu3apr", 14],
    ["dmu4apr", 9],
    ["dmu7apr", 11],
    ["dmu8apr", 20],
    ["dmu9apr", 7],
    ["dmu10apr", 6],
    ["dmu11apr", 8],
    ["dmu15apr", 5],
    ["dmu16apr", 17],
    ["dmu17apr", 8],
  ])("has a verified GCP media manifest for %s", (date, count) => {
    const objects = getMarketUpdateMediaObjects(date);
    const items = getMarketUpdateMediaItems(date);

    expect(objects).toHaveLength(count);
    expect(items).toHaveLength(count);
    expect(items.every((item) => item.url.startsWith("/api/community/assets/market-updates/"))).toBe(true);
    expect(items.every((item) => !item.url.includes("supabase.co"))).toBe(true);
  });

  it.each([
    ["market/hushh-market-update-2-april", 10],
    ["market/hushh-market-update-3-april", 14],
    ["market/market-updates-4th-april", 9],
    ["market/hushh-market-update-7-april", 11],
    ["market/hushh-market-update-8-april", 20],
    ["market/hushh-market-update-9-april", 7],
    ["daily-market-update/10-apr-2025", 6],
    ["daily-market-update/11-apr-2025", 8],
    ["daily-market-update/15-apr-2025", 5],
    ["daily-market-update/16-apr-2025", 17],
    ["daily-market-update/17-apr-2025", 8],
  ])("exposes April mediaItems metadata for %s", (slug, count) => {
    const post = getPostBySlug(slug);

    expect(post?.mediaItems).toHaveLength(count);
    expect(post?.mediaItems?.every((item) => typeof item === "string")).toBe(true);
  });

  it("resolves static legacy API metadata to local components by componentName", () => {
    expect(getPostBySlugOrComponentName("missing-slug", "Dmu17apr")).toMatchObject({
      slug: "daily-market-update/17-apr-2025",
      title: "Daily Market Update - 17th April",
    });
  });

  it.each([
    {
      slug: "market/hushh-market-update-9-april",
      body: "Market update with supporting charts and data for April 9, 2025.",
    },
    {
      slug: "market/hushh-market-update-7-april",
      body: "We rolled over 60 walls of pain and locked in 256K in aloha income",
    },
    {
      slug: "market/hushh-market-update-3-april",
      body: "single biggest drawdown day from our high water mark",
    },
    {
      slug: "daily-market-update/17-apr-2025",
      body: "Internal review and investor communication for the Aloha Alpha Fund",
    },
    {
      slug: "daily-market-update/16-apr-2025",
      body: "Internal review and investor communication for the Aloha Alpha Fund",
    },
    {
      slug: "daily-market-update/15-apr-2025",
      body: "Internal review and investor communication for the Aloha Alpha Fund",
    },
    {
      slug: "daily-market-update/11-apr-2025",
      body: "Weekly Market Summary",
    },
  ])("renders non-empty detail content for $slug", ({ slug, body }) => {
    expect(renderLegacyPost(slug)).toContain(body);
  });

  it.each([
    ["market/hushh-market-update-9-april", "Daily Market Snapshot - April 9, 2025"],
    ["market/hushh-market-update-7-april", "Daily Market Snapshot - April 7, 2025"],
    ["market/hushh-market-update-3-april", "Daily Market Snapshot - April 3, 2025"],
  ])("uses snapshot heading for %s", (slug, heading) => {
    expect(renderLegacyPost(slug)).toContain(heading);
  });

  it("renders metadata fallback instead of returning a blank page for missing legacy content", () => {
    communityPostState.value = {
      post: {
        id: "legacy/missing-component",
        slug: "legacy/missing-component",
        title: "Legacy Metadata Only",
        date: "2025-04-17",
        publishedAt: "2025-04-17",
        description: "Fallback details stay visible when a legacy component is unavailable.",
        category: "market updates",
        accessLevel: "Public",
        status: "published",
        sourceKind: "legacy",
      },
      legacyPost: null,
      loading: false,
      handleBack: () => undefined,
    };

    const markup = renderToStaticMarkup(React.createElement(CommunityPostPage));

    expect(markup).toContain("Legacy Metadata Only");
    expect(markup).toContain("Fallback details stay visible");
    expect(markup).toContain("community-post-missing-content");
  });
});
