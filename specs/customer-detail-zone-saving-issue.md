# Customer Detail Page — Zone Not Saved When Reverted to Original Value — Test Plan

## Application Overview

URRY Admin Portal (https://dev-portal.urry.com), customer detail page, "zone" field (Asana gid 1215265081292154, Project: URRY Admin, Priority Medium, Project size Small, Where: Admin; Status: "Passed on Dev, waiting to be built on staging"). The zone field can be edited and saved. Bug: after changing the zone to a different value and saving (which displays correctly), then changing it BACK to its original value and saving again, the UI keeps showing the intermediate value instead of the reverted original — a full page reload is required before the field can be set back to the original value correctly. It is not yet confirmed whether the underlying persisted value is actually wrong or only the UI fails to reflect it, so scenarios covering the revert case must check the value both immediately after save (UI) and after a reload (persisted state).

All tests must reuse `tests/seed-admin.spec.ts` for authenticated admin login (Base URL: https://dev-portal.urry.com, already logged in as demo@urry.com when the test begins).

Acceptance criteria under test:
- Changing a customer's zone to a new value and saving updates the displayed value correctly (already works).
- Changing the zone through several different values and saving each time updates the displayed value correctly each time (already works — contrast case).
- Changing the zone away from its original value and then BACK to the original value, saving each time, must show the correct (original) value after the second save, without requiring a page reload.

Guardrails (restated from the requirement, must be followed by every scenario in this plan):
- This is a real admin portal against a shared dev/staging environment — do not use a real/shared production customer record if avoidable; prefer a dedicated test customer fixture if one is known, otherwise clearly document which customer record was used so the zone value can be restored afterward.
- Do not delete or otherwise modify any other field on the customer record.
- Do not perform any destructive action (e.g. deleting the customer, canceling orders) while testing this flow.
- Every scenario must restore the customer's zone to its original value by the end of the test (directly, or via the scenario's own revert steps), so the shared fixture is left unchanged.

## Test Scenarios

### 1. Zone Save — Single Change (Regression Baseline)

**Seed:** `tests/seed-admin.spec.ts`

#### 1.1. Changing the zone to a new value and saving updates the displayed value

**File:** `tests/customer-detail-zone-saving-issue/basic-single-value-change-save.spec.ts`

**Steps:**
  1. Navigate to a customer detail page for a known/dedicated test customer fixture and record its current zone value as the original value (e.g. `A`).
    - expect: The customer detail page loads and the zone field currently displays the recorded original value.
  2. Change the zone field from the original value to a different value (e.g. `LB`) and click Save.
    - expect: The zone field displays the newly saved value (`LB`) immediately after save, without needing a reload.
    - expect: No error/toast indicating a failed save is shown.
  3. Restore the zone back to the original value (e.g. `A`) and click Save, to leave the fixture unchanged for other tests.
    - expect: The zone field displays the original value (`A`) after this restoring save (this final restore is itself the revert case under test — if it does not display correctly here, treat scenario 3.x as the authoritative bug reproduction and still verify state via reload before ending the test).

### 2. Zone Save — Multiple Different Values (Contrast Case)

**Seed:** `tests/seed-admin.spec.ts`

#### 2.1. Sequentially saving the zone through several different values (never reverting to the original) always displays correctly

**File:** `tests/customer-detail-zone-saving-issue/contrast-sequential-different-values-save.spec.ts`

**Steps:**
  1. Navigate to the test customer detail page and record the current zone value as the original value (e.g. `A`).
    - expect: The zone field displays the recorded original value.
  2. Change zone from the original value to `B` and click Save.
    - expect: The zone field displays `B` immediately after save.
  3. Change zone from `B` to `C` and click Save.
    - expect: The zone field displays `C` immediately after save.
    - expect: This sequence (three DIFFERENT values, never reverting to the original) works correctly — used to isolate that the bug is specific to reverting to the ORIGINAL value, not to saving in general.
  4. Restore the zone back to the original value recorded in step 1 and click Save, to leave the fixture unchanged.
    - expect: The zone field displays the original value after this restoring save (verify via reload if the displayed value does not match, per scenario 3.x).

### 3. Zone Save — Revert to Original Value (Bug Reproduction / Fix Verification)

**Seed:** `tests/seed-admin.spec.ts`

#### 3.1. Reverting the zone back to its original value after one intermediate change displays correctly without a page reload

**File:** `tests/customer-detail-zone-saving-issue/revert-to-original-value-no-reload.spec.ts`

**Steps:**
  1. Navigate to the test customer detail page and record the current zone value as the original value (e.g. `A`).
    - expect: The zone field displays the recorded original value.
  2. Change zone from the original value (`A`) to a different value (`LB`) and click Save.
    - expect: The zone field displays `LB` immediately after save.
  3. Change zone from `LB` back to the original value (`A`) and click Save.
    - expect: The zone field displays the original value (`A`) immediately after this save, without any page reload — this is the primary fix under test. (Bug behavior being fixed: the field previously kept showing `LB` instead of reverting to `A`.)
  4. Without reloading, re-read the zone field value once more (e.g. after a short wait / any UI settle) to confirm the displayed value is stable and did not silently revert back to the stale intermediate value.
    - expect: The zone field still displays the original value (`A`), not `LB`.

#### 3.2. The persisted zone value after a revert-save is correct when confirmed via page reload

**File:** `tests/customer-detail-zone-saving-issue/revert-to-original-value-persisted-after-reload.spec.ts`

**Steps:**
  1. Navigate to the test customer detail page and record the current zone value as the original value (e.g. `A`).
    - expect: The zone field displays the recorded original value.
  2. Change zone from the original value (`A`) to a different value (`LB`) and click Save.
    - expect: The zone field displays `LB` immediately after save.
  3. Change zone from `LB` back to the original value (`A`) and click Save.
    - expect: Record whatever value is displayed immediately after this save (may show `LB` if the underlying bug is not yet fixed, or `A` if it is fixed — do not assume).
  4. Reload the page.
    - expect: After reload, the zone field displays the original value (`A`) — confirming the persisted/backend value is correct regardless of what the UI showed pre-reload, and isolating whether the bug (if still present) is a UI-display-only issue versus an actual persistence issue.
  5. If step 3 showed the stale `LB` value but step 4 (post-reload) correctly shows `A`, explicitly flag this as a UI-refresh-only bug (persistence is fine, the displayed value after save is not updated) rather than a data-loss bug.
    - expect: This distinction is recorded in the test result/report for triage purposes.

#### 3.3. Reverting through multiple back-and-forth changes to the original value each displays correctly

**File:** `tests/customer-detail-zone-saving-issue/revert-multiple-back-and-forth-cycles.spec.ts`

**Steps:**
  1. Navigate to the test customer detail page and record the current zone value as the original value (e.g. `A`).
    - expect: The zone field displays the recorded original value.
  2. Repeat the following cycle twice: change zone to a different value (e.g. `LB` on cycle 1, `C` on cycle 2) and Save, then change zone back to the original value (`A`) and Save.
    - expect: After each "away" save, the field displays the intermediate value used for that cycle.
    - expect: After each "revert" save, the field displays the original value (`A`) without requiring a page reload, for BOTH cycles — not just the first — to confirm the fix holds across repeated revert operations, not only a single occurrence.
  3. Reload the page once at the end.
    - expect: The zone field still displays the original value (`A`) after reload, confirming the final state is correctly persisted and the fixture is left unchanged.
