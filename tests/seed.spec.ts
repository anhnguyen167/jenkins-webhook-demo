import { test, expect } from '@playwright/test';
import { loginShop } from './utils/auth';

/**
 * Shop seed — shared setup reused by the Planner/Generator agents.
 * Authenticates against the dev environment so every generated test
 * starts from a logged-in state on the URRY home page.
 */

test.describe('Test group', () => {
  test('seed', async ({ page }) => {
    await loginShop(page);
    await expect(page.getByText('Test Sakaya 20250206').first()).toBeVisible();
  });
});
