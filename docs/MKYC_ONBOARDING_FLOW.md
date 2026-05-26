# Hushh MKYC / Onboarding Flow

This document defines what the Hushh team means when we say KYC, MKYC, or the
main onboarding function in the Hushh Tech website.

In this repository, that phrase means the authenticated investor onboarding
journey that starts at the financial-link pre-step, continues through the
visible onboarding steps, marks onboarding complete, and then lands on the
Hushh user profile where profile generation and the Net Worth Score (NWS) are
shown.

## Scope

Canonical product flow:

1. Financial Link
2. Onboarding Step 1 through Step 9
3. Meet CEO
4. Hushh User Profile
5. NWS calculation and profile/wallet surfaces

Related but separate public KYC/demo surfaces:

1. `/kyc-flow`
2. `/kyc-demo`
3. `/a2a-playground`
4. `/kyc-form`
5. `/kyc-verification`

Those public demo routes should not be treated as the main MKYC onboarding
flow unless a task explicitly says so.

## Canonical Route Sequence

Use `https://hushhtech.com` as the production host. Use the same paths under
UAT when validating a UAT deployment.

| Order | Route | Product step | What it collects or proves | Completion behavior |
| --- | --- | --- | --- | --- |
| 0 | `/onboarding/financial-link` | Financial Link | Plaid financial connection, assets, investments, and bank-verified identity signals. The user may also skip, which records `financial_link_status: skipped`. | Writes financial-link progress, then continues to the current canonical onboarding step. |
| 1 | `/onboarding/step-1` | Step 1 | Fund A share-class allocation and optional recurring investment setup. | Saves allocation and investment amount, then moves to Step 2. |
| 2 | `/onboarding/step-2` | Step 2 | Referral source: how the user heard about Hushh. | Saves or skips referral source, then moves to Step 3. |
| 3 | `/onboarding/step-3` | Step 3 | Citizenship, residence, and address. This step combines the older country and address steps and can prefill from GPS, Plaid identity, enriched profile data, or cached location. | Saves country/address context, then moves to Step 4. |
| 4 | `/onboarding/step-4` | Step 4 | Account type and phone number. Phone may be prefilled from Plaid identity or location context. | Saves account/contact data, then moves to Step 5. |
| 5 | `/onboarding/step-5` | Step 5 | Legal first name and legal last name. Name may be prefilled from Plaid identity or OAuth metadata. | Saves legal name, then moves to Step 6. |
| 6 | `/onboarding/step-6` | Step 6 | Social Security Number and date of birth. Date of birth is required and must prove the user is at least 18. | Saves identity/tax fields, then moves to Step 7. |
| 7 | `/onboarding/step-7` | Step 7 | Investment summary, share-class edits, total investment, and recurring investment review. | Saves final investment configuration, then moves to Step 8. |
| 8 | `/onboarding/step-8` | Step 8 | Review screen for legal name, phone, citizenship/residence, address, and investment data. | User confirms the collected data and moves to Step 9. |
| 9 | `/onboarding/step-9` | Step 9 | Bank details for transfer setup. Bank details may be auto-filled from the linked Plaid institution when supported. | Saves or skips banking info, sets `current_step: 13`, sets `is_completed: true`, then moves to Meet CEO. |
| 10 | `/onboarding/meet-ceo` | Meet CEO | Optional payment/coupon, Hushh Coins credit, and CEO meeting booking. | User can continue to the Hushh user profile after payment/booking state is handled. |
| 11 | `/hushh-user-profile` | Hushh User Profile | Loads onboarding data, investor profile data, NWS, wallet pass actions, privacy/profile controls, and AI profile generation. | User can generate or re-enhance the investor profile, save changes, and open profile/wallet surfaces. |

Full production links:

1. `https://hushhtech.com/onboarding/financial-link`
2. `https://hushhtech.com/onboarding/step-1`
3. `https://hushhtech.com/onboarding/step-2`
4. `https://hushhtech.com/onboarding/step-3`
5. `https://hushhtech.com/onboarding/step-4`
6. `https://hushhtech.com/onboarding/step-5`
7. `https://hushhtech.com/onboarding/step-6`
8. `https://hushhtech.com/onboarding/step-7`
9. `https://hushhtech.com/onboarding/step-8`
10. `https://hushhtech.com/onboarding/step-9`
11. `https://hushhtech.com/onboarding/meet-ceo`
12. `https://hushhtech.com/hushh-user-profile`

## Identity Verification Rail

The codebase also exposes a protected identity verification rail:

1. `/onboarding/verify`
2. `/onboarding/verify-complete`

This rail starts a Stripe Identity verification session, returns to
`/onboarding/verify-complete`, stores `identity_verified` and
`identity_verified_at` on success, and then continues to
`/hushh-user-profile`.

This rail is part of the broader KYC system, but it is not one of the 9 visible
onboarding steps. If a product task says "main MKYC onboarding," start with
Financial Link and follow the route table above.

## Progress Model

The current UI has 9 visible steps, but the database still stores legacy raw
step numbers up to `current_step: 13`. The canonical route resolver in
`src/services/onboarding/flow.ts` maps those raw values into the current visible
routes.

Important mappings:

| Raw `current_step` value | Canonical visible route |
| --- | --- |
| 1 | `/onboarding/step-1` |
| 2 | `/onboarding/step-2` |
| 3, 4, 8 | `/onboarding/step-3` |
| 5, 6 | `/onboarding/step-4` |
| 7 | `/onboarding/step-5` |
| 9 | `/onboarding/step-6` |
| 10, 11 | `/onboarding/step-7` |
| 12 | `/onboarding/step-8` |
| 13 | `/onboarding/step-9` |

Do not re-expand the live UI back into the old 15-step model. The current
source of truth is:

1. `src/services/onboarding/flow.ts`
2. `src/App.tsx`
3. `src/pages/onboarding/**`
4. `src/pages/hushh-user-profile/**`

## Profile And NWS Output

After onboarding reaches Step 9 and writes `is_completed: true`, the profile
page becomes the main output surface.

The profile page:

1. Loads `onboarding_data` for the authenticated user.
2. Loads or creates the user's `investor_profiles` row when onboarding is
   complete.
3. Generates or re-enhances the AI investor profile through the
   `generate-investor-profile` Supabase Edge Function.
4. Calculates NWS from `user_financial_data` using the local
   `calculateNWSFromDB` scoring logic.
5. Persists `nws_score`, `nws_breakdown`, `nws_grade`, and
   `nws_calculated_at` back to `user_financial_data` when the score changes.
6. Shows wallet/profile actions, including profile sharing and wallet pass
   generation.

NWS depends on financial-link data. If the user skips Financial Link or no
financial data exists, the profile can still load, but NWS may show as
non-verified or insufficient data.

## Reviewer Rules

When reviewing PRs that touch this flow:

1. Do not allow PRs to change the route order without product approval.
2. Do not allow PRs to remove the Financial Link gate from the main onboarding
   flow.
3. Do not allow PRs to change the meaning of `current_step`, `is_completed`, or
   `financial_link_status` without migration and regression proof.
4. Do not allow UI changes that break the existing clean onboarding style,
   step progress, Playfair heading pattern, mobile layout, or CTA behavior.
5. Treat changes to Plaid, Stripe Identity, Supabase onboarding tables,
   investor profile generation, NWS scoring, payment, or bank-details handling
   as high-risk and require automated proof.
6. Frontend-only polish is acceptable when it preserves the data contract,
   route sequence, step labels, and Hushh design system.

## Automated Verification Checklist

For a safe release or PR review, verify at minimum:

1. Authenticated users can open `/onboarding/financial-link`.
2. Users with `financial_link_status: pending` cannot bypass directly into
   Step 1.
3. Users with `financial_link_status: completed` or `skipped` continue to the
   correct canonical step.
4. Each visible route from Step 1 through Step 9 renders without a blank page.
5. Step 9 writes `is_completed: true` before sending the user to
   `/onboarding/meet-ceo`.
6. `/onboarding/meet-ceo` renders the payment, coupon, and booking states
   without completing real payment or booking actions during smoke tests.
7. `/hushh-user-profile` loads onboarding data and does not crash when NWS data
   is missing.
8. If Plaid financial data exists, NWS is calculated and displayed.

Verified against `origin/main` commit
`9147cd4188551499341c0cac962d4122245e6033` on 2026-05-19.
