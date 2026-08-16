// spec: specs/plan.md
// seed: tests/seed-admin.spec.ts

import { test, expect } from '@playwright/test';

const ADMIN_BASE = process.env.URRY_ADMIN_BASE ?? 'https://dev-portal.urry.com';

test.describe('Banner List and Navigation', () => {
  test('Open an existing banner edit drawer via the pencil icon and view both tabs', async ({ page }) => {
    // 1. Navigate to /promotions/banner. In the ホーム section table, locate any existing banner row (e.g. 'In & Ex') and click ONLY the first (pencil/edit) icon in its アクション cell — do NOT click the second (pause) or third (delete) icon.
    await page.goto(`${ADMIN_BASE}/promotions/banner`);
    await page.getByText('In & Ex').first().waitFor({ state: 'visible' });
    await page
      .locator(
        'tr:nth-child(2) > .MuiTableCell-root.MuiTableCell-body.MuiTableCell-sizeMedium.td-sticky-right > .css-ak9jmb > button'
      )
      .first()
      .click();

    // expect: A right-side drawer opens with a close (X) button and two tabs at the top: '詳細' and '対象店舗の設定'.
    await expect(page.getByRole('button', { name: 'close', exact: true })).toBeVisible();
    await expect(page.getByText('詳細', { exact: true })).toBeVisible();
    await expect(page.getByText('対象店舗の設定')).toBeVisible();

    // expect: The '詳細' tab is active by default and shows the banner's current name pre-filled in '管理用のバナー名 *' with a 'N/30' character counter, and the 'リンク先を選択する *' radiogroup with the correct option pre-selected.
    await expect(page.getByRole('textbox', { name: '管理用のバナー名を入力する' })).toHaveValue('In & Ex');
    await expect(page.getByText('/30')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'つの商品' })).toBeVisible();

    // 2. Click '次へ' (or the '対象店舗の設定' tab label) to move to the Target Store Settings step.
    await page.getByRole('button', { name: '次へ' }).click();

    // expect: The tab header now shows a back arrow plus '詳細' (inactive) and '対象店舗の設定' (active).
    await expect(page.getByRole('button', { name: 'back' })).toBeVisible();

    // expect: Heading 'バナーを表示する対象店舗の設定' is visible, along with an '含める対象店舗' section, a '除外する対象店舗' section, a 'バナーが表示される対象店舗数' counter with a '再計算する' button, and a warning paragraph about banners not being shown to customers for whom all target products are hidden.
    await expect(page.getByText('バナーを表示する対象店舗の設定')).toBeVisible();
    await expect(page.getByText('含める対象店舗')).toBeVisible();
    await expect(page.getByText('除外する対象店舗')).toBeVisible();
    await expect(page.getByText('バナーが表示される対象店舗数')).toBeVisible();
    await expect(page.getByRole('button', { name: '再計算する' })).toBeVisible();
    await expect(
      page.getByText('すべての対象商品が非表示となっているお客様には、バナーは表示されません。')
    ).toBeVisible();

    // 3. Close the drawer via the (X) close button WITHOUT changing any field.
    await page.getByRole('button', { name: 'close' }).click();

    // expect: Either the drawer closes immediately with no confirmation dialog, or if a 'このバナーの編集内容を保存して終了しますか？' dialog appears, click '保存せずに閉じる' to exit safely.
    await page.getByRole('button', { name: '保存せずに閉じる' }).click();

    // expect: Back on /promotions/banner, the banner list is unchanged (same name, status, dates) confirming no accidental mutation.
    await expect(page.getByRole('link', { name: 'バナー' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'In & Ex Landing page banner' })).toBeVisible();
  });
});
