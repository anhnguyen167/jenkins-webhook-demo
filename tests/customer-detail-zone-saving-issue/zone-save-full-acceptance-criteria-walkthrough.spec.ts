// spec: specs/customer-detail-zone-saving-issue.md
// seed: tests/seed-admin.spec.ts

import { test, expect } from '@playwright/test';

const ADMIN_BASE = process.env.URRY_ADMIN_BASE ?? 'https://dev-portal.urry.com';
// Dedicated test customer fixture used for zone-save regression coverage — do NOT point this at a
// real/shared production customer record (see specs/customer-detail-zone-saving-issue.md safety note).
const TEST_CUSTOMER_ID = process.env.URRY_ZONE_TEST_CUSTOMER_ID ?? 'zone-test-customer';

const ZONE_VALUE_B = 'B';
const ZONE_VALUE_C = 'C';

test.describe('Zone Save — Acceptance Criteria Regression Coverage', () => {
  test('Full acceptance-criteria walkthrough: sequential different values work, then reverting to the original value must display correctly without a reload', async ({
    page,
  }) => {
    // 1. Navigate to a known test customer's detail page and record the original zone value (e.g. `A`).
    await page.goto(`${ADMIN_BASE}/customers/${TEST_CUSTOMER_ID}`);
    const zoneField = page.getByLabel('Zone', { exact: false });

    // expect: The zone field shows the original value `A`.
    await expect(zoneField).toBeVisible();
    const originalZone = await zoneField.inputValue();
    expect(originalZone).toBeTruthy();

    // 2. Change the zone `A` → `B`, click Save.
    await zoneField.fill(ZONE_VALUE_B);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // expect: The zone field displays `B` after saving.
    await expect(zoneField).toHaveValue(ZONE_VALUE_B);

    // 3. Change the zone `B` → `C`, click Save.
    await zoneField.fill(ZONE_VALUE_C);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // expect: The zone field displays `C` after saving (sequential different-values case, per acceptance
    // criterion 2).
    await expect(zoneField).toHaveValue(ZONE_VALUE_C);

    // 4. Change the zone `C` back to the original value `A`, click Save.
    await zoneField.fill(originalZone);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // expect: The zone field displays `A` after saving, without requiring a page reload (per acceptance
    // criterion 3 — the core fix under test). This is the acceptance-criteria regression gate: it is expected to
    // fail today (per the known bug documented in scenario 2.1) and should start passing once the fix ships.
    await expect(zoneField).toHaveValue(originalZone);

    // 5. Reload the page as a final persistence check.
    await page.reload();

    // expect: After reload, the zone field still displays `A`, confirming both the UI and the persisted value are
    // correct and the customer fixture is left in its original state.
    await expect(page.getByLabel('Zone', { exact: false })).toHaveValue(originalZone);
  });
});
