# Customer Detail Page — Zone Not Saved When Reverted to Original Value Test Plan

## Requirement Summary

Source: `requirements/customer-detail-zone-saving-issue.md` (Asana gid 1215265081292154, "Saving issue on customer detail page", Project URRY Admin, Priority Medium, Where: Admin; status "Passed on Dev, waiting to be built on staging").

URRY Admin Portal, customer detail page (zone field). On the customer detail page, a customer's "zone" field can be edited and saved. Changing the zone to a different value and saving updates the displayed value correctly. However, when the zone is then changed BACK to its original value and saved again, the UI keeps showing the intermediate (previous) value instead of the reverted original — a full page reload is required before the field can be set back to the original value correctly. It is not yet confirmed whether the underlying persisted value is actually correct after the second save (and only the UI fails to reflect it) or whether persistence itself is broken; this must be confirmed during test execution (e.g. via reload) rather than assumed.

Acceptance criteria:
- Changing a customer's zone to a new value and saving updates the displayed value correctly (already works).
- Changing the zone through several different values and saving each time updates the displayed value correctly each time (already works — contrast case, used for regression coverage).
- Changing the zone away from its original value and then BACK to the original value, saving each time, must show the correct (original) value after the second save, WITHOUT requiring a page reload.

Guardrails restated from the requirement (must be followed by every scenario in this plan):
- This is a real admin portal against a shared dev/staging environment — do not use a real/shared production customer record if avoidable; prefer a dedicated test customer fixture, otherwise clearly document which customer record was used so its zone value can be restored afterward.
- Do not delete or otherwise modify any other field on the customer record.
- Do not perform any destructive action (e.g. deleting the customer, cancelling orders) while testing this flow.
- Every scenario that changes the zone value must restore the customer's ORIGINAL zone value (via UI save and/or reload-then-save) by the end of the test, leaving no residue on the shared fixture.

## Test Scenarios

### 1. Zone Save — Baseline (Single Change, Already Working)

**Seed:** `tests/seed-admin.spec.ts`

#### 1.1. Changing the zone to a new value and saving updates the displayed value correctly

**File:** `tests/customer-detail-zone-saving-issue/baseline-single-zone-change-saves-correctly.spec.ts`

**Steps:**
  1. Start from the authenticated admin dashboard and navigate to a customer detail page for a known test customer fixture; record the current zone value shown (original value, e.g. `A`).
    - expect: The customer detail page loads and the zone field displays the recorded original value.
  2. Change the zone field from the original value to a different value (e.g. `A` → `LB`) and click Save.
    - expect: The save action completes without an error message.
    - expect: The zone field now displays the new value (`LB`), matching what was selected/entered.
  3. Restore the original value: change the zone back to the recorded original value (e.g. `LB` → `A`) and click Save, then reload the page if needed to confirm/finish the restore (per the bug behavior under test in Suite 2, a reload may be required at this step).
    - expect: After restoring (with reload if necessary), the customer's zone value matches the original value recorded in step 1, leaving the fixture unchanged for future test runs.

### 2. Zone Save — Revert to Original Value (Bug Reproduction)

**Seed:** `tests/seed-admin.spec.ts`

#### 2.1. Reverting the zone back to its original value and saving does not update the displayed value without a reload (bug reproduction)

**File:** `tests/customer-detail-zone-saving-issue/bug-revert-to-original-value-not-reflected.spec.ts`

**Steps:**
  1. Start from the authenticated admin dashboard and navigate to a customer detail page for a known test customer fixture whose zone is currently a known original value (e.g. `A`); record this original value.
    - expect: The zone field displays the recorded original value (`A`).
  2. Change the zone from the original value to a different value (e.g. `A` → `LB`) and click Save.
    - expect: The zone field displays the new value (`LB`).
  3. Change the zone from the intermediate value back to the original value (e.g. `LB` → `A`) and click Save, WITHOUT reloading the page.
    - expect: The save action completes without an error message (no failure is surfaced to the user).
    - expect (documenting the bug): The zone field displayed on the page still shows the intermediate value (`LB`) rather than the original value (`A`) — i.e. the UI does not reflect the reverted value after the second save.
  4. Do not reload yet; re-open the zone edit control (if applicable) without changing anything.
    - expect: The zone edit control still shows/pre-fills the stale intermediate value (`LB`), consistent with the display not having updated.

#### 2.2. Reloading the page after the revert-and-save sequence shows the correct reverted value, and the field can then be set correctly

**File:** `tests/customer-detail-zone-saving-issue/reload-after-revert-shows-correct-value.spec.ts`

**Steps:**
  1. Repeat the bug reproduction sequence from Scenario 2.1: on a customer detail page with a known original zone value, change zone to a different value and save, then change it back to the original value and save.
    - expect: Immediately after the second save (pre-reload), the field still shows the stale intermediate value, matching the bug behavior documented in Scenario 2.1.
  2. Reload the customer detail page.
    - expect: After reload, the zone field displays the correct original value (not the stale intermediate value), confirming the underlying save DID persist the reverted value and the defect is limited to the UI not refreshing without a reload.
  3. Without changing the zone value further, confirm the field can be interacted with normally post-reload (e.g. the edit control opens and shows the original value as its current selection).
    - expect: The zone field's edit control reflects the original value as the current state, and no further action is required to "fix" it beyond the reload already performed.

#### 2.3. [Optional/if API available] Verify the persisted zone value directly (e.g. via API or backend check) immediately after the revert-and-save, before any reload

**File:** `tests/customer-detail-zone-saving-issue/verify-persisted-value-via-api-before-reload.spec.ts`

**Steps:**
  1. On a customer detail page with a known original zone value, change the zone to a different value and save, then change it back to the original value and save (same sequence as Scenario 2.1), WITHOUT reloading the page.
    - expect: The UI still shows the stale intermediate value, per the documented bug.
  2. Without reloading the browser page, query the persisted zone value for this customer through an available API/backend check (e.g. a GET request equivalent to what the reload would trigger).
    - expect: Document the actual persisted value returned: if it already equals the original value, this confirms the defect is UI-only (stale client-side state, save succeeded); if it still equals the stale intermediate value, this indicates the underlying save itself did not persist the revert, which would be a more severe variant of the bug and must be reported as such rather than assumed away.
  3. Reload the page and restore/confirm the original zone value is displayed, leaving the fixture in its original state.
    - expect: The customer's zone value matches the original value recorded at the start of the scenario.

### 3. Zone Save — Multiple Different Values, Never Reverting (Contrast Case, Regression Coverage)

**Seed:** `tests/seed-admin.spec.ts`

#### 3.1. Changing the zone through several different values in sequence (never reverting to the original) saves and displays correctly each time

**File:** `tests/customer-detail-zone-saving-issue/contrast-sequential-different-values-saves-correctly.spec.ts`

**Steps:**
  1. Start from a customer detail page for a known test customer fixture whose zone is currently a known original value (e.g. `A`); record this original value.
    - expect: The zone field displays the recorded original value (`A`).
  2. Change the zone from the original value to a different value (e.g. `A` → `B`) and click Save.
    - expect: The zone field displays `B` immediately after save, with no reload needed.
  3. Change the zone from `B` to a third, different value (e.g. `B` → `C`) and click Save.
    - expect: The zone field displays `C` immediately after save, with no reload needed.
  4. Confirm this sequence — changing between multiple DIFFERENT values without ever reverting to the original — worked correctly at every step, isolating that the defect from Suite 2 is specific to reverting to the ORIGINAL value, not to saving in general.
    - expect: No stale/incorrect value was displayed at any point in steps 2–3.
  5. Restore the customer's original zone value (e.g. `C` → `A`, save, reload if the field does not update immediately per the known bug) so the fixture is left unchanged.
    - expect: After restoring (with reload if necessary), the customer's zone value matches the original value recorded in step 1.

### 4. Zone Save — Data Integrity Guardrail (No Unintended Side Effects)

**Seed:** `tests/seed-admin.spec.ts`

#### 4.1. Repeated zone changes and saves on the bug-reproduction sequence do not modify any other field on the customer record

**File:** `tests/customer-detail-zone-saving-issue/no-side-effects-on-other-fields.spec.ts`

**Steps:**
  1. On a customer detail page for a known test customer fixture, record the current values of all other visible customer fields (e.g. name, address, contact info, status) alongside the original zone value, before making any change.
    - expect: All field values are recorded as a baseline snapshot.
  2. Perform the bug-reproduction sequence from Scenario 2.1 (change zone to a different value and save, then change back to the original value and save), then reload the page per Scenario 2.2 to confirm the zone is restored to its original value.
    - expect: The zone field matches the original value recorded in step 1 after reload.
  3. Re-record the values of all other customer fields captured in step 1.
    - expect: Every other field's value is unchanged from the baseline snapshot recorded in step 1 — confirming the zone save/revert flow does not have unintended side effects on unrelated customer data, and no destructive action (e.g. customer deletion, order cancellation) occurred at any point.
