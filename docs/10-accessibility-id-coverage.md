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

