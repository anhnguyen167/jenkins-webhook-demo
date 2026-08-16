import { test, expect } from '@playwright/test';
import { loginAdmin } from './utils/auth';

/**
 * Admin seed — shared setup for tests that drive the URRY Admin Portal.
 * This seed authenticates against the admin portal before the test starts.
 */

test.describe('Admin seed', () => {
  test('seed-admin', async ({ page }) => {
    await loginAdmin(page);
    await expect(page.getByText('ダッシュボード').first()).toBeVisible();
  });
});
