# Simple Money Tracker Project

This project includes end-to-end test cases for the Simple Money Tracker mobile app, generated via Appium MCP, plus an automated **Appium + WebdriverIO + TypeScript** suite (see below).

## Automated E2E suite (WebdriverIO + Appium + TypeScript)

The executable suite lives in `src/`. It drives the Android app (UiAutomator2) through the test-tag contract in `TESTABILITY.md` — every interaction locates elements by test tag (rendered as resource-ids via `testTagsAsResourceId`), never by visible text.

### Prerequisites

- Node.js ≥ 22 (`.nvmrc` pins `24`; `package.json` requires `>=20`) and Android emulator(s)/device(s) connected via `adb` (default udid `emulator-5554`; select devices with `SAKU_DEVICES` or the legacy `ANDROID_UDID`/`REAL_DEVICE_UDID`)
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

### Run — iOS (Simulator)

The suite is **dual-platform**. Every Android screen has an iOS twin (`*.ios.page.ts` +
`*.ios.spec.ts`) driven through a separate config, `wdio.ios.conf.ts`.

```bash
npm run test:ios           # all iOS specs against a booted simulator
npm run test:navigasi:ios  # single iOS spec
npm run test:list:ios      # transaction list
npm run test:edit:ios      # edit transaction
npm run test:backup:ios    # backup & export
```

iOS needs macOS + Xcode, a booted simulator (`xcrun simctl list devices`), and the
XCUITest driver — `npm run test:ios` starts its own Appium server. Per-spec iOS
shortcuts exist for `list`, `edit`, `backup`, `val`, `amt`, `pers`, `rot`, `perf`,
`a11y`, `anggaran`, `kategori`, and `navigasi`.

**`wdio.ios.conf.ts` is not covered by `tsc --noEmit`** — `tsconfig.json` includes only
`src/**/*.ts` and `wdio.conf.ts`. Run `npm run typecheck` with that file added before
trusting the iOS config. See `code_review.md` finding **S1**.

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
wdio.ios.conf.ts      runner config (iOS/XCUITest caps, simulator) — NOT typechecked
src/config/tags.ts    test-tag contract, mirrors TestTags.kt (single source: the app repo)
src/config/categories.ts      stable category/account IDs (TESTABILITY.md § CATEGORIES)
src/config/category-labels.ts the one text-based exception; states its removal condition
src/helpers/          tag locators, rupiah formatting/parsing, transaction factory
src/pageobjects/      Tambah, Daftar, Ringkasan, Ubah, Anggaran, Kategori, Cadangan pages
src/tests/navigasi/    TC-NAV navigation smoke (bottom bar, back, rapid switching)
src/tests/tambah/      Tambah form flows: TC-INC, TC-EXP
src/tests/transaksi/   Transaksi list flows: TC-LIST, TC-EDIT, TC-DEL/TC-UNDO, TC-BACKUP
src/tests/ringkasan/   Ringkasan flows: TC-SUM
src/tests/anggaran/    Anggaran/budget flows: TC-BUDGET
src/tests/kategori/    Kelola kategori flows: TC-KAT
src/tests/app/         TC-PERS, TC-ROT, TC-A11Y, TC-PERF + a11y-parse helpers
```

**The Android/iOS twin convention** — each screen that exists on both platforms has a
paired pair of files:

```
src/pageobjects/tambah.page.ts      ←→  src/pageobjects/tambah.ios.page.ts
src/tests/tambah/add-income.spec.ts ←→  src/tests/tambah/add-income.ios.spec.ts
```

The two halves are **independent implementations**, not generated from a shared base.
They are expected to expose the same public method surface, but today they have drifted
(see `code_review.md` § Maintainability, findings M1–M4). When you add a screen
method, add it to **both** twins.

Current scale: **30 spec files** (16 Android + 14 iOS), **254 test cases**
(137 Android + 117 iOS), **16 page objects** (8 screens × 2 platforms), **148 unique
test-case IDs** across 19 prefixes, **6 helper modules** (+ 2 unit-test files under
`src/helpers/__tests__/`), and **3 config modules**.

### Notes

- Test data setup goes through the real UI (`createTransaction` helper). The `test_seed` / `test_now` intent extras in TESTABILITY.md are not implemented in the app yet; seed-based specs (TC-SEED) wait on that.
- Execution status per sub-phase lives in `progress.md`. Known issues are filed as `BUG_FOUND.md` … `BUG_Found_14.md`; see `code_review.md` for the current state of each.
- **Two Android specs have no iOS twin**: `transaksi/delete-undo.spec.ts` (destructive flow) and `transaksi/backup.spec.ts` has one but with different case coverage (`TC-BUDGET` vs `TC-BUD` prefix divergence — see M3).

## Generated test cases

**Files**: `test-cases-simple-money-tracker.md` (catalogue), `TESTING.md` (data, execution, results)
- **195 catalogue test cases across 25 areas**
- Covers all screens: Tambah (Add), Transaksi (List), Ringkasan (Summary), Kelola Kategori, and Anggaran (Budget)
- Includes navigation, form validation, data persistence, accessibility, performance, and edge cases
- Locators verified via live page source (xpath fallback used where id strategy failed)
- **148 of these ids are implemented** in `src/tests/` (254 cases, 30 spec files, both platforms)

## Legacy: Appium MCP exploration (historical)

The catalogue in `test-cases-simple-money-tracker.md` was originally produced by exploring
the live app UI through Appium MCP tools (OpenCode + exa + appium-mcp). That workflow is
**no longer the primary path** — the executable WDIO suite in `src/` replaced it. It is
retained here for provenance:

1. Boot an Android emulator with the app installed.
2. Drive the app via MCP: `appium_session_management` (action=create) → implicit launch →
   `appium_generate_tests`.
3. Each generated case maps to a user flow (tap, type, verify UI state).

The same MCP tooling is still used for **interactive triage** — when a WDIO failure needs
a live look at the page source, the MCP session is the fastest way in.

## Features covered

- **Core flows**: add income/expense, edit, delete, category selection, account/date picking
- **Navigation**: bottom tab switching, month switcher, back navigation
- **Data consistency**: cross-screen sync, persistence across app restarts
- **Validation**: amount formatting, save button state, empty field handling
- **Advanced**: budget management, category management, accessibility, performance

## Note

Test cases were generated by exploring the live app UI (page source) and extracting resource-ids, text, and accessibility labels. Some Compose screens (Kelola Kategori, Anggaran) have limited IDs; those cases use text locators.

The catalogue in `test-cases-simple-money-tracker.md` remains plain markdown for easy
documentation; the cases that have been automated now live as executable WDIO specs in
`src/tests/`.

---

## iOS Appium via MCP — Setup & Runbook (interactive triage)

> This section covers **MCP-driven interactive** iOS work, which is different from
> `npm run test:ios` (the scripted WDIO suite). Use MCP when you need to poke at the app
> by hand or inspect a live page source; use `npm run test:ios` to run the suite.

### Prerequisites
- macOS with Xcode installed
- iOS Simulator available (run `xcrun simctl list devices` to see devices)
- Appium MCP server (embedded mode used by this MCP)

### Quick Start (iOS Simulator)
Use the UDID of your simulator. Example below uses `80FCD259-BA75-4018-8FE6-31F4E812AD9B` (iPhone 18 Pro).

#### Step 0 — Appium server
- **Local/embedded mode:** No separate Appium server to start — the MCP hosts the driver internally.
- **Remote mode:** Only if explicitly using a remote Appium server URL, pass `remoteServerUrl`.

#### Step 1 — Select the iOS simulator device
```json
{
  "tool": "appium_select_device",
  "params": {
    "platform": "ios",
    "iosDeviceType": "simulator",
    "deviceUdid": "80FCD259-BA75-4018-8FE6-31F4E812AD9B"
  }
}
```

#### Step 2 — Boot simulator + launch WebDriverAgent (WDA)
```json
{
  "tool": "appium_prepare_ios_simulator",
  "params": {
    "udid": "80FCD259-BA75-4018-8FE6-31F4E812AD9B"
  }
}
```
- First attempt may time out launching WDA; retry if needed.
- On success: WDA ready at `http://127.0.0.1:51606` (port may vary).

#### Step 3 — Create the Appium session
```json
{
  "tool": "appium_session_management",
  "params": {
    "action": "create",
    "platform": "ios",
    "capabilities": "{\"appium:webDriverAgentUrl\": \"http://127.0.0.1:51606\"}"
  }
}
```
- Creates an iOS session via XCUITest. Session ID will be returned (e.g., `abb1f7c0-c367-41e7-b8f3-158313515788`).

#### Step 4 — (Optional) Install your app
```json
{
  "tool": "appium_app_lifecycle",
  "params": {
    "action": "install",
    "path": "/absolute/path/to/YourApp.app"
  }
}
```

#### Step 5 — Start automating
Now you can use the Appium MCP tools to drive the simulator:
- `appium_find_element` / `appium_find_elements` — locate elements
- `appium_gesture` — taps, scrolls, swipes, etc.
- `appium_screenshot` — capture screen
- `appium_get_page_source` — inspect XML
- `appium_generate_locators` — generate locator candidates

### Execution Order
`Step 1 → Step 2 → Step 3 → (Step 4 optional) → Step 5`

### Current Live Setup (example)
- Device: iPhone 18 Pro (`80FCD259-BA75-4018-8FE6-31F4E812AD9B`)
- WDA: `http://127.0.0.1:51606`
- Session ID: `abb1f7c0-c367-41e7-b8f3-158313515788`
- Platform: iOS / Automation: XCUITest

---

## Documentation map

| File | What it is | Read it when |
|---|---|---|
| `README.md` | This file — layout, commands, iOS runbook | You just cloned the repo |
| `HANDOVER.md` | Guided onboarding for a new SDET/QA engineer | Your first day on the project |
| `AGENTS.md` | Operating rules for AI coding agents | An agent is about to edit this repo |
| `TESTABILITY.md` | **The test-tag contract** — source of truth for locators | Before writing any locator |
| `UI_SPEC.md` | Screen-by-screen behaviour of the app | Before asserting on the UI |
| `test-cases-simple-money-tracker.md` | Catalogue of 195 designed test cases | Planning coverage |
| `TESTING.md` | Test data, execution procedure, recorded results | Running or triaging a suite |
| `progress.md` | Execution checklist (`[x]` / `[ ]` / `~[BUG]~`) | Checking what has run |
| `code_review.md` | Senior QA review — structure, conventions, maintainability | Before refactoring; see **S1**–**S22**, **M1**–**M14** |
| `pr_review.md` | Review of PR #3 (historical) | Looking back at that PR |
| `IOS_PHASE1_HANDOFF.md` | iOS Phase 1 port handoff notes | Continuing the iOS port |
| `BUGS.md` | Index of all 14 filed defects (newest last) | A test fails and you need precedent |
| `BUG_FOUND.md` … `BUG_Found_14.md` | The 14 bug reports themselves | Full reproduction steps for one defect |
| `docs/` | Product/design/development docs (see `docs/README.md`) | Understanding the app itself |
| `improve/` | Design package — design system and screen specs | Doing UI work |
