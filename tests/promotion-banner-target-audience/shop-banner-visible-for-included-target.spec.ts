// spec: Shop Verification of Target Audience Eligibility (Provisional)
// seed: tests/seed.spec.ts
//
// PROVISIONAL / PRECONDITION NOT MET:
// This scenario requires an admin-seeded fixture that does NOT exist today and cannot be
// created by this test (creating/activating a live shop banner is out of scope here):
//   - A Promotion Banner with Link Destination = Single Product or Landing Page
//   - Display Section including ホーム画面 (Home screen)
//   - Target Audience "Include" configured to cover the 'Test Sakaya 20250206' account
//     (directly or via a segment/group it belongs to), with no matching "Exclude" entry
//   - The linked product/LP visible to this account
//   - Status = アクティブ (active) for the duration of verification
//
// Live exploration on 2026-07-25 confirmed the shop Home page currently renders an EMPTY
// banner carousel container (`.home-banner-carousel`, 0 child images, 0 height) for the
// 'Test Sakaya 20250206' account — i.e. no banner is presently targeted to this account.
//
// This test therefore only asserts what is genuinely verifiable live right now (the Home
// page loads, and the Home banner display area/container exists with the expected
// structure). The targeting-specific assertion (that a SPECIFIC Include-targeted banner is
// visible) only runs once an admin sets up the fixture banner above and supplies its exact
// name/alt-text via the URRY_TARGETED_BANNER_NAME environment variable; until then it is
// cleanly skipped (never falsely passes, never falsely fails).

import { test, expect } from '@playwright/test';

test.describe('Shop Verification of Target Audience Eligibility (Provisional)', () => {
  test('[Provisional] A banner whose Target Audience includes the current shop customer is displayed on the shop Home screen', async ({ page }) => {
    // 2. Start from the authenticated shop home page (via seed.spec.ts) as 'Test Sakaya 20250206'.
    await expect(page).toHaveURL('https://dev.urry.com/');
    await expect(page.getByRole('button', { name: 'Test Sakaya 20250206' })).toBeVisible();

    // 3. Visually/structurally inspect the Home screen banner carousel/area.
    // Discovered locator: the Home banner display area is a dedicated container with the
    // hardcoded class `home-banner-carousel`, positioned between the category quick-links
    // row and the "My カタログ" section. It is present in the DOM regardless of whether any
    // banner currently targets this account.
    const bannerArea = page.locator('.home-banner-carousel');
    await expect(bannerArea).toBeAttached();

    // If the carousel is currently populated, verify each rendered banner has the expected
    // image structure. At the time of writing it was empty (no banner targets this account),
    // so this block is a structural safety net rather than a hard requirement.
    const bannerImages = bannerArea.locator('img');
    const bannerImageCount = await bannerImages.count();
    if (bannerImageCount > 0) {
      await expect(bannerImages.first()).toBeVisible();
      await expect(bannerImages.first()).toHaveAttribute('src', /.+/);
    }

    // 1. PRECONDITION verification (admin-seeded, targeting a SPECIFIC banner at this account).
    // Guarded: only runs once an admin has configured the fixture banner described above and
    // supplied its name/alt-text via URRY_TARGETED_BANNER_NAME. Until then this cleanly skips.
    test.skip(
      !process.env.URRY_TARGETED_BANNER_NAME,
      'Requires an active, ホーム画面-displayed banner whose Target Audience Include covers ' +
        "'Test Sakaya 20250206' (with the linked product/LP visible to it). Supply its name " +
        '(matching the banner image alt text) via the URRY_TARGETED_BANNER_NAME env var to run this check.'
    );
    const targetedBannerName = process.env.URRY_TARGETED_BANNER_NAME as string;
    await expect(bannerArea.getByRole('img', { name: targetedBannerName })).toBeVisible();
  });
});
