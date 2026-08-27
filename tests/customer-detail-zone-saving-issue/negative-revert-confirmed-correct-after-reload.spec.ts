// spec: Zone Save — Revert-to-Original Bug Reproduction
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
const ALT_ZONE_1 = process.env.URRY_TEST_CUSTOMER_ALT_ZONE_1 ?? 'LB';

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

test.describe('Zone Save — Revert-to-Original Bug Reproduction', () => {
  test('After the revert-to-original save, the field can be correctly set back to the original value once the page has been reloaded', async ({
    page,
  }) => {
    test.skip(!TEST_CUSTOMER_URL, SKIP_REASON);

    // 1. Repeat steps 1–3 from scenario 3.1 to reproduce the stale-display bug (zone shown as
    // `LB` immediately after saving `LB` → `A`).
    await page.goto(TEST_CUSTOMER_URL as string);
    await expect.poll(() => currentZoneText(page)).toBe(ORIGINAL_ZONE);

    await setZone(page, ALT_ZONE_1);
    await saveButton(page).click();
    await expect.poll(() => currentZoneText(page)).toBe(ALT_ZONE_1);

    await setZone(page, ORIGINAL_ZONE);
    await saveButton(page).click();

    // expect: The zone field displays `LB` (the stale/incorrect value) immediately after the
    // revert-save, matching the bug reproduction in 3.1.
    await expect.poll(() => currentZoneText(page)).toBe(ALT_ZONE_1);

    // 2. Reload the page, then re-open the zone field's edit control and confirm what value it is
    // currently set to before making any further change.
    await page.reload();

    // expect: After reload, the zone field's control reflects the original value (`A`), and it
    // can be interacted with (opened, changed) normally, without needing any additional
    // workaround.
    await expect.poll(() => currentZoneText(page)).toBe(ORIGINAL_ZONE);
    const field = zoneField(page);
    await expect(field).toBeVisible();
    await field.click();
    const zoneOptions = page.getByRole('option');
    if (await zoneOptions.count()) {
      await page.keyboard.press('Escape');
    }

    // 3. As a sanity check, without changing the value, click Save again (or navigate away and
    // back) to confirm the page remains stable at `A`.
    await saveButton(page).click();

    // expect: The zone field continues to display `A`, confirming the customer record is left in
    // its original, clean state for other tests/users.
    await expect.poll(() => currentZoneText(page)).toBe(ORIGINAL_ZONE);
  });
});
