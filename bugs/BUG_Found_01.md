# BUG_FOUND.md — Bug Report 01

## Status
- **State:** Open
- **Summary:** TECNO real-device deadlock under uiautomator2 — no confirmed fix path on either side; workaround is emulator-only runs.

## Identity
- **Reported by:** ZCode automation agent (GLM-5.3 Flash, parallel-harness session)
- **Reported at:** 2026-10-25T05:16:44Z
- **Branch:** features/phase2
- **Commit:** ace0d37

## Test Context
- **Phase:** 2
- **Sub-phase:** Parallel harness verification (smoke re-run of 1.A)
- **Test case ID:** TC-NAV-01 (fails in `"before all"` hook before TC-NAV-01 runs)
- **Spec file:** src/tests/navigasi/navigation.spec.ts

## Bug Details
### Title
UiAutomator2 instrumentation deadlocks on TECNO CM7 (HiOS, Android 16) whenever the Saku app is foreground — real-device automation impossible

### Description
On the TECNO CM7 real device (HiOS, Android 16 / API 36), the appium-uiautomator2
instrumentation freezes permanently during accessibility-tree access while the Saku
app is in the foreground. The first element find sometimes succeeds, then the next
hierarchy command (e.g. `GET element/<id>/attribute/displayed`) never returns; the
uiautomator2 server's own 240 s HTTP timeout fires, and Appium reports
`the instrumentation process is not running (probably crashed)`. Once wedged, the
server stays stuck even after the app is backgrounded or a new command is issued.
Once wedged, the server process is alive but sleeping (0 % CPU — blocked in a
binder/lock, not spinning).

Isolation evidence (same device, same APK):
- Launching the app manually works perfectly; `uiautomator dump` (legacy
  UiAutomator1) reads the full hierarchy including all `testTagsAsResourceId`
  resource-ids (`tambah_screen`, `tambah_input_amount`, …).
- A raw UiAutomator2 session against the HiOS launcher: find + `displayed` return
  instantly.
- Activating the Saku app in that same probe session: the very next find hangs.
- The Android 16 **emulator** (`emulator-5554`, same API 36, same APK) passes the
  full TC-NAV suite 8/8 repeatedly → not an app bug, not an Android-16 bug; it is
  HiOS-specific.

Ruled out during triage: Play Protect blocking helper APK install (fixed separately
via `settings put global verifier_verify_adb_installs 0`), screen sleep during runs
(`svc power stayon true` applied), device animations (set to 0, no effect),
`appium:disableWindowAnimation: true` (no effect), battery-optimization whitelist
(applied), and driver version (appium-uiautomator2-driver 8.7.0 is the latest).

### Steps to Reproduce
1. Connect TECNO CM7 (`140892554V003873`, Android 16) via USB; `adb devices` shows it authorized.
2. `SAKU_APPIUM_PORTS="4723,4725" SAKU_DEVICES="emulator-5554,140892554V003873" npx wdio run wdio.conf.ts --spec ./src/tests/navigasi/navigation.spec.ts`
   (or any run targeting this device; also reproduced with a single raw session:
   create session → `activate_app id.almezi.simplemoneytracker_kt` → find element).
3. Emulator worker passes 8/8; TECNO worker hangs in the `before all` hook for
   TC-NAV-01 until the 180 s Mocha timeout, then teardown also times out.

### Actual Result
TC-NAV spec fails on the TECNO with `Timeout after 179997ms in "before all" hook for
TC-NAV-01`; Appium server log shows the proxied `attribute/displayed` command timing
out after 240 s and then `Could not proxy command … instrumentation process is not
running (probably crashed)`. Failed 3 consecutive runs (retry limit reached).
The Saku app itself renders and functions correctly on the phone when used manually.

### Expected Result
TC-NAV (and all other specs) run and pass on the real device the same as on the
emulator, per the device-matrix parallel run contract.

### Attachment
- `reports/appium-4725.log` (dedicated-server log with the wedge; session IDs
  `51db8447-bc43-42cc-8883-7c219b68f4d9`, `52aa89df-cffd-47f0-8bb9-ce3aaa78a713`)
- Probe session: `344dde08-fa95-4343-8343-b4181f8010ef` (launcher OK → app foreground → find hangs)

### Severity
Major

### Priority
P2

## Environment
- **Device/Emulator:** TECNO CM7 (USB serial `140892554V003873`)
- **Platform:** Android
- **Appium version:** 3.8.0 (two dedicated servers, uiautomator2-driver 8.7.0 = latest)
- **App build:** SimpleMoneyTrackerKT-v2.2.apk
- **Android API level:** 36 (HiOS build)

## Fix Ownership
**MIXED — no confirmed fix path on either side today; workaround = emulator-only runs.**

Not a code defect in either repo per current evidence (same APK, same API
level passes 8/8 repeatedly on the stock-Android emulator; the app works
manually on the phone). It is a HiOS ↔ uiautomator2 incompatibility, so:

- **App code (investigation):** the app team is the only party who can
  change the accessibility surface — experiment with the Compose
  semantics/testTags configuration (e.g. how `testTagsAsResourceId` and
  dialog/window semantics interact on HiOS) to see if a build change
  avoids the deadlock.
- **Automation/infra (investigation):** try a newer
  appium-uiautomator2-server release and driver settings
  (`disableWindowAnimation` already applied, no effect).
- **Blocked-ness:** real-device runs stay blocked; `emulator-5554` is the
  sanctioned target (HANDOVER.md §8).

## Additional Notes
- Emulator unaffected: run the matrix/shard against `emulator-5554` until this is fixed.
- Device-side fixes applied during triage that DID resolve separate issues and should
  stay: `settings put global verifier_verify_adb_installs 0` (helper APK install),
  `svc power stayon true` + battery-whitelist for `io.appium.uiautomator2.server(.test)`
  and the app, animation scales set to 0.
- Suspected HiOS accessibility/window-layer deadlock (same app, same API level works
  on stock Android 16). App-side workaround to investigate in the app repo: whether a
  Compose/semantics configuration change avoids it. Next harness lever: try a future
  appium-uiautomator2-server release.
- All spec files are affected on this device, not only TC-NAV — the wedge occurs on
  the first hierarchy access under the app.
- Device prerequisites for real-device runs are documented in HANDOVER.md §troubleshooting.
