# IOS_PHASE1_HANDOFF.md — iOS Phase 1 port: state + TODO

> Written 2026-10-27 after the Wave-1 agent hit its quota limit mid-run.
> Pick up from here. Read AGENTS.md, progress.md (§1.A iOS note), TESTABILITY.md
> (iOS sections), and this file before touching code.

## Mission

Port Phase 1 (sub-phases 1.B–1.H, 59 test cases) of the Saku suite to iOS.
1.A (TC-NAV) is DONE: 8/8 passing (`src/tests/navigasi/navigation.ios.spec.ts`,
`npm run test:navigasi:ios`). Android Phase 1 is complete and must stay green —
all iOS work is ADDITIVE (new `*.ios.*` files / `ios*` exports).

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
- TYPING WINNER: `element.addValue(text)` works on Compose fields (verified in diag2:
  amount + note both take text). Keyboard opens; `driver.hideKeyboard()` THROWS
  ("Did not know how to dismiss the keyboard") — never call it. Dismissal that works:
  `addValue('\n')` (Return) into the field, or background/foreground.
- Currency fields live-format ("250000" → "Rp 250.000") → verify digits only ('digits' mode).
- Day-header/row child texts: read via `iosExtractChildTexts` (XCUIElementTypeStaticText
  predicate) — already implemented and used by the daftar.ios page.

## Current state (Wave 1 = 1.B TC-INC + 1.C TC-EXP) — ~90% done

DONE:
- iOS page objects: `src/pageobjects/base.ios.page.ts`, `tambah.ios.page.ts`,
  `daftar.ios.page.ts`, `ringkasan.ios.page.ts`, `ubah.ios.page.ts`.
- iOS helpers: `iosTypeIntoTaggedField` / `iosFieldText` / `iosFieldEditor`
  (src/helpers/input.ts), `iosExtractChildTexts` / `iosReadAmount` / `iosAmountText`
  (src/helpers/elements.ts), `createTransactionIos` (src/helpers/transactions.ts).
- Specs: `src/tests/tambah/add-income.ios.spec.ts` (9 cases),
  `src/tests/tambah/add-expense.ios.spec.ts` (8 cases) — full ports of the Android specs.
- Throwaway probe `src/tests/tambah/diag.ios.spec.ts` (diag2 PASSED — keyboard findings above).
- Run history: run1 8/9 + 7/8 (keyboard dismiss) → runs 3–4 typing regression → run 5
  typing FIXED, new sole failure in each spec: **`component_toast` still not displayed
  after 10000ms** after tapping `tambah_button_save`.

## THE remaining Wave-1 blocker: save → toast not found

`tambah.ios.page.ts:165 save()` = click save + `iosByTag(tags.component.toast).waitForDisplayed(10s)`.
Run 5 shows the toast never surfaces. Hypotheses (in test order):
1. The toast exists but its `component_toast` tag does not surface on iOS (tag drift —
   like Android's sheet drift; the toast may expose only label text e.g. "Transaksi disimpan").
2. The save click didn't register (keyboard state? button covered?).
3. The toast composes/expires faster than the wait can catch (or is announced, not displayed).
FASTEST PATH (user directive): with a seeded valid form, tap save via MCP and dump
`getPageSource` immediately + 1s/2s/3s after; grep the XML for "toast"/"disimpan"/the
confirmation text. Then fix accordingly:
- Tag drift → locate by what actually exposes (document the exception), or
- Save not registering → verify via isSaveEnabled + alternative confirmations
  (form reset = amount cleared + save re-disabled is ALSO a valid save signal; the
  Android TC-INC-08 asserts form reset), or
- Timing → poll existence not displayed.

## TODO — Wave 1 completion (do FIRST)

- [ ] MCP: live-drive one save; page-source around the toast window; identify cause (above).
- [ ] Fix `tambah.ios.page.ts save()` accordingly (keep a toast assert if possible; a
      form-reset assertion is an acceptable substitute — mirror Android TC-INC-08).
- [ ] Green runs: `add-income.ios.spec.ts` 9/9, `add-expense.ios.spec.ts` 8/8 (detached runs;
      triage via /tmp logs + reports/screenshots/ios-*.png + reports/appium-ios-wdio.log).
- [ ] DELETE `src/tests/tambah/diag.ios.spec.ts` before committing.
- [ ] progress.md: append iOS notes to §1.B and §1.C (date 2026-10-27, device, X/9 + X/8,
      gotchas incl. typing winner + toast resolution) in the established style.
- [ ] Commit ONLY iOS files: `git add src/pageobjects/*.ios.page.ts
      src/helpers/input.ts src/helpers/elements.ts src/helpers/transactions.ts
      src/tests/tambah/add-income.ios.spec.ts src/tests/tambah/add-expense.ios.spec.ts
      progress.md` → `test(tambah): port TC-INC/TC-EXP to iOS`. DO NOT add the parked
      Android files (below). No push.

## TODO — Wave 2 (1.D, 1.F, 1.G, 1.H — 29 cases), MCP-first

For each: MCP-drive the flow live first (page-source evidence for every new interaction),
then port the Android spec 1:1 as `<name>.ios.spec.ts` in the same folder, then one
detached green run, then progress.md note + commit `test(<folder>): port <AREA> to iOS`.
- [ ] 1.D TC-LIST (10 cases; src/tests/transaksi/transaction-list.ios.spec.ts) — port from
      transaction-list.spec.ts; SKIP-list: 07/08 stay skipped on iOS with a pointer to
      the same dispositions as Android (07/08: seeded-in-form cost + dialog). TC-LIST-11
      was retired on 2026-10-27 (pull-to-refresh is out of scope in the app's UI_SPEC §7 —
      see BUG_Found_09.md), so there is nothing left to port for it. Month switcher verify-retry and
      raw-swipe scroll: port from daftar.page.ts (daftar.ios.page.ts already has swipes).
- [ ] 1.F TC-EDIT (8 cases; edit-transaction.ios.spec.ts) — ubah.ios.page.ts exists
      (untested). Watch: prefill reads, "Simpan perubahan" disabled-until-changed.
- [ ] 1.G TC-DEL + 1.H TC-UNDO (delete-undo.ios.spec.ts, 9+3 cases) — RISK: delete
      confirmation is a bottom sheet (TESTABILITY.md OPEN: sheets may expose an empty
      accessibility tree on iOS). MCP-spike the delete sheet FIRST; if the tree is empty,
      file BUG_Found_10.md (Blocker for these cases, P1) + mark the cases ~[BUG]~ and
      continue with the rest.
- [ ] Full Wave-2 regression: all iOS specs green in one run; progress.md updates; commits.

## TODO — Wave 3 (1.E TC-SUM — 13 cases)

- [ ] summary.ios.spec.ts (src/tests/ringkasan/) — port from summary.spec.ts using
      ringkasan.ios.page.ts + iosReadAmount; MCP-verify breakdown rows + month switcher
      + savings "—" case live first. Note Android facts: breakdown bars are untagged
      container+fill Views (ratio via width) — verify the iOS equivalent via MCP before
      porting TC-SUM-09.
- [ ] Final Phase 1 iOS regression: every *.ios.spec.ts green; update progress.md Quick
      Summary with an iOS line; final commit.

## Rules (from AGENTS.md — enforced)

- Tags only (text locators = documented exceptions only). Bounded retries (3).
- 3 consecutive failures ⇒ skip case, ~[BUG]~ in progress.md, next BUG_Found_NN.md
  (next number: 10 — 09 was just filed), continue. Never skip silently.
- Log failures to terminal + test-cases-simple-money-tracker.md.
- `npm run typecheck` must pass; `npm run test:unit` if money helpers touched.
- Conventional Commits; never commit reports/, screenshots, node_modules, .kilo/, .idea/,
  spike/diag files. No push.

## Parked, NOT yours (uncommitted, another task's work — leave alone)

The Android-side edits inside `src/helpers/input.ts`
(setValueIntoTaggedField), `src/pageobjects/kategori.page.ts`, `src/pageobjects/daftar.page.ts`
(swipeList). TC-LIST-11 is no longer parked work: it was retired on 2026-10-27 across
`transaction-list.spec.ts`, `transaction-list.ios.spec.ts`, the catalog, `progress.md`
and `BUG_Found_09.md`. When committing iOS work, `git add` explicit paths only.
