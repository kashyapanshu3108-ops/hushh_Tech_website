# HushhTech Community Media Recovery Report

Date: 2026-05-21

## Current Truth

- Canonical production host: `https://hushhtech.com`
- Canonical UAT host: `https://uat.hushhtech.com`
- Production Cloud Run reads community content from GCP with `COMMUNITY_CONTENT_BACKEND=gcp`.
- The production community media bucket did not contain April 2025 market-update media objects for the audited folders.
- February 25 and February 28 historical posts still render their bundled image galleries.
- April 7 through April 17 market-update posts render text, but the audited GCS paths do not currently have the missing media packages.
- August 19 allocation posts are PDF-backed documents today. Their PDFs respond, but no same-origin page-image package was found in GCS.

## Recovery Boundary

Only verified original media should be uploaded to GCS. If no original source package exists in GCP, Drive, local exports, or a backup bucket, the correct outcome is a missing-asset report and clean public UI rather than generated replacement charts.

## Runtime Changes Needed Before Upload

- The frontend gallery should probe legacy filename patterns like `1.png`, `m1.png`, and `q1.jpg`.
- Firestore and static fallback posts should be able to carry explicit `mediaItems`.
- Document posts should render page images first when `mediaItems` exist, with the PDF iframe retained as a fallback.
- Community article HTML, Markdown, tables, iframes, images, videos, and pre blocks should be constrained to the mobile viewport.

## Upload Shape

Use canonical object paths such as:

```text
market-updates/dmu7apr/1.png
market-updates/dmu7apr/m2.png
market-updates/dmu7apr/q3.jpg
market-updates/dmu15apr/1.png
decks/ssh-fund-a-class-a-b-c-portfolio-allocation/pages/page-001.jpg
decks/alphabets27-portfolio-target-allocations-and-strategy/pages/page-001.jpg
```

Then reference explicit packages from Firestore with `mediaItems` entries containing either object names or maps with `object`, `alt`, and `type`.

## Verification Checklist

- `/api/community/assets/<object>` returns `200` for each restored object.
- April 7, April 8, April 9, April 10, April 11, April 15, April 16, and April 17 posts show restored media.
- February 25 and February 28 posts still show their existing galleries.
- August 19 allocation pages show responsive page images on 375px, 390px, and 430px widths.
- Page-level `document.documentElement.scrollWidth` is not greater than `window.innerWidth` on iPhone widths.
