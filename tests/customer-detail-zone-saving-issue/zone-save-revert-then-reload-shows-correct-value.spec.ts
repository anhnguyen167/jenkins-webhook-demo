// spec: specs/customer-detail-zone-saving-issue.md
// seed: tests/seed-admin.spec.ts

import { test, expect } from '@playwright/test';

const ADMIN_BASE = process.env.URRY_ADMIN_BASE ?? 'https://dev-portal.urry.com';
// Dedicated test customer fixture used for zone-save regression coverage — do NOT point this at a
// real/shared production customer record (see specs/customer-detail-zone-saving-issue.md safety note).
const TEST_CUSTOMER_ID = process.env.URRY_ZONE_TEST_CUSTOMER_ID ?? 'zone-test-customer';

const ZONE_VALUE_LB = 'LB';

test.describe('Zone Save — Bug Reproduction (Revert to Original Value)', () => {
  test('After the revert-and-save sequence, reloading the page shows the correct persisted (original) value, isolating a UI display bug from a persistence bug', async ({
    page,
  }) => {
    // 1. Navigate to a known test customer's detail page and record the original zone value (e.g. `A`).
    await page.goto(`${ADMIN_BASE}/customers/${TEST_CUSTOMER_ID}`);
    const zoneField = page.getByLabel('Zone', { exact: false });

    // expect: The zone field shows the original value `A`.
    await expect(zoneField).toBeVisible();
    const originalZone = await zoneField.inputValue();
    expect(originalZone).toBeTruthy();

    // 2. Change the zone from `A` to `LB`, click Save, then change the zone from `LB` back to `A` and click Save
    // again (reproducing the bug sequence from scenario 2.1).
    await zoneField.fill(ZONE_VALUE_LB);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(zoneField).toHaveValue(ZONE_VALUE_LB);

    await zoneField.fill(originalZone);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // expect: The save actions complete without error (regardless of what value is currently displayed on screen).
    await expect(page.getByRole('alert')).toHaveCount(0);

    // 3. Reload the page.
    await page.reload();
    const zoneFieldAfterReload = page.getByLabel('Zone', { exact: false });

    // expect: After reload, the zone field displays `A`, confirming that the underlying persisted value is actually
    // correct and the bug is isolated to the UI not reflecting the reverted value without a reload (per the
    // requirement's note that this needs to be confirmed during execution rather than assumed).
    await expect(zoneFieldAfterReload).toHaveValue(originalZone);

    // 4. Immediately after reload, attempt to set the zone to `A` again via the UI (as the requirement notes the
    // field "can be set back to `A` correctly" after a reload) and click Save.
    await zoneFieldAfterReload.fill(originalZone);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // expect: The save succeeds and the zone field continues to display `A`, leaving the shared customer fixture
    // restored to its original value.
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(zoneFieldAfterReload).toHaveValue(originalZone);
  });
});
