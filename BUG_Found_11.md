# BUG_FOUND.md — 11

## Identity
- **Reported by:** Qoder automation agent (iOS suite verification, Phase 3.F finalization)
- **Reported at:** 2026-10-27T18:25:00+07:00
- **Branch:** feature/implement-ios-automation
- **Commit:** 9ddb0d3 (fix applied to the working tree, not yet committed)

## Test Context
- **Phase:** 1
- **Sub-phase:** 1.D — Transaction List (TC-LIST) / 1.F — Edit Transaction (TC-EDIT)
- **Test case ID:** TC-LIST (seed step) — cascades into TC-LIST-01…TC-LIST-10; TC-EDIT (date step)
- **Spec file:** src/tests/transaksi/transaction-list.ios.spec.ts, src/tests/transaksi/edit-transaction.ios.spec.ts

## Bug Details
### Title
iOS date-picker day cells are labelled in the DEVICE's day-first order ("Monday, 26 October 2026"), but the page object matched the US order ("Monday, October 26, 2026") — automation code bug, NOT an app bug

### Description
`TambahIosPage.selectDate()` (src/pageobjects/tambah.ios.page.ts) built the day-cell label with
`Intl.DateTimeFormat('en-US', …)`, which renders the US order "Monday, October 26, 2026". The
Material3 date picker on iOS labels its cells with the platform's day-first order: the live
accessibility dump of `tambah_date_picker` (iPhone 18 Pro sim, iOS 27.0, 2026-10-27) shows the
cell as `Button name="Monday, 26 October 2026" label="Monday, 26 October 2026"` (and today's cell
as `"Today, Tuesday, 27 October 2026"`). The predicate therefore never matched, the helper stepped
back a month three times and threw "Date cell \"Monday, October 26, 2026\" never became visible in
the iOS date picker".

The app itself is fine: the picker opens, lists every month page in the tree (July 2026 … January
2027), and reports "Current selection: Tuesday, 27 October 2026".

### Steps to Reproduce
1. Open the Tambah screen on the iOS simulator.
2. Tap the date field (`tambah_select_date`) — the Material3 date picker opens.
3. Dump the accessibility tree: the 26th of October 2026 is rendered as
   `Button label="Monday, 26 October 2026"` (day first), not "Monday, October 26, 2026".
4. Run `src/tests/transaksi/transaction-list.ios.spec.ts` — the seed step fails with
   `Date cell "Monday, October 26, 2026" never became visible in the iOS date picker`, and every
   following case in the file fails as a consequence (the app is left inside the open date picker,
   so the bottom navigation is not in the tree: "Can't call click on element with selector
   \"~component_nav_bottom_daftar\" because element wasn't found").

### Actual Result
9 cases failed in `transaction-list.ios.spec.ts` — all of them cascade from the one date-picker
lookup failure in the spec's first case ("seeds three transactions across two days").

### Expected Result
The date cell is selected and the seed succeeds; the day-cell label is matched in the order the
device renders it.

### Attachment
/tmp/ios_list_run.log (failing run), live XCUITest page-source dump of `tambah_date_picker`
(Appium MCP session on the iPhone 18 Pro simulator, 2026-10-27)

### Severity
Critical (a harness defect that blocked the whole TC-LIST iOS spec and would block any TC-EDIT
case that picks a date)

### Priority
P1 (fix before Phase 1 completion)

## Environment
- **Device/Emulator:** iPhone 18 Pro simulator, udid 80FCD259-BA75-4018-8FE6-31F4E812AD9B
- **Platform:** iOS 27.0
- **Appium version:** 3.8.0 (appium-xcuitest-driver 12.21.0)
- **App build:** Saku.app Debug (bundle `id.almezi.saku`)
- **Android API level:** n/a

## Additional Notes
Fixed in `src/pageobjects/tambah.ios.page.ts`: `selectDate()` now matches BOTH renderings (the
device's day-first order via `en-GB` and the US order via `en-US`), each with and without the
"Today, " prefix, so the helper no longer depends on the device's regional date format. The
`edit-transaction.ios.spec.ts` spec calls the same helper (a previous-month day) and was affected
by the same defect.
