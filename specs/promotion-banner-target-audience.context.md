# Requirements Brief — Promotion Banner: Target Audience setting

## Source
- **Asana task:** [Promotion Banner enhancement - Target Audience setting](https://app.asana.com/1/1203662390648394/project/1203662468153988/task/1213077202136829) (gid `1213077202136829`) — Priority **High**, due **2026-08-24**, project **URRY Admin**, Where: **Admin, Shop**, Source: SAKAYA.
- **Confluence (requirement, page 22216708 "Promotion_Landing Page/Banner", v1.2 covers this ticket):** https://urry.atlassian.net/wiki/spaces/UD/pages/22216708/Promotion_Landing+Page+Banner — ✅ **Retrieved 2026-07-24, re-verified 2026-07-25** (page lastModified 2026-07-07, unchanged; a later v1.3 row covers a *different* ticket, "Improvement promotion visibility"). Target Audience criteria **confirmed** (see "Confirmed Target Audience spec" below).
- **Design (Figma):** https://figma.com/design/iH3UR40B1zvwdDpbNwtd4G/Urry-admin-screen-1.0--2022-?node-id=43732-73864
- **Latest dev note (2026-07-07):** "Updated to reflect how the Target Audience section should behave if the banner links to a Campaign."
- **Ticket status (re-checked 2026-07-25):** no new comments since 2026-07-07; task moved **Under Development → Internal Testing (Dev)** on 2026-07-15 and assigned to Hai Yen Do. Due **2026-08-24**. Feature is deployed on dev → ready to test.

## Goal
Add a **user-targeting (Target Audience) capability to Promotion Banners**, mirroring the existing **Notification – Target Audience** feature. A banner's visibility on the shop must depend on **both**: (1) the existing **product visibility rules**, and (2) the newly configured **user targeting criteria**. The banner is shown to a shop user **only when both** the product-access condition **and** the user-targeting condition are satisfied (an additional AND eligibility layer).

## Confirmed Target Audience spec (from Confluence 22216708, Portal_Banner Creation Flow)
The banner create/edit form fields, in order: **Name** (max 30 chars, unique) → **Link Destination** (choose one: Landing Page / Single Product / Sale Promotion Campaign) → **Start/End Date** (disabled & inherited when Link Destination = LP or Campaign) → **Banner** (upload short + long images) → **Display Section on Shop** (multi-select of 4 sections: Home screen, Search Results – Top, Search Results – Middle, Recently Viewed) → **Target Audience**.

**Target Audience section (the new capability):**
- **Include (Segment / User)** and **Exclude (Segment / User)** selectors — parity with Notification. Behaviour of selecting Horeca follows GUI Elements_Setup Page (page 9535721).
- **Campaign inheritance:** if Link Destination = **Campaign**, both Include and Exclude are **inherited from the Campaign and are NOT editable** (read-only). This is exactly the 2026-07-07 dev note.
- If Link Destination = **Landing Page** or **Single Product**, Target Audience is **editable**.
- **Number of Target Users** count excludes Horecas who cannot see the linked item (Product if PDP-linked / LP if LP-linked / Campaign if Campaign-linked) and Horecas in the Exclude section. When some target products are hidden, show warning: **"Customers for whom all target products are hidden will be excluded."**

**Shop eligibility (AND layer):** a banner is shown to a Horeca in a section only when **(a)** the Horeca can view the linked LP/Product/Campaign **AND (b)** the Horeca matches the Target Audience (Include minus Exclude). Sections/sizes: Home = long banner, Search Result Top = long, Search Result Mid = short, Recently Viewed = long.

## Systems & seeds (two apps, two origins)
| Layer | App | URL | Seed |
|---|---|---|---|
| Configure Target Audience on a banner | Admin Portal | `https://dev-portal.urry.com` (menu プロモーション → **バナー**) | `tests/seed-admin.spec.ts` (login `demo@urry.com`) |
| Verify banner shown/hidden per targeting | Shop front | `https://dev.urry.com` | `tests/seed.spec.ts` (Sakaya customer) |

Reference feature for UI/behaviour parity: Admin **通知・メッセージ** (Notification) Target Audience section.

## In-scope flows
**Admin (config) — fully testable now with `seed-admin`:**
- Open the バナー (Banner) list; open a banner's create/edit form.
- Confirm a new **Target Audience** section exists on the banner form (parity with Notification): segment/criteria selectors, add/remove conditions, etc.
- Configure targeting criteria and **save**; reopen to confirm persistence.
- Target Audience section **behaviour when the banner links to a Campaign** vs a Landing Page (per 2026-07-07 note).
- Validation (e.g. required fields, empty criteria) and cancel/discard.

**Shop (verification) — provisional, see limitations:**
- A banner targeted to a matching user is displayed on the shop.
- A banner targeted to a non-matching user is hidden.
- A user matching targeting but lacking product access still does not see the banner (both conditions required).

## Out-of-scope / destructive actions to AVOID
- Do **not** delete, unpublish, or overwrite pre-existing banners, campaigns, landing pages, or notifications that others rely on. If a test creates a banner, it must **clean up** (delete only the banner it created) at the end.
- Do **not** broadcast/send any notification or publish anything to real shop users.
- Do **not** place shop orders (reuse the ordering-flow guardrails: never click 注文を確定).
- Do **not** change global/system settings, tags, or 取引先 (customer) master data beyond what a test creates and reverts.

## Known limitations for full E2E (flag to stakeholders)
1. **Targeting criteria now confirmed** at the spec level (Include/Exclude Segment/User, Campaign inheritance). The exact list of selectable **segment names / Horeca options** is data-dependent on the dev environment and is discovered live during planning; scenarios assert structure, Campaign read-only inheritance, and persistence rather than hard-coding specific segment values.
2. **Shop verification needs a matched/unmatched account matrix** — only one shop account (`Test Sakaya 20250206`) is seeded. Verifying "matching vs non-matching user" requires additional shop accounts or the ability to point targeting at the seeded account.
3. **Cross-app single-test E2E** (admin sets targeting → same test checks shop) needs a custom two-context harness beyond the seed+generator model; for this pass, admin-config and shop-display are planned as separate suites with their own seeds.

## Targets
- Admin app URL: `https://dev-portal.urry.com` · seed `tests/seed-admin.spec.ts`
- Shop app URL: `https://dev.urry.com` · seed `tests/seed.spec.ts`

## Design reference (for design-token checks — Phase 6)
- **Figma fileKey:** `iH3UR40B1zvwdDpbNwtd4G` · **node-id:** `43732-73864` (already registered in `tokens/figma.config.mjs`).
- Token infra: `tokens/` + `tests/utils/figma-tokens.ts`; example spec `tests/design-tokens/banner-target-audience.tokens.spec.ts`. Run `npm run tokens:fetch` with `FIGMA_TOKEN` set, then wire real layer names → selectors. See `tokens/README.md`.
