// spec: specs/customer-detail-zone-saving-issue.md
// seed: tests/seed-admin.spec.ts

import { test, expect } from '@playwright/test';

const ADMIN_BASE = process.env.URRY_ADMIN_BASE ?? 'https://dev-portal.urry.com';
// Dedicated test customer fixture used for zone-save regression coverage — do NOT point this at a
// real/shared production customer record (see specs/customer-detail-zone-saving-issue.md safety note).
const TEST_CUSTOMER_ID = process.env.URRY_ZONE_TEST_CUSTOMER_ID ?? 'zone-test-customer';

const ZONE_VALUE_B = 'B';

test.describe('Zone Save — Acceptance Criteria Regression Coverage', () => {
  test('Changing the zone to a new value and saving updates the displayed value correctly (baseline, single change)', async ({
    page,
  }) => {
    // 1. Navigate to a known test customer's detail page and record the original zone value (e.g. `A`).
    await page.goto(`${ADMIN_BASE}/customers/${TEST_CUSTOMER_ID}`);
    const zoneField = page.getByLabel('Zone', { exact: false });

    // expect: The zone field shows the original value `A`.
    await expect(zoneField).toBeVisible();
    const originalZone = await zoneField.inputValue();
    expect(originalZone).toBeTruthy();

    // 2. Change the zone to a single different value `B` and click Save.
    await zoneField.fill(ZONE_VALUE_B);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // expect: After the save completes, the zone field displays `B` with no error shown.
    await expect(zoneField).toHaveValue(ZONE_VALUE_B);
    await expect(page.getByRole('alert')).toHaveCount(0);

    // 3. Reload the page.
    await page.reload();
    const zoneFieldAfterReload = page.getByLabel('Zone', { exact: false });

    // expect: After reload, the zone field still displays `B`, confirming the basic single-change save path works.
    await expect(zoneFieldAfterReload).toHaveValue(ZONE_VALUE_B);

    // 4. Restore the zone back to `A` and click Save, then reload to confirm.
    await zoneFieldAfterReload.fill(originalZone);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.reload();

    // expect: After reload, the zone field displays `A`, leaving the shared customer fixture as it was found.
    await expect(page.getByLabel('Zone', { exact: false })).toHaveValue(originalZone);
  });
});
