import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoFile = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("canonical Hushh domain spellings", () => {
  it("documents the production and UAT hostnames for HushhTech and Hushh AI", () => {
    const agents = repoFile("AGENTS.md");

    expect(agents).toContain("https://hushhtech.com");
    expect(agents).toContain("https://uat.hushhtech.com");
    expect(agents).toContain("https://hushh.ai");
    expect(agents).toContain("https://uat.hushh.ai");
  });

  it("generates SEO files with the lower-case HushhTech production hostname", () => {
    const sitemapScript = repoFile("scripts/generate-sitemap.js");
    const robotsScript = repoFile("scripts/generate-robots.js");
    const sitemap = repoFile("public/sitemap.xml");
    const robots = repoFile("public/robots.txt");

    for (const content of [sitemapScript, robotsScript, sitemap, robots]) {
      expect(content).toContain("https://hushhtech.com");
      expect(content).not.toContain("hushhTech.com");
      expect(content).not.toMatch(/hashtag\.com|hustag/i);
    }
  });

  it("keeps generated robots.txt in the Cloud Run source upload", () => {
    const gcloudIgnore = repoFile(".gcloudignore");
    const textIgnoreIndex = gcloudIgnore.indexOf("*.txt");
    const robotsAllowIndex = gcloudIgnore.indexOf("!dist/robots.txt");

    expect(gcloudIgnore).toContain("*.txt");
    expect(gcloudIgnore).toContain("!dist/robots.txt");
    expect(robotsAllowIndex).toBeGreaterThan(textIgnoreIndex);
  });

  it("keeps community product links off deprecated shortlinks", () => {
    const productUpdate = repoFile("src/content/posts/product/hushhProductUpdates.tsx");

    expect(productUpdate).not.toMatch(/bit\.ly|superpage/i);
    expect(productUpdate).toContain("https://testflight.apple.com/join/u6FFaw2B");
    expect(productUpdate).toContain("https://play.google.com/store/apps/details?id=com.hushhone.hushh");
  });
});
