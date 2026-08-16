import { expect, type Page } from '@playwright/test';

const ADMIN_BASE = process.env.URRY_ADMIN_BASE ?? 'https://dev-portal.urry.com';
const ADMIN_EMAIL = process.env.URRY_ADMIN_EMAIL ?? 'demo@urry.com';
const ADMIN_PASSWORD = process.env.URRY_ADMIN_PASSWORD ?? 'Cocacola@2023';

const SHOP_BASE = process.env.URRY_SHOP_BASE ?? 'https://dev.urry.com';
const SHOP_EMAIL = process.env.URRY_EMAIL ?? 'test-tungda@urry.com';
const SHOP_PASSWORD = process.env.URRY_PASSWORD ?? 'Urry@123';

export async function loginAdmin(page: Page) {
  await page.goto(`${ADMIN_BASE}/login`);

  await page.locator('input[type="email"]:visible').first().fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]:visible').first().fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]:visible').first().click();

  await page.waitForURL(`${ADMIN_BASE}/dashboard`);
  await expect(page.getByText('ダッシュボード').first()).toBeVisible();
}

export async function loginShop(page: Page) {
  await page.goto(`${SHOP_BASE}/auth/login`);

  await page.getByRole('textbox', { name: 'メールアドレス' }).fill(SHOP_EMAIL);
  await page.getByRole('textbox', { name: 'パスワード' }).fill(SHOP_PASSWORD);
  await page.getByRole('button', { name: 'ログインする', exact: true }).click();

  await page.waitForURL(`${SHOP_BASE}/`);
  await expect(page.getByText('Test Sakaya 20250206').first()).toBeVisible();
}
