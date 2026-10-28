# BUG_Found_17.md — Bug Report 17

## Status

- **State:** Open
- **Summary:** The Tambah category sheet renders the health-medication category as **"Obat-obatan"**,
  while TESTABILITY.md:302 and `src/config/category-labels.ts:43` both contract **"Obat-obat"** —
  so `exp_health_medicine` is a latent failure in the text-lookup path (`BUG_Found-07`'s
  workaround depends on these strings being exact).

## Identity

- **Reported by:** Qoder agent (live probe on a local Appium 3.8.0 session)
- **Reported at:** 2026-10-28T05:37:40Z
- **Branch:** feature/implement-ios-automation
- **Commit:** bfeced8

## Test Context

- **Phase:** 1
- **Sub-phase:** 1.B / 1.E (any case that picks the medication category)
- **Test case ID:** none yet — no spec selects `categories.expense.healthMedicine` today
- **Spec file:** consumer would be src/tests/tambah/*.spec.ts via
  `TambahPage.selectCategory(categories.expense.healthMedicine)`
  (`src/pageobjects/tambah.page.ts:80-103`)

## Bug Details

### Title
Category label contract drift: app says "Obat-obatan", TESTABILITY.md and `categoryLabels` say
"Obat-obat"

### Description
`categoryLabels` exists only because the sheet rows carry no resource-ids (`BUG_Found-07`), which
makes each string a **locator**, not a label. `UiSelector().text()` is an exact match, so a single
character of drift turns a category into an unreachable one — and because the category also sits
below the sheet's initial fold, the failure surfaces as the 10 s timeout described in
`BUG_Found_16.md` rather than as "label changed".

Measured live 2026-10-28 (emulator-5554 / Pixel_10 / API 37 / app v2.3): sweeping the open expense
category sheet composes, in order, `Dokter · Olahraga / Gym · Obat-obatan · Lainnya (Kesehatan)`.
The contracted row is `| grp_health | exp_health_medicine | Obat-obat | true |`
(TESTABILITY.md:302), mirrored at `category-labels.ts:43`. The rest of the health group matches
exactly, so this is one string, not a re-labelled group.

Whether v2.2 said "Obat-obat" was not re-measured (the emulator now carries v2.3 and
`resources/` holds only v2.2 — see the environment note in `BUG_Found_16.md`); what is measured is
that the current build and the current contract disagree.

### Steps to Reproduce
1. Open Tambah on app v2.3, select the expense type, tap the category pager.
2. Scroll the sheet with raw W3C swipes until the health group composes
   (4 content-up sweeps from the initial window on this device).
3. Dump the page source and read the health rows' `text` attributes.
4. Compare with `src/config/category-labels.ts:43` and TESTABILITY.md:302.

### Actual Result
The sheet renders `Obat-obatan`.

### Expected Result
Per TESTABILITY.md's "CATEGORIES (merged)" table the label is `Obat-obat` — and one of the two is
wrong, because that table is the source of truth for locators (AGENTS.md, "Source-of-truth
ordering", rule 1).

### Attachment
`/tmp/probe4.txt` — swipe walk of the sheet (swipe 2 and 3 show `Obat-obatan`);
`/tmp/sheet_dump.xml` — sheet page source.

### Severity
Minor — cosmetic in the app, but it is a locator string: the first case to select this category
fails as an element-not-found, not as a label mismatch.

### Priority
P2 — fix in the next contract pass; it blocks nothing currently executed.

## Environment
- **Device/Emulator:** Pixel_10, emulator-5554
- **Platform:** Android
- **Appium version:** 3.8.0
- **App build:** installed `versionName=2.3 / versionCode=5`
- **Android API level:** 37

## Additional Notes

- **Fix is a doc + map edit, not code:** correct `category-labels.ts:43` and TESTABILITY.md:302 to
  what the app renders, and re-verify the other 27 expense + 9 income strings in one page-source
  dump while the sheet is open — the same sweep that found this one found nothing else in the
  health group, but the rest of the map has not been re-checked against v2.3.
- **Blast radius today is zero, by luck:** the suite selects `dailyFood` (51), `dailyOther` (5),
  `dailyGroceries` (4), `transportFuel` (4) and `transportPublic` (1) expense categories, all of
  which currently match. `transportFuel`/`transportPublic` fail for the scroll reason in
  `BUG_Found_16.md`.
- **Root cause of the fragility is the missing tag,** already filed as `BUG_Found-07`: once
  `TestTags.kt` emits `tambah_category_item_<id>` on the sheet rows, `selectCategory()` goes back
  to `byTag()` and this whole class of drift disappears (see the header comment of
  `src/config/category-labels.ts`).
- Related: `BUG_Found_16.md`.
