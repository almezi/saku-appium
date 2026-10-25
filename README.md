# Simple Money Tracker Project

This project includes end-to-end test cases for the Simple Money Tracker mobile app, generated via Appium MCP, plus an automated **Appium + WebdriverIO + TypeScript** suite (see below).

## Automated E2E suite (WebdriverIO + Appium + TypeScript)

The executable suite lives in `src/`. It drives the Android app (UiAutomator2) through the test-tag contract in `TESTABILITY.md` — every interaction locates elements by test tag (rendered as resource-ids via `testTagsAsResourceId`), never by visible text.

### Prerequisites

- Node.js ≥ 22 and Android emulator(s)/device(s) connected via `adb` (default udid `emulator-5554`; select devices with `SAKU_DEVICES` or the legacy `ANDROID_UDID`/`REAL_DEVICE_UDID`)
- The app APK at `resources/SimpleMoneyTrackerKT-v2.2.apk` (override with `SAKU_APK`, e.g. to point at a debug build)
- Appium is installed automatically with `npm install` — no global install needed

### Run

```bash
npm install
npm test          # all specs
npm run test:navigasi
npm run test:tambah
npm run test:transaksi
npx wdio run ./wdio.conf.ts --spec ./src/tests/tambah/add-income.spec.ts   # single spec

# Parallel across devices (≥ 2 devices required):
export SAKU_DEVICES="emulator-5554,140892554V003873"   # udids from `adb devices -l`
npm run test:shard      # speed: split spec files across devices (~2x faster wall time)
npm run test:parallel   # coverage: run every spec on every device
```

Each spec file runs in a fresh Appium session with clean app data (`appium:noReset = false`), so specs are isolated. Failure screenshots land in `reports/screenshots/`.

### Parallel runs

Devices come from `SAKU_DEVICES` (comma-separated UDIDs, any count; each device gets its own uiautomator2 `systemPort` = 8200 + index). The legacy `ANDROID_UDID` + `REAL_DEVICE_UDID` pair still works. Two modes:

- **Shard** (`npm run test:shard`) — spec files are partitioned round-robin across devices, so with 2 devices the suite finishes in roughly half the wall time. Each spec still runs exactly once.
- **Matrix** (`npm run test:parallel`) — every spec runs on every device, for cross-device coverage; wall time stays about the same as a single device.

Both fail fast if fewer than two devices are configured.

By default the runner spawns **one shared Appium server** (port 4725) for all devices — device isolation comes from per-device `appium:systemPort`. To use **one dedicated Appium server per device** instead (full process isolation), run them yourself and point the suite at them:

```bash
npm run appium:server1 &   # terminal 1: port 4723 → first SAKU_DEVICES entry
npm run appium:server2 &   # terminal 2: port 4725 → second entry
SAKU_APPIUM_PORTS="4723,4725" SAKU_DEVICES="emulator-5554,140892554V003873" npm test
```

`SAKU_APPIUM_PORTS` must list one port per device; the servers must use `--base-path=/wd/hub` (the npm scripts do, and they export a default `ANDROID_HOME` if your shell doesn't).

### Layout

```
wdio.conf.ts          runner config (Android caps, Appium service, Mocha)
src/config/tags.ts    test-tag contract, mirrors TestTags.kt (single source: the app repo)
src/config/categories.ts   stable category/account IDs (TESTABILITY.md § CATEGORIES)
src/helpers/          tag locators, rupiah formatting/parsing, transaction factory
src/pageobjects/      Tambah, Daftar, Ringkasan, Ubah, Anggaran, Kategori, Cadangan pages
src/tests/navigasi/    TC-NAV navigation smoke (bottom bar, back, rapid switching)
src/tests/tambah/      Tambah form flows: TC-INC, TC-EXP
src/tests/transaksi/   Transaksi list flows: TC-LIST, TC-EDIT, TC-DEL/TC-UNDO, TC-BACKUP
src/tests/ringkasan/   Ringkasan flows: TC-SUM
src/tests/anggaran/    Anggaran/budget flows: TC-BUDGET
src/tests/kategori/    Kelola kategori flows: TC-KAT
```

### Notes

- Test data setup goes through the real UI (`createTransaction` helper). The `test_seed` / `test_now` intent extras in TESTABILITY.md are not implemented in the app yet; seed-based specs (TC-SEED) wait on that.
- Execution status per sub-phase lives in `progress.md` (2026-10-25: Phase 1 64/67, Phase 2 30/32 — TC-BACKUP executed 4/6 with two blockers bug-filed, Phase 3 pending). Phase 3 cases (validation, persistence, a11y, performance) are catalogued in `test-cases-simple-money-tracker.md` and follow the same page-object pattern. Known issues: `BUG_FOUND.md` (TECNO real-device deadlock), `BUG_Found_02.md` (SAF picker drive), `BUG_Found_03.md` (vanishing committed transaction).

## Generated test cases

**Files**: `test-cases-simple-money-tracker.md` (cases), `TESTING.md` (data, execution, results)
- 140+ test cases across 22 areas
- Covers all screens: Tambah (Add), Transaksi (List), Ringkasan (Summary), Kelola Kategori, and Anggaran (Budget)
- Includes navigation, form validation, data persistence, accessibility, performance, and edge cases
- Locators verified via live page source (xpath fallback used where id strategy failed)

## How to run (plan)

The test cases can be executed using Appium MCP tools in a mobile automation harness (e.g., OpenCode with exa + appium-mcp).

1. Ensure an Android device/emulator is running Pixel 10 with the app installed
2. Use Appium MCP to:
   - Create an Android session (`appium_session_management` action=create)
   - Launch the app (implicit launch)
   - Execute the test cases via the test generation tool (`appium_generate_tests`)
3. Each test case maps to a specific user flow (tap, type, verify UI state)

## Features covered

- **Core flows**: add income/expense, edit, delete, category selection, account/date picking
- **Navigation**: bottom tab switching, month switcher, back navigation
- **Data consistency**: cross-screen sync, persistence across app restarts
- **Validation**: amount formatting, save button state, empty field handling
- **Advanced**: budget management, category management, accessibility, performance

## Note

Test cases were generated by exploring the live app UI (page source) and extracting resource-ids, text, and accessibility labels. Some Compose screens (Kelola Kategori, Anggaran) have limited IDs; those cases use text locators.

All test cases are written in markdown for easy documentation and can be converted to automated scripts (e.g., Espresso, XCUITest, or Appium Java client).

---

*Generated via Appium MCP exploration and comprehensive test case catalog.*
# saku-appium
