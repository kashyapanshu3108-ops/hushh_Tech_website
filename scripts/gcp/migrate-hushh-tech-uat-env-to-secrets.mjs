import { execFileSync, spawnSync } from "node:child_process";

const GCLOUD = process.env.GCLOUD_BIN || "/Users/ankitkumarsingh/google-cloud-sdk/bin/gcloud";
const PROJECT = "hushh-tech-uat";
const REGION = "us-central1";
const SERVICE = "hushh-tech-website";

const SECRET_MAPPINGS = {
  SUPABASE_URL: "hushh-tech-supabase-url",
  SUPABASE_SERVICE_ROLE_KEY: "hushh-tech-supabase-service-role-key",
  GCP_MONITORING_PROJECT_ID: "hushh-tech-metrics-gcp-monitoring-project-id",
  GCP_CLOUD_RUN_REGION: "hushh-tech-metrics-gcp-cloud-run-region",
  GCP_CLOUD_RUN_SERVICES: "hushh-tech-metrics-gcp-cloud-run-services",
  SEARCH_CONSOLE_SITE_URL: "hushh-tech-metrics-search-console-site-url",
  SEARCH_CONSOLE_TYPE: "hushh-tech-metrics-search-console-type",
  SEARCH_CONSOLE_DATA_STATE: "hushh-tech-metrics-search-console-data-state",
  SEARCH_CONSOLE_ROW_LIMIT: "hushh-tech-metrics-search-console-row-limit",
  GA4_ALLOWED_HOSTNAMES: "hushh-tech-metrics-ga4-allowed-hostnames",
  ANALYTICS_HASH_SALT: "hushh-tech-analytics-hash-salt",
};

const run = (args, options = {}) =>
  execFileSync(GCLOUD, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

const runJson = (args) => JSON.parse(run([...args, "--format=json"]) || "null");

const service = runJson([
  "run",
  "services",
  "describe",
  SERVICE,
  `--project=${PROJECT}`,
  `--region=${REGION}`,
]);

const envEntries = service?.spec?.template?.spec?.containers?.[0]?.env || [];
const envByName = new Map(envEntries.map((entry) => [entry.name, entry]));
const serviceAccount =
  service?.spec?.template?.spec?.serviceAccountName ||
  `${run(["projects", "describe", PROJECT, "--format=value(projectNumber)"]).trim()}-compute@developer.gserviceaccount.com`;

const created = [];
const skipped = [];
const updateSecrets = [];
const removeEnvVars = [];

for (const [envName, secretName] of Object.entries(SECRET_MAPPINGS)) {
  const entry = envByName.get(envName);
  if (entry?.valueFrom?.secretKeyRef) {
    skipped.push(`${envName}:already-secret`);
    continue;
  }
  if (!entry?.value) {
    skipped.push(`${envName}:missing`);
    continue;
  }

  const describe = spawnSync(
    GCLOUD,
    ["secrets", "describe", secretName, `--project=${PROJECT}`, "--format=value(name)"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  if (describe.status !== 0) {
    run([
      "secrets",
      "create",
      secretName,
      `--project=${PROJECT}`,
      "--replication-policy=automatic",
      "--labels=app=hushh-tech,env=uat,surface=runtime",
    ]);
  }

  const versions = spawnSync(
    GCLOUD,
    ["secrets", "versions", "list", secretName, `--project=${PROJECT}`, "--filter=state:enabled", "--format=value(name)"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  if (!versions.stdout.trim()) {
    spawnSync(
      GCLOUD,
      ["secrets", "versions", "add", secretName, `--project=${PROJECT}`, "--data-file=-"],
      { input: entry.value, encoding: "utf8", stdio: ["pipe", "ignore", "pipe"] },
    );
    created.push(secretName);
  } else {
    skipped.push(`${envName}:secret-version-exists`);
  }

  run([
    "secrets",
    "add-iam-policy-binding",
    secretName,
    `--project=${PROJECT}`,
    `--member=serviceAccount:${serviceAccount}`,
    "--role=roles/secretmanager.secretAccessor",
    "--quiet",
  ]);

  removeEnvVars.push(envName);
  updateSecrets.push(`${envName}=${secretName}:latest`);
}

if (updateSecrets.length) {
  run([
    "run",
    "services",
    "update",
    SERVICE,
    `--project=${PROJECT}`,
    `--region=${REGION}`,
    `--remove-env-vars=${removeEnvVars.join(",")}`,
    "--quiet",
  ]);
  run([
    "run",
    "services",
    "update",
    SERVICE,
    `--project=${PROJECT}`,
    `--region=${REGION}`,
    `--update-secrets=${updateSecrets.join(",")}`,
    "--quiet",
  ]);
}

console.log(
  [
    `project=${PROJECT}`,
    `service=${SERVICE}`,
    `secretVersionsAdded=${created.length}`,
    `updatedBindings=${updateSecrets.length}`,
    `skipped=[${skipped.join(", ") || "none"}]`,
  ].join("\n"),
);
