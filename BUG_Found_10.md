# BUG_Found_10.md — Bug Report 10

## Status
- **State:** Open
- **Summary:** The app is not at fault — TC-BACKUP-04 blocks on iOS picker remote-view automation. The picker is not dismissable programmatically, unlike the share popover.

## Identity
- **Reported by:** Qoder automation agent (2.C iOS execution session)
- **Reported at:** 2026-10-27T15:05:00+07:00
- **Branch:** feature/implement-ios-automation
- **Commit:** 38504fa

## Test Context
- **Phase:** 2
- **Sub-phase:** 2.C — Backup & Export
- **Test case ID:** TC-BACKUP-04
- **Spec file:** src/tests/transaksi/backup.ios.spec.ts

## Bug Details
### Title
iOS document picker is out-of-process and invisible to XCUITest — import test cannot select a file (system-surface automation issue, NOT an app bug)

### Description
The app's import feature is wired correctly: tapping "Pulihkan dari cadangan"
presents `UIDocumentPickerViewController` configured with
`forOpeningContentTypes = [UTTypeJSON, UTTypePlainText]`
(`composeApp/src/iosMain/.../data/backup/BackupFileStore.kt`, `IosFilePicker`).
Nothing about the app's import path is broken — the blocker is the picker.

On iOS 27 the document picker is a fully out-of-process remote view. Unlike the
share popover — whose `ShareSheet.RemoteContainerView` and
`PopoverDismissRegion` ARE published to the app's accessibility tree — the
picker publishes nothing:

1. `appium_get_page_source` after tapping the import button returned ONLY the
   app's own nodes (`Cadangan`, `cadangan_export_csv`, `cadangan_export_json`,
   `Pulihkan dari cadangan`, `Hanya tersimpan di perangkat ini, Detail`). No
   `Recents`/`Browse`/`Search`/file row exists in the tree.
2. A host screenshot (`xcrun simctl io … screenshot`) at the same moment shows
   the picker is definitely on screen ("Recents" tab, "No Recents" empty state,
   Recents/Shared/Browse tab bar).
3. Coordinate taps do not reach it either: `appium_gesture action=tap x=335
   y=840` on the "Browse" tab returned success and changed nothing (repeated
   with `perform_actions` and with the picker's close button). WDA's
   synthesized events target the app under test and are not delivered to the
   picker's window.

Because neither element queries nor blind taps can select a file, the import
cannot be driven by WebdriverIO/Appium on this platform.

### Steps to Reproduce
1. Build the iOS app and start an XCUITest session on the iPhone 18 Pro
   simulator (iOS 27.0).
2. Seed one income, open Transaksi → "Cadangan & ekspor data".
3. Tap "Pulihkan dari cadangan".
4. Call `getPageSource` (or find any picker node) → only app nodes returned.
5. `action=tap x=335 y=840` (the "Browse" tab) → tap "succeeds", picker does
   not change.

### Actual Result
TC-BACKUP-04 cannot pass on iOS. The picker is presented but invisible to
XCUITest; every locator and coordinate strategy fails.

### Expected Result
The picker's file list (or its tabs) is queryable/tappable so a pushed
`saku-import-test.json` can be selected and
"1 transaksi ditambahkan, 0 dilewati karena sudah ada." surfaces.

### Attachment
- Host screenshots: `/tmp/picker_now.png`, `/tmp/picker_browse2.png`
- Page-source dumps: `page-source-036afd18…xml` (post-import-tap, app nodes only),
  `page-source-4bb87a9b…xml` (share popover, remote view present — for contrast)
- Appium sessions: `4c9147b6-e13b-4d40-ad5d-ff7438261c20`, `fc930fdf-7fc4-4458-a56b-49374b0addb9`

### Severity
Major

### Priority
P2

## Environment
- **Device/Emulator:** iPhone 18 Pro simulator, UDID `80FCD259-BA75-4018-8FE6-31F4E812AD9B`
- **Platform:** iOS 27.0
- **Appium version:** 3.8.0, XCUITest driver 12.21.0
- **App build:** Saku.app (Debug-iphonesimulator), CFBundleShortVersionString 2.3
- **Android API level:** n/a

## Fix Ownership
**AUTOMATION / PLATFORM LIMITATION.** No app change is needed. This is the iOS
analogue of `BUG_Found_02.md` (Android SAF picker drive).

Next actions (in order):
1. Drive the picker at the HID level from the host instead of through WDA
   (`idb ui tap`, which is not installed on this machine) — WDA-synthesized
   events are confined to the app under test.
2. If a future iOS/Xcode release publishes the new document picker to the host
   app's accessibility tree, replace the `it.skip` in `backup.ios.spec.ts` with
   the real drive (tap import → select `saku-import-test.json` → assert
   `1 transaksi ditambahkan`).
3. Until then TC-BACKUP-04 stays `~[BUG]~` in `progress.md` and the import path
   is covered by live MCP/visual verification only.

## Additional Notes
- The app is NOT at fault. `IosFilePicker.present` is correct, and the same
  JSON export/import contract is verified on Android (TC-BACKUP-03 + MCP).
- The contrast with the share popover (queryable, `PopoverDismissRegion`) shows
  the limitation is specific to the picker's remote view, not to remote views in
  general — so "tap outside to dismiss" works for export but has no analogue
  here.
- TC-BACKUP-06 is not affected: the picker is never reached, so no leftover
  modal cascades into the zero-transaction export case.