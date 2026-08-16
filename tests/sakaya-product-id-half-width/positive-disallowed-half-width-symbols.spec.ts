// spec: 商品コード — Positive Validation (Half-Width Accepted, Field-Level Only, No Submit)
// seed: tests/seed-admin.spec.ts

import { test, expect } from '@playwright/test';

test.describe('商品コード — Positive Validation (Half-Width Accepted, Field-Level Only, No Submit)', () => {
  test('Half-width symbols outside the allowed set are rejected (document actual scope of the restriction)', async ({ page }) => {
    // 1. Navigate to the '新しく商品を登録する' dialog and locate 商品コード.
    await page.goto('https://dev-portal.urry.com/products');
    await page.getByRole('tab', { name: '新商品登録' }).click();

    const newProductTabPanel = page.getByRole('tabpanel', { name: '新商品登録' });
    const productListSummary = newProductTabPanel.getByText(/件中\/1-20件を表示/);
    const initialProductListSummary = await productListSummary.textContent();

    await page.getByRole('button', { name: '新商品を追加する' }).click();

    // Leave '手動で商品を追加する' selected, click '次の画面へ'
    await page.getByRole('button', { name: '次の画面へ' }).click();

    // Fill 商品名 with a unique throwaway test string and click 'マッチする商品を探す'
    await page.getByRole('textbox', { name: '例：コカ・コーラ ゼロ' }).fill(`QA Disallowed Half Width Symbols Test ${Date.now()}`);
    await page.getByRole('button', { name: 'マッチする商品を探す' }).click();

    // Without checking any candidate checkbox, click '次の画面へ'
    await page.getByRole('button', { name: '次の画面へ' }).click();

    // Click '見つからないため次の画面へ' to reach the '新しく商品を登録する' dialog
    await page.getByRole('button', { name: '見つからないため次の画面へ' }).click();

    const productCodeInput = page.getByRole('textbox', { name: '例： 09348' });
    await expect(productCodeInput).toBeVisible();
    // expect: Field is present with no error.
    await expect(productCodeInput).not.toHaveAttribute('aria-invalid', 'true');

    const outlinedInputRoot = productCodeInput.locator('xpath=..');
    const errorMessage = page.getByText(/半角英数字と一部の記号.*のみで登録してください/);

    // 2. One at a time, fill the field with each disallowed half-width symbol value, re-checking state
    // after each. A trailing half-width space is used as typed: exploration confirmed the field does
    // NOT trim it (the fill()'d value round-trips exactly via toHaveValue), so the value genuinely
    // exercises a trailing space character rather than needing to be relocated mid-string.
    const disallowedValues: { label: string; value: string }[] = [
      { label: 'half-width solidus (slash)', value: '2701030/' },
      { label: 'half-width commercial at (at-sign)', value: '2701030@' },
      { label: 'half-width asterisk', value: '2701030*' },
      { label: 'value with a trailing half-width space', value: '2701030 ' },
    ];

    for (const { label, value } of disallowedValues) {
      await test.step(`Fill 商品コード with ${label}: '${value}'`, async () => {
        await productCodeInput.fill(value);

        // expect: The field's value equals what was typed (characters are never normalized).
        await expect(productCodeInput).toHaveValue(value);

        // expect: aria-invalid='true' — observed behavior confirms this value is rejected.
        await expect(productCodeInput).toHaveAttribute('aria-invalid', 'true');

        // expect: The OutlinedInput root gains the 'Mui-error' class.
        await expect(outlinedInputRoot).toHaveClass(/Mui-error/);

        // expect: The stable substring/regex inline error is shown beneath the field.
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toContainText('半角英数字と一部の記号');
        await expect(errorMessage).toContainText('のみで登録してください');

        // Clear the field so state cannot leak into the next value's check.
        await productCodeInput.fill('');
      });
    }

    // 3. Close the dialog via '閉じる' without submitting.
    await page.getByRole('button', { name: '閉じる' }).click();

    // expect: No product was created; the 新商品登録 tab's product list is unchanged.
    await expect(productListSummary).toHaveText(initialProductListSummary ?? '');
  });
});
