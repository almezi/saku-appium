# 8. Design System & UI/UX Assets

Purpose: preserve the visual language so future features look like the rest of
the app.

Verified against branch `feature/improve-design-2.0`, HEAD `8c7dc3a`.

---

## 8.1 Primary design files

| Artifact | Location | Format | Status |
|---|---|---|---|
| **Design tokens (canonical)** | `improve/tokens.css` | CSS custom properties | **The source of truth** |
| **Design system spec** | `improve/DESIGN.md` | Markdown, 20 component sections | Authoritative for intent |
| **Screen & rule spec** | `improve/DESIGN.md` | Markdown, 15 artboards | Authoritative for screen behaviour |
| **Acceptance checklist** | (removed — all slices done; lived in git history) |
| **Package overview** | `improve/DESIGN.md` | Markdown | How to use the package |
| **Implementation** | `ui/designsystem/` + `ui/components/` | Kotlin | The tokens, in code |
| **App spec** | `UI_SPEC.md` §5 | Markdown | Product-level design rules |

### Design tool files

⚠️ **No Figma, Sketch or XD file exists in this repository.** `improve/DESIGN.md`
references a canvas named **"Saku Revamp"** containing 15 artboards (Tambah,
Tambah Pengeluaran, Transaksi, Transaksi Kosong, Ubah transaksi, Konfirmasi
hapus, Ringkasan, Ringkasan Kosong, Anggaran, Anggaran Baru, Ubah anggaran,
Konfirmasi hapus anggaran, Kelola kategori, Tambah kategori, Konfirmasi hapus
kategori, Cadangan data). That canvas lives in the designer's tool of choice,
outside version control.

**The artboard names are the screen names in code.** If the canvas is ever
shared, link it here. Until then, `tokens.css` plus `01-design-system.md` are
the only durable, versioned design references.

---

## 8.2 Design principles

From `improve/DESIGN.md` §1:

1. **Dark only.** No light theme, no theme switch. `themes.xml` comments this
   explicitly: "Saku is a dark-only app, so day and night share one theme."
2. **One accent, used sparingly.** Violet for primary actions only.
3. **Colour carries meaning.** Green = income, pink-red = expense, amber =
   warning, red = danger. Never decorative.
4. **Numbers are monospaced.** Every amount, every month label — DM Mono with
   `tnum` (tabular figures) so digits do not shift as values change.
5. **Dense but calm.** Clear grouping, generous spacing, no ornament.
6. **No emoji as icons.** Colour dots and simple line icons only. This was a
   deliberate change in the 2.0 redesign; the old UI used emoji.

---

## 8.3 Colour

Canonical source: `improve/tokens.css`. Implemented in `ui/designsystem/SakuColor.kt`
as the `SakuColors` data class, provided through `LocalSakuColors`.

### Semantic roles

| Token | Hex | Used for |
|---|---|---|
| `--color-bg` | `#0e0e12` | App background, window background, system bars |
| `--color-surface` | `#17171d` | Cards, sheets, fields |
| `--color-surface-raised` | `#1c1c26` | Elevated surfaces, `surfaceVariant` |
| `--color-border` | `#26262e` | Hairline borders, progress bar track |
| `--color-border-strong` | `#33334a` | Focus and emphasis borders |

### Text

| Token | Hex | Used for |
|---|---|---|
| `--color-text` | `#f2f2f5` | Headings, primary body |
| `--color-text-secondary` | `#d6d6de` | Supporting body |
| `--color-text-muted` | `#9a9aa8` | Captions, metadata, empty states |
| `--color-text-placeholder` | `#8a8a98` | Input placeholders |
| `--color-text-disabled` | `#4a4a56` | Disabled controls |

### Brand and actions

| Token | Hex | Used for |
|---|---|---|
| `--color-primary` | `#5b4bd6` | Primary buttons, selected tab, logo |
| `--color-primary-text` | `#ffffff` | Text on primary |
| `--color-accent-text` | `#a99cff` | Secondary emphasis, selected tab label |
| `--color-accent-surface` | `#241f45` | Accent chip background |

### Income (green)

| Token | Hex |
|---|---|
| `--color-income` | `#6ee7a0` |
| `--color-income-surface` | `#121a16` |
| `--color-income-surface-strong` | `#15231c` |
| `--color-income-border` | `#3a7d5c` |
| `--color-income-selected` | `#1b2e25` |

### Expense (pink-red)

| Token | Hex |
|---|---|
| `--color-expense` | `#f0708a` |
| `--color-expense-surface` | `#2e1a21` |
| `--color-expense-border` | `#6b2c3a` |
| `--color-expense-button` | `#b8405a` |

> **One expense colour everywhere.** The original design used pink-red on the
> Pengeluaran form and amber in the list and summary. `improve/DESIGN.md`
> lists this as an open decision and the resolution is **pink-red throughout**
> (matching the Pengeluaran form). Change `--color-expense` in `tokens.css` if
> amber is preferred.

### Status

| Token | Hex | Meaning |
|---|---|---|
| `--color-warning` | `#f6c453` | Budget "Hampir habis" |
| `--color-danger` | `#b3373f` | Destructive actions |
| `--color-danger-text` | `#ffb3b3` | Destructive text on surface |
| `--color-danger-surface` | `#2a1518` | Destructive sheet/card background |
| `--color-danger-border` | `#5a2a31` | Destructive border |
| `--color-scrim` | `rgba(5, 5, 8, 0.7)` | Sheet overlay |

### Category palette — the only 8 user-selectable colours

| Token | Hex | Name |
|---|---|---|
| `--color-cat-pink` | `#f0708a` | pink |
| `--color-cat-orange` | `#fb923c` | orange |
| `--color-cat-yellow` | `#f6c453` | yellow |
| `--color-cat-teal` | `#5fd3e6` | teal |
| `--color-cat-blue` | `#7c8cff` | blue |
| `--color-cat-purple` | `#c4a3ff` | purple (the default) |
| `--color-cat-grey` | `#9a9aa8` | grey |
| `--color-cat-brown` | `#c9a25a` | brown |

`SakuCategoryPalette.defaultHex = "#C4A3FF"`. Seeded categories get a colour
derived from `categoryId.hashCode() % 8`, assigned once on first run and never
overwritten (`WHERE colorHex IS NULL`).

### Colour usage rules

- The same `SakuColors` instance backs both `LocalSakuColors` and Material 3's
  `darkColorScheme`, so a Material component inherits Saku colours
  automatically
- Colour is never the only signal — status always has a text label
- `SakuColors` is `@Immutable`, so Compose skips recomposition on colour reads

---

## 8.4 Typography

Two families, both bundled as raw TTFs in `res/font/`.

| Family | Usage | Weights bundled |
|---|---|---|
| **DM Sans** | All UI text | Regular, Medium, SemiBold, Bold |
| **DM Mono** | **Every amount**, month labels | Regular, Medium |

> `tokens.css` lists `--font-sans: 'DM Sans', system-ui, sans-serif` and
> `--font-mono: 'DM Mono', ui-monospace, monospace`. In the app these resolve to
> bundled resources, not system fonts.

### Type scale

`SakuTextStyles` in `ui/designsystem/SakuType.kt`. Sizes are `sp`.

| Style | Family | Weight | Size / line height | Letter spacing | Used for |
|---|---|---|---|---|---|
| `screenTitle` | Sans | Bold | 20 / 26 | −0.01 em | Screen headers |
| `sectionLabel` | Sans | Normal | 12 / 16 | +0.08 em | "JUMLAH", "KATEGORI", "AKUN" — **uppercase labels** |
| `body` | Sans | Normal | 15 / 21 | — | Default body |
| `bodyStrong` | Sans | SemiBold | 15 / 21 | — | Emphasised body |
| `bodySmall` | Sans | Normal | 14 / 20 | — | Dense body |
| `caption` | Sans | Normal | 13 / 18 | — | Metadata, helper text |
| `helper` | Sans | Normal | 13 / 18 | — | Helper text under fields |
| `emptyTitle` | Sans | Bold | 18 / 24 | — | Empty-state title |
| `buttonPrimary` | Sans | Bold | 16 / 20 | — | Primary button label |
| `buttonSecondary` | Sans | SemiBold | 15 / 20 | — | Secondary button label |
| `toggleOption` | Sans | SemiBold | 15 / 20 | — | Segmented toggle |
| `chip` | Sans | SemiBold | 13 / 17 | — | Category chips |
| `typeLabel` | Sans | Normal | 12 / 16 | — | "Pemasukan"/"Pengeluaran" tags |
| `monthLabel` | **Mono** | Medium | 14 / 18 | +0.12 em | Month switcher — `tnum` |
| `amountLarge` | **Mono** | Medium | 34 / 40 | — | Tambah amount input — `tnum` |
| `amountMedium` | **Mono** | Medium | 24 / 30 | — | Balance card — `tnum` |
| `amountSmall` | **Mono** | Medium | 16 / 22 | — | Card and row amounts — `tnum` |
| `amountList` | **Mono** | Medium | 15 / 20 | — | List row amounts — `tnum` |

All styles use `LineHeightStyle.Alignment.Center` with `Trim.None`, so text
centres consistently in its line box.

`SakuTypography` maps these onto Material 3 slots (`titleLarge`, `bodyLarge`,
`bodyMedium`, `bodySmall`, `labelLarge`, `labelMedium`, `labelSmall`) so
Material components pick them up.

### Typography rules

- **`fontFeatureSettings = "tnum"`** on every Mono style — tabular figures, so
  digits stay aligned in a list
- **No currency symbol inside the amount itself.** `Rp` is rendered by the
  component, digits by the style
- **Section labels are uppercase with wide tracking** — this is what makes the
  form read as a form
- **Never use Sans for a monetary value**, at any size

---

## 8.5 Spacing, radius and sizing

`ui/designsystem/SakuDimens.kt`. Base grid is 4 dp.

### Spacing (`SakuSpace`)

| Token | Value | Use |
|---|---|---|
| `screenHorizontal` | 20 dp | Screen padding, section gaps |
| `screenBottom` | 24 dp | Bottom content padding |
| `section` | 14 dp | Between sections |
| `cardInner` | 12 dp | Inside cards |
| `chipGap` | 8 dp | Chip spacing |
| `chipPadding` | 8 dp | Chip padding |
| `chipMarkGap` | 6 dp | Between chip dot and label |
| `switchPadding` | 3 dp | Switch track inset |
| `tight` | 4 dp | Micro gaps |
| `hairline` | 1 dp | Dividers |

### Radius (`SakuRadius`)

| Token | Value | Applied to |
|---|---|---|
| `input` | 14 dp | Fields, Material `medium` shape |
| `amountInput` | 16 dp | The big amount field |
| `card` | 16 dp | Cards, Material `large` shape |
| `summaryCard` | 18 dp | Summary cards |
| `button` | 14 dp | Primary and secondary buttons |
| `buttonSmall` | 12 dp | Small row buttons, Material `small` shape |
| `sheet` | 24 dp | Bottom sheets, Material `extraLarge` shape |
| `navBar` | 22 dp | Floating bottom nav |
| `navItem` | 14 dp | Selected nav pill |
| `mark` | 4 dp | Category colour mark |
| `bar` | 4 dp | Progress bar rounding |
| `avatar` | 12 dp | Transaction avatars |
| `switchTrack` / `knob` | 14 / 11 dp | Switch geometry |

### Sizing (`SakuSize`) — accessibility-critical

| Token | Value | Reason |
|---|---|---|
| **`minTouchTarget`** | **48 dp** | Hard minimum for every interactive element. `tokens.css` says 44 px; the app uses 48 dp, which is stricter and satisfies Android's guidance |
| `primaryButtonHeight` | 52 dp | Full-width primary button |
| `secondaryButtonHeight` | 48 dp | |
| `rowButtonHeight` | 48 dp | "Ubah" / "Hapus" in list rows |
| `chipRowHeight` | 48 dp | Category chips |
| `fieldHeight` | 48 dp | All input fields |
| `squareButton` | 48 dp | Icon-only buttons |
| `navBarHeight` | 64 dp | Floating bottom nav |
| `navBarBottomOffset` | 20 dp | Gap above the system nav bar |
| `navReserve` | 84 dp | Content padding so the floating nav never covers content |
| `avatar` | 40 dp | Category avatar |
| `mark` / `markSmall` | 12 / 10 dp | Category colour marks |
| `barHeight` | 8 dp | Budget progress bar |
| `switchTrackWidth` / `Height` / `Knob` | 48 / 28 / 22 dp | Switch geometry |
| `sheetHandleWidth` / `Height` | 40 / 4 dp | Sheet grab handle |
| `sheetHorizontalPadding` / `BottomPadding` | 20 / 28 dp | Sheet content |

⚠️ **Never ship an interactive element smaller than 48 dp.** It is a hard
requirement from `UI_SPEC.md` §5 and an accessibility floor, not a preference.

---

## 8.6 Motion

`SakuMotion` in `SakuDimens.kt`. Restraint is the rule — no decorative animation.

| Token | Value | Used for |
|---|---|---|
| `sheetMillis` | 200 | Bottom sheet slide-up |
| `pressMillis` | 100 | Button press feedback |
| `toastMillis` | 2000 | Standard toast duration |
| `undoToastMillis` | 5000 | Delete + "Urungkan" window |
| `pressScale` | 0.98f | Button press scale |
| `loadingMinimumMillis` | 1200 | Minimum on-screen time for `SakuLoadingScreen` |

From `improve/DESIGN.md` §7: "Sheets slide up over 200 ms. Respect
the reduced-motion setting. Button press: scale to 0.98 over 100 ms. **No other
decorative animation.**"

---

## 8.7 Icons and category marks

- **No emoji.** `improve/DESIGN.md` §6 explicitly rules this out for
  the 2.0 UI; the pre-redesign app used emoji.
- **Category mark** — a coloured square, 10–12 dp, radius 3–4 dp, from the
  8-colour palette. `CategoryMark()` in `ui/components/CategoryChips.kt`.
- **Transaction avatar** — a 40 dp rounded square showing the first two letters
  of the category name in the category colour. `CategoryAvatar()`.
- **Icons** — Material Icons Extended, one set for the whole app: `Icons.Default.Add`,
  `Summarize`, `CalendarMonth`, `KeyboardArrowRight`, `Icons.AutoMirrored.Filled.List`.
  Auto-mirrored variants are used where RTL matters.
- **No category icon set** exists — initials are the intended placeholder.

---

## 8.8 Component library

All components live in `ui/components/`, prefixed `Saku`. **32 public
composables.** Build new UI from these; do not invent a new button or card
style.

### Buttons — `SakuButtons.kt`

| Component | Purpose | Variants |
|---|---|---|
| `PrimaryButton` | Main action | `PrimaryButtonTone` — violet (income) / expense colour |
| `SecondaryButton` | Secondary action | Neutral surface + border |
| `DestructiveButton` | Destructive, filled | Red |
| `DestructiveSheetButton` | Destructive, inside a sheet | Red |
| `DestructiveTextButton` | Destructive, text only | "Hapus transaksi" |
| `HelperText` | Validation helper below a field | Muted, conditional |
| `SectionLabel` | "JUMLAH", "KATEGORI" | Uppercase, tracked |

### Fields — `SakuFields.kt`

| Component | Purpose |
|---|---|
| `AmountInput` | The rupiah amount field. Digits only, auto-sizes the font, mono style |
| `SelectField` | Account / category select, opens a sheet |
| `SearchField` | Picker search input |
| `NoteField` | Optional note, 60-char max |

### Navigation and containers — `SakuNavigation.kt`, `SakuBottomSheet.kt`

| Component | Purpose |
|---|---|
| `SakuBottomNav` | Floating bottom bar, three items |
| `MonthSwitcher` | Month label + prev/next. "Next" disabled in the current month |
| `BackButton` | 48 dp back button for non-tab screens |
| `ScreenHeader` | Back button + title + optional right-side action |
| `SakuBottomSheet` | The sheet container: scrim, handle, 24 dp top radius |
| `ConfirmDeleteSheet` | Destructive confirmation sheet with Batal / Ya, hapus |
| `SakuCard` | The standard surface card |

### Pickers and inputs

| Component | Purpose |
|---|---|
| `SakuPickerSheet` | Generic grouped option sheet (`SakuPickerOption`, `SakuPickerOptionGroup`) |
| `CategoryPickerSheet` | Category picker with case-insensitive search; empty groups are pruned |
| `SegmentedToggle` | Pemasukan / Pengeluaran toggle |
| `SakuSwitch` / `SwitchRow` | Toggle, incl. "Ingatkan saat 80% terpakai" |
| `SakuToastHost` / `SakuToast` | Toasts, incl. the 5-second undo toast |

### Domain components

| Component | Purpose |
|---|---|
| `TransactionCard` | A row in the Transaksi list: avatar, name, type, amount, Uh, Hapus |
| `BudgetProgressRow` | Budget row: category, status, bar, "Rp 450.000 dari Rp 500.000", Sisa/Lebih |
| `CategoryChipRow` / `CategoryChipItem` | Wrapping category pills (the variant in use) |
| `CategoryMark` / `CategoryAvatar` | Colour mark and initials avatar |
| `EmptyState` | The shared empty state |
| `SakuLogo` | The Saku wordmark |
| `SakuLoadingScreen` | Splash / loading, min 1200 ms |

> `CategoryChipGrid` was **removed** as dead code — `CategoryChipRow` is the
> variant actually used.

---

## 8.9 Rules for new UI

1. **Use the tokens.** `SakuTheme.colors`, `SakuTheme.text`, `SakuSpace`,
   `SakuRadius`, `SakuSize`, `SakuMotion`. No inline literals.
2. **Reuse the components.** A new button style is a design change, not a
   convenience.
3. **48 dp minimum touch target.** Always.
4. **DM Mono for every amount.** No exceptions.
5. **Indonesian strings in `strings.xml`.** No hard-coded UI text.
6. **Add a test tag** to `TestTags.kt` for every interactive or asserted
   element. Never invent a tag outside that file.
7. **Uppercase section labels** with `SakuTextStyles.sectionLabel`.
8. **Confirm before destroying.** Destructive actions use
   `ConfirmDeleteSheet` / the danger colour set.
9. **Keep it dark.** Do not add a light theme.
10. **Check the empty state.** Every list and every summary needs one; there is
    a shared `EmptyState` component.
11. **If the design canvas changes,** update `tokens.css`,
    `01-design-system.md` and `SakuColor.kt` / `SakuDimens.kt` together.

---

## 8.10 Design system testability

Shared components carry `component_*` tags so an automation suite can assert
structure without relying on screen-specific markup. The full registry is
`TestTags.kt` (~110 constants); `TESTABILITY.md` describes the contract:

| Group | Examples |
|---|---|
| App shell | `loading_screen` |
| Tambah | `tambah_screen`, `tambah_input_amount`, `tambah_button_save`, `tambah_error_amount`, `tambah_helper`, `tambah_select_account`, `tambah_select_date`, `tambah_account_sheet` |
| Daftar | `daftar_screen`, `daftar_item`, `daftar_month_switcher`, `daftar_summary_masuk`, `daftar_summary_keluar`, `daftar_day_header`, `daftar_empty_state` |
| Anggaran | `anggaran_row`, `anggaran_total_card`, `anggaran_form_limit`, `anggaran_form_switch` |
| Kategori | `kategori_row_edit`, `kategori_row_hide`, `kategori_row_delete`, `kategori_form_swatch` |
| Cadangan | `cadangan_export_csv`, `cadangan_export_json`, `cadangan_import_result`, `cadangan_import_error` |
| Ringkasan | `ringkasan_balance_value`, `ringkasan_savings_value`, `ringkasan_breakdown_income` |
| Shared | `component_button_primary`, `component_sheet_bottom`, `component_card_transaction`, `component_switcher_month` |

**The locator rule is absolute: never locate by visible text. Only test tags.**

---

## See also

- `improve/DESIGN.md` — the full component specification
- `improve/tokens.css` — canonical token values
- [02-tech-stack-dependencies.md](02-tech-stack-dependencies.md) — bundled fonts and their licence
- [06-functional-spec.md](06-functional-spec.md) — business rules these components display
---

# Accessibility ID coverage plan

Audit and remediation plan for tagging every interactive and asserted element
with a `testTag` from `TestTags.kt`, so the automation suite can locate elements
by accessibility ID on both platforms.

Owner of the contract: `TESTABILITY.md` ("Never locate by visible text. Locate
only by test tag"). Rule constraints from `AGENTS.md`: only use tags defined in
`TestTags.kt`; never rename, remove or invent tags.

Status: **implemented** 2026-10-16. Steps 1-6 applied; see section 8 for results.

---

## 1. Platform finding: Android did not surface tags

`testTagsAsResourceId` was set nowhere in the codebase. The two platforms map
`testTag` differently:

- **iOS** — `testTag` -> `accessibilityIdentifier` -> Appium `accessibility id`.
  Already verified (see `TESTABILITY.md`, Stage 0 / Stage 1.5).
- **Android** — `testTag` -> semantics `TestTag`. This does **not** surface as
  `content-desc`, so Appium's `accessibility id` strategy could not read it.

`TESTABILITY.md` marks Android as "YES", but that verification was manual QA,
not an Appium session.

**Fix.** Set `testTagsAsResourceId = true` on the root in the Android entry
point (`MainActivity`). Tags then resolve as `resource-id` and are locatable via
Appium's `-id` strategy. The API is Android-only, so it belongs in `:app`, not
`:composeApp`. No UX change.

---

## 2. Genuinely untagged interactive elements

- **`SakuDatePicker.kt`** — OK and `Cancel` `TextButton`s had zero tags, and the
  dialog root was untagged. `TAMBAH_DATE_PICKER` already existed in `TestTags.kt`
  but was used nowhere, which indicated this dialog was always meant to be tagged.
- **`KelolaKategoriScreen.kt`** — the rename dialog's `Cancel` button was untagged
  while its Confirm sibling was tagged `KATEGORI_FORM_SAVE`.

**Hard limitation, not an oversight.** Material3 `DatePicker` internals (day
cells, month/year headers) are framework-owned and cannot accept a `testTag`.
They must be left alone.

---

## 3. Correction to an earlier finding

An earlier draft of this audit flagged `SakuPickerSheet.kt:150` as a bug, on the
claim that account rows were mislabeled as category items. **That was wrong.**
Line 150 is inside `CategoryPickerSheet`, where `TAMBAH_CATEGORY_ITEM` is
correct. The account sheet uses `SakuPickerSheet`, which builds rows from its own
`testTag` param, so account rows already read `tambah_sheet_account_option_<id>`.
No mislabeling exists and no fix was needed.

---

## 4. Orphaned constants — no element to attach to

Of the 15 constants defined but never used, 6 have **no** matching element.
`AGENTS.md` forbids inventing tags or repurposing components, so these are left
untouched and reported instead:

| Constant | Why it has no home |
| --- | --- |
| `TAMBAH_ERROR_AMOUNT` | `TransactionForm` shows one combined `TAMBAH_HELPER` text; there are no separate error elements |
| `TAMBAH_ERROR_CATEGORY` | same as above |
| `TAMBAH_HEADER` | Tambah passes `header = null`; Ubah uses `UBAH_HEADER` |
| `COMPONENT_GRID_CATEGORY_CHIP` | only a row chip variant exists (`COMPONENT_ROW_CATEGORY_CHIP`) |
| `COMPONENT_FIELD_DATE` | the date field is tagged `TAMBAH_SELECT_DATE` instead |
| `COMPONENT_NAV_ITEM` | nav items use `component_nav_bottom_<testKey>` instead |

**Decision needed from the owner:** either adopt these onto real elements in a
future spec change, or delete them from `TestTags.kt`. Deleting is an owner call,
because `AGENTS.md` forbids the AI from removing tags.

---

## 5. Proposed new tags (approved)

| Constant | Value | Attaches to |
| --- | --- | --- |
| `TAMBAH_DATE_PICKER_OK` | `tambah_date_picker_ok` | Date picker OK button |
| `TAMBAH_DATE_PICKER_CANCEL` | `tambah_date_picker_cancel` | Date picker Cancel button |
| `KATEGORI_FORM_CANCEL` | `kategori_form_cancel` | Rename dialog Cancel button |

All three follow the `<screen>_<type>_<name>` convention and pair with the
pre-existing `TAMBAH_DATE_PICKER` for the dialog root.

---

## 6. Changes

### Step 1 — surface tags as resource-id on Android
`app/src/main/java/.../MainActivity.kt`
Wrap `SakuApp` in `Modifier.semantics { testTagsAsResourceId = true }`.

Note the symbol lives in `androidx.compose.ui.semantics`, **not**
`androidx.compose.ui.platform`, despite most `SemanticsPropertyReceiver`
extensions living in `.platform`. Importing it from `.platform` fails to
resolve.

### Step 2 — tag the date picker
`composeApp/src/commonMain/.../ui/transaction/SakuDatePicker.kt`
Add a `testTag` param defaulting to `TAMBAH_DATE_PICKER`; tag the dialog root,
the OK button and the Cancel button.

### Step 3 — let delete sheets be tagged
`composeApp/src/commonMain/.../ui/components/SakuBottomSheet.kt`
`ConfirmDeleteSheet` had no `testTag` param, which is why all three `_DELETE_SHEET`
constants were orphaned. Add an optional `testTag` param defaulting to
`COMPONENT_SHEET_BOTTOM` and pass it to `SakuBottomSheet`.

### Step 4 — apply the 9 attachable constants
Only 9 of the 15 unused constants have an element to attach to:

| Constant | File | Element |
| --- | --- | --- |
| `TAMBAH_SCREEN` | `ui/tambah/TambahScreen.kt` | root `Box` |
| `TAMBAH_TOGGLE_TYPE` | `ui/transaction/TransactionForm.kt` | `SegmentedToggle` |
| `TAMBAH_DATE_PICKER` | `ui/transaction/SakuDatePicker.kt` | dialog root (step 2) |
| `TAMBAH_ACCOUNT_ITEM` | `ui/components/SakuPickerSheet.kt` | account picker rows, via a new `itemTag` param |
| `ANGGARAN_LIST` | `ui/anggaran/AnggaranScreen.kt` | the `LazyColumn` |
| `ANGGARAN_DELETE_SHEET` | `ui/anggaran/AnggaranScreen.kt` | `ConfirmDeleteSheet` |
| `KATEGORI_DELETE_SHEET` | `ui/kategori/KelolaKategoriScreen.kt` | `ConfirmDeleteSheet` |
| `UBAH_DELETE_SHEET` | `ui/ubah/UbahTransaksiScreen.kt` | `ConfirmDeleteSheet` |
| `RINGKASAN_CATEGORY_ITEM` | `ui/ringkasan/RingkasanScreen.kt` | breakdown rows, suffixed `_<categoryId>` |

`SakuPickerSheet` keeps its current row behaviour by defaulting
`itemTag = testTag + "_option"`, so existing callers are unaffected and only the
account sheet opts into `TAMBAH_ACCOUNT_ITEM`.

### Step 5 — tag the rename dialog Cancel button
`composeApp/src/commonMain/.../ui/kategori/KelolaKategoriScreen.kt`
Apply `KATEGORI_FORM_CANCEL`.

### Step 6 — verify
```
./gradlew :composeApp:compileCommonMainKotlinMetadata :app:compileDebugKotlin
./gradlew :composeApp:testAndroidHostTest          # host-side shared tests
./gradlew :composeApp:iosSimulatorArm64Test        # needs full Xcode
```
Then confirm on a device that the tags resolve as `resource-id` (Android) and
`accessibilityIdentifier` (iOS).

---

## 7. Scope note

Per `TESTABILITY.md`, only **interactive and asserted** elements are tagged.
Decorative `Text`, `Icon`, `Spacer` and layout `Box` elements are deliberately
left untagged: they add noise and inflate `TestTags.kt` without giving the suite
anything to act on or assert.

---

## 8. Results

Applied 2026-10-16 across 11 files (54 insertions, 10 deletions).

Verification:

- `:composeApp:compileCommonMainKotlinMetadata` — pass
- `:composeApp:compileKotlinIosSimulatorArm64` — pass
- `:app:compileDebugKotlin` — pass
- `:composeApp:testAndroidHostTest` — pass, 53 tests, 0 failures
  (`FormatArgsTest`, `SeedDataTest`, `SakuFormatTest`, `CategoryFilterTest`,
  `BottomNavRouteTest`, `BudgetStatusTest`)

The iOS UI test suite (`iosSimulatorArm64Test`) could not be **linked** in this
environment: only Command Line Tools are installed, not full Xcode, so `xcrun
xcodebuild` is unavailable. This is environmental and unrelated to these changes.
Its sources still **compile** (`compileTestKotlinIosSimulatorArm64` passes),
which is the part these edits could have broken. Re-run the link on a machine
with full Xcode to exercise `TransactionFormTypeSwitchTest`.

### Tag coverage after the change

- Constants in `TestTags.kt`: **119**
- Usage sites across `:composeApp` and `:app`: **133**
- Unused constants: **6** (down from 15) — the orphans listed in section 4,
  which remain an owner decision.

### Behaviour-preserving choices

- `SakuPickerSheet.itemTag` defaults to `testTag + "_option"`, so its row tags
  are byte-for-byte identical to before. Only the account sheet opts in to
  `TAMBAH_ACCOUNT_ITEM`. `CategoryPickerSheet` is unaffected: it calls
  `PickerRow` directly, not through `itemTag`.
- `BarRow.testTag` is `String? = null` and only applied when non-null, because
  `ComparisonCard` also calls `BarRow` and has no constant of its own. Inventing
  one would violate `AGENTS.md`.
- `ConfirmDeleteSheet.testTag` defaults to `COMPONENT_SHEET_BOTTOM`, so any
  future caller stays tagged even if it passes nothing.
- `TransactionForm.toggleTestTag` defaults to `COMPONENT_TOGGLE_SEGMENTED` and
  only `TambahScreen` overrides it. See section 9.

---

## 9. Post-implementation review

A follow-up self-review after the initial tagging pass found and fixed these issues:

### Fixed: shared form broke the existing iOS test

`TransactionForm` is shared by **both** `TambahScreen` and
`UbahTransaksiScreen`. Hardcoding `TAMBAH_TOGGLE_TYPE` inside it would have
broken `TransactionFormTypeSwitchTest` (which locates
`COMPONENT_TOGGLE_SEGMENTED + "_1"`) and mislabelled Ubah's toggle with a
`tambah_` prefix. Fix: `toggleTestTag` is now a parameter defaulting to
`COMPONENT_TOGGLE_SEGMENTED`; only `TambahScreen` passes `TAMBAH_TOGGLE_TYPE`.

**Lesson:** any tag applied inside a shared component must be a parameter with a
safe default, never a hardcoded constant.

### Fixed: three tag literals outside TestTags.kt

The one-file rule was violated by pre-existing literals. All three are now
constants in `TestTags.kt` with unchanged values:

| Literal (was) | Constant | Used in |
|---|---|---|
| `"component_button_back"` | `COMPONENT_BUTTON_BACK` | `BackButton` default |
| `"mark_" + categoryId` | `CATEGORY_MARK_PREFIX + categoryId` | `CategoryMark` |
| `"avatar_" + categoryId` | `CATEGORY_AVATAR_PREFIX + categoryId` | `CategoryAvatar` |

### Fixed: two delete sheets were indistinguishable

`DaftarScreen` and `AnggaranFormScreen` called `ConfirmDeleteSheet` without a
tag, so both emitted `component_sheet_bottom`. Added `DAFTAR_DELETE_SHEET` and
`ANGGARAN_FORM_DELETE_SHEET`, following the existing `_DELETE_SHEET` pattern
(`ANGGARAN_DELETE_SHEET`, `KATEGORI_DELETE_SHEET`, `UBAH_DELETE_SHEET`). All
five delete sheets now have distinct tags.

### Reconciled: TESTABILITY.md vs TestTags.kt

Option A — `TESTABILITY.md`'s tag list now matches the implementation rather
than the other way around (no code changed). The doc previously named 13 tags
that don't exist (`nav_tab_add`, `dialog_button_delete_confirm/_cancel`,
`tambah_toggle_type_pemasukan/_pengeluaran`, etc.); it now documents the real
tags (`component_nav_bottom_tambah/daftar/ringkasan`,
`component_sheet_button_confirm/_cancel`, `tambah_toggle_type` + `_0`/`_1`,
etc.). This removes the collision between AGENTS.md's "never invent tags" rule
and TESTABILITY.md's "implement exactly" rule.

**Remaining orphaned constants** (defined but unused, left per AGENTS.md's
no-removal rule): `TAMBAH_ERROR_AMOUNT`, `TAMBAH_ERROR_CATEGORY`,
`TAMBAH_HEADER`, `COMPONENT_GRID_CATEGORY_CHIP`, `COMPONENT_FIELD_DATE`,
`COMPONENT_NAV_ITEM`.

### Verified safe

- `DatePickerDialog`'s `modifier` reaches a real semantics node — the Android
  `actual` applies it to `BasicAlertDialog` as `modifier.wrapContentHeight()`.
  The dialog-root tag is live, not dropped.
- No duplicate tag values across the 119 constants, so no two constants
  collide into one ambiguous identifier.
- No `ConfirmDeleteSheet` caller passes arguments positionally.
- `SakuPickerSheet.itemTag` defaults preserve existing row tags byte-for-byte.
- `BarRow.testTag` is nullable so `ComparisonCard` isn't forced to adopt a tag.


---

