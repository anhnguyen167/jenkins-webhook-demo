// spec: Zone Save — Working Cases (Regression Baseline)
// seed: tests/seed-admin.spec.ts
//
// PROVISIONAL LOCATORS: at plan-authoring time, live exploration had not yet confirmed the
// customer list/search navigation path, the exact zone-field control type (dropdown / combobox
// / text input), or the save-success indicator copy — see
// specs/customer-detail-zone-saving-issue.md ("treat locators in this plan as provisional until
// verified against the live page"). The locators below are a best-effort first pass (flexible
// role/label matching with fallbacks) and should be tightened by the playwright-test-healer once
// run against the live page.
//
// SAFETY GUARDRAIL: this scenario changes and saves a real customer's zone value on a shared
// dev/staging admin portal. It must only run against a dedicated, disposable test-customer
// fixture — never a shared/production record — so it is gated behind URRY_TEST_CUSTOMER_URL and
// skips cleanly (rather than guessing a customer) until that env var is supplied.

import { test, expect, type Page } from '@playwright/test';

const TEST_CUSTOMER_URL = process.env.URRY_TEST_CUSTOMER_URL;
const ORIGINAL_ZONE = process.env.URRY_TEST_CUSTOMER_ZONE ?? 'A';
const ALT_ZONE_2 = process.env.URRY_TEST_CUSTOMER_ALT_ZONE_2 ?? 'B';
const ALT_ZONE_3 = process.env.URRY_TEST_CUSTOMER_ALT_ZONE_3 ?? 'C';

const SKIP_REASON =
  'Requires a dedicated, disposable test-customer fixture. The customer list/search navigation ' +
  'path is not yet confirmed by live exploration (see specs/customer-detail-zone-saving-issue.md) ' +
  'and this scenario must never run against an un-designated shared/production customer record. ' +
  'Supply the fixture detail-page URL via URRY_TEST_CUSTOMER_URL (and its known zone value via ' +
  'URRY_TEST_CUSTOMER_ZONE) to run this check.';

function zoneField(page: Page) {
  return page
    .getByRole('combobox', { name: /zone|ゾーン/i })
    .or(page.getByRole('button', { name: /zone|ゾーン/i }))
    .or(page.getByLabel(/zone|ゾーン/i));
}

async function currentZoneText(page: Page): Promise<string> {
  const field = zoneField(page);
  const inputValue = await field.inputValue().catch(() => null);
  return inputValue ?? ((await field.textContent()) ?? '').trim();
}

async function setZone(page: Page, value: string) {
  await zoneField(page).click();
  const option = page.getByRole('option', { name: value, exact: true });
  if (await option.count()) {
    await option.click();
  } else {
    await zoneField(page).fill(value);
  }
}

function saveButton(page: Page) {
  return page.getByRole('button', { name: /^(保存|保存する|変更を保存|save)$/i }).first();
}

function saveSuccessIndicator(page: Page) {
  return page.getByText(/保存しました|更新しました|saved successfully|successfully updated/i);
}

test.describe('Zone Save — Working Cases (Regression Baseline)', () => {
  test('Changing zone across several different values in sequence (contrast case) updates the displayed value correctly each time', async ({
    page,
  }) => {
    test.skip(!TEST_CUSTOMER_URL, SKIP_REASON);

    // 1. Open the test customer's detail page and record the original zone value (e.g. `A`).
    await page.goto(TEST_CUSTOMER_URL as string);

    // expect: The zone field currently displays the original value.
    await expect.poll(() => currentZoneText(page)).toBe(ORIGINAL_ZONE);

    // 2. Change zone from the original value to a first new value (e.g. `A` → `B`) and click Save.
    await setZone(page, ALT_ZONE_2);
    await saveButton(page).click();
    await expect(saveSuccessIndicator(page)).toBeVisible();

    // expect: The zone field displays `B` after saving, without a page reload.
    await expect.poll(() => currentZoneText(page)).toBe(ALT_ZONE_2);

    // 3. Change zone from `B` to a second, different new value (e.g. `B` → `C`) and click Save —
    // note this sequence deliberately never reverts to the original value (`A`), isolating the
    // contrast from the revert-to-original bug case in suite 3.
    await setZone(page, ALT_ZONE_3);
    await saveButton(page).click();
    await expect(saveSuccessIndicator(page)).toBeVisible();

    // expect: The zone field displays `C` after saving, without a page reload.
    await expect.poll(() => currentZoneText(page)).toBe(ALT_ZONE_3);

    // 4. Restore the zone back to its original value (e.g. `C` → `A`) and click Save to leave the
    // shared customer record clean, then reload the page to confirm the restoration actually
    // persisted (since this final restoring save is itself a revert-to-original step and may be
    // affected by the bug under test).
    await setZone(page, ORIGINAL_ZONE);
    await saveButton(page).click();
    await page.reload();

    // expect: After reload, the zone field displays the original value (`A`).
    await expect.poll(() => currentZoneText(page)).toBe(ORIGINAL_ZONE);
  });
});
