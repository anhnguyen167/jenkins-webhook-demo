# Customer Detail Page — Zone Not Saved When Reverted to Original Value Test Plan

## Application Overview

URRY Admin Portal (https://dev-portal.urry.com) is the internal management app for the URRY B2B liquor/restaurant ordering platform. This plan covers a bug on the customer detail page's "zone" field (Asana gid 1215265081292154, "Saving issue on customer detail page", Project URRY Admin, Priority Medium, Project size Small, Where: Admin; status "Passed on Dev, waiting to be built on staging"). The zone field can be edited and saved from the customer detail page. When the zone is changed to a different value and saved, then changed BACK to its ORIGINAL value and saved again, the UI does not update to reflect the reverted value — it keeps showing the intermediate value instead, and a full page reload is required before the field can correctly be set back to the original value. A contrast case — changing zone across several different values (never reverting to the original) — already works correctly and is used to isolate that the defect is specific to reverting to the original value, not to saving in general.

All tests must reuse `tests/seed-admin.spec.ts` (Base URL: https://dev-portal.urry.com, already logged in as demo@urry.com when the test begins).

IMPORTANT SAFETY NOTE (destructive-action guardrails — restated from the requirement, MUST be followed by every scenario in this plan):
- This is a real admin portal against a shared dev/staging environment — do NOT use a real/shared production customer record if avoidable; prefer a dedicated test customer fixture if one is known. If no dedicated fixture is known, clearly document (in the test itself) which customer record was used and its ORIGINAL zone value, and restore the zone to that original value at the end of the test regardless of pass/fail.
- Do NOT delete or otherwise modify any other field on the customer record besides zone.
- Do NOT perform any destructive action (e.g. deleting the customer, cancelling orders) while testing this flow.
- The bug is specifically about the UI not reflecting the reverted value without a reload — whether the underlying persisted value is actually correct after the buggy save must be confirmed during test execution by checking the persisted value via a reload or API call, rather than assumed from the displayed (possibly stale) UI state alone.

## Test Scenarios

### 1. Baseline Saving Behavior (Contrast / Regression Coverage)

**Seed:** `tests/seed-admin.spec.ts`

#### 1.1. Changing zone to a new value and saving updates the displayed value correctly

**File:** `tests/customer-detail-zone-saving-issue/baseline-single-zone-change-saves-correctly.spec.ts`

**Steps:**
  1. Navigate to a customer detail page for a known test customer fixture, and record the customer's current zone value as the ORIGINAL value (e.g. `A`).
    - expect: The customer detail page loads and the zone field currently displays the recorded ORIGINAL value.
  2. Change the zone field from the ORIGINAL value to a different value (e.g. `A` → `LB`) and click Save.
    - expect: The save action completes without error (e.g. a success toast/indicator is shown, or no error is shown).
    - expect: The zone field displays the new value (`LB`) immediately after saving, without requiring a page reload.
  3. Reload the page and re-check the zone field.
    - expect: The zone field still displays `LB` after reload, confirming the change was actually persisted (not just shown optimistically).
  4. Restore the customer's zone back to the recorded ORIGINAL value and save, then reload to confirm the restore persisted.
    - expect: After this cleanup save and reload, the zone field displays the ORIGINAL value again, leaving the fixture customer unchanged for other tests.

#### 1.2. Changing zone through several different values (never reverting to the original) saves correctly at each step

**File:** `tests/customer-detail-zone-saving-issue/baseline-multiple-different-values-save-correctly.spec.ts`

**Steps:**
  1. Navigate to a customer detail page for a known test customer fixture, and record the customer's current zone value as the ORIGINAL value (e.g. `A`).
    - expect: The zone field currently displays the recorded ORIGINAL value.
  2. Change zone from the ORIGINAL value to a different value (e.g. `A` → `B`) and click Save.
    - expect: The zone field displays `B` immediately after saving.
  3. Change zone again to a THIRD, distinct value (e.g. `B` → `C`) and click Save.
    - expect: The zone field displays `C` immediately after saving — this sequence never revisits a previously-shown value, and both saves are expected to work, isolating that the defect (covered in suite 2) is specific to reverting to the ORIGINAL value rather than to saving in general.
  4. Reload the page and re-check the zone field.
    - expect: The zone field still displays `C` after reload, confirming the last change was actually persisted.
  5. Restore the customer's zone back to the recorded ORIGINAL value and save, then reload to confirm the restore persisted.
    - expect: After this cleanup save and reload, the zone field displays the ORIGINAL value again.

### 2. Zone Reverted to Original Value — Bug Reproduction

**Seed:** `tests/seed-admin.spec.ts`

#### 2.1. Changing zone away from and then back to the original value shows the correct reverted value after the second save, without a page reload

**File:** `tests/customer-detail-zone-saving-issue/revert-to-original-value-updates-without-reload.spec.ts`

**Steps:**
  1. Navigate to a customer detail page for a known test customer fixture, and record the customer's current zone value as the ORIGINAL value (e.g. `A`).
    - expect: The zone field currently displays the recorded ORIGINAL value.
  2. Change zone from the ORIGINAL value to a different value (e.g. `A` → `LB`) and click Save.
    - expect: The zone field displays `LB` immediately after saving, without requiring a page reload.
  3. Without reloading the page, change zone back from the intermediate value to the ORIGINAL value (e.g. `LB` → `A`) and click Save.
    - expect: The save action completes without a visible error (document the actual response/indicator observed, since the bug report describes the save as appearing to succeed).
    - expect: The zone field displays the ORIGINAL value (`A`) immediately after this second save, without requiring a page reload — this is the primary acceptance criterion under test and is expected to currently FAIL per the bug report (the field is expected to incorrectly keep showing the intermediate value `LB` instead of `A` until this defect is fixed).
  4. Reload the page and re-check the zone field, to determine whether the underlying persisted value is actually correct even though the pre-reload UI is stale.
    - expect: Record the zone value shown after reload. Per the bug report, after reload the field can be set back to `A` correctly, implying the underlying save may already be correct and the defect is isolated to the UI not refreshing its displayed state after the second save — document the actual observed value rather than assuming it matches either `A` or `LB`.
  5. If the zone is not already at the ORIGINAL value after step 4, set it back to the ORIGINAL value and save, then reload to confirm.
    - expect: After this cleanup, the zone field displays the ORIGINAL value again, leaving the fixture customer unchanged for other tests.

#### 2.2. Reverting to the original value via a full page reload between saves works correctly (documents the reload-based workaround)

**File:** `tests/customer-detail-zone-saving-issue/revert-to-original-value-with-reload-workaround.spec.ts`

**Steps:**
  1. Navigate to a customer detail page for a known test customer fixture, and record the customer's current zone value as the ORIGINAL value (e.g. `A`).
    - expect: The zone field currently displays the recorded ORIGINAL value.
  2. Change zone from the ORIGINAL value to a different value (e.g. `A` → `LB`) and click Save.
    - expect: The zone field displays `LB` immediately after saving.
  3. Reload the page.
    - expect: The zone field displays `LB` after reload, confirming the intermediate value was actually persisted.
  4. After the reload, change zone back to the ORIGINAL value (e.g. `LB` → `A`) and click Save.
    - expect: The zone field displays the ORIGINAL value (`A`) immediately after saving — per the bug report, performing the revert AFTER a fresh reload is expected to work correctly, unlike the no-reload sequence in scenario 2.1, confirming the defect is specifically about UI state not refreshing across saves within the same page load rather than about the persistence layer itself.
  5. Reload the page again to confirm persistence.
    - expect: The zone field still displays the ORIGINAL value after this final reload.

#### 2.3. Repeating the revert-to-original sequence a second time reproduces the same UI staleness

**File:** `tests/customer-detail-zone-saving-issue/revert-to-original-value-repeated-sequence.spec.ts`

**Steps:**
  1. Navigate to a customer detail page for a known test customer fixture, and record the customer's current zone value as the ORIGINAL value (e.g. `A`).
    - expect: The zone field currently displays the recorded ORIGINAL value.
  2. Perform two full cycles, without reloading the page at any point during the cycles: (a) change zone to a different value and Save, (b) change zone back to the ORIGINAL value and Save — recording the displayed zone value after each of the four saves.
    - expect: After each of the two "change to a different value" saves (cycle 1 step a, cycle 2 step a), the displayed zone value updates correctly to the new intermediate value.
    - expect: After each of the two "change back to ORIGINAL" saves (cycle 1 step b, cycle 2 step b), the displayed zone value is expected to incorrectly remain at the prior intermediate value instead of showing the ORIGINAL value, per the bug report — document the actual value shown for each of the two occurrences to confirm the defect reproduces consistently on repeated revert attempts, not just once.
  3. Reload the page and set the zone back to the recorded ORIGINAL value if it is not already correct, then save and reload to confirm.
    - expect: After cleanup, the zone field displays the ORIGINAL value again, leaving the fixture customer unchanged for other tests.
