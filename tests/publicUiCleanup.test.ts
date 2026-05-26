import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("public HushhTech UI cleanup", () => {
  it("removes KYC Studio Alpha and Our Philosophy from public navigation surfaces", () => {
    const navigationSources = [
      "src/components/hushh-tech-nav-drawer/HushhTechNavDrawer.tsx",
      "src/components/Navbar.tsx",
      "src/components/Footer.tsx",
      "src/i18n/locales/en.json",
      "src/i18n/locales/fr.json",
      "src/i18n/locales/ar.json",
      "src/i18n/locales/zh.json",
    ].map(read).join("\n");

    expect(navigationSources).not.toMatch(/KYC Studio Alpha|kycStudio|KYC Verification/);
    expect(navigationSources).not.toMatch(/Our Philosophy|ourPhilosophy/);
  });

  it("keeps old KYC and A2A URLs as home redirects instead of public pages", () => {
    const app = read("src/App.tsx");

    for (const path of [
      "/kyc",
      "/kyc-verification",
      "/kyc-form",
      "/kyc-demo",
      "/kyc-flow",
      "/a2a-playground",
    ]) {
      expect(app).toContain(`path='${path}' element={<Navigate to='/' replace />}`);
    }

    expect(app).not.toMatch(/element=\{<KYCVerificationPage|element=\{<KYCFormPage|element=\{<KYCDemoPage|element=\{<KycFlowPage|element=\{<A2APlaygroundPage/);
  });

  it("treats contact faq and philosophy as modern public pages without the legacy shell", () => {
    const app = read("src/App.tsx");

    expect(app).toContain("location.pathname === '/contact'");
    expect(app).toContain("location.pathname === '/faq'");
    expect(app).toContain("location.pathname === '/philosophy'");
    expect(app).toContain("location.pathname === '/about/philosophy'");
    expect(app).toContain("<Route path=\"/philosophy\" element={<Philosophy />} />");
  });
});
