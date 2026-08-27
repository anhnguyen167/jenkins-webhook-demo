// spec: Customer Detail Page — Zone Not Saved When Reverted to Original Value Test Plan
// suite: 2. Zone Reverted to Original Value — Bug Reproduction
// case: 2.2. Reverting to the original value via a full page reload between saves works
//   correctly (documents the reload-based workaround)
// seed: tests/seed-admin.spec.ts
//
// SELECTOR VERIFICATION NOTE:
// dev-portal.urry.com was unreachable from the environment that generated this test (nginx
// returned 403 Forbidden on every attempt, consistent with an IP allowlist on the shared
// dev/staging environment), so the locators below could not be verified against the live DOM.
// They are best-effort, grounded in the one confirmed real convention from this app found in
// tests/promotion-banner-target-audience/*.spec.ts (customer records are called 取引先 in the
// UI, and customer search uses the placeholder '取引先を検索する'). Run via the
// playwright-test-healer agent (or manually) to correct any selector that does not match the
// live customer detail page before relying on this test.
//
// FIXTURE GUARDRAIL: per the plan's safety note, this test must not blindly edit an unknown
// real/production customer record. It requires URRY_ZONE_TEST_CUSTOMER_ID (preferred, direct
// customer id) or URRY_ZONE_TEST_CUSTOMER_NAME (customer name to search for) to be supplied via
// env var, naming a dedicated test customer fixture whose zone is safe to change. Until one is
// supplied, the test is skipped rather than guessing a real customer to modify.

import { test, expect } from '@playwright/test';
import { loginAdmin } from '../utils/auth';

const ADMIN_BASE = process.env.URRY_ADMIN_BASE ?? 'https://dev-portal.urry.com';
const TEST_CUSTOMER_ID = process.env.URRY_ZONE_TEST_CUSTOMER_ID;
const TEST_CUSTOMER_NAME = process.env.URRY_ZONE_TEST_CUSTOMER_NAME;

test.describe('Customer Detail Page — Zone Not Saved When Reverted to Original Value', () => {
  test('2.2. Reverting to the original value via a full page reload between saves works correctly (documents the reload-based workaround)', async ({
    page,
  }) => {
    test.skip(
      !TEST_CUSTOMER_ID && !TEST_CUSTOMER_NAME,
      'Requires URRY_ZONE_TEST_CUSTOMER_ID or URRY_ZONE_TEST_CUSTOMER_NAME naming a dedicated ' +
        'test customer fixture — this test intentionally will not guess a real customer record ' +
        'to edit, per the plan\'s destructive-action guardrails.'
    );

    await loginAdmin(page);

    // 1. Navigate to a customer detail page for a known test customer fixture, and record the
    // customer's current zone value as the ORIGINAL value.
    if (TEST_CUSTOMER_ID) {
      await page.goto(`${ADMIN_BASE}/customers/${TEST_CUSTOMER_ID}`);
    } else {
      await page.goto(`${ADMIN_BASE}/customers`);
      await page.getByPlaceholder('取引先を検索する').fill(TEST_CUSTOMER_NAME as string);
      await page.getByRole('link', { name: TEST_CUSTOMER_NAME as string }).first().click();
    }

    const zoneField = () => page.getByRole('combobox', { name: /zone/i }).or(page.getByRole('textbox', { name: /zone/i }));

    // expect: The zone field currently displays the recorded ORIGINAL value.
    await expect(zoneField()).toBeVisible();
    const originalZoneValue = await zoneField().inputValue();
    expect(originalZoneValue, 'ORIGINAL zone value must be readable before mutating it').not.toBe('');

    const saveButton = page.getByRole('button', { name: /保存する|保存|save/i });
    const intermediateZoneValue = originalZoneValue === 'LB' ? 'A' : 'LB';

    async function setAndSaveZone(value: string) {
      await zoneField().fill(value);
      const option = page.getByRole('option', { name: value, exact: true });
      if (await option.isVisible().catch(() => false)) {
        await option.click();
      }
      await saveButton.click();
    }

    try {
      // 2. Change zone from the ORIGINAL value to a different value and click Save.
      await setAndSaveZone(intermediateZoneValue);

      // expect: The zone field displays the intermediate value immediately after saving.
      await expect(zoneField()).toHaveValue(intermediateZoneValue);

      // 3. Reload the page.
      await page.reload();

      // expect: The zone field displays the intermediate value after reload, confirming the
      // intermediate value was actually persisted.
      await expect(zoneField()).toHaveValue(intermediateZoneValue);

      // 4. After the reload, change zone back to the ORIGINAL value and click Save.
      await setAndSaveZone(originalZoneValue);

      // expect: The zone field displays the ORIGINAL value immediately after saving — per the
      // bug report, performing the revert AFTER a fresh reload is expected to work correctly,
      // unlike the no-reload sequence in scenario 2.1, confirming the defect is specifically
      // about UI state not refreshing across saves within the same page load rather than about
      // the persistence layer itself.
      await expect(zoneField()).toHaveValue(originalZoneValue);

      // 5. Reload the page again to confirm persistence.
      await page.reload();

      // expect: The zone field still displays the ORIGINAL value after this final reload.
      await expect(zoneField()).toHaveValue(originalZoneValue);
    } finally {
      // Cleanup: restore the ORIGINAL value regardless of pass/fail, so the fixture customer is
      // never left mutated.
      await page.reload();
      const currentZoneValue = await zoneField().inputValue();
      if (currentZoneValue !== originalZoneValue) {
        await setAndSaveZone(originalZoneValue);
        await page.reload();
      }
      await expect(zoneField()).toHaveValue(originalZoneValue);
    }
  });
});
