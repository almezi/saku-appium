# AGENTS.md — Agent Operating Instructions

This file tells coding agents how to operate within the Saku test harness workspace.

## Commands to Run

This repo is the **test harness**, not the app. The app (`id.almezi.simplemoneytracker_kt`)
lives in a separate repository — there is no `gradlew` here.

- **Install deps**: `npm install` (Appium is a local dependency; no global install)
- **Typecheck**: `npm run typecheck` — covers `src/**/*.ts` and `wdio.conf.ts`.
  **`wdio.ios.conf.ts` is NOT included**; see `code_review.md` finding **S1**.
- **Unit tests**: `npm run test:unit` — 18 tests, no device required
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
2. **Create** a bug report file in the repo root, copying `BUG_FOUND.template.md`. The
   **first** bug is `BUG_FOUND.md`; every later one is `BUG_Found_<NN>.md` where `NN` is
   the next free number (02, 03, … 14). Never overwrite an existing report.
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
variants — bullet lists (01–04, 10–14), tables (05–06, 08–09) — all following the
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
  (`BUG_Found_02.md`, `BUG_Found_03.md`, …).
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
├── TESTABILITY.md   # Test tag contracts (read this first)
├── UI_SPEC.md       # UI behavior spec (read this too)
├── AGENTS.md        # Agent operating instructions (this file)
├── HANDOVER.md      # Onboarding guide for a new SDET/QA engineer
├── code_review.md   # Senior QA review (structure, conventions, maintainability)
├── pr_review.md     # Historical review of PR #3
├── progress.md      # Test execution checklist (mark [x]/~[BUG]~)
├── IOS_PHASE1_HANDOFF.md  # iOS Phase 1 port handoff notes
├── BUG_FOUND.template.md   # Bug report template
├── BUGS.md                 # Index of all filed bugs — start here
│
├── BUG_FOUND.md     # Bug #01 — TECNO real-device deadlock
├── BUG_Found_02.md  # Bug #02 — SAF picker drive (TC-BACKUP-04)
├── BUG_Found_03.md  # Bug #03 — vanishing committed transaction (TC-BACKUP-06)
├── BUG_Found_04.md  # Bug #04 — rename-dialog self-dismiss under WDIO (TC-KAT-08/10, TC-LIST-07)
├── BUG_Found_05.md  # Bug #05 — landscape rotation defect (Android)
├── BUG_Found_06.md  # Bug #06 — nav-label clipping at 200% font scale (Android)
├── BUG_Found_07.md  # Bug #07 — category-sheet lookup failure (TC-PERF) — fixed via text-label lookup
├── BUG_Found_08.md  # Bug #08 — iOS build blocker: xcodebuild SIGTRAP on malformed Saku.xcscheme
├── BUG_Found_09.md  # Bug #09 — pull-to-refresh not implemented (TC-LIST-11)
├── BUG_Found_10.md  # Bug #10 — iOS backup import (TC-BACKUP-04)
├── BUG_Found_11.md  # Bug #11 — iOS date-picker day-first label ordering
├── BUG_Found_12.md  # Bug #12 — iOS memory stability across add/delete cycles (TC-PERF-05)
├── BUG_Found_13.md  # Bug #13 — iOS tagged container renders strings as siblings
├── BUG_Found_14.md  # Bug #14 — iOS numeric keypad Delete key is a silent no-op (TC-AMT-06)
│
┕ root /            # Test infrastructure files
│   ├── README.md
│   ├── wdio.conf.ts          # Android runner config
│   ├── wdio.ios.conf.ts      # iOS runner config (NOT in tsconfig include — see code_review.md S1)
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
  expected to match; today they have drifted (`code_review.md` findings **M1**–**M2**).
- **When you add a test case, add it to both spec twins**, and reuse the same
  `TC-<AREA>-<NN>` id on both platforms.
- Android spec files live at `src/tests/<area>/<name>.spec.ts`; iOS at the same path with
  `.ios.spec.ts` inserted before `.spec.ts`.
- iOS runs through `wdio.ios.conf.ts` (`npm run test:ios`); Android through
  `wdio.conf.ts` (`npm test`).

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
6. Everything else (this file, `README.md`, `progress.md`) is descriptive.
