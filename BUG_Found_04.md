# BUG_Found_04.md — Bug Report

## Identity
- **Reported by:** ZCode automation agent (GLM-5.3, Phase 2 wdio-execution session)
- **Reported at:** 2026-10-25T15:05:00+07:00
- **Branch:** features/phase2
- **Commit:** 8319f40 (at time of the failing runs)

## Test Context
- **Phase:** 1 (TC-LIST-07) and 2 (TC-KAT-10 / TC-KAT-08)
- **Sub-phase:** 1.D (2026-10-24/25) and 2.B (2026-10-25)
- **Test case ID:** TC-LIST-07, TC-KAT-10, TC-KAT-08
- **Spec file:** src/tests/transaksi/transaction-list.spec.ts, src/tests/kategori/category-management.spec.ts

## Bug Details
### Title
"Ubah kategori" dialog self-dismisses between open and typing under WebdriverIO — rename/cancel flows unautomatable (app-side logic verified working via MCP)

### Description
The "Ubah kategori" rename dialog closes itself in the window between the
automation's open-verification and the first typing step, under WebdriverIO /
uiautomator2 only:

- TC-KAT-10 (run 3, 2026-10-25): `openEditDialog` succeeded —
  `kategori_form_name` passed `waitForDisplayed` — then
  `typeIntoTaggedField`'s `waitForExist(15 s)` timed out: the field did not
  exist for the full 15 s window. No interaction happened in between.
- TC-KAT-08: identical signature via `renameInDialog` (same run).
- TC-LIST-07 (1.D): the same dialog, reached from the transaction list,
  dismissed mid-interaction across 4 attempts on 2 days (2026-10-24/25) —
  recorded in progress.md as "scrim misclick on keyboard-resize recompose",
  surviving three helper-layer fixes (currency verify, EditText-is-the-tagged
  node, fresh re-resolution per retry).
- Control: TC-KAT-07/09 (open dialog, click Save/Cancel, assert the dialog
  stays on empty-save) PASS reliably under wdio; the dialog only self-
  dismisses once text entry begins. The identical rename flow works
  end-to-end via Appium MCP (progress.md 2.B: rename propagated to list row,
  Transaksi row and Ringkasan breakdown, "Uji Makan" verified on all three).

Pattern: Compose dialog + keyboard-open recomposition under the
uiautomator2 accessibility walk dismisses the dialog; the harness cannot
keep it open long enough to type.

### Steps to Reproduce
1. Open Kelola kategori → pencil on any default category (dialog opens,
   `kategori_form_name` displayed).
2. Type into `kategori_form_name` via `typeIntoTaggedField`
   (`src/helpers/input.ts`).
3. Observe `kategori_form_name still not existing after 15000ms` — the
   dialog is gone before the first keystroke.

### Actual Result
TC-LIST-07 skipped after 4 failures (1.D); TC-KAT-10/TC-KAT-08 skipped after
3 consecutive wdio failures each (2.B, 2026-10-25). Category rename and
cancel-edit paths have no automated wdio coverage.

### Expected Result
The dialog stays open while the automation types into
`kategori_form_name`, as it does for a human and via MCP set_value.

### Attachment
- `reports/screenshots/` TC_KAT_10 / TC_KAT_08 entries (2026-10-25 runs)
- `/tmp/kat-run3.log` (full wdio log of the 9-pass/4-fail run)
- progress.md 1.D (TC-LIST-07 skip note with the three earlier harness fixes)

### Severity
Major

### Priority
P2

## Environment
- **Device/Emulator:** emulator-5554 (Pixel_10 AVD, arm64, API 37)
- **Platform:** Android
- **Appium version:** 3.8.0, uiautomator2-driver 8.7.0
- **App build:** SimpleMoneyTrackerKT-v2.2.apk
- **Android API level:** 37

## Fix Ownership
**AUTOMATION CODE (primary — a proven workaround exists), app-side
investigation secondary.**

- **Automation:** the identical dialog flow works via driver-level
  `set_value` (MCP-proven all day), so the next spec-level fix is
  `typeIntoTaggedField` gaining a `setValue`-based mode that bypasses key
  events entirely, plus driver-setting trials (`waitForIdleTimeout`,
  `ignoreUnimportantViews`). That is what un-skips TC-KAT-08/10 and
  TC-LIST-07.
- **App code (only if the automation fix is insufficient):** determine why
  the dialog's dismiss path fires during the uiautomator2 accessibility
  focus walk. If the dialog proves fragile to *legitimate* accessibility
  events (not just automation), harden it app-side; today's evidence does
  not require this.

## Additional Notes
- Same-family suspicion as BUG_FOUND.md (HiOS real-device deadlock):
  Compose dialog/window animation + accessibility re-walk under
  uiautomator2. Not blocking other tests — everything else in 2.A/2.B runs
  green.
- Next levers (in order): ① driver-level `set_value` (bypasses key events —
  works via MCP today), ② `appium:ignoreUnimportantViews` /
  `waitForIdleTimeout` driver settings, ③ app-side: investigate whether the
  dialog's dismiss path can be triggered by the accessibility focus change
  that uiautomator2 performs before typing.
- Affected: TC-LIST-07 (1.D, already skipped), TC-KAT-08/TC-KAT-10 (2.B,
  skipped by this report). Not affected: dialog open/cancel-without-typing
  (TC-KAT-07/09 pass).
