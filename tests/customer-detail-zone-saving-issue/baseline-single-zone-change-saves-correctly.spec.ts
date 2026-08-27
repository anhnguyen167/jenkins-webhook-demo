// spec: Customer Detail Page — Zone Not Saved When Reverted to Original Value Test Plan
// suite: 1. Baseline Saving Behavior (Contrast / Regression Coverage)
// case: 1.1. Changing zone to a new value and saving updates the displayed value correctly
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
  test('1.1. Changing zone to a new value and saving updates the displayed value correctly', async ({ page }) => {
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

    const zoneField = page.getByRole('combobox', { name: /zone/i }).or(page.getByRole('textbox', { name: /zone/i }));

    // expect: The customer detail page loads and the zone field currently displays the recorded
    // ORIGINAL value.
    await expect(zoneField).toBeVisible();
    const originalZoneValue = await zoneField.inputValue();
    expect(originalZoneValue, 'ORIGINAL zone value must be readable before mutating it').not.toBe('');

    const saveButton = page.getByRole('button', { name: /保存する|保存|save/i });
    const errorAlert = page.getByRole('alert').filter({ hasText: /エラー|error|失敗/i });

    // Pick a throwaway intermediate value distinct from the ORIGINAL value, mirroring the plan's
    // `A` → `LB` example.
    const intermediateZoneValue = originalZoneValue === 'LB' ? 'A' : 'LB';

    try {
      // 2. Change the zone field from the ORIGINAL value to a different value and click Save.
      await zoneField.fill(intermediateZoneValue);
      const intermediateOption = page.getByRole('option', { name: intermediateZoneValue, exact: true });
      if (await intermediateOption.isVisible().catch(() => false)) {
        await intermediateOption.click();
      }
      await saveButton.click();

      // expect: The save action completes without error (e.g. a success toast/indicator is
      // shown, or no error is shown).
      await expect(errorAlert).toHaveCount(0);

      // expect: The zone field displays the new value immediately after saving, without
      // requiring a page reload.
      await expect(zoneField).toHaveValue(intermediateZoneValue);

      // 3. Reload the page and re-check the zone field.
      await page.reload();
      const zoneFieldAfterReload = page.getByRole('combobox', { name: /zone/i }).or(page.getByRole('textbox', { name: /zone/i }));

      // expect: The zone field still displays the intermediate value after reload, confirming
      // the change was actually persisted (not just shown optimistically).
      await expect(zoneFieldAfterReload).toHaveValue(intermediateZoneValue);
    } finally {
      // 4. Restore the customer's zone back to the recorded ORIGINAL value and save, then
      // reload to confirm the restore persisted. This runs regardless of pass/fail above so the
      // fixture customer is never left mutated.
      const zoneFieldForCleanup = page.getByRole('combobox', { name: /zone/i }).or(page.getByRole('textbox', { name: /zone/i }));
      await zoneFieldForCleanup.fill(originalZoneValue);
      const originalOption = page.getByRole('option', { name: originalZoneValue, exact: true });
      if (await originalOption.isVisible().catch(() => false)) {
        await originalOption.click();
      }
      await saveButton.click();
      await page.reload();

      // expect: After this cleanup save and reload, the zone field displays the ORIGINAL value
      // again, leaving the fixture customer unchanged for other tests.
      const zoneFieldAfterCleanup = page.getByRole('combobox', { name: /zone/i }).or(page.getByRole('textbox', { name: /zone/i }));
      await expect(zoneFieldAfterCleanup).toHaveValue(originalZoneValue);
    }
  });
});
