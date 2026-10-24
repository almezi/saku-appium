# Progress.md — Test Execution Checklist

Track completion of every test task from `Phases.md`. Check `[x]` when a test case passes. Each agent should update only the sub-phases they own.

## Quick Summary

| Phase | Sub-phases | Total Tasks | Completed | Remaining |
|-------|-----------|-------------|-----------|-----------|
| Phase 1 — Core Flows | 8 (1.A–1.H) | 67 | 17 | 50 |
| Phase 2 — Advanced Features | 3 (2.A–2.C) | 32 | 0 | 32 |
| Phase 3 — Edge Cases | 6 (3.A–3.F) | 47 | 0 | 47 |
| **All** | **17** | **146** | **17** | **129** |

---

## Phase 1 — Core Flows

### 1.A — Smoke & Navigation (TC-NAV) — 8 tasks

- [x] TC-NAV-01: App launches, `tambah_screen` visible
- [x] TC-NAV-02: Tambah tab → `tambah_screen` present
- [x] TC-NAV-03: Transaksi tab → `daftar_screen` present
- [x] TC-NAV-04: Ringkasan tab → `ringkasan_screen` present
- [x] TC-NAV-05: Round-trip all tabs, no crash
- [x] TC-NAV-06: Back button on each tab, no crash
- [x] TC-NAV-07: Selected tab state persists on re-tap
- [x] TC-NAV-08: 20 rapid tab switches, no ANR

**Spec:** `src/tests/navigasi/navigation.spec.ts` | **Agent:** ZCode (GLM-5.3) — 8/8 passing 2026-10-24

### 1.B — Add Income (TC-INC) — 9 tasks

- [x] TC-INC-01: Income + amount + category → save enabled → save succeeds
- [x] TC-INC-02: Saved income appears in Transaksi same day
- [x] TC-INC-03: `daftar_summary_masuk` increments
- [x] TC-INC-04: Ringkasan income card + balance update
- [x] TC-INC-05: Income with note → note persisted (verify on edit reopen)
- [x] TC-INC-06: Income on non-default account recorded correctly
- [x] TC-INC-07: Multiple incomes same day → day total = sum
- [x] TC-INC-08: Form resets after save (amount 0, category placeholder, note empty)
- [x] TC-INC-09: Save returns to Tambah / confirmation shown

**Spec:** `src/tests/tambah/add-income.spec.ts` | **Agent:** ZCode (GLM-5.3) — 9/9 passing 2026-10-24

### 1.C — Add Expense (TC-EXP) — 8 tasks

- [ ] TC-EXP-01: Expense + amount + category → save succeeds
- [ ] TC-EXP-02: Expense appears in list, day total shows `−Rp`
- [ ] TC-EXP-03: `daftar_summary_keluar` increments
- [ ] TC-EXP-04: Ringkasan balance decrements
- [ ] TC-EXP-05: Expense breakdown category shows 100% for single item
- [ ] TC-EXP-06: Expense on default account Tunai
- [ ] TC-EXP-07: Mixed income+expense same day → day total = net
- [ ] TC-EXP-08: Expense > balance → balance negative `−Rp`

**Spec:** `src/tests/tambah/add-expense.spec.ts` | **Agent:** ___________

### 1.D — Transaction List (TC-LIST) — 11 tasks

- [ ] TC-LIST-01: Empty month → empty state / zero summaries
- [ ] TC-LIST-02: Day header shows weekday + date + net total
- [ ] TC-LIST-03: Items grouped under correct day header
- [ ] TC-LIST-04: Items sorted newest first
- [ ] TC-LIST-05: Row shows category, type label, formatted amount
- [ ] TC-LIST-06: Income row no minus; day total `−Rp` for expenses
- [ ] TC-LIST-07: Long category name truncates/wraps, no overlap
- [ ] TC-LIST-08: Scroll 100+ items, no crash
- [ ] TC-LIST-09: `daftar_summary_masuk` = sum income in month
- [ ] TC-LIST-10: `daftar_summary_keluar` = sum expense in month
- [ ] TC-LIST-11: Pull-to-refresh → data still correct

**Spec:** `src/tests/transaksi/transaction-list.spec.ts` | **Agent:** ___________


### 1.E — Summary / Ringkasan (TC-SUM) — 13 tasks

- [ ] TC-SUM-01: `ringkasan_balance_value` = income − expense (verified `−Rp 21.758`)
- [ ] TC-SUM-02: Income card == `daftar_summary_masuk`
- [ ] TC-SUM-03: Expense card == `daftar_summary_keluar`
- [ ] TC-SUM-04: Savings rate formula (verified `−671,1%`)
- [ ] TC-SUM-05: Savings rate = 0% when income 0 (no divide-by-zero)
- [ ] TC-SUM-06: Comparison amounts match cards
- [ ] TC-SUM-07: Income breakdown percentages sum 100%
- [ ] TC-SUM-08: Expense breakdown percentages sum 100%
- [ ] TC-SUM-09: Breakdown bar width proportional
- [ ] TC-SUM-10: Empty month → all zeros, no NaN/Infinity
- [ ] TC-SUM-11: Large values format with separators, no clipping
- [ ] TC-SUM-12: Negative balance renders `−Rp` not `Rp -`
- [ ] TC-SUM-13: Scroll to bottom → all sections render

**Spec:** `src/tests/ringkasan/summary.spec.ts` | **Agent:** ___________

### 1.F — Edit Transaction (TC-EDIT) — 8 tasks

- [ ] TC-EDIT-01: Tap `Ubah` → form opens prefilled
- [ ] TC-EDIT-02: Change amount → save → row updates
- [ ] TC-EDIT-03: Change category → breakdown recalculates
- [ ] TC-EDIT-04: Change type income→expense → summaries swap
- [ ] TC-EDIT-05: Change date → item moves to new month
- [ ] TC-EDIT-06: Edit note only → amount/category intact
- [ ] TC-EDIT-07: Cancel edit → no data change
- [ ] TC-EDIT-08: Edit to invalid state (amount 0) → save blocked

**Spec:** `src/tests/transaksi/edit-transaction.spec.ts` | **Agent:** ___________

### 1.G — Delete Transaction (TC-DEL) — 7 tasks

- [ ] TC-DEL-01: Tap `Hapus` → confirmation dialog
- [ ] TC-DEL-02: Confirm → row removed, summaries decrease
- [ ] TC-DEL-03: Cancel → row remains
- [ ] TC-DEL-04: Delete last item of month → empty state
- [ ] TC-DEL-05: Delete updates Ringkasan balance/cards
- [ ] TC-DEL-06: Delete removes stale breakdown entry
- [ ] TC-DEL-07: Rapid delete two items → both removed

**Spec:** `src/tests/transaksi/delete-undo.spec.ts` | **Agent:** ___________

### 1.H — Undo Delete (TC-UNDO) — 3 tasks

- [ ] TC-UNDO-01: Delete transaction → toast with "Urungkan" action appears
- [ ] TC-UNDO-02: Tap "Urungkan" before timeout → transaction restored, summary & list updated
- [ ] TC-UNDO-03: Let toast expire without tap → deletion becomes permanent

**Spec:** `src/tests/transaksi/delete-undo.spec.ts` | **Agent:** ___________

---

## Phase 2 — Advanced Features

### 2.A — Budget / Anggaran (TC-BUDGET) — 11 tasks

- [ ] TC-BUDGET-01: Tap `ringkasan_anggaran_button` → budget screen opens
- [ ] TC-BUDGET-02: Title "Anggaran", month label "Oktober 2026"
- [ ] TC-BUDGET-03: Total card shows "ANGGARAN", amount, "Rp X dari Rp Y", progress bar
- [ ] TC-BUDGET-04: Per-category card: name, status "Aman", progress bar, "Rp X dari Rp Y", "Sisa Rp Z"
- [ ] TC-BUDGET-05: Per-category "Ubah" / "Hapus" buttons work
- [ ] TC-BUDGET-06: Tap "Atur anggaran baru" → new budget flow
- [ ] TC-BUDGET-07: Set budget → saved and displayed
- [ ] TC-BUDGET-08: Budget progress reflects expense total
- [ ] TC-BUDGET-09: Over-budget state shows warning status
- [ ] TC-BUDGET-10: Edit/remove budget works
- [ ] TC-BUDGET-11: Back button returns to Ringkasan

**Spec:** `src/tests/anggaran/budget.spec.ts` *(written, not yet executed)* | **Agent:** ___________

### 2.B — Category Management (TC-KAT) — 15 tasks

- [ ] TC-KAT-01: Tap `ringkasan_kelola_button` → `kategori_screen` opens
- [ ] TC-KAT-02: Tap `tambah_link_kelola_kategori` → `kategori_screen` opens
- [ ] TC-KAT-03: Type toggle switches income/expense category lists
- [ ] TC-KAT-04: Income list: 7 default categories (bonus_thr, freelance, gift, investment, other, refund, salary)
- [ ] TC-KAT-05: Expense list: default categories (daily_*, education_*, ...)
- [ ] TC-KAT-06: Search field filters by name
- [ ] TC-KAT-07: Edit (pencil) opens "Ubah kategori" dialog, field placeholder "1–20 karakter"
- [ ] TC-KAT-08: Rename category → list row + breakdown + transactions update
- [ ] TC-KAT-09: Rename empty/invalid → blocked or "Ubah" disabled
- [ ] TC-KAT-10: Cancel edit dialog → no change
- [ ] TC-KAT-11: Hide (eye-slash) toggles category visibility
- [ ] TC-KAT-12: Hidden category not shown in picker
- [ ] TC-KAT-13: Category shows "Bawaan · N transaksi" count
- [ ] TC-KAT-14: Category mark color renders
- [ ] TC-KAT-15: Back button returns to previous screen

**Spec:** `src/tests/kategori/category-management.spec.ts` *(written, not yet executed)* | **Agent:** ___________

### 2.C — Backup & Export (TC-BACKUP) — 6 tasks

- [ ] TC-BACKUP-01: Tap `daftar_backup_button` → backup/export UI opens
- [ ] TC-BACKUP-02: Export creates file / share sheet opens
- [ ] TC-BACKUP-03: Exported file contains current transactions
- [ ] TC-BACKUP-04: Import backup restores data (if exists)
- [ ] TC-BACKUP-05: Cancel export → no side effects
- [ ] TC-BACKUP-06: Export with zero transactions → valid empty file or blocked

**Spec:** *planned: `src/tests/transaksi/backup.spec.ts`* | **Agent:** ___________


---

## Phase 3 — Edge Cases

### 3.A — Form Validation (TC-VAL) — 17 tasks

- [ ] TC-VAL-01: Empty amount + empty category → save disabled
- [ ] TC-VAL-02: Amount only → save disabled, helper "Isi jumlah dan kategori dulu"
- [ ] TC-VAL-03: Category only → save disabled
- [ ] TC-VAL-04: Amount `0` → save disabled (or accepted per rule)
- [ ] TC-VAL-05: Negative amount `-5000` → rejected/normalized
- [ ] TC-VAL-06: Letters `abc` → rejected (numeric keyboard)
- [ ] TC-VAL-07: Symbols `!@#` → rejected
- [ ] TC-VAL-08: Scientific `1e9` → rejected or clamped
- [ ] TC-VAL-09: Overflow `999999999999999999` → no crash
- [ ] TC-VAL-10: Leading zeros `0005000` → parsed as 5000
- [ ] TC-VAL-11: Decimal `5000.50` → handled per rule
- [ ] TC-VAL-12: Space-only note → saved as empty
- [ ] TC-VAL-13: Note max length → no crash
- [ ] TC-VAL-14: Emoji note → saved and rendered
- [ ] TC-VAL-15: Unicode note → saved correctly
- [ ] TC-VAL-16: Rapid double-tap save → only one transaction
- [ ] TC-VAL-17: Save with keyboard open → works

**Spec:** *planned: `src/tests/tambah/form-validation.spec.ts`* | **Agent:** ___________

### 3.B — Amount Input Behavior (TC-AMT) — 7 tasks

- [ ] TC-AMT-01: Tap amount → numeric keyboard appears
- [ ] TC-AMT-02: Typed digits format live as `Rp X.XXX`
- [ ] TC-AMT-03: Backspace to empty → helper state returns
- [ ] TC-AMT-04: Clear field → save re-disables
- [ ] TC-AMT-05: Thousand separator auto-inserted
- [ ] TC-AMT-06: Cursor position stable during formatting
- [ ] TC-AMT-07: Max digits limit → no crash

**Spec:** *planned: `src/tests/tambah/amount-input.spec.ts`* | **Agent:** ___________

### 3.C — Persistence (TC-PERS) — 5 tasks

- [ ] TC-PERS-01: Kill app, relaunch → transactions persist
- [ ] TC-PERS-02: Relaunch → selected tab resets to Tambah (or persists, verify)
- [ ] TC-PERS-03: Relaunch → selected month resets to current
- [ ] TC-PERS-04: Force-stop mid-save → no corrupt DB, no crash
- [ ] TC-PERS-05: Reinstall → data cleared

**Spec:** *planned: `src/tests/app/persistence.spec.ts`* | **Agent:** ___________

### 3.D — Rotation & Config Change (TC-ROT) — 6 tasks

- [ ] TC-ROT-01: Rotate on Tambah with form filled → values retained or reset (verify)
- [ ] TC-ROT-02: Rotate on Transaksi → scroll position retained
- [ ] TC-ROT-03: Rotate on Ringkasan → no crash, layout adapts
- [ ] TC-ROT-04: Dark mode toggle → all screens readable, contrast OK
- [ ] TC-ROT-05: App backgrounded → resumed, no data loss
- [ ] TC-ROT-06: Font scale 200% → no clipped text

**Spec:** *planned: `src/tests/app/rotation-config.spec.ts`* | **Agent:** ___________

### 3.E — Accessibility (TC-A11Y) — 7 tasks

- [ ] TC-A11Y-01: All interactive elements have content-desc or text
- [ ] TC-A11Y-02: Save button announces disabled state
- [ ] TC-A11Y-03: Tap targets ≥ 48dp
- [ ] TC-A11Y-04: Contrast ratio ≥ 4.5:1 for body text
- [ ] TC-A11Y-05: TalkBack traversal order logical
- [ ] TC-A11Y-06: Icon-only buttons have labels ("Buka pilihan", "Bulan sebelumnya")
- [ ] TC-A11Y-07: Amount values readable as currency

**Spec:** *planned: `src/tests/app/accessibility.spec.ts`* | **Agent:** ___________

### 3.F — Performance (TC-PERF) — 5 tasks

- [ ] TC-PERF-01: Cold start < 3s
- [ ] TC-PERF-02: Tab switch < 500ms
- [ ] TC-PERF-03: List scroll 60fps with 100+ items
- [ ] TC-PERF-04: Save transaction < 1s
- [ ] TC-PERF-05: No memory growth after 50 add/delete cycles

**Spec:** *planned: `src/tests/app/performance.spec.ts`* | **Agent:** ___________

---

## How to Use

1. **Claim ownership**: Write your agent name (or your name) in the `Agent:` field for each sub-phase you will run.
2. **Mark complete**: Change `- [ ]` to `- [x]` when a test case passes.
3. **Update summary**: Edit the "Completed" and "Remaining" counts in the Quick Summary table as you progress.
4. **One spec per sub-phase**: Each sub-phase maps to one WebdriverIO spec file (see the "Spec" line). Specs are organized by screen, not by phase:
   ```bash
   npx wdio run ./wdio.conf.ts --spec ./src/tests/tambah/<name>.spec.ts
   ```
   Folder map: `navigasi/` (TC-NAV), `tambah/` (TC-INC, TC-EXP, TC-VAL, TC-AMT), `transaksi/` (TC-LIST, TC-EDIT, TC-DEL, TC-UNDO, TC-BACKUP), `ringkasan/` (TC-SUM), `anggaran/` (TC-BUDGET), `kategori/` (TC-KAT), `app/` (cross-cutting TC-PERS, TC-ROT, TC-A11Y, TC-PERF). There are npm shortcuts per folder, e.g. `npm run test:tambah`.
5. **Missing specs**: Create new spec files in the screen folder listed on the sub-phase's "Spec" line, following the same Page Object pattern as the existing specs.

