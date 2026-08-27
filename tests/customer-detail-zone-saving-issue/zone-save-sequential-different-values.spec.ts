// spec: specs/customer-detail-zone-saving-issue.md
// seed: tests/seed-admin.spec.ts

import { test, expect } from '@playwright/test';

const ADMIN_BASE = process.env.URRY_ADMIN_BASE ?? 'https://dev-portal.urry.com';
// Dedicated test customer fixture used for zone-save regression coverage — do NOT point this at a
// real/shared production customer record (see specs/customer-detail-zone-saving-issue.md safety note).
const TEST_CUSTOMER_ID = process.env.URRY_ZONE_TEST_CUSTOMER_ID ?? 'zone-test-customer';

const ZONE_VALUE_B = 'B';
const ZONE_VALUE_C = 'C';

test.describe('Zone Save — Contrast Case (Different Values, No Revert)', () => {
  test('Saving the zone through several different values (never reverting to the original) updates the displayed value correctly each time', async ({
    page,
  }) => {
    // 1. Navigate to a known test customer's detail page and record the zone value currently displayed (e.g. `A`).
    await page.goto(`${ADMIN_BASE}/customers/${TEST_CUSTOMER_ID}`);
    const zoneField = page.getByLabel('Zone', { exact: false });

    // expect: The customer detail page loads and the zone field shows a single, well-defined current value.
    await expect(zoneField).toBeVisible();
    const originalZone = await zoneField.inputValue();
    expect(originalZone).toBeTruthy();

    // 2. Change the zone from its current value (`A`) to a different value `B`, then click Save.
    await zoneField.fill(ZONE_VALUE_B);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // expect: After the save completes, the zone field displays `B`.
    await expect(zoneField).toHaveValue(ZONE_VALUE_B);

    // 3. Change the zone from `B` to a different value `C` (never `A`), then click Save.
    await zoneField.fill(ZONE_VALUE_C);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // expect: After the save completes, the zone field displays `C`.
    await expect(zoneField).toHaveValue(ZONE_VALUE_C);

    // 4. Reload the page.
    await page.reload();
    const zoneFieldAfterFirstReload = page.getByLabel('Zone', { exact: false });

    // expect: After reload, the zone field still displays `C`, confirming the sequential-different-values save path
    // persists and displays correctly (this is the expected, already-working baseline behaviour).
    await expect(zoneFieldAfterFirstReload).toHaveValue(ZONE_VALUE_C);

    // 5. Restore the zone back to its original value `A` and click Save, then reload the page to confirm.
    await zoneFieldAfterFirstReload.fill(originalZone);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.reload();

    // expect: After reload, the zone field displays `A`, leaving the shared customer fixture as it was found.
    await expect(page.getByLabel('Zone', { exact: false })).toHaveValue(originalZone);
  });
});
