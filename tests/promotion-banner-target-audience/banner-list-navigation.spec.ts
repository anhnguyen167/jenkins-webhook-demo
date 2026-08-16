// spec: Banner List and Navigation
// seed: tests/seed-admin.spec.ts

import { test, expect } from '@playwright/test';
import { loginAdmin } from '../utils/auth';

test.describe('Banner List and Navigation', () => {
  test('Navigate to the Banner list via the left menu', async ({ page }) => {
    await loginAdmin(page);

    await page.getByRole('link', { name: 'プロモーション' }).click();
    await expect(page).toHaveURL('https://dev-portal.urry.com/promotions/banner');
    await expect(page.getByRole('heading', { name: 'バナー' })).toBeVisible();
    await expect(page.getByText('ベータ版')).toBeVisible();
    await expect(page.getByRole('button', { name: '新しいバナーを追加する' })).toBeVisible();

    await expect(page.getByText('ホーム')).toBeVisible();
    await expect(page.getByText('検索結果（トップ)')).toBeVisible();
    await expect(page.getByText('検索結果（中間)')).toBeVisible();
    await expect(page.getByText('最近閲覧した商品')).toBeVisible();
    await expect(page.getByText('バナーステータス', { exact: true })).toHaveCount(4);
  });
});
