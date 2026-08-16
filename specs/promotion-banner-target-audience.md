# Promotion Banner — Target Audience Setting Test Plan

## Application Overview

URRY Admin Portal (https://dev-portal.urry.com) is the internal management app for the URRY B2B liquor/restaurant ordering platform. This plan covers a new capability being added to Promotion Banners (プロモーション → バナー, Asana gid 1213077202136829, spec: Confluence 22216708 "Portal_Banner Creation Flow"): a **Target Audience** (対象店舗の設定) section on the banner create/edit form, mirroring the existing Include/Exclude targeting UI already used by Admin 通知・メッセージ (Notifications) and 販売促進キャンペーン (Sale Promotion Campaigns). A banner is shown on the shop to a Horeca only when BOTH the existing product/LP/Campaign visibility rules AND the configured Target Audience criteria (Include minus Exclude) are satisfied — an additional AND eligibility layer on top of existing rules.

All admin tests must reuse `tests/seed-admin.spec.ts` (Base URL: https://dev-portal.urry.com, already logged in as demo@urry.com / "Demo Sakaya (管理者)" on /dashboard when the test begins). Shop-side verification tests must reuse `tests/seed.spec.ts` (Base URL: https://dev.urry.com/, logged in as "Test Sakaya 20250206").

IMPORTANT SAFETY NOTE (destructive-action guardrails — restated from the task brief, MUST be followed by every scenario in this plan):
- Do NOT delete, unpublish, pause, or overwrite any PRE-EXISTING banner, campaign, landing page, or notification that other tests/users rely on. Banners observed in the shared dev environment (e.g. "Banner Campaign", "In & Ex", "check draft banner", "Banner linked campaign 1", "Banner Product", "Test LINK LP", "test banner bugs") must be treated as read-only fixtures: open them only via the pencil/edit action icon (the FIRST of three icons in the アクション column — the second is a pause/resume status toggle and the third is delete; NEVER click the second or third icon on a pre-existing banner), inspect, and always exit via "キャンセル" (Cancel) or, if a "このバナーの編集内容を保存して終了しますか？" (Save your edits before exiting?) dialog appears, always click "保存せずに閉じる" (Close without saving) — NEVER "保存して閉じる" (Save and close) or "編集して保存" (Edit and save) on a pre-existing shared banner.
- If a scenario CREATES a banner, it must use a unique test name, must immediately pause it after saving (via the status toggle icon → confirm "はい、一時停止します") so it is never live to real shop users even momentarily longer than necessary, must NOT rely on it appearing to real customers, and MUST clean up at the end of the test by deleting only the banner it created (via the trash icon + its confirmation dialog).
- Do NOT click "グループを作成" (Create Group) inside the Target Audience Include/Exclude sections — this creates a new global 取引先グループ (customer segment) and is out of scope; only select EXISTING groups/customers from the "グループを選択" / "取引先を検索する" dropdowns.
- Do NOT modify global/system settings, tags, segments, or 取引先 (customer) master data beyond what a test itself creates and reverts.
- Do NOT broadcast/send any notification (never click "通知を予約する" / "今すぐ送信"), and do NOT place any shop order (never click 注文を確定 on the shop).
- Prefer read-only / structural assertions where a mutation would risk shared data; when inspecting pre-existing Notification or Campaign records for UI parity, only VIEW them (Notification: open via the pencil "edit" tooltip only for DRAFT items and exit without sending; Campaign: use the read-only "キャンペーンの詳細" detail page reached by clicking the campaign name link) — never send, publish, or delete them.

Key UI facts discovered during exploration:
- Left menu path: プロモーション → バナー navigates to /promotions/banner. The page heading is "バナー" with a "ベータ版" (Beta) badge, a "新しいバナーを追加する" (Add new banner) button, and FOUR independently-filterable, collapsible section tables — ホーム, 検索結果（トップ), 検索結果（中間), 最近閲覧した商品 — each with its own バナーステータス filter dropdown and its own paginated table. Table columns: バナー名, バナー画像 900 x 505, バナー画像 912 x 228, ステータス (アクティブ/停止中), 対象ユーザー, 開始日, 終了日, アクション. A banner can appear in more than one section table simultaneously if multiple "表示する場所" checkboxes are selected. The 対象ユーザー column was observed showing "なし" for every banner in the list, including ones with configured Include/Exclude data on their edit form — note this as a possibly-not-yet-wired-up column when writing assertions (verify actual behavior rather than assuming).
- Each table row's アクション cell has exactly THREE icon buttons in this order: (1) pencil/edit — opens the edit drawer; (2) pause/resume status toggle — opens a confirmation dialog "本当にこのバナーを一時停止しますか？" with buttons "はい、一時停止します" / "閉じる"; (3) trash/delete — destructive, opens its own confirmation. Only icon (1) should be used on pre-existing banners in this plan.
- Clicking the edit pencil opens a right-side drawer with two tabs at the top: "詳細" (Details) and "対象店舗の設定" (Target Store Settings — this is the new Target Audience section). The drawer has a "close" (X) button top-left.
- Details tab fields, in order: "管理用のバナー名 *" (name textbox, live "N/30" counter, e.g. "In & Ex" = 7/30); "リンク先を選択する *" radiogroup with exactly three options — "ランディングページ" / "1つの商品" / "販売促進キャンペーン" — plus a dynamic sub-panel for the selected option (LP: a link to the chosen landing page plus, if it contains hidden products, a warning "このランディングページには、非表示または部分的に非表示の商品が含まれています。ランディングページのすべての商品が非表示の場合、このバナーは表示されません。"; Single Product: the chosen product name/size with edit/remove icons; Campaign: the chosen campaign name link plus a "キャンペーンの追加情報をポップアップで表示する" checkbox with conditional popup-title/description/PDF fields); "開始日と終了日を設定する" — for Single Product this is an editable radiogroup pair ("今すぐ開始"/"開始日を設定" and "終了しない"/"終了日を設定" with date+time inputs), but for Landing Page AND Campaign it collapses to a single static, non-editable line: "選択したランディングページのキャンペーン期間が適用されます。" (dates are inherited); "バナー画像をアップロードする" with two REQUIRED upload slots — バナー画像（小） 900×505px and バナー画像（大） 912×228px, PNG/JPEG ≤2MB, each showing "画像を変更する"/"削除する" once a file is set; "バナーを表示する場所を選択する" — four checkboxes: ホーム画面, 検索結果（トップ）, 検索結果（中間）, 最近閲覧した商品. Footer: "キャンセル" / "次へ" (Next is DISABLED until required fields — name, link-destination target, both images — are filled).
- Target Store Settings tab (対象店舗の設定) is reached via "次へ" (or, for an existing banner, by clicking the "対象店舗の設定" tab label / advancing through "次へ"). Structure, confirmed to mirror Notification/Campaign targeting: heading "バナーを表示する対象店舗の設定"; note "設定しない場合は、商品アクセス権のある全てのお取引先に表示されます" (if left unconfigured, shown to all customers with product access — default = no restriction); "含める対象店舗" (Include) section with "含める取引先グループ" (group combobox "グループを選択" + a "グループを作成" button — DO NOT click), selected-group chips, "含める取引先" (customer combobox "取引先を検索する"), and selected-customer chips; a separator; "除外する対象店舗" (Exclude) section mirroring Include with "除外する取引先グループ" / "除外する取引先"; another separator; "バナーが表示される対象店舗数" (target store count) with a "再計算する" (Recalculate) button and a people-icon count that reads "-" until recalculated; and a persistent warning "すべての対象商品が非表示となっているお客様には、バナーは表示されません。" (matches the spec's hidden-products warning). Footer: "戻る" (Back) / "編集して保存" (Edit and save, for existing banners).
- EDITABLE case (Link Destination = ランディングページ or 1つの商品): the four Include/Exclude inputs have DOM `readOnly:false`; selected-group and selected-customer chips render as removable MUI chips with a visible "X" (close) icon (verified on the "In & Ex" banner, e.g. an Include group chip "Include Exclude" and an Exclude customer chip "DELI", both with a clickable X).
- READ-ONLY / INHERITED case (Link Destination = 販売促進キャンペーン): the four Include/Exclude inputs have DOM `readOnly:true` and render visually greyed-out; any inherited group/customer shows as a plain, NON-removable MUI chip (no X icon) — confirmed on banner "Banner Campaign" (linked to campaign "Create Draft Campaign 23"), whose Include group chip read "Test YEN" with no delete control. This exact same "Test YEN" group value is independently confirmed as the campaign's own "対象グループ" on the read-only campaign detail page (`/promotions/sales/<id>` → section "キャンペーン対象店舗" → "対象グループ"), proving true inheritance rather than a coincidental default.
- Closing the drawer (X) with any unsaved change triggers a confirmation dialog, heading "このバナーの編集内容を保存して終了しますか？", with three buttons: "キャンセル" / "保存せずに閉じる" / "保存して閉じる".
- Notification parity: a Promotion-type notification create form (/notifications/promotions) has an equivalent "通知対象" section with note "ここで通知の対象、または対象ではないお取引先を指定しない場合、すべてのお取引先へ通知が配信されます。", an Include subsection "通知対象のお取引先" (group/tag combobox "取引先グループ・タグを選択する" + customer combobox "対象となるお取引先の店舗名、コードで検索"), an Exclude subsection "通知の対象ではないお取引先" (group/tag combobox + customer combobox "通知から除外するお取引先の店舗名、コードで検索"), and a count "対象のお取引先の数" with a "計算する" button showing "-" until calculated — structurally identical to the banner's Include/Exclude/recalculate pattern. (Note: the auto-generated "価格改定" (price-change) notification type instead opens an unrelated per-product price-revision dialog when its edit icon is clicked — avoid that notification type when checking parity; use a "プロモーション" type notification instead.)
- Campaign parity: the read-only campaign detail page (`/promotions/sales/<id>`, heading "キャンペーンの詳細") has a "キャンペーン対象店舗" section with labeled values "対象グループ" / "対象の取引先" / "除外グループ" / "除外する取引先" and a "キャンペーン対象店舗数" count — the same four-field Include/Exclude model as the banner and notification.

## Test Scenarios

### 1. Banner List and Navigation

**Seed:** `tests/seed-admin.spec.ts`

#### 1.1. Navigate to the Banner list via the left menu

**File:** `tests/promotion-banner-target-audience/banner-list-navigation.spec.ts`

**Steps:**
  1. Start from the authenticated admin dashboard (/dashboard) via seed.
    - expect: Left sidebar menu is visible with a 'プロモーション' section.
  2. Expand/click 'プロモーション' in the left menu, then click 'バナー'.
    - expect: Browser navigates to /promotions/banner.
    - expect: Page heading 'バナー' is visible with a 'ベータ版' badge next to it.
    - expect: A '新しいバナーを追加する' button is visible.
  3. Observe the page layout.
    - expect: Four collapsible section tables are visible in order: 'ホーム', '検索結果（トップ)', '検索結果（中間)', '最近閲覧した商品', each with its own バナーステータス filter control and its own paginated table.

#### 1.2. Banner list table shows the 対象ユーザー (Target Audience) column

**File:** `tests/promotion-banner-target-audience/banner-list-target-user-column.spec.ts`

**Steps:**
  1. Navigate to /promotions/banner (via seed + menu) and wait for the ホーム section table to load.
    - expect: Table column headers include, in order: バナー名, バナー画像 900 x 505, バナー画像 912 x 228, ステータス, 対象ユーザー, 開始日, 終了日, アクション.
  2. Read the 対象ユーザー cell value for each visible row.
    - expect: Each row renders a value in the 対象ユーザー column (e.g. 'なし' for banners without a calculated target count) without throwing a rendering error; document the actual value observed for a banner that has Include/Exclude configured on its edit form (e.g. 'In & Ex') as either a pass (shows a real count) or a known gap (still shows 'なし') per actual behavior — do not assume without checking.

#### 1.3. Open an existing banner's edit drawer via the edit (pencil) icon only, and view both tabs

**File:** `tests/promotion-banner-target-audience/open-existing-banner-edit-form.spec.ts`

**Steps:**
  1. Navigate to /promotions/banner. In the ホーム section table, locate any existing banner row (e.g. 'In & Ex') and click ONLY the first (pencil/edit) icon in its アクション cell — do NOT click the second (pause) or third (delete) icon.
    - expect: A right-side drawer opens with a close (X) button and two tabs at the top: '詳細' and '対象店舗の設定'.
    - expect: The '詳細' tab is active by default and shows the banner's current name pre-filled in '管理用のバナー名 *' with a 'N/30' character counter, and the 'リンク先を選択する *' radiogroup with the correct option pre-selected.
  2. Click '次へ' (or the '対象店舗の設定' tab label) to move to the Target Store Settings step.
    - expect: The tab header now shows a 'back' arrow plus '詳細' (inactive) and '対象店舗の設定' (active).
    - expect: Heading 'バナーを表示する対象店舗の設定' is visible with note text 'この設定しない場合は、商品アクセス権のある全てのお取引先に表示されます' (or equivalent wording), an '含める対象店舗' section, a '除外する対象店舗' section, a 'バナーが表示される対象店舗数' counter with a '再計算する' button, and a warning paragraph mentioning that banners are not shown to customers for whom all target products are hidden.
  3. Close the drawer via the (X) close button WITHOUT changing any field.
    - expect: Either the drawer closes immediately with no confirmation dialog (if no field was touched), or if a 'このバナーの編集内容を保存して終了しますか？' dialog appears, click '保存せずに閉じる' to exit safely.
    - expect: Back on /promotions/banner, the banner list is unchanged (same name, status, and dates as before) confirming no accidental mutation.

### 2. Target Audience Section — Structure Parity with Notification and Campaign

**Seed:** `tests/seed-admin.spec.ts`

#### 2.1. Banner Target Audience UI mirrors the Notification (通知・メッセージ) Include/Exclude UI

**File:** `tests/promotion-banner-target-audience/target-audience-parity-notification.spec.ts`

**Steps:**
  1. Navigate to /promotions/banner, open an existing Single-Product or Landing-Page linked banner's edit drawer via its pencil icon, click '次へ' to reach '対象店舗の設定'.
    - expect: The tab shows '含める対象店舗' (with '含める取引先グループ' group combobox and '含める取引先' customer combobox) and '除外する対象店舗' (with '除外する取引先グループ' group combobox and '除外する取引先' customer combobox), plus a target-count area with a recalculate button.
  2. Close the drawer via '保存せずに閉じる' (or Cancel) without saving. Then navigate to /notifications/promotions to open the Promotion-type notification creation form.
    - expect: The form shows a '通知対象' section with note text about delivering to all customers if unset, a '通知対象のお取引先' subsection (group/tag combobox '取引先グループ・タグを選択する' + customer combobox '対象となるお取引先の店舗名、コードで検索'), a '通知の対象ではないお取引先' subsection (group/tag combobox + customer combobox '通知から除外するお取引先の店舗名、コードで検索'), and a target count '対象のお取引先の数' with a '計算する' button.
  3. Compare the two structures without submitting either form: do NOT click '通知を予約する'/'今すぐ送信' on the notification form; simply navigate away.
    - expect: Both UIs expose the same conceptual four-field model: Include-group, Include-customer, Exclude-group, Exclude-customer, plus a target-count-with-recalculate control — confirming parity as required by the feature brief.
    - expect: No notification was sent and no data was modified (navigating away from an unsent draft-in-progress form does not persist anything).

#### 2.2. Banner Target Audience UI mirrors the Sale Promotion Campaign target store model

**File:** `tests/promotion-banner-target-audience/target-audience-parity-campaign.spec.ts`

**Steps:**
  1. Navigate to /promotions/sales and click into any existing campaign's name link (e.g. 'Create Draft Campaign 23') to open its read-only detail page.
    - expect: Page heading 'キャンペーンの詳細' is shown.
    - expect: A 'キャンペーン対象店舗' section is visible with labeled values '対象グループ', '対象の取引先', '除外グループ', '除外する取引先', and a 'キャンペーン対象店舗数' count heading.
  2. Note the exact value shown under '対象グループ' for this campaign (e.g. 'Test YEN'), if any. Do not edit or submit anything on this read-only page.
    - expect: The observed group name is recorded for cross-referencing in the Campaign Inheritance suite below.
  3. Navigate to /promotions/banner and open (via pencil icon only) a banner whose Link Destination is 販売促進キャンペーン and which is linked to that same campaign (e.g. 'Banner Campaign'), advance to '対象店舗の設定'.
    - expect: The '含める取引先グループ' area on the banner shows the SAME group name/chip observed on the campaign's own detail page (e.g. 'Test YEN'), confirming the banner's Target Audience model and the campaign's target-store model represent the same underlying concept (Include group / Include customer / Exclude group / Exclude customer).
  4. Close the banner drawer via '保存せずに閉じる' without saving any change.
    - expect: No banner or campaign data was modified.

### 3. Target Audience — Editable for Landing Page and Single Product Links

**Seed:** `tests/seed-admin.spec.ts`

#### 3.1. Target Audience Include/Exclude fields are editable when Link Destination = 1つの商品 (Single Product)

**File:** `tests/promotion-banner-target-audience/target-audience-editable-single-product.spec.ts`

**Steps:**
  1. Navigate to /promotions/banner and open the 'In & Ex' banner (Link Destination = 1つの商品) via its pencil icon.
    - expect: Details tab shows '1つの商品' selected in the リンク先を選択する radiogroup, and the 開始日と終了日を設定する section shows EDITABLE radio options ('今すぐ開始'/'開始日を設定', '終了しない'/'終了日を設定') with date/time inputs — not the static inherited text.
  2. Click '次へ' to reach '対象店舗の設定'.
    - expect: The '含める取引先グループ' and '取引先を検索する' (Include) and the equivalent Exclude inputs are NOT read-only: they can receive focus and accept typed text (verify programmatically that the underlying input elements do not have the readOnly/disabled attribute, or visually that the background is white/interactive rather than greyed-out).
    - expect: Any existing selected group/customer chips (e.g. an Include group chip and an Exclude customer chip such as 'DELI') render with a visible, clickable 'X' remove icon, confirming they are editable/removable.
  3. Without clicking any 'X' or typing anything that would change the saved state, close the drawer via the (X) close button, then click '保存せずに閉じる' in the resulting confirmation dialog.
    - expect: The drawer closes, the banner list is unchanged, and the 'In & Ex' banner's Include/Exclude configuration remains exactly as it was before this test ran.

#### 3.2. Target Audience remains editable for a Landing-Page-linked banner even though dates are inherited

**File:** `tests/promotion-banner-target-audience/target-audience-editable-landing-page.spec.ts`

**Steps:**
  1. Navigate to /promotions/banner and open the 'Test LINK LP' banner (Link Destination = ランディングページ) via its pencil icon.
    - expect: Details tab shows 'ランディングページ' selected, and the 開始日と終了日を設定する section shows ONLY the static text '選択したランディングページのキャンペーン期間が適用されます。' with no editable date radios/inputs (dates are inherited from the Landing Page/Campaign period).
  2. Click '次へ' to reach '対象店舗の設定'.
    - expect: Unlike the date fields, the Include/Exclude group and customer inputs in this tab are NOT read-only (verify the input elements' readOnly/disabled attributes are false, or that they are visually white/interactive) — proving that only Start/End Date is inherited for Landing-Page links, while Target Audience remains fully editable, exactly as specified.
  3. Close the drawer via the (X) close button and click '保存せずに閉じる' if the confirmation dialog appears.
    - expect: No change was persisted to the 'Test LINK LP' banner.

#### 3.3. Configure Include and Exclude targeting on a newly created Draft-like banner, save, and verify persistence on reopen (with full cleanup)

**File:** `tests/promotion-banner-target-audience/create-banner-configure-target-audience-persistence.spec.ts`

**Steps:**
  1. Navigate to /promotions/banner and click '新しいバナーを追加する'.
    - expect: The create drawer opens on the '詳細' tab with an empty '管理用のバナー名' textbox (0/30) and 'リンク先を選択する' defaulted or unselected.
  2. Fill in a unique test banner name (e.g. 'TA Persistence Test <timestamp>', ≤30 chars), select リンク先 = '1つの商品', and choose any existing product via the product picker.
    - expect: The chosen product's name/size appears in the link-destination panel.
  3. Upload a valid small banner image (900x505px, ≤2MB) into 'バナー画像（小）' and a valid large banner image (912x228px, ≤2MB) into 'バナー画像（大）' using local fixture files, leave 開始日と終了日 at defaults ('今すぐ開始' / '終了しない'), and leave 'バナーを表示する場所を選択する' at its defaults.
    - expect: Both image upload slots show the uploaded filename and dimensions instead of the drag-drop prompt.
    - expect: The '次へ' button becomes enabled.
  4. Click '次へ' to reach '対象店舗の設定'. In '含める取引先グループ', open the 'グループを選択' combobox and select ONE existing group from the dropdown (do NOT click 'グループを作成'). In '含める取引先', search for and select ONE existing customer via '取引先を検索する'.
    - expect: The selected group appears as a removable chip under 含める取引先グループ, and the selected customer appears as a removable chip under 含める取引先.
  5. In '除外する対象店舗', select ONE existing customer via '除外する取引先' → '取引先を検索する' (leave 除外する取引先グループ empty).
    - expect: The selected exclude customer appears as a removable chip.
  6. Click '再計算する' to compute the target store count, then click the final save button ('編集して保存' or equivalent 'バナーを作成する'/'保存する' label — record the actual label observed).
    - expect: The drawer closes without error and the banner list reloads.
    - expect: The newly created banner (by its unique name) appears in the appropriate section table(s) with ステータス 'アクティブ'.
  7. IMMEDIATELY click the new banner's status-toggle (pause) icon in the アクション column and confirm 'はい、一時停止します' in the resulting dialog, to minimize any window where it could be visible to real shop users.
    - expect: The banner's ステータス cell now shows '停止中'.
  8. Re-open the same banner via its pencil icon and advance to '対象店舗の設定'.
    - expect: The same Include group chip, Include customer chip, and Exclude customer chip selected earlier are still present, confirming the Target Audience configuration persisted correctly across save/reopen.
  9. Close the drawer via '保存せずに閉じる' (no further edits needed), then clean up: click the trash/delete icon on this same test banner row and confirm the deletion dialog.
    - expect: The test banner no longer appears anywhere in the banner list.
    - expect: No other pre-existing banner, campaign, landing page, or customer/group master data was affected by this test.

#### 3.4. Target-user count control and hidden-products warning are present on an editable banner

**File:** `tests/promotion-banner-target-audience/target-audience-recalculate-count-and-warning.spec.ts`

**Steps:**
  1. Navigate to /promotions/banner and open the 'In & Ex' banner (editable, Single-Product-linked) via its pencil icon, advance to '対象店舗の設定'.
    - expect: A 'バナーが表示される対象店舗数' label is visible next to a people icon and a numeric/placeholder value (e.g. '-' if not yet calculated), plus a '再計算する' button.
  2. Click '再計算する'.
    - expect: The count area updates (either to a specific number or shows a loading indicator followed by a number), without navigating away from the drawer or throwing a console error.
  3. Scroll to the bottom of the '対象店舗の設定' panel.
    - expect: A warning message is visible stating that customers for whom all target products are hidden will be excluded from seeing the banner (Japanese: 'すべての対象商品が非表示となっているお客様には、バナーは表示されません。'), matching the feature brief's required warning.
  4. Close the drawer via the (X) button and click '保存せずに閉じる' in the confirmation dialog (since 再計算する may have marked the form as dirty).
    - expect: The 'In & Ex' banner's saved configuration is unchanged.

### 4. Target Audience — Campaign Link Inheritance (Read-only)

**Seed:** `tests/seed-admin.spec.ts`

#### 4.1. Include/Exclude fields are read-only and inherited when Link Destination = 販売促進キャンペーン

**File:** `tests/promotion-banner-target-audience/target-audience-readonly-campaign-link.spec.ts`

**Steps:**
  1. Navigate to /promotions/banner and open the 'Banner Campaign' banner (Link Destination = 販売促進キャンペーン) via its pencil icon.
    - expect: Details tab shows '販売促進キャンペーン' selected in リンク先を選択する, with the linked campaign name shown (e.g. 'Create Draft Campaign 23'), and the 開始日と終了日を設定する section shows ONLY the static inherited text '選択したランディングページのキャンペーン期間が適用されます。' (no editable date controls).
  2. Click '次へ' to reach '対象店舗の設定'.
    - expect: The 含める取引先グループ, 含める取引先, 除外する取引先グループ, and 除外する取引先 input fields all appear visually greyed-out/disabled (light grey background) and CANNOT be focused or typed into (verify programmatically: each corresponding <input> element has readOnly=true).
    - expect: Any pre-populated group/customer chip (e.g. a group chip showing the inherited group name) renders as a PLAIN chip with NO 'X'/remove icon, unlike the removable chips seen on editable (Single-Product/Landing-Page) banners.
  3. Attempt to click directly into the 含める取引先グループ combobox and type a search string.
    - expect: No dropdown/autocomplete list of selectable groups opens, and no text is entered into the field, confirming it is truly non-interactive rather than merely styled to look disabled.
  4. Close the drawer via the (X) close button.
    - expect: Either the drawer closes with no confirmation dialog (nothing was changed, since the fields could not be edited), or if a dialog appears, click '保存せずに閉じる' — never save.

#### 4.2. Inherited Include group on a Campaign-linked banner matches the campaign's own configured target group

**File:** `tests/promotion-banner-target-audience/target-audience-inherited-value-matches-campaign.spec.ts`

**Steps:**
  1. Navigate to /promotions/sales, open the campaign linked to the 'Banner Campaign' banner (e.g. 'Create Draft Campaign 23') via its detail page.
    - expect: The 'キャンペーン対象店舗' section shows a specific value under '対象グループ' (e.g. 'Test YEN').
  2. Navigate to /promotions/banner, open 'Banner Campaign' via its pencil icon, advance to '対象店舗の設定'.
    - expect: The read-only Include group chip displayed on the banner exactly matches the '対象グループ' value observed on the campaign's own detail page in the previous step (e.g. both show 'Test YEN'), proving the banner truly inherits — rather than independently duplicates — the campaign's targeting configuration.
  3. Close the banner drawer without saving.
    - expect: No data was modified on either the campaign or the banner.

### 5. Validation, Cancel, and Safe Discard

**Seed:** `tests/seed-admin.spec.ts`

#### 5.1. Create-new-banner form disables 次へ until all required Details fields are provided

**File:** `tests/promotion-banner-target-audience/create-form-next-disabled-until-required.spec.ts`

**Steps:**
  1. Navigate to /promotions/banner and click '新しいバナーを追加する'.
    - expect: The drawer opens with 次へ DISABLED (empty name, no images uploaded).
  2. Fill in only the '管理用のバナー名' field with a valid unique test name, leaving リンク先 at its default and no images uploaded.
    - expect: 次へ remains DISABLED because required images are still missing.
  3. Select リンク先 = '1つの商品' and pick any product, but still upload no images.
    - expect: 次へ remains DISABLED.
  4. Upload valid images for both バナー画像（小） and バナー画像（大）.
    - expect: 次へ becomes ENABLED once all required fields (name, link destination target, both images) are present.
  5. Close the drawer via (X) without saving.
    - expect: No banner was created; a confirmation dialog may appear (since fields were filled) — click '保存せずに閉じる' to discard.

#### 5.2. Banner name field enforces the 30-character maximum with a live counter

**File:** `tests/promotion-banner-target-audience/banner-name-max-length.spec.ts`

**Steps:**
  1. Navigate to /promotions/banner, click '新しいバナーを追加する', and click into '管理用のバナー名を入力する'.
    - expect: The counter next to the field reads '0/30'.
  2. Type a string of exactly 30 characters.
    - expect: The counter reads '30/30' and the full string is accepted.
  3. Attempt to type additional characters beyond the 30th.
    - expect: The field either rejects further input (stays at 30 characters, counter remains '30/30') or shows a validation message — document the actual enforcement behavior observed.
  4. Close the drawer via (X) and discard via '保存せずに閉じる' if prompted.
    - expect: No banner was created.

#### 5.3. Closing the edit drawer with unsaved Target Audience changes prompts a save/discard confirmation and discarding leaves no residue

**File:** `tests/promotion-banner-target-audience/discard-unsaved-changes-dialog.spec.ts`

**Steps:**
  1. Navigate to /promotions/banner and open the 'In & Ex' banner via its pencil icon; advance to '対象店舗の設定' and record the current Include/Exclude chips shown.
    - expect: Existing chips are visible and recorded for later comparison.
  2. Type a search term into the '除外する取引先' ('取引先を検索する') combobox (do not necessarily select a result — even opening/typing may mark the form dirty), then click the drawer's (X) close button.
    - expect: A confirmation dialog appears with heading 'このバナーの編集内容を保存して終了しますか？' and three buttons: 'キャンセル', '保存せずに閉じる', '保存して閉じる'.
  3. Click 'キャンセル' on this dialog.
    - expect: The dialog closes and the edit drawer remains open with the typed search text still present (cancel returns to editing, does not discard or save).
  4. Click the (X) close button again, and this time click '保存せずに閉じる' in the confirmation dialog.
    - expect: The drawer closes and returns to the banner list.
  5. Re-open the 'In & Ex' banner via its pencil icon and advance to '対象店舗の設定' again.
    - expect: The Include/Exclude chips exactly match what was recorded in step 1 — the typed-but-unsaved search text/selection from earlier was fully discarded, proving '保存せずに閉じる' does not persist changes.

#### 5.4. Cancelling the pause-status confirmation dialog leaves the banner's status unchanged

**File:** `tests/promotion-banner-target-audience/pause-action-cancel-does-not-mutate.spec.ts`

**Steps:**
  1. Navigate to /promotions/banner and record the current ステータス value shown for the 'In & Ex' banner row in the ホーム section table (e.g. 'アクティブ').
    - expect: The current status value is recorded.
  2. Click the SECOND (pause/resume) icon in the アクション cell for that row.
    - expect: A confirmation dialog appears with heading '本当にこのバナーを一時停止しますか？' and two buttons: 'はい、一時停止します' and '閉じる'.
  3. Click '閉じる' (Close) — do NOT click 'はい、一時停止します'.
    - expect: The dialog closes.
    - expect: The 'In & Ex' banner row's ステータス value is unchanged from what was recorded in step 1 (the pause action was NOT applied).

### 6. Shop Verification of Target Audience Eligibility (Provisional)

**Seed:** `tests/seed.spec.ts`

#### 6.1. [Provisional] A banner whose Target Audience includes the current shop customer is displayed on the shop Home screen

**File:** `tests/promotion-banner-target-audience/shop-banner-visible-for-included-target.spec.ts`

**Steps:**
  1. PRECONDITION (performed via an admin-seeded setup, not shown here): a banner is configured with Link Destination = Single Product or Landing Page, Display Section including ホーム画面, and Target Audience Include configured to include the 'Test Sakaya 20250206' account (or a segment/group it belongs to), with no Exclude entry for it, and the linked product/LP is visible to this account. Status is set to アクティブ only for the duration of this verification and reverted/deleted immediately after.
    - expect: This precondition step is documented as an assumption; actual shop banner rendering selectors were not explored in this session and must be confirmed by the test author against the live shop Home page markup before implementation.
  2. Start from the authenticated shop home page (via seed.spec.ts) as 'Test Sakaya 20250206'.
    - expect: The home page loads successfully.
  3. Visually/structurally inspect the Home screen banner carousel/area.
    - expect: The precondition banner's long-format image (900x505-derived Home banner) is present somewhere in the Home screen banner display area, confirming the Target-Audience-included customer can see it.

#### 6.2. [Provisional] A banner whose Target Audience excludes the current shop customer is NOT displayed, even if their group is included

**File:** `tests/promotion-banner-target-audience/shop-banner-hidden-for-excluded-target.spec.ts`

**Steps:**
  1. PRECONDITION (admin-seeded setup, not shown here): configure a banner whose Target Audience Include contains a group that the 'Test Sakaya 20250206' account belongs to, but whose Exclude list explicitly contains that same account. Display Section includes ホーム画面; linked product/LP is otherwise visible to the account.
    - expect: This precondition is an assumption pending confirmation of exact shop-side markup.
  2. Start from the authenticated shop home page (via seed.spec.ts).
    - expect: The home page loads successfully.
  3. Inspect the Home screen banner carousel/area for the precondition banner.
    - expect: The precondition banner is NOT present anywhere in the Home screen banner area, confirming Exclude correctly overrides Include (Include minus Exclude) for this eligibility layer.

#### 6.3. [Provisional] A banner matching Target Audience but whose linked product is hidden from the customer is still not displayed

**File:** `tests/promotion-banner-target-audience/shop-banner-hidden-when-product-inaccessible-despite-target-match.spec.ts`

**Steps:**
  1. PRECONDITION (admin-seeded setup, not shown here): configure a banner with Link Destination = Single Product where the product is hidden/inaccessible for the 'Test Sakaya 20250206' account (via existing product-visibility rules, e.g. 取引先別商品設定), but whose Target Audience Include explicitly includes this account with no Exclude entry.
    - expect: This precondition is an assumption pending confirmation of exact shop-side markup and available hidden-product test fixtures.
  2. Start from the authenticated shop home page (via seed.spec.ts).
    - expect: The home page loads successfully.
  3. Inspect the Home screen banner carousel/area for the precondition banner.
    - expect: The precondition banner is NOT present, confirming the AND-layer eligibility rule: matching Target Audience alone is insufficient — the underlying product/LP/Campaign visibility rule must also be satisfied.
