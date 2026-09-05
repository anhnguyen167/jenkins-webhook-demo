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

test.describe('Zone Save — Acceptance Criteria Confirmation', () => {
  test('Reverting to the original value and saving shows the correct value immediately, without a page reload (post-fix target behavior)', async ({
    page,
  }) => {
    // 1. Open a customer detail page for a dedicated test customer fixture whose zone is currently 'A'.
    await page.goto(`${ADMIN_BASE}/customers/${TEST_CUSTOMER_ID}`);

    // expect: The zone field displays 'A'.
    await expect(zoneField(page)).toHaveText(ORIGINAL_ZONE);

    // 2. Change the zone from 'A' to 'LB' and click Save.
    await setZone(page, 'LB');
    await saveZone(page);

    // expect: The zone field displays 'LB'.
    await expect(zoneField(page)).toHaveText('LB');

    // 3. Change the zone from 'LB' back to 'A' and click Save.
    await setZone(page, ORIGINAL_ZONE);
    await saveZone(page);

    // expect: The zone field displays 'A' immediately after this save, WITHOUT requiring a page
    // reload — this is the acceptance criterion this scenario exists to confirm, and it is expected
    // to FAIL against the current buggy build (per suite 2) and PASS once the fix described in the
    // requirement is deployed.
    await expect(zoneField(page)).toHaveText(ORIGINAL_ZONE);

    // 4. Reload the page to double-check persistence.
    await page.reload();

    // expect: The zone field still displays 'A' after reload.
    await expect(zoneField(page)).toHaveText(ORIGINAL_ZONE);

    // 5. Restore/confirm the test customer's zone is left at its original value 'A' for future test runs.
    // expect: The zone field displays 'A'.
    await expect(zoneField(page)).toHaveText(ORIGINAL_ZONE);
  });
});
