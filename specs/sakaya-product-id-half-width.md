# Sakaya Product ID — Half-Width Alphanumeric Restriction Test Plan

## Application Overview

URRY Admin Portal (https://dev-portal.urry.com) is the internal management app for the URRY B2B liquor/restaurant ordering platform. This plan covers regression testing for a SHIPPED fix (Asana gid 1215714926506999, Priority Critical, due 2026-07-29, Where: Admin only, source SAKAYA, reported via Enzan/Yamaka Kato; ticket section "Passed on Staging" — dev QC pass 2026-07-23, staging QC pass 2026-07-24; development is COMPLETE). A Sakaya user self-registering a product in the Admin Portal was previously able to enter a full-width character in the product code (商品コード, "Sakaya ProductId"), e.g. a leading full-width ２ in ２701030, which broke order integration with Enzan over a weekend. The fix constrains 商品コード to half-width alphanumerics plus exactly four symbols (_ - . #), rejecting anything else with an inline validation error, at two enforcement points: (1) the manual self-registration form reached from /products → 新商品登録 tab → 新商品を追加する → the "新しく商品を登録する" modal, and (2) the bulk/CSV product import path, surfaced per-row in an エラーログ modal reached from the 取り込み履歴 update-history table. This plan exists to regression-test the already-shipped behaviour and to document (not assert a direction for) an open question: the ticket asked for BOTH auto-normalization of full-width numbers to half-width AND an error, but QC evidence and live exploration show only the error half is implemented — the field retains the full-width value as typed.

All tests must reuse `tests/seed-admin.spec.ts` (Base URL: https://dev-portal.urry.com, already logged in as demo@urry.com on /dashboard when the test begins).

IMPORTANT SAFETY NOTE (destructive-action guardrails — restated from the task brief, MUST be followed by every scenario in this plan):
- Do NOT actually register a product. Every positive-path scenario must stop at FIELD VALIDATION — fill the 商品コード field, assert no error, then exit via the modal's 閉じる (or 戻る) control. Completing registration would create real product master data in the shared dev environment that cannot be cleanly removed. Never click "商品の登録を申請する" on the modal with an otherwise-valid, submittable payload.
- Do NOT edit or delete any existing product, price, brand, maker, or 取引先別商品設定 record. Existing products (e.g. rows visible in 販売中 / 新商品登録 tabs such as "Cocacola" 2701030, "test half", "test full", the pre-existing "E2E import halfwidth evidence ..." draft rows with full-width codes ２835458152 / ２835287771) must be treated as read-only fixtures — view only, never edit or delete them.
- CSV upload caveat: submitting a CSV writes a PERMANENT row into the 更新履歴 / 取り込み履歴 audit table (メールアドレス, ファイル名, timestamp, ステータス) that cannot be deleted, even when the import fails validation — and it risks creating products if any row happens to be valid. Therefore: the CSV-upload scenario is placed in its OWN clearly-labelled suite, marked OPT-IN / requires explicit approval before running, and any test CSV used must have EVERY row intentionally invalid (full-width 商品コード) so nothing can be created. During exploration for this plan, no CSV was actually uploaded — the 更新履歴 page and an existing failed row's エラーログ modal were inspected read-only instead, and the upload dialog was opened and then closed via 閉じる without selecting a file.
- Do NOT modify global/system settings, tags, segments, or 取引先 master data.
- Do NOT send any notification (通知・メッセージ) and do NOT place any shop order (never 注文を確定).
- Prefer read-only navigation and validation-only interactions throughout. This feature is fully testable without persisting anything (apart from the CSV path, which is why it is opt-in).
- ASSERTION ROBUSTNESS: the parenthesised symbol list in the error message renders with inconsistent internal spacing across environments/screenshots (`（_ - . #）` vs `（_ - .#）`). Every scenario that asserts the message text MUST match on a stable substring or regex — e.g. text containing `半角英数字と一部の記号` and separately containing `のみで登録してください` — NOT the full exact string including the symbol list, or the test will be brittle for purely cosmetic spacing reasons.

Key UI facts discovered during exploration:
- /products heading is "商品ページ" with a top-level tablist of 4 tabs: 販売中, 終売品, 新商品登録, 取り込み履歴. The manual registration entry point and the CSV import history both live under this one page via tabs, not separate URLs.
- 新商品登録 tab: a "新商品を追加する" button opens a multi-step wizard (NOT a single-click-to-modal flow as a naive reading of the ticket might suggest) — actual steps observed, in order: (1) dialog "どのように商品を追加されますか？" — radiogroup with "手動で商品を追加する" (checked by default) vs "商品データをアップロードする", footer buttons 閉じる / 次の画面へ; (2) with manual selected, dialog "商品を追加する" asking for 商品名* (placeholder "例：コカ・コーラ ゼロ") and JANコード (placeholder "例：12343435"), footer 閉じる / マッチする商品を探す; (3) dialog "戻る 追加された商品" — shows the entered name/JAN plus a large table of possibly-matching existing products with checkboxes and note "もしマッチが見つからなければ何も選択せず次の画面へお進みください", footer 閉じる / 次の画面へ; (4) if 次の画面へ is clicked with no match selected, a confirmation dialog "追加されたい商品と合致するマッチ商品は見つかりませんでしたか？" appears with buttons もう一度確認する / 見つからないため次の画面へ; (5) clicking 見つからないため次の画面へ finally opens the target dialog, heading combines a "戻る" button (top-left, steps BACK one wizard screen — it is NOT a full close) and the paragraph "新しく商品を登録する".
- The "新しく商品を登録する" dialog's full field list, in order: 商品名* (prefilled from step 2), JANコード, **商品コード*** (placeholder "例： 09348" — THIS is the field under test), アルコール度数* + 注文単位* (helper text "例： ケース-24 / バラ: 1"), 容量* + 容量の単位*, 容器タイプ* (dropdown) + ワイン生産年 (optional), メーカー*, ブランド名* (combobox), カテゴリー* (dropdown), サブカテゴリー* (dropdown), 割引価格*, checkbox "このSKUを全体非表示にする", checkbox "容器保証金_文言表示", an image upload dropzone "商品画像を登録する". Footer: 閉じる (fully closes/cancels the whole wizard back to the 新商品登録 tab, confirmed safe) and 商品の登録を申請する (submit).
- LOCATOR NOTE for 商品コード: the input's accessible name/placeholder is "例： 09348", NOT "商品コード" — the visible label "商品コード *" is a plain `<p>` sibling, not wired via `<label for>`. The most robust locator inside this dialog is `getByPlaceholder('例： 09348')` (unique within the modal) or a locator anchored on the "商品コード" label text and its following sibling input.
- CONFIRMED validation behaviour (live-tested, matches shipped/QC'd behaviour): typing/filling a full-width value (e.g. ２７０１０３０) sets `aria-invalid="true"` on the input, adds MUI class `Mui-error` to the input's OutlinedInput root, turns its `fieldset` border red (`rgb(211, 47, 47)` / #d32f2f) once the field is not focused, and renders an inline `<p>` error immediately below the field reading exactly `半角英数字と一部の記号（_ - . #）のみで登録してください。` (assert via stable substring/regex per the note above, not full-string).
- CONFIRMED validation fires LIVE ON EVERY KEYSTROKE/VALUE-CHANGE, not only on blur or submit: typing a valid half-width value then appending one full-width character flips `aria-invalid` to `true` immediately while the field still has focus (verified: typing "2701030" → valid, then appending "２" → invalid, all before blur).
- CONFIRMED value is NOT normalized: after typing "2701030" + "２", `input.value` remained the literal string `"2701030２"` — the full-width character is left in place, not stripped or converted to half-width. This directly answers the ticket's open question: only the ERROR half of "normalize AND error" is implemented; no normalization occurs on keystroke, blur, or attempted submit.
- CONFIRMED accepted values (aria-invalid="false", no visible error): half-width digits alone (e.g. `2701030`), and half-width alphanumerics combined with each of the four allowed symbols individually: `265_bn`, `A-1`, `x.y`, `C#1`.
- CONFIRMED rejected values (aria-invalid="true"): full-width digits, full-width letters (`ＡＢＣ`), full-width symbols (`＿`, `－`, `＃`), Japanese kana (`ｶﾀｶﾅ` half-width katakana was ALSO rejected) and kanji/hiragana (`あいう`), and — importantly — half-width characters NOT in the allowed symbol set: `/`, `@`, `*`, and a trailing half-width space, e.g. `2701030/`, `2701030@`, `2701030*`, `"2701030 "` were all rejected with the same error. Only `_ - . #` are allowed as symbols; other half-width punctuation is NOT permitted despite being half-width.
- CONFIRMED the submit button "商品の登録を申請する" remains ENABLED (not disabled, no `aria-disabled`) even while 商品コード shows an error — but clicking it with the full-width value present and other required fields empty kept the dialog open, kept the inline error visible, and did not navigate away or create anything (submission is blocked at the point of attempted registration, not by disabling the button).
- 取り込み履歴 tab: heading "更新履歴" with 開始日/完了日 date-range filter pickers, and a table with columns メールアドレス, ファイル名, 日付, 更新データ (a per-row original-file Download icon), データ元 (observed value "手入力" for all rows seen, matching the brief), ステータス (`Success` / `Error`), and エラー — this last column is EMPTY for Success rows and contains two icons for Error rows: a "Notification Icon" (opens the エラーログ overlay) and a "Download Icon" (downloads an error file).
- CONFIRMED clicking the Notification Icon on an Error row opens an エラーログ overlay (heading text "エラーログ", NOT necessarily a standard `role="dialog"` — it renders as an active overlay `<generic>` with an icon, the heading paragraph, a `<ul>`/`<li>` list of one-or-more error lines, and a single 閉じる button) whose list item text, verified live on two separate pre-existing Error rows, reads exactly: `1行目 商品コード は半角英数字と一部の記号（_ - . #）のみで登録してください` (again: assert via stable substring/regex, not full-string, per the spacing-inconsistency note).
- The "商品データをアップロードする" radio in step (1) of the add-product wizard, followed by 次の画面へ, opens a CSV-upload dialog "商品リストをアップロードする" with a "テンプレートをダウンロード" link, a drag-and-drop dropzone "ファイルをアップロードしてください" / "ファイルをここにドラッグ＆ドロップ または パソコンから参照", note text "2MB 以下の CSV ファイルを使用してください(文字コードは必ずUTF-8にしてください)", and footer buttons 閉じる / アップロードを開始. This is the entry point that would create a new 取り込み履歴 audit row — verified openable and closable via 閉じる without selecting any file; NOT used to actually upload in this exploration.
- 商品情報更新 (`/products/catalog-prices`) is a CSV-only bulk price-update page (template download, drag-drop upload, "アップロードを開始") — it has NO individual field-level form and does NOT expose a 商品コード input at all.
- An individual existing product's edit page (`/products/prices/<id>`, tab "商品詳細") does NOT expose an editable 商品コード field either — its field list (SKU/product-name, 仕様, 酒屋名, 販売形態, 容量, 容器タイプ, 注文単位, 通常価格, 割引価格, discount dates, 在庫状況, 在庫数, 返品可能, 容器保証金, 欠品, 注文不可, 最大注文数) contains no 商品コード control. This confirms the manual-registration modal and the CSV/エラーログ path are the ONLY two enforcement points for this feature — there is no third "edit an existing product's code" surface to additionally cover.

## Test Scenarios

### 1. Manual Registration Wizard — Reaching the 商品コード Field

**Seed:** `tests/seed-admin.spec.ts`

#### 1.1. Navigate the full add-product wizard to the 新しく商品を登録する modal and locate 商品コード

**File:** `tests/sakaya-product-id-half-width/wizard-navigation-to-product-code-field.spec.ts`

**Steps:**
  1. Start from the authenticated admin dashboard (/dashboard) via seed, then navigate to /products (left menu 商品ページ).
    - expect: Page heading '商品ページ' is visible with tabs 販売中, 終売品, 新商品登録, 取り込み履歴.
  2. Click the '新商品登録' tab, then click the '新商品を追加する' button.
    - expect: A dialog 'どのように商品を追加されますか？' opens with a radiogroup defaulted to '手動で商品を追加する' and buttons 閉じる / 次の画面へ.
  3. Leave '手動で商品を追加する' selected and click '次の画面へ'.
    - expect: A dialog '商品を追加する' opens with a 商品名* textbox (placeholder '例：コカ・コーラ ゼロ') and a JANコード textbox (placeholder '例：12343435'), and buttons 閉じる / マッチする商品を探す.
  4. Fill 商品名 with a unique non-persisted test string (e.g. 'QA Half Width Test <timestamp>') and click 'マッチする商品を探す'.
    - expect: A dialog '追加された商品' opens showing the entered name in a small table, a note 'この中でマッチする商品はございますか？' plus 'もしマッチが見つからなければ何も選択せず次の画面へお進みください', a large table of candidate existing products with selection checkboxes, and buttons 閉じる / 次の画面へ.
  5. Without checking any matching-product checkbox, click '次の画面へ'.
    - expect: A confirmation dialog appears: '追加されたい商品と合致するマッチ商品は見つかりませんでしたか？' with buttons もう一度確認する / 見つからないため次の画面へ.
  6. Click '見つからないため次の画面へ'.
    - expect: The target dialog opens: heading area contains a 'back' (戻る) button plus the paragraph '新しく商品を登録する'.
    - expect: The field list is visible in order: 商品名*, JANコード, 商品コード* (placeholder '例： 09348'), アルコール度数*, 注文単位*, 容量*, 容量の単位*, 容器タイプ*, ワイン生産年, メーカー*, ブランド名*, カテゴリー*, サブカテゴリー*, 割引価格*, plus two checkboxes and an image upload dropzone.
    - expect: Footer shows 閉じる and 商品の登録を申請する buttons.
  7. Locate the 商品コード input via getByPlaceholder('例： 09348') scoped to this dialog (note: its accessible name is the placeholder text, not the visible '商品コード' label, since the label is a plain <p> not wired via <label for>) and confirm it is present, empty, and enabled.
    - expect: The 商品コード input is visible, editable, and currently has no error state (aria-invalid is not 'true' and no inline error paragraph is rendered).
  8. Without typing anything, click the footer '閉じる' button to fully close the whole wizard.
    - expect: All wizard dialogs close and the view returns to the 新商品登録 tab's product list with no new row added (row count / '837件中' style summary unchanged from before the test, modulo unrelated concurrent data).

#### 1.2. The dialog's top 戻る button steps back one wizard screen rather than closing the whole flow

**File:** `tests/sakaya-product-id-half-width/wizard-back-button-steps-back-not-close.spec.ts`

**Steps:**
  1. Repeat the navigation from scenario 1.1 up to reaching the '新しく商品を登録する' dialog.
    - expect: The dialog is open with the 商品コード field visible.
  2. Click the 'back' (戻る) button located in the dialog's own heading area (top-left), NOT the footer '閉じる' button.
    - expect: The wizard steps BACK to the previous screen (the '追加された商品' matching-candidates screen showing the earlier-entered 商品名), rather than closing entirely — document this distinction: 戻る = step back within the wizard, 閉じる = fully cancel/close the wizard.
  3. From this matching-candidates screen, click the dialog's footer '閉じる' button to fully close.
    - expect: All wizard dialogs close and no product was created or modified.

### 2. 商品コード — Negative Validation (Full-Width and Disallowed Input Rejected)

**Seed:** `tests/seed-admin.spec.ts`

#### 2.1. Full-width digits (primary bug reproduction) trigger a red border and inline error, value is not registerable

**File:** `tests/sakaya-product-id-half-width/negative-full-width-digits.spec.ts`

**Steps:**
  1. Navigate the add-product wizard (per suite 1) to the '新しく商品を登録する' dialog and locate the 商品コード input.
    - expect: Field is present with no error.
  2. Fill the 商品コード field with the full-width digit string '２７０１０３０' (the exact reproduction of the original Yamaka Kato incident, full-width equivalent of '2701030').
    - expect: The field's value visibly contains the full-width characters as typed (not converted).
    - expect: The input has aria-invalid='true'.
    - expect: The input's MUI OutlinedInput root gains the 'Mui-error' class and, once the field loses focus, its fieldset border color renders as red (rgb(211, 47, 47) / #d32f2f).
  3. Assert the inline error text rendered directly beneath the field.
    - expect: The error paragraph's text matches a STABLE SUBSTRING/REGEX check containing both '半角英数字と一部の記号' and 'のみで登録してください' — do NOT assert the full exact string including the parenthesised symbol list, since its internal spacing is known to vary cosmetically between environments.
  4. Close the dialog via the footer '閉じる' button without submitting.
    - expect: No product was created; the 新商品登録 tab's product list is unchanged.

#### 2.2. Full-width letters, full-width symbols, and full-width space all trigger the same rejection

**File:** `tests/sakaya-product-id-half-width/negative-full-width-letters-symbols-space.spec.ts`

**Steps:**
  1. Navigate to the '新しく商品を登録する' dialog and locate 商品コード.
    - expect: Field is present with no error.
  2. One at a time, fill the field with each of: full-width letters 'ＡＢＣ', full-width underscore '＿', full-width hyphen '－', full-width hash '＃', and a value containing a full-width (ideographic) space, re-checking state after each fill.
    - expect: For EVERY one of these values, aria-invalid becomes 'true' and the same inline error (matched via the stable substring/regex from scenario 2.1) is shown — confirming the restriction covers the full range of full-width character classes (digits, letters, and the specific symbols that DO have half-width allowed equivalents), not only digits.
  3. Close the dialog via '閉じる' without submitting.
    - expect: No product was created.

#### 2.3. Japanese kana and kanji/hiragana input is also rejected

**File:** `tests/sakaya-product-id-half-width/negative-kana-kanji.spec.ts`

**Steps:**
  1. Navigate to the '新しく商品を登録する' dialog and locate 商品コード.
    - expect: Field is present with no error.
  2. Fill the field with kanji/hiragana text 'あいう', then separately with half-width katakana 'ｶﾀｶﾅ'.
    - expect: Both values trigger aria-invalid='true' and the same inline error message (stable substring/regex match) — confirming Japanese script of any width, including half-width katakana (which is technically half-width but not alphanumeric-or-allowed-symbol), is rejected.
  3. Close the dialog via '閉じる' without submitting.
    - expect: No product was created.

#### 2.4. Validation fires live on every keystroke, not only on blur or submit

**File:** `tests/sakaya-product-id-half-width/negative-validation-fires-on-keystroke.spec.ts`

**Steps:**
  1. Navigate to the '新しく商品を登録する' dialog, click into 商品コード, and type 'x2701030' character-by-character (keyboard.type with a small delay), keeping focus in the field.
    - expect: After typing completes, while the field still has focus (not blurred), aria-invalid is 'false' (this is a valid half-width string) and no error is shown.
  2. Without blurring the field, continue typing one full-width character, e.g. '２', appended to the existing value.
    - expect: Immediately, still before any blur or submit attempt, aria-invalid flips to 'true' and the inline error appears — proving validation is reactive to every value change/keystroke, not deferred to blur or submit.
  3. Close the dialog via '閉じる' without submitting.
    - expect: No product was created.

#### 2.5. Submit is blocked while 商品コード holds an invalid value — no product is registered

**File:** `tests/sakaya-product-id-half-width/negative-submit-blocked-while-invalid.spec.ts`

**Steps:**
  1. Navigate to the '新しく商品を登録する' dialog and fill ONLY the 商品コード field with the full-width string '２７０１０３０', leaving all other required fields empty.
    - expect: The field shows aria-invalid='true' and the inline error.
  2. Record the current page URL, then click the footer '商品の登録を申請する' (submit) button.
    - expect: Record whether the button was enabled/clickable (document actual state: at time of exploration it was NOT disabled/aria-disabled, i.e. clickable despite the error) and click it.
  3. Immediately after clicking, check the page URL and dialog state.
    - expect: The URL is unchanged (no navigation occurred).
    - expect: The '新しく商品を登録する' dialog remains open (submission did not succeed).
    - expect: The 商品コード inline error is still visible.
    - expect: This confirms the product is NOT registerable while the value is invalid, satisfying acceptance criterion 2, even though the submit button itself is not disabled.
  4. Close the dialog via '閉じる'.
    - expect: No product was created; the 新商品登録 tab's product list is unchanged from before this test.

### 3. 商品コード — Positive Validation (Half-Width Accepted, Field-Level Only, No Submit)

**Seed:** `tests/seed-admin.spec.ts`

#### 3.1. Half-width alphanumerics and each of the four allowed symbols are accepted with no error

**File:** `tests/sakaya-product-id-half-width/positive-half-width-and-allowed-symbols.spec.ts`

**Steps:**
  1. Navigate to the '新しく商品を登録する' dialog and locate 商品コード.
    - expect: Field is present with no error.
  2. One at a time, fill the field with each of the following and re-check state after each: '2701030' (pure half-width digits, the corrected form of the original bug value), '265_bn' (internal test code using underscore — MUST remain valid per the brief), 'A-1' (hyphen), 'x.y' (period), 'C#1' (hash).
    - expect: For EVERY one of these five values, aria-invalid is 'false' (or absent), NO inline error paragraph is rendered, and the field's fieldset does NOT show the red error border — confirming acceptance criterion 1 (half-width alphanumerics plus the exact symbol set _ - . # are accepted).
  3. IMPORTANT: do NOT click '商品の登録を申請する' at any point in this scenario, even though the value is valid — this would risk creating a real product. Instead, after the last check, close the dialog via the footer '閉じる' button.
    - expect: The dialog closes without any product being created; the 新商品登録 tab's product list is unchanged.

#### 3.2. Half-width symbols outside the allowed set are rejected (document actual scope of the restriction)

**File:** `tests/sakaya-product-id-half-width/positive-disallowed-half-width-symbols.spec.ts`

**Steps:**
  1. Navigate to the '新しく商品を登録する' dialog and locate 商品コード.
    - expect: Field is present with no error.
  2. One at a time, fill the field with each of: '2701030/' (slash), '2701030@' (at-sign), '2701030*' (asterisk), and '2701030 ' (trailing half-width space), re-checking state after each.
    - expect: Document the actual observed behavior for each: at time of exploration ALL FOUR were rejected (aria-invalid='true', inline error shown via the stable substring/regex match) — confirming the allowed symbol set is a strict allow-list of exactly `_ - . #`, and other half-width punctuation/space is NOT implicitly permitted just because it is half-width. If actual behavior differs when this test is run, record the real per-character result rather than assuming rejection.
  3. Close the dialog via '閉じる' without submitting.
    - expect: No product was created.

### 4. 商品コード — Normalization Open Question (Documentation, Not Assertion of a Direction)

**Seed:** `tests/seed-admin.spec.ts`

#### 4.1. Document whether full-width input is auto-normalized to half-width on keystroke, blur, or attempted submit

**File:** `tests/sakaya-product-id-half-width/documentation-no-auto-normalization-observed.spec.ts`

**Steps:**
  1. Navigate to the '新しく商品を登録する' dialog, click into 商品コード, and type the full-width string '２７０１０３０' via keyboard (not a raw value-set) while remaining focused in the field.
    - expect: Record the exact input value immediately after typing completes, while still focused: at time of exploration the value remained the literal full-width string '２７０１０３０', character-for-character identical to what was typed — it was NOT converted to the half-width '2701030'.
  2. Click into a different field (e.g. 商品名) to blur 商品コード, then click back into 商品コード and re-read its value.
    - expect: Record whether blurring the field triggers any normalization. At time of exploration, no normalization occurred on blur — the value remained the full-width string.
  3. With the invalid full-width value still present, click '商品の登録を申請する' (this is safe here specifically because the value is invalid and other required fields are left empty, so no product can be created — do not repeat this click pattern with an otherwise-valid payload) and re-read the field's value immediately afterward.
    - expect: Record whether the attempted-submit path triggers normalization. At time of exploration, the dialog stayed open, the error remained, and the value was still the un-normalized full-width string — the ticket's requested 'normalize AND error' behavior is only half-implemented (error only); this scenario exists to keep this documented and to catch it automatically if a future deploy silently adds normalization (in which case this scenario's assertions should be updated to match the new, intentional behavior rather than treated as a regression).
  4. Close the dialog via '閉じる' without submitting further.
    - expect: No product was created.

### 5. Bulk CSV Import — Error Surfacing in 更新履歴 / エラーログ (Read-Only Inspection)

**Seed:** `tests/seed-admin.spec.ts`

#### 5.1. 更新履歴 table structure and existing Error-status rows are visible (read-only)

**File:** `tests/sakaya-product-id-half-width/csv-readonly-update-history-table.spec.ts`

**Steps:**
  1. Navigate to /products, click the '取り込み履歴' tab.
    - expect: Heading '更新履歴' is visible with 開始日/完了日 date-range filters, and a table with columns メールアドレス, ファイル名, 日付, 更新データ, データ元, ステータス, エラー.
  2. Scan the visible rows.
    - expect: At least one row shows ステータス 'Error' with データ元 '手入力', and its エラー column cell contains a Notification icon and a Download icon (distinct from Success rows, whose エラー cell is empty).
  3. Do not click any destructive action (no delete/re-run/edit control exists on this read-only history table); simply confirm no such controls are present.
    - expect: The table exposes only view/download actions (原本 file download via 更新データ column, error notification/download via エラー column) — no way to mutate historical records from this page.

#### 5.2. Open the エラーログ modal for an existing Error row and assert the message via a stable substring/regex

**File:** `tests/sakaya-product-id-half-width/csv-readonly-error-log-modal.spec.ts`

**Steps:**
  1. Navigate to /products → '取り込み履歴' tab and locate any existing row with ステータス 'Error' (a pre-existing fixture row, do not upload a new file).
    - expect: The row's エラー column shows a clickable Notification icon.
  2. Click the Notification icon in that row's エラー cell.
    - expect: An エラーログ overlay opens containing a heading/label 'エラーログ', a list of one or more error lines, and a single '閉じる' button.
  3. Assert the error line text using a STABLE SUBSTRING/REGEX match.
    - expect: The error line text contains both '1行目 商品コード' and '半角英数字と一部の記号' and 'のみで登録してください' — do NOT assert the full exact string including the parenthesised symbol list `（_ - . #）`, since its internal spacing is known to vary cosmetically (e.g. `（_ - . #）` vs `（_ - .#）`) between dev/staging and must not fail the test for that reason alone.
  4. Close the overlay via its '閉じる' button.
    - expect: The overlay closes and the 更新履歴 table is unchanged — no data was modified by opening/closing this read-only error log.

### 6. Bulk CSV Import — Upload Path [OPT-IN — REQUIRES EXPLICIT APPROVAL BEFORE RUNNING]

**Seed:** `tests/seed-admin.spec.ts`

#### 6.1. [OPT-IN] Uploading a CSV where every row has a full-width 商品コード produces an Error status row whose エラーログ matches the half-width restriction message

**File:** `tests/sakaya-product-id-half-width/opt-in-csv-upload-all-rows-invalid.spec.ts`

**Steps:**
  1. DO NOT RUN THIS TEST BY DEFAULT / IN CI WITHOUT EXPLICIT APPROVAL. It is placed in its own suite specifically because submitting a CSV writes a PERMANENT, non-deletable row into the 更新履歴 audit table (email, filename, timestamp, status) even when every row fails validation. Before running: prepare a test CSV file using the exact template downloaded from the '商品リストをアップロードする' dialog's 'テンプレートをダウンロード' link, and set EVERY data row's 商品コード column to an intentionally-invalid full-width value (e.g. '２７０１０３０') — this guarantees NO row can possibly be created as a real product even if the CSV-level validation has a gap, satisfying the guardrail that no row may be valid.
    - expect: A prepared, all-rows-invalid CSV fixture file exists locally before this test is run.
  2. Navigate to /products → 新商品登録 tab → 新商品を追加する → select '商品データをアップロードする' → 次の画面へ, to open the '商品リストをアップロードする' dialog.
    - expect: The dialog shows テンプレートをダウンロード link, a drag-drop dropzone, size/encoding note ('2MB 以下の CSV ファイルを使用してください(文字コードは必ずUTF-8にしてください)'), and buttons 閉じる / アップロードを開始.
  3. Upload the prepared all-invalid-rows CSV fixture via the dropzone/file chooser, then click 'アップロードを開始'.
    - expect: The upload completes without a client-side crash; the dialog closes or shows a completion state.
  4. Navigate to /products → '取り込み履歴' tab and locate the newly-added row (matching the uploaded filename and the current admin's email/timestamp).
    - expect: The new row shows ステータス 'Error' (not 'Success') and データ元 '手入力'.
  5. Click the Notification icon in that row's エラー cell to open エラーログ.
    - expect: The error text for the offending row(s) matches the stable substring/regex containing '商品コード' and '半角英数字と一部の記号' and 'のみで登録してください' — do NOT match the full exact string including the symbol-list spacing.
  6. Close the エラーログ overlay via '閉じる'.
    - expect: No new product was created (verify by confirming no new row appears in the 新商品登録 tab's product list matching the CSV's test data) — because every row in the uploaded CSV was intentionally invalid, per the pre-condition in step 1. The 更新履歴 audit row itself is permanent and is NOT cleaned up (this is expected and accepted for this opt-in scenario, per the guardrail).

### 7. Additional Enforcement Points — Confirming 商品コード Is Not Editable Elsewhere

**Seed:** `tests/seed-admin.spec.ts`

#### 7.1. 商品情報更新 is a CSV-only bulk price page and exposes no 商品コード field

**File:** `tests/sakaya-product-id-half-width/no-product-code-field-on-catalog-prices-page.spec.ts`

**Steps:**
  1. Navigate to /products/catalog-prices (left menu 商品ページ → 商品情報更新).
    - expect: Page heading '商品情報更新' is visible with a 'テンプレートをダウンロード' link, a CSV drag-drop upload dropzone ('2MB 以下の CSV ファイルを使用してください'), and a 'アップロードを開始' button — and NO individual field-level form or 商品コード input anywhere on the page.
  2. Confirm no navigation or upload action is taken.
    - expect: This page is documented as out of scope for direct field-level 商品コード validation testing, since it never renders that field; any half-width enforcement for this bulk price path (if any) is out of scope for this plan and would need separate confirmation against a real price-update CSV, which this plan does not cover.

#### 7.2. An existing product's edit page (商品詳細 tab) does not expose an editable 商品コード field

**File:** `tests/sakaya-product-id-half-width/no-product-code-field-on-product-edit-page.spec.ts`

**Steps:**
  1. Navigate to /products, open the 販売中 tab, and click the edit action icon on any existing product row to open its detail page (/products/prices/<id>), landing on the '商品詳細' tab.
    - expect: The page shows a '戻る' back button, a tablist (商品詳細, 得意先別商品設定, 得意先別の表示設定, 得意先別の非表示上書き設定), and a field list including SKU/product name (disabled), 仕様, 酒屋名, 販売形態, 容量, 容器タイプ, 注文単位, 通常価格, 割引価格, discount start/end dates, 在庫状況, 在庫数, 返品可能, 容器保証金, 欠品, 注文不可, 最大注文数, plus 非表示する / 保存する action buttons.
  2. Search the full field list on this page (including the other three tabs, viewed read-only, without saving any change) for any field labeled or resembling 商品コード.
    - expect: No 商品コード field is found anywhere on the existing-product edit page or its sub-tabs — confirming this page is NOT a third enforcement point for this feature, and that the manual-registration modal (suite 1-4) plus the CSV/エラーログ path (suite 5-6) are the complete set of enforcement points to regression-test.
  3. Navigate away without clicking '保存する' or '非表示する' on any tab.
    - expect: No existing product data was modified.
