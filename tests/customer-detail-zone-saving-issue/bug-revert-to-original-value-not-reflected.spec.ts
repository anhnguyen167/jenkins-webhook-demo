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

test.describe('Zone Save — Reverting to the Original Value (Bug Reproduction)', () => {
  test('Reverting the zone back to its original value after an intermediate change does not update the displayed value without a reload', async ({
    page,
  }) => {
    // 1. Open a customer detail page for a dedicated test customer fixture whose zone is currently
    // 'A', and record this original value.
    await page.goto(`${ADMIN_BASE}/customers/${TEST_CUSTOMER_ID}`);

    // expect: The zone field displays 'A'.
    await expect(zoneField(page)).toHaveText(ORIGINAL_ZONE);

    // 2. Change the zone from 'A' to 'LB' and click Save.
    await setZone(page, 'LB');
    await saveZone(page);

    // expect: The zone field displays 'LB'.
    await expect(zoneField(page)).toHaveText('LB');

    // 3. Change the zone from 'LB' back to 'A' (the original value) and click Save.
    await setZone(page, ORIGINAL_ZONE);
    await saveZone(page);

    // expect: The save action completes without an error message (no visible failure/toast
    // indicating the save itself failed).
    await expect(page.getByText(/エラー|error/i)).toHaveCount(0);

    // expect: BUG — the zone field is displayed as 'LB', not 'A', i.e. the UI still shows the
    // intermediate value instead of the reverted original value.
    await expect(zoneField(page)).toHaveText('LB');

    // 4. Without reloading, re-read the zone field value.
    // expect: BUG — the displayed value remains 'LB' rather than updating to 'A', confirming the
    // discrepancy persists until an explicit reload (recorded as the defect this scenario reproduces).
    await expect(zoneField(page)).toHaveText('LB');
  });
});
