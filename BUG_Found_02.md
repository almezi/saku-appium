# BUG_Found_02.md — Bug Report

## Identity
- **Reported by:** ZCode automation agent (GLM-5.3, 2.C execution session)
- **Reported at:** 2026-10-25T13:20:00+07:00
- **Branch:** features/phase2
- **Commit:** 33a930d

## Test Context
- **Phase:** 2
- **Sub-phase:** 2.C — Backup & Export
- **Test case ID:** TC-BACKUP-04
- **Spec file:** src/tests/transaksi/backup.spec.ts

## Bug Details
### Title
SAF picker drive under WebdriverIO cannot reliably navigate DocumentsUI's roots drawer — import test blocked (system-surface automation issue, NOT an app bug)

### Description
The app's import feature works: verified live end-to-end via Appium MCP on the
same emulator/build (tap `cadangan_import_button` → DocumentsUI opens →
Show roots → Downloads → tap `saku-import-test.json` → result toast
"1 transaksi ditambahkan, 0 dilewati karena sudah ada." → status card
"2 transaksi tersimpan").

The scripted (WebdriverIO) drive of the same flow fails inside the system
DocumentsUI picker:

1. The picker opens on "Recent files", which is MediaStore-indexed — a file
   freshly `adb push`ed to /sdcard/Download is NOT listed there (verified
   live: 0 matches in the composed tree).
2. Navigating the roots drawer ("Show roots" → "Downloads") is flaky under
   WDIO: stale-element retries can double-tap the hamburger (opening then
   closing the drawer), and a `UiScrollable` racing the drawer animation
   scrolls the drawer (also scrollable) instead of the file list. Final
   failure state (screenshot): picker back on "Recent", drawer closed,
   file row never resolves.

### Steps to Reproduce
1. `adb push <import.json> /sdcard/Download/saku-import-test.json`
2. Open Cadangan → tap `cadangan_import_button`
3. In DocumentsUI: tap "Show roots" → tap "Downloads" → try to find the file
   row via `UiSelector().textContains("saku-import-test.json")`
4. Under WDIO the drawer navigation misfires and the file never appears;
   the identical tap sequence driven via Appium MCP works.

### Actual Result
TC-BACKUP-04 failed 3 consecutive scripted attempts (retry limit reached):
"element ... still not displayed after 10000ms" / scrollIntoView not found.

### Expected Result
The picker lands on the Downloads root listing and the pushed file is
selectable, as it is when driven manually / via MCP.

### Attachment
- `reports/screenshots/1792933829046-TC_BACKUP_04_importing_a_backup_restores_its_transactions.png`
- `reports/appium.log` (session `6c646745-f491-45c7-8bf-aad4…` / `2d3676c0…`)

### Severity
Major

### Priority
P2

## Environment
- **Device/Emulator:** emulator-5554 (Pixel_10 AVD, arm64, API 37, cold-booted)
- **Platform:** Android
- **Appium version:** 3.8.0, uiautomator2-driver 8.7.0
- **App build:** SimpleMoneyTrackerKT-v2.2.apk
- **Android API level:** 37

## Additional Notes
- The app is NOT at fault — import verified working via direct MCP
  interaction, including the result toast and transaction count update.
- Next levers for the harness: (a) trigger a media scan after push so the
  file appears in Recents (`adb shell cmd media_scanner scan …`), (b) drive
  the drawer by DocumentsUI resource-ids with drawer-closed verification
  between taps, or (c) relax to an MCP-verified step in the execution plan.
- Related: TC-BACKUP-06 was affected by this failure's fallout (picker left
  foregrounded) before its own root cause (see BUG_Found_03.md).
