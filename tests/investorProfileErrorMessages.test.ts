import { describe, expect, it } from "vitest";

import {
  getSafeInvestorProfileErrorMessage,
  USER_SAFE_INVESTOR_PROFILE_ERROR,
} from "../src/services/investorProfile/errorMessages";

describe("investor profile error messages", () => {
  it("redacts provider quota and billing details", () => {
    expect(
      getSafeInvestorProfileErrorMessage(
        "429 You exceeded your current quota, please check https://platform.openai.com/docs/guides/error-codes/api-errors",
        500
      )
    ).toBe(USER_SAFE_INVESTOR_PROFILE_ERROR);
  });

  it("redacts provider names even when status is absent", () => {
    expect(getSafeInvestorProfileErrorMessage("Vertex PERMISSION_DENIED for Gemini API key")).toBe(
      USER_SAFE_INVESTOR_PROFILE_ERROR
    );
  });

  it("maps auth failures to a user-actionable message", () => {
    expect(getSafeInvestorProfileErrorMessage("Unauthorized", 401)).toBe(
      "Please sign in again to generate your investor profile."
    );
  });

  it("keeps ordinary safe validation messages", () => {
    expect(getSafeInvestorProfileErrorMessage("Network error - will retry later")).toBe(
      "Network error - will retry later"
    );
  });
});
