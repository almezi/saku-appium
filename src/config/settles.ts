/**
 * Settle pauses — deliberate `driver.pause()` sleeps (code_review.md finding
 * **M6**: 75 sites, 14 distinct durations, none named).
 *
 * Unlike `timeouts.ts`, these ARE sleeps: they block for the full duration
 * every time. That makes their names load-bearing — a bare `pause(400)` tells a
 * reader nothing about what it is waiting for, and several of these are the
 * only thing standing between a green run and a flake (see the "must stay a
 * pause" notes below).
 *
 * Every constant equals the literal it replaced, verified site by site, so this
 * module is behavior-preserving by construction. Re-tuning is finding **S9**'s
 * job, not this file's.
 *
 * The `_QUICK`/`_SLOW` twins are not tiers to pick from. Each pair is two sites
 * with the SAME intent and DIFFERENT numbers, kept exactly as found so **S9**
 * can see the inconsistency instead of having it averaged away:
 *  - `STALE_RETRY` 500 / `_QUICK` 300 / `_SLOW` 700 — one intent, three numbers
 *  - `SHEET_CLOSE_SETTLE` 500 vs `_QUICK` 400
 *  - `KEYBOARD_RETRY` 500 vs `_QUICK` 400
 *  - `SCROLL_SETTLE` 500 vs `_QUICK` 200
 *  - `UNDO_TOAST_EXPIRY` 6_000 vs `UNDO_TOAST_PASSED` 6_500
 * Platform pairs (`APPEARANCE_*`, `TEXT_SIZE_*`) are a different case: the two
 * directions disagree, with Android slower on appearance and iOS slower on
 * text size.
 */

/* ------------------------------------------------------------------ *
 * Retry backoff after a transient interaction failure
 * ------------------------------------------------------------------ */

/**
 * The backoff before re-querying an element after a click/read threw a stale
 * handle or raced a Compose recomposition — the error path of the retry loops
 * in `helpers/input.ts`, `daftar*.page.ts`, `kategori.ios.page.ts`,
 * `ringkasan.page.ts`, `tambah.ios.page.ts` and `backup.spec.ts` (13 sites).
 */
export const STALE_RETRY = 500

/** The same backoff where the loop only re-reads geometry: 300 ms. */
export const STALE_RETRY_QUICK = 300

/** The same backoff on the save-button click race: 700 ms. */
export const STALE_RETRY_SLOW = 700

/* ------------------------------------------------------------------ *
 * After a navigation or a scroll
 * ------------------------------------------------------------------ */

/**
 * Let the destination settle after a nav action before the measurement starts,
 * so the timing being captured is the action's cost and not the screen's
 * composition (`performance.spec.ts:52,62`, `performance.ios.spec.ts:68`).
 */
export const POST_NAV = 500

/**
 * After a scroll helper returns, before reading list state: the momentum
 * outlasts the gesture, and the first visible row is not the row the read will
 * get (`rotation.spec.ts:75`, `rotation.ios.spec.ts:104`,
 * `performance.ios.spec.ts:101`).
 */
export const SCROLL_SETTLE = 500

/** The same settle between two `mobile: scrollGesture` calls: 200 ms. */
export const SCROLL_SETTLE_QUICK = 200

/**
 * Inside a swipe helper, right after `performActions` returns, letting the
 * drag animation finish before the caller queries (8 sites: the `swipeList`
 * and scrim helpers in `anggaran.ios`, `daftar*`, `kategori*`, `ringkasan*`,
 * `tambah.ios`).
 */
export const SWIPE_ANIM = 400

/* ------------------------------------------------------------------ *
 * Sheets and keyboard
 * ------------------------------------------------------------------ */

/**
 * A dismiss animation has to *start* before a reverse `waitForExist` can prove
 * the sheet is gone; without this the wait can see the still-open sheet node
 * and pass, then flake (`tambah.page.ts:100`, `tambah.ios.page.ts:264`).
 */
export const SHEET_CLOSE_SETTLE = 500

/** The same lead-in on the budget/kategori sheets: 400 ms. */
export const SHEET_CLOSE_SETTLE_QUICK = 400

/**
 * After the keyboard-dismiss gesture itself, before re-reading whether the
 * keyboard is really gone (`helpers/input.ts:223,243`).
 */
export const KEYBOARD_DISMISS = 400

/** Backoff between keyboard-dismiss attempts (`tambah.ios.page.ts:199`). */
export const KEYBOARD_RETRY = 500

/** The same backoff in `persistence.ios.spec.ts`'s helper: 400 ms. */
export const KEYBOARD_RETRY_QUICK = 400

/** After injecting Return, before the next field read (`kategori.ios.page.ts:425`). */
export const KEY_RETURN_SETTLE = 300

/** After a backspace key, before re-reading the rendered amount (`amount-input.ios.spec.ts:71`). */
export const KEY_SETTLE = 400

/* ------------------------------------------------------------------ *
 * Field writes
 * ------------------------------------------------------------------ */

/**
 * The interval between sending keys to a focused field and reading its text
 * back: the value lands asynchronously, and reading too early returns the
 * pre-edit text — which the retry loops would then retry needlessly
 * (`helpers/input.ts:296,332`, `amount-input.ios.spec.ts:46,148`).
 */
export const FIELD_WRITE = 300

/** The same read-after-write gap after clearing a field with backspaces (`helpers/input.ts:262`). */
export const FIELD_CLEAR = 300

/* ------------------------------------------------------------------ *
 * Recomposition that a wait cannot observe
 * ------------------------------------------------------------------ */

/**
 * After a month-arrow tap, before re-reading the month label. MUST stay a
 * pause: the label node is the same node, so a presence wait can never observe
 * the change — and reading too early returns the old month, which makes the
 * loop step two months (`daftar.page.ts:60`, `daftar.ios.page.ts:232`,
 * `ringkasan.page.ts:228`, `ringkasan.ios.page.ts:219`).
 */
export const MONTH_LABEL_RECOMPOSE = 300

/** After paging the iOS date picker, before re-reading the day cells (`tambah.ios.page.ts:160`). */
export const DATE_PAGE_ANIM = 400

/** After the SAF drawer closes, before clicking the file row (`backup.spec.ts:242`). */
export const DRAWER_RECOMPOSE = 400

/**
 * The SAF drawer's slide-in: the row is queryable well before it is tappable,
 * so an existence wait proves nothing (`backup.spec.ts:143`).
 */
export const SAF_DRAWER_SLIDE_IN = 600

/** Backoff between SAF picker navigation attempts (`backup.spec.ts:149`). */
export const SAF_RETRY_BACKOFF = 800

/**
 * The cadence of a hand-rolled poll loop that re-reads an accessibility
 * attribute (`kategori.ios.page.ts:234`, the eye/hidden state). `waitUntil`
 * polls use `POLL_INTERVAL` in `timeouts.ts` instead — 100/200/300 for one
 * idea is a spread **S9** can now see.
 */
export const POLL_CADENCE = 200

/* ------------------------------------------------------------------ *
 * System-level changes the app must re-render after
 * ------------------------------------------------------------------ */

/**
 * After `setOrientation`: the Activity is recreated and Compose re-lays-out.
 * Six sites in `rotation.spec.ts` (55,59,78,81,90,94) all use 1 s.
 */
export const ORIENTATION_SETTLE = 1_000

/** After `adb cmd uimode night`, before reading the re-rendered UI. */
export const APPEARANCE_SETTLE_ANDROID = 1_500

/** After `mobile: setAppearance` — 500 ms wider than the Android twin. */
export const APPEARANCE_SETTLE_IOS = 2_000

/** After `adb settings put system font_scale`, before reading the form. */
export const TEXT_SIZE_SETTLE_ANDROID = 2_000

/** After `mobile: setContentSize` — narrower than the Android twin. */
export const TEXT_SIZE_SETTLE_IOS = 1_000

/** After the app returns to the foreground from `background()`. */
export const BACKGROUND_RESUME = 1_000

/* ------------------------------------------------------------------ *
 * Process restarts (perf specs)
 * ------------------------------------------------------------------ */

/**
 * After an app start/relaunch, before the measurement or the re-attach:
 * `performance.spec.ts:104,120` (warmup launch, and UiAutomator2 re-attaching
 * after the force-stop) and `performance.ios.spec.ts:135`.
 */
export const APP_RESTART_SETTLE = 3_000

/**
 * After `am force-stop`, before the next measured `am start -W`. Longer than
 * `APP_RESTART_SETTLE` because the kill has to propagate; a too-early start is
 * reported as a cold launch the app never made (`performance.spec.ts:112`).
 */
export const APP_FORCE_STOP_SETTLE = 5_000

/* ------------------------------------------------------------------ *
 * Undo-window expiry
 * ------------------------------------------------------------------ */

/**
 * Past the app's 5 s undo window, so the deletion is committed. MUST stay a
 * pause: the toast node can linger composed after expiry, so a disappearance
 * wait is unreliable and flaked across runs (`delete-undo.spec.ts:66,88`).
 */
export const UNDO_TOAST_EXPIRY = 6_000

/** The same window in the two-deletion case, which needs the extra 500 ms. */
export const UNDO_TOAST_PASSED = 6_500
