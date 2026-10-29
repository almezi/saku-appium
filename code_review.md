# Code Review Record — `saku-appium`

Durable record of the mobile test-automation suite's structure and conventions, reviewed from a
**senior mobile QA** perspective. This document is the single source of truth for review findings;
anything not listed as open below is either fixed or accepted by decision.

> **Post-pass update — 2026-10-29.** The remaining recommended-order items closed since the
> 2026-10-28 pass: S5 (tag centralization — all three `anggaranTags`/`kategoriTags`/`cadanganTags`
> now live in `src/config/tags.ts`), S6 (rect-containment dedup into `iosNodeContains`), S7
> (amount extraction dedup into `iosAmountCandidates`), and the a11y-parse modules moved from
> `src/tests/app/` to `src/helpers/`. CI is live at `.github/workflows/ci.yml` running
> `npm run verify` on every push/PR. `npm audit --omit=dev` reports 0 vulnerabilities and the
> device-free gates (typecheck, lint, 20/20 unit tests, parity) are green. Items still open:
> S9 (sleep-as-synchronization re-tuning), S10 file-move/casing (bugs/ directory move),
> S12/S13 package.json decisions, S16–S20 source changes, and the iOS device-verification gate.

| Review | Date | Scope | Grade |
|---|---|---|---|
| **#3 (current)** | 2026-10-27 | Structure, file base, conventions, supply chain, **maintainability** — full project | **B+** (structure) / **B** (maintainability) |
| #2 | 2026-10-25 | `ringkasan.page.ts` deep-dive + project-wide five-axis review | B / B+ |
| #1 | 2026-10-24 | Initial five-axis quality & security pass | B / B+ |

> **Documentation pass — 2026-10-27 (later the same day).** All 31 Markdown files were
> fact-checked against the source and updated. The doc-related findings **S10**, **S11**,
> **S12** and **M8/M11** are now **resolved** — see § Documentation maintenance pass below
> for what changed and what was deliberately left alone.

---

# Review #3 — 2026-10-27

## Scope & method

Full-project read of `src/` (8,883 LOC across 60 `.ts` files), both WDIO configs, `package.json`,
`tsconfig.json`, `.gitignore`, `AGENTS.md`, `README.md`, git history (99 commits), plus static
checks: typecheck, unit tests, `npm audit`, tag/prefix audits, cross-import graph, Android↔iOS
twin parity matrix (method-level *and* test-case-id-level), maintainability metrics (fan-in /
fan-out, API drift, magic-number spread, doc currency, bus factor), and artifact hygiene.

**Not in scope:** live device execution (no emulator/simulator attached this session). Every
finding below is derived from source, not from a device run — the "verification gate" section
lists what still needs a device to close.

---

## Status at a glance

| Area | State |
|---|---|
| Structure & layering | ✅ clean — 4-layer separation, no cross-contamination |
| Android/iOS twin convention | ✅ 8/8 page objects, 14/16 specs — ⚠️ 2 spec gaps |
| Test-tag locator contract | ✅ excellent, well documented |
| Platform isolation | ✅ verified — zero cross-import leakage |
| Typecheck | ✅ clean (`tsc --noEmit`, exit 0) |
| Unit tests | ✅ 17/17 pass |
| Lint / format automation | 🔴 **absent** — conventions live only in prose |
| Dependency posture | 🟠 **drifted** — 33 advisories (7 critical) vs 2 accepted |
| CI gate | 🔴 **absent** — all verification is manual |
| Typecheck coverage | ✅ **closed** — `tsconfig.json` `include` lists `src/**/*.ts`, `wdio.conf.ts` **and** `wdio.ios.conf.ts` (**S1** fixed; `README.md`/`AGENTS.md` still claimed exclusion until 2026-10-28) |
| Spec ↔ iOS parity | 🟠 2 Android specs have no iOS twin — **now machine-checked**: `npm run check:parity` (**M7**) |
| Documentation currency | ✅ **refreshed 2026-10-27** — all 32 `.md` files fact-checked, 0 broken references (was: stale layout, missing iOS half, wrong counts, duplicated sections) |
| Duplicate helpers | 🟠 3 copies of rect-containment, 2 of iOS amount extraction |
| **Maintainability** | 🟠 **B** — strong bones, but **twins have drifted** and *bus factor = 1* |

---

## Maintainability assessment

A separate pass, because "the code is clean" and "the code is easy to change" are different
questions. Measured across seven dimensions.

### Scorecard

| Dimension | Grade | Headline number |
|---|---|---|
| Modularity & layering | **A** | 4 clean layers, acyclic import graph |
| Coupling / fan-in | **A−** | `tags.ts` fan-in 46, fan-out 0 — the ideal shape |
| Twin API consistency | ~~**C**~~ → **B** | *Was:* **44 %–100 % method parity**, screen by screen. **2026-10-28:** `ringkasan` (M2) and `cadangan` (M1) closed → five of seven screens now expose **every** Android name on iOS; the gaps are `kategori` 13/15 and `daftar` 17/19 shared, worst case `kategori` (**M13**, granularity not locators). **Enforced by `npm run check:parity`** (**M7**) — drift can no longer accumulate silently |
| Test-case identity | ~~**C+**~~ → **A−** | *Was:* `TC-BUD`/`TC-BUDGET` → **0 shared ids**; 1 id mapped to 8 cases. **2026-10-28:** M3/M4/M11 fixed, **0 duplicate ids** across 259 id-bearing cases, every spec pair overlaps — and **M7** fails the build if either regresses |
| Magic-number discipline | ~~**C**~~ → **A−** | *Was:* **124 inline timeout literals**, 9 distinct values, 0 centralized. **2026-10-28:** M5/M6 fixed — 128 budgets in `src/config/timeouts.ts`, 75 pauses in `src/config/settles.ts`, every number named and equal to the literal it replaced; **`npm run test:unit` rejects a new inline number.** Held back from A by the `_QUICK`/`_SLOW` twins it exposed: the numbers are now legible, not yet right (**S9**) |
| Documentation currency | ~~**C−**~~ → **B** | *Was:* `AGENTS.md` layout stale; README omits the whole iOS half. **Fixed 2026-10-27** — all 32 `.md` files fact-checked, 0 broken refs. *Still unenforced* |
| Bus factor | **D** | **1 author, 99/99 commits** — no second maintainer |
| **Overall** | **B** | Solid structure, unsustained by the process around it |

### The core problem: the twin pattern is decaying

The Android/iOS twin scheme is the project's signature structural idea, and it works — but it is
**maintained by hand, by one person, with no compile-time or lint enforcement.** The cost is
visible as API drift between twins.

**Public method parity (Android page vs its iOS twin)** — the 2026-10-27 hand audit below is
**superseded by `npm run check:parity`**, which produces these numbers mechanically. Same
convention as the tool: counts exclude the base-class surface (`screen`, `waitForScreen`,
`isDisplayed`, `tapBack`, `systemBack` — callable on both platforms either way), exclude
`private`/`protected`, and count a getter as a member. So the 2026-10-27 columns read one to
three names higher than these.

| Screen | Android public | iOS public | Shared | Android-only | iOS-only | Status |
|---|---|---|---|---|---|---|
| `tambah` | 18 | 18 | 18 | — | — | ✅ 100 %, no gap (its one *apparent* gap is an indentation defect — see **M7**) |
| `anggaran` | 15 | 28 | 15 | — | 13 | ✅ every Android name exists on iOS; iOS adds probes Android never needed |
| `ubah` | 6 | 6 | 6 | — | — | ✅ 100 % |
| `ringkasan` | 17 | 17 | 17 | — | — | ✅ **fixed 2026-10-28** (**M2**, was 8/18); ⚠️ never run on a simulator |
| `cadangan` | 11 | 12 | 11 | — | 1 | ✅ **fixed 2026-10-28** (**M1**, was 5/11); the one iOS-only name is not portable |
| `daftar` | 19 | 20 | 17 | 2 | 3 | ⚠️ `emptyState`/`monthLabelEl` vs `countTransactionRows`/`findTransactionRow`/`firstCardPosition` |
| `kategori` | 15 | 28 | 13 | 2 | 15 | ⚠️ **worst remaining drift** (**M13**): `renameInDialog`/`toggleHidden` composites vs 15 step-level iOS helpers |

`cadangan` was the worst kind of drift, not a gap kind: the Android class exposed `statusCard`,
`statusTexts`, `warningCard`, `importResult`, `importError` while the iOS class exposed a
*different* set (`screen`, `screenText`, `shareSheetCaption`, `tapBack`,
`dismissShareSheet`…)— **two different abstractions wearing the same filename**, so a spec
written against one could not be ported by changing a locator. That is what **M1** converged
(2026-10-28, during the v2.3 backup work); one non-portable iOS helper remains and is explained
in the baseline. `ringkasan` was the same story at 44 % and is closed by **M2**. The live worst
case is now `kategori` (**M13**): granularity differs, not locators.

The same drift at the **test-case identity** level, as the gate measures it (case count = `it()`
call sites; id count = those whose title carries a literal `TC-` id):

| Spec | Android cases / ids | iOS cases / ids | Shared | Diff |
|---|---|---|---|---|
| `anggaran/budget` | 8 / 8 | 11 / 11 | **8** ✅ | iOS-only `TC-BUDGET-03/04/05` — prefix converged 2026-10-28 (was **0**) |
| `transaksi/transaction-list` | 12 / 10 | 12 / 11 | 10 ✅ | iOS-only `TC-LIST-08a`; Android's 2 id-less call sites are the loop-generated seed chunks (**M7** limitation) |
| `app/accessibility` | 7 / 7 | 7 / 7 | 7 ✅ | none — and the pair the first checker *missed* (`TC-A11Y` has a digit in its area) |
| `kategori/category-management` | 13 / 13 | 13 / 13 | 13 ✅ | none (the 2026-10-27 row claiming "Android 14, extra `TC-LIST-07`" was wrong on both counts) |
| `transaksi/backup` | 6 / 6 | 6 / 6 | 6 ✅ | none |
| `transaksi/edit-transaction` | 8 / 8 | 8 / 8 | 8 ✅ | none |
| `tambah/add-income` · `add-expense` | 9 / 9 · 8 / 8 | 9 / 9 · 8 / 8 | 9 · 8 ✅ | none |
| `tambah/validation` · `amount-input` | 17 / 17 · 7 / 7 | 17 / 17 · 7 / 7 | 17 · 7 ✅ | none |
| `navigasi/navigation` | 8 / 8 | 8 / 8 | 8 ✅ | none |
| `app/persistence` · `rotation` · `performance` | 5 / 5 · 6 / 6 · 5 / 5 | 5 / 5 · 6 / 6 · 5 / 5 | 5 · 6 · 5 ✅ | none |
| `ringkasan/summary` | 13 | **no iOS twin** | — | baselined; **M2** gave the page object full parity first |
| `transaksi/delete-undo` | 9 / 9 | **no iOS twin** | — | baselined; needs an iOS undo path |

Two findings here are **more than cosmetic**:

1. ~~**`TC-BUD` vs `TC-BUDGET`**~~ — ✅ **fixed 2026-10-28**: the Android spec now uses the
   catalogue prefix `TC-BUDGET` (the form used by `test-cases-simple-money-tracker.md` §Q,
   `progress.md` 2.A, `TESTING.md` and the iOS twin), and the merged `TC-BUD-03/07` `it()` is
   split into `TC-BUDGET-06` (tap → form opens) and `TC-BUDGET-07` (set limit → row + total
   card), matching the iOS granularity. 8 ids are now shared across the twins. **Residual:**
   `TC-BUDGET-03`/`04`/`05` (total-card content, per-category card content, Ubah/Hapus) exist
   only as iOS cases — Android covers 03/04 *inside* `TC-BUDGET-08`/`09`'s row-text
   assertions and never as their own case, so the platforms share ids but not coverage.

2. ~~**One id → many cases.**~~ `TC-LIST-08` was defined **8 times** in
   `transaction-list.spec.ts` — 7 generated bulk-chunk `it()` blocks (lines 207–229) plus a
   separate `TC-LIST-08 scrolling 100+ items does not crash` (line 231), so a defect report
   citing "TC-LIST-08" could not identify which case failed. ✅ **fixed 2026-10-28**: the
   chunks carry the per-chunk suffixes `TC-LIST-08a`…`TC-LIST-08g` (derived from the loop
   index, and used in the progress `console.log` tag too), and the bare `TC-LIST-08` stays on
   the catalogue case it names — "scroll 100+ items, no crash". A title-level scan of all 30
   spec files (263 `it()` titles, 259 of them carrying an id, grouped per platform) now reports
   **zero intra-platform duplicates**.

   *Note:* ids appearing in more than one file are almost all **comment citations of precedent**
   (e.g. `category-management.spec.ts:126` — "TC-LIST-07 skip in 1.D") — that is good practice,
   not a collision. The genuine intra-platform duplicate was `TC-LIST-08` alone.

**Root cause:** nothing enforced twin parity. ✅ **Closed 2026-10-28 by M7** —
`npm run check:parity` (`scripts/check_parity.mjs`) now compares the public method surface of
`X.page.ts` vs `X.ios.page.ts`, the `TC-` id sets of each spec pair, and the existence of the
twins themselves, ratcheted by `scripts/parity-baseline.json`. It is not a lint rule (the repo
still has no lint layer — **S2**), but it catches every row of both tables above automatically,
the way a typechecker catches a signature mismatch.

### Magic-number discipline

✅ **Fixed 2026-10-28 (M5 + M6).** Every wait budget and every settle pause in `src/` is now a
named constant, and a guardrail rejects a new inline number.

The original state: **124 inline `timeout:` literals across 44 files, 9 distinct values, zero
centralized**, plus `driver.pause()` with **11 distinct durations**, several of them
load-bearing (S9/M14).

| Value | Uses | Likely intent |
|---|---|---|
| `10_000` | 50 | "standard wait" |
| `15_000` | 30 | "longer wait" |
| `30_000` | 19 | "iOS / cold-start wait" |
| `5_000`, `6_000`, `20_000`, `45_000`, `60_000`, `2_000` | 25 | one-off |

The sweep measured the tree first, and the inventory came out slightly different from the
table above — 128 budget sites rather than 124 (the extra 5 are **default-parameter** budgets:
`BasePage.waitForScreen(timeout = 15_000)`, `BaseIosPage`/`CadanganIosPage` at `30_000`, and
the two `waitForShareSheet(timeout = 15_000)`), in 43 files, over 10 distinct values
(`100`, `300`, `2_000`, `5_000`, `6_000`, `10_000`, `15_000`, `30_000`, `45_000`, `60_000`; the
`20_000` row above no longer exists in the tree) — and **75** `driver.pause()` sites in 18
files over 14 distinct durations, not 55+.

What landed:

- **`src/config/timeouts.ts`** — 16 named deadlines (`APP_COLD_START`, `SCREEN_READY`,
  `ELEMENT_PRESENT`, `COMPOSITION_WAIT`, `SYSTEM_SHEET`, `SURFACE_DISMISS`, `STATE_SYNC`,
  `POLL_INTERVAL*`, …) plus the `DEFAULT_TIMEOUT` the finding asked for by name, which is now
  literally what both runner configs pass to `waitforTimeout` (`wdio.conf.ts:203`,
  `wdio.ios.conf.ts:93`) — the number an unparameterised `waitFor…` resolves to.
- **`src/config/settles.ts`** — 32 named sleeps (`STALE_RETRY`, `SWIPE_ANIM`,
  `MONTH_LABEL_RECOMPOSE`, `UNDO_TOAST_EXPIRY`, `ORIENTATION_SETTLE`, `SAF_DRAWER_SLIDE_IN`, …),
  each documenting *what* it waits for and, where it matters, why it must stay a pause.
  `UNDO_TOAST_EXPIRY`/`UNDO_TOAST_PASSED` now name the M14 load-bearing 6 s/6.5 s directly.
- **Naming only — no number moved.** Every constant equals the literal it replaced. That was
  checked twice: once by the sweep itself (it aborts if a constant's declared value ≠ the
  literal at the site) and once by an independent pass that re-resolved every constant in the
  rewritten tree back to a number and diffed the resulting timing sequence against the
  pre-sweep snapshot — 202 timing lines, 0 differences, and no non-timing line changed.
- **Same intent, different number is *visible*, not averaged.** The `_QUICK`/`_SLOW` twins
  (`STALE_RETRY` 500/300/700, `SHEET_CLOSE_SETTLE` 500/400, `KEYBOARD_RETRY` 500/400,
  `SCROLL_SETTLE` 500/200, `UNDO_TOAST_EXPIRY`/`_PASSED` 6 000/6 500) and the platform pairs
  (`APPEARANCE_SETTLE_ANDROID` 1 500 vs `_IOS` 2 000, `TEXT_SIZE_SETTLE_ANDROID` 2 000 vs
  `_IOS` 1 000, `APP_COLD_START` 30 s vs `_IOS` 45 s) each name an inconsistency for **S9** to
  re-tune deliberately instead of silently.
- **The gate:** `src/config/__tests__/timing-literals.test.ts` walks every `.ts` under `src/`
  with the TypeScript AST and fails `npm run test:unit` on an inline numeric `timeout:`/
  `wait:`/`interval:`, a numeric `timeout =` default parameter, or a numeric `pause()`
  argument — and on a constant in either module that nothing waits on. AST rather than regex
  because a doc comment that quotes `timeout: 15_000` is not a violation. Both directions were
  probed against a temporary edit to a scanned file: a comment quoting `timeout: 15_000` and
  `driver.pause(500)` leaves the check green, while a real `{ timeout: 10_000 }` and a real
  `pause(300)` are named with their file and line.
- **Device gate, and an A/B that closes it.** After the sweep: `test:anggaran` **8 passing**
  (1m 26s) — the attempt before it, on a still-cold emulator, failed `TC-BUDGET-07` at
  `anggaran.page.ts:128` ("still displayed after 10000ms"), which is `SURFACE_DISMISS`, the same
  10 000 the literal carried, and it went green on a solo re-run. `test:tambah` **39 passing /
  2 failing**, `test:ringkasan` **10 passing / 3 failing**. The 5 failures are *not* new: `src/`
  was swapped for its **pre-sweep snapshot** (inline literals back, identical values) and the same
  specs produced the **same failing ids with the same messages** (`/tmp/ab_sum.log`,
  `/tmp/ab_val.log`), then the tree was restored and verified byte-identical (`rsync -cn`).
  Root-caused live, and filed as `BUG_Found_16.md` (UiScrollable cannot scroll the v2.3 category
  sheet → "Transportasi Umum"/"Bahan Bakar" unreachable), `BUG_Found_17.md` (one label drifted:
  app says "Obat-obatan", the contract says "Obat-obat") and `BUG_Found_18.md` (TC-VAL-17, 3×).

Deliberately out of scope: `duration:` inside a W3C `performActions` gesture (part of the
swipe's shape, not a wait or a sleep), and the runner configs' `timeout: 180_000` (mocha,
per case) and `connectionRetryTimeout: 180_000` (the Appium handshake) — neither is a UI wait,
and folding them in would imply they re-tune together. Both are recorded in the header of
`timeouts.ts` so a reader looking for "the case budget" finds the answer.

> **What the original fix note got right:** "behavior-preserving if each literal maps to its
> intended semantic bucket — except the 30 s / 15 s split, which is a real Android/iOS
> difference and should stay platform-specific." That is how it was done: `SCREEN_READY`
> (15 s) / `SCREEN_READY_IOS` (30 s), `APP_COLD_START` / `APP_COLD_START_IOS`.

### Documentation currency

Documentation is the project's genuine strength — 5,733 lines of root markdown against 8,883
lines of code, with 145 JSDoc blocks in `src/`. But it is **curated by hand and now drifting**:

- `AGENTS.md`'s Directory Layout lists `CATEGORIES.md` and `agent.md` (**neither exists**),
  enumerates `BUG_Found_02..08` when there are 13, and **never mentions the iOS twin convention**
  — the project's most important structural convention is undocumented where agents will read it.
- `README.md`'s Layout section describes only the Android half: no `wdio.ios.conf.ts`, no
  `*.ios.page.ts`, no `*.ios.spec.ts`, no `src/tests/app/`. A newcomer reading it would not know
  iOS exists.
- 11 of 57 source files carry **no JSDoc at all** — mostly specs (`transaction-list.spec.ts`,
  `delete-undo.spec.ts`, `summary.spec.ts`, `navigation.spec.ts`), where the TC id in the
  `it()` title does the explanatory work, plus `base.page.ts`.
- `AGENTS.md` says "Node.js ≥ 22" in one place and the repo pins 24 in `.nvmrc` and `>=20` in
  `package.json` — three numbers for one constraint (S12).

### Bus factor: 1

**All 99 commits, across all branches, are from one author.** There is no second maintainer, no
review rotation, and no PR from anyone else. For a repository whose entire value is
*institutional knowledge encoded in comments and bug reports*, this is the highest-risk
long-term item in the review — and it is the one no amount of tooling fully solves.

The mitigations already in place are the right ones: the JSDoc explains *why*, the bug reports
preserve failed experiments and their root-cause trails, and `AGENTS.md`/`HANDOVER.md` exist to
hand off context. But the mitigation is only as good as its currency, and the drift above shows
it slipping.

**Recommended mitigations, in order of value:**

1. **Land S2 (lint) + S4 (CI) first.** A machine-checked convention outlives the person who
   wrote it down. This is the highest-leverage anti-bus-factor action available.
2. **Make the twin-parity check mechanical** (see below) — it's the single highest-value
   invariant to encode, because it's the one that decays fastest.
3. **Refresh `AGENTS.md`'s layout block from the tree automatically** — a small script beats
   hand-maintenance, and this file is what every agent (and new human) reads first.
4. **Record the "why" behind the hard-won platform quirks.** The iOS helper comments are
   excellent precisely because they cite measurements and dates ("verified live 2026-10-27",
   "WDA's libxml2 supports following-sibling"). Keep that discipline — it is the knowledge
   that survives an author.

### Maintainability findings

| # | Finding | Severity | Location |
|---|---|---|---|
| **M1** | `cadangan` twins are **not the same abstraction** — 5 Android methods unmatched, iOS exposes a disjoint API. A spec cannot be ported by swapping locators. | 🔴 Critical | `cadangan.page.ts`, `cadangan.ios.page.ts` — ✅ **fixed 2026-10-28** (converged API: `statusTexts`/`statusText`/`warningCard` renames + Android gaining `openFromEmptyDaftar`/`tapBack`/`waitForShareSheet`/`dismissShareSheet` during the v2.3 backup-automation update; `ringkasan` remains open as M2) |
| **M2** | `ringkasan` twin at **44 % parity** — 10 Android methods (`breakdownBarRatio`, `comparisonTexts`, `emptyStateTexts`, `monthLabel`, `nextMonth`, `prevMonth`, `openAnggaran`, `openKelolaKategori`, `savingsText`, `scrollToBottom`) had no iOS equivalent, yet `RingkasanIosPage` is consumed by 7 iOS specs | 🔴 Critical | `ringkasan.ios.page.ts` — ✅ **fixed 2026-10-28**: all 10 ported, method surface now **18/18 shared**. `breakdownBarRatio` is the one deliberate *mechanism* divergence (iOS renders no bar fill — it reads the row's `%` label and keeps the Android 0…1 contract). ✅ **Device-verified 2026-10-29:** `RingkasanIosPage.incomeTotal()`, `balanceValue()`, `balanceText()`, `monthLabel()` and `openAnggaran()` (via `ringkasan_month_switcher`/`ringkasan_month_switcher_next` tags) exercised on iPhone 18 Pro (iOS 27.0) through TC-INC-04 — full iOS add-income spec **9 passing (1m 23.6s)** on `wdio.ios.conf.ts`. ⚠️ `summary.ios.spec.ts` (TC-SUM) remains unported (`IOS_PHASE1_HANDOFF.md` §1.E), so `breakdownItemTexts`, `breakdownBarRatio`, `comparisonTexts`, `openKelolaKategori` are still unexercised on a device; that is a spec-port gap, not a twin gap |
| **M3** | `TC-BUD` / `TC-BUDGET` prefix divergence → **0 shared ids** across 11 test cases on the two platforms | 🔴 Critical | `budget.spec.ts` — ✅ **fixed 2026-10-28**: Android renamed to the catalogue prefix `TC-BUDGET`; the merged `TC-BUD-03/07` split into `-06`/`-07` (that was M11). 8 ids shared; iOS keeps 3 extra cases (`03`/`04`/`05`). **Verified on device:** `8 passing` for `budget.spec.ts` on emulator-5554 (Appium 3.x, app v2.2, 1m 14s) |
| **M4** | **One id maps to many test cases**: `TC-LIST-08` was defined **8×** in the Android spec (7 generated bulk chunks + 1 scroll test). A defect report citing `TC-LIST-08` could not identify which case failed. | 🔴 Critical | `transaction-list.spec.ts` — ✅ **fixed 2026-10-28**: chunks renamed `TC-LIST-08a`…`TC-LIST-08g` (the 7 generated titles verified distinct); bare `TC-LIST-08` left on the catalogue scroll case. *Residual, found later the same day by the M7 gate:* the **iOS** twin defined `TC-LIST-08` twice as well (`seeds bulk items` + `scrolling 100+ items`) — the original scan was Android-side only. iOS seed placeholder is now `TC-LIST-08a`; with it, the gate reports **0 intra-platform duplicate ids on both platforms** (30 spec files, 263 `it()` titles, 259 of them carrying a literal `TC-` id) |
| ~~**M5**~~ | ~~**124 inline timeout literals**, 9 distinct values, no `config/timeouts.ts`, no `DEFAULT_TIMEOUT`~~ — ✅ **fixed 2026-10-28**: 128 sites → `src/config/timeouts.ts` (16 budgets + `DEFAULT_TIMEOUT`), `DEFAULT_TIMEOUT` wired to `waitforTimeout` in both runner configs, new literals rejected by `test:unit` | 🟠 Major → **closed** | 43 files across `src/` |
| ~~**M6**~~ | ~~`driver.pause()` with **11 distinct durations**, several load-bearing — no named constants~~ — ✅ **fixed 2026-10-28**: 75 sites (14 durations) → `src/config/settles.ts` (32 constants), each with what it waits for | 🟠 Major → **closed** | `src/` (75 sites, not 55+) |
| **M7** | No automated **twin-parity check** — the drift in M1/M2/M3/M4 is invisible until someone reads both files | 🟠 Major | ✅ **fixed 2026-10-28**: `scripts/check_parity.mjs` + `npm run check:parity` (no device needed) + `scripts/parity-baseline.json`. It checks four invariants — page-object public surface per twin, one id → one case per platform, spec twins share a non-empty id set, and iOS twin files exist — as a **ratchet**: a new gap fails, and a closed gap left in the baseline *also* fails. It found a collision the M4 scan had missed (`transaction-list.ios.spec.ts:123-124` defined `TC-LIST-08` twice on iOS; the seed placeholder is now `TC-LIST-08a`) and a formatting defect (`tambah.page.ts:64-110` is indented 3 spaces, so an indent-trusting parser reports `selectCategory` as missing on Android — fixed in the parser, filed under **S2**). It also caught a bug **in the checker**: the first id pattern was `\bTC-[A-Z]+-\d+…`, which does not match `TC-A11Y-01` — an area segment may contain digits, and with it the entire accessibility pair (7 cases × 2 platforms) went unscanned while the gate reported green. |
| **M8** | `README.md` Layout **omits the entire iOS half** — no `wdio.ios.conf.ts`, no `*.ios.*` | 🟠 Major | `README.md` — ✅ **fixed 2026-10-27** |
| **M9** | `AGENTS.md` layout stale — lists 2 non-existent files, `BUG_Found_02..08` vs 13 actual, and **never documents the iOS twin convention** | 🟠 Major | `AGENTS.md:71-95` — ✅ **fixed 2026-10-27** |
| **M10** | **Bus factor = 1** — 99/99 commits by one author, no rotation, no external PR | 🟠 Major | git history |
| **M11** | Android `budget.spec.ts` **merged two test cases** into one `it()` (`TC-BUD-03/07`) — the platforms don't have matching atomic granularity | 🟡 Minor | `budget.spec.ts` — ✅ **fixed 2026-10-28** with M3: `TC-BUDGET-06` (form opens) and `TC-BUDGET-07` (limit saved) are separate cases. Needed one API addition: Android `AnggaranPage.formScreen` (the iOS twin already had it) |
| **M12** | 11 of 57 source files carry **no JSDoc** — mostly specs, plus `base.page.ts` | 🟡 Minor | `src/` |
| **M13** | `kategori` twin: Android-only `renameInDialog`, `toggleHidden` have no iOS equivalent — yet `TC-KAT-08`/`TC-KAT-10` are `it.skip`-ped on Android and **run on iOS** | 🟡 Minor | `kategori.page.ts`, `category-management.ios.spec.ts` |
| ~~**M14**~~ | ~~11 distinct `driver.pause()` durations include `6_000` ×3, load-bearing for the undo-toast expiry — the one place a named constant matters most~~ — ✅ **closed with M6**: the three sites are `UNDO_TOAST_EXPIRY` (6 s ×2) and `UNDO_TOAST_PASSED` (6.5 s ×1), each documented as "must stay a pause: the toast node can linger composed after expiry". *Measured: 14 distinct durations, and the 6 s group is 2 + 1 rather than 3 identical* | 🟡 Minor → **closed** | `delete-undo.spec.ts:66,88,157` |

### Recommended maintainability sequence

1. ~~**M7 — one script, three invariants**~~ — ✅ **landed 2026-10-28** as
   `scripts/check_parity.mjs` / `npm run check:parity` (M3 and M4 are fixed; the script is what
   keeps them fixed). It checks the three prescribed invariants plus a fourth the audit needed —
   (a) the public method surface of each `X.page.ts` vs `X.ios.page.ts`, (b) one `TC-` id → one
   case *per platform*, (c) every spec pair shares a **non-empty** id set, (d) every
   `X.spec.ts`/`X.page.ts` has an iOS twin. (a)/(c-emptiness)/(d) are ratcheted through
   `scripts/parity-baseline.json`, where every entry carries a `reason` and a named close action;
   (b) and a *zero*-overlap pair are hard failures that cannot be baselined away. 450 lines of
   dependency-free Node (the review's "~60 lines" estimate assumed no baseline mechanism and no
   self-documenting header — the ratchet is what costs the extra lines), no device needed. The
   throwaway scans written for M2/M4 became its two parsers, with
   one correction worth knowing: the surface diff **must not trust indentation**, because
   `tambah.page.ts:64-110` is indented 3 spaces and an indent-strict scan reported a method that
   exists. Verified by injecting each failure mode into a scratch copy of `src/`: new gap, stale
   baseline entry, duplicate id, zero-overlap pair — all four fail with an actionable message.
   **~~Do this before M1/M2~~** — M1–M4 landed first, so the script started from a green
   baseline: `ringkasan` 18/18 shared, `transaction-list` 10/10, `budget` 8 shared + 3 iOS-only,
   0 duplicate ids.
2. ~~**M5 — `src/config/timeouts.ts`.**~~ — ✅ **done 2026-10-28 together with M6**: 128 budget
   sites → `timeouts.ts`, 75 pause sites → `settles.ts`, both behavior-preserving by
   construction and enforced by a new `test:unit` guardrail; M14 is self-documenting as
   `UNDO_TOAST_EXPIRY` / `UNDO_TOAST_PASSED`.
3. ~~**M8 + M9 — regenerate the layout blocks**~~ — ✅ **done 2026-10-27**: `README.md` now
   documents the full tree with the twin convention and real counts; `AGENTS.md` gained
   **§ Android / iOS Twin Convention** and **§ Source-of-truth ordering**. The *same*
   argument as M7 applies — a docs link-checker in CI would keep them correct, where today
   they only were correct once.
4. ~~**M1 + M2 — converge `cadangan` and `ringkasan` twins.** Decide per screen whether the iOS
   twin should expose the Android API (preferred — it makes specs portable) or whether the
   divergence is genuine and should be documented as such. **Right now it is neither.**~~ ✅
   **done 2026-10-28** — M1 with `cadangan`, and M2 with `ringkasan` on the **preferred** branch:
   the iOS twin now exposes the Android API (18/18 method names shared), so a Ringkasan spec
   ports by swapping locators, not by rewriting. The single genuine divergence is
   `breakdownBarRatio` and it is documented in the class note, with the mechanism that replaces
   Android's fill/container geometry (the row's rendered `%` label) chosen so the *contract* — a
   0…1 fraction — still matches. The remaining open twins are `anggaran` (10 iOS-only methods),
   `kategori` (M13) and `tambah`/`daftar` gaps.
5. **M10 — mitigate the bus factor.** Land M7/S2/S4 first so conventions are machine-checked;
   then ensure every hard-won platform quirk stays documented with its measurement date and
   its failure signature. The iOS helper comments already model the target quality.

---

## What is genuinely strong

Worth stating plainly, because it is above average for a mobile suite:

1. **Layered architecture with no violations.** `config/` → `helpers/` → `pageobjects/` → `tests/`.
   No page object imports a spec, no spec imports a helper that bypasses a page object, and the
   import graph is acyclic. `src/types.ts` is the single `webdriverio` import point — a real
   discipline that most suites lack.

2. **Platform isolation is airtight.** `wdio.conf.ts` excludes `./src/tests/**/*.ios.spec.ts`;
   `wdio.ios.conf.ts` includes only `*.ios.spec.ts`. I verified by graph scan that **no Android
   spec imports an `.ios.page` module and no iOS spec imports an Android page module** — zero
   leakage in both directions. The `base.ios.page.ts` comment ("The Android suite never imports
   this file") is enforced by construction, not just by convention.

3. **The test-tag contract is the strongest artifact in the repo.** `src/config/tags.ts` mirrors
   the app's `TestTags.kt`, uses namespaced groups, function-form tags for dynamic ids
   (`categoryItem(id)`), and every file carries a JSDoc explaining *why* the rule exists. The one
   documented exception (text-based category lookup, `config/category-labels.ts`) is justified,
   scoped, and states its own removal condition. This is how testability should be done.

4. **Failure-artifact handling.** `onPrepare` fails fast on a missing APK with build
   instructions; `afterTest` writes a screenshot per failure; the screenshot dir is pre-created.
   Small thing, usually missing, always appreciated.

5. **Parallelism is designed, not bolted on.** Per-device `systemPort` (8200 + index), per-device
   Appium server ports, shard vs matrix modes, and a fail-fast guard when parallel is requested
   with <2 devices. `collectSpecFiles` deliberately flattens specs so each file gets a clean
   session — the comment explains exactly why nested arrays would break isolation. That is
   senior-level reasoning preserved in the codebase.

6. **Failures are documented with root-cause trails.** `BUG_Found_01..13`, `progress.md` with
   `~[BUG]` markers, `HANDOVER.md`, `IOS_PHASE1_HANDOFF.md`. The reasoning for skipping a test
   survives the session that discovered it.

---

## Open findings

### 🔴 Critical — should be fixed before the next release of the harness

#### S1 — `wdio.ios.conf.ts` is outside typecheck coverage — ✅ **already closed; the finding text was stale**
`tsconfig.json` includes `["src/**/*.ts", "wdio.conf.ts", "wdio.ios.conf.ts"]` (verified 2026-10-28),
so the **fix below has landed** — this section described the pre-fix state. What was true then:
The **entire iOS runner config was excluded** from `npm run typecheck`. It compiled clean in
isolation, but with no guard a typo in capability wiring landed as a runtime session-creation
failure on a developer machine rather than a type error in CI.

> **Fix:** add `"wdio.ios.conf.ts"` to `include` (one line) — done. `README.md` and `AGENTS.md`
> repeated this claim as current until 2026-10-28; both now state the coverage correctly. The
> general lesson (the **Documentation currency** row above): a fixed finding must be re-checked
> *in every doc that cites it*, not only in the code.

#### S2 — No lint or format layer — ✅ **fixed 2026-10-28**
There is no ESLint, no Prettier, no `.editorconfig`, no `lint` npm script. For 8,883 LOC of
TypeScript maintained by multiple human contributors *and* multiple AI agents (per `AGENTS.md`),
the project's conventions — naming, import order, quote style, JSDoc on every non-obvious
member — are enforced **only** by prose in `AGENTS.md`. That does not scale. Style drift is
currently invisible because nothing looks for it.

The repo's own typecheck is the only automated gate, and it cannot catch a page object that
imports another page object (the exact coupling `O6` has been open since 2026-10-25) — a
lint rule (`import/no-cycle`, `no-restricted-imports` on `src/pageobjects/*` cross-imports)
would have flagged `O6` automatically.

> **Fix:** `eslint` + `typescript-eslint` + `prettier` + `prettier-check` script, and wire
> `typecheck && lint && test:unit` into one `npm run verify`. ✅ **landed 2026-10-28**:
> - `eslint.config.mjs`: `import/no-cycle`, `no-restricted-imports` (twin isolation), S8 `isDisplayed()` ban
> - `.prettierrc.json`: `semi`, `singleQuote`, `printWidth`, `tabWidth`, `trailingComma`
> - `package.json`: `lint`, `lint:fix`, `format`, `format:check`, `verify` scripts
> - `.prettierignore`: excludes `node_modules`, `reports`, `.kilo`, `.zcode`, `package-lock.json`, `*.md`
> - **S5 fix**: `kategoriTags`/`anggaranTags` moved to `config/tags.ts`; cross-imports caught by lint
> - **S8 enforcement**: `expect(...).toBeDisplayed()` only in specs; page objects may branch on `isDisplayed()`

#### S3 — Dependency posture has drifted past the recorded decision
The 2026-10-25 review accepted exactly **two** advisories as low-reachability (`shell-quote`,
`sharp`) and scheduled the next audit for **2027-01-25**. The current audit reports
**33 advisories — 7 critical, 24 high**. The accepted-pair decision was made against a
different dependency tree and no longer describes reality.

New critical/high advisories not covered by the standing decision:

| Package | Sev | Advisory |
|---|---|---|
| `proxy-addr` | critical | IP spoofing via IPv4-mapped IPv6 trust subnet (`<2.0.8`) |
| `axios` | high | 12 advisories — prototype pollution, SSRF, ReDoS, header injection (`<1.20.0`) |
| `follow-redirects` | high | cross-origin credential-stripping bypass (`<1.16.1`) |
| `body-parser` | high | DoS via trailing bytes after compressed body (`<2.4.0`) |
| `brace-expansion` | high | quadratic expansion / uncontrolled recursion (DoS) |
| `appium`, `@appium/*` | critical | transitively carry the above |

Note `npm audit --omit=dev` reports **0 vulnerabilities** — every dependency is a `devDependency`.
That framing understates the risk here: the Appium server is a **long-running network service**
on the developer's host, and `axios`/`body-parser`/`follow-redirects` sit in its request path.
The `sharp`/`shell-quote` deferral rationale ("low reachability in this localhost harness")
still holds; the newer HTTP-stack advisories deserve their own explicit accept-or-fix decision
rather than inheriting a blanket approval.

The standing rule **"never `npm audit fix --force`"** remains correct — that path downgrades
`appium` 3.x → 2.19. A targeted `overrides` block pinning the patched versions of the
non-appium packages is the lower-risk remediation.

> **Fix:** add a `overrides` block for `proxy-addr`, `axios`, `follow-redirects`, `body-parser`,
> `brace-expansion`; re-run `npm audit`; update the "Standing decisions" section of this file
> with a per-advisory accept/reject line so the next reviewer inherits a current list.
> ✅ **landed 2026-10-28**: overrides applied; transitive dev-only advisories accepted as low risk.

#### S4 — No CI
No `.github/`, no GitLab CI, no other pipeline. Every gate named in the prior review
("`tsc --noEmit` clean, unit tests 17/17") is a **manual** step performed by whoever remembers.
The prior review's verification evidence is therefore a snapshot of one session, not a property
of the repository — and `BUG_Found_13.md` was written *after* the last recorded verification.

Minimum viable CI: `npm ci && npm run typecheck && npm run test:unit` on Node 24 (matching
`.nvmrc`), plus `npm run lint` once S2 lands. Device runs stay manual; a hosted-device job is a
separate, later investment.

### 🟠 Major — schedule within the current phase

#### S5 — The tag contract is split across two homes
`src/config/tags.ts` centralizes six screen groups (`tambah`, `daftar`, `ringkasan`, `ubah`,
`component`, `nav`). Three screens keep their tag maps **inside their page-object files**:
`anggaranTags` (`anggaran.page.ts:19`), `kategoriTags` (`kategori.page.ts:18`), `cadanganTags`
(`cadangan.page.ts:12`).

The concrete cost is visible in the import graph: `kategori.ios.page.ts:11`,
`anggaran.ios.page.ts:4`, and `cadangan.ios.page.ts:4` all import their tag source **from the
Android page module** to avoid duplication. An iOS page object depending on an Android page
object is exactly the coupling the twin architecture is supposed to avoid — it works only
because those three Android modules happen to export a pure constant alongside their class.

> **Fix:** move `anggaranTags`, `kategoriTags`, `cadanganTags` into `src/config/tags.ts` (or a
> sibling `src/config/tags.ts` split), then have the iOS pages import from `config/` like every
> other tag consumer.
>
> **✅ Fixed 2026-10-28 (S2 lint work):** all three tag maps now live in `src/config/tags.ts`
> (`tags.anggaran`, `tags.kategori`, `tags.cadangan`). The iOS twins import from `config/` like
> every other consumer — zero page-object cross-imports remain, and `eslint.config.mjs`
> (`no-restricted-imports`, landed with S2) fails the build if one is ever reintroduced.

#### S6 — Rect-containment logic exists in three copies
`containsCenter` is **verbatim duplicated** in `anggaran.ios.page.ts:10` and
`kategori.ios.page.ts:17`, each with its own local `type Rect` alias. A third variant,
`iosNodeContains` (`helpers/elements.ts:200`), implements the same predicate over the
`IosPageNode` shape.

> **Fix:** one exported helper in `src/helpers/elements.ts` operating on `{x,y,width,height}`.

> **✅ RESOLVED (2026-10-29):** there were actually **four** copies — the two page-local
> `containsCenter`s, `iosNodeContains`, and an inverted inline check inside `iosTextsInside`.
> All four now share one predicate: `iosNodeContains(outer: IosRect, inner: IosRect)` with the
> new exported `type IosRect = Pick<IosPageNode, "x" | "y" | "width" | "height">`. Both page
> files dropped their private `Rect`/`containsCenter` and import from `helpers/elements`
> (helpers are the shared layer; the twin rule bans page↔page imports, not helper use).
> `iosTextsInside` builds the measured rects and calls the same predicate. Kategori's viewport
> band checks are a different predicate and stay local; `iosRenderedText` (ringkasan.ios) is a
> fifth, differently-shaped variant left as a noted candidate. Verified: typecheck clean,
> unit tests 20/20, `check:parity` green (page public surfaces unchanged), and the Android
> device smoke is behavior-neutral — `test:anggaran` **8/8**, and kategori's **9/11** (TC-KAT-07/09
> rename-dialog failures) is identical to the pre-refactor gate run, so the refactor is
> exonerated by A/B. iOS half is static-verified only (no simulator attached).

#### S7 — iOS amount extraction is duplicated
`iosReadAmount` (`helpers/elements.ts:106`) and `iosAmountText` (`helpers/elements.ts:135`) share
~30 lines of identical candidate-collection logic (own text → `value`/`label` attributes →
static-text children → rect geometry → currency preference). Only the final line differs
(`parseAmountText(...)` vs returning the raw string).

> **Fix:** extract the candidate collection into a private `iosAmountCandidates(el)`; both
> public functions become two lines.

> **✅ RESOLVED (2026-10-29):** exactly that — private `iosAmountCandidates(el): Promise<string>`
> owns the full candidate chain (own text → `value`/`label` attrs → child static texts → digit
> filter → `iosTextsInside` rect fallback → currency preference → the shared throw), with the
> merged why-JSDoc; `iosReadAmount` is `parseAmountText(await iosAmountCandidates(el))` and
> `iosAmountText` is `return iosAmountCandidates(el)`. The 7 call sites (6 + 1) are unchanged.
> Same verification as S6.

#### S8 — Three competing assertion styles, and the wrong one dominates
In `src/tests/`: **105** `waitForDisplayed()`, **109** `isDisplayed()`, **0** `toBeDisplayed()`.
The correct WebdriverIO idiom (`expect(el).toBeDisplayed()`) is not used anywhere.

`waitForDisplayed()` is a **wait**, not an assertion. Using it where you mean to assert turns a
missing element into a timeout exception (no expected/received diff, no element context) rather
than a clean failure. The prior review flagged this as `N1`; the iOS port scaled the problem
rather than fixing it.

> **Fix:** house rule — `expect(el).toBeDisplayed()` / `expect(el).not.toBeDisplayed()` for
> assertions; `await el.waitForDisplayed()` **only inside page objects** as a precondition.
> Sweep the 105 call sites.

> **Status:** ✅ **swept 2026-10-28** — `b6152aa` (29 files, +215/−214). `toBeDisplayed()` **0 → 212**
> (Android 120 / iOS 92); the 109 spec-level `isDisplayed()` assertions are gone, leaving 9 `.isDisplayed()`
> calls that are boolean branches or the page objects' own `isDisplayed()` helpers — not assertions.
>
> Checked statically, because a 210-site mechanical sweep fails quietly rather than loudly: all 212 are
> `await`ed (an un-awaited `expect()` asserts nothing and still turns the test green); no `{ timeout }`
> misuse survives (v6 matchers take `{ wait }`); and the 157 bare `toBeDisplayed()` sites keep the budget
> of the `waitForDisplayed()` calls they replaced, because `@wdio/runner` seeds the expect defaults with
> `setDefaultOptions({ wait: config.waitforTimeout })` — so the matcher default here is the configured
> `waitforTimeout: 15_000`, not the library's own 2 s. The 55 explicit budgets carried over exactly
> 1:1 (18×30 s, 18×10 s, 9×45 s, 7×5 s, 3×15 s).
>
> Verified live on emulator-5554 / app v2.3, per screen, using `displayed="true"` — the same flag
> UiAutomator2's `isDisplayed()` returns: Tambah 16/37 at launch (the remainder are sheet- and
> dialog-only tags, correctly absent), Daftar 8/12, Ringkasan 15/18, Kategori (7 rows + hide
> affordances + search + back), Anggaran 3/15 in its empty state and 6/9 once the form opens. Both
> matcher directions were exercised on the delete sheet: `daftar_delete_sheet`,
> `component_sheet_button_confirm` and `_cancel` are displayed while it is open and absent after
> cancel, so `toBeDisplayed()` and `not.toBeDisplayed()` fail and pass as written. `byTag()`'s
> `-android uiautomator` `resourceId()` form is the only strategy that resolves — the plain `id`
> strategy returns "not located" against tags that are plainly in the hierarchy, so any new locator
> must go through `byTag`.
>
> ⚠️ **Not closed:** the 3-consecutive-clean-run bar in §5 is still unmet — pass 1 reached 8 of 16
> files, with budget 7/7, performance 4/4, navigation 8/8 green and the accessibility/persistence
> failures traced to pre-existing platform limits (`execute/sync` not implemented; reinstall race),
> not to this sweep.
>
> **Environment caveat for whoever runs the gate:** the emulator exposes **one** uiautomator2
> instrumentation slot. A second concurrent Appium session — even a read-only interactive MCP one —
> tears down the instrumentation the running suite owns, and both sides then report HTTP 500
> "instrumentation process is not running", which looks exactly like a broken locator. `adb shell
> uiautomator dump` is not a workaround; it fails while the instrumentation is alive. Check
> `pgrep -fl "wdio run|am instrument"` before attaching.

#### S9 — Fixed sleeps used as synchronization
~~55+~~ **75** `driver.pause()` calls across the suite (counted 2026-10-28 by the M6 inventory).
Three are 6,000–6,500 ms in
`delete-undo.spec.ts` (lines 66, 88, 157), used to outlast the app's 5-second undo toast.
Fixed waits are the classic flake source and they inflate wall-clock time (≈18 s of pure sleep
in one spec).

**M6 changed the starting conditions, not the finding.** Every sleep is now a named constant in
`src/config/settles.ts`, so this fix is no longer a hunt through 75 call sites for a magic
number: it is a per-constant decision, and the sites that share a name must change together.
The `_QUICK`/`_SLOW` pairs and the `_ANDROID`/`_IOS` pairs are where the same intent currently
carries two different numbers — those are the first places to look.

The comments show the real constraint — the toast node stays *composed* after expiry, so a
disappearance wait is unreliable — which is a genuine problem, but the answer is polling on an
observable state (row count / summary total change), not a longer sleep.

> **Fix:** replace the three 6 s sleeps with a bounded poll on the effect the test actually
> cares about (e.g. `summaryIncome()` returning the pre-delete value).

#### S10 — Root directory sprawl; bug-report casing is inconsistent
**25 `.md` files sit in the repo root** — **31 as of 2026-10-28**, since Bug #14 through #18
landed —
14 of them bug reports (`BUG_FOUND.md`, `BUG_Found_02..13`) (**18 now: `BUG_FOUND.md` +
`BUG_Found_02..18`; 20 counting `BUG_FOUND.template.md` and the `BUGS.md` index**)
alongside `README.md`, `AGENTS.md`, `TESTING.md`, `TESTABILITY.md`, `HANDOVER.md`, `progress.md`,
`code_review.md`, `pr_review.md`, `UI_SPEC.md`, `IOS_PHASE1_HANDOFF.md`, `test-cases-*.md`.

`AGENTS.md` prescribes one bug file per bug **at the root**, so this follows the documented
protocol — but at 18 bug files the machine-generated artifacts are competing with the
hand-written docs for the same namespace, and the root is where a new contributor looks first.
The count grows with every filing session, so this finding worsens by default until the protocol
changes.

Casing is also inconsistent: `BUG_FOUND.md` / `BUG_FOUND.template.md` (uppercase) vs
`BUG_Found_02.md` … `BUG_Found_18.md` (mixed case). Any glob or sort that assumes one case will
misbehave.

> **Fix:** move the 18 bug files to `bugs/`, keep `BUG_FOUND.template.md` at root (or move it
> too), and standardize the prefix to one casing. Update `AGENTS.md` §Bug Reporting Protocol and
> its Directory Layout block to match.

> **✅ RESOLVED (documentation pass, 2026-10-27) — partially.** The bug files were
> **normalized in place** rather than moved: all 14 now share the canonical H1
> (`# BUG_Found_NN.md — Bug Report NN`), an identical `## Status` block, and the
> bullet-list Identity/Test Context form (the four table-style files were converted).
> `BUGS.md` was added as a single index with severity, priority, state and a
> defect-family analysis.
>
> **Still open:** the *files* remain at the repo root and the casing split
> (`BUG_FOUND.md` vs `BUG_Found_NN.md`) persists — renaming 14 files plus their inbound
> references is a mechanical but reviewable change that touches `progress.md`, `AGENTS.md`,
> `README.md` and the catalogue. Deliberately deferred to a dedicated PR rather than
> bundled into a documentation pass.

#### S11 — `AGENTS.md` directory layout has drifted
The layout block lists `CATEGORIES.md` and `agent.md` — **neither exists**. It enumerates
`BUG_Found_02..08` but there are now **13**. It does not mention `docs/09-ios-migration-plan.md`,
`IOS_PHASE1_HANDOFF.md`, or the `*.ios.*` twin convention at all — the single most important
structural convention in the project is undocumented in the agent instructions.

> **Fix:** regenerate the layout block from the actual tree and add an "iOS twin convention"
> section documenting the `*.page.ts` / `*.ios.page.ts` / `*.spec.ts` / `*.ios.spec.ts` scheme,
> the shared-tag-source rule, and the platform-isolation invariant.

> **✅ RESOLVED (documentation pass, 2026-10-27).** The layout block was regenerated from
> the actual tree: the phantom `CATEGORIES.md` / `agent.md` entries are gone, all 14 bug
> files are enumerated with one-line descriptions, and `BUGS.md`, `HANDOVER.md`,
> `code_review.md`, `pr_review.md`, `IOS_PHASE1_HANDOFF.md` and `BUG_FOUND.template.md`
> are now listed.
>
> Three new sections were added: **§ Android / iOS Twin Convention** (the pairing scheme,
> the no-cross-import rule, the add-to-both-twins rule), **§ Source-of-truth ordering**
> (which document wins when they disagree), and a corrected **§ Commands to Run**
> (the old one told agents to run `./gradlew assembleDebug`, which does not exist in
> this repo — it is the harness, not the app).

### 🟡 Minor — opportunistic

| # | Finding | Location |
|---|---|---|
| **S12** | Node version stated three different ways: `.nvmrc` = `24`, `engines.node` = `">=20"`, README/HANDOVER = `"≥ 22"`. | `.nvmrc`, `package.json:8`, `README.md`, `HANDOVER.md` |
| **S13** | `package.json` description still says *"Android"* though the suite drives both platforms. | `package.json:4` |
| **S14** | `.kilo/` is **not gitignored** while `.zcode/` is (commit `8313d8e` stopped tracking `.zcode` explicitly). `.kilo/` holds `node_modules/`, `package-lock.json`, `plans/` — one `git add -A` from committing a nested `node_modules`. | `.gitignore` |
| **S15** | `opencode.json` hardcodes `/Users/auliameiazizi/Library/Android/sdk` — a machine-specific absolute path in a tracked file. | `opencode.json` |
| **S16** | TC prefix drift across platforms: Android `TC-BUD` / `TC-BACK` vs iOS `TC-BUDGET` / `TC-BACKUP`. Same feature, different id — breaks cross-platform traceability in reports. | `budget.spec.ts:25` vs `budget.ios.spec.ts:40`; `backup.spec.ts:111` vs `backup.ios.spec.ts:75` |
| **S17** | 2 Android specs have **no iOS twin**: `transaksi/delete-undo.spec.ts` (destructive flow + undo toast) and `ringkasan/summary.spec.ts`. All 8 page objects *do* have twins. | `src/tests/transaksi/`, `src/tests/ringkasan/` |
| **S18** | `add-expense.ios` and `add-income.ios` have **no npm script**, while the other 12 iOS specs each have one. | `package.json` |
| **S19** | 3 of 254 `it()` blocks carry no test-case id (seed/arrange blocks: *"seeds three transactions…"* ×2, *"seeds two incomes…"*). Correct in spirit — they are setup, not cases — but they render as untitled tests in the report. A `TC-SETUP-*` convention would make the report fully traceable. | `transaction-list.spec.ts:40`, `transaction-list.ios.spec.ts:30`, `summary.spec.ts:52` |
| **S20** | `a11y-parse.ts` / `a11y-parse.ios.ts` are **helper modules living under `src/tests/`**. The `*.spec.ts` glob won't collect them, so no runtime bug — but they belong in `src/helpers/`. | `src/tests/app/` |
| **S21** | `qodana.yaml` (JetBrains Qodana config) sits at the root of a TypeScript project — copy-paste from the app repo. | `qodana.yaml` |
| **S22** | `docs/` has `09-ios-migration-plan.md` but no `08-` prefix sibling; numbering starts at 09. | `docs/` |

> **Partial resolution (documentation pass, 2026-10-27):** **S12** — `README.md` and
> `HANDOVER.md` now both state *"Node.js ≥ 22 (`.nvmrc` pins `24`; `package.json` requires
> `>=20`)"*, so the three-way conflict is documented rather than silent. Picking **one**
> floor is still a `package.json` decision, not a docs decision. **S13** — the
> `package.json` description still says *"Android"*; that is a code change, not a docs
> change. **S16**, **S17**, **S18**, **S19**, **S20**, **S22** all remain open — every one
> is a source change.

---

## Carry-forward from Review #2 (2026-10-25)

| # | Item | Status now |
|---|---|---|
| **R1** | `switchMonth` asserts the label *changed*, not that it equals the target month | ✅ **fixed 2026-10-28** — all three switchers (`daftar.page.ts`, `ringkasan.page.ts`, `daftar.ios.page.ts`) now parse the label via the new `src/helpers/months.ts`, step it, and require an exact (month, year) match; a label that moved to the wrong month throws immediately. Verified only by static checks — needs a device pass (switchers touch `prevMonth`/`nextMonth` callers on both platforms) |
| **O2** | `@wdio/junit-reporter` not installed (blocked on dependency approval) | ✅ **fixed 2026-10-28** — `@wdio/junit-reporter@9.32.0` installed as a devDependency (explicit user approval, see Standing decisions) and wired as a second reporter in both `wdio.conf.ts` and `wdio.ios.conf.ts`, writing `reports/junit-results-<cid>.xml` (v9's `outputFileFormat` must be a function — the default stream name is `.log`). Device-verified on the 2026-10-28 Pixel_10 runs (`tests="6" failures="0"`); junit subtree adds 0 advisories |
| **O3** | `tambah` category-sheet magic scroll bound `8 × 45%` | ✅ **resolved** — now uses `UiScrollable.scrollIntoView` (`tambah.page.ts:90`) |
| **O4** | TC-INC-09 re-implements `save()` inline | ✅ **fixed 2026-10-28** — `add-income.spec.ts` calls `tambah.save()` (click + toast wait, the same two steps) |
| **O5** | `tsconfig` `types` redundant (`webdriverio` + `@wdio/globals/types`); `noUncheckedIndexedAccess` not enabled | ✅ **fixed 2026-10-28** — redundant `webdriverio` entry removed from `types`; `noUncheckedIndexedAccess` enabled and the ~32 surfaced sites fixed with guards (no non-null assertions). Behavior-neutral by construction; device gate still applies |
| **O6** | `ubah.openFromDaftar(daftar: DaftarPage, …)` couples page objects | ✅ **fixed 2026-10-28** — `openFromDaftar` deleted from both Ubah twins; all 28 spec call sites (14 Android + 14 iOS) now navigate via `daftar.tapEdit(categoryId)` + `ubah.waitForScreen()`. Zero page-object cross-imports remain, so the future `no-restricted-imports` lint rule has nothing to flag |
| **N1** | Mixed `waitForDisplayed()` / `expect(...)` assertion styles | 🔴 **escalated** → now **S8** (105 vs 109 vs 0) — ✅ **swept 2026-10-28** (`b6152aa`, 212 `toBeDisplayed()` sites; see S8 status) |
| **N2** | Convoluted `Array.from({length:20})` loop | ✅ **fixed 2026-10-28** — both navigation twins use a plain indexed loop |
| **N3** | 3 `as WebdriverIO.Element` casts after `toBeDefined()` guards | ✅ **fixed 2026-10-28** — `transaction-list.spec.ts` narrows with a guard-throw (better failure message) instead of casts |

---

## Verification gate — still needs a device

Static checks pass at the time of writing (`tsc --noEmit` exit 0 · `npm run test:unit` 20/20 ·
`npm run check:parity` green · `npm audit --omit=dev` 0). These **must** still be confirmed on
hardware before the harness is considered green:

1. **Never device-run to date:** `kategori/category-management.spec.ts` (Phase 2 navigation
   repairs). *(Cleared on 2026-10-28: `anggaran/budget.spec.ts` 8/8 after the M3 rename and again
   after the M5/M6 sweep; `ringkasan/summary.spec.ts` ran twice, **TC-SUM-09's bar guard green
   both times** — the other three failures there are `BUG_Found_16`, identical on pre-sweep code.)*
2. **iOS suite:** `wdio.ios.conf.ts` and the 14 iOS specs have not been exercised by a
   typechecked/green config path; the 6 iOS-tagged skips
   (`TC-BACKUP-04`, `TC-LIST-07`, `TC-LIST-08` ×2, `TC-PERF-05`, plus `TC-KAT-08/10` on Android)
   remain open by decision.
3. **After S3 lands:** re-run the full suite on emulator — a dependency override touching the
   Appium HTTP stack must not perturb session stability.
4. **After S5/S6/S7 land:** re-run `ringkasan`, `kategori`, `anggaran`, `backup` on both
   platforms; these are pure refactors and must be behavior-neutral.
5. **After S8/S9 land:** confirm no new flakes across 3 consecutive emulator runs (the
   assertion-style sweep touches 105 sites). — *S8 landed 2026-10-28 as 212 sites; this bar is
   **not yet met**. Pass 1 reached 8 of 16 spec files, and the sweep was separately verified
   screen-by-screen on device (see the S8 status block). S9 is untouched.*
6. **M5/M6 sweep — device gate ✅ closed by A/B (2026-10-28).** The sweep touched 46 files under
   `src/` plus both runner configs. Four Android groups were run: `anggaran` **8/8**, `tambah`
   **39/41**, `ringkasan` **10/13**, and the failures were then re-run against the **pre-sweep**
   snapshot, which reproduced the same ids with the same messages — the sweep is exonerated
   directly, not by argument. What the runs *did* surface is filed as `BUG_Found_16`/`17`/`18`.
   **Still owed:** an iOS run (no simulator is booted), and `kategori`/`backup`/`transaksi` on
   Android.
7. **Environment trap, needs a decision:** the emulator carries app **v2.3 (versionCode 5)**
   while `resources/` ships only **v2.2 (versionCode 4)** — Appium never downgrades an installed
   package, so every "v2.2" run banner on this machine has actually been exercising v2.3. Either
   commit the v2.3 APK or have the runner assert that the installed `versionName` matches the
   configured APK; `BUG_Found_16.md` is only visible because of this drift.

---

## Standing decisions & policies

- **Never `npm audit fix --force`** — it downgrades `appium` 3.x → 2.19. Use targeted
  `overrides` (S3).
- **Dependency changes require explicit approval** — including `overrides`, which alter the
  resolved tree. Granted so far:
  - `@wdio/junit-reporter@^9.0.0` (2026-10-28, closes O2 — install verified 0 new advisories)
  - `overrides` block (2026-10-28, closes S3):
    - `axios@^1.20.0`, `body-parser@^2.4.0`, `brace-expansion@^2.0.2`, `follow-redirects@^1.16.1`, `proxy-addr@^2.0.8`
    - 33 advisories (7 critical, 24 high) reduced to 19 (all transitive dev-only, e.g. mocha, webdriverio — no runtime risk)
  - `sharp`/`shell-quote` — accepted as low-reachability (localhost harness, never in Appium server path)
- **Locator rule:** locate by test tag, never by visible text. The one exception
  (`config/category-labels.ts`, text-based category sheet lookup) is documented, scoped, and
  carries its own removal condition — it must be deleted the moment the app tags sheet rows.
- **Never locate by visible text on iOS** — accessibility identifiers are the contract; tree
  depth is not fixed, so positional child selectors are forbidden.
- **Bar-view guard fallback:** if TC-SUM-09 fails with "has no measurable bar views", relax
  `viewList.length !== 2` to `length < 2` in `ringkasan.breakdownBarRatio` (one-character
  change).
- **Test failure retry limit:** 3 consecutive failed attempts → skip, mark `~[BUG]~` in
  `progress.md`, open a `BUG_FOUND.md`, continue with remaining backbone tests.

---

## Where things live

```
src/config/tags.ts           test-tag contract (mirrors TestTags.kt) — 6 screen groups
src/config/categories.ts     stable category/account IDs
src/config/category-labels.ts text-label fallback (documented exception; delete on app fix)
src/helpers/locators.ts      byTag / iosByTag / allByTag / scrollToTagMatches
src/helpers/input.ts         typeIntoTaggedField + setValue + iOS twins (406 LOC, 3 attempts each)
src/helpers/elements.ts      extractChildTexts / readAmount / iOS geometry helpers
src/helpers/money.ts         Rp formatting + parsing (17 unit tests cover it)
src/helpers/transactions.ts  createTransaction / uniqueNote / tapUndoAction
src/pageobjects/*.page.ts    Android pages (8) — tag sources for 3 of them live here (S5)
src/pageobjects/*.ios.page.ts iOS twins (8) — same API surface, accessibility-id locators
src/tests/**/*.spec.ts       Android specs (16)
src/tests/**/*.ios.spec.ts   iOS specs (14) — 2 Android specs lack a twin (S17)
```

**Conventions to preserve:** tag-only locators (documented exception) · every non-obvious
member carries a JSDoc explaining *why* · verified-retrieve-verify-then-throw for text entry
· Android↔iOS twin file naming · one `it()` = one test case id · `~/Documents/github/saku-appium`
is the harness root, `~/Documents/github/simplemoneytracker` is the app repo.

---

## Where things live — commands

- `npm run typecheck` — `tsc --noEmit` (**currently excludes `wdio.ios.conf.ts` → S1**)
- `npm run test:unit` — `node:test` via ts-node hook, 17 tests
- `npm test` — full Android suite (`wdio.conf.ts`)
- `npm run test:ios` — full iOS suite (`wdio.ios.conf.ts`)
- `npm run test:sanity` / `test:regression` / `test:integration` — tag-filtered via `TEST_GREP`
- `npm run test:shard` — spec files partitioned round-robin across devices
- `npm run test:parallel` — every spec on every device (cross-device coverage)
- Device selection: `SAKU_DEVICES="udid1,udid2"` · external servers: `SAKU_APPIUM_PORTS="4723,4725"`
- APK: `resources/SimpleMoneyTrackerKT-v2.2.apk` (override `SAKU_APK`)

---

## Documentation maintenance pass — 2026-10-27

Every Markdown file in the repo (31 before this pass, 32 after — `BUGS.md` was added) was
fact-checked against the source and updated. Method: a script extracted every path
reference, npm-script name, internal anchor and numeric claim from all `.md` files and
verified each one against the working tree.

**Ground truth used** (measured, not assumed):

| Fact | Value |
|---|---|
| `src/` TypeScript files / LOC | 60 / 8,883 |
| Spec files | 30 (16 Android + 14 iOS) |
| Test cases (`it()`) | 254 (137 Android + 117 iOS) |
| Page objects | 16 (8 screens × 2 platforms) |
| Helper modules (+ unit tests) | 6 (+ 2 test files, 17 tests) |
| Config modules | 3 |
| Unique test-case ids | 148, across 19 prefixes |
| Catalogue cases | 195 across 25 areas |
| npm scripts | 31 |
| Node | `.nvmrc` 24, `engines.node` `>=20` |

### What was fixed

| File(s) | Change |
|---|---|
| `README.md` | Layout section listed only the Android half — regenerated with the full tree, the **iOS twin convention**, and the real counts. Added a **§ Run — iOS** section (the iOS suite had no run commands at all). Added a **§ Documentation map** index. Removed the stray trailing `# saku-appium` heading. Re-labelled the MCP material as legacy, and separated "run the suite" from "interactive MCP triage". |
| `AGENTS.md` | **S11** resolved: layout regenerated from the real tree (phantom `CATEGORIES.md` / `agent.md` gone, all 14 bugs enumerated). Added **§ Android / iOS Twin Convention** and **§ Source-of-truth ordering**. Fixed **§ Commands to Run** — it told agents to run `./gradlew assembleDebug`, which does not exist in this repo. Rewrote the bug protocol to match the 14-file reality. |
| `BUG_FOUND.md` … `BUG_Found_14.md` | All 14 normalized: canonical H1 (`# BUG_Found_NN.md — Bug Report NN`), a uniform **## Status** block (state + summary), and the bullet-list Identity/Test Context form — the four table-style files were converted. |
| `BUGS.md` | **New.** Single index of all 14 defects with severity, priority, state, and a *defect-family* analysis (system-surface automation / platform rendering differences / real app defects). |
| `BUG_FOUND.template.md` | Rewritten to the canonical structure, with a **Status** section and a footer documenting the conventions. |
| `HANDOVER.md` | §1, §2, §3 and §4 updated for the dual-platform reality — the onboarding guide described an **Android-only** project. Added the iOS prerequisites, the iOS run commands, the iOS half of the project map, and the twin convention. §11 now points at `code_review.md` and `BUGS.md`. |
| `TESTABILITY.md` | Added the note that `src/config/tags.ts` is the machine-readable mirror (71 tag literals) and that the one text-lookup exception is `src/config/category-labels.ts`. |
| `progress.md` | Fixed 4 **planned** spec paths that never existed (`form-validation.spec.ts` → `validation.spec.ts`, `rotation-config.spec.ts` → `rotation.spec.ts`, …). Filled 4 empty `Agent: ___________` placeholders with verifiable attribution. Fixed the title casing and the self-referential first line. |
| `test-cases-simple-money-tracker.md` | **§Q and §R were duplicated** (an "executed" note followed by the catalogue) — merged. Corrected the totals from "*~140 cases across 25 areas*" to **195 across 25**, and added the catalogue-vs-implemented distinction (195 catalogue / 148 implemented). |
| `docs/README.md` | Rewritten: the reading order listed `DEVELOPMENT.md` twice, and the file never mentioned the harness-side documents. Added the harness/app distinction — `docs/` describes the **app**, the root describes the **harness**. |
| `docs/DEVELOPMENT.md` | 3 references to the deleted `CATEGORIES.md` → `TESTABILITY.md` § CATEGORIES. |
| `docs/09-ios-migration-plan.md` | The claim *"**Nothing in this document has been implemented yet**"* was false — 45 of its 74 checkboxes are done. Replaced with an accurate status header. |
| `TESTING.md` | 4 section headings read `## utest …` — a broken find/replace of "Unit test". Fixed. Status note updated with the current scale and the iOS half. |
| `IOS_PHASE1_HANDOFF.md` | This was a point-in-time TODO list describing a port that is now **117 cases across 14 specs**. Rewritten as a status document: a per-area table of what shipped, a consolidated **§ Verified iOS facts** section (the hard-won findings, including the sibling-rendering rule), and the **two areas still unported** (TC-SUM, TC-DEL/TC-UNDO) with their specific risks. |
| `code_review.md` | This section. |

### Deliberately *not* changed

- **File renames and moves** (the `bugs/` directory, the casing split) — a rename touches
  14 files plus their inbound references across 5 documents. Worth its own PR.
- **Historical records** — `pr_review.md` (a review of PR #3, dated) and the failure-log
  entries in `test-cases-simple-money-tracker.md` are append-only history. Editing them
  would falsify the record.
- **Claims that are correct but reference files in the app repo** (e.g.
  `docs/screenshots/saku-ios-real.png`) — these were annotated to say where the file
  actually lives rather than deleted.
- **`docs/` app-domain documents** (`PRODUCT.md`, `DESIGN.md`) — verified accurate against
  the app repo; their cross-references and counts (20 component sections, 15 artboards)
  all check out.

### Residual

The audit now reports **zero broken references**. The remaining flagged items are all
intentional: negative references in this file (`there is **no** src/config/timeouts.ts`),
placeholders in templates (`BUG_Found_NN.md`), and gitignored local artifacts cited as
evidence (`reports/…`).

**The underlying risk is unchanged:** the docs are now *correct*, but nothing keeps them
*correct*. The same argument as **S2** and **S4** applies — a link-checker and a
`npm run check:docs` in CI would make documentation drift a build failure instead of
something a reader has to notice. The script used for this pass is a good starting point.

---

## Recommended order of work

> Updated after the 2026-10-27 documentation pass — item 8 is now done (except the
> file-rename part of S10).

1. ~~**S1** (one line) + **S4** (CI running `typecheck && test:unit`) + **M7** (twin-parity +
   TC-id uniqueness script)~~ — **2 of 3 done 2026-10-28.** **S1** had already landed (the
   `include` line lists `wdio.ios.conf.ts`; only the prose was stale — now corrected above).
   **M7** landed as `scripts/check_parity.mjs` / `npm run check:parity` +
   `scripts/parity-baseline.json`, converting the silent debt of M1–M4 into loud debt.
   **S4 is the only piece left**, and its command list grew: `typecheck && test:unit &&
   check:parity` — all three need no device, so a CI gate is cheap and would have caught M1–M4
   and the S1 prose drift on their own.
2. **S2** (lint/format) — make the conventions enforceable before more agents touch the tree.
3. **S3** (dependency `overrides` + per-advisory decisions) — needs approval; do it in a
   dedicated PR so the diff is reviewable on its own.
4. ~~**M3 → M4 → M1 → M2** (test-case identity, then twin API convergence) — cheapest
   maintainability wins first; M7's script verifies each step.~~ ✅ **all four landed 2026-10-28**
   (M1+M3+M11 with the budget prefix convergence, M4 with the chunk suffixes, M2 with the
   `ringkasan` iOS port), **and M7 landed the same day**, so this group is closed. The review's
   root-cause note — *nothing enforces twin parity* — is now false: `npm run check:parity` is
   what stops them drifting back.
5. **S5 → S7** (pure refactors: tag centralization, helper dedup) — one PR, behavior-neutral,
   verified by the device gate.
6. ~~**M5** (timeout constants) — mechanical, behavior-preserving; do it with S9 so the two
   literal-cleanups land together.~~ — ✅ **M5 + M6 landed 2026-10-28, deliberately *without*
   S9.** The review suggested doing them together; doing them apart is what made the rename
   verifiable (a pure-rename diff has one thing to check: does every number still equal what it
   was). S9 now has a better starting position than it did — a named inventory of every budget
   and every sleep, with each unresolved inconsistency tagged `_QUICK`/`_SLOW` in
   `src/config/timeouts.ts` and `src/config/settles.ts`.
7. **S8 → S9** (assertion-style sweep, sleep replacement) — largest diff; land separately with
   3 clean emulator runs as the acceptance bar.
8. ~~**S10 → S11, M8 → M9, M12 → M22** (docs/hygiene)~~ — **done** in the 2026-10-27
   documentation pass, except: (a) the `bugs/` directory move + casing standardization
   (own PR), (b) `S12`/`S13` (a `package.json` decision), (c) `S16`–`S20`, `S22` (source
   changes). A **`npm run check:docs` link-checker in CI** would close the loop the
   documentation pass opened — without it the docs drift again within weeks.

---

# Review #2 — 2026-10-25 (historical)

Closing summary of the **2026-10-24 review** (a `ringkasan.page.ts` deep-dive graded B+/A−, plus a
project-wide five-axis quality and security review graded B/B+). All actionable findings were
remediated on **2026-10-25** in an orchestrated pass. The full original findings and per-fix
annotations live in this file's committed predecessor (git history).

## Status at a glance

| Area | State |
|---|---|
| Critical findings (C1–C3) | ✅ all fixed |
| Required findings (R1–R9) | ✅ 8 fixed; R1 partially (enhancement open → now carried forward) |
| `ringkasan.page.ts` findings 1–8, steps 1–10 | ✅ all fixed |
| Optional/nit tier (O1–O6, N1–N4) | O1 done; O2 deferred by decision; O3 done; O4–O6 + N1–N3 open at discretion; N4 kept as-is |
| Security conditions | ✅ `appium-mcp` pinned; dependency-deferral policy documented below (**now superseded by S3**) |
| Verification | `tsc --noEmit` clean, unit tests 17/17. **Device run 2026-10-25:** transaction-list spec green on emulator (9 passing incl. seed, 3 policy-skipped) — validated the refactors on device and caught+fixed a real regression (typing helper's exact-equality verify broke currency-field seeds; now `'exact'/'digits'` modes). TC-LIST-07 revival failed 4× — rename dialog still dismisses under WDIO (works via MCP `set_value`), remains skipped with root-cause trail in progress.md. **Still never device-run:** Phase 2 specs (budget, category-management), TC-SUM-09 bar guard |

## Fixes landed (2026-10-25)

| Area | Change |
|---|---|
| **Page-object decoupling** | `readAmount`, `extractChildTexts`, `barFillRatio` moved/created in `src/helpers/elements.ts`; no page object imports another except `ubah ← DaftarPage` (O6, open) |
| **Robustness** | `switchMonth` settle-wait + unmasked label reads in both `daftar` and `ringkasan`; `rowTexts` wrapped in the 3-attempt retry; `waitForExist` guard + exact-2 bar-view guard in `breakdownBarRatio` |
| **Type honesty** | `as unknown as Element[]` cast removed (spread idiom — in WDIO v9 the `$$` chainable's `length` is `Promise<number>`); `src/types.ts` is now the single `webdriverio` import point |
| **Spec blockers (C1/C2)** | `budget.spec.ts` TC-BUD-08/09 and `category-management.spec.ts` TC-KAT-11 navigation repaired; bonus same-class fix in TC-KAT-02. These were *test-code* bugs — no `BUG_FOUND.md` entry required by the AGENTS.md protocol |
| **Config & supply chain** | Screenshot hook actually works now (`onPrepare` mkdir + logged catch); mocha timeout 20 min → 180 s; `typecheck` script; `engines` + `.nvmrc` (24); `.idsig` untracked; `appium-mcp` pinned to `1.97.1` |
| **Consolidation** | One verified-retrying `typeIntoTaggedField` in `helpers/input.ts` (3 typing copies deleted; throws instead of falling through to Save). One `extractChildTexts` loop everywhere (deliberate exceptions: `rowAmountTextsInOrder`'s per-row Rp selection, and a skipped spec needing element handles) |
| **Hygiene** | Dead `cadangan.page.ts` deleted; dead exports removed (grep-verified; `allByTag` correctly kept — the fixes made it live); 12 magic tag strings → `tags.*`; 3 uncatalogued tags added to `anggaran`'s local map |
| **Money parsing** | `parseAmountText` sign bug fixed — sign now read from the gap before the *last* numeric run, so mixed-sign comparison rows parse correctly; 17/17 unit tests, no skips |

## Open items (as of 2026-10-25 — status now tracked in Review #3)

1. **R1 enhancement** — `switchMonth` (both files) verifies the label *changed*; assert the *target* label instead. `src/pageobjects/daftar.page.ts`, `src/pageobjects/ringkasan.page.ts` — **still open**
2. **O2 junit reporter** — blocked on installing `@wdio/junit-reporter`; dependency adds require explicit approval. One-line reporters config once approved — **still blocked**
3. **O3** — `tambah` category-sheet scroll bound is a magic `8 × 45%`; compute from sheet height or try `scrollToTagMatches` first. `src/pageobjects/tambah.page.ts` — ✅ **resolved**
4. **O4** — TC-INC-09 re-implements `save()` inline; call `tambah.save()`. `src/tests/tambah/add-income.spec.ts` — **still open**
5. **O5** — `tsconfig.json` `types` has redundant `webdriverio` + `@wdio/globals/types`; consider `noUncheckedIndexedAccess` (will surface `texts[0]`-style fixes) — **still open**
6. **O6** — `ubah.openFromDaftar(daftar: DaftarPage, …)` couples page objects; instantiate internally or move into the spec — **still open**
7. **N1** — `navigation.spec.ts` mixes bare `waitForDisplayed()` with `expect(...)`; pick one house style. **N2** — convoluted `Array.from({length:20})` loop. **N3** — 3 `as WebdriverIO.Element` casts after `toBeDefined()` guards — **all still open**
8. **Device verification gate** — a first emulator run must confirm: the Phase 2 spec navigation fixes (budget/category specs remain never-executed), the exact-2 bar-view guard in TC-SUM-09, and the consolidated daftar reads (`test:anggaran`, `test:kategori`, `test:transaksi`, `test:ringkasan`) — **still outstanding**

## Standing decisions & policies (2026-10-25)

- **Dependency deferrals:** `shell-quote` (via appium) and `sharp` (via uiautomator2-driver) accepted as low-reachability in this localhost harness. Re-audit on every appium/driver upgrade; next scheduled review **2027-01-25**. **Never** run `npm audit fix --force` — the "fix" downgrades appium 3.x → 2.19.
- **Bar-view guard fallback:** if TC-SUM-09 fails with "has no measurable bar views", the row renders extra Views — relax `viewList.length !== 2` to `length < 2` in `ringkasan.breakdownBarRatio` (one-character change).
- **Dependency changes** (e.g. O2's junit reporter) require explicit approval; the supply-chain posture of this review is the reason.
