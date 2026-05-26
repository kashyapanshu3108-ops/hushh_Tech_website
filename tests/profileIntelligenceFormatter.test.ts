import { describe, expect, it } from "vitest";

import { formatProfileIntelligenceReport } from "../api/shared/profileIntelligenceFormatter.js";

describe("profile intelligence formatter", () => {
  it("converts a raw Deep Intelligence report into a profile view model", () => {
    const { intelligence } = formatProfileIntelligenceReport({
      status: "completed",
      report: {
        summary:
          "Ada appears in public founder material. Her email ada@example.com was present in one source.",
        confidence: "medium",
        publicProfiles: [
          {
            platform: "LinkedIn",
            title: "Ada Lovelace",
            url: "https://www.linkedin.com/in/ada-lovelace",
          },
        ],
        sourceCitations: [
          {
            title: "Ada Company Bio",
            uri: "https://example.com/team/ada",
          },
          {
            title: "Duplicate",
            url: "https://example.com/team/ada",
          },
        ],
        missingSignals: ["verified investment history"],
      },
    });

    expect(intelligence).toMatchObject({
      status: "completed",
      confidenceLabel: "Medium",
      identityMatch: {
        label: "possible",
      },
      publicProfiles: [
        {
          platform: "LinkedIn",
          title: "Ada Lovelace",
          url: "https://www.linkedin.com/in/ada-lovelace",
          confidence: "medium",
        },
      ],
      evidence: [
        {
          title: "Ada Company Bio",
          domain: "example.com",
          url: "https://example.com/team/ada",
          supports: "Professional profile",
        },
      ],
    });
    expect(intelligence.summary).toContain("[redacted-email]");
    expect(intelligence.redactions).toContain("email");
    expect(intelligence.missingSignals).toContain("verified investment history");
  });

  it("marks ambiguous and low-source reports as partial", () => {
    const { intelligence } = formatProfileIntelligenceReport({
      report: {
        summary: "The match is ambiguous and cannot confirm this is the same person.",
        sourceCitations: [],
      },
    });

    expect(intelligence.status).toBe("partial");
    expect(intelligence.confidenceLabel).toBe("Low");
    expect(intelligence.identityMatch.label).toBe("ambiguous");
    expect(intelligence.riskFlags).toContain("identity_match_ambiguous");
    expect(intelligence.riskFlags).toContain("source_coverage_low");
  });
});
