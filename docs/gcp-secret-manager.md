# GCP Secret Manager Runbook

## Projects

- UAT: `hushh-tech-uat`
- Production: `hushh-tech-prod`
- Region: `us-central1`
- Cloud Run service: `hushh-tech-website`

Secret Manager does not have real folders. Use separate projects plus consistent names and labels:

```text
app=hushh-tech
env=uat|prod
surface=community|runtime|analytics
```

## Required Community Runtime Env

These values are non-sensitive runtime configuration:

```text
COMMUNITY_CONTENT_BACKEND=gcp
COMMUNITY_CONTENT_COLLECTION=community_posts
COMMUNITY_CONTENT_BUCKET=hushh-tech-community-content-uat|hushh-tech-community-content-prod
COMMUNITY_CONTENT_CACHE_SECONDS=300
```

Sensitive/editorial tokens must be added as Secret Manager secrets, not `--set-env-vars`.

## Core Secret Names

Use the same names in UAT and production wherever possible:

```text
hushh-tech-supabase-url
hushh-tech-supabase-service-role-key
hushh-tech-gmail-user
hushh-tech-gmail-app-password
hushh-tech-analytics-hash-salt
hushh-tech-metrics-ga4-allowed-hostnames
hushh-tech-metrics-ga4-property-id
hushh-tech-metrics-gcp-cloud-run-region
hushh-tech-metrics-gcp-cloud-run-services
hushh-tech-metrics-gcp-monitoring-project-id
hushh-tech-metrics-looker-studio-embed-url
hushh-tech-metrics-search-console-data-state
hushh-tech-metrics-search-console-row-limit
hushh-tech-metrics-search-console-site-url
hushh-tech-metrics-search-console-type
```

Build/deploy secrets such as Gemini, OpenAI, or Apps Script should follow the same `hushh-tech-*` naming pattern before the Cloud Build configs are promoted. Gmail notification credentials are already bound through `hushh-tech-gmail-user` and `hushh-tech-gmail-app-password`.

## UAT Migration

UAT previously had sensitive values as plain Cloud Run env vars. To migrate the current UAT runtime values into Secret Manager without printing values:

```bash
npm run gcp:secrets:migrate-uat
```

The script:

- reads current Cloud Run env metadata,
- creates missing UAT secrets,
- adds secret versions from current runtime values,
- grants the Cloud Run service account `roles/secretmanager.secretAccessor`,
- updates Cloud Run env bindings to `valueFrom.secretKeyRef`,
- prints only names/counts, never values.

## Audit

Run:

```bash
npm run gcp:secrets:audit
```

The audit checks:

- required Secret Manager entries exist in UAT and production,
- the private community content bucket exists in each project,
- sensitive Cloud Run env names use Secret Manager references,
- community code has no Supabase reports or Vercel dependency references. Legacy Gamma presentation embeds are allowed only until their real deck assets are exported to GCS.

## Contact Form Mail

The public Contact page posts to the same-origin Cloud Run API and expects Gmail credentials from Secret Manager:

```text
GMAIL_USER=hushh-tech-gmail-user:latest
GMAIL_APP_PASSWORD=hushh-tech-gmail-app-password:latest
```

For local Cloud Run deploys with `scripts/deploy-gcp.sh`, pass `GMAIL_USER_SECRET_NAME=hushh-tech-gmail-user` and `GMAIL_APP_PASSWORD_SECRET_NAME=hushh-tech-gmail-app-password` instead of plaintext Gmail values.

## Safety Rules

- Never commit `.env.local` or copied secret values.
- Do not paste secret values into docs, tests, commit messages, or PR text.
- Use `--set-secrets` for Cloud Run sensitive runtime config.
- Use `server.js` and Cloud Run as the runtime source of truth, not Vercel.
- Treat browser-visible `VITE_*` values as public configuration only.
