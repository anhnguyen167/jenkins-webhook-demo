// spec: specs/customer-detail-zone-saving-issue.md
// seed: tests/seed-admin.spec.ts

import { test, expect } from '@playwright/test';

const ADMIN_BASE = process.env.URRY_ADMIN_BASE ?? 'https://dev-portal.urry.com';
// Dedicated test customer fixture used for zone-save regression coverage — do NOT point this at a
// real/shared production customer record (see specs/customer-detail-zone-saving-issue.md safety note).
const TEST_CUSTOMER_ID = process.env.URRY_ZONE_TEST_CUSTOMER_ID ?? 'zone-test-customer';

const ZONE_VALUE_LB = 'LB';

test.describe('Zone Save — Bug Reproduction (Revert to Original Value)', () => {
  test('Changing the zone away from its original value and then back to the original value shows the reverted value without requiring a reload', async ({
    page,
  }) => {
    // 1. Navigate to a known test customer's detail page and record the zone value currently displayed as the
    // original value (e.g. `A`).
    await page.goto(`${ADMIN_BASE}/customers/${TEST_CUSTOMER_ID}`);
    const zoneField = page.getByLabel('Zone', { exact: false });

    // expect: The customer detail page loads and the zone field shows the original value `A`.
    await expect(zoneField).toBeVisible();
    const originalZone = await zoneField.inputValue();
    expect(originalZone).toBeTruthy();

    // 2. Change the zone from `A` to a different value `LB`, then click Save.
    await zoneField.fill(ZONE_VALUE_LB);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // expect: After the save completes, the zone field displays `LB`.
    await expect(zoneField).toHaveValue(ZONE_VALUE_LB);

    // 3. Without reloading the page, change the zone from `LB` back to the original value `A`, then click Save.
    await zoneField.fill(originalZone);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // expect: After the save completes, no error is shown.
    await expect(page.getByRole('alert')).toHaveCount(0);

    // expect: After the save completes (no error shown), the zone field displays `A` — this is the field under test;
    // per the reported bug, at time of writing the field incorrectly continues to display `LB` instead of `A`, so
    // this assertion is expected to currently FAIL and document the regression until fixed. Uses expect.soft() so
    // the safety-mandated restore/reload cleanup below still runs even while this documents a known failure.
    await expect.soft(zoneField).toHaveValue(originalZone);

    // 4. Without reloading, re-read the zone field value once more.
    // expect: The zone field consistently displays `A`, not `LB`, with no further interaction needed.
    await expect.soft(zoneField).toHaveValue(originalZone);
    await expect.soft(zoneField).not.toHaveValue(ZONE_VALUE_LB);

    // Safety cleanup (mandated for every scenario that moves the zone away from its original value): restore the
    // zone to its original value and verify the PERSISTED value via a page reload before the test ends, regardless
    // of whether the bug reproduced above, so the shared customer fixture is left as it was found.
    await zoneField.fill(originalZone);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.reload();
    await expect(page.getByLabel('Zone', { exact: false })).toHaveValue(originalZone);
  });
});
