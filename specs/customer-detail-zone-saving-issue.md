# Customer Detail Page — Zone Not Saved When Reverted to Original Value Test Plan

## Application Overview

URRY Admin Portal (https://dev-portal.urry.com), customer detail page — the "zone" field editor (Asana gid 1215265081292154, Project: URRY Admin, Priority Medium, Project size Small, Where: Admin; status "Passed on Dev, waiting to be built on staging"). A customer's zone field can be edited and saved from the customer detail page. The reported bug: after changing zone from its original value to a different value and saving (which works), then changing it back to the ORIGINAL value and saving again, the UI keeps showing the intermediate value instead of the reverted original — a full page reload is required before the field can be set back to the original value correctly. It is not yet confirmed during exploration whether the underlying persisted value is actually wrong or whether only the UI display fails to refresh after the second save; this plan treats that as an open question to be resolved by checking the reloaded/persisted value directly rather than assuming either direction.

All tests must reuse `tests/seed-admin.spec.ts` for authenticated admin login (Base URL: https://dev-portal.urry.com, already logged in as demo@urry.com when the test begins).

IMPORTANT SAFETY NOTE (guardrails restated from the requirement, MUST be followed by every scenario in this plan):
- This is a real admin portal against a shared dev/staging environment — do not use a real/shared production customer record if avoidable; prefer a dedicated test customer fixture if one is known, otherwise clearly document which customer record was used so its zone value can be restored afterward.
- Do not delete or otherwise modify any other field on the customer record besides zone.
- Do not perform any destructive action (e.g. deleting the customer, canceling orders) while testing this flow.
- Every scenario that changes the zone value away from its original value must restore the zone back to that original value by the end of the scenario (via UI save and/or page reload), so the test customer record is left as it was found.

## Test Scenarios

### 1. Zone Update — Baseline Save Behavior (Regression, Already Works)

**Seed:** `tests/seed-admin.spec.ts`

#### 1.1. Changing zone to a new value and saving updates the displayed value correctly

**File:** `tests/customer-detail-zone-saving-issue/zone-save-new-value.spec.ts`

**Steps:**
  1. Open a customer detail page for a dedicated test customer and record the currently displayed zone value as the ORIGINAL value (e.g. `A`).
    - expect: The customer detail page loads and the zone field is visible showing the recorded original value.
  2. Change the zone field from the original value to a different value (e.g. `A` → `LB`) and click Save.
    - expect: The zone field displays the newly saved value (`LB`) immediately after save, without requiring a page reload.
    - expect: No error/toast indicating a failed save is shown.
  3. Restore the zone back to the recorded original value and click Save, to leave the test customer record unchanged.
    - expect: The zone field displays the original value again after this cleanup save (this step's own correctness is covered separately by suite 2; here it is only used for cleanup).

#### 1.2. Changing zone through several different values across multiple saves (contrast case)

**File:** `tests/customer-detail-zone-saving-issue/zone-save-multiple-different-values.spec.ts`

**Steps:**
  1. Open the same test customer's detail page and record the currently displayed zone value as the ORIGINAL value (e.g. `A`).
    - expect: The zone field shows the recorded original value.
  2. Change zone from the original value to a different value (e.g. `A` → `B`) and click Save.
    - expect: The zone field displays `B` immediately after save.
  3. Change zone from `B` to a THIRD, still-different value (e.g. `B` → `C`) and click Save, never reverting to the original value `A` in this sequence.
    - expect: The zone field displays `C` immediately after save.
    - expect: This sequence of changing between different values (never reverting to the original) completes with the correct, latest value shown each time — isolating that any bug is specific to reverting to the ORIGINAL value, not to saving in general.
  4. Change zone back to the recorded original value (`A`) and click Save, to restore the test customer record.
    - expect: The zone field displays the original value `A` after this cleanup save.

### 2. Zone Update — Revert to Original Value Bug (Core Regression)

**Seed:** `tests/seed-admin.spec.ts`

#### 2.1. Reverting zone to its original value after an intermediate change must update the UI without a page reload

**File:** `tests/customer-detail-zone-saving-issue/zone-revert-to-original-no-reload-needed.spec.ts`

**Steps:**
  1. Open the test customer's detail page and record the currently displayed zone value as the ORIGINAL value (e.g. `A`).
    - expect: The zone field shows the recorded original value.
  2. Change zone from the original value to a different, intermediate value (e.g. `A` → `LB`) and click Save.
    - expect: The zone field displays the intermediate value `LB` immediately after save.
  3. Change zone from the intermediate value back to the ORIGINAL value (`LB` → `A`) and click Save, WITHOUT reloading the page.
    - expect: The zone field displays the original value `A` immediately after this second save, without requiring a page reload (this is the primary acceptance criterion for the fix — prior to the fix, the field incorrectly kept showing `LB`).
  4. Re-read the zone field value once more without navigating away or reloading.
    - expect: The zone field continues to display the original value `A` (the corrected value is stable, not a transient flicker).

#### 2.2. Persisted zone value after reload matches what was shown before reload, confirming the save (not just the display) is correct

**File:** `tests/customer-detail-zone-saving-issue/zone-revert-persisted-value-matches-after-reload.spec.ts`

**Steps:**
  1. Open the test customer's detail page and record the currently displayed zone value as the ORIGINAL value (e.g. `A`).
    - expect: The zone field shows the recorded original value.
  2. Change zone from the original value to a different, intermediate value (e.g. `A` → `LB`) and click Save.
    - expect: The zone field displays `LB` immediately after save.
  3. Change zone from `LB` back to the ORIGINAL value (`A`) and click Save.
    - expect: The zone field displays `A` immediately after this second save (per scenario 2.1).
  4. Reload the page (full navigation reload, not a client-side refresh).
    - expect: After reload, the zone field displays the ORIGINAL value `A` — i.e. the value shown immediately after step 3's save matches the value read fresh from the backend after reload, confirming the second save was actually persisted correctly and the earlier bug (if reproduced) was a UI-refresh issue rather than a data-persistence issue.
  5. If the value read in step 4 differs from what was displayed in step 3 (i.e. the pre-fix bug still reproduces), document this explicitly as a persistence-level failure requiring escalation, rather than treating it as an already-known UI-only issue.
    - expect: This step exists only to document divergent behavior if observed; it does not itself assert a pass/fail direction beyond confirming step 4's expectation.

#### 2.3. Reverting to the original value works correctly across repeated change/revert cycles

**File:** `tests/customer-detail-zone-saving-issue/zone-revert-to-original-repeated-cycles.spec.ts`

**Steps:**
  1. Open the test customer's detail page and record the currently displayed zone value as the ORIGINAL value (e.g. `A`).
    - expect: The zone field shows the recorded original value.
  2. Perform two full cycles of: change zone to a different value and Save, then change zone back to the ORIGINAL value and Save (e.g. cycle 1: `A` → `LB` → `A`; cycle 2: `A` → `C` → `A`).
    - expect: After the intermediate-value save in each cycle, the zone field displays that cycle's intermediate value.
    - expect: After the revert-to-original save in each cycle, the zone field displays the ORIGINAL value `A` without requiring a page reload, for BOTH cycles (not only the first).
  3. Reload the page once, after both cycles are complete.
    - expect: The zone field still displays the ORIGINAL value `A`, confirming the final state is correctly persisted after repeated revert cycles.

### 3. Zone Update — Data Integrity and Cleanup

**Seed:** `tests/seed-admin.spec.ts`

#### 3.1. Zone save operations do not modify any other field on the customer record

**File:** `tests/customer-detail-zone-saving-issue/zone-save-does-not-affect-other-fields.spec.ts`

**Steps:**
  1. Open the test customer's detail page and record the current values of the zone field AND at least one other unrelated field visible on the page (e.g. customer name, address, or status).
    - expect: Both the zone value and the other field's value are recorded.
  2. Change zone from the original value to a different value and Save, then change it back to the original value and Save (reproducing the revert sequence from suite 2).
    - expect: Across both saves, the zone field ends up showing the original value (per scenario 2.1).
  3. Re-check the unrelated field recorded in step 1.
    - expect: The unrelated field's value is unchanged from what was recorded in step 1 — confirming zone save operations do not have side effects on other customer data.

#### 3.2. Test customer's zone value is confirmed restored to its original value at the end of the test suite run

**File:** `tests/customer-detail-zone-saving-issue/zone-final-state-restored.spec.ts`

**Steps:**
  1. After all other scenarios in this plan have run against the same dedicated test customer, open that customer's detail page fresh (full navigation, not relying on any in-memory state from prior scenarios).
    - expect: The customer detail page loads successfully.
  2. Read the currently displayed zone value.
    - expect: The zone value matches the ORIGINAL value documented at the start of this test plan's exploration/setup (e.g. `A`) — confirming no scenario in this plan left the shared test customer record in a modified state.
  3. If the value does not match, set it back to the original value and Save as a corrective cleanup action.
    - expect: After this corrective save, the zone value matches the original value, and this deviation is documented so the root cause (test isolation issue vs. a genuine remaining bug) can be investigated separately.
