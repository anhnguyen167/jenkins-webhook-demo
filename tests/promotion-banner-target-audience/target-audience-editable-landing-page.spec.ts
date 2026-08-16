// spec: Target Audience — Editable for Landing Page and Single Product Links
// seed: tests/seed-admin.spec.ts

import { test, expect } from '@playwright/test';

const ADMIN_BASE = process.env.URRY_ADMIN_BASE ?? 'https://dev-portal.urry.com';

test.describe('Target Audience — Editable for Landing Page and Single Product Links', () => {
  test('Target Audience remains editable for a Landing-Page-linked banner even though dates are inherited', async ({
    page,
  }) => {
    // 1. Navigate to /promotions/banner and open the 'Test LINK LP' banner (Link Destination = ランディングページ) via its pencil icon.
    await page.goto(`${ADMIN_BASE}/promotions/banner`);
    await page.getByText('Test LINK LP').first().waitFor({ state: 'visible' });
    const bannerRow = page.getByRole('button', { name: /^Test LINK LP/ }).first();
    await bannerRow.locator('button').nth(1).click();

    // expect: Details tab shows 'ランディングページ' selected, and the 開始日と終了日を設定する section shows ONLY
    // the static text '選択したランディングページのキャンペーン期間が適用されます。' with no editable date radios/inputs
    // (dates are inherited from the Landing Page/Campaign period).
    await expect(page.getByRole('textbox', { name: '管理用のバナー名を入力する' })).toHaveValue('Test LINK LP');
    await expect(page.getByRole('radio', { name: 'ランディングページ' })).toBeChecked();
    const dateSection = page.getByText('開始日と終了日を設定する', { exact: true }).locator('xpath=..');
    await expect(dateSection.getByText('選択したランディングページのキャンペーン期間が適用されます。')).toBeVisible();
    await expect(dateSection.getByRole('radio')).toHaveCount(0);
    await expect(dateSection.getByRole('textbox')).toHaveCount(0);

    // 2. Click '次へ' to reach '対象店舗の設定'.
    await page.getByRole('button', { name: '次へ' }).click();

    // expect: Unlike the date fields, the Include/Exclude group and customer inputs in this tab are NOT read-only
    // (verify the input elements' readOnly/disabled attributes are false, or that they are visually white/interactive)
    // — proving that only Start/End Date is inherited for Landing-Page links, while Target Audience remains fully editable.
    await expect(page.getByText('バナーを表示する対象店舗の設定')).toBeVisible();
    await expect(page.getByText('含める対象店舗')).toBeVisible();
    await expect(page.getByText('除外する対象店舗')).toBeVisible();
    const includeGroupInput = page.getByPlaceholder('グループを選択').nth(0);
    const includeCustomerInput = page.getByPlaceholder('取引先を検索する').nth(0);
    const excludeGroupInput = page.getByPlaceholder('グループを選択').nth(1);
    const excludeCustomerInput = page.getByPlaceholder('取引先を検索する').nth(1);
    await expect(includeGroupInput).toBeEditable();
    await expect(includeCustomerInput).toBeEditable();
    await expect(excludeGroupInput).toBeEditable();
    await expect(excludeCustomerInput).toBeEditable();

    // 3. Close the drawer via the (X) close button and click '保存せずに閉じる' if the confirmation dialog appears.
    await page.getByRole('button', { name: 'close' }).click();
    await page.getByRole('button', { name: '保存せずに閉じる' }).click();

    // expect: No change was persisted to the 'Test LINK LP' banner.
    await expect(page.getByRole('link', { name: 'バナー' })).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: 'Test LINK LP Landing page banner Landing page banner アクティブ なし 2026/06/16 09:53 終了しない',
      })
    ).toBeVisible();
  });
});
