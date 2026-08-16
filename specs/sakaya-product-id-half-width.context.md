# Requirements Brief — Limit Sakaya Product ID to half-width alphanumeric

## Source
- **Asana task:** [Limit Sakaya Product ID to half-width alphanumeric](https://app.asana.com/1/1203662390648394/project/1203662468153988/task/1215714926506999) (gid `1215714926506999`)
  — Priority **Critical**, Project size Small, due **2026-07-29**, projects **URRY Admin** + URRY Roadmap, **Where: Admin** (shop not affected), SOURCE **SAKAYA**, reported via **Enzan (Yamaka Kato)**.
- **Ticket status (as of 2026-07-25):** section **Passed on Staging**. Dev QC pass 2026-07-23, staging QC pass 2026-07-24 (both by thi.tham.pham.bp@ccbji.co.jp). Development complete; this is regression-test authoring against already-shipped behaviour, not first-pass verification.
- **Confluence:** none referenced.
- **Design (Figma):** **none** — no `figma.com` link appears in the ticket notes or any comment. Phase 6 design-token checks are therefore **not applicable** to this ticket.

## Goal
A Sakaya user self-registering a product in the Admin Portal was able to enter a **full-width** character in the product code (商品コード / "Sakaya ProductId"). Yamaka Kato registered `２701030` (leading full-width `２`), which broke order integration with Enzan over a weekend. The fix constrains 商品コード to **half-width alphanumerics plus a limited symbol set**, rejecting anything else with an inline validation error, and applies the same rule to the **bulk/CSV import** path so integrated data cannot introduce bad codes either.

## Confirmed implemented behaviour (read from QC evidence screenshots attached to the ticket, dev + staging)
Two enforcement points, both verified by QC:

**1. Manual self-registration form** — Admin Portal `/products` → button **新商品を追加する** → modal **「新しく商品を登録する」**.
- Field **商品コード \*** (product code). Entering full-width digits (`２７０１０３０`) leaves the value as typed, turns the field border **red**, and renders an inline error directly beneath it:
  > **半角英数字と一部の記号（_ - . #）のみで登録してください。**
- Other fields visible in the modal: 商品名\*, JANコード, 商品コード\*, アルコール度数\*, 注文単位\*, 容量\*, 容量の単位\*, 容器タイプ\*, ワイン生産年, メーカー\*, ブランド名\*. A **戻る** (back) button sits at the top of the modal.

**2. Bulk CSV import** — the import/update-history page (**更新履歴** / **取り込み履歴**, reachable from the products area; the row's データ元 reads 手入力 and ステータス reads `Error`). Clicking the failed row surfaces an **エラーログ** modal listing per-row failures:
  > **1行目 商品コード は半角英数字と一部の記号（_ - . #）のみで登録してください**
- Modal has a single **閉じる** (close) button. The 更新履歴 table columns include メールアドレス, ファイル名, timestamp, a download icon, データ元, ステータス.

**Allowed character set (confirmed):** half-width letters, half-width digits, and the four symbols **`_`  `-`  `.`  `#`** — exactly matching Tanko Sumino's 2026-06-24 clarification. Internal test codes like `265_bn` must remain valid.

**⚠️ Note on asserting the message text:** the parenthesised symbol list renders with inconsistent internal spacing across the dev and staging screenshots (`（_ - . #）` vs `（_ - .#）`). Tests must match on a **stable substring / regex** (e.g. `半角英数字と一部の記号` … `のみで登録してください`) rather than the exact full string, or they will be brittle for cosmetic reasons.

## Acceptance criteria (condensed from ticket)
1. 商品コード accepts half-width alphanumerics and `_ - . #`.
2. Any full-width character (digit, letter, or symbol) in 商品コード is **rejected with a visible error**; the product must not be registerable.
3. The warning text is the JP string above (ticket's EN draft: "Please register with only half-width alphanumeric and certain special characters."; the ticket's JP draft `半角英数字と一部の` was **truncated** — the shipped string is the full sentence).
4. The same restriction applies to bulk/integrated (CSV) product data, surfaced per-row in the エラーログ.

## ⚠️ Open question — requested normalisation appears NOT implemented
The ticket's first line asks for **two** behaviours: *"we should **normalize** all full-width numbers in half-width. **And** we should display an error if the number is not put in half-width."*

The QC evidence shows only the **error** half. In both screenshots the field still contains the full-width value `２７０１０３０` alongside the error — it was **not** auto-converted to `2701030`. Either normalisation was dropped in favour of hard validation (a reasonable call — silent rewriting of an identifier is arguably worse), or it was overlooked. **This is worth confirming with the team**; the test plan should include a scenario that *documents actual behaviour* on this point rather than asserting either way.

## Systems & seed
| Layer | App | URL | Seed |
|---|---|---|---|
| Product registration + CSV import validation | **Admin Portal** | `https://dev-portal.urry.com` | `tests/seed-admin.spec.ts` (login `demo@urry.com`) |

**Note on the pipeline defaults:** the invocation defaulted `appUrl` to the `playwright.config.ts` baseURL (`https://dev.urry.com/`, the *shop*) and `seed` to `tests/seed.spec.ts`. Both are **wrong for this ticket** — it is flagged Where: **Admin** and every enforcement point lives in the Admin Portal. Overridden to the admin portal + `tests/seed-admin.spec.ts` accordingly.

## In-scope flows
- Open `/products` → 新商品を追加する → the 新しく商品を登録する modal; locate 商品コード.
- **Negative (primary):** enter full-width digits (`２７０１０３０`) → assert red border + inline `半角英数字と一部の記号…のみで登録してください` error.
- **Negative variants:** full-width letters (`ＡＢＣ`), full-width symbols (`＿`, `－`, `＃`), full-width space, and Japanese characters (かな/漢字) → same error.
- **Positive (validation-only, no submit):** half-width alphanumerics (`2701030`), and each allowed symbol (`265_bn`, `A-1`, `x.y`, `C#1`) → assert **no** error appears and the field is accepted.
- **Disallowed half-width symbols:** e.g. `/`, `@`, `*`, space → document whether they are rejected (ticket says "certain special characters" only).
- Whether the field **normalises** full-width → half-width on blur/paste (document actual behaviour; see open question above).
- Whether the submit/register action is **blocked** while the error is present.
- CSV import path: upload a CSV whose 商品コード is full-width → 更新履歴 row with ステータス `Error` → エラーログ modal shows `1行目 商品コード は半角英数字…`.

## Out-of-scope / destructive actions to AVOID
- **Do NOT actually register a product.** Every positive-path check must stop at *field validation* — fill the field, assert no error, then **cancel/close via 戻る**. Completing registration would create real product master data in the shared dev environment that cannot be cleanly removed.
- **Do NOT edit or delete any existing product**, price, brand, maker, or 取引先別商品設定 record.
- **CSV upload caveat — flag before running:** submitting a CSV writes a **permanent row into the 更新履歴 / 取り込み履歴 audit table** (email, filename, timestamp, status) that cannot be deleted, even when the import fails validation. It also risks creating products if any row is valid. Treat the CSV suite as **opt-in only**, and if run, use a CSV where **every** row is intentionally invalid so nothing can be created.
- Do NOT modify global/system settings, tags, segments, or 取引先 master data.
- Do NOT send any notification (通知・メッセージ) and do NOT place any shop order (never 注文を確定).
- Prefer read-only / validation-only assertions throughout; this feature is fully testable without persisting anything.

## Targets
- Admin app URL: `https://dev-portal.urry.com` · seed `tests/seed-admin.spec.ts`
- Plan destination: `specs/sakaya-product-id-half-width.md` · specs under `tests/sakaya-product-id-half-width/`

## Design reference (Phase 6)
**No Figma link exists on this ticket** — design-token checks are not applicable and Phase 6 will be skipped. (The existing `tokens/figma.config.mjs` targets a different ticket's node, `43732-73864` in file `iH3UR40B1zvwdDpbNwtd4G`; it must not be repurposed here.)
