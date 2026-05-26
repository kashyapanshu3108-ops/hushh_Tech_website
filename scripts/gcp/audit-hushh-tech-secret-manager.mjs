import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const GCLOUD = process.env.GCLOUD_BIN || "/Users/ankitkumarsingh/google-cloud-sdk/bin/gcloud";
const REGION = process.env.HUSHH_TECH_REGION || "us-central1";
const SERVICE = process.env.HUSHH_TECH_SERVICE || "hushh-tech-website";

const ENVIRONMENTS = [
  {
    env: "uat",
    project: "hushh-tech-uat",
    bucket: "hushh-tech-community-content-uat",
    requiredSecrets: [
      "hushh-tech-supabase-url",
      "hushh-tech-supabase-service-role-key",
      "hushh-tech-gmail-user",
      "hushh-tech-gmail-app-password",
      "hushh-tech-metrics-ga4-allowed-hostnames",
      "hushh-tech-analytics-hash-salt",
      "hushh-tech-metrics-gcp-cloud-run-region",
      "hushh-tech-metrics-gcp-cloud-run-services",
      "hushh-tech-metrics-gcp-monitoring-project-id",
      "hushh-tech-metrics-search-console-data-state",
      "hushh-tech-metrics-search-console-row-limit",
      "hushh-tech-metrics-search-console-site-url",
      "hushh-tech-metrics-search-console-type",
    ],
  },
  {
    env: "prod",
    project: "hushh-tech-prod",
    bucket: "hushh-tech-community-content-prod",
    requiredSecrets: [
      "hushh-tech-supabase-url",
      "hushh-tech-supabase-service-role-key",
      "hushh-tech-gmail-user",
      "hushh-tech-gmail-app-password",
      "hushh-tech-analytics-hash-salt",
      "hushh-tech-metrics-ga4-allowed-hostnames",
      "hushh-tech-metrics-ga4-property-id",
      "hushh-tech-metrics-gcp-cloud-run-region",
      "hushh-tech-metrics-gcp-cloud-run-services",
      "hushh-tech-metrics-gcp-monitoring-project-id",
      "hushh-tech-metrics-looker-studio-embed-url",
      "hushh-tech-metrics-search-console-data-state",
      "hushh-tech-metrics-search-console-row-limit",
      "hushh-tech-metrics-search-console-site-url",
      "hushh-tech-metrics-search-console-type",
    ],
  },
];

const SENSITIVE_ENV_NAMES = new Set([
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GMAIL_USER",
  "GMAIL_APP_PASSWORD",
  "GA4_ALLOWED_HOSTNAMES",
  "GA4_PROPERTY_ID",
  "LOOKER_STUDIO_EMBED_URL",
  "GCP_MONITORING_PROJECT_ID",
  "GCP_CLOUD_RUN_REGION",
  "GCP_CLOUD_RUN_SERVICES",
  "SEARCH_CONSOLE_SITE_URL",
  "SEARCH_CONSOLE_TYPE",
  "SEARCH_CONSOLE_DATA_STATE",
  "SEARCH_CONSOLE_ROW_LIMIT",
  "ANALYTICS_HASH_SALT",
]);

const COMMUNITY_RUNTIME_EXPECTED = {
  uat: {
    COMMUNITY_CONTENT_BACKEND: "gcp",
    COMMUNITY_CONTENT_COLLECTION: "community_posts",
    COMMUNITY_CONTENT_BUCKET: "hushh-tech-community-content-uat",
    COMMUNITY_CONTENT_CACHE_SECONDS: "300",
  },
  prod: {
    COMMUNITY_CONTENT_BACKEND: "gcp",
    COMMUNITY_CONTENT_COLLECTION: "community_posts",
    COMMUNITY_CONTENT_BUCKET: "hushh-tech-community-content-prod",
    COMMUNITY_CONTENT_CACHE_SECONDS: "300",
  },
};

const runJson = (args) => {
  const output = execFileSync(GCLOUD, [...args, "--format=json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(output || "null");
};

const listSecretNames = (project) => {
  const secrets = runJson(["secrets", "list", `--project=${project}`]) || [];
  return new Set(secrets.map((secret) => secret.name.split("/").pop()));
};

const describeServiceEnv = (project) => {
  const service = runJson([
    "run",
    "services",
    "describe",
    SERVICE,
    `--project=${project}`,
    `--region=${REGION}`,
  ]);
  return service?.spec?.template?.spec?.containers?.[0]?.env || [];
};

const bucketExists = (project, bucket) => {
  try {
    execFileSync(
      GCLOUD,
      ["storage", "buckets", "describe", `gs://${bucket}`, `--project=${project}`, "--format=value(name)"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return true;
  } catch {
    return false;
  }
};

const auditRepoReferences = () => {
  const files = [
    "src/pages/community/logic.ts",
    "src/pages/community/post-logic.ts",
    "src/pages/community/post-ui.tsx",
    "src/services/communityContent.ts",
    "src/components/MarketUpdateGallery.tsx",
    "api/community/content-service.js",
    "server.js",
  ];
  const source = files.map((file) => readFileSync(join(process.cwd(), file), "utf8")).join("\n");
  const forbidden = [
    /VITE_MARKET_SUPABASE/i,
    /\/rest\/v1\/reports/i,
    /vercel\.json/i,
  ];
  return forbidden.filter((pattern) => pattern.test(source)).map(String);
};

let failed = false;
const lines = [];

for (const environment of ENVIRONMENTS) {
  const secretNames = listSecretNames(environment.project);
  const hasBucket = bucketExists(environment.project, environment.bucket);
  const missingSecrets = environment.requiredSecrets.filter((secret) => !secretNames.has(secret));
  if (missingSecrets.length || !hasBucket) failed = true;

  const envVars = describeServiceEnv(environment.project);
  const plaintextSensitive = envVars
    .filter((entry) => SENSITIVE_ENV_NAMES.has(entry.name))
    .filter((entry) => !entry.valueFrom?.secretKeyRef)
    .map((entry) => entry.name);
  if (plaintextSensitive.length) failed = true;

  const envByName = new Map(envVars.map((entry) => [entry.name, entry]));
  const communityMismatches = Object.entries(COMMUNITY_RUNTIME_EXPECTED[environment.env])
    .filter(([name, expectedValue]) => envByName.get(name)?.value !== expectedValue)
    .map(([name]) => name);
  if (communityMismatches.length) failed = true;

  lines.push(
    `${environment.env}: secrets=${environment.requiredSecrets.length - missingSecrets.length}/${environment.requiredSecrets.length}, bucket=${hasBucket ? "present" : "missing"}, missing=[${missingSecrets.join(", ") || "none"}], plaintextSensitive=[${plaintextSensitive.join(", ") || "none"}], communityRuntime=[${communityMismatches.length ? `mismatch:${communityMismatches.join(", ")}` : "ok"}]`,
  );
}

const forbiddenRefs = auditRepoReferences();
if (forbiddenRefs.length) failed = true;
lines.push(`community-code-forbidden-refs=[${forbiddenRefs.join(", ") || "none"}]`);

console.log(lines.join("\n"));
if (failed) process.exit(1);
