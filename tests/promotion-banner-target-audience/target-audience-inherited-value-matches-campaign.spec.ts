// spec: Target Audience — Campaign Link Inheritance (Read-only)
// seed: tests/seed-admin.spec.ts

import { test, expect } from '@playwright/test';

const ADMIN_BASE = process.env.URRY_ADMIN_BASE ?? 'https://dev-portal.urry.com';

test.describe('Target Audience — Campaign Link Inheritance (Read-only)', () => {
  test("Inherited Include group on a Campaign-linked banner matches the campaign's own configured target group", async ({ page }) => {
    // 1. Navigate to /promotions/sales, open the campaign linked to the 'Banner Campaign' banner (e.g. 'Create Draft Campaign 23') via its detail page.
    await page.getByRole('link', { name: 'プロモーション' }).click();
    await expect(page).toHaveURL(`${ADMIN_BASE}/promotions/sales`);
    const campaignLink = page.locator("a:has-text('Create Draft Campaign 23')");
    await expect(campaignLink).toBeVisible();

    const [campaignPage] = await Promise.all([
      page.context().waitForEvent('popup'),
      campaignLink.click(),
    ]);

    // expect: The 'キャンペーン対象店舗' section shows a specific value under '対象グループ'.
    await expect(campaignPage.getByRole('heading', { name: 'キャンペーンの詳細' })).toBeVisible();
    await expect(campaignPage.getByRole('heading', { name: 'キャンペーン対象店舗' })).toBeVisible();
    const targetGroupHeading = campaignPage.getByRole('heading', { name: '対象グループ', exact: true });
    await expect(targetGroupHeading).toBeVisible();
    const targetGroupValueRaw = await targetGroupHeading.locator('xpath=following-sibling::div[1]').textContent();
    const targetGroupValue = (targetGroupValueRaw ?? '').trim();
    expect(targetGroupValue.length).toBeGreaterThan(0);
    await campaignPage.close();

    // 2. Navigate to /promotions/banner, open 'Banner Campaign' via its pencil icon, advance to '対象店舗の設定'.
    await page.goto(`${ADMIN_BASE}/promotions/banner`);
    await expect(page.getByText('Banner Campaign').first()).toBeVisible();
    const bannerRow = page.locator('tr', { hasText: 'Banner Campaign' }).first();
    await bannerRow.locator('.td-sticky-right button').first().click();
    await expect(page.getByRole('textbox', { name: '管理用のバナー名を入力する' })).toHaveValue('Banner Campaign');
    await page.getByRole('button', { name: '次へ' }).click();

    // expect: The read-only Include group chip displayed on the banner exactly matches the captured '対象グループ' value from step 1.
    await expect(page.getByText('バナーを表示する対象店舗の設定')).toBeVisible();
    const includeGroupChip = page.locator('.MuiChip-root');
    await expect(includeGroupChip).toBeVisible();
    const chipTextRaw = await includeGroupChip.textContent();
    expect((chipTextRaw ?? '').trim()).toBe(targetGroupValue);

    // 3. Close the banner drawer without saving.
    await page.getByRole('button', { name: 'close' }).click();
    await page.getByRole('button', { name: '保存せずに閉じる' }).click();

    // expect: No data was modified on either the campaign or the banner.
    await expect(page.getByRole('link', { name: 'バナー' })).toBeVisible();
    await expect(page.getByText('Banner Campaign').first()).toBeVisible();
  });
});
