# BUG_Found.md — Bug Report

## Identity
- **Reported by:** Kilo (senior QA agent)
- **Reported at:** 2026-10-26T00:17:00Z
- **Branch:** features/phase3
- **Commit:** c78728a

## Test Context
- **Phase:** 3
- **Sub-phase:** 3.F
- **Test case ID:** TC-PERF-05
- **Spec file:** src/tests/app/performance.spec.ts

## Bug Details
### Title
TC-PERF-05 memory test fails: category_pager element not found on Tambah screen after navigating from Daftar

### Description
TC-PERF-05 ("memory stays stable across 50 add/delete cycles") consistently fails when `createTransaction()` → `TambahPage.selectCategory()` tries to click `tambah_category_pager`. The element is not found even after WDIO's default 15s element wait. Root cause: `tambah_screen` tag is displayed (waitForScreen passes) but child Compose fields (including `tambah_category_pager`) have not yet composed when `selectCategory` attempts the click. This is a composition race on screen transition from Daftar → Tambah.

### Steps to Reproduce
1. Run `TEST_GREP=TC-PERF-05 npx wdio run ./wdio.conf.ts --spec ./src/tests/app/performance.spec.ts`
2. Test navigates to Daftar screen, then calls `createTransaction()` which navigates to Tambah
3. `TambahPage.fillForm()` → `selectCategory()` clicks `tambah_category_pager`
4. Click fails: element not found

### Actual Result
```
Error: Can't call click on element with selector "android=new UiSelector().resourceId("tambah_category_pager")" because element wasn't found
    at async TambahPage.selectCategory (tambah.page.ts:74:7)
```
Failed 3 consecutive attempts (retry limit reached per AGENTS.md).

### Expected Result
TC-PERF-05 should complete 50 add/delete cycles and assert memory growth < 15%.

### Attachment
WDIO session IDs: 692aa2ad-164d-464e-8da3-431c55cc60fd, 54027985-b43e-4446-811e-912a2cc3ee9c, fe8e5901-9113-41cf-9791-083ad6160195

### Severity
Major

### Priority
P1

## Environment
- **Device/Emulator:** emulator-5554
- **Platform:** Android
- **Appium version:** 3.x (@wdio/appium-service ^9.0.0)
- **App build:** SimpleMoneyTrackerKT-v2.2.apk
- **Android API level:** 34

## Additional Notes
- TC-PERF-01–04 were previously MCP-verified and passing (per progress.md spec header comments)
- TC-PERF-05 shares the same spec file; the failure is specific to the category pager composition race when transitioning from Daftar to Tambah within the same test
- Workaround: add a waitForDisplayed on `tambah_category_pager` (or `tambah_input_amount`) with a retry before clicking in `TambahPage.selectCategory()`, or add a small pause after `tambah.open()` before `fillForm()`
- Related: HANDOVER.md §8 documents this as a known pitfall ("First field lookup fails on a cold start → the screen tag exists but the field is still composing")
- Appium MCP was also used to manually execute cycle 1 of 50 (successful), but instrumentation crashed on cycle 2, confirming UI-automation-level instability for long 50-cycle runs via individual MCP calls
