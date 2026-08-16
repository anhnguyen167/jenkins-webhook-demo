import { test as setup, expect } from '@playwright/test';

/**
 * Auth setup — runs ONCE before the test projects and saves a signed-in
 * browser state to disk. Test projects then load that state via
 * `storageState`, so every test starts already logged in.
 *
 * This replaces the old pattern where `seed.spec.ts` / `seed-admin.spec.ts`
 * logged in as ordinary tests: Playwright gives each test a fresh context, so
 * that session never reached the tests that needed it.
 *
 * Two states, because the admin portal and the shop are different origins.
 * Both files land in playwright/.auth/, which is already gitignored — they
 * contain live session tokens and must never be committed.
 */
const ADMIN_BASE = process.env.URRY_ADMIN_BASE ?? 'https://dev-portal.urry.com';
const ADMIN_EMAIL = process.env.URRY_ADMIN_EMAIL ?? 'demo@urry.com';
const ADMIN_PASSWORD = process.env.URRY_ADMIN_PASSWORD ?? 'Cocacola@2023';

const SHOP_BASE = process.env.URRY_SHOP_BASE ?? 'https://dev.urry.com';
const SHOP_EMAIL = process.env.URRY_EMAIL ?? 'test-tungda@urry.com';
const SHOP_PASSWORD = process.env.URRY_PASSWORD ?? 'Urry@123';

export const ADMIN_STATE = 'playwright/.auth/admin.json';
export const SHOP_STATE = 'playwright/.auth/shop.json';

setup('authenticate as admin', async ({ page }) => {
  await page.goto(`${ADMIN_BASE}/login`);

  // The login form renders duplicate (responsive) inputs; target the visible ones.
  await page.locator('input[type="email"]:visible').first().fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]:visible').first().fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]:visible').first().click();

  await page.waitForURL(`${ADMIN_BASE}/dashboard`, { timeout: 60_000 });
  // Assert on the app SHELL (always rendered once authenticated), not on
  // dashboard data — the shared dev portal often leaves <main> on 'ロード中…'
  // long after the session is valid, and the session is all this setup needs.
  await expect(page.getByRole('button', { name: 'Demo Sakaya (管理者)' })).toBeVisible({
    timeout: 60_000,
  });

  await page.context().storageState({ path: ADMIN_STATE });
});

setup('authenticate as shop customer', async ({ page }) => {
  await page.goto(`${SHOP_BASE}/auth/login`);

  await page.getByRole('textbox', { name: 'メールアドレス' }).fill(SHOP_EMAIL);
  await page.getByRole('textbox', { name: 'パスワード' }).fill(SHOP_PASSWORD);
  await page.getByRole('button', { name: 'ログインする', exact: true }).click();

  await page.waitForURL(`${SHOP_BASE}/`, { timeout: 60_000 });
  await expect(page.getByText('Test Sakaya 20250206').first()).toBeVisible({ timeout: 60_000 });

  await page.context().storageState({ path: SHOP_STATE });
});
