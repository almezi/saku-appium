# BUG_Found_18.md — Bug Report 18

## Status

- **State:** Open
- **Summary:** `TC-VAL-17` (save with the keyboard open → form resets) fails on every attempt
  (3/3) at the reset assertion — `tambah_helper` renders no node after the save. Whether v2.3
  really leaves the form un-reset, or the open keyboard simply hides the helper, is **not yet
  determined**; this report records the measurement and the 3× skip decision, not a root cause.

## Identity

- **Reported by:** Qoder agent (wdio runs on emulator-5554)
- **Reported at:** 2026-10-28T05:55:00Z
- **Branch:** feature/implement-ios-automation
- **Commit:** bfeced8

## Test Context

- **Phase:** 3
- **Sub-phase:** 3.A (Tambah form validation)
- **Test case ID:** TC-VAL-17
- **Spec file:** src/tests/tambah/validation.spec.ts (case at lines 184-196)

## Bug Details

### Title
Saving with the keyboard open leaves no `tambah_helper` node, so the "form resets" assertion
cannot be read — TC-VAL-17 fails 3 consecutive attempts

### Description
`TC-VAL-17` fills an amount and category, types a note **without hiding the keyboard**, taps
save, then asserts the form returned to its empty state by reading the helper line
(`validation.spec.ts:191-192`, `expect(await tambah.getHelperText()).toBe('Isi jumlah dan
kategori dulu')`).

The helper node is never found after the save:

```
Error: Can't call getText on element with selector
       "android=new UiSelector().resourceId("tambah_helper")" because element wasn't found
    at async Context.<anonymous> (src/tests/tambah/validation.spec.ts:191:12)
```

Two explanations fit the measurement equally well, and separating them needs a probe this
session did not run:
1. **App behaviour** — with the IME up, the v2.3 save does not reset the form (so the helper
   is replaced by the filled-field state), or
2. **Harness/visibility** — the keyboard is still up when the read happens, and the helper is
   composed off-screen / uncomposed by the IME resize, so `getText` has no node to read.

What is certain: the case fails deterministically, the `.catch(() => undefined)` on the toast
expectation at `:191` already tolerates a missing toast, and the failure is **identical in
pre-sweep code** (see Additional Notes) — so it is not a product of the M5/M6 timing change.

### Steps to Reproduce
1. `npx wdio run ./wdio.conf.ts --spec ./src/tests/tambah/validation.spec.ts`
   (emulator-5554, Pixel_10, API 37, app v2.3 installed).
2. Run the file to `TC-VAL-17`: amount `3333`, category `income.refund`, note typed via
   `typeKeys(…, 'kb open', true)` — deliberately no `hideKeyboard()`.
3. Tap `tambah_button_save`, then read `tambah_helper`.

### Actual Result
`tambah_helper` is not found (the case's own failure), 3/3 attempts. When an earlier case in the
same file fails first, TC-VAL-17 instead dies on entry — `component_nav_bottom_tambah` not found
at `validation.spec.ts:185` — i.e. the file carries no navigation reset between cases, so one
case that ends off-screen poisons the next.

### Expected Result
Per the case's intent (and UI_SPEC.md's Tambah contract), saving resets the form and the helper
line "Isi jumlah dan kategori dulu" is readable again; the transaction is then visible in Daftar.

### Attachment
- `/tmp/m5_tambah.log` — attempt 1 (4 workers, `npm run test:tambah`): fails at the reset
  assertion; the other 16 cases in the file pass.
- `/tmp/m5_val_solo.log` — attempt 2 (solo): 13 passing / 4 failing; TC-VAL-17 fails on entry
  after TC-VAL-14/15/16 fail.
- `/tmp/ab_val.log` — attempt 3 (solo, **pre-sweep** source): 14 passing / 3 failing; TC-VAL-17
  fails again at the reset assertion.
- No screenshot (reports/ is gitignored; the failure is a missing node, not a visual state).

### Severity
Major — one regression case cannot execute, and the flow it guards (save while the IME is up) is
a realistic user path.

### Priority
P2 — does not block other cases in 3.A; needs a focused probe to split app vs harness before it
can be fixed.

## Environment
- **Device/Emulator:** Pixel_10, emulator-5554
- **Platform:** Android
- **Appium version:** 3.8.0 (wdio-managed service)
- **App build:** installed `versionName=2.3 / versionCode=5` (caps still name
  `resources/SimpleMoneyTrackerKT-v2.2.apk`)
- **Android API level:** 37

## Additional Notes

- **3× rule applied, skip NOT yet committed.** `AGENTS.md` §Rules for All Agents (test-failure
  retry limit) says a case that fails three consecutive times is skipped and marked. It is
  marked `~[BUG]~` in `progress.md` §3.A; the `it.skip` itself is deliberately **not** applied —
  it changes suite behaviour, and the same case's iOS twin
  (`validation.ios.spec.ts`) would then need the parity baseline updated. Leaving that to a
  human decision.
- **`validation.spec.ts` is state-coupled — the moving failures are a separate hygiene issue.**
  Across the three attempts the *other* failures moved: attempt 2 failed TC-VAL-14/15/16
  (note-text round-trips, `Expected: "🎈🎉💰" / Received: ""`), attempt 3 failed TC-VAL-10/11
  (amount parsing) with 14/15/16 green. Same suite, same device, different victims — that is
  cross-case state, not twelve separate defects. Worth its own pass (a per-case navigation
  reset, or `beforeEach` that returns to Tambah), and worth checking against code-review
  **S7**-family isolation notes.
- **Exonerates the M5/M6 sweep.** Attempt 3 ran the **pre-sweep** snapshot of `src/` (inline
  `timeout: 10_000` / `pause(500)` literals, identical values) and produced the same TC-VAL-17
  failure at the same line — the same A/B that reproduced `TC-SUM-12` identically. See
  `code_review.md` → "Magic-number discipline".
- Related: `BUG_Found_16.md` (the deterministic below-fold category failure that also breaks
  TC-SUM-12 / TC-EXP-08).
