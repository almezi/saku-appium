# BUG_FOUND.md — 08

## Identity

| Field | Value |
|---|---|
| **Reported by** | ZCode (GLM-5.3) — senior QA run, Phase 1.A iOS bring-up |
| **Reported at** | 2026-10-27T07:15:00+07:00 |
| **Branch** | app repo `feature/fix-bug-detected-by-automation-261026` (HEAD `723cf7f`) / harness `feature/implement-ios-automation` |
| **Commit SHA** | 723cf7f (app repo) |

## Test Context

| Field | Value |
|---|---|
| **Phase** | 1 |
| **Sub-phase** | 1.A (TC-NAV iOS execution, build/setup step) |
| **Test case ID** | TC-NAV-01 (blocked before first test — app could not be built) |
| **Spec file** | `src/tests/navigasi/navigation.ios.spec.ts` |

## Bug Details

- **Title:** `xcodebuild` crashes with SIGTRAP parsing `Saku.xcscheme` — every iOS build fails
- **Description:** The shared scheme committed in `0a50aa4` ("simplify Xcode scheme configuration") contains a malformed `LaunchAction` → `BuildableProductRunnable` → `BuildableReference`: `ReferencedContainer = "container:$.xcodeproj"` (literal `$.xcodeproj`, a template placeholder that was never substituted) and `BuildableName = "Saku"` instead of `Saku.app`. When any `xcodebuild` invocation resolves the scheme (e.g. `xcodebuild -scheme Saku build`), IDEFoundation hits a Swift fatal error while parsing the reference (`IDEBuildableReference.init(schemeBuildableReference:blueprintName:)`) and the process dies with EXC_BREAKPOINT/SIGTRAP before building anything.
- **Steps to Reproduce:**
  1. On a Mac with `xcode-select` at Xcode.app (`DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`)
  2. `cd SimpleMoneyTrackerKT && ./iosApp/build-app.sh Debug "iPhone 18 Pro"`
  3. Observe `xcodebuild` exit with `Trace/BPT trap: 5` (shell exit 133) immediately after "Build settings from command line".
- **Actual Result:** No iOS build is produced; `iosApp/build-app.sh` always fails. Exit code 133.
- **Expected Result:** `xcodebuild -scheme Saku` resolves the scheme and builds `Saku.app`.
- **Attachment:** `~/Library/Logs/DiagnosticReports/xcodebuild-2026-10-27-065809.ips` (faulting thread frames: `IDEBuildableReference.init` ← `IDELaunchTestSchemeAction.Options.configure` ← `IDETestPlan.Options.configure`); harness build log 2026-10-27 06:57–06:58 UTC.
- **Severity:** Major — blocks all iOS test automation on this branch; every workaround path also fails because scheme parsing happens before any build.
- **Priority:** P2 — fix already applied (see below) and verified; needs commit by the app owner.

## Environment

| Field | Value |
|---|---|
| **Device/Emulator** | iPhone 18 Pro simulator, UDID `80FCD259-BA75-4018-8FE6-31F4E812AD9B` |
| **Platform** | iOS 27.0 runtime (Xcode SDK iphonesimulator27.1), macOS darwin 27.0 arm64 |
| **Appium version** | 3.8.0 (appium-xcuitest-driver 12.21.0) |
| **App build** | Saku.app Debug (bundle `id.almezi.saku`, CFBundleShortVersionString 1.0) — builds fine after the fix |
| **Xcode** | /Applications/Xcode.app (full Xcode required; CommandLineTools has no iOS SDK) |

## Additional Notes

- **Fix applied (uncommitted in the app repo):** `iosApp/iosApp.xcodeproj/xcshareddata/xcschemes/Saku.xcscheme` — LaunchAction `BuildableReference` corrected to match the valid BuildAction entry: `BlueprintIdentifier = "SAKU0000000000000000TGT01"`, `BuildableName = "Saku.app"`, `ReferencedContainer = "container:iosApp.xcodeproj"`. After the fix the same command completes: **BUILD SUCCEEDED**, and the built app passed the full TC-NAV suite 8/8 on the simulator (see `progress.md` 1.A).
- The last known-good build (2026-10-12/13 in DerivedData) predates commit `0a50aa4`, which introduced the malformed scheme — that is the regression window.
- Recommendation: commit the scheme fix; a scheme lint (e.g. opening the project once in Xcode and re-saving, or a CI smoke `xcodebuild -scheme Saku -showBuildSettings`) would catch this class of defect.
- Related environment notes (not app bugs, recorded in `progress.md` 1.A): `xcode-select` on this machine points at CommandLineTools (no iOS SDK) — every iOS entry point must export `DEVELOPER_DIR`; the appium-mcp embedded server inherits that env and cannot create iOS sessions locally.
