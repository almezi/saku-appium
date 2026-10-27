# Bug Index — Saku Appium Test Suite

All filed defects for the Saku (Simple Money Tracker) automation harness. One bug per
file; the numbering is continuous and files are never deleted or renumbered.

**Protocol:** `AGENTS.md` § Bug Reporting Protocol. **Template:** `BUG_FOUND.template.md`.

## Summary

| State | Count | Bugs |
|---|---|---|
| **Open** | 8 | 01, 03, 04, 05, 06, 10, 12, 15 |
| **Fixed** | 6 | 02, 07, 08, 11, 13, 14 |
| **Closed** | 1 | 09 |
| **Total** | **15** | |

## Index

| # | File | Platform | Severity / Priority | State | One-line summary |
|---|---|---|---|---|---|
| 01 | [BUG_FOUND.md](BUG_FOUND.md) | Android | Major / P2 | Open | TECNO real-device deadlock under uiautomator2; no confirmed fix path — emulator-only workaround |
| 02 | [BUG_Found_02.md](BUG_Found_02.md) | Android | Major / P2 | Fixed | SAF picker drive blocks TC-BACKUP-04; app itself is fine (verified via MCP) → drawer race closed by verify-retry drive |
| 03 | [BUG_Found_03.md](BUG_Found_03.md) | Android | Critical / P1 | Open | A committed transaction silently vanishes from the DB on the next clean reopen (WAL loss) |
| 04 | [BUG_Found_04.md](BUG_Found_04.md) | Android | Major / P2 | Open | "Ubah kategori" dialog self-dismisses under WDIO between open and typing |
| 05 | [BUG_Found_05.md](BUG_Found_05.md) | Android | Minor / P3 | Open | Tambah form unsavable in landscape — note field and save button are not composed |
| 06 | [BUG_Found_06.md](BUG_Found_06.md) | Android | Minor / P3 | Open | Bottom-nav labels clip mid-word at 200 % font scale |
| 07 | [BUG_Found_07.md](BUG_Found_07.md) | Android | Major / P1 | Fixed | Category sheet rows carry no test tags in v2.2 → fixed via text-label lookup |
| 08 | [BUG_Found_08.md](BUG_Found_08.md) | iOS | Major / P2 | Fixed | `xcodebuild` SIGTRAP on a malformed `Saku.xcscheme` → every iOS build failed |
| 09 | [BUG_Found_09.md](BUG_Found_09.md) | Android | Minor / P3 | Closed | Pull-to-refresh is not implemented; TC-LIST-11 retired from the catalogue |
| 10 | [BUG_Found_10.md](BUG_Found_10.md) | iOS | Major / P2 | Open | iOS picker remote view is not dismissable programmatically — blocks TC-BACKUP-04 |
| 11 | [BUG_Found_11.md](BUG_Found_11.md) | iOS | Critical / P1 | Fixed | Material3 date picker labels days device-locale-first; the date matcher never matched |
| 12 | [BUG_Found_12.md](BUG_Found_12.md) | iOS | Trivial / P3 | Open | TC-PERF-05 cannot run on the simulator — `dumpsys meminfo` has no counterpart |
| 13 | [BUG_Found_13.md](BUG_Found_13.md) | iOS | Critical / P1 | Fixed | Compose renders a tagged container's strings as siblings → tree-only child reads returned nothing |
| 14 | [BUG_Found_14.md](BUG_Found_14.md) | iOS | Critical / P1 | Fixed | Numeric keypad Delete key is a silent no-op after the category sheet closes |
| 15 | [BUG_Found_15.md](BUG_Found_15.md) | Android + iOS | Major / P2 | Open | v2.3 redesign drops six Cadangan test tags on both platforms; import outcome has no UI surface — worked around via documented text lookups |

## Patterns worth knowing

Three defect families account for most of these, and each one is a **harness-vs-app**
question rather than a plain app bug:

| Family | Bugs | Rule of thumb |
|---|---|---|
| **System-surface automation** (pickers, keyboards, system UI) | 01, 02, 04, 10 | If the target is an OS-owned view, WDIO cannot always drive it. Verify the app behaviour by MCP first, then decide whether it is a harness limit or an app defect. |
| **Platform rendering differences** (Compose → XCUITest flattening, locale order) | 11, 13 | Android's tree shape is not iOS's. Read iOS by **geometry from one page-source dump**, never by nested tree traversal. |
| **Real app defects** | 03, 05, 06 | Root cause lives in the app repo. The harness is only the messenger. |

Bug 12 is the odd one out — not a defect at all, but an environment limitation, which
is why it is filed as **Trivial / P3** rather than being skipped silently.

## Related documents

- `progress.md` — the execution checklist; blocked cases are marked `~[BUG]~` and cite
  the bug number.
- `AGENTS.md` — the protocol these files follow.
- `code_review.md` — the senior QA review; finding **S10** tracks the documentation
  hygiene of this directory.
