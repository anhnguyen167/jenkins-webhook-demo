// spec: Customer Detail Page — Zone Not Saved When Reverted to Original Value Test Plan
// suite: 2. Zone Reverted to Original Value — Bug Reproduction
// case: 2.1. Changing zone away from and then back to the original value shows the correct
//   reverted value after the second save, without a page reload
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
// THIS TEST IS EXPECTED TO CURRENTLY FAIL — it reproduces the bug described in
// requirements/customer-detail-zone-saving-issue.md: after reverting the zone field back to its
// original value and saving (without reloading in between), the UI is expected to incorrectly
// keep showing the intermediate value instead of the reverted original value.
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
  test('2.1. Changing zone away from and then back to the original value shows the correct reverted value after the second save, without a page reload', async ({
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
    const errorAlert = page.getByRole('alert').filter({ hasText: /エラー|error|失敗/i });
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

      // expect: The zone field displays the intermediate value immediately after saving,
      // without requiring a page reload.
      await expect(zoneField()).toHaveValue(intermediateZoneValue);

      // 3. Without reloading the page, change zone back from the intermediate value to the
      // ORIGINAL value and click Save.
      await setAndSaveZone(originalZoneValue);

      // expect: The save action completes without a visible error (document the actual
      // response/indicator observed, since the bug report describes the save as appearing to
      // succeed).
      const saveErrorCount = await errorAlert.count();
      // eslint-disable-next-line no-console
      console.log(`[2.1] Error alert count after revert-save: ${saveErrorCount}`);
      await expect(errorAlert).toHaveCount(0);

      // expect: The zone field displays the ORIGINAL value immediately after this second save,
      // without requiring a page reload — this is the primary acceptance criterion under test
      // and is expected to currently FAIL per the bug report (the field is expected to
      // incorrectly keep showing the intermediate value instead of the ORIGINAL value until this
      // defect is fixed).
      await expect(zoneField()).toHaveValue(originalZoneValue);

      // 4. Reload the page and re-check the zone field, to determine whether the underlying
      // persisted value is actually correct even though the pre-reload UI is stale.
      await page.reload();
      const persistedZoneValue = await zoneField().inputValue();
      // eslint-disable-next-line no-console
      console.log(`[2.1] Zone value after reload: ${persistedZoneValue}`);

      // expect: Record the zone value shown after reload. Per the bug report, after reload the
      // field can be set back to the ORIGINAL value correctly, implying the underlying save may
      // already be correct and the defect is isolated to the UI not refreshing its displayed
      // state after the second save — document the actual observed value rather than assuming
      // it matches either the ORIGINAL or intermediate value.
      expect([originalZoneValue, intermediateZoneValue]).toContain(persistedZoneValue);
    } finally {
      // 5. If the zone is not already at the ORIGINAL value after step 4, set it back to the
      // ORIGINAL value and save, then reload to confirm. Runs regardless of pass/fail above.
      await page.reload();
      const currentZoneValue = await zoneField().inputValue();
      if (currentZoneValue !== originalZoneValue) {
        await setAndSaveZone(originalZoneValue);
        await page.reload();
      }

      // expect: After this cleanup, the zone field displays the ORIGINAL value again, leaving
      // the fixture customer unchanged for other tests.
      await expect(zoneField()).toHaveValue(originalZoneValue);
    }
  });
});
