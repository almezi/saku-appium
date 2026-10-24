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

### 🟠 HIGH

#### 3. Stale element after scroll in `breakdownBarRatio`

**Lines:** 96-106

`scrollToTag` scrolls the element into view, then `item.$$(...)` operates on it. Between the scroll and the child enumeration, Compose may **recompose** and invalidate the element reference, causing `StaleElementReferenceError`.

Compare to `DaftarPage.tapRowAction` (lines 119-129) which retries on a fresh query. `breakdownBarRatio` has no such protection.

**Fix:** Wrap in a retry loop that re-queries on each attempt.

#### 4. Fragile bar-view indexing (assumes exactly 2 Views at the end)

**Lines:** 99-106

```typescript
const container = await viewList[viewList.length - 2].getSize()
const fill = await viewList[viewList.length - 1].getSize()
```

The guard only checks `length < 2`, but if there are **3 or more Views**, the method silently picks the wrong elements. A Compose layout change (e.g., adding a ripple wrapper View) would cause incorrect ratio calculations, not an error.

**Fix:** Add a guard for exactly 2 Views, or use a more specific selector.

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

### 🟡 MEDIUM

#### 6. Mixed import of `Element` from `'webdriverio'` — potential v8/v9 breakage

**Line:** 5

```typescript
import type { Element } from 'webdriverio'
```

The project's `types.ts` (lines 5-8) documents that WDIO v9 exposes `ChainablePromiseElement` and `ChainablePromiseArray` from `webdriverio`, but **not** `Element`. This works only because it's `import type` (compile-time only), but it's misleading and will break if anyone makes it a runtime import.

**Fix:** Use `WebdriverIO.Element` or import from `@wdio/globals`.

#### 7. `comparisonTexts()` and `emptyStateTexts()` don't scroll

**Lines:** 66-76, 78-89

Unlike `breakdownItemTexts()` which calls `scrollToTag`, these methods use `byTag(...)` directly. If the element is below the fold, they fail with no-element-found.

**Fix:** Use `scrollToTag` for consistency, or document explicitly why not.

### 🟢 LOW

#### 8. Redundant `await` on `$` calls

**Lines:** 22, 34, 38, 42, 46

```typescript
return byTag(tags.ringkasan.balanceValue).getText()
```

`byTag(...)` returns a `ChainablePromiseElement` (a `$()` result). The `await` on `byTag(...)` in line 18 (`readAmount(byTag(...))`) is implicit through the `$` promise. But in lines 22, 34, 38, `.getText()` is called without `await` on the `$` — this is correct (WDIO chains), but stylistically inconsistent with line 18 where `readAmount` receives an awaited `ChainablePromiseElement`.

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

### 📊 Maintainability Scorecard

| Dimension | Score (1-5) | Notes |
|-----------|-------------|-------|
| Readability | 4.5/5 | Excellent comments, clear method names |
| Modifiability | 3.5/5 | Duplicated loops, cross-page import, fragile casts |
| Testability | 2.5/5 | No unit tests; ratio/text logic only tested via Appium |
| Robustness | 4/5 | Good retry patterns, but bar-ratio indexing is fragile |
| Cognitive Complexity | 4/5 | Low — each method does one thing clearly |

---

## 3. TODO List & Step-by-Step Refactoring Plan

### Priority 0 (P0) — Immediate Fixes

- [ ] **Step 1:** Extract `extractChildTexts` helper to eliminate 3x duplicated loop
  - **Location:** Add private method in `RingkasanPage` or move to `helpers/locators.ts` as a shared utility
  - **Files affected:** `ringkasan.page.ts` (3 method bodies change)
  - **Effort:** 15 min
  - **Risk reduction:** Catches logic drift at one edit point

- [ ] **Step 2:** Move `readAmount` from `daftar.page.ts` to `helpers/` to decouple page objects
  - **Location:** `src/helpers/elements.ts` (new file) or `src/helpers/money.ts` (existing)
  - **Files affected:** `src/pageobjects/daftar.page.ts`, `src/pageobjects/ringkasan.page.ts`, any other importer
  - **Effort:** 20 min
  - **Risk reduction:** Enables independent refactoring of either page

### Priority 1 (P1) — Medium-Hanging Fruit

- [ ] **Step 3:** Add unit tests for `parseAmountText` and bar-ratio extraction logic
  - **Location:** `src/helpers/__tests__/money.test.ts` (new)
  - **Files affected:** New test file; imports `src/helpers/money.ts`
  - **Effort:** 30 min
  - **Risk reduction:** Fast feedback on regex/ratio changes without booting emulator

- [ ] **Step 4:** Replace `as unknown as Element[]` cast with proper type
  - **Location:** `ringkasan.page.ts` line 99
  - **Files affected:** `ringkasan.page.ts` only
  - **Effort:** 10 min
  - **Risk reduction:** Removes hidden type assumption

- [ ] **Step 5:** Add retry/wait in `switchMonth` between click and label read
  - **Location:** `ringkasan.page.ts` lines 112-120
  - **Files affected:** `ringkasan.page.ts` only
  - **Effort:** 15 min
  - **Risk reduction:** Reduces flaky month-switch failures

### Priority 2 (P2) — Lower Priority

- [ ] **Step 6:** Add `waitForExist` guards after `scrollToTag` calls
  - **Location:** `breakdownItemTexts` (line 55), `breakdownBarRatio` (line 97)
  - **Files affected:** `ringkasan.page.ts` only
  - **Effort:** 10 min
  - **Risk reduction:** Clear error instead of opaque crash when item is not found

- [ ] **Step 7:** Add scroll to `comparisonTexts()` and `emptyStateTexts()` for consistency
  - **Location:** Replace `byTag(...)` with `scrollToTag(...)` in lines 67, 80
  - **Files affected:** `ringkasan.page.ts` only
  - **Effort:** 10 min
  - **Risk reduction:** Handles below-fold elements gracefully

- [ ] **Step 8:** Add guard for exactly 2 bar Views in `breakdownBarRatio`
  - **Location:** `ringkasan.page.ts` lines 100-101
  - **Files affected:** `ringkasan.page.ts` only
  - **Effort:** 10 min
  - **Risk reduction:** Detects layout changes that add wrapper Views

### Priority 3 (P3) — Nice-to-Have

- [ ] **Step 9:** Add JSDoc `@param` / `@returns` to public methods
  - **Location:** All public methods missing explicit param docs
  - **Files affected:** `ringkasan.page.ts` only
  - **Effort:** 20 min
  - **Risk reduction:** IDE tooltips for callers

- [ ] **Step 10:** Audit all `chainable.click()` calls for missing `waitForExist` before click
  - **Location:** `open()`, `openAnggaran()`, `openKelolaKategori()`, `switchMonth()`
  - **Files affected:** `ringkasan.page.ts` only
  - **Effort:** 15 min
  - **Risk reduction:** Catches element-not-interactable failures

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
