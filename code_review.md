# Code Review: `ringkasan.page.ts`

**File:** `src/pageobjects/ringkasan.page.ts`
**Reviewer:** Senior SDET/QA Engineer
**Date:** 2026-10-24
**Overall Assessment:** B+ / A- — Above-average mobile automation page object with strong documentation; has maintainability gaps that will compound over time.

---

## 1. Bug-Findings (Severity-graded)

### 🔴 CRITICAL

#### 1. Missing null check on `scrollToTag` return (crash risk on not-found)

**Lines:** 54-62, 96-106

`scrollToTag` wraps a `UiScrollable` that may fail silently when the element never appears. If `scrollToTag` returns a non-resolvable element, `item.$$(...)` on the next line throws an opaque error. There is no `waitForExist` guard before accessing children.

**Fix:** Add an explicit `waitForExist` on the scrolled element before proceeding:
```typescript
const item = await scrollToTag(tags.ringkasan.categoryItem(categoryId))
await item.waitForExist({ timeout: 10_000 })
```

> ✅ **Resolved 2026-10-25** — `breakdownBarRatio` runs exactly this `waitForExist({ timeout: 10_000 })` guard before child enumeration. The `breakdownItemTexts` half was invalidated by the cafa16c page-source rewrite: the method no longer dereferences the scrolled element at all — it parses an atomic XML dump and terminates with the explicit `Breakdown item ${categoryId} not found in page source` error, so the `item.$$(...)` crash scenario cannot occur there. A `waitForExist` was deliberately *not* added to it: on the not-found path it would only add up to 30 s of waiting (3 attempts × 10 s) ahead of an already-clear error.

#### 2. Unsafe type cast: `as unknown as Element[]`

**Line:** 99

```typescript
const viewList = await views as unknown as Element[]
```

The double-cast (`as unknown as`) masks a real type mismatch. `views` is a `ChainablePromiseArray`; awaiting it resolves to `Element[]` naturally in WDIO v9. The cast is unnecessary and tells future maintainers "I don't know what type this is, so I'm forcing it."

**Fix:** Remove the cast entirely; let TypeScript infer the correct type:
```typescript
const viewList = await views as Element[]
// or simply:
const viewList = await item.$$('android=new UiSelector().className("android.view.View")')
```

> ✅ **Resolved 2026-10-25** — the cast is gone, and `import type { Element } from 'webdriverio'` was removed with it (closing finding #6 for this file too). Correction to the original suggestion: in the installed WDIO v9 types, plain `await` on the `$$` chainable does **not** yield `Element[]` — its `length` is typed `Promise<number>`, which is exactly what the double-cast was hiding. The type-honest idiom is spreading the awaited chainable into a real array: `const viewList = [...(await item.$$(selector))]`. `grep -rn "as unknown as" src/` now matches only the documented `wdio.conf.ts` capabilities cast (N4, intentionally kept).

### 🟠 HIGH

#### 3. Stale element after scroll in `breakdownBarRatio`

**Lines:** 96-106

`scrollToTag` scrolls the element into view, then `item.$$(...)` operates on it. Between the scroll and the child enumeration, Compose may **recompose** and invalidate the element reference, causing `StaleElementReferenceError`.

Compare to `DaftarPage.tapRowAction` (lines 119-129) which retries on a fresh query. `breakdownBarRatio` has no such protection.

**Fix:** Wrap in a retry loop that re-queries on each attempt.

> ✅ **Resolved 2026-10-25** — the method re-queries fresh on every attempt (scroll → `waitForExist` → child enumeration all inside the try, so nothing survives across attempts), and is now aligned with the cited `DaftarPage.tapRowAction` pattern end-to-end: the explicit `waitForExist` re-verifies existence before enumeration, and the retry catch backs off 500 ms before the fresh re-query — the same error-path pause `tapRowAction` uses — so a recomposition storm is not hammered with immediate re-queries.

#### 4. Fragile bar-view indexing (assumes exactly 2 Views at the end)

**Lines:** 99-106

```typescript
const container = await viewList[viewList.length - 2].getSize()
const fill = await viewList[viewList.length - 1].getSize()
```

The guard only checks `length < 2`, but if there are **3 or more Views**, the method silently picks the wrong elements. A Compose layout change (e.g., adding a ripple wrapper View) would cause incorrect ratio calculations, not an error.

**Fix:** Add a guard for exactly 2 Views, or use a more specific selector.

> ✅ **Resolved 2026-10-25** — the guard is now `viewList.length !== 2` with direct `[0]`/`[1]` indexing; any other count retries and fails loudly with `has no measurable bar views` instead of silently computing a ratio from a wrong pair. ⚠️ Residual: the exactly-two-Views premise could not be re-counted on a device at fix time (no emulator was running) — it rests on the live-verified trailing-pair measurement. If TC-SUM-09 fails with that error, the row renders extra Views and the guard should relax to `length < 2` (one-character change).

#### 5. No wait between click and label read in `switchMonth`

**Lines:** 112-120

```typescript
await byTag(arrow).click()
const after = await this.monthLabel().catch(() => before)
```

There is no delay between the click and reading the label. If recomposition takes >0ms, `monthLabel()` reads the same value and the retry never triggers. The `.catch(() => before)` masks timeouts as "label unchanged."

**Fix:** Add a small pause before reading the label:
```typescript
await byTag(arrow).click()
await driver.pause(300)
```

> ✅ **Resolved 2026-10-25** — the 300 ms settle wait is in place, and the `.catch(() => before)` masking is removed: a failed label read now surfaces as a real error instead of masquerading as "unchanged" and triggering the double-step re-click. Residual: the byte-identical `switchMonth` twin in `daftar.page.ts` is unchanged and remains open under R1 / Part C P1, which additionally asks for asserting the *target* label rather than merely "changed".

### 🟡 MEDIUM

#### 6. Mixed import of `Element` from `'webdriverio'` — potential v8/v9 breakage

**Line:** 5

```typescript
import type { Element } from 'webdriverio'
```

The project's `types.ts` (lines 5-8) documents that WDIO v9 exposes `ChainablePromiseElement` and `ChainablePromiseArray` from `webdriverio`, but **not** `Element`. This works only because it's `import type` (compile-time only), but it's misleading and will break if anyone makes it a runtime import.

**Fix:** Use `WebdriverIO.Element` or import from `@wdio/globals`.

> ✅ **Resolved 2026-10-25** — resolved beyond the suggested fix: the `Element` import was removed from `ringkasan.page.ts` entirely (the spread idiom that replaced the cast needs no `Element` type), and the underlying v8/v9 exposure was fixed repo-wide: `tambah`, `kategori`, `anggaran` and `cadangan` page objects imported `ChainablePromiseElement` directly from `'webdriverio'`, bypassing the sanctioned `src/types.ts` re-export — all four now import from `'types'`, leaving `src/types.ts` as the single import point (verified by grep: it is the only file importing from `'webdriverio'`). If the export shape shifts across WDIO majors, exactly one file adapts.

#### 7. `comparisonTexts()` and `emptyStateTexts()` don't scroll

**Lines:** 66-76, 78-89

Unlike `breakdownItemTexts()` which calls `scrollToTag`, these methods use `byTag(...)` directly. If the element is below the fold, they fail with no-element-found.

**Fix:** Use `scrollToTag` for consistency, or document explicitly why not.

> ✅ **Resolved 2026-10-25** — the review's "or document explicitly why not" branch, applied per method: `comparisonTexts()` now scrolls (`extractChildTexts(scrollToTag(tags.ringkasan.comparison))`) since the card can sit below the fold in the summary LazyColumn; `emptyStateTexts()` deliberately keeps `byTag`, with the reason documented in-method — the empty state replaces the whole content area when a month has no data, so no scrollable container exists for UiScrollable to attach to, and the state always renders at the top of the screen. Same resolution as P2 Step 7 above.

### 🟢 LOW

#### 8. Redundant `await` on `$` calls

**Lines:** 22, 34, 38, 42, 46

```typescript
return byTag(tags.ringkasan.balanceValue).getText()
```

`byTag(...)` returns a `ChainablePromiseElement` (a `$()` result). The `await` on `byTag(...)` in line 18 (`readAmount(byTag(...))`) is implicit through the `$` promise. But in lines 22, 34, 38, `.getText()` is called without `await` on the `$` — this is correct (WDIO chains), but stylistically inconsistent with line 18 where `readAmount` receives an awaited `ChainablePromiseElement`.

> ✅ **Resolved 2026-10-25 (verified consistent; convention documented)** — an audit of every `await` in the current `ringkasan.page.ts` found no redundant ones: each is load-bearing (statement sequencing like `click()` → settle → label read, or resolving a chainable to a handle for spread/indexing in `breakdownBarRatio`). The file's style is now uniform — chainables are returned directly (`return byTag(...).getText()`), passed straight to helpers that accept them (`readAmount(byTag(...))`, `extractChildTexts(scrollToTag(...))`), or awaited only when a statement needs the resolved value. To keep the convention from drifting again, it is documented on `byTag`'s JSDoc in `helpers/locators.ts`.

---

## 2. Maintainability Assessment

### ✅ What's Done Well

| Practice | Evidence | Impact |
|----------|----------|--------|
| Documented assumptions | Lines 49-53, 91-94, 108-110 have detailed comments with live-verified pixel measurements | New engineers understand the bar-ratio logic without reverse-engineering the APK |
| Consistent patterns | All three `*Texts()` methods follow the same extraction loop; `switchMonth` mirrors `DaftarPage` | Reduces cognitive load; copy-paste is predictable |
| Centralized tags | All locators from `tags.ringkasan.*`; no magic strings | One file to update when TestTags.kt changes |
| Shared helpers | `readAmount` imported from `daftar.page.ts`; `byTag`/`scrollToTag` from `locators.ts` | Logic reuse across page objects |
| Error messages with context | `"Breakdown item ${categoryId} has no bar views"`; `"Month switch via ${arrow}..."` | Debugging CI failures is faster |

### ⚠️ Maintainability Gaps

| Gap | Severity | Lines | Description |
|-----|----------|-------|-------------|
| Duplicated text extraction loop | Medium | 54-89 | 3 methods share the exact same 7-line loop |
| Cross-page import creates coupling | Medium | 4 | `RingkasanPage` imports from `daftar.page` — fragile dependency |
| No unit tests for page object | Medium | — | Ratio/text logic only tested via Appium integration tests |
| Fragile element index assumptions | Medium | 99-106 | Assumes last 2 Views are always bar container + fill |
| Type cast obscures intent | Low | 99 | `as unknown as Element[]` hides a type question |

> ✅ **Gap status (2026-10-25):** all five gaps closed. *Duplicated text extraction loop* — `extractChildTexts` in `helpers/elements.ts` is now the single implementation; the ringkasan copies went first (P0 round), and daftar's `emptyStateTexts`/`rowTexts`/`firstDayHeaderTexts` were consolidated later the same day (its `rowAmountTextsInOrder` keeps an inline enumeration by design — it selects the first Rp-prefixed digit-bearing text per row, not all child texts). *Cross-page import* — `readAmount` lives in `helpers/elements.ts`; no page object imports from another. *No unit tests* — 17 unit tests now cover `parseAmountText`, `barFillRatio`, `extractChildTexts` and `readAmount` (via structural mock elements), run with `npm run test:unit`. *Fragile index assumptions* — exact-2 guard with direct indexing (device-run caveat noted under P2 Step 8). *Type cast* — removed (P1 Step 4).

### 📊 Maintainability Scorecard

| Dimension | Score (1-5) | Notes |
|-----------|-------------|-------|
| Readability | 4.5/5 | Excellent comments, clear method names |
| Modifiability | 3.5/5 | Duplicated loops, cross-page import, fragile casts |
| Testability | 2.5/5 | No unit tests; ratio/text logic only tested via Appium |
| Robustness | 4/5 | Good retry patterns, but bar-ratio indexing is fragile |
| Cognitive Complexity | 4/5 | Low — each method does one thing clearly |

> 📊 **Re-assessed scorecard (2026-10-25, after remediation):**
>
> | Dimension | Was | Now | Basis |
> |-----------|-----|-----|-------|
> | Readability | 4.5 | 4.5 | Unchanged — the documented-assumptions style survived every refactor |
> | Modifiability | 3.5 | 4.5 | Loops consolidated to one helper (ringkasan + daftar), cross-page import gone, casts gone, tag strings centralized |
> | Testability | 2.5 | 4.0 | 17 unit tests over money parsing, ratio math, text extraction and `readAmount` selection rules; page-object navigation remains integration-tested by design |
> | Robustness | 4.0 | 4.5 | Exact-2 bar guard, `waitForExist` guard, retry+backoff parity in both files; held at 4.5 until a device run confirms the strict guard |
> | Cognitive Complexity | 4.0 | 4.0 | Unchanged |

---

## 3. TODO List & Step-by-Step Refactoring Plan

### Priority 0 (P0) — Immediate Fixes

- [x] **Step 1:** Extract `extractChildTexts` helper to eliminate 3x duplicated loop
  - **Location:** Add private method in `RingkasanPage` or move to `helpers/locators.ts` as a shared utility
  - **Files affected:** `ringkasan.page.ts` (3 method bodies change)
  - **Effort:** 15 min
  - **Risk reduction:** Catches logic drift at one edit point
  - ✅ **Done 2026-10-25:** helper lives in `src/helpers/elements.ts` (element-reading helpers rather than `locators.ts`, which stays find/scroll-only); `comparisonTexts()` and `emptyStateTexts()` now call it. Only 2 loops remained — `breakdownItemTexts` was already rewritten to page-source parsing (commit cafa16c), so the third copy no longer existed to consolidate.

- [x] **Step 2:** Move `readAmount` from `daftar.page.ts` to `helpers/` to decouple page objects
  - **Location:** `src/helpers/elements.ts` (new file) or `src/helpers/money.ts` (existing)
  - **Files affected:** `src/pageobjects/daftar.page.ts`, `src/pageobjects/ringkasan.page.ts`, any other importer
  - **Effort:** 20 min
  - **Risk reduction:** Enables independent refactoring of either page
  - ✅ **Done 2026-10-25:** moved to `src/helpers/elements.ts` (kept `money.ts` free of WDIO element dependencies); the `ringkasan.page.ts → daftar.page.ts` import is gone — `ringkasan` now imports `readAmount` from the helper, and `readAmount` itself reuses `extractChildTexts` for its child enumeration. Verified with `tsc --noEmit`; Appium suite not re-run (behavior-preserving refactor).

### Priority 1 (P1) — Medium-Hanging Fruit

- [x] **Step 3:** Add unit tests for `parseAmountText` and bar-ratio extraction logic
  - **Location:** `src/helpers/__tests__/money.test.ts` (new)
  - **Files affected:** New test file; imports `src/helpers/money.ts`
  - **Effort:** 30 min
  - **Risk reduction:** Fast feedback on regex/ratio changes without booting emulator
  - ✅ **Done 2026-10-25:** `src/helpers/__tests__/money.test.ts` (formatting + parsing, incl. comma decimals, U+2212/ASCII minus, last-run selection) and `src/helpers/__tests__/elements.test.ts` (bar-ratio math). The ratio logic was extracted into a pure `barFillRatio(containerWidth, fillWidth)` in `helpers/elements.ts` to make it unit-testable — `breakdownBarRatio` now consumes it, and a non-positive container width throws into the existing retry loop. Runner is Node's built-in `node:test` via the ts-node hook (no new dependencies); run with the new `npm run test:unit` script. 10 pass, 1 skipped — the mixed-sign `parseAmountText` case is skip-marked as the R9 (P2) latent-bug documentation. WDIO spec glob (`src/tests/**/*.spec.ts`) does not pick up `*.test.ts`.

- [x] **Step 4:** Replace `as unknown as Element[]` cast with proper type
  - **Location:** `ringkasan.page.ts` line 99
  - **Files affected:** `ringkasan.page.ts` only
  - **Effort:** 10 min
  - **Risk reduction:** Removes hidden type assumption
  - ✅ **Done 2026-10-25:** cast removed entirely — plus the `import type { Element } from 'webdriverio'` (finding #6 resolved for this file too). Correction to the original fix suggestion: in the installed WDIO v9 types, `await` on a `ChainablePromiseArray` does **not** yield `Element[]` (its `length` is typed `Promise<number>`, which is what the double-cast was hiding) — the type-honest idiom is spreading the awaited chainable into a real array: `const viewList = [...(await item.$$(selector))]`. Verified with `tsc --noEmit`.

- [x] **Step 5:** Add retry/wait in `switchMonth` between click and label read
  - **Location:** `ringkasan.page.ts` lines 112-120
  - **Files affected:** `ringkasan.page.ts` only
  - **Effort:** 15 min
  - **Risk reduction:** Reduces flaky month-switch failures
  - ✅ **Done 2026-10-25 (ringkasan only):** `driver.pause(300)` settle wait added between click and label read, and the `.catch(() => before)` masking is gone — a failed label read now surfaces as a real error instead of masquerading as "unchanged" and triggering a double-step re-click. `daftar.page.ts`'s identical copy is untouched; the full both-files hardening (assert the *target* label) remains open as Part C P1 / R1.

### Priority 2 (P2) — Lower Priority

- [x] **Step 6:** Add `waitForExist` guards after `scrollToTag` calls
  - **Location:** `breakdownItemTexts` (line 55), `breakdownBarRatio` (line 97)
  - **Files affected:** `ringkasan.page.ts` only
  - **Effort:** 10 min
  - **Risk reduction:** Clear error instead of opaque crash when item is not found
  - ✅ **Done 2026-10-25:** `breakdownBarRatio` now runs `item.waitForExist({ timeout: 10_000 })` after the scroll, before enumerating children. `breakdownItemTexts` needs no guard anymore: since the page-source rewrite (commit cafa16c) it never touches the scrolled element — it reads an atomic XML dump and already fails with the explicit `Breakdown item X not found in page source` error, so a 10 s per-attempt wait would only slow down that failure path.

- [x] **Step 7:** Add scroll to `comparisonTexts()` and `emptyStateTexts()` for consistency
  - **Location:** Replace `byTag(...)` with `scrollToTag(...)` in lines 67, 80
  - **Files affected:** `ringkasan.page.ts` only
  - **Effort:** 10 min
  - **Risk reduction:** Handles below-fold elements gracefully
  - ✅ **Done 2026-10-25 (split decision):** `comparisonTexts()` now uses `scrollToTag` — the card can sit below the fold in the summary LazyColumn. `emptyStateTexts()` deliberately keeps `byTag`, documented in-method: the empty state replaces the whole content area when a month has no data (no scrollable container exists for UiScrollable to attach to) and always sits at the top of the screen — the review's "or document explicitly why not" branch.

- [x] **Step 8:** Add guard for exactly 2 bar Views in `breakdownBarRatio`
  - **Location:** `ringkasan.page.ts` lines 100-101
  - **Files affected:** `ringkasan.page.ts` only
  - **Effort:** 10 min
  - **Risk reduction:** Detects layout changes that add wrapper Views
  - ✅ **Done 2026-10-25:** the guard is now `viewList.length !== 2`, with direct `[0]`/`[1]` indexing; any other count retries and fails loudly with `has no measurable bar views` instead of silently reading a wrong pair. ⚠️ **Needs one device run to confirm:** the strict guard assumes the live-verified trailing pair is today exactly two Views per row — no emulator was running at implementation time to re-count. If TC-SUM-09 fails with `has no measurable bar views`, the row renders extra Views and the guard should relax to `length < 2` (one-character change).

### Priority 3 (P3) — Nice-to-Have

- [x] **Step 9:** Add JSDoc `@param` / `@returns` to public methods
  - **Location:** All public methods missing explicit param docs
  - **Files affected:** `ringkasan.page.ts` only
  - **Effort:** 20 min
  - **Risk reduction:** IDE tooltips for callers
  - ✅ **Done 2026-10-25:** `@param`/`@returns` added to `breakdownItemTexts`, `breakdownBarRatio`, and private `switchMonth` (the only param-bearing methods); no-parameter methods were left prose-only to avoid bloat; all live-verified measurement notes preserved verbatim.

- [x] **Step 10:** Audit all `chainable.click()` calls for missing `waitForExist` before click
  - **Location:** `open()`, `openAnggaran()`, `openKelolaKategori()`, `switchMonth()`
  - **Files affected:** `ringkasan.page.ts` only
  - **Effort:** 15 min
  - **Risk reduction:** Catches element-not-interactable failures
  - ✅ **Done 2026-10-25:** audit verdict — no explicit guards needed; WDIO auto-wait (15 s `waitforTimeout`) covers existence in all four cases, `open()` already ends in `waitForScreen()`, and `switchMonth`'s verify-retry covers its real race. Rationale recorded as a comment block above `openAnggaran()`; `waitForClickable` deliberately rejected (would convert coordinate taps into timeouts in the LazyColumn). Note: `openAnggaran`/`openKelolaKategori` are currently dead code (specs use the sibling page objects' entry methods) — if ever wired up, the remedy for a below-fold button is `scrollToTag`, not a wait guard.

---

## 4. Implementation Order Recommendation

```
1. P0, Step 2 → Move readAmount (unblocks Step 1 cleanly)
2. P0, Step 1 → Extract extractChildTexts helper
3. P1, Step 4 → Fix the type cast
4. P1, Step 3 → Add unit tests (validate the extraction helper)
5. P1, Step 5 → Fix switchMonth retry
6. P2, Steps 6-7 → Add waitForExist + scroll guards
7. P2, Step 8 → Guard bar-view count
8. P3, Steps 9-10 → Documentation + audit
```

**Rationale:** Step 2 (move `readAmount`) should come first because it's a refactor that touches multiple files — do it while the mental model is fresh and nothing else has changed. Then Step 1 (extract helper) naturally uses the relocated import. The unit tests (Step 3) should come early to validate the refactored extraction logic.

> ✅ **Plan executed 2026-10-25 — in exactly this order.** (1-2) `readAmount` moved first into the new `helpers/elements.ts`, and `extractChildTexts` landed in that same file immediately after, consuming the relocated import as predicted. (3-5) cast fixed → unit tests added → `switchMonth` retry hardened. (6-7) `waitForExist` + scroll guards, then (7) the exact-2 bar-view guard. (8) JSDoc + click audit last. One nuance vs. the rationale: the early unit tests (Step 3) validated `parseAmountText` and the extracted `barFillRatio`, while `extractChildTexts` itself got direct mock-element coverage only in the later maintainability pass — same intent, slightly later than the plan envisioned. All ten steps are complete; this section is now a historical record.

---

# Project-Wide Review: `saku-appium` (Five-Axis Quality + Security & Hardening)

**Scope:** entire repo excluding `ringkasan.page.ts` (reviewed above) — `wdio.conf.ts`, `tsconfig.json`, `src/types.ts`, `src/config/*`, 7 page objects, 4 helpers, all 9 specs, `package.json`, repo hygiene, git history, dependency supply chain
**Date:** 2026-10-24
**Method:** `code-review-and-quality` five-axis review (delegated to a review subagent) + `security-and-hardening` threat-model review (executed in-session)
**Overall grade:** **B** (quality) / **B+** (security posture for a local test harness)

---

## Part A — Five-Axis Quality Review

### A.1 Executive Summary

The Phase 1 suite (navigation, tambah, transaksi, ringkasan — all green per `progress.md`) is genuinely well-engineered: strict TypeScript, a disciplined test-tag contract, real behavioral assertions (exact numeric equality, percentage sums, ratio closeness), bounded retries instead of sleeps, and unusually good "verified live" documentation of device quirks. However, both Phase 2 spec files (`budget.spec.ts`, `category-management.spec.ts`) have **never been executed** (unchecked in `progress.md`, no run logs in `reports/`) and each contains **deterministic navigation failures** that will fail 100% of runs; the failure-screenshot hook has **silently never worked**; and shared-module hygiene is weak — one helper duplicated three times, an entire dead page object, and page objects bypassing `config/tags.ts` with magic strings.

### A.2 Critical Findings

| # | Location | Issue | Fix |
|---|----------|-------|-----|
| C1 | `src/tests/anggaran/budget.spec.ts:55-81` (TC-BUD-08, TC-BUD-09) | **Deterministic failure: `createTransaction` called from the Anggaran screen, which has no bottom bar** (UI_SPEC.md:45 — only Tambah/Transaksi/Ringkasan have it; `anggaran.page.ts:23-24` documents this). `createTransaction` → `tambah.open()` → clicks `navTambah`, which does not exist on Anggaran → 15 s timeout, test fails. Even if that passed, `anggaran.rowText()` (lines 62, 76) then waits for a budget row **while the app sits on the Tambah screen** after seeding → second timeout. Both tests are unrunnable as written. | Between TC-BUD-07's end and each `createTransaction`, add `await anggaran.tapBack()` (Anggaran → Ringkasan), and after seeding add `await ringkasan.open(); await anggaran.openFromRingkasan()` before reading rows. |
| C2 | `src/tests/kategori/category-management.spec.ts:88-112` (TC-KAT-11) | **Three independent deterministic failures in one test.** (a) TC-KAT-06 types `search('gaj')` (line 73) and it is never cleared — UI_SPEC.md:98 says the filter *persists even across tab changes* — so `toggleHidden(gift)` at line 89 targets a row filtered out of the list → timeout. (b) Line 95 `byTag(tags.navTambah).click()` — the kategori screen has **no bottom bar** (UI_SPEC.md:45) → timeout. (c) Lines 97–105: the category sheet is opened then `waitForDisplayed({ reverse: true })` is awaited **with no dismiss action** — the sheet cannot close itself → 15 s timeout. | Clear the search after TC-KAT-06 (or before line 89); navigate via `kategori.tapBack()` → `tambah.open()`; dismiss the sheet (`driver.back()` or tap-outside) before the reverse wait. |
| C3 | `wdio.conf.ts:105-110` | **The failure-screenshot feature has never produced a single image.** `afterTest` writes to `reports/screenshots/…`, but that directory is never created; WDIO's `saveScreenshot` does not create parent directories, so every write fails with ENOENT — and `.catch(() => undefined)` swallows it. All failure diagnostics from ~20 recorded run logs are lost. | Add `mkdirSync(path.join('reports','screenshots'), { recursive: true })` in `onPrepare`, and log in the catch: `.catch(e => console.warn('screenshot failed', e.message))`. |

### A.3 Required Findings

| # | Location | Issue | Fix |
|---|----------|-------|-----|
| R1 | `src/pageobjects/daftar.page.ts:76-84` (same family as prior review #5 on `ringkasan.page.ts:112-120`) | **`switchMonth` retry can silently double-switch months.** Click → label read *immediately* (no settle wait) → if recomposition lags, `after === before` → the loop **clicks again** → label now differs → returns, but the app is 2 months back, not 1. The loop verifies only *that* the label changed, never *to what*. TC-LIST-01 catches it (asserts exact label); TC-EDIT-05 (`edit-transaction.spec.ts:139`) and TC-SUM-10 do not. Also `.catch(() => before)` converts a real read failure into "unchanged" → extra click. | Poll for label change with a short settle wait after each click before deciding to re-click, and assert the expected target label before returning. |
| R2 | `src/pageobjects/tambah.page.ts:65-80` vs `src/helpers/input.ts:8-26` | **Byte-for-byte duplicated helpers.** `typeIntoField` + private `fieldText` in TambahPage are identical to `typeIntoTaggedField` + `fieldText` in `helpers/input.ts`. `kategori.renameInDialog` (`kategori.page.ts:107-114`) is a *third* inline copy of the clear-then-type sequence — and actually the best one (verify + retry); the others type blindly. | Delete TambahPage's private copies and consume `helpers/input.ts`; upgrade `typeIntoTaggedField` to verify text landed and retry (port the kategori logic), then use it in `renameInDialog` too. Three copies → one. |
| R3 | `src/pageobjects/kategori.page.ts:97-120` | **`renameInDialog` falls through to Save on failure.** If all 3 attempts fail to enter the text, the method proceeds to click `formSave` anyway with wrong field content — the test then fails downstream with a misleading "row text" mismatch. | `throw new Error(...)` after the loop if final verification failed. |
| R4 | `kategori.page.ts:53,58,69`; `anggaran.page.ts:60,73,75,83,88,89,102,104`; `cadangan.page.ts:31`; `budget.spec.ts:25` | **The `tags.ts` contract is bypassed with magic strings.** `ringkasan_kelola_button`, `tambah_link_kelola_kategori`, `component_field_search`, `ringkasan_anggaran_button`, `component_button_primary`, `component_toast`, `component_sheet_button_confirm`, `component_button_text_danger`, `daftar_backup_button`, `tambah_screen` all exist in `config/tags.ts` but are hardcoded. Worse, `component_sheet_picker`, `component_row_category_chip_*`, `component_input_amount` (`anggaran.page.ts:73,75,83`) exist in **no catalog at all** — undocumented additions to the locator contract. | Use `tags.*` constants where they exist; add the three missing component tags to the local tag maps (or `tags.ts` once unfrozen). |
| R5 | `src/pageobjects/cadangan.page.ts` (entire file, 54 lines) | **Dead page object.** No spec imports `CadanganPage`/`cadanganTags`; no `cadangan` test directory; no `test:cadangan` script. | Delete it, or wire it into the planned TC-BACKUP phase — do not ship untested test code. |
| R6 | `src/helpers/locators.ts:16-21`; `daftar.page.ts:107-111,142-144`; `kategori.page.ts:123-125`; `src/config/tags.ts:14,62-63,72-73,111` | **Dead exports:** `byTagMatches`, `allByTag` (helpers), `hasRowText`, `firstRow` (DaftarPage), `cancelDialog` (KategoriPage), and tag constants `loadingScreen`, `monthPicker`, `backupButton`, `itemAny`, `dayHeaderAny`, `sheetBottom` are all unreferenced — ~90 lines of misleading dead surface. | Remove; keep tag constants only if the frozen-contract rationale is documented per-entry. |
| R7 | `daftar.page.ts:153-165` (`rowTexts`); raw `$$` in `delete-undo.spec.ts:70,124-127,160-167`, `edit-transaction.spec.ts:70,81-84`, `transaction-list.spec.ts:167`, `summary.spec.ts:165-166` | **Unprotected stale-element read + locator discipline drift.** `rowTexts` does scroll → find → child enumeration with no retry (the exact exposure the prior review flagged on `ringkasan.breakdownBarRatio` #3), while `tapRowAction` five lines up shows the correct retry pattern. Separately, 10+ raw `$$('android=…')` calls in specs bypass the locator helpers. | Wrap `rowTexts` in the same 3-attempt retry; replace raw `$$` selectors with locator helpers. |
| R8 | `wdio.conf.ts:80-87` | **Global 20-minute mocha timeout** justified by the 100-transaction seed test — which is `it.skip`ped (`transaction-list.spec.ts:198`). Every quick navigation test now has a 20-minute failure ceiling on hangs. (`newCommandTimeout` 240 s does bound true driver hangs.) | Drop to ~120–180 s; re-raise locally if/when TC-LIST-08 is revived. |
| R9 | `src/helpers/money.ts:43` | **Latent sign bug in `parseAmountText`.** `value > 0 && /^-/.test(normalized.trim())` tests the minus against the *whole string* while taking the *last* numeric run. Any mixed-sign string ("−Rp 50.000 … Rp 25.000" — exactly what a Ringkasan comparison row renders) parses to −25.000. No current caller hits it, but it is a trap. | Test the character immediately preceding the matched run's index instead of the string head. |

### A.4 Optional / Nit Findings

| # | Location | Issue |
|---|----------|-------|
| O1 | `package.json` | No `typecheck`/lint script — add `"typecheck": "tsc --noEmit"` and wire before `test`. |
| O2 | `wdio.conf.ts:78` | Only the `spec` reporter — add junit for CI dashboards / failure-log protocol. |
| O3 | `tambah.page.ts:100-106` | Sheet scroll bound is magic `8 × 45%`; compute from sheet height or try `scrollToTagMatches` first. |
| O4 | `add-income.spec.ts:110` vs `tambah.page.ts:165-168` | TC-INC-09 re-implements `save()` inline — call `tambah.save()` instead. |
| O5 | `tsconfig.json:12` | `types` has both `webdriverio` and `@wdio/globals/types` (redundant); consider `noUncheckedIndexedAccess` given heavy `texts[0]` indexing. |
| O6 | `ubah.page.ts:39-42` | `openFromDaftar(daftar, categoryId)` takes another page object as a parameter — page-to-page coupling; instantiate internally or move into the spec. (Echoes prior review: move `readAmount` out of `daftar.page.ts` — still unfixed.) |
| N1 | `navigation.spec.ts:27-46` | TC-NAV-03/04/05 use bare `waitForDisplayed()` while TC-NAV-01/02 use explicit `expect(...)` — pick one house style. |
| N2 | `navigation.spec.ts:87` | `Array.from({length: 20}, …)` is a convoluted plain loop. |
| N3 | `transaction-list.spec.ts:177-179` | `as WebdriverIO.Element` casts after `toBeDefined()` guard — defensible; a non-null helper would remove them. |
| N4 | `wdio.conf.ts:46` | `as unknown as Capabilities…` cast carries an explanatory comment and compensates for a real @wdio/types gap — acceptable, leave. |

### A.5 Architecture Assessment

**Pattern consistency: good, with two documented deviations.** All seven pages extend `BasePage` with the screenTag/waitForScreen/tapBack/systemBack contract; all locators flow through `helpers/locators.ts` by tag. Deviations: (1) `kategori`/`anggaran`/`cadangan` each carry a private tag map with a "tags.ts frozen for Phase 1" rationale — acceptable, but see R4 for strings escaping even those maps; (2) `readAmount` is exported from `daftar.page.ts` rather than a helper (prior review flagged this — still unfixed).

**Coupling map (verified, no circular dependencies):**

```
base.page  ← tambah, daftar, ubah, kategori, anggaran, cadangan, ringkasan   (healthy)
daftar     ← ringkasan (readAmount)      ← ubah (DaftarPage ctor param)     (page→page, 2 edges)
helpers/transactions → tambah.page (+ locators, tags)                       (helper→page; OK for UI seeding)
config/tags ← everything
```

**Duplication inventory (the real tax):**

| Pattern | Copies | Locations |
|---|---|---|
| Clear-then-type field entry | 3 | `helpers/input.ts:8`, `tambah.page.ts:65` (identical), `kategori.page.ts:107` (inline) |
| "Collect child TextView texts" loop | 7 | `daftar.page.ts:47,153,187,203` + ringkasan ×3 (prior review) + `transaction-list.spec.ts:170` |
| `switchMonth` verify-retry | 2 | `daftar.page.ts:76`, ringkasan (prior review) |
| Raw `android=new UiSelector().className("android.widget.TextView")` literal | 10 | daftar ×4, ringkasan ×3, specs ×3 |

A single `childTexts(el)` + verified `typeIntoTaggedField(el, text)` in `helpers/` would erase most of this.

*Update 2026-10-25:* `extractChildTexts` now lives in `src/helpers/elements.ts`; the ringkasan copies (`comparisonTexts`/`emptyStateTexts`) and `readAmount`'s child enumeration route through it. The daftar page-object copies and the spec copy remain — full consolidation is still P1.

**Assertion quality: the strongest axis.** ~82 `it` blocks with exact-value assertions (`summaryIncome() === AMOUNT` via parsed numbers, `balanceText() === formatRp(...)`), math validation (percentages sum to 100, ratios `toBeCloseTo`), and state-negative checks (`isExisting()` false after delete). No assertion-free tests beyond the bare-wait style in TC-NAV-03..05.

### A.6 Flakiness Risk Assessment

**Fixed sleeps: 5 total across 3 files — unusually disciplined:**

| Count | Location | Nature |
|---|---|---|
| 1 | `ringkasan.page.ts:163` (400 ms) | scroll settle (prior-review file) |
| 1 | `daftar.page.ts:125` (500 ms) | error-path backoff only — good pattern |
| 3 | `delete-undo.spec.ts:66,88,159` (6–6.5 s) | toast-undo-window expiry, each with written rationale |

**Actual race exposure:** the `switchMonth` click→read race (R1, both daftar + ringkasan) is the highest residual race in the green suite; `.catch(() => before)` ×2 masks read failures as "unchanged"; ringkasan `comparisonTexts`/`emptyStateTexts` no-scroll (prior review #7) fails below-fold. Stale elements: protected in `daftar.tapRowAction` and `tambah.selectCategory`; unprotected in `daftar.rowTexts` (R7) and ringkasan breakdown reads (prior review).

**Never-run risk:** all 15 tests in `budget.spec.ts` + `category-management.spec.ts` are unexecuted; 3 are deterministically broken (C1/C2). Everything else is evidenced green or explicitly `it.skip`ped — honest state management.

---

## Part B — Security & Hardening Review

### B.1 Executive Summary

**Posture: B+ for a local-only E2E harness.** No secrets in the working tree or in any of the 57 commits of git history; strict TypeScript; no `eval`/`child_process`/network-call/fs-write usage anywhere in `src/`; single lockfile; Appium service binds localhost only; no credentials in capabilities; env-driven config (`SAKU_APK`, `ANDROID_UDID`). The dominant risk is **supply chain**: 34 lockfile vulnerabilities (7 critical) whose available fixes require breaking changes, plus an unpinned `npx -y appium-mcp@latest` execution vector in `opencode.json`. Repo hygiene is good — the APK, `reports/` logs, and `.idea/` are all correctly gitignored (untracked), with one stray tracked binary signature file.

### B.2 Findings

| Severity | Finding | Evidence | Recommended fix |
|---|---|---|---|
| **High** | Dependency vulnerabilities in the committed lockfile: 7 critical / 25 high / 2 moderate (see B.3) | `npm audit --package-lock-only`: 34 vulnerabilities | Triage by reachability (B.3); do **not** run `npm audit fix --force` — fixes cross declared ranges (would downgrade `appium` 3.x → 2.19); document deferral with review date |
| **Medium** | Unpinned remote-code execution vector: `npx -y appium-mcp@latest` runs whatever is newest on npm at invocation time (typosquat/compromise exposure) | `opencode.json` (`mcp.servers.appium-mcp.command`) | Pin an exact version (`appium-mcp@<x.y.z>`); update deliberately |
| **Low** | Tracked binary signature file without its APK: the `.idsig` is useless alone and is 178 KB of repo bloat | `git ls-files` → `resources/SimpleMoneyTrackerKT-v2.2.apk.idsig` tracked; the `.apk` itself is correctly gitignored | Remove from tracking (`git rm --cached`); add `*.idsig` to `.gitignore` |
| **Low** | Install boundary not pinned: no `packageManager` / `engines` field, no `.nvmrc` | `package.json` | Add `"engines": { "node": ">=20" }` (or as appropriate) + `.nvmrc`; ensures reproducible installs and enables `npm ci` in CI |
| **Low** | `ts-node` is in maintenance mode (superseded by `tsx`) | `package.json` devDependencies | Fine short-term as the WDIO TS runner; plan migration to `tsx` or native WDIO TS support |
| **Info** | Local (untracked) logs contain expired Appium session IDs, emulator UDID `emulator-5554`, and user home paths | `reports/appium.log` (13 matches; case-sensitive token/auth/password greps: zero hits) | Fine locally; do not publish/share `reports/` archives |
| **Info** | Over-aggressive `.gitignore`: global `*.txt` and `*temp*` rules could silently exclude legitimate fixtures or docs | `.gitignore` "Documentation & Generated Files" section | Narrow `*.txt` to specific paths if ever needed |
| **Info** | Machine-specific absolute path committed | `opencode.json` → `"ANDROID_HOME": "/Users/auliameiazizi/…"` | Use `env` inheritance or document the per-machine override |

### B.3 Dependency Audit & Reachability Triage

`npm audit --package-lock-only` (against committed `package-lock.json`, no install performed): **34 vulnerabilities — 7 critical, 25 high, 2 moderate.**

| Advisory | Severity | Chain | Reachability (local harness context) | Verdict |
|---|---|---|---|---|
| `shell-quote` GHSA-pqg4-j6r4-53mv — `quote()` command injection via line terminator after `{ comment }` token | Critical | `appium`, `appium-uiautomator2-driver` | **Runtime path** (driver shells out during every session), but inputs to the quoting are developer-controlled capability/driver strings, not hostile user input. Practical exploitability low; a compromised repo/config would already be game over | Defer; monitor upstream appium 3.x fix. Do NOT accept audit's "fix" — it downgrades `appium` 3.x → 2.19 (breaking) |
| `sharp` < 0.35.5 — librsvg CVE-2026-96889 | High | `appium-uiautomator2-driver` → sharp | **Runtime path** (screenshot/image processing), but image data comes from the developer's own app/device | Defer with review date; not attacker-controlled input |
| `serialize-javascript` — CPU exhaustion DoS + XSS via unescaped `</script>` | Moderate/High | `mocha` (test framework) | **Test-time only**; no browser rendering of serialized output in this harness | Defer; no practical exposure |
| Remaining 30 (various) | Mostly high | Transitive, concentrated under appium/uiautomator2-driver | Mostly runtime-adjacent but low practical risk in a localhost-only harness | Bulk-track; re-audit each release |

**Rule applied (per `security-and-hardening`):** fixes that require `--force` cross declared dependency ranges and are prohibited to apply automatically. Audit advisories match *known* CVEs only — they say nothing about install-script safety, which is why the pinning findings above matter.

### B.4 Verification Results

- **Secrets in working tree:** zero hits across `src/`, `wdio.conf.ts`, `opencode.json`, `qodana.yaml`, `package.json` (patterns: password/secret/api-key/AKIA/private-key/token)
- **Secrets in git history:** zero hits across all 57 commits (`git rev-list --all` fully enumerated); no `.env*` file ever committed; deleted-files inventory is documentation only (`CATEGORIES.md`, `Phases.md`, old `docs/*` — no sensitive material)
- **Dangerous APIs in `src/`:** zero — no `eval`, `new Function`, `child_process`, `fetch`/`axios`/http, `writeFile`/`rmSync`, no dynamic `import()` of user-controlled names
- **Config hardening:** `noReset: false` (fresh DB per spec), no `autoGrantPermissions`/`allowTestPackages`, `printPageSourceOnFindFailure: false` (avoids page-source log spam), fail-fast APK existence check in `onPrepare`, Appium on `localhost:4725` (default bind, no `--address` override), timeouts sane (`waitforTimeout` 15 s, `connectionRetryTimeout` 180 s)
- **`tsconfig.json`:** `strict: true` ✓
- **Lockfile:** single `package-lock.json`, no competing lockfiles ✓

### B.5 Committed-Artifact Inventory

| Artifact | Size | Tracked? | Verdict |
|---|---|---|---|
| `resources/SimpleMoneyTrackerKT-v2.2.apk` | 21.7 MB | No (gitignored via `*.apk`) | Correct — binary out of git |
| `resources/SimpleMoneyTrackerKT-v2.2.apk.idsig` | 178 KB | **Yes** | Remove — useless without the APK |
| `reports/*.log` (~24 files) | 456 KB | No (gitignored via `reports/`, `*.log`) | Correct — local diagnostics only |
| `.idea/` | 40 KB | No (gitignored) | Correct — complies with AGENTS.md |

---

## Part C — Merged Action Plan (both reviews + prior `ringkasan.page.ts` review)

### P0 — Before next Phase 2 run (blockers)

- [x] **Fix TC-BUD-08/09 navigation** (C1): `anggaran.tapBack()` before `createTransaction`; re-enter Anggaran before `rowText()` — ✅ done 2026-10-25: `anggaran.tapBack()` added before each `createTransaction`; after seeding, `ringkasan.open()` + `anggaran.openFromRingkasan()` (the pattern TC-BUD-01/11 already use) before `rowText()`
- [x] **Fix TC-KAT-11** (C2): clear search filter, navigate via `tapBack()` (no bottom bar on kategori), dismiss sheet before reverse-wait — ✅ done 2026-10-25: `kategori.search('')` clears the filter, `kategori.tapBack()` → `tambah.open()`, `driver.back()` dismisses the sheet before the reverse wait. Bonus finding fixed: **TC-KAT-02 had the same no-bottom-bar bug** (tambah.open() from kategori) — same `tapBack()` fix applied
- [x] **Make the screenshot hook work** (C3): `mkdirSync('reports/screenshots', { recursive: true })` in `onPrepare` + log the catch — ✅ done 2026-10-25: directory created in `onPrepare` after the APK check; silent catch replaced with `console.warn('screenshot failed', e.message)`
- [x] **Pin `appium-mcp`** in `opencode.json` to an exact version (supply-chain fix, 1-line) — ✅ done 2026-10-25: pinned to `appium-mcp@1.97.1` (registry-verified current)

### P1 — Quality debt with compounding interest

- [ ] **Harden `switchMonth`** against the double-step race in BOTH `daftar.page.ts:76-84` and `ringkasan.page.ts` (R1 + prior review #5): settle-wait before reading the label; assert the *target* label, not merely "changed"; stop masking read errors via `.catch(() => before)` — *mostly done 2026-10-25: both files now have the 300 ms settle wait and neither masks read errors (the twins are byte-identical again); only the "assert the target label" enhancement remains open*
- [x] **Consolidate helpers** (R2/R3 + duplication table): one verified-retrying `typeIntoTaggedField` and one `childTexts(el)` in `helpers/`, deleting 3 typing copies and 7 text-loop copies — ✅ done 2026-10-25: typing 3 copies → 1 verified-retrying `typeIntoTaggedField` (R3 throw included); text loops → 1 `extractChildTexts` covering ringkasan ×2, daftar ×3 (`emptyStateTexts`, `rowTexts`, `firstDayHeaderTexts`) and `readAmount`'s enumeration. Two deliberate exceptions, documented in place: `rowAmountTextsInOrder` (per-row first-Rp-text selection, not a plain child-text loop) and `transaction-list.spec.ts`'s child enumeration in a skipped test (needs element handles for bounds, not texts)
- [x] **Move `readAmount` out of `daftar.page.ts`** into `helpers/` (prior review Step 2 — done 2026-10-25, see ringkasan review P0 Step 2)
- [x] **Wrap `daftar.rowTexts` in the `tapRowAction` retry pattern** (R7) and replace 10+ raw `$$` selectors in specs with locator helpers — ✅ done 2026-10-25: `rowTexts` wrapped in the 3-attempt fresh-requery loop (500 ms backoff); 7 raw `$$` converted to `allByTag`/`allByTagMatches` (behavior-identical selectors); 4 left raw with written rationale (textContains probes for stale-text/NaN assertions and one element-handles-only child enumeration in a skipped test — tag-contract helpers don't cover rendered-text lookup)

### P2 — Hygiene

- [x] Delete dead code: `cadangan.page.ts` (or test it), unused helpers/methods/constants (R5/R6) — ✅ done 2026-10-25: `cadangan.page.ts` deleted (grep-verified unreferenced); `byTagMatches`, `hasRowText`, `firstRow`, `cancelDialog` and 6 dead `tags.ts` constants removed — each grep-verified first. `allByTag` was KEPT: the review's dead list was stale — the R7 conversions made it live again
- [x] Replace magic tag strings with `tags.*` constants; catalogue the 3 uncatalogued component tags (R4) — ✅ done 2026-10-25: 12 strings converted across `kategori`/`anggaran` page objects + `budget.spec.ts`; the 3 uncatalogued tags (`sheetPicker`, `categoryChip(id)`, `inputAmount`) added to `anggaran`'s local tag map per the frozen-tags.ts pattern
- [x] Drop mocha timeout to ~120–180 s now that the 100-tx seed test is skipped (R8) — ✅ done 2026-10-25: 20 min → 180 s, with a comment noting to re-raise if TC-LIST-08 is revived
- [x] Fix the latent `parseAmountText` sign bug (R9) — ✅ done 2026-10-25: sign now derived from the gap immediately preceding the LAST numeric run (the review's literal adjacent-char suggestion was insufficient — in "−Rp 50.000" the char adjacent to the digits is a space; the gap-slice generalization fixes mixed-sign while preserving all 8 legacy behaviors). Unit tests: 11/11 pass, the R9 skip removed
- [x] `git rm --cached resources/*.idsig` + ignore `*.idsig`; add `engines`/`.nvmrc` — ✅ done 2026-10-25: deletion staged, `*.idsig` ignored, `engines: { node: ">=20" }`, `.nvmrc` = 24
- [x] Add `"typecheck": "tsc --noEmit"` script (O1) — ✅ done 2026-10-25. **O2 junit reporter deferred by decision:** needs installing `@wdio/junit-reporter` (a dependency change); one-line reporters addition once dependency use is approved — not installed unilaterally given this review's supply-chain posture

### P3 — Track / deferred

- [x] Dependency re-audit each release; document shell-quote/sharp deferrals with a review date (B.3) — **never** `npm audit fix --force` — *deferral documented 2026-10-25: shell-quote (appium) and sharp (uiautomator2-driver) accepted as low-reachability in this localhost harness per B.3's triage; re-audit on every appium/driver upgrade; next scheduled review 2027-01-25*
- [x] Unit tests for `parseAmountText` + extraction helpers (prior review Step 3 — done 2026-10-25, see ringkasan review P1 Step 3; run with `npm run test:unit`)
- [ ] Optional/nit items O3–O6, N1–N4 at author discretion

### Verdict

- **Quality:** Request changes — C1/C2 make Phase 2 specs unrunnable as written; C3 has been silently losing failure evidence across ~20 recorded runs.
- **Security:** Approve with conditions — no secrets, no dangerous APIs, clean history; conditions are the version pin (P0) and documented dependency-deferral policy (P3). Do not run forced audit fixes.

---

## Remediation Status (2026-10-25, orchestrated parallel pass)

All actionable findings above were worked in two dependency-ordered waves of parallel senior-QA tasks (file-ownership partitioned to prevent edit collisions), followed by a full-tree verification pass.

**Completed this pass:** Part C P0 in full (C1, C2, C3, appium-mcp pin @ 1.97.1); R7 (rowTexts retry + 7 raw-`$$` conversions); R2/R3 (typing consolidation into verified-retrying `typeIntoTaggedField`); R4/R5/R6 (magic strings, dead code — `allByTag` correctly kept live); R8/R9 (timeout, sign bug — unit tests 11/11, no skips); O1, engines/.nvmrc, idsig untracked; ringkasan P3 Steps 9–10.

**New finding fixed during remediation:** TC-KAT-02 carried the same deterministic no-bottom-bar navigation failure as C2(b) — `tambah.open()` from the kategori screen. Same `tapBack()` fix applied.

**Still open (tracked above):** switchMonth target-label assertion; daftar's in-method child-text loops; O2 junit (awaiting dependency approval); optional nits O3–O6, N1–N4.

**Verification state — static only:** `tsc --noEmit` clean, `npm run typecheck` and `npm run test:unit` green. **No device run was performed** (no emulator available during the pass): the Phase 2 specs (budget, category-management) remain never-executed, and the C1/C2/TC-KAT-02 navigation fixes plus the exact-2 bar-view guard (TC-SUM-09) are the first things a `test:anggaran`/`test:kategori`/`test:ringkasan` run must confirm.
