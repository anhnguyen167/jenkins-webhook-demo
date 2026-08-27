# Customer Detail Page — Zone Not Saved When Reverted to Original Value Test Plan

## Application Overview

URRY Admin Portal (https://dev-portal.urry.com) is the internal management app for the URRY B2B liquor/restaurant ordering platform (Asana gid 1215265081292154, "Saving issue on customer detail page", Project URRY Admin, Priority Medium, Project size Small, Where: Admin; ticket status per latest comment: "test pass on dev, please build staging"). This plan covers a saving bug on the customer detail page's editable **zone** field: a customer's zone can be changed and saved, and changing it to a brand-new value works correctly, but changing it away from its original value and then back to that SAME original value (save each time) leaves the UI showing the intermediate value instead of the reverted original — a full page reload is required before the field can be set back to the original value again. It is not yet confirmed during exploration whether the underlying persisted value is actually wrong or whether only the client-side displayed value fails to refresh; this plan documents that as an open question to be confirmed during test execution (e.g. by re-reading the value via page reload and/or API) rather than assumed.

All tests must reuse `tests/seed-admin.spec.ts` (Base URL: https://dev-portal.urry.com, already logged in as demo@urry.com when the test begins).

IMPORTANT SAFETY NOTE (destructive-action guardrails — restated from the task brief, MUST be followed by every scenario in this plan):
- This is a real admin portal against a shared dev/staging environment — do NOT use a real/shared production customer record if avoidable. Prefer a dedicated test customer fixture if one is known; otherwise clearly identify and log which customer record was used (name/ID/URL) so its zone value can be restored to its original value afterward.
- Do NOT edit or delete any other field on the customer record besides the zone field under test.
- Do NOT perform any destructive action (e.g. deleting the customer, canceling orders) while testing this flow.
- Every scenario that changes the zone value away from its original value MUST restore it back to the original value by the end of the test (or document explicitly if a scenario intentionally ends mid-sequence for bug-reproduction purposes), so the shared customer record is left in a clean state for other tests/users.

Key facts from the requirement (to be confirmed/refined once the customer detail page is explored):
- The exact navigation path to a customer detail page (e.g. via a customer list/search screen) and the precise UI control used to edit "zone" (dropdown, combobox, or text input) are not yet confirmed by exploration — treat locators in this plan as provisional until verified against the live page.
- Reproduction requires a customer whose current zone is known (e.g. `A`) and at least two other distinct zone values to change into (e.g. `LB`, `B`, `C`) that are valid selectable options in the app.

## Test Scenarios

### 1. Customer Detail Page — Locating and Confirming the Zone Field

**Seed:** `tests/seed-admin.spec.ts`

#### 1.1. Navigate to a test customer's detail page and confirm the zone field is visible and editable

**File:** `tests/customer-detail-zone-saving-issue/navigate-to-customer-detail-zone-field.spec.ts`

**Steps:**
  1. Start from the authenticated admin dashboard (/dashboard) via seed, then navigate to the customer list/search screen and open a dedicated test customer's detail page (record the customer's name/ID/URL used, and its current zone value, for restoration at the end of every scenario in this plan).
    - expect: The customer detail page loads and displays the customer's identifying information (e.g. name, ID).
    - expect: A "zone" field/control is visible on the page, showing the customer's current zone value.
  2. Confirm the zone field is an editable control (e.g. clickable dropdown/select or editable input) and that a Save action exists for the page or the field.
    - expect: The zone field can be focused/opened and shows a list of selectable zone values (or an editable input), and a Save control (button or equivalent) is present and enabled.
  3. Without changing anything, leave the page.
    - expect: The customer's zone value is unchanged from its original value.

### 2. Zone Save — Working Cases (Regression Baseline)

**Seed:** `tests/seed-admin.spec.ts`

#### 2.1. Changing zone to a new value and saving updates the displayed value correctly

**File:** `tests/customer-detail-zone-saving-issue/positive-single-change-updates-displayed-value.spec.ts`

**Steps:**
  1. Open the test customer's detail page and record the original zone value (e.g. `A`).
    - expect: The zone field currently displays the original value.
  2. Change the zone from the original value to a different value (e.g. `A` → `LB`) and click Save.
    - expect: The page shows a save-success indication (e.g. confirmation toast/message, no error).
    - expect: The zone field now displays the newly-saved value (`LB`), without needing a page reload.
  3. Restore the zone back to its original value (e.g. `LB` → `A`) and click Save, to leave the shared customer record clean (this single restoring save is expected, per acceptance criteria, to correctly display `A` — if it does not, that is itself evidence of the bug and should be logged, then confirmed via reload before ending the test).
    - expect: The zone field displays the original value (`A`) again, matching the customer's state before this test ran.

#### 2.2. Changing zone across several different values in sequence (contrast case) updates the displayed value correctly each time

**File:** `tests/customer-detail-zone-saving-issue/positive-multiple-distinct-changes-contrast-case.spec.ts`

**Steps:**
  1. Open the test customer's detail page and record the original zone value (e.g. `A`).
    - expect: The zone field currently displays the original value.
  2. Change zone from the original value to a first new value (e.g. `A` → `B`) and click Save.
    - expect: The zone field displays `B` after saving, without a page reload.
  3. Change zone from `B` to a second, different new value (e.g. `B` → `C`) and click Save — note this sequence deliberately never reverts to the original value (`A`), isolating the contrast from the revert-to-original bug case in suite 3.
    - expect: The zone field displays `C` after saving, without a page reload.
  4. Restore the zone back to its original value (e.g. `C` → `A`) and click Save to leave the shared customer record clean, then reload the page to confirm the restoration actually persisted (since this final restoring save is itself a revert-to-original step and may be affected by the bug under test).
    - expect: After reload, the zone field displays the original value (`A`).

### 3. Zone Save — Revert-to-Original Bug Reproduction

**Seed:** `tests/seed-admin.spec.ts`

#### 3.1. Reverting zone back to its original value and saving does not update the displayed value without a page reload (bug reproduction)

**File:** `tests/customer-detail-zone-saving-issue/negative-revert-to-original-not-reflected.spec.ts`

**Steps:**
  1. Open the test customer's detail page and record the original zone value (e.g. `A`).
    - expect: The zone field currently displays the original value (`A`).
  2. Change zone from `A` to a different value (e.g. `A` → `LB`) and click Save.
    - expect: The zone field displays `LB` after saving, without a page reload.
  3. Change zone from `LB` back to the original value (e.g. `LB` → `A`) and click Save, WITHOUT reloading the page.
    - expect (documents the bug): Immediately after this save, the zone field still displays `LB`, NOT `A` — the UI fails to reflect the reverted value even though the save action reports success (e.g. a success toast/message may still appear).
    - expect: No error is shown to the user (the save call itself does not visibly fail; the displayed field value is simply stale/incorrect).
  4. Reload the page (without changing the zone field again).
    - expect: Document the actual persisted value shown after reload: per the requirement, the field should now correctly show `A` after reload, confirming the discrepancy in step 3 was a UI/state-refresh bug rather than a backend persistence failure. If the reloaded value is NOT `A`, log this explicitly as evidence the bug also affects backend persistence, not only the displayed UI state.
  5. If the customer's zone is not already at its original value after step 4, change it back to `A` and save, then reload once more to confirm restoration, leaving the shared customer record clean.
    - expect: The zone field displays the original value (`A`) after this final reload.

#### 3.2. After the revert-to-original save, the field can be correctly set back to the original value once the page has been reloaded

**File:** `tests/customer-detail-zone-saving-issue/negative-revert-confirmed-correct-after-reload.spec.ts`

**Steps:**
  1. Repeat steps 1–3 from scenario 3.1 to reproduce the stale-display bug (zone shown as `LB` immediately after saving `LB` → `A`).
    - expect: The zone field displays `LB` (the stale/incorrect value) immediately after the revert-save, matching the bug reproduction in 3.1.
  2. Reload the page, then re-open the zone field's edit control and confirm what value it is currently set to before making any further change.
    - expect: After reload, the zone field's control reflects the original value (`A`), and it can be interacted with (opened, changed) normally, without needing any additional workaround.
  3. As a sanity check, without changing the value, click Save again (or navigate away and back) to confirm the page remains stable at `A`.
    - expect: The zone field continues to display `A`, confirming the customer record is left in its original, clean state for other tests/users.

## Acceptance Criteria Traceability

- "Changing a customer's zone to a new value and saving updates the displayed value correctly" → covered by scenario 2.1.
- "Changing the zone through several different values and saving each time updates the displayed value correctly each time" → covered by scenario 2.2.
- "Changing the zone away from its original value and then BACK to the original value, saving each time, must show the correct (original) value after the second save, without requiring a page reload" → covered by scenario 3.1 (reproduces the current failing behavior) and scenario 3.2 (confirms recovery after reload, to be re-verified once the underlying fix is deployed to staging/production).
