/**
 * Compatibility wrapper for older imports.
 *
 * Investor profile generation must go through the same-origin GCP API route;
 * no browser-direct AI provider calls or browser-visible AI keys are supported.
 */

import { InvestorProfile, InvestorProfileInput, DerivedContext } from "../../types/investorProfile";
import { generateInvestorProfile as generateInvestorProfileViaApi } from "./apiClient";

export async function generateInvestorProfile(
  input: InvestorProfileInput,
  _context?: DerivedContext
): Promise<InvestorProfile> {
  const result = await generateInvestorProfileViaApi(input);

  if (!result.success || !result.profile) {
    throw new Error(result.error || "Failed to generate investor profile");
  }

  return result.profile;
}
