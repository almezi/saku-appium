# BUG_Found_03.md — Bug Report

## Identity
- **Reported by:** ZCode automation agent (GLM-5.3, 2.C execution session)
- **Reported at:** 2026-10-25T13:20:00+07:00
- **Branch:** features/phase2
- **Commit:** 33a930d

## Test Context
- **Phase:** 2
- **Sub-phase:** 2.C — Backup & Export
- **Test case ID:** TC-BACKUP-06
- **Spec file:** src/tests/transaksi/backup.spec.ts

## Bug Details
### Title
Committed transaction disappears from Room DB mid-session under the wdio/uiautomator2 harness (2nd occurrence today) — TC-BACKUP-06 blocked on reaching the zero-transaction state

### Description
During scripted runs, a transaction that the app itself acknowledged as
saved disappears from the database minutes later, with no delete action
performed:

- Attempt 4 (13:09–13:12): the before-hook seeds one income (Rp 50.000,
  inc_salary). The app reports "1 transaksi tersimpan" on the Cadangan
  status card at TC-BACKUP-01 and TC-BACKUP-05 (13:11), and the exported
  JSON/CSV at TC-BACKUP-03 contains the row (13:10). At TC-BACKUP-06
  (13:12) the October list shows the empty state and no row action can be
  tapped; `sqlite3` on the pulled DB (+wal/+shm) reads **0 transactions**.
  No delete sheet was ever opened; no app kill/crash appears in the Appium
  log for that window.
- Attempt 2 (19:48–19:52): identical signature — seed saved with toast and
  form reset, DB reads 0 afterwards.
- Counter-evidence: the same save flow driven live via Appium MCP on the
  same emulator/build persists correctly (row verified in the pulled DB,
  sane date, survives session teardown).
- Matches the 2026-10-25 morning incident recorded in progress.md §2.B:
  "the first DB write coincided with the permanent loss of 2
  previously-verified transactions — consistent with un-checkpointed WAL
  loss on hard kill". Twice now under wdio sessions, never under MCP.

The loss happens between the app counting the row and a later read, while
the app process is alive — so either the emulator's storage layer discards
a committed WAL frame, or the app rolls the write back in a code path not
exercised manually. The harness cannot distinguish further from outside.

### Steps to Reproduce
1. `ANDROID_UDID=emulator-5554 npx wdio run ./wdio.conf.ts --spec ./src/tests/transaksi/backup.spec.ts`
2. Observe TC-BACKUP-01/03/05 pass against the seeded transaction (app
   counts it; export contains it).
3. By TC-BACKUP-06 the list is empty; pull the DB and count rows:
   `adb shell run-as id.almezi.simplemoneytracker_kt cat databases/simplemoneytracker.db-wal`
   (+ .db, .shm) → `sqlite3 … 'select count(*) from transactions;'` → 0.

### Actual Result
TC-BACKUP-06 failed 3 consecutive scripted attempts (retry limit reached).
Attempts 2 and 4 show the vanished-seed signature; attempt 3 failed on
cascade from TC-BACKUP-04 (picker left foregrounded).

### Expected Result
The seeded transaction stays in the DB; TC-BACKUP-06 deletes both rows via
the UI and exports a header-only CSV.

### Attachment
- `reports/screenshots/1792933927300-TC_BACKUP_06_exporting_with_zero_transactions_produces_a_valid_empty_file.png`
  (October list already empty at failure time)
- `reports/screenshots/1792932718191-TC_BACKUP_06_….png` (attempt 2, same state)
- `reports/appium.log`

### Severity
Critical

### Priority
P1

## Environment
- **Device/Emulator:** emulator-5554 (Pixel_10 AVD, arm64, API 37)
- **Platform:** Android
- **Appium version:** 3.8.0 (wdio-managed server on :4725), uiautomator2-driver 8.7.0
- **App build:** SimpleMoneyTrackerKT-v2.2.apk
- **Android API level:** 37

## Additional Notes
- App-side investigation: consider aggressive WAL checkpointing
  (`PRAGMA wal_checkpoint(TRUNCATE)` on background/stop) and Room write
  logging to confirm whether the INSERT commits durably.
- Environment suspicion remains (this emulator lost data once this morning
  and was found wedged mid-boot once today); re-test on a fresh emulator
  before app-side changes.
- Affected neighbours: TC-BACKUP-04 fallout (BUG_Found_02.md) left the SAF
  picker foregrounded, which the spec's back-out guard now handles.
