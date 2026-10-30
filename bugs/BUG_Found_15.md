# BUG_Found_15.md — Bug Report 15

## Status

- **State:** Open
- **Summary:** App v2.3 drops six Cadangan test tags on both platforms (screen root, status card, import button, import result/error, warning strip), breaking the TESTABILITY.md contract for the whole screen; the harness now works around it with documented text-based lookups.

## Identity

- **Reported by:** ZCode (agent, live probe via Appium MCP)
- **Reported at:** 2026-10-28T06:40:00Z
- **Branch:** feature/implement-ios-automation
- **Commit:** bf9f782

## Test Context

- **Phase:** 2
- **Sub-phase:** 2.C (Cadangan / backup & export)
- **Test case ID:** TC-BACKUP-01 … TC-BACKUP-06 (whole screen affected)
- **Spec file:** src/tests/transaksi/backup.spec.ts (Android), src/tests/transaksi/backup.ios.spec.ts (iOS)

## Bug Details

### Title
v2.3 redesign drops six Cadangan test tags on both platforms — `cadangan_screen`, `cadangan_status_card`, `cadangan_import_button`, `cadangan_import_result`, `cadangan_import_error`, `cadangan_warning`

### Description
App build v2.3 (versionCode 5) redesigned the Cadangan screen and stopped applying six of the
nine test tags that TESTABILITY.md and TestTags.kt contract for it. Verified live 2026-10-28
via Appium MCP on the Pixel_10 emulator (Android 17 / API 37): only `daftar_backup_button`
(entry; absent on an empty list), `cadangan_export_csv`, `cadangan_export_json` and
`component_button_back` still render — `testTagsAsResourceId` itself works (those nodes carry
their tags), so the six tags are genuinely not applied by the app, not a driver artifact.
The iOS build shows the same six-tag drift (documented in `cadangan.ios.page.ts` on
2026-10-27), so the regression is in the shared Compose Multiplatform screen code.

The screen also changed shape, which the old automation asserted against:
- the status card became one untagged TextView `"N transaksi  ·  N akun  ·  N kategori"`
  (two spaces around the middle dot; the v2.2 wording "N transaksi tersimpan" is gone),
- "CADANGAN TERAKHIR" renders "Belum pernah" (capital B) or a date, plus a status pill
  "Perlu" (never backed up) / "Aman" (backed up),
- the import entry is the untagged text "Pulihkan dari cadangan" inside a clickable container,
- importing renders **no result surface at all** — no `cadangan_import_result`, no
  `cadangan_import_error`, no toast; the only observable is the status line's transaction
  count (an identical re-import adds nothing).

### Steps to Reproduce
1. Install app v2.3 on an emulator (verified on Pixel_10 / API 37) and open Cadangan from the
   Transaksi list.
2. Dump the page source (Appium `getPageSource`).
3. Search for `resource-id="cadangan_screen"`, `cadangan_status_card`, `cadangan_import_button`,
   `cadangan_import_result`, `cadangan_import_error`, `cadangan_warning` — none are present,
   while `cadangan_export_csv` / `cadangan_export_json` / `component_button_back` are.
4. Import a valid backup JSON via "Pulihkan dari cadangan" and dump again immediately — no
   result node and no toast appears; only the status line count increases.

### Actual Result
Six contracted test tags render no node on v2.3 on both platforms, and the import outcome has
no UI surface at all.

### Expected Result
Per TESTABILITY.md ("Cadangan" section) all nine tags render on the screen, and per the v2.2
verified behaviour the import reports its outcome through `cadangan_import_result` /
`cadangan_import_error`.

### Attachment
- Appium MCP session c313790a-79ac-4072-9d90-bdcd0a33afc5 (Pixel_10, emulator-5554, page-source dumps 2026-10-28)
- Workaround in place: `src/pageobjects/cadangan.page.ts` and `src/pageobjects/cadangan.ios.page.ts`
  resolve the untagged nodes by unique rendered text (documented exception, same pattern as
  `config/category-labels.ts`)

### Severity
Major

### Priority
P2

## Fix Ownership
**APP CODE.** The v2.3 redesign dropped six tags TESTABILITY.md and TestTags.kt contract, on both
platforms — the shared Compose screen code is the fix site, and only the app owner can close this
(re-apply the tags; the import outcome would also need some UI surface for
`cadangan_import_result`/`_error` to mean anything). The harness side is DONE as a workaround:
text-based lookups in both page objects, with the removal condition documented in their JSDoc.
This bug stays Open until the app re-applies the tags.

## Additional Notes

- Same defect family as BUG_Found_07 (v2.2 category-sheet rows lost their tags); there the
  workaround was a scoped text-label map, here it is per-node text lookups in the page objects.
- The v2.3 status/entry changes (single-line status, capital-B "Belum pernah", empty-list
  entry via `daftar_empty_state_secondary`, no import result surface) required spec updates in
  `backup.spec.ts` / `backup.ios.spec.ts` beyond the locator swap.
- Deleting this bug requires the app to re-apply the six tags; the text-based lookups in the
  two page objects carry their removal condition in their JSDoc, like `category-labels.ts`.
