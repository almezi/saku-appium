# BUG_FOUND.md — 13

## Identity
- **Reported by:** Qoder automation agent (iOS suite verification, Phase 3 finalization)
- **Reported at:** 2026-10-27T19:05:00+07:00
- **Branch:** feature/implement-ios-automation
- **Commit:** 9ddb0d3 (fix applied to the working tree, not yet committed)

## Test Context
- **Phase:** 1
- **Sub-phase:** 1.D — Transaction List (TC-LIST) / 1.F — Edit Transaction (TC-EDIT)
- **Test case ID:** TC-LIST-01, TC-LIST-02, TC-LIST-05, TC-EDIT-01
- **Spec file:** src/tests/transaksi/transaction-list.ios.spec.ts, src/tests/transaksi/edit-transaction.ios.spec.ts

## Bug Details
### Title
Compose renders the texts of a tagged container as SIBLINGS on iOS — the tree-only child read returns nothing (automation code bug, NOT an app bug)

### Description
On iOS, a Compose container that carries a `testTag` lands in the XCUITest tree as an EMPTY
`XCUIElementTypeOther`, and the strings it renders become SIBLING nodes next to it (the same
flattening already documented for the Anggaran and Kategori cards in progress.md). Four reads in
the harness still assumed a nested tree and therefore read nothing:

1. `DaftarIosPage.emptyStateTexts()` used `iosExtractChildTexts(daftar_empty_state)` → `[]`.
   The live dump shows `Other name="daftar_empty_state"` (x 20…382, y 144…338) with the title
   "Belum ada transaksi bulan ini" as a sibling StaticText at x=85 y=144.
2. `DaftarIosPage.firstDayHeaderTexts()` read the day header's static-text children, which came
   back in DUMP order: "SELASA", "−Rp 50.000", "27 Okt 2026" — the total lands before the date,
   because the header renders the weekday and the date stacked at the LEFT and the total at the
   RIGHT. The Android twin reports [weekday, date, total], so the assertion on the date read the
   total instead.
3. `DaftarIosPage.rowTexts()` resolved the row through a page-wide `label CONTAINS "<amount>"`
   lookup, which answers with the MONTH SUMMARY (it renders the same amount as the row) and, when
   the row itself matched, with the amount's own StaticText — never with the card, so the category
   and type label were missing from the read.
4. `UbahIosPage.headerLabel()` read `getText()` on `ubah_header` → "" (the node is an
   accessible=false wrapper; "Ubah transaksi" is a sibling StaticText at x=76 y=94).

### Steps to Reproduce
1. Seed one transaction on the iOS simulator and open the Transaksi screen.
2. Dump the page source: `Other name="daftar_day_header_1793099843193"` has NO children; its
   three strings are siblings (`SELASA`, `−Rp 50.000`, `27 Okt 2026`).
3. Run `src/tests/transaksi/transaction-list.ios.spec.ts` → TC-LIST-01 expects
   "Belum ada transaksi bulan ini" and receives "", TC-LIST-02 expects "27 Okt 2026" and receives
   "−Rp 440.000", TC-LIST-05 expects "Investasi" and receives ["Rp 60.000"].
4. Run `src/tests/transaksi/edit-transaction.ios.spec.ts` → TC-EDIT-01 expects the header
   "Ubah transaksi" and receives "".

### Actual Result
4 cases fail (3 in TC-LIST, 1 in TC-EDIT) although the app renders every string correctly.

### Expected Result
The reads recover the rendered strings of the tagged container (and, for the day header, in the
visual reading order: weekday, date, total).

### Attachment
/tmp/ios_list_run2.log, /tmp/ios_edit_run.log (failing runs), live XCUITest page-source dumps
(/tmp/ios_daftar_src3.xml, /tmp/ios_ubah_src.xml — Appium session on the iPhone 18 Pro
simulator, 2026-10-27)

### Severity
Critical (four cases across two Phase 1 specs read the wrong node or nothing at all)

### Priority
P1 (fix before Phase 1 completion)

## Environment
- **Device/Emulator:** iPhone 18 Pro simulator, udid 80FCD259-BA75-4018-8FE6-31F4E812AD9B
- **Platform:** iOS 27.0
- **Appium version:** 3.8.0 (appium-xcuitest-driver 12.21.0)
- **App build:** Saku.app Debug (bundle `id.almezi.saku`)
- **Android API level:** n/a

## Additional Notes
Fixed in `src/helpers/elements.ts` + `src/pageobjects/daftar.ios.page.ts` /
`src/pageobjects/ubah.ios.page.ts`:
① new `iosStaticTexts` / `iosTextsInRect` / `iosColumnTexts` helpers read the rendered strings of
a container from ONE page-source dump (the per-element geometry fallback is quadratic — 12 cards
took over 180 s);
② `iosColumnTexts` splits the frame in half and reads the left column before the right one, which
restores the visual order (weekday, date, total) the Android twin reports;
③ the transaction-row readers are now scoped to the `daftar_item_<id>` cards (the month summary
renders the same amount, so a page-wide lookup answered for the row);
④ the empty state and the edit header read their texts from their own frame.
After the fix: TC-LIST 9/9 passing (3 skipped by design), TC-EDIT 8/8 passing; TC-VAL (17/17)
and TC-ROT (6/6) re-run green because they share the refactored readers.
