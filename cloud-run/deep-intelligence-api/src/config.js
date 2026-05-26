const DEFAULT_MODEL = "deep-research-max-preview-04-2026";
const DEFAULT_MAX_ACTIVE_JOBS = 3;
const DEFAULT_RETENTION_HOURS = 24;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 20;
const DEFAULT_JOB_TIMEOUT_MS = 60 * 60 * 1000;
const DEFAULT_MONTHLY_BUDGET_USD = 10_000;
const DEFAULT_ESTIMATED_JOB_COST_USD = 7;

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseBoolean(value, fallback = false) {
  const normalized = trim(value).toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseInteger(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function parseNumber(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function getConfig(env = process.env) {
  const retentionHours = parseInteger(
    env.DEEP_INTELLIGENCE_RETENTION_HOURS,
    DEFAULT_RETENTION_HOURS,
    { min: 1, max: 168 },
  );

  return {
    serviceName: "hushh-deep-intelligence-api",
    port: parseInteger(env.PORT, 8080, { min: 1, max: 65535 }),
    geminiApiKey: trim(env.GEMINI_API_KEY),
    internalApiKey: trim(env.DEEP_INTELLIGENCE_API_KEY),
    model: trim(env.DEEP_INTELLIGENCE_MODEL) || DEFAULT_MODEL,
    maxActiveJobs: parseInteger(
      env.DEEP_INTELLIGENCE_MAX_ACTIVE_JOBS,
      DEFAULT_MAX_ACTIVE_JOBS,
      { min: 1, max: 25 },
    ),
    retentionMs: retentionHours * 60 * 60 * 1000,
    retentionHours,
    enableTestUi: parseBoolean(env.DEEP_INTELLIGENCE_ENABLE_TEST_UI, false),
    mockResearch: parseBoolean(env.DEEP_INTELLIGENCE_MOCK_RESEARCH, false),
    monthlyBudgetUsd: parseNumber(
      env.DEEP_INTELLIGENCE_MONTHLY_BUDGET_USD,
      DEFAULT_MONTHLY_BUDGET_USD,
      { min: 1, max: 1_000_000 },
    ),
    estimatedJobCostUsd: parseNumber(
      env.DEEP_INTELLIGENCE_ESTIMATED_JOB_COST_USD,
      DEFAULT_ESTIMATED_JOB_COST_USD,
      { min: 0.01, max: 1000 },
    ),
    rateLimitWindowMs: parseInteger(
      env.DEEP_INTELLIGENCE_RATE_LIMIT_WINDOW_MS,
      DEFAULT_RATE_LIMIT_WINDOW_MS,
      { min: 1000, max: 60 * 60 * 1000 },
    ),
    rateLimitMax: parseInteger(env.DEEP_INTELLIGENCE_RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX, {
      min: 1,
      max: 1000,
    }),
    jobTimeoutMs: parseInteger(env.DEEP_INTELLIGENCE_JOB_TIMEOUT_MS, DEFAULT_JOB_TIMEOUT_MS, {
      min: 60_000,
      max: 60 * 60 * 1000,
    }),
  };
}
