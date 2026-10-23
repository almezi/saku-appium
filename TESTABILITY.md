# TESTABILITY

The contract between the app and the automation suite. You own this file; the AI implements it exactly and never changes it. Everything here is DRAFT until you approve it.

## Locator rule
Never locate by visible text. Locate only by test tag (accessibility ID).

## Tag naming
`<screen>_<type>_<name>`, lower snake case, all defined in one file: `TestTags.kt`. Never generated, renamed or invented by the AI.

Screen prefixes: `nav`, `add`, `list`, `summary`, `dialog`.

## Current Test Tags Implementation

Tags follow `<screen>_<type>_<name>` and are defined in `TestTags.kt`. Repeated
list items are suffixed with the item id (for example `daftar_item_<transactionId>`).
Dynamic prefixes like `mark_` and `avatar_` are suffixed with the category id.

### Navigation (bottom bar)
- Root container: `component_nav_bottom`
- Items: `component_nav_bottom_tambah`, `component_nav_bottom_daftar`, `component_nav_bottom_ringkasan`

### Loading
- `loading_screen`

### Tambah
- Screen: `tambah_screen`
- Toggle type: `tambah_toggle_type` (children `_0`/`_1`)
- Amount input: `tambah_input_amount`
- Category pager: `tambah_category_pager`
- Category item: `tambah_category_item_<categoryId>`
- Category search: `tambah_category_search` / `tambah_category_search_empty`
- Date picker dialog: `tambah_date_picker` (OK: `tambah_date_picker_ok`, Cancel: `tambah_date_picker_cancel`)
- Note input: `tambah_input_note`
- Save button: `tambah_button_save`
- Select account: `tambah_select_account`
- Select date: `tambah_select_date`
- Helper text: `tambah_helper`
- Kelola kategori link: `tambah_link_kelola_kategori`
- Account sheet: `tambah_sheet_account`
- Account item: `tambah_account_item_<accountId>`

### Daftar (list)
- Screen: `daftar_screen`
- Month switcher: `daftar_month_switcher` (children `_prev`/`_label`/`_next`)
- Backup button: `daftar_backup_button`
- Summary: `daftar_summary_masuk`, `daftar_summary_keluar`
- Transaction item: `daftar_item_<transactionId>`
- Day header: `daftar_day_header_<dateMillis>`
- Empty state: `daftar_empty_state` (primary/secondary actions)
- Month picker: `daftar_month_picker`

### Anggaran
- Screen: `anggaran_screen`
- Total card: `anggaran_total_card`
- List: `anggaran_list`
- Row: `anggaran_row_<categoryId>`
- Add button: `anggaran_add_button`
- Empty state: `anggaran_empty_state`
- Form category: `anggaran_form_category`
- Delete sheet: `anggaran_delete_sheet`

### Kelola kategori
- Screen: `kategori_screen`
- Toggle type: `kategori_toggle_type`
- Row: `kategori_row_<categoryId>` (edit / hide / delete suffixed)
- Add button: `kategori_add_button`
- Delete sheet: `kategori_delete_sheet`

### Ubah transaksi
- Screen: `ubah_screen`
- Header: `ubah_header`
- Save: `ubah_button_save`
- Delete: `ubah_button_delete`
- Delete sheet: `ubah_delete_sheet`

### Ringkasan (summary)
- Screen: `ringkasan_screen`
- Month switcher: `ringkasan_month_switcher` (children `_prev`/`_label`/`_next`)
- Totals card: `ringkasan_totals_card_income`, `ringkasan_totals_card_expense`
- Balance card: `ringkasan_balance_card`, value `ringkasan_balance_value`
- Savings row: `ringkasan_savings_row`, value `ringkasan_savings_value`
- Buttons: `ringkasan_anggaran_button`, `ringkasan_kelola_button`
- Comparison: `ringkasan_comparison`
- Breakdown: `ringkasan_breakdown_income`, `ringkasan_breakdown_expense`
- Category item: `ringkasan_category_item_<categoryId>`
- Empty state: `ringkasan_empty_state`, action `ringkasan_empty_action`
- Month picker: `ringkasan_month_picker`

### Cadangan
- Screen: `cadangan_screen`
- Status card: `cadangan_status_card`
- Export: `cadangan_export_csv`, `cadangan_export_json`
- Import: `cadangan_import_button`, `cadangan_import_result`, `cadangan_import_error`
- Warning: `cadangan_warning`

### Delete sheet (shared)
- Root: `component_sheet_bottom`
- Confirm: `component_sheet_button_confirm`
- Cancel: `component_sheet_button_cancel`

### Shared design system components
- Buttons: `component_button_primary`, `component_button_secondary`,
  `component_button_destructive`, `component_button_text_danger`,
  `component_button_back`
- Toggle segmented: `component_toggle_segmented` (children `_0`/`_1`)
- Input amount: `component_input_amount`
- Fields: `component_field_select`, `component_field_date`, `component_field_note`,
  `component_field_search`
- Month switcher: `component_switcher_month` (children `_prev`/`_label`/`_next`)
- Switch: `component_switch`
- Toast: `component_toast`
- Card transaction: `component_card_transaction` (children `_edit_<categoryId>` /
  `_delete_<categoryId>`)
- Row budget: `component_row_budget`
- Row category chip: `component_row_category_chip_<categoryId>`
- Mark: `mark_<categoryId>`
- Avatar: `avatar_<categoryId>`
- Sheet picker: `component_sheet_picker`
- Month picker sheet: `component_sheet_month_picker`
- Empty state: `component_state_empty`

All tags follow the format `<screen>_<type>_<name>` and are defined in `TestTags.kt`. Tags for amounts expose raw values for easy assertion.

## Verified on
- Android: YES — tags resolve as Compose semantics. Manual QA only; no instrumented tests exist.
- iOS: YES — verified 2026-10-12 via spike (see `iosApp/`).

### iOS Stage 0 result

Compose Multiplatform maps `testTag` to the native iOS
`accessibilityIdentifier`, so Appium's `accessibilityId` locator works on iOS
unchanged. Measured on Compose Multiplatform 1.12.1, iOS 27.0 simulator,
iPhone 18 Pro.

All five tag patterns resolved:

| Pattern | Example tag | Result |
|---|---|---|
| Root container | `tambah_screen` | FOUND |
| Interactive input | `tambah_input_amount` | FOUND |
| Interactive button | `tambah_button_save` | FOUND |
| Lazy list container | `daftar_list` | FOUND |
| List item | `daftar_item` | FOUND |

**The open question is closed: do test tags surface as accessibility IDs?**
Yes. The suite's locator rule needs no change for iOS.

Notes for future test work:

- A `testTag` on a root container **does** surface as an
  `accessibilityIdentifier`. The CMP-9551 concern (tag landing on a synthetic
  child instead of the container) did not reproduce in CMP 1.12.1. Screen-level
  tags are safe.
- The accessibility tree has extra wrapper levels: `OverlayInputView` ->
  synthetic `AccessibilityRoot` -> wrapper element -> your tagged elements.
  Locators must not assume a fixed depth.
- **Tags must be unique.** Repeated items rendered with the same tag produce
  several elements sharing one identifier, which makes them ambiguous to
  locate. Per-item tags must be suffixed with the item id.
- Accessibility tree population is **lazy** - CMP syncs it when accessibility
  services are active. A test that reads the tree immediately after launch may
  see an empty tree.

### ⚠️ OPEN: bottom sheets empty the accessibility tree

Reproduced on CMP 1.12.1, iOS 27.0 simulator. While a `ModalBottomSheet` is
open, walking `UIView.accessibilityElements` from inside the app returns an
`AccessibilityRoot` with **zero children**. Neither the sheet's own elements nor
the underlying screen's are exposed, even though both render correctly on
screen.

This matters: Saku puts a sheet on every delete confirmation
(`ConfirmDeleteSheet`) and on every picker (`SakuPickerSheet`,
`CategoryPickerSheet`). Any automation that must read or tap sheet contents
would find nothing.

**Not yet confirmed as a real blocker.** The observation came from a probe
inside the app process, with no accessibility consumer attached. CMP syncs the
tree lazily, and an XCUITest or Appium session attaches a consumer that
triggers sync. So this may be an artefact of the probe rather than of CMP.

**Must be re-verified with a real accessibility client before relying on it.**
See `docs/09-ios-migration-plan.md` section 4.2. Treat sheet-based flows as
unverified on iOS until then.

### Verified against the real app (Stage 1.5)

Confirmed 2026-10-12 on iPhone 18 Pro / iOS 27.0 with Saku's actual design
system and the real Transaksi screen in `commonMain`. Every tag below resolved
as an `accessibilityIdentifier`:

`daftar_screen`, `daftar_list`, `component_nav_bottom`,
`component_card_transaction_<categoryId>`,
`component_card_transaction_edit_<categoryId>`,
`component_card_transaction_delete_<categoryId>`, `avatar_<categoryId>`.

Screenshot: `docs/screenshots/saku-ios-real.png`. App: `iosApp/`.

### Also noted (not blocking)

- Compose Multiplatform does not apply safe-area insets automatically. Saku's
  screens use Android's `Modifier.statusBarsPadding()`, which is unavailable on
  iOS and needs a cross-platform replacement. The spike screenshot shows the
  title colliding with the status bar for exactly this reason.

## Debug tooling (debug builds only, absent from release)

| Need | Mechanism |
|---|---|
| Seed data | Intent extra `test_seed` = seed set name |
| Reset state | `adb shell pm clear <package>` |
| Fake clock | Intent extra `test_now` = ISO local date-time, for example `2026-09-15T10:00` |

Extra names are proposals; confirm or change them and keep this table the single source of truth.

## Seed sets (named, versioned)
- `seed_empty`
- `seed_month_mixed`: several income and expense items across one month
- `seed_excluded_categories`: includes Transfer Masuk, Investasi (expense), Tabungan
- `seed_month_boundaries`: items on the 1st and last day of a month, and on adjacent days
- `seed_same_day_ordering`: several items on one date with different created times

## Rules the suite must respect
See UI_SPEC.md section 2 (amount limits, dates, totals exclusion, sort order, month filter, category reset, delete confirmation). Categories are referenced by ID from CATEGORIES.md.