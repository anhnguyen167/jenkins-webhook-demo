// spec: Customer Detail Page — Locating and Confirming the Zone Field
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
// SAFETY GUARDRAIL: this scenario opens a real customer's detail page on a shared dev/staging
// admin portal. It must only run against a dedicated, disposable test-customer fixture — never a
// shared/production record — so it is gated behind URRY_TEST_CUSTOMER_URL and skips cleanly
// (rather than guessing a customer) until that env var is supplied.

import { test, expect, type Page } from '@playwright/test';

const ADMIN_BASE = process.env.URRY_ADMIN_BASE ?? 'https://dev-portal.urry.com';
const TEST_CUSTOMER_URL = process.env.URRY_TEST_CUSTOMER_URL;
const ORIGINAL_ZONE = process.env.URRY_TEST_CUSTOMER_ZONE ?? 'A';

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

function saveButton(page: Page) {
  return page.getByRole('button', { name: /^(保存|保存する|変更を保存|save)$/i }).first();
}

test.describe('Customer Detail Page — Locating and Confirming the Zone Field', () => {
  test("Navigate to a test customer's detail page and confirm the zone field is visible and editable", async ({
    page,
  }) => {
    // Seed (tests/seed-admin.spec.ts) already leaves us authenticated on /dashboard.
    await expect(page).toHaveURL(`${ADMIN_BASE}/dashboard`);

    test.skip(!TEST_CUSTOMER_URL, SKIP_REASON);

    // 1. Start from the authenticated admin dashboard, navigate to the customer list/search screen
    // and open a dedicated test customer's detail page (record the customer's name/ID/URL used,
    // and its current zone value, for restoration at the end of every scenario in this plan).
    await page.goto(TEST_CUSTOMER_URL as string);

    // expect: The customer detail page loads and displays the customer's identifying information
    // (e.g. name, ID).
    await expect(page.getByRole('heading').first()).toBeVisible();

    // expect: A "zone" field/control is visible on the page, showing the customer's current zone
    // value.
    const field = zoneField(page);
    await expect(field).toBeVisible();
    await expect.poll(() => currentZoneText(page)).toBe(ORIGINAL_ZONE);

    // 2. Confirm the zone field is an editable control (e.g. clickable dropdown/select or editable
    // input) and that a Save action exists for the page or the field.
    await field.click();

    // expect: The zone field can be focused/opened and shows a list of selectable zone values (or
    // an editable input), and a Save control (button or equivalent) is present and enabled.
    const zoneOptions = page.getByRole('option');
    if (await zoneOptions.count()) {
      await expect(zoneOptions.first()).toBeVisible();
      await page.keyboard.press('Escape');
    } else {
      await expect(field).toBeEditable();
    }
    await expect(saveButton(page)).toBeVisible();
    await expect(saveButton(page)).toBeEnabled();

    // 3. Without changing anything, leave the page.
    await page.goto(`${ADMIN_BASE}/dashboard`);

    // expect: The customer's zone value is unchanged from its original value.
    await page.goto(TEST_CUSTOMER_URL as string);
    await expect.poll(() => currentZoneText(page)).toBe(ORIGINAL_ZONE);
  });
});
