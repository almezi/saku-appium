# AGENTS.md — Agent Operating Instructions

This file tells coding agents how to operate within the Saku test harness workspace.

## Commands to Run

This repo is the **test harness**, not the app. The app (`id.almezi.simplemoneytracker_kt`)
lives in a separate repository — there is no `gradlew` here.

- **Install deps**: `npm install` (Appium is a local dependency; no global install)
- **Typecheck**: `npm run typecheck` — covers `src/**/*.ts`, `wdio.conf.ts` and
  `wdio.ios.conf.ts`. (The old `code_review.md` **S1** gap — iOS config excluded — is closed;
  `tsconfig.json` `include` lists all three.)
- **Unit tests**: `npm run test:unit` — 20 tests, no device required. Two of them are
  guardrails over the source tree: the test-type taxonomy (see **Test Types**) and the timing
  contract (see **Wait budgets and settle pauses**).
- **Twin parity**: `npm run check:parity` — no device required. Compares each
  `X.page.ts` against `X.ios.page.ts`, asserts one `TC-<AREA>-<NN>` id names exactly one case
  per platform, and that spec twins share their ids. See **Android / iOS Twin Convention**.
- **Run tests locally**: `npm test` (Android) / `npm run test:ios` (iOS). Per-area
  scripts are listed in `README.md`; `HANDOVER.md` §3 explains how to run them.
- **Run one test type**: `npm run test:sanity` / `test:regression` / `test:integration`
  (and the `:ios` variants) — see **Test Types** below.
- **Start Appium session (MCP, interactive triage)**:
  `opencode mcp run --session <session> -- npx -y appium-mcp@latest`

## Git Commit Conventions

- Commits follow Conventional Commits: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`
- Never commit IDE lock files, build artifacts, or temporary screenshots.
- `reports/`, `.idea/`, and `.zcode/` are gitignored. **`.kilo/` is NOT gitignored** —
  do not commit its contents (it contains a `node_modules/` tree).

## Error Logging

- Log errors to the terminal and append to `test-cases-simple-money-tracker.md` when a test fails.
- Use `--verbose` flag when running Appium MCP tools.

## Bug Reporting Protocol

When any agent (human or AI) discovers a bug during test execution, it must:

1. **Stop** the current sub-phase execution (do not continue testing the same flow).
2. **Create** a bug report file in `bugs/`, copying `BUG_FOUND.template.md`. The
   **first** bug is `bugs/BUG_Found_01.md`; every later one is `bugs/BUG_Found_<NN>.md` where `NN` is
   the next free number (02, 03, … 18). Never overwrite an existing report.
3. **Reference** the bug in `progress.md` by marking the affected test case with `~[BUG]`
   instead of `[x]`.
4. **Notify** all other agents via team broadcast or mailbox so they can avoid the same area.

### Bug report file — Required Fields

Copy the template from `BUG_FOUND.template.md` and fill every field:

| Section | Required Fields |
|---------|----------------|
| **Identity** | Reported by, Reported at (ISO timestamp), Branch, Commit SHA |
| **Test Context** | Phase (1\|2\|3), Sub-phase (e.g. 1.B), Test case ID (e.g. TC-INC-01), Spec file |
| **Bug Details** | Title, Description, Steps to Reproduce, Actual Result, Expected Result, Attachment, Severity, Priority |
| **Environment** | Device/Emulator, Platform, Appium version, App build, Android API level |
| **Additional Notes** | Extra context, workarounds, related test cases affected |

The template's field order is the required order. Reports already exist in three
variants — bullet lists (01–04, 10–18), tables (05–06, 08–09) — all following the
template's section order. **Use the bullet-list form** for new reports, and always
include a `## Status` line stating `Open` or `Fixed`.

### Severity Definitions

| Severity | Meaning |
|----------|---------|
| **Blocker** | App crashes, cannot launch, or core functionality completely broken; testing must stop |
| **Critical** | Major user flow broken (save, delete, edit, list); workaround impossible |
| **Major** | Feature works but with incorrect data/calculation; workaround exists |
| **Minor** | UI glitch, cosmetic issue, or non-critical formatting problem |
| **Trivial** | Typo, minor alignment, or cosmetic only |

### Priority Definitions

| Priority | Meaning |
|----------|---------|
| **P0** | Fix before any further testing; blocks entire phase |
| **P1** | Fix before Phase completion; blocks specific sub-phase |
| **P2** | Fix in next sprint; does not block current testing |
| **P3** | Nice-to-have; log for future reference |

### Rules for All Agents

- **Never skip a bug** — if a test fails unexpectedly, investigate and report it.
- **One bug per file** — if multiple bugs are found, create multiple files
  (`bugs/BUG_Found_02.md`, `bugs/BUG_Found_03.md`, …).
- **Do not delete** bug files — they are the record of known issues.
- **Reference the bug ID** when discussing test failures in team messages.
- **Check existing bug files** before starting a sub-phase to avoid duplicating known
  issues.
- **Test failure retry limit** — if a test case fails more than twice (3 consecutive failed
  attempts), skip that test case, mark it with `~[BUG]~` in `progress.md`, create a bug
  report, and continue with the remaining backbone tests. All skipped / repeatedly failing
  test cases are investigated only after all backbone tests in the current phase are
  completed.

## Directory Layout

```
├── docs/          # Technical documentation (specs, architecture) — see docs/README.md
├── improve/       # Design system and screen specs
├── scripts/       # Tooling that is NOT the test runner: check_parity.mjs +
│                  # parity-baseline.json (the twin-parity gate), contrast_check.py,
│                  # perf_measure.sh, perf_memcycles.sh, seed_transactions.sh
├── TESTABILITY.md   # Test tag contracts (read this first)
├── UI_SPEC.md       # UI behavior spec (read this too)
├── AGENTS.md        # Agent operating instructions (this file)
├── HANDOVER.md      # Onboarding guide for a new SDET/QA engineer
├── code_review.md   # Senior QA review (structure, conventions, maintainability)
├── pr_review.md     # Historical review of PR #3
├── progress.md      # Test execution checklist (mark [x]/~[BUG]~)
├── IOS_PHASE1_HANDOFF.md  # iOS Phase 1 port handoff notes
├── BUG_FOUND.template.md   # Bug report template (new reports go in bugs/)
│
├── bugs/                   # All filed bug reports + index
│   ├── BUGS.md             # Index of all filed bugs — start here
│   ├── BUG_Found_01.md     # Bug #01 — TECNO real-device deadlock
│   ├── BUG_Found_02.md     # Bug #02 — SAF picker drive (TC-BACKUP-04)
│   ├── BUG_Found_03.md     # Bug #03 — vanishing committed transaction (TC-BACKUP-06)
│   ├── BUG_Found_04.md     # Bug #04 — rename-dialog self-dismiss under WDIO (TC-KAT-08/10, TC-LIST-07)
│   ├── BUG_Found_05.md     # Bug #05 — landscape rotation defect (Android)
│   ├── BUG_Found_06.md     # Bug #06 — nav-label clipping at 200% font scale (Android)
│   ├── BUG_Found_07.md     # Bug #07 — category-sheet lookup failure (TC-PERF) — fixed via text-label lookup
│   ├── BUG_Found_08.md     # Bug #08 — iOS build blocker: xcodebuild SIGTRAP on malformed Saku.xcscheme
│   ├── BUG_Found_09.md     # Bug #09 — pull-to-refresh not implemented (TC-LIST-11)
│   ├── BUG_Found_10.md     # Bug #10 — iOS backup import (TC-BACKUP-04)
│   ├── BUG_Found_11.md     # Bug #11 — iOS date-picker day-first label ordering
│   ├── BUG_Found_12.md     # Bug #12 — iOS memory stability across add/delete cycles (TC-PERF-05)
│   ├── BUG_Found_13.md     # Bug #13 — iOS tagged container renders strings as siblings
│   ├── BUG_Found_14.md     # Bug #14 — iOS numeric keypad Delete key is a silent no-op (TC-AMT-06)
│   ├── BUG_Found_15.md     # Bug #15 — v2.3 drops six Cadangan test tags on both platforms
│   ├── BUG_Found_16.md     # Bug #16 — UiScrollable cannot scroll the Tambah category sheet (TC-SUM-12, TC-EXP-08)
│   ├── BUG_Found_17.md     # Bug #17 — category label drift: "Obat-obatan" vs contracted "Obat-obat"
│   └── BUG_Found_18.md     # Bug #18 — TC-VAL-17: no tambah_helper node after saving with the keyboard up
│
┕ root /            # Test infrastructure files
│   ├── README.md
│   ├── wdio.conf.ts          # Android runner config
│   ├── wdio.ios.conf.ts      # iOS runner config (typechecked with everything else)
│   ├── test-cases-simple-money-tracker.md  # 195-case catalogue
│   └── TESTING.md
```

## Android / iOS Twin Convention

Every screen that exists on both platforms has **two independent implementations**:

| Android | iOS |
|---|---|
| `src/pageobjects/<screen>.page.ts` | `src/pageobjects/<screen>.ios.page.ts` |
| `src/tests/<area>/<name>.spec.ts` | `src/tests/<area>/<name>.ios.spec.ts` |

Rules:

- **Never import an Android page object from an iOS page object** (and vice versa). The
  two halves are independent; cross-importing is a bug. Currently only
  `src/pageobjects/kategori.ios.page.ts` violates this (it imports the Android tag map
  — see `code_review.md` finding **S5**).
- **When you add a screen method, add it to both twins.** The public method surfaces are
  expected to match; the residual drift is itemised in `scripts/parity-baseline.json`.
- **When you add a test case, add it to both spec twins**, and reuse the same
  `TC-<AREA>-<NN>` id on both platforms. Never reuse an id for a second case on the same
  platform — a defect report naming it must identify one case.
- Android spec files live at `src/tests/<area>/<name>.spec.ts`; iOS at the same path with
  `.ios.spec.ts` inserted before `.spec.ts`.
- iOS runs through `wdio.ios.conf.ts` (`npm run test:ios`); Android through
  `wdio.conf.ts` (`npm test`).

### The parity gate

`npm run check:parity` (`scripts/check_parity.mjs`) enforces the last three rules mechanically,
and it is a **ratchet**, not a report: drift you have not explained fails the run.

- **Hard failures, never baselined** — a `TC-` id defined more than once on one platform
  (the **M4** signature), and a spec pair with **zero** shared ids across platforms (the **M3**
  signature).
- **Ratcheted drift** — recorded in `scripts/parity-baseline.json` with a `reason` naming the
  close action. A NEW gap fails; a gap that has been CLOSED but is still listed **also** fails,
  so the baseline can only live as long as the debt does.
- After changing twins deliberately: `npm run check:parity -- --update`, then justify every new
  entry in `scripts/parity-baseline.json`. `--update` carries existing reasons over per group.

Read the limitations before trusting a green run (they are in the script header): titles are
parsed, not executed, so an `it()` inside a loop is one call site and `${id}`-built titles
(`transaction-list.spec.ts:220`) resolve to no id. Private/protected members and either base
class's surface are excluded — the check compares what specs can CALL.

## Wait budgets and settle pauses

Numbers that bound time do not belong at a call site (the **M5**/**M6** finding): a bare
`15_000` cannot say whether it means the same thing as the `15_000` two files over.

| Kind | Where it lives | Examples | What it is |
|---|---|---|---|
| **Deadline** — a `waitFor…`/`toBe…({ wait })` ceiling | `src/config/timeouts.ts` | `SCREEN_READY`, `ELEMENT_PRESENT`, `COMPOSITION_WAIT`, `SYSTEM_SHEET`, `SURFACE_DISMISS`, `DEFAULT_TIMEOUT` | Returns as soon as the condition holds; a wider number only costs time on a failure |
| **Sleep** — a `driver.pause()` | `src/config/settles.ts` | `STALE_RETRY`, `SWIPE_ANIM`, `MONTH_LABEL_RECOMPOSE`, `UNDO_TOAST_EXPIRY` | Blocks for the full duration every run |

Rules:

- **Never write a numeric `timeout:`/`wait:`/`interval:`, a numeric `timeout =` default
  parameter, or a numeric `driver.pause(N)`.** `npm run test:unit` fails on it
  (`src/config/__tests__/timing-literals.test.ts`), and the same test fails on a constant in
  either module that nothing waits on.
- Pick by **intent**, not by number. If no name fits, add one — with a doc line saying what it
  waits for and why it is that size. Do not reuse a constant just because the number matches.
- `DEFAULT_TIMEOUT` is the suite fallback — it is what both runner configs pass to
  `waitforTimeout`. Call sites still name their budget.
- A `_QUICK`/`_SLOW` twin is not a tier to choose from. It marks two sites with the same intent
  and different numbers, kept visible for **S9**. Same for the `_ANDROID`/`_IOS` pairs.
- Re-tuning a number is a deliberate change: change the constant, not the call site, and say why
  in the commit. `code_review.md` **S9** tracks the sleep-as-synchronization debt.
- Out of scope by design: `duration:` inside a W3C `performActions` gesture (part of the swipe's
  shape), and the runner configs' mocha `timeout: 180_000` / `connectionRetryTimeout` (not UI
  waits).

## Test Types

Every **test case** carries exactly one **test-type tag** at the end of its `it()` title —
`@sanity`, `@regression` or `@integration`. The vocabulary is `src/config/test-types.ts`;
the tags are what mocha's `grep` matches, so the type scripts filter on them:

```ts
it('TC-NAV-01 app launches on the Tambah screen @sanity', async () => { … })
```

```bash
npm run test:sanity        npm run test:sanity:ios
npm run test:regression    npm run test:regression:ios
npm run test:integration   npm run test:integration:ios
```

- `@sanity` — the app launches and the core path is intact (fast; runs on every change).
- `@regression` — every feature behaves as specified.
- `@integration` — cases spanning several screens or flows at once.

All the cases in a file share one type. Both twins of a spec carry the SAME type.

**When you add a test case, tag it.** An untagged case is not a loud failure — mocha's
`grep` matches the tag in the test's full title, so the case is silently excluded from
every filtered run and never executes. `npm run test:unit` fails on it: the guardrail in
`src/config/__tests__/test-types.test.ts` asserts every case carries exactly one
recognized type, that a file does not mix types, and that the file's `describe()` agrees
with its cases.

**Name arrange blocks `TC-SETUP-<NN>`, never leave them untitled.** A seed step written as
an `it()` (so it inherits the spec's isolation) still shows up in the report, and a title
without an id cannot be cited from a defect report. `TC-SETUP-` is that id: it is
deliberately **not** a catalogue prefix — `test-cases-simple-money-tracker.md` stays the
list of real cases, and the parity gate counts the setup block like any other title.
Existing: `TC-SETUP-01` (both `transaction-list` twins), `TC-SETUP-02` (both `summary` twins).

## Source-of-truth ordering

When two documents disagree, resolve in this order:

1. **`TESTABILITY.md`** — the test-tag contract. Locators come from here, never from
   guessed resource-ids.
2. **`UI_SPEC.md`** — what the app is supposed to do.
3. **The app repository** (`id.almezi.simplemoneytracker_kt`) — the actual implementation
   wins over any document.
4. **`src/config/tags.ts`** — the machine-readable mirror of the contract.
5. **`src/config/test-types.ts`** — the test-type vocabulary (`@sanity` / `@regression` /
   `@integration`) and the guardrail that enforces it.
6. **`src/config/timeouts.ts` / `src/config/settles.ts`** — the timing vocabulary: every wait
   budget and every settle pause, named by intent. A new number at a call site is rejected by
   `npm run test:unit`; if a budget really must change, change the constant (**S9** owns the
   re-tuning, not the call sites).
7. Everything else (this file, `README.md`, `progress.md`) is descriptive.
