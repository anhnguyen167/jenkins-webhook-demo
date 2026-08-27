# Customer Detail Page — Zone Not Saved When Reverted to Original Value Test Plan

## Requirement Summary

URRY Admin Portal (https://dev-portal.urry.com), customer detail page, "zone" field (Asana gid 1215265081292154, Project URRY Admin, Priority Medium, Project size Small, Where: Admin; status "Passed on Dev, waiting to be built on staging"). All tests must reuse `tests/seed-admin.spec.ts` (already logged in as demo@urry.com when the test begins).

Bug: on the customer detail page, a customer's zone field can be edited and saved. Changing zone to a different value and saving works correctly (displayed value updates). But if the zone is then changed back to its ORIGINAL value and saved again, the UI keeps showing the intermediate (previous) value instead of the reverted original — a full page reload is required before the field can be set back to the original value. It is not yet confirmed whether the underlying persisted value is actually correct after the second save (a UI-display-only bug) or whether persistence itself is affected — this must be checked during test execution via reload/API rather than assumed.

Contrast case (works correctly, used for regression isolation): changing zone through several DIFFERENT values in sequence (never reverting to the original), saving each time, updates the displayed value correctly every time. This isolates that the bug is specific to reverting to the ORIGINAL value, not saving in general.

Acceptance criteria:
- Changing zone to a new value and saving updates the displayed value correctly (already works).
- Changing zone through several different values, saving each time, updates the displayed value correctly each time (already works — contrast case).
- Changing zone away from its original value and then back to the original value, saving each time, must show the correct (original) value after the second save, without requiring a page reload.

Guardrails: this is a real admin portal against a shared dev/staging environment — avoid a real/shared production customer record; prefer a dedicated test customer fixture if one is known, otherwise clearly document which customer record was used so its zone value can be restored afterward. Do not modify any other field on the customer record. Do not perform any destructive action (e.g. deleting the customer, canceling orders) while testing this flow.

## Test Scenarios

### 1. Baseline — Single Value Change Saves Correctly (Regression, Already Works)

**Seed:** `tests/seed-admin.spec.ts`

#### 1.1. Changing zone to a new value and saving updates the displayed value

**File:** `tests/customer-detail-zone-saving-issue/baseline-single-value-change-saves-correctly.spec.ts`

**Steps:**
  1. From the authenticated admin dashboard, navigate to a customer detail page for a dedicated test customer fixture (document the exact customer id/name used, so its zone value can be restored afterward) and record its current zone value as the ORIGINAL value (e.g. `A`).
    - expect: The customer detail page loads and the zone field is visible, showing the ORIGINAL value.
  2. Change the zone field from the ORIGINAL value to a different value (e.g. `A` → `LB`) and click Save.
    - expect: The save action completes without error.
    - expect: The zone field displays the new value (`LB`) immediately after saving, without needing a page reload.
  3. Reload the page.
    - expect: The zone field still shows the new value (`LB`) after reload, confirming the change was actually persisted and not just displayed.
  4. Restore the zone back to the ORIGINAL value (`A`) and save, to leave the fixture customer record unchanged for other tests (cleanup — do not assert on this step beyond confirming the save succeeded).
    - expect: The save action completes without error.

### 2. Contrast Case — Sequential Different-Value Changes (Regression Coverage)

**Seed:** `tests/seed-admin.spec.ts`

#### 2.1. Changing zone through three different values in sequence saves and displays correctly each time

**File:** `tests/customer-detail-zone-saving-issue/contrast-sequential-different-values-save-correctly.spec.ts`

**Steps:**
  1. Navigate to the dedicated test customer fixture's detail page and record the current zone value as the ORIGINAL value (e.g. `A`).
    - expect: The zone field is visible showing the ORIGINAL value.
  2. Change zone from the ORIGINAL value to a different value (e.g. `A` → `B`) and click Save.
    - expect: The zone field displays `B` immediately after saving.
  3. Change zone from `B` to a third, different value (e.g. `B` → `C`) and click Save.
    - expect: The zone field displays `C` immediately after saving.
    - expect: This confirms that saving across multiple DIFFERENT values in sequence (never reverting to the original) works correctly, isolating the bug in suite 3 as specific to reverting to the original value rather than saving in general.
  4. Restore the zone back to the ORIGINAL value (`A`) and save (cleanup).
    - expect: The save action completes without error.

### 3. Revert-to-Original Value (Bug Reproduction)

**Seed:** `tests/seed-admin.spec.ts`

#### 3.1. Changing zone away from the original and back to the original must display the reverted value after the second save, without a page reload

**File:** `tests/customer-detail-zone-saving-issue/bug-revert-to-original-value-not-reflected-without-reload.spec.ts`

**Steps:**
  1. Navigate to the dedicated test customer fixture's detail page and record the current zone value as the ORIGINAL value (e.g. `A`).
    - expect: The zone field is visible showing the ORIGINAL value.
  2. Change zone from the ORIGINAL value to a different, intermediate value (e.g. `A` → `LB`) and click Save.
    - expect: The zone field displays the intermediate value (`LB`) immediately after saving.
  3. Without reloading the page, change zone from the intermediate value (`LB`) back to the ORIGINAL value (`A`) and click Save.
    - expect: The zone field displays the ORIGINAL value (`A`) immediately after saving — this is the core acceptance criterion under test. Prior to the fix, this was expected to fail (the field kept showing `LB` instead of reverting to `A`); document the actual observed value if it differs from `A`.
  4. Without reloading, re-open/re-focus the zone field's edit control (if applicable) and read its current editable value.
    - expect: The editable control's value also reflects the ORIGINAL value (`A`), not the stale intermediate value (`LB`), confirming the fix applies to the underlying field state and not only to a display label.
  5. Confirm no other field on the customer record was modified by this sequence.
    - expect: All other customer detail fields are unchanged from step 1.

#### 3.2. The persisted (server-side) value after reverting to the original is correct, independent of the UI display bug

**File:** `tests/customer-detail-zone-saving-issue/revert-to-original-persisted-value-confirmed-via-reload.spec.ts`

**Steps:**
  1. Navigate to the dedicated test customer fixture's detail page and record the current zone value as the ORIGINAL value (e.g. `A`).
    - expect: The zone field is visible showing the ORIGINAL value.
  2. Change zone from the ORIGINAL value to a different, intermediate value (e.g. `A` → `LB`) and click Save.
    - expect: The zone field displays the intermediate value (`LB`).
  3. Change zone from the intermediate value (`LB`) back to the ORIGINAL value (`A`) and click Save, without reloading yet.
    - expect: Record whatever value the UI displays at this point (per scenario 3.1, this may or may not already show `A` depending on whether the fix is applied).
  4. Reload the page (or, if available, fetch the customer record via the underlying API/admin data endpoint) to read the persisted value directly, bypassing any client-side display state.
    - expect: The persisted zone value is the ORIGINAL value (`A`) — confirming whether the bug is purely a UI-display issue (persisted value was already correct pre-fix) or also affected persistence itself (persisted value was wrong pre-fix). Document the actual pre-reload vs. post-reload values observed, since this was an open question in the original bug report rather than an assumed fact.
  5. Confirm no other field on the customer record was modified by this sequence.
    - expect: All other customer detail fields are unchanged from step 1.
