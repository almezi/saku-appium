# IOS_PHASE1_HANDOFF.md — iOS port: state + remaining work

> **Status as of 2026-10-27.** This file was originally written mid-port, when only Wave 1
> (TC-INC / TC-EXP) had landed. Since then the port has progressed through Phase 3.
> **Read the "Verified iOS facts" section below before touching any iOS code** — those
> findings are hard-won and will cost you a day to rediscover.
>
> Also read `AGENTS.md` (§ Android/iOS Twin Convention), `progress.md` (per-case status),
> and `TESTABILITY.md` (iOS sections).

## Where the port actually stands

**Done** — 8 iOS page objects and 14 iOS spec files, 117 passing test cases:

| Area | iOS spec | Status |
|---|---|---|
| 1.A Navigation | `src/tests/navigasi/navigation.ios.spec.ts` | 8/8 |
| 1.B Add income | `src/tests/tambah/add-income.ios.spec.ts` | 9/9 |
| 1.C Add expense | `src/tests/tambah/add-expense.ios.spec.ts` | 8/8 |
| 1.D Transaction list | `src/tests/transaksi/transaction-list.ios.spec.ts` | 9/9 (3 skipped by design) |
| 1.F Edit transaction | `src/tests/transaksi/edit-transaction.ios.spec.ts` | 8/8 |
| 2.A Budget | `src/tests/anggaran/budget.ios.spec.ts` | 11/11 |
| 2.B Categories | `src/tests/kategori/category-management.ios.spec.ts` | 13/13 |
| 2.C Backup | `src/tests/transaksi/backup.ios.spec.ts` | 5/5 (TC-BACKUP-04 skipped) |
| 3.A Validation | `src/tests/tambah/validation.ios.spec.ts` | 17/17 |
| 3.B Amount input | `src/tests/tambah/amount-input.ios.spec.ts` | 7/7 |
| 3.C Persistence | `src/tests/app/persistence.ios.spec.ts` | 5/5 |
| 3.D Rotation | `src/tests/app/rotation.ios.spec.ts` | 6/6 |
| 3.E Accessibility | `src/tests/app/accessibility.ios.spec.ts` | 7/7 |
| 3.F Performance | `src/tests/app/performance.ios.spec.ts` | 4/4 (+1 skipped) |

Page objects: `base`, `tambah`, `daftar`, `ringkasan`, `ubah`, `anggaran`, `kategori`,
`cadangan` — all eight exist as `*.ios.page.ts`.

**Not yet ported (Android-only):**

| Area | Android spec | Note |
|---|---|---|
| 1.E Summary | `src/tests/ringkasan/summary.spec.ts` | `ringkasan.ios.page.ts` exists but is unported — 13 cases |
| 1.G Delete / 1.H Undo | `src/tests/transaksi/delete-undo.spec.ts` | No iOS spec — 9 cases; the delete confirmation is a bottom sheet, whose iOS accessibility tree is the open risk (see below) |

## Environment (all verified 2026-10-27)

- Simulator: iPhone 18 Pro, UDID `80FCD259-BA75-4018-8FE6-31F4E812AD9B`, iOS 27.0, usually booted.
- App: Saku.app Debug, bundle `id.almezi.saku`, at
  `~/AndroidStudioProjects/SimpleMoneyTrackerKT/iosApp/build/DerivedData/Build/Products/Debug-iphonesimulator/Saku.app`
  (app repo = source inspection only; do not build/modify).
- Runner: `wdio.ios.conf.ts` (spawns own Appium :4725, XCUITest, driver-built WDA on
  wdaLocalPort 8100, noReset:false = clean DB per spec file, auto-sets DEVELOPER_DIR).
- Run a spec (ALWAYS detached — runs exceed the 10-min tool cap):
  `nohup npx wdio run ./wdio.ios.conf.ts --spec ./src/tests/tambah/add-income.ios.spec.ts > /tmp/<name>.log 2>&1 &`
  then poll `/tmp/<name>.log`. Session boot is 1–3 min (reinstall + WDA). Never kill early.
  Convenient aliases: `npm run test:ios` for the whole suite, plus a per-area alias
  (e.g. `npm run test:list:ios`) — see `README.md`.
- MCP (USER DIRECTIVE: use it to the max for speed): Appium MCP sessions attach to an
  EXTERNAL server on :4723 (`DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
  nohup npx appium server --port 4723 ... &` — the embedded MCP server cannot see the
  iOS SDK on this machine). Verify flows LIVE via MCP before codifying: appium
  select_device → prepare_ios_simulator → session create (remoteServerUrl=http://127.0.0.1:4723,
  caps: appium:app=<Saku.app path>, bundleId id.almezi.saku, udid, webDriverAgentUrl from
  prepare step) → find/gesture/page-source. Delete the MCP session before any wdio run
  (they share WDA). Port 8100/4725 busy after a killed run →
  `simctl terminate <udid> com.facebook.WebDriverAgentRunner.xctrunner` + `lsof -ti :8100 | xargs kill -9`.

## Verified iOS facts (do not re-derive)

- `testTag` → accessibilityIdentifier works; `iosByTag` = `$('~tag')` is the locator.
- Accessibility tree is lazy: first lookups after launch/app-switch 404 → waitForDisplayed generous.
- Element handles die on screen switches — always resolve fresh (iosByTag is lazy; never cache).
- TYPING WINNER: `element.addValue(text)` works on Compose fields. Keyboard opens;
  `driver.hideKeyboard()` THROWS ("Did not know how to dismiss the keyboard") — never call it.
  Dismissal that works: `addValue('\n')` (Return) into the field, or background/foreground.
  **Caveat:** iOS `setValue` APPENDS instead of replacing, so every write must clear the
  field first with a backspace burst.
- Currency fields live-format ("250000" → "Rp 250.000") → verify digits only ('digits' mode).
- **Compose renders a tagged container's strings as SIBLINGS on iOS.** A tagged node is an
  EMPTY `XCUIElementTypeOther`; its text sits in sibling nodes. Tree-only child queries
  return nothing — read by **geometry from one page-source dump** instead. The dump order
  is also not the visual order (a day header dumps weekday → total → date), so split the
  frame in half and read the left column first to restore the Android reading order.
  See `bugs/BUG_Found_13.md` and `src/helpers/elements.ts` (`iosStaticTexts`, `iosTextsInRect`,
  `iosColumnTexts`).
- The Material3 date picker labels its day cells in the **device's** day-first order
  ("Monday, 26 October 2026"), so `Intl.DateTimeFormat('en-US')` never matched — match
  both renderings. See `bugs/BUG_Found_11.md`.
- There is **no `component_toast` tag on iOS** — the save is confirmed by the **form reset**
  (amount cleared + save re-disabled), which is what the Android TC-INC-08 also asserts.
- The numeric keypad's Delete key is a silent no-op after the category sheet closes (the
  dismissed keyboard lingers in the tree with `visible="false"`). Use the hardware
  backspace (U+E003), the twin of Android's DEL keycode 67. See `bugs/BUG_Found_14.md`.
- The app is **PORTRAIT-ONLY** (`UISupportedInterfaceOrientations`) and WDA **cannot rotate**
  an iOS simulator — the W3C orientation endpoint answers "Unable To Rotate Device" and
  `mobile: rotate` is not implemented by appium-xcuitest-driver 12.21. Rotation cases are
  driven through the config changes iOS actually delivers: `mobile: setAppearance` (live),
  `mobile: setContentSize` (picked up by the Compose tree only on the next launch, so the
  font case restarts the app) and `mobile: backgroundApp` (`driver.background()` is not
  implemented for XCUITest).
- WDIO's `isClickable()` **THROWS** in a mobile native context ("Method not supported in
  mobile native environment") — use the `hittable` attribute plus the "Button" trait.
- The tap-target floor is Apple's **44 pt** (HIG), not Android's 48 dp.
- `mobile: scrollGesture` is not implemented by appium-xcuitest-driver 12.21 — a sweep uses
  `mobile: scroll`.
- `dumpsys meminfo` has no simulator counterpart, so TC-PERF-05 cannot run on iOS
  (`bugs/BUG_Found_12.md`).
- iOS interaction budgets sit at ~2× Android's because every interaction crosses the WDA
  boundary (a tap alone costs ~0.4 s) — the iOS budgets are 1.5 s / 2 s / 8 s.

## Remaining work

### 1.E TC-SUM — Summary (13 cases) — not ported

`ringkasan.ios.page.ts` exists but has never been exercised. Port `summary.spec.ts` to
`summary.ios.spec.ts` using `ringkasan.ios.page.ts` + `iosReadAmount`.

- MCP-verify live **first**: the breakdown rows, the month switcher, and the savings "—"
  case (income 0 renders "—" with the hint "Tambah pemasukan…", not "0,0%").
- Android facts that need an iOS counterpart: breakdown bars are untagged container+fill
  Views (the share is `fill width / container width`, 80 % → 712 px of 890 px); an empty
  month hides balance/savings/comparison/breakdown/buttons entirely and shows
  `ringkasan_empty_state` + `ringkasan_empty_action`.
- **Risk:** the sibling-string rendering (above) applies to the breakdown rows. Expect to
  reuse `iosColumnTexts` / `iosTextsInRect` rather than the Android child-text reads.

### 1.G / 1.H TC-DEL + TC-UNDO (delete-undo.ios.spec.ts, 9+3 cases) — not ported

- **Spike the delete sheet FIRST via MCP.** The delete confirmation is a bottom sheet;
  `TESTABILITY.md` flags sheets as OPEN for iOS because they may expose an empty
  accessibility tree. If the tree is empty, file a bug (Blocker for these cases, P1),
  mark the cases `~[BUG]~` in `progress.md`, and continue with the rest.
- Note the sheet root is `daftar_delete_sheet` (not the documented `component_sheet_bottom`,
  which does not exist in v2.2) and the empty list drops the summary cards in favour of
  `daftar_empty_state`.
- The Android delete sheet was confirmed to open over a pending undo toast, so
  back-to-back deletes are safe.
- Android's toast-expiry wait uses a plain 6 s pause because the toast node can linger
  composed after its 5 s expiry — the iOS equivalent probably differs (there is no toast
  tag at all), so verify the undo affordance's lifetime live.

### Regression gate

After either port lands:

1. Run the affected iOS spec detached until green (one spec per run, then the set).
2. Run **all** iOS specs in ONE invocation as the final check — the Phase 3 set ran as
   6/6 spec files, 46 passing + 1 skipped in 13m 14s.
3. Append a `progress.md` note in the established style (date, device, X/N, gotchas).
4. `npm run typecheck` must pass; `npm run test:unit` if money helpers were touched.
5. Conventional Commits, explicit `git add` paths only. No push.

## Rules (from AGENTS.md — enforced)

- Tags only (text locators = documented exceptions only, and `src/config/category-labels.ts`
  is the only one). Bounded retries (3).
- 3 consecutive failures ⇒ skip case, `~[BUG]~` in progress.md, next `BUG_Found_NN.md`,
  continue. Never skip silently.
- Log failures to terminal + `test-cases-simple-money-tracker.md`.
- **Add the iOS twin whenever you add or change an Android screen method or test case.**
- `npm run typecheck` must pass; `npm run test:unit` if money helpers touched.
- Conventional Commits; never commit `reports/`, screenshots, `node_modules`, `.kilo/`,
  `.idea/`, spike/diag files. No push.
- ⚠️ `wdio.ios.conf.ts` is **not** covered by `npm run typecheck` (`tsconfig.json` includes
  only `src/**/*.ts` and `wdio.conf.ts`) — see `code_review.md` finding **S1**.

## Parked, NOT yours (uncommitted, another task's work — leave alone)

The Android-side edits inside `src/helpers/input.ts`
(setValueIntoTaggedField), `src/pageobjects/kategori.page.ts`, `src/pageobjects/daftar.page.ts`
(swipeList). TC-LIST-11 is no longer parked work: it was retired on 2026-10-27 across
`transaction-list.spec.ts`, `transaction-list.ios.spec.ts`, the catalog, `progress.md`
and `bugs/BUG_Found_09.md`. When committing iOS work, `git add` explicit paths only.
