// spec: Target Audience — Campaign Link Inheritance (Read-only)
// seed: tests/seed-admin.spec.ts

import { test, expect } from '@playwright/test';

const ADMIN_BASE = process.env.URRY_ADMIN_BASE ?? 'https://dev-portal.urry.com';

test.describe('Target Audience — Campaign Link Inheritance (Read-only)', () => {
  test('Include/Exclude fields are read-only and inherited when Link Destination = 販売促進キャンペーン', async ({
    page,
  }) => {
    // 1. Navigate to /promotions/banner and open the 'Banner Campaign' banner (Link Destination = 販売促進キャンペーン) via its pencil icon.
    await page.goto(`${ADMIN_BASE}/promotions/banner`);
    await page.getByText('Banner Campaign').first().waitFor({ state: 'visible' });
    const bannerRow = page.locator('tr', { hasText: 'Banner Campaign' }).first();
    await bannerRow.locator('.td-sticky-right button').first().click();

    // expect: Details tab shows '販売促進キャンペーン' selected in リンク先を選択する, with the linked campaign name shown
    // (e.g. 'Create Draft Campaign 23'), and the 開始日と終了日を設定する section shows ONLY the static inherited text
    // '選択したランディングページのキャンペーン期間が適用されます。' (no editable date controls).
    await expect(page.getByRole('textbox', { name: '管理用のバナー名を入力する' })).toHaveValue('Banner Campaign');
    await expect(page.getByRole('radio', { name: '販売促進キャンペーン' })).toBeChecked();
    await expect(page.getByText('Create Draft Campaign 23')).toBeVisible();
    const dateSection = page.getByText('開始日と終了日を設定する', { exact: true }).locator('xpath=..');
    await expect(dateSection.getByText('選択したランディングページのキャンペーン期間が適用されます。')).toBeVisible();
    await expect(dateSection.getByRole('radio')).toHaveCount(0);
    await expect(dateSection.getByRole('textbox')).toHaveCount(0);

    // 2. Click '次へ' to reach '対象店舗の設定'.
    await page.getByRole('button', { name: '次へ' }).click();

    // expect: The 含める取引先グループ, 含める取引先, 除外する取引先グループ, and 除外する取引先 input fields all appear
    // visually greyed-out/disabled (light grey background) and CANNOT be focused or typed into (verify
    // programmatically: each corresponding <input> element has readOnly=true).
    await expect(page.getByText('バナーを表示する対象店舗の設定')).toBeVisible();
    const includeGroupInput = page.getByPlaceholder('グループを選択').nth(0);
    const includeCustomerInput = page.getByPlaceholder('取引先を検索する').nth(0);
    const excludeGroupInput = page.getByPlaceholder('グループを選択').nth(1);
    const excludeCustomerInput = page.getByPlaceholder('取引先を検索する').nth(1);
    await expect(includeGroupInput).not.toBeEditable();
    await expect(includeCustomerInput).not.toBeEditable();
    await expect(excludeGroupInput).not.toBeEditable();
    await expect(excludeCustomerInput).not.toBeEditable();
    await expect(includeGroupInput).toHaveJSProperty('readOnly', true);
    await expect(includeCustomerInput).toHaveJSProperty('readOnly', true);
    await expect(excludeGroupInput).toHaveJSProperty('readOnly', true);
    await expect(excludeCustomerInput).toHaveJSProperty('readOnly', true);

    // expect: Any pre-populated group/customer chip (e.g. a group chip showing the inherited group name) renders as a
    // PLAIN chip with NO 'X'/remove icon, unlike the removable chips seen on editable (Single-Product/Landing-Page)
    // banners.
    const includeGroupChip = page.locator('.MuiChip-root').filter({ hasText: 'Test YEN' });
    await expect(includeGroupChip).toBeVisible();
    await expect(includeGroupChip.locator('img')).toHaveCount(0);
    await expect(includeGroupChip.locator('button')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Test YEN' })).toHaveCount(0);

    // 3. Attempt to click directly into the 含める取引先グループ combobox and type a search string.
    await includeGroupInput.click();
    await expect(includeGroupInput.pressSequentially('test', { timeout: 3000 })).rejects.toThrow();

    // expect: No dropdown/autocomplete list of selectable groups opens, and no text is entered into the field,
    // confirming it is truly non-interactive rather than merely styled to look disabled.
    await expect(includeGroupInput).toHaveValue('');
    await expect(page.getByRole('listbox')).toHaveCount(0);

    // 4. Close the drawer via the (X) close button.
    await page.getByRole('button', { name: 'close' }).click();

    // expect: Either the drawer closes with no confirmation dialog (nothing was changed, since the fields could not
    // be edited), or if a dialog appears, click '保存せずに閉じる' — never save.
    await page.getByRole('button', { name: '保存せずに閉じる' }).click();
    await expect(page.getByRole('link', { name: 'バナー' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Banner Campaign Landing page' }).first()).toBeVisible();
  });
});
