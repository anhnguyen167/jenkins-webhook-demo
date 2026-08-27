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

function saveSuccessIndicator(page: Page) {
  return page.getByText(/保存しました|更新しました|saved successfully|successfully updated/i);
}

test.describe('Zone Save — Revert-to-Original Bug Reproduction', () => {
  test('Reverting zone back to its original value and saving does not update the displayed value without a page reload (bug reproduction)', async ({
    page,
  }) => {
    test.skip(!TEST_CUSTOMER_URL, SKIP_REASON);

    // 1. Open the test customer's detail page and record the original zone value (e.g. `A`).
    await page.goto(TEST_CUSTOMER_URL as string);

    // expect: The zone field currently displays the original value (`A`).
    await expect.poll(() => currentZoneText(page)).toBe(ORIGINAL_ZONE);

    // 2. Change zone from `A` to a different value (e.g. `A` → `LB`) and click Save.
    await setZone(page, ALT_ZONE_1);
    await saveButton(page).click();

    // expect: The zone field displays `LB` after saving, without a page reload.
    await expect.poll(() => currentZoneText(page)).toBe(ALT_ZONE_1);

    // 3. Change zone from `LB` back to the original value (e.g. `LB` → `A`) and click Save,
    // WITHOUT reloading the page.
    await setZone(page, ORIGINAL_ZONE);
    await saveButton(page).click();

    // expect (documents the bug): Immediately after this save, the zone field still displays
    // `LB`, NOT `A` — the UI fails to reflect the reverted value even though the save action
    // reports success (e.g. a success toast/message may still appear).
    await expect(saveSuccessIndicator(page)).toBeVisible();
    await expect.poll(() => currentZoneText(page)).toBe(ALT_ZONE_1);

    // expect: No error is shown to the user (the save call itself does not visibly fail; the
    // displayed field value is simply stale/incorrect).
    await expect(page.getByText(/エラー|error/i)).toHaveCount(0);

    // 4. Reload the page (without changing the zone field again).
    await page.reload();

    // expect: Document the actual persisted value shown after reload: per the requirement, the
    // field should now correctly show `A` after reload, confirming the discrepancy in step 3 was
    // a UI/state-refresh bug rather than a backend persistence failure. If the reloaded value is
    // NOT `A`, log this explicitly as evidence the bug also affects backend persistence, not only
    // the displayed UI state.
    const persistedZone = await currentZoneText(page);
    test.info().annotations.push({ type: 'persisted-zone-after-reload', description: persistedZone });
    if (persistedZone !== ORIGINAL_ZONE) {
      test.info().annotations.push({
        type: 'bug-evidence',
        description:
          `Zone still shows '${persistedZone}' after reload, expected '${ORIGINAL_ZONE}' — this ` +
          'indicates the bug also affects backend persistence, not only the displayed UI state.',
      });
    }

    // 5. If the customer's zone is not already at its original value after step 4, change it back
    // to `A` and save, then reload once more to confirm restoration, leaving the shared customer
    // record clean.
    if (persistedZone !== ORIGINAL_ZONE) {
      await setZone(page, ORIGINAL_ZONE);
      await saveButton(page).click();
      await page.reload();
    }

    // expect: The zone field displays the original value (`A`) after this final reload.
    await expect.poll(() => currentZoneText(page)).toBe(ORIGINAL_ZONE);
  });
});
