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
  test('After a page reload, the persisted zone value can be inspected and the field can be correctly set back to the original value', async ({
    page,
  }) => {
    // 1. Repeat the repro from scenario 2.1 up through the second Save (zone changed
    // 'A' -> 'LB' -> back to 'A', displayed value stuck at 'LB').
    await page.goto(`${ADMIN_BASE}/customers/${TEST_CUSTOMER_ID}`);
    await expect(zoneField(page)).toHaveText(ORIGINAL_ZONE);

    await setZone(page, 'LB');
    await saveZone(page);
    await expect(zoneField(page)).toHaveText('LB');

    await setZone(page, ORIGINAL_ZONE);
    await saveZone(page);

    // expect: Zone field displays 'LB' before reload (same as scenario 2.1).
    await expect(zoneField(page)).toHaveText('LB');

    // 2. Reload the page.
    await page.reload();

    // expect: Record the zone value now displayed after reload — document whether it shows 'A'
    // (meaning the underlying save of the revert actually succeeded and only the UI failed to
    // reflect it) or still shows 'LB' (meaning the revert save did not persist at all). Do not
    // assume the result; capture the actual observed value.
    const zoneAfterReload = (await zoneField(page).textContent())?.trim() ?? '';
    test.info().annotations.push({
      type: 'observed-zone-after-reload',
      description: zoneAfterReload,
    });

    // 3. If the reloaded value still does not show 'A', change the zone from its current
    // displayed value to 'A' again and click Save.
    if (zoneAfterReload !== ORIGINAL_ZONE) {
      await setZone(page, ORIGINAL_ZONE);
      await saveZone(page);

      // expect: The zone field now displays 'A' after this save.
      await expect(zoneField(page)).toHaveText(ORIGINAL_ZONE);
    }

    // 4. Reload the page once more to confirm.
    await page.reload();

    // expect: The zone field displays 'A', confirming the field can be correctly set back to the
    // original value once a reload has occurred, per the reported behavior.
    await expect(zoneField(page)).toHaveText(ORIGINAL_ZONE);
  });
});
