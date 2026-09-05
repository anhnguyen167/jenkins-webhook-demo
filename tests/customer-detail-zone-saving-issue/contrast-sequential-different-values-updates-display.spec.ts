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

test.describe('Zone Save — Multiple Different Values (Contrast / Regression Coverage)', () => {
  test('Changing the zone through three different values (never reverting to the original) updates the displayed value correctly at every step', async ({
    page,
  }) => {
    // 1. Open a customer detail page for a dedicated test customer fixture whose zone is currently 'A'.
    await page.goto(`${ADMIN_BASE}/customers/${TEST_CUSTOMER_ID}`);

    // expect: The zone field displays 'A'.
    await expect(zoneField(page)).toHaveText(ORIGINAL_ZONE);

    // 2. Change the zone from 'A' to 'B' and click Save.
    await setZone(page, 'B');
    await saveZone(page);

    // expect: The zone field displays 'B' immediately after saving, without requiring a page reload.
    await expect(zoneField(page)).toHaveText('B');

    // 3. Change the zone from 'B' to 'C' and click Save.
    await setZone(page, 'C');
    await saveZone(page);

    // expect: The zone field displays 'C' immediately after saving, without requiring a page reload.
    await expect(zoneField(page)).toHaveText('C');

    // 4. Reload the page.
    await page.reload();

    // expect: The zone field still displays 'C' after reload, confirming this sequence of changes
    // across different values (never reverting to the original 'A') persists and displays correctly
    // at every step — isolating that the bug in suite 2 is specific to reverting to the ORIGINAL
    // value, not a general saving defect.
    await expect(zoneField(page)).toHaveText('C');

    // 5. Restore the test customer's zone back to its original value 'A' (via Save, followed by a
    // reload/verification if needed per scenario 2.2's findings) to leave the fixture in its
    // original state for future test runs.
    await setZone(page, ORIGINAL_ZONE);
    await saveZone(page);
    await page.reload();

    // expect: The zone field displays 'A' after this cleanup step, confirmed via reload.
    await expect(zoneField(page)).toHaveText(ORIGINAL_ZONE);
  });
});
