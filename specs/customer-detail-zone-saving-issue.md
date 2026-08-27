# Customer Detail Page — Zone Not Saved When Reverted to Original Value Test Plan

## Application Overview

URRY Admin Portal (https://dev-portal.urry.com) is the internal management app for the URRY B2B liquor/restaurant ordering platform. This plan covers a bug on the customer detail page's "zone" field (Asana gid 1215265081292154, "Saving issue on customer detail page", Project URRY Admin, Priority Medium, Project size Small, Where: Admin; status "Passed on Dev, waiting to be built on staging" per the latest comment "test pass on dev, please build staging"). When a customer's zone is changed to a different value and saved, then changed BACK to its ORIGINAL value and saved again, the displayed zone value does not update to reflect the reverted value — it keeps showing the intermediate value instead, and a full page reload is required before the field can be correctly set back to the original value. Changing between several different values (never reverting to the original) already works correctly and is used here as a contrast/regression case to isolate that the bug is specific to reverting to the ORIGINAL value.

All tests must reuse `tests/seed-admin.spec.ts` (Base URL: https://dev-portal.urry.com, already logged in as demo@urry.com when the test begins).

IMPORTANT SAFETY NOTE (destructive-action guardrails — restated from the requirement, MUST be followed by every scenario in this plan):
- This is a real admin portal against a shared dev/staging environment. Do NOT use a real/shared production customer record if avoidable; prefer a dedicated test customer fixture if one is known, otherwise clearly document which customer record was used in the test so its zone value can be restored afterward.
- Do NOT modify or delete any other field on the customer record besides the zone field under test.
- Do NOT perform any destructive action (e.g. deleting the customer, canceling orders) while testing this flow.
- Every scenario that changes the zone value away from its original value MUST restore the customer's zone back to its original value (verified via page reload) before the test ends, so the shared fixture is left as it was found.
- The bug's exact root cause (UI-only staleness vs. an actual persistence issue) is unconfirmed per the requirement — scenarios must verify the PERSISTED value (e.g. via page reload) rather than only trusting the on-screen value after a save, to correctly distinguish a UI display bug from a real save failure.

## Test Scenarios

### 1. Zone Save — Contrast Case (Different Values, No Revert)

**Seed:** `tests/seed-admin.spec.ts`

#### 1.1. Saving the zone through several different values (never reverting to the original) updates the displayed value correctly each time

**File:** `tests/customer-detail-zone-saving-issue/zone-save-sequential-different-values.spec.ts`

**Steps:**
  1. Navigate to a known test customer's detail page and record the zone value currently displayed (e.g. `A`).
    - expect: The customer detail page loads and the zone field shows a single, well-defined current value.
  2. Change the zone from its current value (`A`) to a different value `B`, then click Save.
    - expect: After the save completes, the zone field displays `B`.
  3. Change the zone from `B` to a different value `C` (never `A`), then click Save.
    - expect: After the save completes, the zone field displays `C`.
  4. Reload the page.
    - expect: After reload, the zone field still displays `C`, confirming the sequential-different-values save path persists and displays correctly (this is the expected, already-working baseline behaviour).
  5. Restore the zone back to its original value `A` and click Save, then reload the page to confirm.
    - expect: After reload, the zone field displays `A`, leaving the shared customer fixture as it was found.

### 2. Zone Save — Bug Reproduction (Revert to Original Value)

**Seed:** `tests/seed-admin.spec.ts`

#### 2.1. Changing the zone away from its original value and then back to the original value shows the reverted value without requiring a reload

**File:** `tests/customer-detail-zone-saving-issue/zone-save-revert-to-original-no-reload.spec.ts`

**Steps:**
  1. Navigate to a known test customer's detail page and record the zone value currently displayed as the original value (e.g. `A`).
    - expect: The customer detail page loads and the zone field shows the original value `A`.
  2. Change the zone from `A` to a different value `LB`, then click Save.
    - expect: After the save completes, the zone field displays `LB`.
  3. Without reloading the page, change the zone from `LB` back to the original value `A`, then click Save.
    - expect: After the save completes (no error shown), the zone field displays `A` — this is the field under test; per the reported bug, at time of writing the field incorrectly continues to display `LB` instead of `A`, so this assertion is expected to currently FAIL and document the regression until fixed.
  4. Without reloading, re-read the zone field value once more.
    - expect: The zone field consistently displays `A`, not `LB`, with no further interaction needed.

#### 2.2. After the revert-and-save sequence, reloading the page shows the correct persisted (original) value, isolating a UI display bug from a persistence bug

**File:** `tests/customer-detail-zone-saving-issue/zone-save-revert-then-reload-shows-correct-value.spec.ts`

**Steps:**
  1. Navigate to a known test customer's detail page and record the original zone value (e.g. `A`).
    - expect: The zone field shows the original value `A`.
  2. Change the zone from `A` to `LB`, click Save, then change the zone from `LB` back to `A` and click Save again (reproducing the bug sequence from scenario 2.1).
    - expect: The save actions complete without error (regardless of what value is currently displayed on screen).
  3. Reload the page.
    - expect: After reload, the zone field displays `A`, confirming that the underlying persisted value is actually correct and the bug is isolated to the UI not reflecting the reverted value without a reload (per the requirement's note that this needs to be confirmed during execution rather than assumed).
  4. Immediately after reload, attempt to set the zone to `A` again via the UI (as the requirement notes the field "can be set back to `A` correctly" after a reload) and click Save.
    - expect: The save succeeds and the zone field continues to display `A`, leaving the shared customer fixture restored to its original value.

### 3. Zone Save — Acceptance Criteria Regression Coverage

**Seed:** `tests/seed-admin.spec.ts`

#### 3.1. Changing the zone to a new value and saving updates the displayed value correctly (baseline, single change)

**File:** `tests/customer-detail-zone-saving-issue/zone-save-single-change-baseline.spec.ts`

**Steps:**
  1. Navigate to a known test customer's detail page and record the original zone value (e.g. `A`).
    - expect: The zone field shows the original value `A`.
  2. Change the zone to a single different value `B` and click Save.
    - expect: After the save completes, the zone field displays `B` with no error shown.
  3. Reload the page.
    - expect: After reload, the zone field still displays `B`, confirming the basic single-change save path works.
  4. Restore the zone back to `A` and click Save, then reload to confirm.
    - expect: After reload, the zone field displays `A`, leaving the shared customer fixture as it was found.

#### 3.2. Full acceptance-criteria walkthrough: sequential different values work, then reverting to the original value must display correctly without a reload

**File:** `tests/customer-detail-zone-saving-issue/zone-save-full-acceptance-criteria-walkthrough.spec.ts`

**Steps:**
  1. Navigate to a known test customer's detail page and record the original zone value (e.g. `A`).
    - expect: The zone field shows the original value `A`.
  2. Change the zone `A` → `B`, click Save.
    - expect: The zone field displays `B` after saving.
  3. Change the zone `B` → `C`, click Save.
    - expect: The zone field displays `C` after saving (sequential different-values case, per acceptance criterion 2).
  4. Change the zone `C` back to the original value `A`, click Save.
    - expect: The zone field displays `A` after saving, without requiring a page reload (per acceptance criterion 3 — the core fix under test).
  5. Reload the page as a final persistence check.
    - expect: After reload, the zone field still displays `A`, confirming both the UI and the persisted value are correct and the customer fixture is left in its original state.
