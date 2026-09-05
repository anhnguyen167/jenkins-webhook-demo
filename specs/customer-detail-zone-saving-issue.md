# Customer Detail Page — Zone Not Saved When Reverted to Original Value Test Plan

## Application Overview

URRY Admin Portal (https://dev-portal.urry.com) is the internal management app for the URRY B2B liquor/restaurant ordering platform. This plan covers a bug on the customer detail page's "zone" field (Asana gid 1215265081292154, "Saving issue on customer detail page", Project URRY Admin, Priority Medium, Project size Small, Where: Admin; status "Passed on Dev, waiting to be built on staging"). The zone field can be edited and saved from the customer detail page. When the zone is changed to a different value and saved, then changed BACK to its original value and saved again, the UI does not reflect the reverted value — it keeps showing the intermediate value instead, and a full page reload is required before the field can be correctly set back to the original value. A contrast case — changing the zone through several DIFFERENT values (never reverting to the original) — already works correctly and is used to isolate that the bug is specifically about reverting to the ORIGINAL value, not about saving in general.

All tests must reuse `tests/seed-admin.spec.ts` (Base URL: https://dev-portal.urry.com, already logged in as demo@urry.com when the test begins).

IMPORTANT SAFETY NOTE (destructive-action guardrails, restated from the task brief, MUST be followed by every scenario in this plan):
- This is a real admin portal against a shared dev/staging environment — do not use a real/shared production customer record if avoidable; prefer a dedicated test customer fixture if one is known, otherwise clearly document which customer record was used (and its original zone value) in the test so the zone can be restored afterward.
- Do NOT delete or otherwise modify any other field on the customer record besides zone.
- Do NOT perform any destructive action (e.g. deleting the customer, cancelling orders) while testing this flow.
- Since the bug concerns whether the DISPLAYED value matches the PERSISTED value, scenarios that check the "after reload" / persisted state should verify via a page reload (and/or API/backend read if available) rather than assuming the UI state reflects the saved state.

## Test Scenarios

### 1. Zone Save — Baseline (Single Change, Already Works)

**Seed:** `tests/seed-admin.spec.ts`

#### 1.1. Changing the zone to a new value and saving updates the displayed value correctly

**File:** `tests/customer-detail-zone-saving-issue/baseline-single-zone-change-updates-display.spec.ts`

**Steps:**
  1. Open a customer detail page for a dedicated test customer fixture whose zone is currently a known value `A`, and record this original value.
    - expect: The customer detail page loads and the zone field displays `A`.
  2. Change the zone field from `A` to `LB` and click Save.
    - expect: The save action completes without an error message.
    - expect: The zone field displays `LB` immediately after saving, without requiring a page reload.
  3. Reload the page.
    - expect: The zone field still displays `LB` after reload, confirming the change was actually persisted (not just reflected in local UI state).

### 2. Zone Save — Reverting to the Original Value (Bug Reproduction)

**Seed:** `tests/seed-admin.spec.ts`

#### 2.1. Reverting the zone back to its original value after an intermediate change does not update the displayed value without a reload

**File:** `tests/customer-detail-zone-saving-issue/bug-revert-to-original-value-not-reflected.spec.ts`

**Steps:**
  1. Open a customer detail page for a dedicated test customer fixture whose zone is currently `A`, and record this original value.
    - expect: The zone field displays `A`.
  2. Change the zone from `A` to `LB` and click Save.
    - expect: The zone field displays `LB`.
  3. Change the zone from `LB` back to `A` (the original value) and click Save.
    - expect: The save action completes without an error message (no visible failure/toast indicating the save itself failed).
    - expect: BUG — the zone field is displayed as `LB`, not `A`, i.e. the UI still shows the intermediate value instead of the reverted original value.
  4. Without reloading, re-read the zone field value.
    - expect: BUG — the displayed value remains `LB` rather than updating to `A`, confirming the discrepancy persists until an explicit reload (recorded as the defect this scenario reproduces).

#### 2.2. After a page reload, the persisted zone value can be inspected and the field can be correctly set back to the original value

**File:** `tests/customer-detail-zone-saving-issue/bug-revert-then-reload-recovers-correct-value.spec.ts`

**Steps:**
  1. Repeat the repro from scenario 2.1 up through the second Save (zone changed `A` → `LB` → back to `A`, displayed value stuck at `LB`).
    - expect: Zone field displays `LB` before reload (same as scenario 2.1).
  2. Reload the page.
    - expect: Record the zone value now displayed after reload — document whether it shows `A` (meaning the underlying save of the revert actually succeeded and only the UI failed to reflect it) or still shows `LB` (meaning the revert save did not persist at all). Do not assume the result; capture the actual observed value.
  3. If the reloaded value still does not show `A`, change the zone from its current displayed value to `A` again and click Save.
    - expect: The zone field now displays `A` after this save.
  4. Reload the page once more to confirm.
    - expect: The zone field displays `A`, confirming the field can be correctly set back to the original value once a reload has occurred, per the reported behavior.

### 3. Zone Save — Multiple Different Values (Contrast / Regression Coverage)

**Seed:** `tests/seed-admin.spec.ts`

#### 3.1. Changing the zone through three different values (never reverting to the original) updates the displayed value correctly at every step

**File:** `tests/customer-detail-zone-saving-issue/contrast-sequential-different-values-updates-display.spec.ts`

**Steps:**
  1. Open a customer detail page for a dedicated test customer fixture whose zone is currently `A`.
    - expect: The zone field displays `A`.
  2. Change the zone from `A` to `B` and click Save.
    - expect: The zone field displays `B` immediately after saving, without requiring a page reload.
  3. Change the zone from `B` to `C` and click Save.
    - expect: The zone field displays `C` immediately after saving, without requiring a page reload.
  4. Reload the page.
    - expect: The zone field still displays `C` after reload, confirming this sequence of changes across different values (never reverting to the original `A`) persists and displays correctly at every step — isolating that the bug in suite 2 is specific to reverting to the ORIGINAL value, not a general saving defect.
  5. Restore the test customer's zone back to its original value `A` (via Save, followed by a reload/verification if needed per scenario 2.2's findings) to leave the fixture in its original state for future test runs.
    - expect: The zone field displays `A` after this cleanup step, confirmed via reload.

### 4. Zone Save — Acceptance Criteria Confirmation

**Seed:** `tests/seed-admin.spec.ts`

#### 4.1. Reverting to the original value and saving shows the correct value immediately, without a page reload (post-fix target behavior)

**File:** `tests/customer-detail-zone-saving-issue/acceptance-revert-to-original-no-reload-needed.spec.ts`

**Steps:**
  1. Open a customer detail page for a dedicated test customer fixture whose zone is currently `A`.
    - expect: The zone field displays `A`.
  2. Change the zone from `A` to `LB` and click Save.
    - expect: The zone field displays `LB`.
  3. Change the zone from `LB` back to `A` and click Save.
    - expect: The zone field displays `A` immediately after this save, WITHOUT requiring a page reload — this is the acceptance criterion this scenario exists to confirm, and it is expected to FAIL against the current buggy build (per suite 2) and PASS once the fix described in the requirement is deployed.
  4. Reload the page to double-check persistence.
    - expect: The zone field still displays `A` after reload.
  5. Restore/confirm the test customer's zone is left at its original value `A` for future test runs.
    - expect: The zone field displays `A`.
