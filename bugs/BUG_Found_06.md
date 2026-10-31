# BUG_Found_06.md — Bug Report 06

## Status
- **State:** Open
- **Summary:** Bottom-nav labels clip mid-word at 200 % font scale. App-side text-overflow handling; the accessibility tree and tag resolution are unaffected.

## Identity

- **Reported by:** ZCode agent (Appium MCP run, Phase 3.D)
- **Reported at:** 2026-10-26T13:40:00+07:00
- **Branch:** features/phase3
- **Commit SHA:** 14d1ec6

## Test Context

- **Phase:** 3
- **Sub-phase:** 3.D — Rotation & Config Change
- **Test case ID:** TC-ROT-06
- **Spec file:** src/tests/app/rotation.spec.ts

## Bug Details

**Title:** Bottom-nav labels clip mid-word at 200% font scale (no ellipsis, no wrap)

**Description:** With system font scale set to 2.0, the Tambah form renders fully (every field, label, helper and button intact; the date gracefully shortens to "26 Okt"), but the three bottom-navigation labels truncate mid-word without an ellipsis or wrap: "Tambah" → "Tamba", "Transaksi" → "Transak", "Ringkasan" → "Ringkas".

**Steps to Reproduce:**
1. `adb shell settings put system font_scale 2.0`
2. Open the app (any bottom-tabbed screen).
3. Observe the bottom navigation labels.

**Actual Result:** Labels are cut mid-word with no ellipsis: "Tamba", "Transak", "Ringkas".

**Expected Result:** Labels either fit (wrap or shrink per spec) or truncate with an ellipsis; no mid-word clipping.

**Attachment:** Screenshot 2026-10-26 05:42 (emulator-5554, font_scale 2.0) captured during the MCP run.

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
200%-scale nav-label truncation is a render-level clip in the app; automation
proven clean by the re-run (labels composed, full text, bounds scaled ~1.9x).
Fix belongs in the app repo (bottom-nav Compose text overflow). This workspace
holds the test harness only — no harness fix applies.

## Additional Notes — fix details (app repo)

- TC-ROT-06 marked `~[BUG]` in progress.md per the bug protocol; the rest of the 200%-scale form renders correctly.
- Related: TC-A11Y (contrast/labels) — not affected.
- Suggested fix: `maxLines = 1` with `TextOverflow.Ellipsis`, or auto-shrink text on the nav items.

### Live re-run evidence (2026-10-26, Appium MCP, emulator-5554, app v2.2)

`adb shell settings put system font_scale 2.0` → fresh MCP page-source dump:

- Nav labels composed, full text intact ("Tambah", "Transaksi", "Ringkasan").
- Bounds scaled ~1.9x vs font scale 1.0 (e.g. "Tambah" bounds grew ~126px → ~238px).
- Mid-word clip is visual/render-level, not an accessibility-tree or tag
  resolution failure.

Conclusion: app-side text overflow handling. Automation harness not at fault.
