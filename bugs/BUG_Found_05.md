# BUG_Found_05.md — Bug Report 05

## Status
- **State:** Open
- **Summary:** The Tambah form is unsavable in landscape — the note field and save button are not composed. App-side defect; workaround is to rotate back to portrait before saving.

## Identity

- **Reported by:** ZCode agent (Appium MCP run, Phase 3.D)
- **Reported at:** 2026-10-26T13:20:00+07:00
- **Branch:** features/phase3
- **Commit SHA:** 14d1ec6

## Test Context

- **Phase:** 3
- **Sub-phase:** 3.D — Rotation & Config Change
- **Test case ID:** TC-ROT-01 (finding surfaced during the pass; case itself passes on round trip)
- **Spec file:** src/tests/app/rotation.spec.ts

## Bug Details

**Title:** Tambah form is unsavable in landscape — note field and save button are not composed

**Description:** Rotating the Tambah screen to landscape retains amount and category, but the note field (`tambah_input_note`) and the save button (`tambah_button_save`) are absent from the accessibility tree entirely — `scroll_to_element` reports end-of-scrollable-content, i.e. they are not composed, not merely off-screen. A user on a landscape device cannot add a note or save the transaction without rotating back to portrait.

**Steps to Reproduce:**
1. Open Tambah, fill amount and category.
2. Rotate the device/emulator to landscape.
3. Attempt to scroll to the note field or locate the save button.

**Actual Result:** Note field and save button do not exist in the UI tree; the visible form ends after the date row. No way to save in landscape.

**Expected Result:** The full form (note + save) is reachable in landscape, either laid out on screen or scrollable.

**Attachment:** MCP page-source dumps 2026-10-26 (portrait tree contains `tambah_input_note`/`tambah_button_save`; landscape tree contains neither; `scroll_to_element` → "end of scrollable content").

**Severity:** Minor
**Priority:** P3

## Environment

| Field | Value |
|---|---|
| Device/Emulator | emulator-5554 (Pixel 10 profile) |
| Platform | Android 17 emulator |
| Appium version | 3.8.0 (uiautomator2) |
| App build | SimpleMoneyTrackerKT-v2.2.apk |
| Android API level | 17 (release) |

## Fix Ownership

**APP CODE (confirmed by the live Appium MCP re-run on 2026-10-26).** The
landscape rotation drops `tambah_input_note` + `tambah_button_save` from the
composed tree; automation, driver and tag layers proven clean by the re-run.
Fix belongs in the app repo (Compose Tambah landscape layout). This workspace
holds the test harness only — no harness fix applies.

## Additional Notes — fix details (app repo)

- Rotation round trip itself is safe: all filled values are retained when portrait returns (TC-ROT-01 passes).
- Related test cases: TC-ROT-01, TC-INC/TC-EXP save flows (landscape only).
- Workaround: rotate back to portrait before saving.

### Live re-run evidence (2026-10-26, Appium MCP, emulator-5554, app v2.2)

Repro on a fresh session via `set_orientation`:

1. Portrait page-source: `tambah_screen`, `tambah_input_amount`,
   `tambah_input_note`, `tambah_helper`, `tambah_button_save` composed.
2. LANDSCAPE: `tambah_input_note` + `tambah_button_save` + `tambah_helper`
   ABSENT. Amount + category pager composed. ScrollView scrollable.
3. PORTRAIT back: all present again.

Conclusion: app-side compose defect on landscape recomposition. Automation
harness not at fault. App-side fix area: full Tambah column (note + save) must
compose under landscape, not only portrait.
