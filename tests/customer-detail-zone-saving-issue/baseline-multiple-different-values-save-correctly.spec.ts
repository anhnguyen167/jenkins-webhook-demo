// spec: Customer Detail Page — Zone Not Saved When Reverted to Original Value Test Plan
// suite: 1. Baseline Saving Behavior (Contrast / Regression Coverage)
// case: 1.2. Changing zone through several different values (never reverting to the original) saves correctly at each step
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
  test('1.2. Changing zone through several different values (never reverting to the original) saves correctly at each step', async ({
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

    // Three distinct throwaway values that never revisit the ORIGINAL value, mirroring the
    // plan's `A` → `B` → `C` example.
    const candidateValues = ['B', 'C', 'D'].filter((value) => value !== originalZoneValue);
    const [secondZoneValue, thirdZoneValue] = candidateValues;

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
      await setAndSaveZone(secondZoneValue);

      // expect: The zone field displays the new value immediately after saving.
      await expect(zoneField()).toHaveValue(secondZoneValue);

      // 3. Change zone again to a THIRD, distinct value and click Save.
      await setAndSaveZone(thirdZoneValue);

      // expect: The zone field displays the third value immediately after saving — this
      // sequence never revisits a previously-shown value, and both saves are expected to work,
      // isolating that the defect (covered in suite 2) is specific to reverting to the ORIGINAL
      // value rather than to saving in general.
      await expect(zoneField()).toHaveValue(thirdZoneValue);

      // 4. Reload the page and re-check the zone field.
      await page.reload();

      // expect: The zone field still displays the third value after reload, confirming the last
      // change was actually persisted.
      await expect(zoneField()).toHaveValue(thirdZoneValue);
    } finally {
      // 5. Restore the customer's zone back to the recorded ORIGINAL value and save, then
      // reload to confirm the restore persisted. Runs regardless of pass/fail above.
      await zoneField().fill(originalZoneValue);
      const originalOption = page.getByRole('option', { name: originalZoneValue, exact: true });
      if (await originalOption.isVisible().catch(() => false)) {
        await originalOption.click();
      }
      await saveButton.click();
      await page.reload();

      // expect: After this cleanup save and reload, the zone field displays the ORIGINAL value
      // again.
      await expect(zoneField()).toHaveValue(originalZoneValue);
    }
  });
});
