// spec: Target Audience — Editable for Landing Page and Single Product Links
// seed: tests/seed-admin.spec.ts

import { test, expect } from '@playwright/test';

const ADMIN_BASE = process.env.URRY_ADMIN_BASE ?? 'https://dev-portal.urry.com';

test.describe('Target Audience — Editable for Landing Page and Single Product Links', () => {
  test('Target Audience Include/Exclude fields are editable when Link Destination = 1つの商品 (Single Product)', async ({
    page,
  }) => {
    // 1. Navigate to /promotions/banner and open the 'In & Ex' banner (Link Destination = 1つの商品) via its pencil icon.
    await page.goto(`${ADMIN_BASE}/promotions/banner`);
    await page.getByText('In & Ex').first().waitFor({ state: 'visible' });
    await page
      .locator(
        '.MuiTableRow-root.css-1gqug66 > .MuiTableCell-root.MuiTableCell-body.MuiTableCell-sizeMedium.td-sticky-right > .css-ak9jmb > button'
      )
      .first()
      .click();

    // expect: Details tab shows '1つの商品' selected in the リンク先を選択する radiogroup, and the 開始日と終了日を設定する
    // section shows EDITABLE radio options ('今すぐ開始'/'開始日を設定', '終了しない'/'終了日を設定') with date/time inputs
    // — not the static inherited text.
    await expect(page.getByRole('textbox', { name: '管理用のバナー名を入力する' })).toHaveValue('In & Ex');
    await expect(page.getByRole('radio', { name: '1つの商品' })).toBeChecked();
    await expect(page.getByRole('radio', { name: '今すぐ開始' })).toBeVisible();
    await expect(page.getByRole('radio', { name: '開始日を設定' })).toBeVisible();
    await expect(page.getByRole('radio', { name: '終了しない' })).toBeVisible();
    await expect(page.getByRole('radio', { name: '終了日を設定' })).toBeVisible();
    const dateSection = page.getByText('開始日と終了日を設定する', { exact: true }).locator('xpath=..');
    await expect(dateSection.getByRole('textbox', { name: 'yyyy/mm/dd' })).toHaveCount(2);

    // 2. Click '次へ' to reach '対象店舗の設定'.
    await page.getByRole('button', { name: '次へ' }).click();

    // expect: The '含める取引先グループ' and '取引先を検索する' (Include) and the equivalent Exclude inputs are NOT
    // read-only: they can receive focus and accept typed text.
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

    // expect: Any existing selected group/customer chips (e.g. an Include group chip and an Exclude customer chip such
    // as 'DELI') render with a visible, clickable 'X' remove icon, confirming they are editable/removable.
    const includeGroupChip = page.getByRole('button', { name: 'Include Exclude' });
    const excludeCustomerChip = page.getByRole('button', { name: 'DELI' });
    await expect(includeGroupChip).toBeVisible();
    await expect(includeGroupChip.locator('img')).toBeVisible();
    await expect(excludeCustomerChip).toBeVisible();
    await expect(excludeCustomerChip.locator('img')).toBeVisible();

    // 3. Without clicking any 'X' or typing anything that would change the saved state, close the drawer via the (X)
    // close button, then click '保存せずに閉じる' in the resulting confirmation dialog.
    await page.getByRole('button', { name: 'close' }).click();
    await page.getByRole('button', { name: '保存せずに閉じる' }).click();

    // expect: The drawer closes, the banner list is unchanged, and the 'In & Ex' banner's Include/Exclude
    // configuration remains exactly as it was before this test ran.
    await expect(page.getByRole('link', { name: 'バナー' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'In & Ex Landing page banner' })).toBeVisible();
  });
});
