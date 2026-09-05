// spec: specs/customer-detail-zone-saving-issue.md
// seed: tests/seed-admin.spec.ts

import { test, expect, type Page } from '@playwright/test';

const ADMIN_BASE = process.env.URRY_ADMIN_BASE ?? 'https://dev-portal.urry.com';

// Dedicated test customer fixture for this suite. Its zone must be the well-known original
// value 'A' before this test runs; override via env if a different fixture is reserved.
// Document here which customer record was actually used so the zone can be restored afterward.
const TEST_CUSTOMER_ID = process.env.ZONE_SAVING_TEST_CUSTOMER_ID ?? 'REPLACE_WITH_TEST_CUSTOMER_ID';
const ORIGINAL_ZONE = 'A';

function zoneField(page: Page) {
  return page.getByRole('combobox', { name: /zone|ゾーン/i });
}

async function setZone(page: Page, value: string) {
  await zoneField(page).click();
  await page.getByRole('option', { name: value, exact: true }).click();
}

async function saveZone(page: Page) {
  await page.getByRole('button', { name: /^(保存する|保存|save)$/i }).click();
}

test.describe('Zone Save — Baseline (Single Change, Already Works)', () => {
  test('Changing the zone to a new value and saving updates the displayed value correctly', async ({ page }) => {
    // 1. Open a customer detail page for a dedicated test customer fixture whose zone is currently
    // a known value 'A', and record this original value.
    await page.goto(`${ADMIN_BASE}/customers/${TEST_CUSTOMER_ID}`);

    // expect: The customer detail page loads and the zone field displays 'A'.
    await expect(zoneField(page)).toHaveText(ORIGINAL_ZONE);

    // 2. Change the zone field from 'A' to 'LB' and click Save.
    await setZone(page, 'LB');
    await saveZone(page);

    // expect: The save action completes without an error message.
    await expect(page.getByText(/エラー|error/i)).toHaveCount(0);

    // expect: The zone field displays 'LB' immediately after saving, without requiring a page reload.
    await expect(zoneField(page)).toHaveText('LB');

    // 3. Reload the page.
    await page.reload();

    // expect: The zone field still displays 'LB' after reload, confirming the change was actually
    // persisted (not just reflected in local UI state).
    await expect(zoneField(page)).toHaveText('LB');
  });
});
