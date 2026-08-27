// spec: Customer Detail Page — Zone Not Saved When Reverted to Original Value Test Plan
// suite: 2. Zone Reverted to Original Value — Bug Reproduction
// case: 2.3. Repeating the revert-to-original sequence a second time reproduces the same UI
//   staleness
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
// THIS TEST IS EXPECTED TO CURRENTLY FAIL (both "revert to original" saves) — it reproduces the
// bug described in requirements/customer-detail-zone-saving-issue.md, checking the staleness
// reproduces consistently across two independent cycles, not just once.
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
  test('2.3. Repeating the revert-to-original sequence a second time reproduces the same UI staleness', async ({
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

    const observedValues: { cycle: number; step: 'to-intermediate' | 'to-original'; value: string }[] = [];

    try {
      // 2. Perform two full cycles, without reloading the page at any point during the cycles:
      // (a) change zone to a different value and Save, (b) change zone back to the ORIGINAL
      // value and Save — recording the displayed zone value after each of the four saves.
      for (const cycle of [1, 2]) {
        await test.step(`Cycle ${cycle}: change to intermediate value and save`, async () => {
          await setAndSaveZone(intermediateZoneValue);
          const value = await zoneField().inputValue();
          observedValues.push({ cycle, step: 'to-intermediate', value });

          // expect: After each of the two "change to a different value" saves, the displayed
          // zone value updates correctly to the new intermediate value.
          expect(value).toBe(intermediateZoneValue);
        });

        await test.step(`Cycle ${cycle}: change back to ORIGINAL value and save`, async () => {
          await setAndSaveZone(originalZoneValue);
          const value = await zoneField().inputValue();
          observedValues.push({ cycle, step: 'to-original', value });
          // eslint-disable-next-line no-console
          console.log(`[2.3] Cycle ${cycle} revert-to-original displayed value: ${value}`);

          // expect: After each of the two "change back to ORIGINAL" saves, the displayed zone
          // value is expected to incorrectly remain at the prior intermediate value instead of
          // showing the ORIGINAL value, per the bug report — document the actual value shown for
          // each of the two occurrences to confirm the defect reproduces consistently on
          // repeated revert attempts, not just once.
          expect(value).toBe(originalZoneValue);
        });
      }

      const revertObservations = observedValues.filter((entry) => entry.step === 'to-original');
      expect(revertObservations).toHaveLength(2);
      // Document that the staleness reproduces identically across both independent cycles.
      expect(revertObservations[0].value).toBe(revertObservations[1].value);
    } finally {
      // 3. Reload the page and set the zone back to the recorded ORIGINAL value if it is not
      // already correct, then save and reload to confirm. Runs regardless of pass/fail above.
      await page.reload();
      const currentZoneValue = await zoneField().inputValue();
      if (currentZoneValue !== originalZoneValue) {
        await setAndSaveZone(originalZoneValue);
        await page.reload();
      }

      // expect: After cleanup, the zone field displays the ORIGINAL value again, leaving the
      // fixture customer unchanged for other tests.
      await expect(zoneField()).toHaveValue(originalZoneValue);
    }
  });
});
