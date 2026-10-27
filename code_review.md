# Code Review Record — `saku-appium`

Durable record of the mobile test-automation suite's structure and conventions, reviewed from a
**senior mobile QA** perspective. This document is the single source of truth for review findings;
anything not listed as open below is either fixed or accepted by decision.

| Review | Date | Scope | Grade |
|---|---|---|---|
| **#3 (current)** | 2026-10-27 | Structure, file base, conventions, supply chain, **maintainability** — full project | **B+** (structure) / **B** (maintainability) |
| #2 | 2026-10-25 | `ringkasan.page.ts` deep-dive + project-wide five-axis review | B / B+ |
| #1 | 2026-10-24 | Initial five-axis quality & security pass | B / B+ |

---

# Review #3 — 2026-10-27

## Scope & method

Full-project read of `src/` (8,883 LOC across 57 `.ts` files), both WDIO configs, `package.json`,
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
| Typecheck coverage | 🟠 `wdio.ios.conf.ts` excluded from `tsc` |
| Spec ↔ iOS parity | 🟠 2 Android specs have no iOS twin |
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
| Twin API consistency | **C** | **44 %–100 % method parity**, screen by screen |
| Test-case identity | **C+** | `TC-BUD`/`TC-BUDGET` → **0 shared ids**; 1 id maps to 8 cases |
| Magic-number discipline | **C** | **124 inline timeout literals**, 9 distinct values, 0 centralized |
| Documentation currency | **C−** | `AGENTS.md` layout stale; README omits the whole iOS half |
| Bus factor | **D** | **1 author, 99/99 commits** — no second maintainer |
| **Overall** | **B** | Solid structure, unsustained by the process around it |

### The core problem: the twin pattern is decaying

The Android/iOS twin scheme is the project's signature structural idea, and it works — but it is
**maintained by hand, by one person, with no compile-time or lint enforcement.** The cost is
visible as API drift between twins.

**Public method parity (Android page vs its iOS twin):**

| Screen | Android methods | iOS methods | Shared | Parity | Drift |
|---|---|---|---|---|---|
| `tambah` | 18 | 19 | 18 | **100 %** | ✅ |
| `anggaran` | 15 | 29 | 15 | **100 %** | ✅ iOS adds 14 helpers |
| `ubah` | 8 | 9 | 8 | **100 %** | ✅ |
| `kategori` | 16 | 29 | 14 | **87 %** | ⚠️ Android-only: `renameInDialog`, `toggleHidden` |
| `daftar` | 20 | 21 | 18 | **90 %** | ⚠️ Android-only: `emptyState`, `monthLabelEl` |
| `ringkasan` | 18 | 8 | 8 | **44 %** | 🔴 **10 Android methods have no iOS twin** |
| `cadangan` | 11 | 16 | 5 | **45 %** | 🔴 5 Android methods unmatched |

`ringkasan` at 44 % and `cadangan` at 45 % are the outliers — and `cadangan` is the worst kind of
drift: the Android class exposes `statusCard`, `statusTexts`, `warningCard`, `importResult`,
`importError`, while the iOS class exposes a *different* set (`screen`, `screenText`,
`shareSheetCaption`, `tapBack`, `dismissShareSheet`…). These are not twins with gaps; they are
**two different abstractions wearing the same filename**. A spec written against one cannot be
ported to the other by changing a locator — it needs rewriting.

The same drift at the **test-case identity** level:

| Spec | Android TCs | iOS TCs | Shared |
|---|---|---|---|
| `anggaran/budget` | `TC-BUD-01…11` | `TC-BUDGET-01…11` | **0** — prefix divergence |
| `transaksi/transaction-list` | 10 | 10 | 10 ✅ |
| `kategori/category-management` | 14 | 13 | 13 — Android has an extra `TC-LIST-07` |
| `transaksi/backup` | 6 | 7 | 6 — iOS adds `TC-LIST-07` |
| `tambah/add-income`, `add-expense` | 9 / 8 | 10 / 9 | 9 / 8 — iOS adds `TC-NAV-06` |
| `navigasi/navigation` | 8 | 9 | 8 — iOS adds `TC-PERS-02` |

Two findings here are **more than cosmetic**:

1. **`TC-BUD` vs `TC-BUDGET`** — 11 test cases exist on each platform with **zero shared
   identifiers**. Any cross-platform defect triage, coverage dashboard, or "is this bug fixed
   on both platforms?" query silently fails. The Android spec also *merges* two cases into one
   `it()` (`TC-BUD-03/07`), so the two platforms don't even have the same number of atomic cases.

2. **One id → many cases.** `TC-LIST-08` is defined **8 times** in
   `transaction-list.spec.ts` — 7 generated bulk-chunk `it()` blocks (lines 207–229) plus a
   separate `TC-LIST-08 scrolling 100+ items does not crash` (line 231). A defect report
   citing "TC-LIST-08" cannot identify which case failed. The chunked cases need distinct
   suffixes (`TC-LIST-08a`…`TC-LIST-08g`) or a shared id with a per-chunk discriminator.

   *Note:* ids appearing in more than one file are almost all **comment citations of precedent**
   (e.g. `category-management.spec.ts:126` — "TC-LIST-07 skip in 1.D") — that is good practice,
   not a collision. The genuine intra-platform duplicate is `TC-LIST-08` alone.

**Root cause:** nothing enforces twin parity. A lint rule comparing the public method surface
of `X.page.ts` vs `X.ios.page.ts` would catch every row in the table above automatically, the
same way a typechecker catches a signature mismatch.

### Magic-number discipline

**124 inline `timeout:` literals across 44 files, 9 distinct values, zero centralized.**

| Value | Uses | Likely intent |
|---|---|---|
| `10_000` | 50 | "standard wait" |
| `15_000` | 30 | "longer wait" |
| `30_000` | 19 | "iOS / cold-start wait" |
| `5_000`, `6_000`, `20_000`, `45_000`, `60_000`, `2_000` | 25 | one-off |

There is **no `src/config/timeouts.ts`**, and no `DEFAULT_TIMEOUT` constant anywhere in `src/`.
The same wait budget is spelled `10_000` in one file and `15_000` in the next with nothing
distinguishing them — a reviewer cannot tell whether a difference is deliberate or accidental.
`BasePage.waitForScreen()` defaults to 15 s and `BaseIosPage.waitForScreen()` to 30 s, but both
are hardcoded and both are overridden at ~40 call sites with raw literals, so the defaults are
effectively decorative.

Compounding it: `driver.pause()` appears with **11 distinct durations** (200, 300, 400, 500,
700, 800, 1 000, 2 000, 3 000, 5 000, 6 000) — several are load-bearing (see S9) and several
are arbitrary.

> **Fix:** add `src/config/timeouts.ts` exporting named budgets (`SCREEN_READY`,
> `ELEMENT_PRESENT`, `COLD_START`, `SHEET_DISMISS`), then replace the 124 literals. This is
> mechanical and behavior-preserving if each literal maps to its intended semantic bucket —
> **except** the 30 s / 15 s split, which is a real Android/iOS difference and should stay
> platform-specific.

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
| **M1** | `cadangan` twins are **not the same abstraction** — 5 Android methods unmatched, iOS exposes a disjoint API. A spec cannot be ported by swapping locators. | 🔴 Critical | `cadangan.page.ts`, `cadangan.ios.page.ts` |
| **M2** | `ringkasan` twin at **44 % parity** — 10 Android methods (`breakdownBarRatio`, `comparisonTexts`, `emptyStateTexts`, `monthLabel`, `nextMonth`, `prevMonth`, `openAnggaran`, `openKelolaKategori`, `savingsText`, `scrollToBottom`) have no iOS equivalent, yet `RingkasanIosPage` is consumed by 7 iOS specs | 🔴 Critical | `ringkasan.page.ts` vs `ringkasan.ios.page.ts` |
| **M3** | `TC-BUD` / `TC-BUDGET` prefix divergence → **0 shared ids** across 11 test cases on the two platforms | 🔴 Critical | `budget.spec.ts:25`, `budget.ios.spec.ts:40` |
| **M4** | **One id maps to many test cases**: `TC-LIST-08` is defined **8×** in the Android spec (7 generated bulk chunks + 1 scroll test). A defect report citing `TC-LIST-08` cannot identify which case failed. | 🔴 Critical | `transaction-list.spec.ts:214,231` |
| **M5** | **124 inline timeout literals**, 9 distinct values, no `config/timeouts.ts`, no `DEFAULT_TIMEOUT` | 🟠 Major | 44 files across `src/` |
| **M6** | `driver.pause()` with **11 distinct durations**, several load-bearing — no named constants | 🟠 Major | `src/` (55+ sites) |
| **M7** | No automated **twin-parity check** — the drift in M1/M2/M3/M4 is invisible until someone reads both files | 🟠 Major | (missing) |
| **M8** | `README.md` Layout **omits the entire iOS half** — no `wdio.ios.conf.ts`, no `*.ios.*` | 🟠 Major | `README.md` |
| **M9** | `AGENTS.md` layout stale — lists 2 non-existent files, `BUG_Found_02..08` vs 13 actual, and **never documents the iOS twin convention** | 🟠 Major | `AGENTS.md:71-95` |
| **M10** | **Bus factor = 1** — 99/99 commits by one author, no rotation, no external PR | 🟠 Major | git history |
| **M11** | Android `budget.spec.ts` **merges two test cases** into one `it()` (`TC-BUD-03/07`) — the platforms don't have matching atomic granularity | 🟡 Minor | `budget.spec.ts:47` |
| **M12** | 11 of 57 source files carry **no JSDoc** — mostly specs, plus `base.page.ts` | 🟡 Minor | `src/` |
| **M13** | `kategori` twin: Android-only `renameInDialog`, `toggleHidden` have no iOS equivalent — yet `TC-KAT-08`/`TC-KAT-10` are `it.skip`-ped on Android and **run on iOS** | 🟡 Minor | `kategori.page.ts`, `category-management.ios.spec.ts` |
| **M14** | 11 distinct `driver.pause()` durations include `6_000` ×3, load-bearing for the undo-toast expiry — the one place a named constant matters most | 🟡 Minor | `delete-undo.spec.ts:66,88,157` |

### Recommended maintainability sequence

1. **M7 + M3 + M4 — one script, three invariants.** A `npm run check:parity` that (a) diffs the
   public method surface of each `X.page.ts` vs `X.ios.page.ts`, (b) asserts every `TC-` id is
   unique across the whole suite, and (c) asserts every Android/iOS spec pair shares a common
   id set. This converts M1–M4 from *silent* debt into *loud* debt, and it's ~60 lines of
   Node. **Do this before M1/M2**, so the fixes are verifiable.
2. **M5 — `src/config/timeouts.ts`.** Mechanical, behavior-preserving, and it makes M14
   self-documenting.
3. **M8 + M9 — regenerate the layout blocks** from the tree (or by hand, once) and add the
   iOS twin convention to `AGENTS.md`.
4. **M1 + M2 — converge `cadangan` and `ringkasan` twins.** Decide per screen whether the iOS
   twin should expose the Android API (preferred — it makes specs portable) or whether the
   divergence is genuine and should be documented as such. **Right now it is neither.**
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

#### S1 — `wdio.ios.conf.ts` is outside typecheck coverage
`tsconfig.json` includes `["src/**/*.ts", "wdio.conf.ts"]`. The **entire iOS runner config is
excluded** from `npm run typecheck`. It compiles clean in isolation today (I verified), but there
is no guard — a typo in capability wiring lands as a runtime session-creation failure on a
developer machine, not as a type error in CI.

> **Fix:** add `"wdio.ios.conf.ts"` to `include` (one line).

#### S2 — No lint or format layer
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
> `typecheck && lint && test:unit` into one `npm run verify`.

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

#### S6 — Rect-containment logic exists in three copies
`containsCenter` is **verbatim duplicated** in `anggaran.ios.page.ts:10` and
`kategori.ios.page.ts:17`, each with its own local `type Rect` alias. A third variant,
`iosNodeContains` (`helpers/elements.ts:200`), implements the same predicate over the
`IosPageNode` shape.

> **Fix:** one exported helper in `src/helpers/elements.ts` operating on `{x,y,width,height}`.

#### S7 — iOS amount extraction is duplicated
`iosReadAmount` (`helpers/elements.ts:106`) and `iosAmountText` (`helpers/elements.ts:135`) share
~30 lines of identical candidate-collection logic (own text → `value`/`label` attributes →
static-text children → rect geometry → currency preference). Only the final line differs
(`parseAmountText(...)` vs returning the raw string).

> **Fix:** extract the candidate collection into a private `iosAmountCandidates(el)`; both
> public functions become two lines.

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

#### S9 — Fixed sleeps used as synchronization
55+ `driver.pause()` calls across the suite. Three are 6,000–6,500 ms in
`delete-undo.spec.ts` (lines 66, 88, 157), used to outlast the app's 5-second undo toast.
Fixed waits are the classic flake source and they inflate wall-clock time (≈18 s of pure sleep
in one spec).

The comments show the real constraint — the toast node stays *composed* after expiry, so a
disappearance wait is unreliable — which is a genuine problem, but the answer is polling on an
observable state (row count / summary total change), not a longer sleep.

> **Fix:** replace the three 6 s sleeps with a bounded poll on the effect the test actually
> cares about (e.g. `summaryIncome()` returning the pre-delete value).

#### S10 — Root directory sprawl; bug-report casing is inconsistent
**25 `.md` files sit in the repo root**, 14 of them bug reports (`BUG_FOUND.md`, `BUG_Found_02..13`)
alongside `README.md`, `AGENTS.md`, `TESTING.md`, `TESTABILITY.md`, `HANDOVER.md`, `progress.md`,
`code_review.md`, `pr_review.md`, `UI_SPEC.md`, `IOS_PHASE1_HANDOFF.md`, `test-cases-*.md`.

`AGENTS.md` prescribes one bug file per bug **at the root**, so this follows the documented
protocol — but at 13 bug files the machine-generated artifacts are competing with the
hand-written docs for the same namespace, and the root is where a new contributor looks first.

Casing is also inconsistent: `BUG_FOUND.md` / `BUG_FOUND.template.md` (uppercase) vs
`BUG_Found_02.md` … `BUG_Found_13.md` (mixed case). Any glob or sort that assumes one case will
misbehave.

> **Fix:** move the 13 bug files to `bugs/`, keep `BUG_FOUND.template.md` at root (or move it
> too), and standardize the prefix to one casing. Update `AGENTS.md` §Bug Reporting Protocol and
> its Directory Layout block to match.

#### S11 — `AGENTS.md` directory layout has drifted
The layout block lists `CATEGORIES.md` and `agent.md` — **neither exists**. It enumerates
`BUG_Found_02..08` but there are now **13**. It does not mention `docs/09-ios-migration-plan.md`,
`IOS_PHASE1_HANDOFF.md`, or the `*.ios.*` twin convention at all — the single most important
structural convention in the project is undocumented in the agent instructions.

> **Fix:** regenerate the layout block from the actual tree and add an "iOS twin convention"
> section documenting the `*.page.ts` / `*.ios.page.ts` / `*.spec.ts` / `*.ios.spec.ts` scheme,
> the shared-tag-source rule, and the platform-isolation invariant.

### 🟡 Minor — opportunistic

| # | Finding | Location |
|---|---|---|
| **S12** | Node version stated three different ways: `.nvmrc` = `24`, `engines.node` = `">=20"`, README = `"≥ 22"`. | `.nvmrc`, `package.json:8`, `README.md:11` |
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

---

## Carry-forward from Review #2 (2026-10-25)

| # | Item | Status now |
|---|---|---|
| **R1** | `switchMonth` asserts the label *changed*, not that it equals the target month | 🟠 **still open** — `daftar.page.ts:47`, `ringkasan.page.ts:208` |
| **O2** | `@wdio/junit-reporter` not installed (blocked on dependency approval) | 🟠 **still blocked** — same approval requirement applies to S3's `overrides` |
| **O3** | `tambah` category-sheet magic scroll bound `8 × 45%` | ✅ **resolved** — now uses `UiScrollable.scrollIntoView` (`tambah.page.ts:90`) |
| **O4** | TC-INC-09 re-implements `save()` inline | 🟠 **still open** — `add-income.spec.ts:110` calls `tambah.saveButton.click()` directly |
| **O5** | `tsconfig` `types` redundant (`webdriverio` + `@wdio/globals/types`); `noUncheckedIndexedAccess` not enabled | 🟠 **still open** |
| **O6** | `ubah.openFromDaftar(daftar: DaftarPage, …)` couples page objects | 🟠 **still open** — `ubah.page.ts:39`; `ubah.ios.page.ts:5` imports `DaftarIosPage` |
| **N1** | Mixed `waitForDisplayed()` / `expect(...)` assertion styles | 🔴 **escalated** → now **S8** (105 vs 109 vs 0) |
| **N2** | Convoluted `Array.from({length:20})` loop | 🟠 **still open** — `navigation.spec.ts:87` |
| **N3** | 3 `as WebdriverIO.Element` casts after `toBeDefined()` guards | 🟠 **still open** — `transaction-list.spec.ts:179-181` |

---

## Verification gate — still needs a device

Static checks pass at the time of writing (`tsc --noEmit` exit 0 · `npm run test:unit` 17/17 ·
`npm audit --omit=dev` 0). These **must** still be confirmed on hardware before the harness is
considered green:

1. **Never device-run to date:** `anggaran/budget.spec.ts`, `kategori/category-management.spec.ts`
   (Phase 2 navigation repairs), `ringkasan/summary.spec.ts` TC-SUM-09 bar guard.
2. **iOS suite:** `wdio.ios.conf.ts` and the 14 iOS specs have not been exercised by a
   typechecked/green config path; the 6 iOS-tagged skips
   (`TC-BACKUP-04`, `TC-LIST-07`, `TC-LIST-08` ×2, `TC-PERF-05`, plus `TC-KAT-08/10` on Android)
   remain open by decision.
3. **After S3 lands:** re-run the full suite on emulator — a dependency override touching the
   Appium HTTP stack must not perturb session stability.
4. **After S5/S6/S7 land:** re-run `ringkasan`, `kategori`, `anggaran`, `backup` on both
   platforms; these are pure refactors and must be behavior-neutral.
5. **After S8/S9 land:** confirm no new flakes across 3 consecutive emulator runs (the
   assertion-style sweep touches 105 sites).

---

## Standing decisions & policies

- **Never `npm audit fix --force`** — it downgrades `appium` 3.x → 2.19. Use targeted
  `overrides` (S3).
- **Dependency changes require explicit approval** — including `overrides`, which alter the
  resolved tree. Same posture as the `@wdio/junit-reporter` (O2) hold.
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

## Recommended order of work

1. **S1** (one line) + **S4** (CI running `typecheck && test:unit`) + **M7** (twin-parity +
   TC-id uniqueness script) — establish the gate. These three are cheap and they convert the
   silent maintainability debt (M1–M4) into loud debt.
2. **S2** (lint/format) — make the conventions enforceable before more agents touch the tree.
3. **S3** (dependency `overrides` + per-advisory decisions) — needs approval; do it in a
   dedicated PR so the diff is reviewable on its own.
4. **M3 → M4 → M1 → M2** (test-case identity, then twin API convergence) — cheapest
   maintainability wins first; M7's script verifies each step.
5. **S5 → S7** (pure refactors: tag centralization, helper dedup) — one PR, behavior-neutral,
   verified by the device gate.
6. **M5** (timeout constants) — mechanical, behavior-preserving; do it with S9 so the two
   literal-cleanups land together.
7. **S8 → S9** (assertion-style sweep, sleep replacement) — largest diff; land separately with
   3 clean emulator runs as the acceptance bar.
8. **S10 → S11, M8 → M9, M12 → M22** (docs/hygiene) — cheap, no device run needed. Include the
   `AGENTS.md` iOS-twin-convention section: it is the highest-read file in the repo.

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
