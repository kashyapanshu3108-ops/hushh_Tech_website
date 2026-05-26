const USER_SAFE_INVESTOR_PROFILE_ERROR =
  "Investor profile intelligence is temporarily unavailable. Please try again shortly.";

const SIGN_IN_AGAIN_ERROR = "Please sign in again to generate your investor profile.";

const REVIEW_PROFILE_INPUT_ERROR =
  "We could not build the profile from the current form. Please review the required fields and try again.";

const SENSITIVE_PROVIDER_ERROR_PATTERN =
  /\b(openai|platform\.openai|api\.openai|quota|exceeded|billing|rate\s*limit|rate-limit|429|api\s*key|secret|token|gemini|generativelanguage|vertex|permission[_\s-]?denied|unauthenticated|forbidden)\b/i;

export function getSafeInvestorProfileErrorMessage(
  error: unknown,
  status?: number
): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (status === 401 || status === 403) {
    return SIGN_IN_AGAIN_ERROR;
  }

  if (status === 400) {
    return REVIEW_PROFILE_INPUT_ERROR;
  }

  if (status === 429 || (typeof status === "number" && status >= 500)) {
    return USER_SAFE_INVESTOR_PROFILE_ERROR;
  }

  if (!message.trim()) {
    return USER_SAFE_INVESTOR_PROFILE_ERROR;
  }

  if (SENSITIVE_PROVIDER_ERROR_PATTERN.test(message)) {
    return USER_SAFE_INVESTOR_PROFILE_ERROR;
  }

  return message;
}

export { USER_SAFE_INVESTOR_PROFILE_ERROR };
