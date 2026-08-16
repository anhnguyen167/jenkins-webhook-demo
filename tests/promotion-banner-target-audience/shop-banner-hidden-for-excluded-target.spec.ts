// spec: Shop Verification of Target Audience Eligibility (Provisional)
// seed: tests/seed.spec.ts
//
// PROVISIONAL / PRECONDITION NOT MET:
// This scenario requires an admin-seeded fixture that does NOT exist today and cannot be
// created by this test (creating/activating/editing a live shop banner is out of scope for
// the shop front end, and is the admin app's responsibility):
//   - A Promotion Banner ("the excluded banner") with Link Destination = Single Product or LP
//   - Display Section including ホーム画面 (Home screen), Status = アクティブ (active)
//   - Target Audience "Include" configured to cover a group that the 'Test Sakaya 20250206'
//     account belongs to, AND Target Audience "Exclude" explicitly naming that same account
//     (so, per the Include-minus-Exclude rule, this account must NOT see it)
//   - The linked product/LP otherwise visible to the account (i.e. targeting is the only
//     reason it should be hidden)
//   - A SECOND, separate "control" banner that IS visible to this account (also ホーム画面,
//     active), used only to prove the carousel is capable of rendering banners at all
//
// VACUOUS-PASS HAZARD:
// Live exploration on 2026-07-25 confirmed the shop Home page currently renders an EMPTY
// banner carousel container (`.home-banner-carousel`, outerHTML
// `<div class="home-banner-carousel"><div class="relative"></div></div>`, 0 <img> elements,
// 0px height) for the 'Test Sakaya 20250206' account — i.e. NO banner is presently targeted
// to this account at all. Because of this, a naive "assert the excluded banner is absent"
// check would trivially and permanently pass today even if Exclude-list logic were entirely
// broken, since there is nothing rendered in the carousel to begin with. Such a test would be
// worse than no test: it would create false confidence.
//
// To avoid that, this test only asserts what is genuinely verifiable live right now (the Home
// page loads, and the Home banner container exists in the DOM). The actual Exclude-logic
// assertion is gated behind TWO required fixture inputs and, when it runs, asserts BOTH
// directions so it cannot pass vacuously:
//   - URRY_CONTROL_BANNER_NAME: name/alt-text of a banner that IS visible to this account —
//     asserted to be PRESENT inside `.home-banner-carousel`. This proves the carousel can and
//     does render banners for this account, which is what makes the negative assertion below
//     meaningful rather than trivially true.
//   - URRY_EXCLUDED_BANNER_NAME: name/alt-text of the banner whose Exclude list names this
//     account (per the precondition above) — asserted to be ABSENT from `.home-banner-carousel`.
// Until both env vars are supplied, this targeting-specific block is cleanly skipped (never
// falsely passes, never falsely fails).

import { test, expect } from '@playwright/test';

test.describe('Shop Verification of Target Audience Eligibility (Provisional)', () => {
  test("[Provisional] A banner whose Target Audience excludes the current shop customer is NOT displayed, even if their group is included", async ({ page }) => {
    // 2. Start from the authenticated shop home page (via seed.spec.ts) as 'Test Sakaya 20250206'.
    await expect(page).toHaveURL('https://dev.urry.com/');
    await expect(page.getByRole('button', { name: 'Test Sakaya 20250206' })).toBeVisible();

    // 3. Inspect the Home screen banner carousel/area for the precondition banner.
    // Discovered locator: the Home banner display area is a dedicated container with the
    // hardcoded class `home-banner-carousel`, positioned between the category quick-links
    // row and the "My カタログ" section. It is present in the DOM regardless of whether any
    // banner currently targets this account. At the time of writing it was empty (outerHTML
    // `<div class="home-banner-carousel"><div class="relative"></div></div>`, 0 images).
    const bannerArea = page.locator('.home-banner-carousel');
    await expect(bannerArea).toBeAttached();

    // 1. PRECONDITION verification (admin-seeded fixture: an excluded banner + a control banner).
    // Guarded: only runs once an admin has configured BOTH fixture banners described above and
    // supplied their names/alt-text via env vars. Until then this cleanly skips rather than
    // risking a vacuous pass.
    test.skip(
      !process.env.URRY_EXCLUDED_BANNER_NAME || !process.env.URRY_CONTROL_BANNER_NAME,
      'Requires two active, ホーム画面-displayed banners: (1) URRY_EXCLUDED_BANNER_NAME — a ' +
        "banner whose Target Audience Include covers a group 'Test Sakaya 20250206' belongs to " +
        "but whose Exclude list explicitly names that account, and (2) URRY_CONTROL_BANNER_NAME — " +
        'a separate banner that IS visible to this account, proving the carousel can render ' +
        'banners at all (without it, an absent excluded banner would prove nothing). Supply both ' +
        'names (matching each banner image alt text) via environment variables to run this check.'
    );
    const excludedBannerName = process.env.URRY_EXCLUDED_BANNER_NAME as string;
    const controlBannerName = process.env.URRY_CONTROL_BANNER_NAME as string;

    // Non-vacuousness check: the control banner must render, proving the carousel does display
    // banners targeted to this account, so the excluded banner's absence below is meaningful.
    await expect(bannerArea.getByRole('img', { name: controlBannerName })).toBeVisible();

    // The actual Exclude-logic assertion: the excluded banner must NOT appear anywhere in the
    // Home banner area for this account, confirming Exclude correctly overrides Include.
    await expect(bannerArea.getByRole('img', { name: excludedBannerName })).not.toBeAttached();
  });
});
