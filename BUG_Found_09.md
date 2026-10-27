# BUG_Found_09.md — Bug Report 09

## Status
- **State:** Closed
- **Summary:** Retired, not fixed — pull-to-refresh is simply not implemented in the app, so TC-LIST-11 was withdrawn from the catalogue rather than left failing.

## Identity

- **Reported by:** ZCode (GLM-5.3) — senior QA run, Phase 1.D completion
- **Reported at:** 2026-10-27T08:20:00+07:00
- **Branch:** harness `feature/implement-ios-automation`
- **Commit SHA:** (harness working tree at time of report)

## Test Context

- **Phase:** 1
- **Sub-phase:** 1.D (Transaction List)
- **Test case ID:** TC-LIST-11
- **Spec file:** `src/tests/transaksi/transaction-list.spec.ts`

## Bug Details

- **Title:** Pull-to-refresh is not implemented on the Transaksi screen — TC-LIST-11 tests a feature the app does not have
- **Description:** The test-case catalog (`test-cases-simple-money-tracker.md` §J, "TC-LIST-11 Pull-to-refresh → data still correct") assumes the Transaksi (daftar) list supports pull-to-refresh. A source sweep of the entire Compose Multiplatform app (`composeApp/src/**` for `PullToRefresh`, `pullRefresh`, `PullRefresh`) returns zero matches, and `daftar_screen` exposes no refresh affordance, tag, or gesture handler in TESTABILITY.md's tag contract. There is nothing to trigger and nothing to verify — the case cannot pass against this build.
- **Steps to Reproduce:**
  1. Open the app, go to Transaksi with any data.
  2. Swipe down from the middle of the list.
  3. Observe: the list rubber-bands (normal LazyColumn overscroll); no refresh indicator, no data reload.
- **Actual Result:** No pull-to-refresh behavior exists on `daftar_screen`.
- **Expected Result (per catalog):** Pull-to-refresh reloads the list and the data stays correct.
- **Attachment:** grep transcript (2026-10-27, app repo branch `feature/fix-bug-detected-by-automation-261026`); spec source comment in `transaction-list.spec.ts` TC-LIST-11.
- **Severity:** Minor — no user-facing defect; a documented capability is absent and a catalogued test cannot run.
- **Priority:** P3 — product decision needed, does not block testing.

## Environment

| Field | Value |
|---|---|
| **Device/Emulator** | emulator-5554 (Pixel 10-class, API 37) |
| **Platform** | Android 16 (API 37 emulator image) |
| **Appium version** | 3.8.0 (wdio-managed, port 4725) |
| **App build** | SimpleMoneyTrackerKT v2.2 APK (`resources/SimpleMoneyTrackerKT-v2.2.apk`) |
| **Android API level** | 37 |

## Additional Notes

- Disposition taken per AGENTS.md retry/bug protocol: TC-LIST-11 is marked skipped with `~[BUG]~` in `progress.md`; the spec's `it.skip` carries a comment pointing here. No "swipe only" substitute pass was fabricated.
- Options for the app owner: ① implement pull-to-refresh on `daftar_screen` (then the existing `it.skip` body — kept current with the suite's data model — can be un-skipped unchanged, expected sums included), or ② retire TC-LIST-11 from the catalog and remove the skip block. **The app owner chose ② on 2026-10-27** (see Resolution).
- Related: the earlier TC-LIST-11 failures (5×, 2026-10-24) were logged as cascades of TC-LIST-07/08 seeds; with those two now unblocked, the feature-missing root cause is the only remaining blocker for this case.

## Resolution

| Field | Value |
|---|---|
| **Resolved at** | 2026-10-27 |
| **Decision by** | App owner |
| **Harness change** | TC-LIST-11 removed from the catalog and both specs |

Pull-to-refresh was rejected as a product change rather than deferred. The app's
`UI_SPEC.md` §7 now lists it under Out of scope, with the reason: the Transaksi
list is backed by a reactive Room `Flow`, so there is no remote fetch to
re-trigger and a refresh gesture would be a no-op dressed up as a feature.

Changes made in this repo:

- `test-cases-simple-money-tracker.md` §J — TC-LIST-11 struck through with the
  retirement note, so it is not silently re-added later.
- `src/tests/transaksi/transaction-list.spec.ts` — the `it.skip` body and its
  `~[BUG]~` comment block removed (18 lines).
- `src/tests/transaksi/transaction-list.ios.spec.ts` — the iOS placeholder
  `it.skip` removed.
- `progress.md` §1.D — case set corrected to 10, TC-LIST-11 marked retired
  rather than skipped.
- `npm run typecheck` passes after the removals.

No app code changed for this bug. It stays on record per AGENTS.md
("do not delete BUG_FOUND.md files").
