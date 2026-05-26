# Hushh Deep Intelligence API

Standalone Cloud Run service for consent-gated public-web self-audit reports using Gemini Deep Research.

Standalone RIA repo copy:

```text
/Users/ankitkumarsingh/LocalProjects/hushh-ria-intelligence-api/services/deep-intelligence-api
```

HushhTech architecture reference:

```text
docs/reference/architecture/deep-intelligence-api.md
```

## Safety Boundary

This service is not an unrestricted people-scraping endpoint. It requires recorded consent and rejects exact-address, GPS, minor-related, and sensitive-identifier inputs before launching a Gemini job. Final reports are sanitized before being returned.

## Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service status and configured model, no secrets |
| `POST` | `/v1/intelligence/reports` | Start a Deep Research job |
| `GET` | `/v1/intelligence/reports/:jobId` | Poll an existing job |

## Required Environment

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Server-side Gemini API key |
| `DEEP_INTELLIGENCE_API_KEY` | Internal caller token for `Authorization: Bearer ...` or `x-api-key` |
| `DEEP_INTELLIGENCE_MODEL` | Defaults to `deep-research-max-preview-04-2026` |
| `DEEP_INTELLIGENCE_MAX_ACTIVE_JOBS` | Defaults to `3` |
| `DEEP_INTELLIGENCE_RETENTION_HOURS` | Defaults to `24` |
| `DEEP_INTELLIGENCE_ENABLE_TEST_UI` | Set to `true` only for local/R&D lab UI |
| `DEEP_INTELLIGENCE_MOCK_RESEARCH` | Set to `true` for UI/API smoke without Gemini calls |
| `DEEP_INTELLIGENCE_MONTHLY_BUDGET_USD` | Service-side estimated cap, defaults to `10000` |
| `DEEP_INTELLIGENCE_ESTIMATED_JOB_COST_USD` | Per-job budget reservation, defaults to `7` |

Optional guardrails:

| Variable | Default |
| --- | --- |
| `DEEP_INTELLIGENCE_RATE_LIMIT_WINDOW_MS` | `60000` |
| `DEEP_INTELLIGENCE_RATE_LIMIT_MAX` | `20` |
| `DEEP_INTELLIGENCE_JOB_TIMEOUT_MS` | `3600000` |

## Browser Lab

For a standalone manual test with one name field and one CTA, enable the lab UI:

```bash
PORT=18181 \
GEMINI_API_KEY="$GEMINI_API_KEY" \
DEEP_INTELLIGENCE_API_KEY="local-test-token" \
DEEP_INTELLIGENCE_ENABLE_TEST_UI=true \
node src/index.js
```

Real mode with Deep Research Max and the local lab:

```bash
PORT=18181 \
GEMINI_API_KEY="$GEMINI_API_KEY" \
DEEP_INTELLIGENCE_API_KEY="local-test-token" \
DEEP_INTELLIGENCE_ENABLE_TEST_UI=true \
DEEP_INTELLIGENCE_MOCK_RESEARCH=false \
DEEP_INTELLIGENCE_MODEL="deep-research-max-preview-04-2026" \
DEEP_INTELLIGENCE_MONTHLY_BUDGET_USD=10000 \
node src/index.js
```

The budget variables are service-side estimated guardrails, not a replacement for Google Cloud Billing budgets or quota controls.

Open:

```text
http://127.0.0.1:18181/lab
```

The lab page asks for browser location permission, reverse-geocodes the exact coordinates into coarse city/region/country, discards the exact coordinates, starts a Deep Research job, and polls until the final sanitized report is ready.

If you only want to test the UI flow without a Gemini key or paid Deep Research call, run:

```bash
PORT=18181 \
GEMINI_API_KEY="mock-not-used" \
DEEP_INTELLIGENCE_API_KEY="local-test-token" \
DEEP_INTELLIGENCE_ENABLE_TEST_UI=true \
DEEP_INTELLIGENCE_MOCK_RESEARCH=true \
node src/index.js
```

## Start A Report

```bash
curl -sS -X POST "$BASE_URL/v1/intelligence/reports" \
  -H "Authorization: Bearer $DEEP_INTELLIGENCE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": {
      "name": "Ada Lovelace",
      "location": { "city": "London", "country": "United Kingdom" }
    },
    "consent": {
      "accepted": true,
      "purpose": "self_audit"
    }
  }'
```

Response:

```json
{
  "success": true,
  "jobId": "uuid",
  "status": "in_progress",
  "createdAt": "2026-05-24T00:00:00.000Z",
  "updatedAt": "2026-05-24T00:00:00.000Z"
}
```

## Poll A Report

```bash
curl -sS "$BASE_URL/v1/intelligence/reports/$JOB_ID" \
  -H "Authorization: Bearer $DEEP_INTELLIGENCE_API_KEY"
```

Completed response:

```json
{
  "success": true,
  "jobId": "uuid",
  "status": "completed",
  "report": {
    "summary": "Redacted safe summary text...",
    "publicProfiles": [],
    "sourceCitations": [],
    "confidence": "medium",
    "riskFlags": [],
    "redactions": [],
    "warnings": []
  }
}
```

## R&D Storage Note

The first version uses in-memory job storage and is best deployed with one Cloud Run instance. Move job metadata to Firestore before multi-instance or external production use.
