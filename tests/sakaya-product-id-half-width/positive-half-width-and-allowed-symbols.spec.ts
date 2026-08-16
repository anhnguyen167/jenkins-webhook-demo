// spec: 商品コード — Positive Validation (Half-Width Accepted, Field-Level Only, No Submit)
// seed: tests/seed-admin.spec.ts

import { test, expect } from '@playwright/test';

test.describe('商品コード — Positive Validation (Half-Width Accepted, Field-Level Only, No Submit)', () => {
  test('Half-width alphanumerics and each of the four allowed symbols are accepted with no error', async ({ page }) => {
    // 1. Navigate the add-product wizard to the '新しく商品を登録する' dialog and locate the 商品コード input.
    await page.goto('https://dev-portal.urry.com/products');
    await page.getByRole('tab', { name: '新商品登録' }).click();

    const newProductTabPanel = page.getByRole('tabpanel', { name: '新商品登録' });
    const productListSummary = newProductTabPanel.getByText(/件中\/1-20件を表示/);
    const initialProductListSummary = await productListSummary.textContent();

    await page.getByRole('button', { name: '新商品を追加する' }).click();

    // Leave '手動で商品を追加する' selected, click '次の画面へ'
    await page.getByRole('button', { name: '次の画面へ' }).click();

    // Fill 商品名 with a unique throwaway test string and click 'マッチする商品を探す'
    await page.getByRole('textbox', { name: '例：コカ・コーラ ゼロ' }).fill(`QA Half Width Positive Test ${Date.now()}`);
    await page.getByRole('button', { name: 'マッチする商品を探す' }).click();

    // Without checking any candidate checkbox, click '次の画面へ'
    await page.getByRole('button', { name: '次の画面へ' }).click();

    // Click '見つからないため次の画面へ' to reach the '新しく商品を登録する' dialog
    await page.getByRole('button', { name: '見つからないため次の画面へ' }).click();

    const productCodeInput = page.getByRole('textbox', { name: '例： 09348' });
    await expect(productCodeInput).toBeVisible();
    await expect(productCodeInput).not.toHaveAttribute('aria-invalid', 'true');

    const outlinedInputRoot = productCodeInput.locator('xpath=..');
    const errorMessage = page.getByText(/半角英数字と一部の記号.*のみで登録してください/);

    // 2. One at a time, fill the field with each half-width alphanumeric / allowed-symbol value and
    // re-check state after each fill.
    const validValues: { label: string; value: string }[] = [
      { label: 'pure half-width digits (the corrected form of the original bug value)', value: '2701030' },
      { label: 'internal test code using underscore', value: '265_bn' },
      { label: 'hyphen', value: 'A-1' },
      { label: 'period', value: 'x.y' },
      { label: 'hash', value: 'C#1' },
    ];

    for (const { label, value } of validValues) {
      await test.step(`Fill 商品コード with ${label}: '${value}'`, async () => {
        await productCodeInput.fill(value);

        // expect: The field's value equals what was typed.
        await expect(productCodeInput).toHaveValue(value);

        // expect: aria-invalid is NOT 'true' (may be absent or 'false').
        await expect(productCodeInput).not.toHaveAttribute('aria-invalid', 'true');

        // expect: The OutlinedInput root does NOT gain the 'Mui-error' class.
        await expect(outlinedInputRoot).not.toHaveClass(/Mui-error/);

        // expect: No inline error paragraph is rendered.
        await expect(errorMessage).toHaveCount(0);

        // expect: The fieldset border is NOT the error red rgb(211, 47, 47).
        await expect(outlinedInputRoot.locator('fieldset')).not.toHaveCSS('border-color', 'rgb(211, 47, 47)');

        // Clear the field so state cannot leak into the next value's check.
        await productCodeInput.fill('');
      });
    }

    // 3. Do NOT click '商品の登録を申請する'. Close the dialog via the footer '閉じる' button.
    await page.getByRole('button', { name: '閉じる' }).click();

    // expect: The dialog closes without any product being created; the 新商品登録 tab's product list is unchanged.
    await expect(productListSummary).toHaveText(initialProductListSummary ?? '');
  });
});
