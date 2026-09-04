# Customer Detail Page — Zone Not Saved When Reverted to Original Value

## Requirement Summary

Source: `requirements/customer-detail-zone-saving-issue.md` (Asana gid 1215265081292154, "Saving issue on customer detail page", Project: URRY Admin, Priority Medium, Project size Small, Where: Admin — status "Passed on Dev, waiting to be built on staging").

On the customer detail page of the URRY Admin Portal, a customer's "zone" field can be edited and saved. Changing zone to a new value and saving works correctly, and changing zone through several different values in sequence (never reverting) also works correctly. However, when the zone is changed away from its original value and then changed BACK to that original value and saved again, the UI keeps showing the intermediate (previous) value instead of the reverted original — the displayed value only becomes correct after a full page reload. Acceptance requires that reverting to the original value and saving updates the displayed value correctly without requiring a page reload, while not regressing the already-working single-change and multi-different-value-change cases.

All tests must reuse `tests/seed-admin.spec.ts` (Base URL: https://dev-portal.urry.com, already logged in as demo@urry.com when the test begins). Per the requirement's guardrails: do not use a real/shared production customer record if avoidable (prefer a dedicated test customer fixture, otherwise document which customer record was used so its zone value can be restored afterward), do not modify or delete any other field on the customer record, and do not perform any destructive action (e.g. deleting the customer, cancelling orders) while testing this flow. Every scenario below must restore the customer's zone to its original pre-test value before finishing.

## Test Scenarios

### 1. Baseline — Single Zone Change Saves and Displays Correctly (Regression, Already Working)

**Seed:** `tests/seed-admin.spec.ts`

#### 1.1. Changing zone to a new value and saving updates the displayed value

**File:** `tests/customer-detail-zone-saving-issue/baseline-single-zone-change-saves.spec.ts`

**Steps:**
  1. Navigate to a customer detail page for a dedicated test customer fixture (or a documented, restorable customer record) and record the zone field's current original value (e.g. `A`).
    - expect: The customer detail page loads and the zone field displays the recorded original value.
  2. Change the zone field from the original value to a different value (e.g. `A` → `LB`) and click Save.
    - expect: The save action completes without error.
    - expect: The zone field immediately displays the new value (`LB`), with no page reload required.
  3. Restore the zone field back to its recorded original value and click Save, then reload the page to confirm restoration.
    - expect: After reload, the zone field displays the original value (`A`), confirming the customer record was left unchanged for future test runs.

### 2. Contrast Case — Sequential Changes Between Different Values (Regression, Already Working)

**Seed:** `tests/seed-admin.spec.ts`

#### 2.1. Changing zone through several different values, never reverting, updates the displayed value correctly at each step

**File:** `tests/customer-detail-zone-saving-issue/contrast-sequential-different-values.spec.ts`

**Steps:**
  1. Navigate to the customer detail page for the test customer and record the zone field's original value (e.g. `A`).
    - expect: The zone field displays the recorded original value.
  2. Change zone from the original value to a first different value (e.g. `A` → `B`) and click Save.
    - expect: The zone field displays `B` immediately after save, with no page reload required.
  3. Change zone from that value to a second, different-again value (e.g. `B` → `C`) and click Save.
    - expect: The zone field displays `C` immediately after save, with no page reload required.
    - expect: This confirms the sequence of changing between three different values, never reverting to the original, works correctly — isolating that the bug (covered in Suite 3) is specific to reverting to the ORIGINAL value.
  4. Restore the zone field back to its recorded original value and click Save, then reload the page to confirm restoration.
    - expect: After reload, the zone field displays the original value (`A`), confirming no residual test data was left on the customer record.

### 3. Bug Reproduction — Reverting Zone to Its Original Value

**Seed:** `tests/seed-admin.spec.ts`

#### 3.1. Changing zone away from and then back to its original value, saving each time, must display the reverted value without a page reload

**File:** `tests/customer-detail-zone-saving-issue/bug-revert-to-original-value-no-reload.spec.ts`

**Steps:**
  1. Navigate to the customer detail page for the test customer and record the zone field's original value (e.g. `A`).
    - expect: The zone field displays the recorded original value.
  2. Change zone from the original value to a different value (e.g. `A` → `LB`) and click Save.
    - expect: The zone field displays `LB` immediately after save.
  3. Change zone from that intermediate value back to the original value (e.g. `LB` → `A`) and click Save, WITHOUT reloading the page.
    - expect: The zone field displays the original value (`A`) immediately after this second save — this is the primary acceptance criterion under test.
    - expect: (Documents the bug being fixed) Prior to the fix, this step incorrectly left the field showing the intermediate value (`LB`) instead of `A`; the field must now show `A` without requiring a reload.
  4. Without making any further changes, reload the page.
    - expect: After reload, the zone field still displays the original value (`A`), confirming the value was correctly persisted server-side and the UI is now consistent with the reload state.

#### 3.2. Persisted zone value after the revert-and-save sequence matches what is shown on reload (isolates UI-display bug from persistence bug)

**File:** `tests/customer-detail-zone-saving-issue/bug-revert-persistence-matches-reload.spec.ts`

**Steps:**
  1. Navigate to the customer detail page for the test customer and record the zone field's original value (e.g. `A`).
    - expect: The zone field displays the recorded original value.
  2. Change zone from the original value to a different value (e.g. `A` → `LB`) and click Save; then change it back to the original value (e.g. `LB` → `A`) and click Save.
    - expect: Both save actions complete without error (no failure toast/response on either save call).
  3. Immediately after the second save, without reloading, capture the zone value as currently displayed in the UI.
    - expect: Record the displayed value for comparison in the next step.
  4. Reload the page and capture the zone value as displayed after reload.
    - expect: The reloaded value equals the recorded original value (`A`).
    - expect: The value displayed immediately after the second save (step 3) equals the value displayed after reload (step 4) — i.e., the UI reflects the persisted value without needing a reload, confirming the fix addresses the UI display and not merely underlying persistence (which the requirement notes may have already been working correctly even before the fix).

### 4. Guardrails — No Unrelated Data Is Modified

**Seed:** `tests/seed-admin.spec.ts`

#### 4.1. The revert-and-save zone sequence does not modify any other field on the customer record

**File:** `tests/customer-detail-zone-saving-issue/guardrail-no-other-fields-modified.spec.ts`

**Steps:**
  1. Navigate to the customer detail page for the test customer and record the current values of all other visible customer fields (e.g. name, address, contact info, status) alongside the zone field's original value.
    - expect: All field values are recorded before any change is made.
  2. Perform the revert sequence: change zone to a different value and Save, then change it back to the original value and Save (per Suite 3).
    - expect: Both saves complete without error.
  3. Re-read all previously recorded non-zone fields on the customer detail page.
    - expect: Every other field's value is unchanged from what was recorded in step 1 — only the zone field was affected by the save actions.
  4. Confirm the zone field itself is restored to its original value; if not already `A`, set it back and Save.
    - expect: The zone field displays the original value (`A`) at the end of the test, leaving the customer record exactly as it was found.
