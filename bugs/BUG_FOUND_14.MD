# BUG_Found_14.md — Bug Report 14

## Status
- **State:** Fixed
- **Summary:** The numeric keypad's Delete key is a silent no-op after the category sheet closes (the dismissed keyboard lingers in the tree). Fixed by sending the hardware backspace.

## Identity
- **Reported by:** Qoder automation agent (iOS Phase 3.B re-verification)
- **Reported at:** 2026-10-27T19:45:00+07:00
- **Branch:** feature/implement-ios-automation
- **Commit:** 9ddb0d3 (fix applied to the working tree, not yet committed)

## Test Context
- **Phase:** 3
- **Sub-phase:** 3.B — Amount Input Behavior (TC-AMT)
- **Test case ID:** TC-AMT-06
- **Spec file:** src/tests/tambah/amount-input.ios.spec.ts

## Bug Details
### Title
The numeric keypad's "Delete" key is off-screen (visible="false") once the app has dismissed the software keyboard, so tapping it changes nothing — the iOS twin of Android's DEL keycode is the hardware backspace (automation code bug, NOT an app bug)

### Description
The iOS port of TC-AMT-06 drove the backspace with the on-screen numeric keypad's "Delete" key
(the element the earlier spike had found and clicked successfully). That works only while the
SOFTWARE keyboard is up. The app dismisses the software keyboard when the category sheet closes,
and the dismissed keyboard keeps its element tree: the live dump shows
`XCUIElementTypeKeyboard visible="false" x="0" y="891"` (the screen is 874 pt tall) and its keys
at y=898…1114, all with `visible="false"`. A WDA tap on such a key is a silent no-op — the amount
field keeps its value.

TC-AMT-06 runs after TC-AMT-03/04, which both pick a category, so by then the keyboard is
dismissed and the case fails: the field still renders "Rp 123" after the "Delete" tap instead of
"Rp 12". The first run of the suite passed (the keyboard was still up then), so the case was
order/state dependent — a latent flake that turned into a deterministic failure on the re-run.

The app behaves correctly: the amount field keeps the caret at the end, and the hardware
backspace deletes the last character exactly like Android's native DEL keycode.

### Steps to Reproduce
1. Open the Tambah screen on the iOS simulator and tap the amount field (the numeric keypad
   opens, keys visible at y=596…812).
2. Tap the category field and pick a category — the sheet closes and the app dismisses the
   software keyboard.
3. Dump the page source: `<XCUIElementTypeKeyboard … visible="false" x="0" y="891">` and its
   `Key` children at y=898…1114, all `visible="false"`.
4. Type 123 into the amount field, then tap the keypad's "Delete" key → the field still renders
   "Rp 123".

### Actual Result
`expect(await tambah.getAmountText()).toBe('Rp 12')` → received "Rp 123"; the tap on the
off-screen key is swallowed by WDA.

### Expected Result
One backspace drops the last digit only ("Rp 123" → "Rp 12"), the same outcome the Android spec
gets from `driver.pressKeyCode(67)`.

### Attachment
/tmp/ios_amt_final.log (failing run), live XCUITest page-source dumps of the dismissed keyboard
(Appium session on the iPhone 18 Pro simulator, 2026-10-27)

### Severity
Critical (a Phase 3 case that could not be executed — the on-screen backspace is unreachable
after the category sheet closes)

### Priority
P1 (fix before Phase 3 completion)

## Environment
- **Device/Emulator:** iPhone 18 Pro simulator, udid 80FCD259-BA75-4018-8FE6-31F4E812AD9B
- **Platform:** iOS 27.0
- **Appium version:** 3.8.0 (appium-xcuitest-driver 12.21.0)
- **App build:** Saku.app Debug (bundle `id.almezi.saku`)
- **Android API level:** n/a

## Fix Ownership
**AUTOMATION CODE.** The app behaves correctly (caret at the end, hardware backspace deletes); the
spec drove an on-screen keypad key that is `visible="false"` once the app has dismissed the
software keyboard. Fixed in `src/tests/tambah/amount-input.ios.spec.ts` — hardware BACKSPACE
(U+E003), the twin of Android's native DEL keycode 67.

## Additional Notes
Fixed in `src/tests/tambah/amount-input.ios.spec.ts`: TC-AMT-06 now sends the hardware
BACKSPACE (U+E003) to the focused editor — the direct twin of Android's native DEL keycode 67,
which is what the Android spec uses for the same case — and verifies that the rendered amount
actually changed (max 3 attempts). The hardware backspace reaches the focused field whether or
not the software keyboard is up (verified live: "Rp 123" → "Rp 12" → "Rp 1"). TC-AMT-01 still
asserts that tapping the amount field opens the numeric keypad, so the on-screen keypad stays
covered.
