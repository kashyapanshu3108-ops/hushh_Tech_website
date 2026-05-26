# Deep Intelligence API

This document anchors the HushhTech mirror of the consent-gated Gemini Deep
Research API.

## Code Locations

HushhTech mirror:

```text
cloud-run/deep-intelligence-api
scripts/deploy-deep-intelligence-api.sh
tests/deepIntelligenceApi.test.ts
```

Standalone RIA Intelligence API repo:

```text
/Users/ankitkumarsingh/LocalProjects/hushh-ria-intelligence-api/services/deep-intelligence-api
/Users/ankitkumarsingh/LocalProjects/hushh-ria-intelligence-api/docs/DEEP_INTELLIGENCE_API.md
```

Use the standalone repo as the primary home for independent R&D and API
ownership. Keep this HushhTech copy as the deployable mirror/reference for the
public web repo.

## Contract

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/health` | Service status and configured model, no secrets |
| `POST` | `/v1/intelligence/reports` | Start a consented Deep Research job |
| `GET` | `/v1/intelligence/reports/:jobId` | Poll job status and final safe report |
| `GET` | `/lab` | Local/R&D browser UI when explicitly enabled |

## Safety Boundary

The service is consent-gated. It is for user self-audits and approved internal
R&D, not unrestricted third-party scraping.

Required controls:

- `consent.accepted` must be `true`
- `consent.purpose` must be `self_audit` or `rd_internal`
- exact address and minor-related inputs are rejected
- exact browser GPS is coarsened before research
- final output is redacted for emails, phone numbers, addresses, IDs, and secrets
- raw source pages are not stored by default

## Gemini And Budget Configuration

Current R&D configuration:

- model: `deep-research-max-preview-04-2026`
- Gemini project: `gen-lang-client-0903389058`
- AI Studio project spend cap: `$10,000/month`
- Cloud Billing budget alert: `Gemini Deep Intelligence API 10k`

The service also exposes `DEEP_INTELLIGENCE_MONTHLY_BUDGET_USD`, but that is an
estimated service-side reservation guardrail. The actual Gemini project cap is
managed in Google AI Studio.

## Local Verification

```bash
cd cloud-run/deep-intelligence-api
npm test
node --check src/index.js
```

Local lab:

```bash
PORT=18181 \
GEMINI_API_KEY="$GEMINI_API_KEY" \
DEEP_INTELLIGENCE_API_KEY="local-test-token" \
DEEP_INTELLIGENCE_ENABLE_TEST_UI=true \
DEEP_INTELLIGENCE_MOCK_RESEARCH=false \
DEEP_INTELLIGENCE_MODEL="deep-research-max-preview-04-2026" \
node src/index.js
```

Open:

```text
http://127.0.0.1:18181/lab
```
