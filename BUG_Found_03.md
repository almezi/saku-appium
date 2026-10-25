# BUG_Found_03.md — Bug Report

## Identity
- **Reported by:** ZCode automation agent (GLM-5.3, 2.C execution session)
- **Reported at:** 2026-10-25T13:20:00+07:00
- **Root cause CONFIRMED by experiment:** 2026-10-25T22:35+07:00
- **Branch:** features/phase2
- **Commit:** 33a930d (at time of the failing runs)

## Test Context
- **Phase:** 2
- **Sub-phase:** 2.C — Backup & Export
- **Test case ID:** TC-BACKUP-06
- **Spec file:** src/tests/transaksi/backup.spec.ts

## Bug Details
### Title
Un-checkpointed WAL invalidation silently discards committed transactions — no crash, no log; fix belongs in app code (journal mode / checkpoint policy)

### Description
**Root cause confirmed by a controlled experiment (2026-10-25 evening, same
emulator/build).** The app runs SQLite in WAL mode, and during active use
essentially all data lives in the un-checkpointed `-wal` file: observed
`simplemoneytracker.db` at 4096 bytes (schema only, untouched for hours)
while `-wal` was 210–234 KB holding every transaction. If the WAL becomes
invalid, SQLite **silently discards it on the next open** — every
un-checkpointed transaction disappears, the app keeps working normally, and
nothing appears in logcat.

Experiment (all on emulator-5554, app v2.2):

1. `pm clear` → fresh launch → UI-save one transaction (Rp 99.999, Gaji) →
   DB pulled via `run-as cat`: main file 4096 B / 0 rows, WAL 210 KB — the
   row lived **only** in the WAL.
2. `am crash` (hard process death with the hot WAL) → relaunch → **both
   rows survived**; WAL checkpointed to 0 bytes on the clean reopen.
   → Process death is NOT the loss mechanism; committed rows survive it.
3. WAL invalidated (header overwritten with garbage while the process was
   dead) → relaunch → **the bug signature reproduced exactly**: app opens
   normally (no crash dialog, no error), `transactions = 0`, `categories =
   36`, logcat silent (zero SQLite/corruption lines), and the WAL file was
   quietly rewritten at launch.

This matches both real incidents byte-for-byte: the 2.B morning loss (after
an emulator hard power-cut) and the 2.C afternoon loss (after the emulator
was found wedged mid-boot) — in both, categories survived (checkpointed
earlier) while recently written transactions vanished, with no crash and no
log. The trigger is **emulator storage distress invalidating the WAL** (this
AVD has form: wedged mid-boot once, server death mid-session once); the
**silent data destruction on trigger is an app-side robustness gap**.

Ruled out by the experiment: process death (rows survive `am crash` with a
hot WAL); the wdio harness (the loss reproduced purely with adb + files);
UI-level causes (no interaction needed).

### Steps to Reproduce
1. Fresh app data; save one transaction through the UI.
2. Verify the row lives only in the WAL: `run-as … cat databases/simplemoneytracker.db`
   pulled locally reads 0 rows while `-wal` is ~200 KB.
3. `am crash id.almezi.simplemoneytracker_kt` (hard death, WAL stays hot).
4. Overwrite the first bytes of `databases/simplemoneytracker.db-wal` with
   garbage (simulating a torn/corrupt WAL write under storage distress).
5. Relaunch the app: it opens normally; the transaction is gone; no log,
   no crash, no UI anomaly.

### Actual Result
TC-BACKUP-06 failed 3 consecutive scripted attempts; the seeded, app-
acknowledged transaction vanished from the DB between two reads minutes
apart (2 occurrences on 2026-10-25, matching the 2.B morning incident).

### Expected Result
A committed transaction must survive any single-file corruption event, or
at minimum the loss must be loud (error surfaced to the user), not silent.

### Attachment
- `reports/bug03-logcat-experiment.txt` (full logcat of the experiment session; local — `reports/` is gitignored, reproduced via the Steps above)
- `reports/screenshots/1792933927300-TC_BACKUP_06_….png` (empty state at failure)

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

## Additional Notes — fix classification (app code, not automation)
The trigger is environmental (emulator disk distress), but the *silent
destruction of committed data on trigger* is fixable only in the app repo
(this workspace holds the test harness only). Recommended, in order:

1. **`Room.databaseBuilder(…).setJournalMode(JournalMode.TRUNCATE)`** — one
   line. Every commit lands in the main DB file; there is no hot-WAL window
   to invalidate. For a single-user local tracker the write throughput cost
   is irrelevant. This alone would have prevented both incidents.
2. Alternatively (keeping WAL): checkpoint on background — a
   `DefaultLifecycleObserver` running `PRAGMA wal_checkpoint(TRUNCATE)` in
   `onStop` shrinks the hot-WAL window to the foreground session.
3. **Custom `DatabaseErrorHandler`** that copies a corrupt DB aside before
   recovery (forensics) and surfaces the event (log at minimum; ideally a
   user-facing notice) instead of a silent discard.
4. Harness (this repo): no fix possible — the suite already detects the
   loss (TC-BACKUP-06's empty-state assertion). Optional tripwire: assert
   the seeded row right after `createTransaction` in backup.spec so a loss
   surfaces at the seed step instead of two tests later.

Environment note: this AVD showed storage distress twice on 2026-10-25
(wedged mid-boot; `settings` service missing until a cold reboot). After
applying fix 1, re-run the 2.C spec on a **freshly created** AVD before
concluding anything else is wrong.
