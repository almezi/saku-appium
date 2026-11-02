# HANDOVER.md — Saku Appium Test Suite

> **Audience:** A new/junior SDET or QA engineer taking over this automation project.
> **Goal:** Get you productive in a day. Read top-to-bottom once, then keep it open as a reference.
> **Source of truth for details:** `TESTABILITY.md`, `UI_SPEC.md`, `README.md`, `AGENTS.md` (all in this repo). This doc *teaches*; those docs *specify*.

---

## 1. What this project actually is (in plain words)

We automate the **Simple Money Tracker (Saku)** app — a personal finance app for
tracking income ("pemasukan") and expenses ("pengeluaran"), by month.

- **App under test (AUT):** `id.almezi.simplemoneytracker_kt` (a Kotlin/Compose app).
- **Platforms:** **Android** (UiAutomator2) and **iOS** (XCUITest, simulator). The suite
  is dual-platform — every screen has an Android and an iOS implementation.
- **Tooling:** [Appium](https://appium.io/) (v3) + [WebdriverIO](https://webdriver.io/) (v9) + TypeScript + Mocha.
- **What it does:** Drives the app on an emulator/device/simulator the way a user would
  (tap, type, scroll), then reads what's on screen and asserts the math/UI is correct.
- **Example checks:** "balance = income − expense", "savings rate = (income−expense)/income",
  "breakdown bars add up to 100%", "negative balance shows `−Rp` not `Rp -`".

We do **not** unit-test the app code. The app is a black box; we only talk to it through
Appium (UI automation). This is **end-to-end (E2E)** testing.

> `saku` = "pocket/wallet" in Indonesian. Most screen names are Indonesian — see the
> Glossary (§10) before you panic at the words.

---

## 2. Prerequisites & one-time setup

You need a working Android test environment before any test will run.

| Need | Why | Notes |
|---|---|---|
| **Node.js ≥ 22** | Runs the suite (TS + WDIO) | `node -v` to check. `.nvmrc` pins `24` |
| **Android SDK / emulator** | Appium drives a real Android | Default udid `emulator-5554`. Set `ANDROID_HOME` or it auto-detects `~/Library/Android/sdk` (macOS). |
| **An emulator or device, booted** | The app must be installed & running | Pixel 10-ish, API 34+. Must be visible to `adb devices`. |
| **The app APK** | The thing we test | Expected at `resources/SimpleMoneyTrackerKT-v2.2.apk`. |
| **macOS + Xcode** | Only for the iOS half | Booted simulator (`xcrun simctl list devices`) + the XCUITest driver. |

Steps:

```bash
# 1. Clone / open this repo
cd saku-appium

# 2. Install dependencies (Appium is installed locally — no global install needed)
npm install

# 3. Make sure an emulator is up and the app is installed:
adb devices                 # should list emulator-5554
adb install resources/SimpleMoneyTrackerKT-v2.2.apk   # if not already installed

# 4. Smoke test — run the navigation suite (fastest, ~1 min)
npm run test:navigasi
```

If you see a session-creation error, 99% of the time the emulator isn't running or the
APK path is wrong. See §8 (Debugging).

### The iOS half

The iOS suite needs no APK — it drives a **simulator**. Boot one, then run the same
suite through `wdio.ios.conf.ts`:

```bash
xcrun simctl list devices                # pick a UDID (e.g. iPhone 18 Pro)
npm run test:ios                         # all iOS specs
npm run test:navigasi:ios                # one iOS spec
```

The iOS page objects are separate implementations (`*.ios.page.ts`) with their own
quirks — most notably, Compose renders a tagged container's strings as **siblings** on
iOS, so text must be read by **geometry from one page-source dump**, never by nested
tree traversal. `IOS_PHASE1_HANDOFF.md` documents the port; `bugs/BUG_Found_11.md`,
`bugs/BUG_Found_13.md` and `bugs/BUG_Found_14.md` record the specific iOS defects found along the
way.

### Environment overrides (when you need them)
| Variable | Default | Use |
|---|---|---|
| `SAKU_DEVICES` | unset | Comma-separated UDIDs, e.g. `"emulator-5554,140892554V003873"` — enables parallel runs (any device count, each gets its own systemPort). Takes precedence over the vars below. |
| `ANDROID_UDID` | `emulator-5554` | Point at a different device/emulator (legacy single-device selection). |
| `REAL_DEVICE_UDID` | unset | Second device for parallel runs (legacy two-slot selection). |
| `SAKU_SHARD` | unset | `1` = shard mode: split spec files across devices instead of running the full suite on each. |
| `SAKU_APPIUM_PORTS` | unset | e.g. `"4723,4725"` — connect to self-started Appium servers (one per device, `npm run appium:server1` / `appium:server2`) instead of the runner-spawned shared server on 4725. |
| `SAKU_APK` | `resources/...v2.2.apk` | Use a different build (e.g. a debug APK). |
| `ANDROID_HOME` | auto | Override the SDK location. |

---

## 3. How to run the tests

```bash
npm test                                   # every spec
npm run test:navigasi                      # navigation smoke only
npm run test:tambah                        # add income/expense flows
npm run test:transaksi                     # list / edit / delete flows
npm run test:ringkasan                     # summary math (the screen we walk through below)
npm run test:anggaran                      # budget flows
npm run test:kategori                      # category management flows

# Run a single file:
npx wdio run ./wdio.conf.ts --spec ./src/tests/ringkasan/summary.spec.ts

# By test type — every test case's it() title ends with one type tag:
npm run test:sanity                         # @sanity — the fast always-on set
npm run test:regression                     # @regression — the functional suite
npm run test:integration                    # @integration — cross-screen flows
npm run test:sanity:ios                     # the same three on iOS
npm run test:regression:ios
npm run test:integration:ios

# Parallel across devices (export SAKU_DEVICES first, needs ≥ 2 devices):
npm run test:shard                         # split spec files across devices — ~2x faster
npm run test:parallel                      # every spec on every device — coverage

# iOS (simulator; no APK needed):
npm run test:ios                           # every iOS spec
npm run test:navigasi:ios                  # one iOS spec
npm run test:list:ios                      # transaction list
npm run test:val:ios                       # form validation
npm run test:perf:ios                      # performance budgets
npm run test:inc:ios                       # add income
npm run test:exp:ios                       # add expense

# Pure unit tests (no emulator needed!) for the money/element helpers:
npm run test:unit
```

**Key behavior to know:** Each spec file starts a **fresh Appium session with clean app
data** (`appium:noReset = false` in `wdio.conf.ts`). That means:
- Specs are **isolated** — a transaction you create in `summary.spec.ts` does not leak
  into `add-income.spec.ts`.
- Inside one spec file, tests **share** that clean state, so ordering within a file can
  matter (see how `summary.spec.ts` seeds data in a `before` hook).
- On failure, a **screenshot** is saved to `reports/screenshots/`.

---

## 4. Project map (where things live)

```
saku-appium/
├── wdio.conf.ts                 # Runner config: Android caps, Appium service, Mocha, reporters
├── wdio.ios.conf.ts             # Runner config: iOS/XCUITest caps, simulator
├── resources/                   # The APK lives here
├── src/
│   ├── config/
│   │   ├── tags.ts              # ★ THE TEST-TAG CONTRACT (read this constantly)
│   │   ├── categories.ts        # Stable category/account IDs (never use display names)
│   │   ├── category-labels.ts   # The one documented text-lookup exception
│   │   ├── test-types.ts        # The test-type vocabulary (@sanity/@regression/@integration)
│   │   └── __tests__/           # Guardrail: every test case carries exactly one test type
│   ├── helpers/
│   │   ├── locators.ts          # Turn a tag into an Appium selector (byTag, scrollToTag…)
│   │   ├── elements.ts          # Read text/amounts off already-found elements
│   │   ├── money.ts             # Rupiah format/parse (pure functions → unit tested)
│   │   ├── input.ts             # Type into Compose text fields
│   │   ├── transactions.ts      # createTransaction() — UI-driven test data setup
│   │   ├── ios-app.ts           # iOS app lifecycle helpers (terminate/activate/reinstall)
│   │   └── __tests__/           # Node unit tests for the pure helpers (17 tests)
│   ├── pageobjects/             # One class per screen, × 2 platforms
│   │   ├── base.page.ts         # Parent class: waitForScreen, tapBack, systemBack
│   │   ├── ringkasan.page.ts     # ★ Summary screen (we walk through this in §6)
│   │   ├── daftar.page.ts        # Transaction list screen
│   │   ├── tambah.page.ts        # Add transaction screen
│   │   ├── ubah.page.ts          # Edit transaction screen
│   │   ├── anggaran.page.ts      # Budget screen
│   │   ├── kategori.page.ts      # Category management screen
│   │   ├── cadangan.page.ts      # Backup/export screen (share-sheet + SAF import flows)
│   │   └── *.ios.page.ts         # The iOS twin of each — independent implementations
│   └── tests/                   # The actual Mocha specs, grouped by feature
│       ├── navigasi/  tambah/  transaksi/  ringkasan/  anggaran/  kategori/  app/
├── reports/                     # Appium log + screenshots (gitignored)
├── docs/                        # Deeper architecture/design notes (see docs/README.md)
├── TESTABILITY.md               # How the app exposes test tags (the contract)
├── UI_SPEC.md                   # UI behavior spec (formatting rules, etc.)
├── README.md                    # Quickstart + layout
├── HANDOVER.md                  # This file
├── code_review.md               # Senior QA review — known weak points
├── bugs/                        # All 18 bug reports + BUGS.md index
└── AGENTS.md                    # Operating rules (commit style, bug protocol)
```

Rule of thumb: **never edit `tags.ts` by guessing.** It mirrors `TestTags.kt` in the app
repo. If a tag is missing, the app doesn't expose it yet.

### The Android/iOS twin convention

Every screen that exists on both platforms has **two independent implementations**:

```
src/pageobjects/tambah.page.ts      ←→  src/pageobjects/tambah.ios.page.ts
src/tests/tambah/add-income.spec.ts ←→  src/tests/tambah/add-income.ios.spec.ts
```

Android runs through `wdio.conf.ts` (`npm test`); iOS through `wdio.ios.conf.ts`
(`npm run test:ios`). The two halves are **not** generated from a shared base — they
are written separately and are expected to expose the same public method surface. Today
all 7 screen page objects and all 16 specs have twins; the **explained** residual drift
lives in `scripts/parity-baseline.json`, and `npm run check:parity` fails the build on any
new gap (or on a closed one still listed there). So: **when you add a screen method, add
it to both twins**, and when you add a test case, add it to both spec twins with the same
`TC-<AREA>-<NN>` id.

> ⚠️ `wdio.ios.conf.ts` is **not** covered by `npm run typecheck` — `tsconfig.json`
> includes only `src/**/*.ts` and `wdio.conf.ts`. See `code_review.md` finding **S1**.

---

## 5. The architecture in 30 seconds

We use the **Page Object Model (POM)**:

- A **page object** (e.g. `RingkasanPage`) knows *how to talk to one screen* — its
  locators and the actions you can do there ("open", "read balance", "switch month").
- A **spec** (e.g. `summary.spec.ts`) knows *what to verify* — it uses page objects to
  drive the app and makes assertions. Specs contain no Appium selectors.
- **Helpers** are shared utilities (locating by tag, reading amounts, formatting money,
  seeding transactions).

This separation means: if the app's UI changes, you fix the page object, not every test.

### The ONE rule that beats all others: **locate by test tag, never by text**

The app sets `testTagsAsResourceId = true`, so every Compose `testTag` becomes a bare
Android `resource-id`. We resolve locators with `byTag(...)` → a UiAutomator2
`resourceId` selector. We **never** locate by visible text (text changes with language,
locale, amount formatting, etc.).

```ts
// ✅ Good — stable across languages & data
byTag(tags.ringkasan.balanceValue)

// ❌ Bad — brittle. Don't do this in page objects/specs.
$(`android=new UiSelector().text("Rp 250.000")`)
```

There are rare, documented exceptions (e.g. `findRowText` in `daftar.page.ts` looks up a
row by a *unique note string* you yourself generated — that's fine because the text is
controlled test data, not app copy).

---

## 6. Walkthrough: `ringkasan.page.ts` (your reference file)

This is the file you were handed. It is a near-perfect example of every pattern in the
suite. We'll go top-to-bottom. Keep it open side by side:
`src/pageobjects/ringkasan.page.ts`.

### 6.1 Imports & the "local helper" at the top (lines 1–20)

```ts
import { byTag, scrollToTag } from '../helpers/locators'
import { barFillRatio, extractChildTexts, readAmount } from '../helpers/elements'
import { tags } from '../config/tags'
import { BasePage } from './base.page'
```

- `byTag` turns a tag string into a clickable/findable element.
- `readAmount` reads a money value off an element (handles "Rp 250.000", "−Rp 50.000",
  child TextViews, content-desc — see §7.3).
- `tags` is the contract (§4, §5).
- `BasePage` gives us `waitForScreen()` etc.

The function `childTextsFromSource` (lines 7–20) is a *local* helper specific to this
screen. It parses the raw XML page source (`driver.getPageSource()`) and pulls the
non-empty `text="..."` values out of one node's subtree. It's used for breakdown rows
because reading them element-by-element is unreliable (next point).

### 6.2 The class skeleton (lines 22–30)

```ts
export class RingkasanPage extends BasePage {
  constructor() {
    super(tags.ringkasan.screen)   // tells BasePage which tag = "this screen is open"
  }

  async open(): Promise<void> {
    await byTag(tags.navRingkasan).click()   // tap the bottom "Summary" tab
    await this.waitForScreen()               // from BasePage: wait until ringkasan_screen is shown
  }
```

Every page object has this shape: a constructor that names its screen tag, and an `open()`
that navigates to it and waits for it to render. Specs call `ringkasan.open()` to get to a
known state.

### 6.3 Simple readers — the "what is on screen" methods (lines 32–62)

```ts
async balanceValue(): Promise<number> {
  return readAmount(byTag(tags.ringkasan.balanceValue))
}
async balanceText(): Promise<string> {
  return byTag(tags.ringkasan.balanceValue).getText()
}
```

Two flavors you'll see everywhere:
- `...Value()` → returns a **number** (parsed money) for math assertions.
- `...Text()` → returns the **raw string** for exact-format assertions (e.g. "is it
  `−Rp 50.000` and not `Rp -50.000`?").

`openAnggaran()` / `openKelolaKategori()` are just clicks on buttons that leave this
screen — they belong here because the buttons live *on* the Ringkasan screen.

### 6.4 The hard parts — why they look "defensive" (lines 64–123)

This is where junior engineers get confused. The Compose UI + Appium combination has three
real, observed flakiness sources. The code handles each explicitly. **Don't "clean these
up" by removing the loops — they are load-bearing.**

**(a) Stale elements in a LazyColumn** — `breakdownItemTexts` (lines 74–88):
```ts
for (let attempt = 0; attempt < 3; attempt++) {
  try { await scrollToTag(tag) } catch { /* row not reachable, dump decides */ }
  const xml = await driver.getPageSource()      // atomic snapshot of the whole screen
  const texts = childTextsFromSource(xml, tag)
  if (texts.length > 0) return texts
  await this.scrollContentDown()                 // maybe the row isn't composed yet
}
throw new Error(`Breakdown item ${categoryId} not found in page source`)
```
Why: reading deep rows element-by-element fails because Compose recycles off-screen rows
(stale-element errors). The fix is to dump the **whole page source** (atomic) and parse
the XML. A scroll retry covers rows not yet composed. **This pattern is the canonical way
to read breakdown rows — copy it when you add similar screens.**

**(b) `breakdownBarRatio`** (lines 105–123): measures how full a progress bar is by
comparing the rendered pixel widths of the bar-fill vs its container, using
`barFillRatio(container.width, fill.width)`. Same 3-attempt retry because the bar views can
stale between find and measure. The trailing `View` children are `[container, fill]`
(verified live — at 80% the fill was 712px of an 890px container).

**(c) Scrolling a Compose LazyColumn** — `scrollContentDown` (lines 132–150): uses raw
W3C touch actions (pointer down → move → up) to swipe up. Why not `mobile: scrollGesture`?
Because on this Compose list the `scrollGesture` 'down' direction is a **silent no-op**
(verified via curl). So we do a manual touch swipe instead. `scrollToBottom()` just calls
it 3× to reveal the last section (the expense breakdown, which sits under the floating
nav).

> **Mental model:** "Compose + Appium = treat lists as fragile. Snapshot the source, retry,
> and prefer raw gestures over `scrollGesture`."

### 6.5 Month switching with verify-retry (lines 163–188)

```ts
private async switchMonth(arrow: string): Promise<void> {
  const before = await this.monthLabel()
  for (let attempt = 0; attempt < 3; attempt++) {
    await byTag(arrow).click()
    await driver.pause(300)                  // let recomposition settle
    const after = await this.monthLabel()
    if (after !== before) return             // success: label changed
  }
  throw new Error(`Month switch via ${arrow} did not change the label from "${before}"`)
}
```

This is a **verify-retry** pattern: the arrow click can race the UI's recomposition and
silently not register. So we click, **pause**, then check that the label actually changed.
If it didn't, we click again — up to 3×. `daftar.page.ts` has the identical helper (a sign
this is a shared gotcha). **Use this exact pattern whenever a tap might not "take".**

### 6.6 What you should take away from this file

- Every public method returns **data** (numbers/strings), never raw elements — specs stay
  readable: `expect(await ringkasan.balanceValue()).toBe(150000)`.
- Retries are **explicit and bounded** (always `for (let attempt = 0; attempt < 3; …)`),
  never infinite.
- Comments explain **why** (live-verified facts), not what — read them, they're the real
  tribal knowledge.

---

## 7. The shared helpers (what to reuse vs reinvent)

### 7.1 `helpers/locators.ts` — finding elements
| Export | Use for |
|---|---|
| `byTag(tag)` | One element by exact tag. Your default. |
| `byTagMatches(pattern)` | One element by Java regex tag. |
| `allByTag` / `allByTagMatches` | All matching elements (e.g. every day header). |
| `scrollToTag(tag)` | Scroll a LazyColumn until a tag is visible, return it. |

All of these resolve to `resourceId` selectors — recall the §5 rule.

### 7.2 `helpers/elements.ts` — reading elements
- `readAmount(el)` → number. Tries the node's own text, its `content-desc`, then child
  TextViews, and takes the **last digit-bearing text** (because labels like "MASUK" render
  before the value "Rp 250.000"). This is your go-to for any money assertion.
- `extractChildTexts(parent)` → `string[]` of non-empty child texts (e.g. a comparison
  card's labels/values, an empty-state's title+hint).
- `barFillRatio(containerW, fillW)` → `fill/container`; throws on non-positive container
  (so a bad layout fails loudly instead of computing 0).

### 7.3 `helpers/money.ts` — Rupiah, pure & unit-tested
Critical formatting facts (from `UI_SPEC.md`):
- Thousands separated by **dots**: `Rp 1.234.567`. **No decimals** in amounts.
- Negatives use the Unicode minus `−` (U+2212), **never** `"Rp -50.000"`.
- Savings rate: one decimal, comma: `75,0%`; negative `−12,3%`.

`parseAmountText` is the inverse of formatting — it copes with leading labels ("Masuk Rp
250.000"), both minus styles, dots-as-thousands, comma-as-decimal. **These are pure
functions with unit tests** (`src/helpers/__tests__/money.test.ts`). If you touch money
logic, run `npm run test:unit` and add a test.

### 7.4 `helpers/transactions.ts` — test data setup
`createTransaction({ type, amount, categoryId, note })` drives the real **Tambah** form to
create a transaction. This is how specs seed their "arrange" state. There's **no seed API**
in the app yet (the `test_seed` intent extras in `TESTABILITY.md` are unimplemented), so we
go through the UI. `uniqueNote('sum-exp')` mints a timestamped note so row lookups never
collide between tests. `tapUndoAction()` handles the undo toast after a delete.

### 7.5 `config/categories.ts` — stable IDs
Reference categories/accounts **by ID** (`categories.income.salary` → `'inc_salary'`),
never by display name ("Gaji"). IDs are stable; names/localization are not. Note some
categories have `countsInTotals = false` (e.g. `inc_transfer_in`, `exp_finance_investment`)
— they exist but shouldn't change the summary totals.

### 7.6 `config/test-types.ts` — the test-type vocabulary
Every **test case** ends its `it()` title with exactly one type tag: `@sanity`,
`@regression` or `@integration`. The scripts in §3 (`npm run test:sanity` etc.) filter
on those tags, so a case **must** carry one — an untagged case is silently excluded
from every filtered run rather than failing loudly. `npm run test:unit` enforces it:
the guardrail in `src/config/__tests__/test-types.test.ts` parses every spec file and
asserts each case carries exactly one recognized type, that a file does not mix types,
and that the file's `describe()` agrees with its cases. Both twins of a spec carry the
same type.

---

## 8. Debugging a failure (do this in order)

1. **Read the Mocha failure + the spec line.** The error message usually names the
   assertion or the "not found" element.
2. **Open the screenshot.** `reports/screenshots/<timestamp>-<test>.png` is captured
   automatically on failure (`afterTest` hook in `wdio.conf.ts`).
3. **Check the Appium log.** The runner's server log lands in `reports/` — the filename
   varies with the run and the port in use (`appium-4725.log` for the shared server the
   runner spawns, `appium-4723.log` for a self-started `appium:server1`,
   `appium-ios-wdio.log` for the iOS runner). List `reports/` and read the newest one.
   Look for `NoSuchElement`, `stale element`, or command timeouts.
4. **Confirm the emulator is alive & the app installed.** `adb devices`,
   `adb shell pm list packages | grep simplemoney`.
5. **Reproduce in isolation.** Run just that one spec:
   `npx wdio run ./wdio.conf.ts --spec ./src/tests/ringkasan/summary.spec.ts`.
6. **Suspect flakiness before suspecting a real bug.** If it's a stale-element / not-found
   error on a scrollable list, the fix is usually a retry/scroll (see §6.4), not a new
   assertion. Known app quirks (silent `scrollGesture`, month-switch races) are already
   handled — don't "simplify" them away.
7. **For helper math (money/amounts), run the unit tests:** `npm run test:unit` — fast, no
   emulator needed.

### Common pitfalls (learned the hard way)
- **"Element not found" right after a click** → recomposition race. Add a small
  `driver.pause(...)` or a `waitForDisplayed` before reading. Copy the verify-retry in
  `switchMonth`.
- **First field lookup fails on a cold start** → the screen tag exists but the field is
  still composing; `typeIntoTaggedField` now waits for the field to exist (15 s) before
  its tight interaction retries (2026-10-25, TC-BACKUP before-hook).
- **Reading a LazyColumn row returns stale/wrong data** → use the page-source dump +
  scroll-retry pattern from `breakdownItemTexts`, not per-element reads.
- **`scrollGesture` does nothing** → it's a known Compose no-op here; use
  `scrollContentDown` (raw touch actions).
- **Negative balance shows `Rp -` in your assertion but `−Rp` in the app** → you're
  comparing formatted strings; use `formatNegativeRp` / `readAmount` consistently.
- **Emulator wedged mid-boot** (`cmd: Can't find service: settings`, empty
  `sys.boot_completed`, session create fails) → restart it:
  `adb -s emulator-5554 emu kill`, then relaunch
  `emulator @Pixel_10 -no-snapshot-load -no-window` and wait for `sys.boot_completed=1`.
  Happened 2026-10-25 after a spontaneous framework crash; also implicated in
  bugs/BUG_Found_03.md's data loss.
- **System surfaces (share sheet, SAF DocumentsUI) have no test tags** → text /
  content-desc locators are the sanctioned exception there, but know their traps:
  DocumentsUI opens on MediaStore-indexed "Recent" (a freshly `adb push`ed file is
  invisible — navigate "Show roots" → "Downloads" for a filesystem listing), the roots
  drawer is itself scrollable so `UiScrollable` can race it, and stale-retries can
  double-tap the hamburger closed. See `backup.spec.ts` TC-BACKUP-04 and
  `bugs/BUG_Found_02.md`.
- **A save the app acknowledged (toast + count + export) later vanishes from the DB**
  → un-checkpointed WAL loss under the wdio harness, seen twice on 2026-10-25;
  do NOT burn retries — file it (see `bugs/BUG_Found_03.md`) and pull the DB
  (`run-as … cat databases/simplemoneytracker.db*`) to confirm.

### Real-device prerequisites (TECNO CM7 & other OEM phones)

Run these once per device before pointing the suite at a real phone:

```bash
# 1. Allow the Appium helper APK install (Play Protect blocks it otherwise):
adb -s <udid> shell settings put global verifier_verify_adb_installs 0
# 2. Keep the screen awake while plugged in (60 s screen timeout kills sessions):
adb -s <udid> shell svc power stayon true
# 3. Disable system animations (UiAutomator-friendly, standard CI device setup):
adb -s <udid> shell settings put global window_animation_scale 0
adb -s <udid> shell settings put global transition_animation_scale 0
adb -s <udid> shell settings put global animator_duration_scale 0
# 4. Exempt the test servers from battery optimization (HiOS is aggressive):
adb -s <udid> shell dumpsys deviceidle whitelist +io.appium.uiautomator2.server
adb -s <udid> shell dumpsys deviceidle whitelist +io.appium.uiautomator2.server.test
adb -s <udid> shell dumpsys deviceidle whitelist +id.almezi.simplemoneytracker_kt
```

**Known blocker (bugs/BUG_Found_01.md):** on the TECNO CM7 (HiOS, Android 16) the
uiautomator2 instrumentation deadlocks whenever the Saku app is foreground — the
first hierarchy command hangs, then the instrumentation "crashes". The app works
fine manually and the same APK passes on the Android 16 emulator, so treat real-device
runs on this phone as blocked until the bug is resolved; use `emulator-5554` for now.

**Active 2.C blockers (2026-10-25):** `bugs/BUG_Found_02.md` (SAF picker drive under WDIO —
app import itself is fine) and `bugs/BUG_Found_03.md` (committed transaction vanishing from
the DB mid-session — Critical/P1, needs app-side or fresh-emulator investigation).
Suite status per sub-phase lives in `progress.md`.

---

## 9. How to add a new test (recipe)

Say you want to verify "Ringkasan shows the correct savings hint when income is 0".

1. **If a screen interaction is missing, extend the page object** (not the spec). Add a
   method to `ringkasan.page.ts` returning data, e.g. `async savingsHint(): Promise<string>`.
   Locate it via `byTag(tags.ringkasan.savingsValue)` — and if the tag isn't in
   `tags.ts`, check `TestTags.kt` in the app repo first; only then add it (and document it).
2. **Write the spec** in `src/tests/ringkasan/`, e.g. `summary.spec.ts` or a new file:
   ```ts
   it('TC-SUM-14 savings hint present at income 0', async () => {
     await ringkasan.open()
     expect(await ringkasan.savingsText()).toBe('—')
     expect(await ringkasan.savingsHint()).toContain('Tambah pemasukan')
   })
   ```
3. **Seed data through `createTransaction`** in a `before`/`beforeEach` if needed; use
   `uniqueNote(...)` so it can't collide.
4. **Run it isolated** first (`--spec …`), then with its group (`npm run test:ringkasan`).
5. **Assert on numbers/formatted strings via the page object's readers** — never inline
   Appium selectors in a spec.

Naming: test cases follow `TC-<AREA>-<NN>` (see `TESTING.md` for the area list:
TC-NAV, TC-INC, TC-EXP, TC-VAL, TC-LIST, TC-EDIT, TC-DEL, TC-SUM, TC-BUDGET, TC-KAT, …).

---

## 10. Glossary (Indonesian → English)

The app is in Indonesian; you'll see these in tags, tests, and screens.

| Word | Meaning | Screen/tag hint |
|---|---|---|
| **Saku** | pocket / wallet | project name |
| **Ringkasan** | Summary | `ringkasan.*` (the screen we walked through) |
| **Daftar** | List (of transactions) | `daftar.*` |
| **Tambah** | Add | `tambah.*` (add transaction) |
| **Ubah** | Change / Edit | `ubah.*` (edit transaction) |
| **Anggaran** | Budget | `anggaran.*` |
| **Kategori** | Category | `kategori.*` |
| **Pemasukan** | Income | `type: 'pemasukan'` |
| **Pengeluaran** | Expense | `type: 'pengeluaran'` |
| **Kelola** | Manage | e.g. "Kelola Kategori" = manage categories |
| **Saldo** | Balance | `ringkasan_balance_*` |
| **Pengeluaran vs Pemasukan** | Expense vs Income | comparison card |
| **Urungkan** | Undo | the undo toast action |
| **Belum ada data** | "No data yet" | empty states |

---

## 11. Where to go next (other docs in this repo)

- `README.md` — quickstart & full layout, plus the iOS runbook.
- `TESTABILITY.md` — **the tag contract**: how the app exposes `testTag`s and the rules for
  adding them. Read before touching `tags.ts`.
- `UI_SPEC.md` — UI behavior spec (money formatting, empty states, edge cases).
- `AGENTS.md` — commit conventions (Conventional Commits), the **Android/iOS twin
  convention**, and the **bug-reporting protocol**. Follow this when you find a real
  app bug.
- `code_review.md` — the senior QA review of this harness. Read §S1–§S22 and §M1–§M14
  before refactoring — they list the known weak points, so you do not have to rediscover
  them.
- `bugs/BUGS.md` — index of all 14 filed defects, with a "patterns worth knowing" section.
- `docs/` — deeper architecture/design notes and the iOS migration plan.
- `IOS_PHASE1_HANDOFF.md` — how the iOS port was done, and the iOS-specific quirks.
- `test-cases-simple-money-tracker.md` — the full catalogued test-case backlog (Phases 1–3).

### First-week checklist for the new owner
- [ ] Environment boots; `npm run test:navigasi` is green.
- [ ] You can run a single spec in isolation.
- [ ] You've read `ringkasan.page.ts` top-to-bottom and understand the retry patterns.
- [ ] You've run `npm run test:unit` and seen the money helpers tested.
- [ ] You've booted an iOS simulator and run `npm run test:navigasi:ios` at least once.
- [ ] You've added one small test using the §9 recipe and it passes — **and you added
      the matching iOS twin**, per the twin convention.
- [ ] You know how to file a bug report per `AGENTS.md` when you hit an app bug.
- [ ] You've skimmed `code_review.md` §S1–§S22 so you know what is already known-broken.

---

*Maintained as the onboarding doc for this suite. Update it when a pattern changes or a new
gotcha is discovered — juniors read this before the spec docs.*
