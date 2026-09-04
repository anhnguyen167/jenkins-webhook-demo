# Customer Detail Page — Zone Not Saved When Reverted to Original Value

## Source

- Asana task: [Saving issue on customer detail page](https://app.asana.com/1/1203662390648394/project/1203662468153988/task/1215265081292154) (gid 1215265081292154)
- Project: URRY Admin
- Priority: Medium — Project size: Small — Where: Admin
- Status: Passed on Dev, waiting to be built on staging (per latest comment: "test pass on dev, please build staging")
- Update 2026-09-04: re-triggering the requirement-to-testcase pipeline (Flow1 → Flow2 → Flow3) end-to-end after fixing the Teams notification webhook; no change to the actual bug/requirement below.

## Application

URRY Admin Portal, customer detail page (zone field). Reuse `tests/seed-admin.spec.ts` for authenticated admin login (Base URL: https://dev-portal.urry.com, already logged in as demo@urry.com when the test begins).

## Bug Description

On the customer detail page, a customer's "zone" field can be edited and saved. When the zone is changed to a different value and saved, then changed BACK to its original value and saved again, the UI does not reflect the reverted value — it keeps showing the intermediate value instead. A full page reload is required before the field can be correctly set back to the original value.

## Reproduction Steps (bug case)

1. Open a customer detail page whose zone is currently `A`.
2. Change zone from `A` to `LB`, click Save.
   - Expected: zone shown is `LB`.
3. Change zone from `LB` back to `A`, click Save.
   - **Actual (bug):** zone shown remains `LB` (the save appears to succeed but the displayed value does not update to `A`).
   - **Expected:** zone shown should be `A`.
4. Reload the page.
   - After reload, the field can be set back to `A` correctly (implying the underlying save may have actually worked or can be made to work after reload — the bug is in the UI not reflecting the reverted value without a reload, not necessarily in the persistence itself; this needs to be confirmed during test execution by checking the persisted value via reload/API rather than assumed).

## Contrast Case (works correctly, for regression coverage)

1. Zone is `A`.
2. Change zone `A` → `B`, click Save. Zone shown is `B`.
3. Change zone `B` → `C`, click Save. Zone shown is `C`.
   - This sequence (changing between three DIFFERENT values, never reverting to the original) works correctly — used as a contrast/regression scenario to isolate that the bug is specifically about reverting to the ORIGINAL value, not about saving in general.

## Acceptance Criteria

- Changing a customer's zone to a new value and saving updates the displayed value correctly (already works).
- Changing the zone through several different values and saving each time updates the displayed value correctly each time (already works — contrast case).
- Changing the zone away from its original value and then BACK to the original value, saving each time, must show the correct (original) value after the second save, without requiring a page reload.

## Out of Scope / Guardrails

- This is a real admin portal against a shared dev/staging environment — do not use a real/shared production customer record if avoidable; prefer a dedicated test customer fixture if one is known, otherwise clearly document which customer record was used so the zone value can be restored afterward.
- Do not delete or otherwise modify any other field on the customer record.
- Do not perform any destructive action (e.g. deleting the customer, canceling orders) while testing this flow.
