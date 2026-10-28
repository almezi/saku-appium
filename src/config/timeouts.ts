/**
 * Wait budgets — the ceiling a `waitFor…`/`toBe…({ wait })` call may spend
 * before it declares defeat (code_review.md finding **M5**: inline literals in
 * 43 files, 9 distinct values, no `config/timeouts.ts`, no `DEFAULT_TIMEOUT`).
 * The sweep moved 128 call sites: 123 `timeout:`/`wait:`/`interval:` object
 * literals plus 5 default-parameter budgets in the page objects.
 *
 * A budget is a DEADLINE, not a sleep: nothing here makes a test wait longer
 * than it already did. Every constant below equals the literal it replaced,
 * verified site by site, so this module is behavior-preserving by
 * construction. If a number is wrong, it was wrong before the rename — that
 * is finding **S9**'s job (re-tune), not this file's.
 *
 * Two families, deliberately split:
 *  - `*_IOS` budgets are wider because the iOS accessibility tree is
 *    populated lazily (TESTABILITY.md, and `base.ios.page.ts`'s own comment):
 *    the same wait that passes at 15 s on Android can miss on iOS.
 *  - the `_QUICK`/`_SLOW` twins mark two sites with the SAME intent and
 *    DIFFERENT numbers. They are not tiers to choose from — each pair is an
 *    unexplained inconsistency, kept exactly as found so **S9** can see it.
 *
 * Sleeps — the `driver.pause()` calls that block for their full duration —
 * live in `settles.ts`, not here.
 */

/* ------------------------------------------------------------------ *
 * App lifecycle
 * ------------------------------------------------------------------ */

/**
 * The app process reaching its first screen — all 18 of the suite's
 * `wait: 30_000` first-screen calls, most of them `before()` hooks
 * (`budget.spec.ts:33`, `navigation.spec.ts:8`, `summary.spec.ts:24`) plus the
 * iOS foreground restores after `background()`/`activateApp`
 * (`navigation.ios.spec.ts:95,124`).
 *
 * Five of those 18 are iOS specs (`transaction-list.ios.spec.ts:27`,
 * `edit-transaction.ios.spec.ts:26`, `validation.ios.spec.ts:75` and the two
 * `navigation.ios` restores) while their iOS twins give the same wait 45 s as
 * `APP_COLD_START_IOS`. Same intent, two numbers, no stated reason — **S9**.
 */
export const APP_COLD_START = 30_000;

/** The same wait on iOS: 45 s for the nine first-screen hooks. */
export const APP_COLD_START_IOS = 45_000;

/**
 * After `terminateApp` + `activateApp`, the app is already installed and was
 * recently warm: `persistence.spec.ts:48` (first screen) and the two
 * empty-state reads that follow a relaunch (`persistence.spec.ts:84`,
 * `persistence.ios.spec.ts:144`) settle on 15 s rather than 30.
 */
export const APP_RELAUNCH = 15_000;

/**
 * `performance.ios.spec.ts:138` caps its own measured
 * `launchApp` → first-nav-node wait at 30 s, a full 15 s below the iOS
 * first-screen budget above. Kept as its constant so the gap is visible; the
 * perf spec times the launch, so this bound is a cap, not an expectation.
 */
export const APP_LAUNCH_MEASURED = 30_000;

/* ------------------------------------------------------------------ *
 * Screen and element presence
 * ------------------------------------------------------------------ */

/**
 * A screen (or a screen-sized surface such as the budget or kategori form) is
 * on screen. The Android default of `BasePage.waitForScreen`, and every
 * `waitForDisplayed({ … })` a page object performs after a navigation.
 *
 * The 15 s `reverse: true` waits (`anggaran.ios.page.ts:130,162`,
 * `kategori.ios.page.ts:290` — "the form is gone") ride on this constant too,
 * because the form is the same surface crossing out instead of in. Their
 * non-reverse twin a few lines above is the `SCREEN_READY` call; note that a
 * sheet's dismissal gets `SURFACE_DISMISS` (10 s) instead — **S9**.
 */
export const SCREEN_READY = 15_000;

/** `BaseIosPage.waitForScreen` default, and `CadanganIosPage`'s override. */
export const SCREEN_READY_IOS = 30_000;

/**
 * The suite-wide fallback for a wait whose budget was never stated — the
 * constant M5 asked for by name. It is the `waitforTimeout` both runner configs
 * hand to WebdriverIO (`wdio.conf.ts:203`, `wdio.ios.conf.ts:93`), so an
 * unparameterised `waitForExist()` in any page object resolves to this number.
 * Prefer the specific budget above at a call site that does have an opinion.
 */
export const DEFAULT_TIMEOUT = SCREEN_READY;

/**
 * The workhorse: a tagged element, sheet row, card or button is expected to
 * be present/displayed/enabled — 37 sites across the page objects and specs
 * (`anggaran.page.ts:95`, `daftar.ios.page.ts`, `accessibility.spec.ts:66`).
 * Waits that prove a surface is GONE use `SURFACE_DISMISS` instead.
 */
export const ELEMENT_PRESENT = 10_000;

/**
 * The other direction at the same 10 s: a sheet, dialog or field that was just
 * dismissed is out of the tree (`reverse: true` waits in `anggaran.page.ts`,
 * `daftar*.page.ts`, `kategori.ios.page.ts`, `tambah*.page.ts`, plus
 * `cadangan.page.ts:133` / `cadangan.ios.page.ts:156`, which wait for the share
 * sheet to close via a predicate rather than `reverse`). The share sheet is
 * given `SYSTEM_SHEET` (15 s) when it APPEARS and this 10 s when it goes — a
 * 5 s asymmetry **S9** should look at.
 */
export const SURFACE_DISMISS = 10_000;

/**
 * The same expectation for a surface that should ALREADY be there — the undo
 * toast action (`transactions.ts:35`), the kategori rename dialog's save
 * button (`kategori.page.ts:192,194`), a just-tapped card. 12 sites at 5 s.
 */
export const ELEMENT_PRESENT_QUICK = 5_000;

/**
 * A Compose surface entering the accessibility tree. `helpers/input.ts` calls
 * this its "composition wait": on a cold start the first field lookup can run
 * while the screen is still composing, so the field must exist before the
 * interaction retry loop starts. The same 15 s covers the iOS form-name fields
 * (`kategori.ios.page.ts:318,340`), the Tambah category pager on both twins
 * (`tambah.page.ts:85`, `tambah.ios.page.ts:79`) and the iOS budget sheets
 * (`anggaran.ios.page.ts:112,143,159`) — whose Android twins wait only
 * `ELEMENT_PRESENT` (10 s) for the same sheets. 12 sites; the split is
 * **S9**'s.
 */
export const COMPOSITION_WAIT = 15_000;

/* ------------------------------------------------------------------ *
 * Surfaces outside the app
 * ------------------------------------------------------------------ */

/**
 * A system sheet — the share popover or the SAF file picker — becoming
 * visible or dismissing. The app cannot control its timing, and Android
 * renders it in another package (`com.android.intentresolver`/`documentsui`),
 * so this is deliberately the wider 15 s (`cadangan.page.ts:119` and
 * `cadangan.ios.page.ts:144` — both `waitForShareSheet()`'s default parameter —
 * plus `backup.spec.ts:238,274`). Dismissing the same sheet waits
 * `SURFACE_DISMISS` (10 s).
 */
export const SYSTEM_SHEET = 15_000;

/* ------------------------------------------------------------------ *
 * State change and polling
 * ------------------------------------------------------------------ */

/**
 * A Compose STATE flip observable only by polling — the hidden-category flag
 * (`kategori.ios.page.ts:254`) and the amount field clearing after save
 * (`tambah.ios.page.ts:210`). Wider than a presence wait because the app
 * writes the value asynchronously; it is a deadline, paired with
 * `POLL_INTERVAL*`.
 */
export const STATE_SYNC = 6_000;

/** The `waitUntil` cadence for a `STATE_SYNC` poll (`kategori.ios.page.ts:255`). */
export const POLL_INTERVAL = 300;

/** The tighter cadence the save-acknowledgement probe uses (`performance.ios.spec.ts:90`). */
export const POLL_INTERVAL_QUICK = 100;

/**
 * A best-effort toast probe: `tambah.ios.page.ts:214` confirms "any toast
 * that might surface on newer builds" and swallows the failure, so the budget
 * is a politeness ceiling, not an expectation.
 */
export const TOAST_PROBE = 2_000;

/* ------------------------------------------------------------------ *
 * Non-WDIO budgets
 * ------------------------------------------------------------------ */

/**
 * `execSync('adb … shell …')` in `performance.spec.ts:25`. Outside the driver
 * entirely: this bounds a host-side process, and a device under load (the
 * perf specs) answers slowly.
 */
export const ADB_EXEC = 60_000;

/* ------------------------------------------------------------------ *
 * Mocha / runner budgets (only the wait default is imported)
 * ------------------------------------------------------------------ */

// `waitforTimeout` in `wdio.conf.ts` and `wdio.ios.conf.ts` is the one runner
// number that means the same thing as the constants above, so both configs
// import `DEFAULT_TIMEOUT`. The rest stay literal on purpose: mocha's
// `timeout: 180_000` (wdio.conf.ts:246, wdio.ios.conf.ts:130) is a per-CASE
// ceiling and `connectionRetryTimeout: 180_000` bounds the HTTP handshake to
// the Appium server — neither is a wait for a UI node, and folding them in
// here would suggest they can be re-tuned together. Recorded so a reader
// hunting "where is the case budget" finds an answer: 180 s per case, set in
// the two runner configs.
