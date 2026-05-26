# Community Content on GCP

## Goal

Community pages must render inside HushhTech without browser calls to Supabase reports, Vercel runtime config, or download-only document flows.

Some legacy presentation posts still embed Gamma in-place because the original charts/decks have not been exported into GCP yet. Do not replace those with summary text. The migration target is to export the actual deck/PDF/media assets into GCS and then serve them through `/api/community/assets/*`.

`general/sell-the-wall-featured` is the first migrated deck in this model. Its source PDF is stored in both UAT and production GCS, and the rendered page images are served in-page from:

```text
decks/sell-the-wall.pdf
decks/sell-the-wall/pages/page-001.jpg ... page-060.jpg
```

The browser reads community content only through the Cloud Run app:

- `GET /api/community/posts`
- `GET /api/community/posts/:slug`
- `GET /api/community/assets/*`

## Runtime Architecture

- Cloud Run `server.js` is the runtime gateway and security-header source of truth.
- Firestore collection `community_posts` stores public post metadata and optional inline Markdown or HTML.
- Private GCS bucket stores larger content packages: Markdown, page images, deck assets, and document assets.
- Cloud Run reads Firestore/GCS with service-account IAM and returns same-origin JSON/assets to the browser.
- `api/community/staticPosts.generated.js` is a committed fallback snapshot generated from the legacy local registry.
- `MarketUpdateGallery` uses bundled local chart assets when present and same-origin GCP asset URLs for declared chart images; it must not call Supabase storage directly.

## Content Shape

Firestore document id should match the slug, for example:

```json
{
  "slug": "general/the-perpetual-alpha-engine",
  "title": "The Perpetual Alpha Engine",
  "description": "A Technical Blueprint for Next-Generation Quantitative Investment Systems",
  "category": "investment & financial strategies",
  "publishedAt": "2025-12-06",
  "accessLevel": "Public",
  "status": "published",
  "sourceKind": "article",
  "bodyMarkdown": "# Title\n\nBody...",
  "contentObject": "posts/general/the-perpetual-alpha-engine/index.md",
  "assetObject": "posts/general/the-perpetual-alpha-engine/document.pdf"
}
```

`bodyMarkdown` is preferred for normal articles. Use `contentObject` when the content body is too large for Firestore. Use `assetObject` for documents or deck media that should stream through `/api/community/assets/*`.

## Local And Cloud Run Behavior

Local development can run without Firestore/GCS. The API falls back to `api/community/staticPosts.generated.js`, which is refreshed by:

```bash
npm run build:community
```

Cloud Run should set:

```text
COMMUNITY_CONTENT_BACKEND=gcp
COMMUNITY_CONTENT_COLLECTION=community_posts
COMMUNITY_CONTENT_BUCKET=hushh-tech-community-content-uat|hushh-tech-community-content-prod
COMMUNITY_CONTENT_CACHE_SECONDS=300
```

If Firestore is temporarily unavailable, the API falls back to the static snapshot instead of exposing errors to public readers.

Firestore database creation is intentionally separate from the code deploy because Firestore location is irreversible. Enable the API first, then create the database only after the team chooses the permanent location.

## Migration Rules

- Convert Gamma presentations into native HushhTech content packages before publishing new migrated versions.
- Until a deck is exported, keep the legacy Gamma iframe embedded in-place instead of replacing it with a lossy summary.
- Do not route community cards to `/reports/:id`.
- Do not require users to open or download documents; render documents in-app through `/api/community/assets/*`.
- Do not silently replace a missing deck/chart asset with made-up summary content; surface the missing asset state and migrate the real file into GCS.
- Keep NDA/private posts out of public Firestore responses until the NDA API path is migrated separately.

## Verification

Run:

```bash
npm run test -- tests/communityGcpRuntime.test.ts tests/communityApiRoute.test.ts
npm run env:check
npm run build:web
npm run gcp:secrets:audit
```

Expected proof:

- `/community` fetches `/api/community/posts`.
- `/community/:slug` fetches `/api/community/posts/:slug`.
- Community source does not reference `VITE_MARKET_SUPABASE_*`, `/rest/v1/reports`, or `vercel.json`.
- Cloud Run UAT/prod sensitive runtime env values use Secret Manager references.
