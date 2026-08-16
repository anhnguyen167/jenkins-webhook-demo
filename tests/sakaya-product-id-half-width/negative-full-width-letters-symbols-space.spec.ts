// spec: 商品コード — Negative Validation (Full-Width and Disallowed Input Rejected)
// seed: tests/seed-admin.spec.ts

import { test, expect } from '@playwright/test';

test.describe('商品コード — Negative Validation (Full-Width and Disallowed Input Rejected)', () => {
  test('Full-width letters, full-width symbols, and full-width space all trigger the same rejection', async ({ page }) => {
    // 1. Navigate the add-product wizard (per suite 1) to the '新しく商品を登録する' dialog and locate the 商品コード input.
    await page.goto('https://dev-portal.urry.com/products');
    await page.getByRole('tab', { name: '新商品登録' }).click();

    const newProductTabPanel = page.getByRole('tabpanel', { name: '新商品登録' });
    const productListSummary = newProductTabPanel.getByText(/件中\/1-20件を表示/);
    const initialProductListSummary = await productListSummary.textContent();

    await page.getByRole('button', { name: '新商品を追加する' }).click();

    // Leave '手動で商品を追加する' selected, click '次の画面へ'
    await page.getByRole('button', { name: '次の画面へ' }).click();

    // Fill 商品名 with a unique throwaway test string and click 'マッチする商品を探す'
    await page.getByRole('textbox', { name: '例：コカ・コーラ ゼロ' }).fill(`QA Full Width Test ${Date.now()}`);
    await page.getByRole('button', { name: 'マッチする商品を探す' }).click();

    // Without checking any candidate checkbox, click '次の画面へ'
    await page.getByRole('button', { name: '次の画面へ' }).click();

    // Click '見つからないため次の画面へ' to reach the '新しく商品を登録する' dialog
    await page.getByRole('button', { name: '見つからないため次の画面へ' }).click();

    const productCodeInput = page.getByRole('textbox', { name: '例： 09348' });
    await expect(productCodeInput).toBeVisible();
    await expect(productCodeInput).not.toHaveAttribute('aria-invalid', 'true');

    // 2. One at a time, fill the field with each of the full-width letters, full-width symbols, and a
    // full-width (ideographic) space value, re-checking state after each fill.
    const fullWidthValues: { label: string; value: string }[] = [
      { label: 'full-width Latin letters', value: 'ＡＢＣ' },
      { label: 'full-width low line (underscore)', value: '＿' },
      { label: 'full-width hyphen-minus', value: '－' },
      { label: 'full-width number sign (hash)', value: '＃' },
      { label: 'value containing an ideographic (full-width) space', value: '2701030　1' },
    ];

    for (const { label, value } of fullWidthValues) {
      await test.step(`Fill 商品コード with ${label}: '${value}'`, async () => {
        await productCodeInput.fill(value);

        // expect: The field's value visibly contains the full-width characters as typed (not converted).
        await expect(productCodeInput).toHaveValue(value);

        // expect: The input has aria-invalid='true'.
        await expect(productCodeInput).toHaveAttribute('aria-invalid', 'true');

        // expect: The input's MUI OutlinedInput root gains the 'Mui-error' class.
        const outlinedInputRoot = productCodeInput.locator('xpath=..');
        await expect(outlinedInputRoot).toHaveClass(/Mui-error/);

        // expect: The stable substring/regex inline error is shown beneath the field, avoiding the
        // cosmetically-variable parenthesised symbol list.
        const errorMessage = page.getByText(/半角英数字と一部の記号.*のみで登録してください/);
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toContainText('半角英数字と一部の記号');
        await expect(errorMessage).toContainText('のみで登録してください');

        // Clear the field so state cannot leak into the next value's check.
        await productCodeInput.fill('');
      });
    }

    // 3. Close the dialog via the footer '閉じる' button without submitting.
    await page.getByRole('button', { name: '閉じる' }).click();

    // expect: No product was created; the 新商品登録 tab's product list is unchanged.
    await expect(productListSummary).toHaveText(initialProductListSummary ?? '');
  });
});
