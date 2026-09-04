# Customer Detail Page — Zone Not Saved When Reverted to Original Value Test Plan

## Application Overview

URRY Admin Portal (https://dev-portal.urry.com), customer detail page — specifically the editable "zone" field (Asana gid 1215265081292154, "Saving issue on customer detail page", Project URRY Admin, Priority Medium, Status: Passed on Dev, waiting to be built on staging). The zone field can be edited and saved from the customer detail page. The known bug: after changing the zone to a different value and saving (which works), then changing it back to its ORIGINAL value and saving again, the UI keeps displaying the intermediate value instead of the reverted original — a full page reload is required before the field can be set back to the original value correctly. It is not yet confirmed whether the underlying persisted value is actually correct after the second save (and only the UI fails to reflect it) or whether persistence itself is broken; this must be checked during test execution via reload/API rather than assumed.

All tests must reuse `tests/seed-admin.spec.ts` (Base URL: https://dev-portal.urry.com, already logged in as demo@urry.com when the test begins).

IMPORTANT SAFETY NOTE (destructive-action guardrails — restated from the requirement doc, MUST be followed by every scenario in this plan):
- This is a real admin portal against a shared dev/staging environment. Do NOT use a real/shared production customer record if avoidable; prefer a dedicated test customer fixture if one is known. Otherwise, clearly record which customer record was used (name/ID) so its zone value can be restored afterward, and restore the zone to its original value at the end of every scenario that changes it.
- Do NOT delete or otherwise modify any other field on the customer record — only the zone field may be touched.
- Do NOT perform any destructive action (e.g. deleting the customer, cancelling orders) while testing this flow.

Open questions to confirm during test execution (do not assume an answer, document actual observed behavior):
- Whether the second save (revert to original) actually persists correctly server-side despite the UI not reflecting it (check via page reload and/or an API/read call for the customer's zone).
- The exact zone values available for use as intermediate test values (the requirement doc uses illustrative values `A`, `LB`, `B`, `C` — confirm real selectable zone options on the actual customer detail page before finalizing test data).

## Test Scenarios

### 1. Zone Save — Single Change (Baseline, Already Works)

**Seed:** `tests/seed-admin.spec.ts`

#### 1.1. Changing the zone to a new value and saving updates the displayed value correctly

**File:** `tests/customer-detail-zone-saving-issue/zone-single-change-saves-correctly.spec.ts`

**Steps:**
  1. Open a customer detail page for a dedicated test customer fixture and record the customer's current zone value (e.g. `A`).
    - expect: The zone field is visible and displays the recorded original value.
  2. Change the zone from its original value to a different value (e.g. `A` → `LB`) and click Save.
    - expect: The Save action completes without error.
    - expect: The zone field now displays the newly selected value (`LB`).
  3. Reload the page.
    - expect: The zone field still displays the newly saved value (`LB`), confirming the change persisted server-side.
  4. Restore the zone back to its original value (`A`) and click Save, to leave the fixture customer unchanged for other tests.
    - expect: The zone field displays the original value (`A`) after this cleanup save.

### 2. Zone Save — Multiple Different Values (Contrast Case, Already Works)

**Seed:** `tests/seed-admin.spec.ts`

#### 2.1. Changing the zone through several different values and saving each time updates the displayed value correctly every time

**File:** `tests/customer-detail-zone-saving-issue/zone-multiple-different-values-each-save-correct.spec.ts`

**Steps:**
  1. Open the customer detail page for the test customer fixture and record the original zone value (e.g. `A`).
    - expect: The zone field displays the recorded original value.
  2. Change the zone from `A` to `B` and click Save.
    - expect: The zone field displays `B` immediately after saving.
  3. Change the zone from `B` to `C` (a third, different value — never reverting to the original `A`) and click Save.
    - expect: The zone field displays `C` immediately after saving.
    - expect: No reload was required for either save in this scenario for the displayed value to be correct — this contrast case isolates that saving in general works, and that the bug (per suite 3) is specific to reverting to the ORIGINAL value, not to saving multiple times.
  4. Restore the zone back to its original value (`A`) and click Save, to leave the fixture customer unchanged.
    - expect: The zone field displays the original value (`A`) after this cleanup save.

### 3. Zone Save — Revert to Original Value (Bug Reproduction)

**Seed:** `tests/seed-admin.spec.ts`

#### 3.1. Reverting the zone to its original value after an intermediate change does not update the displayed value without a reload

**File:** `tests/customer-detail-zone-saving-issue/zone-revert-to-original-not-reflected-in-ui.spec.ts`

**Steps:**
  1. Open the customer detail page for the test customer fixture and record the original zone value (e.g. `A`).
    - expect: The zone field displays the recorded original value (`A`).
  2. Change the zone from `A` to `LB` and click Save.
    - expect: The zone field displays `LB` immediately after saving.
  3. Change the zone from `LB` back to the original value `A` and click Save.
    - expect: Document the actual observed displayed value immediately after this second save without reloading: per the reported bug, the zone field is expected to still show `LB` (the reverted value is NOT reflected in the UI) rather than `A`, even though the save action itself reports success with no error.
  4. Without reloading, re-open the zone edit control (if applicable) and check the value it currently shows as selected/editable.
    - expect: Document whether the edit control's own state also still shows `LB` (matching the bug description) or already shows `A` internally while only the display label lags — this distinction matters for isolating whether the bug is in the read-back/render logic or in the underlying state after save.

#### 3.2. After reloading the page, the zone can be correctly set back to the original value

**File:** `tests/customer-detail-zone-saving-issue/zone-revert-after-reload-can-be-corrected.spec.ts`

**Steps:**
  1. Reproduce the bug state from scenario 3.1: original zone `A` → save `LB` → save back to `A`, leaving the page showing the stale `LB` value without reloading.
    - expect: The zone field displays `LB` (the known bug state), matching scenario 3.1.
  2. Reload the page.
    - expect: Document the zone value shown immediately after reload: this is the key check for whether the second save actually persisted `A` server-side (UI-only bug) or whether the server itself still holds `LB` (persistence bug) — record the actual value observed rather than assuming either outcome.
  3. If the reloaded value is still `LB` (persistence did not take effect), attempt to set the zone to `A` again and save.
    - expect: After this additional save, the zone field displays `A`, confirming that after a reload the field "can be correctly set back to the original value" per the requirement doc's reproduction notes.
  4. Reload the page once more and re-check the zone value as a final confirmation.
    - expect: The zone field displays `A`, matching the original value and leaving the fixture customer clean for other tests.

### 4. Zone Save — Revert to Original Value (Acceptance Criterion / Fix Verification)

**Seed:** `tests/seed-admin.spec.ts`

#### 4.1. Reverting the zone to its original value and saving must display the correct value after the second save, without requiring a page reload

**File:** `tests/customer-detail-zone-saving-issue/zone-revert-to-original-fixed-no-reload-required.spec.ts`

**Steps:**
  1. Open the customer detail page for the test customer fixture and record the original zone value (e.g. `A`).
    - expect: The zone field displays the recorded original value (`A`).
  2. Change the zone from `A` to `LB` and click Save.
    - expect: The zone field displays `LB` immediately after saving, with no reload performed.
  3. Change the zone from `LB` back to the original value `A` and click Save, WITHOUT reloading the page at any point in this step.
    - expect: Immediately after this second save, and without any page reload, the zone field displays the correct reverted value `A` — this is the core acceptance criterion for the fix and is expected to FAIL against the currently-reported buggy build (where it would still show `LB`) and PASS once the fix described in the requirement doc is deployed.
  4. Reload the page as a final persistence check.
    - expect: The zone field still displays `A` after reload, confirming the value is both correctly displayed immediately after save AND correctly persisted server-side.
  5. Repeat the revert sequence once more within the same test run (`A` → `LB` → save → `A` → save) to rule out a one-time/flaky pass.
    - expect: The zone field again displays `A` immediately after the second save, without reload, on this second iteration as well.

### 5. Zone Save — Regression Guardrails (No Unintended Side Effects)

**Seed:** `tests/seed-admin.spec.ts`

#### 5.1. Saving the zone field does not modify any other field on the customer record

**File:** `tests/customer-detail-zone-saving-issue/zone-save-does-not-affect-other-fields.spec.ts`

**Steps:**
  1. Open the customer detail page for the test customer fixture and record the current values of all other visible/editable customer fields alongside the zone (e.g. name, address, contact info, status — whichever fields are present on this page), plus the original zone value.
    - expect: All recorded field values are visible and readable before any change is made.
  2. Perform the revert sequence from suite 4 (`A` → `LB` → save → `A` → save) on the zone field only, without touching any other field.
    - expect: The zone field ends on the correct reverted value (`A`), per suite 4.
  3. Re-check every other field recorded in step 1.
    - expect: All other fields on the customer record remain exactly as recorded in step 1 — no other field was altered as a side effect of the zone save/revert sequence.
  4. Confirm no destructive action occurred (customer record still exists, no orders were cancelled or otherwise modified).
    - expect: The customer record is present and unchanged apart from the zone field, which is left at its original value (`A`) at the end of the test.
