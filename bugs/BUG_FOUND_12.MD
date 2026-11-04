# BUG_Found_12.md — Bug Report 12

## Status
- **State:** Open
- **Summary:** No app defect — TC-PERF-05 cannot be executed on the iOS simulator because the measurement path (`dumpsys meminfo`) has no simulator counterpart.

## Identity
- **Reported by:** Qoder automation agent (iOS Phase 3.F execution)
- **Reported at:** 2026-10-27T18:30:00+07:00
- **Branch:** feature/implement-ios-automation
- **Commit:** 9ddb0d3 (iOS spec added to the working tree, not yet committed)

## Test Context
- **Phase:** 3
- **Sub-phase:** 3.F — Performance (TC-PERF)
- **Test case ID:** TC-PERF-05 (memory stays stable across 50 add/delete cycles)
- **Spec file:** src/tests/app/performance.ios.spec.ts

## Bug Details
### Title
TC-PERF-05 cannot run on iOS — no `meminfo` counterpart inside the simulator and 50 UI-driven cycles exceed the mocha timeout (harness limitation, NOT an app bug)

### Description
The Android spec measures the app's memory with `adb shell dumpsys meminfo <package>` (TOTAL PSS)
around 50 add/delete cycles and asserts the total does not grow by more than 15%. Two things block
the same measurement on iOS:

1. **No memory introspection from inside the simulator.** The iOS sandbox has no `meminfo`
   equivalent, and `xcrun simctl spawn <udid> ps` does not exist ("No such file or directory",
   measured 2026-10-27). The only readable figure is the HOST process list — `ps -A -o pid,rss,comm`
   shows the simulator's `Saku.app` process at ~316 MB RSS — which measures the host-side process
   image, not the app's own footprint, and is not reachable from the driver's session.
2. **The cycle count does not fit the mocha budget.** Each add/delete cycle drives the real UI
   (form, category sheet, keyboard, delete sheet, confirm), which costs ~10 s per cycle on the
   simulator; 50 cycles are ~8 minutes against the 180 s per-test timeout (the Android spec hits
   the same wall and runs the loop out of band through `scripts/perf_memcycles.sh`).

The case is therefore kept as `it.skip` in the iOS spec, exactly like the Android spec does.

### Steps to Reproduce
1. Run `xcrun simctl spawn 80FCD259-BA75-4018-8FE6-31F4E812AD9B ps` → "No such file or directory".
2. Run `ps -A -o pid,rss,comm | grep Saku` → the host process image (~316 MB RSS), not the app's
   memory footprint.
3. Attempt 50 add/delete cycles through the iOS UI inside one mocha test → the 180 s timeout is
   reached long before the 50th cycle.

### Actual Result
`it.skip` — the case never executes; the iOS spec reports "4 passing, 1 skipped".

### Expected Result
Per the Android spec, the case is executed out of band (Android: `scripts/perf_memcycles.sh` with
`dumpsys meminfo`). The iOS equivalent would need an out-of-band script that samples the host RSS
of the simulator's Saku process around the same 50-cycle loop.

### Attachment
none (harness/environment limitation, verified live via Appium MCP + host shell)

### Severity
Trivial (no app defect; the coverage gap is an environment limitation)

### Priority
P3 (nice-to-have; the Android run already covers the memory behaviour)

## Environment
- **Device/Emulator:** iPhone 18 Pro simulator, udid 80FCD259-BA75-4018-8FE6-31F4E812AD9B
- **Platform:** iOS 27.0
- **Appium version:** 3.8.0 (appium-xcuitest-driver 12.21.0)
- **App build:** Saku.app Debug (bundle `id.almezi.saku`)
- **Android API level:** n/a

## Fix Ownership
**AUTOMATION CODE.** No app defect — the measurement path simply does not exist inside the iOS
simulator. The follow-up is harness-side: an out-of-band script sampling the simulator's Saku.app
RSS from the host `ps` around the 50-cycle loop (the shape named under Expected Result), as a
backup for the incomplete Android run — `scripts/perf_memcycles.sh` last reached ~30/50 cycles
before emulator crashes (decision 2026-10-31, see progress.md 3.F).

## Additional Notes
The iOS spec documents the missing measurement path in its header, and the progress.md entry for
3.F lists TC-PERF-05 as skipped. The Android counterpart of this skip is recorded in
`BUG_Found_07.md` / the progress.md note for 3.F (50 UI-driven cycles vs the 180 s mocha timeout).

**Decision 2026-10-31:** the wdio skip on both platforms stands, and this report's priority
reasoning ("the Android run already covers the memory behaviour") is corrected — the Android
out-of-band run (`scripts/perf_memcycles.sh`) reached only ~30/50 cycles before three emulator
crashes, so no completed 50-cycle measurement exists on any platform. The host-`ps` RSS-sampling
script named under Expected Result remains the wanted follow-up (P3 stands), as a backup for the
incomplete Android run rather than a redundant twin.
