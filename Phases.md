# Phases.md — Test Execution Roadmap

This file breaks test execution into logical phases, matching the Appium MCP workflow.

## Phase 1: Core Flows

- **Tambah Transaksi**: Add income/expense with all fields (amount, category, account, date, note)
- **Transaksi List**: Verify transaction appears in list with correct formatting
- **Ringkasan**: Validate summary cards update correctly
- **Edit/Delete**: Modify and remove transactions with undo verification

---

## Phase 2: Advanced Features

### Phase 2.A — Budget / Anggaran (TC-BUDGET)
- TC-BUDGET-01: Tap `ringkasan_anggaran_button` → budget screen opens
- TC-BUDGET-02: Title "Anggaran", month label "Oktober 2026"
- TC-BUDGET-03: Total card shows "ANGGARAN", amount, "Rp X dari Rp Y", progress bar
- TC-BUDGET-04: Per-category card: name, status "Aman", progress bar, "Rp X dari Rp Y", "Sisa Rp Z"
- TC-BUDGET-05: Per-category "Ubah" / "Hapus" buttons work
- TC-BUDGET-06: Tap "Atur anggaran baru" → new budget flow
- TC-BUDGET-07: Set budget → saved and displayed
- TC-BUDGET-08: Budget progress reflects expense total
- TC-BUDGET-09: Over-budget state shows warning status
- TC-BUDGET-10: Edit/remove budget works
- TC-BUDGET-11: Back button returns to Ringkasan

### Phase 2.B — Category Management (TC-KAT)
- TC-KAT-01: Tap `ringkasan_kelola_button` → `kategori_screen` opens
- TC-KAT-02: Tap `tambah_link_kelola_kategori` → `kategori_screen` opens
- TC-KAT-03: Type toggle switches income/expense category lists
- TC-KAT-04: Income list: 7 default categories (bonus_thr, freelance, gift, investment, other, refund, salary)
- TC-KAT-05: Expense list: default categories (daily_*, education_*, ...)
- TC-KAT-06: Search field filters by name
- TC-KAT-07: Edit (pencil) opens "Ubah kategori" dialog, field placeholder "1–20 karakter"
- TC-KAT-08: Rename category → list row + breakdown + transactions update
- TC-KAT-09: Rename empty/invalid → blocked or "Ubah" disabled
- TC-KAT-10: Cancel edit dialog → no change
- TC-KAT-11: Hide (eye-slash) toggles category visibility
- TC-KAT-12: Hidden category not shown in picker
- TC-KAT-13: Category shows "Bawaan · N transaksi" count
- TC-KAT-14: Category mark color renders
- TC-KAT-15: Back button returns to previous screen

### Phase 2.C — Backup & Export (TC-BACKUP)
- TC-BACKUP-01: Tap `daftar_backup_button` → backup/export UI opens
- TC-BACKUP-02: Export creates file / share sheet opens
- TC-BACKUP-03: Exported file contains current transactions
- TC-BACKUP-04: Import backup restores data (if exists)
- TC-BACKUP-05: Cancel export → no side effects
- TC-BACKUP-06: Export with zero transactions → valid empty file or blocked

---

## Phase 3: Edge Cases

### Phase 3.A — Form Validation (TC-VAL)
- TC-VAL-01: Empty amount + empty category → save disabled
- TC-VAL-02: Amount only → save disabled, helper "Isi jumlah dan kategori dulu"
- TC-VAL-03: Category only → save disabled
- TC-VAL-04: Amount `0` → save disabled (or accepted per rule)
- TC-VAL-05: Negative amount `-5000` → rejected/normalized
- TC-VAL-06: Letters `abc` → rejected (numeric keyboard)
- TC-VAL-07: Symbols `!@#` → rejected
- TC-VAL-08: Scientific `1e9` → rejected or clamped
- TC-VAL-09: Overflow `999999999999999999` → no crash
- TC-VAL-10: Leading zeros `0005000` → parsed as 5000
- TC-VAL-11: Decimal `5000.50` → handled per rule
- TC-VAL-12: Space-only note → saved as empty
- TC-VAL-13: Note max length → no crash
- TC-VAL-14: Emoji note → saved and rendered
- TC-VAL-15: Unicode note → saved correctly
- TC-VAL-16: Rapid double-tap save → only one transaction
- TC-VAL-17: Save with keyboard open → works

### Phase 3.B — Amount Input Behavior (TC-AMT)
- TC-AMT-01: Tap amount → numeric keyboard appears
- TC-AMT-02: Typed digits format live as `Rp X.XXX`
- TC-AMT-03: Backspace to empty → helper state returns
- TC-AMT-04: Clear field → save re-disables
- TC-AMT-05: Thousand separator auto-inserted
- TC-AMT-06: Cursor position stable during formatting
- TC-AMT-07: Max digits limit → no crash

### Phase 3.C — Persistence (TC-PERS)
- TC-PERS-01: Kill app, relaunch → transactions persist
- TC-PERS-02: Relaunch → selected tab resets to Tambah (or persists, verify)
- TC-PERS-03: Relaunch → selected month resets to current
- TC-PERS-04: Force-stop mid-save → no corrupt DB, no crash
- TC-PERS-05: Reinstall → data cleared

### Phase 3.D — Rotation & Config Change (TC-ROT)
- TC-ROT-01: Rotate on Tambah with form filled → values retained or reset (verify)
- TC-ROT-02: Rotate on Transaksi → scroll position retained
- TC-ROT-03: Rotate on Ringkasan → no crash, layout adapts
- TC-ROT-04: Dark mode toggle → all screens readable, contrast OK
- TC-ROT-05: App backgrounded → resumed, no data loss
- TC-ROT-06: Font scale 200% → no clipped text

### Phase 3.E — Accessibility (TC-A11Y)
- TC-A11Y-01: All interactive elements have content-desc or text
- TC-A11Y-02: Save button announces disabled state
- TC-A11Y-03: Tap targets ≥ 48dp
- TC-A11Y-04: Contrast ratio ≥ 4.5:1 for body text
- TC-A11Y-05: TalkBack traversal order logical
- TC-A11Y-06: Icon-only buttons have labels ("Buka pilihan", "Bulan sebelumnya")
- TC-A11Y-07: Amount values readable as currency

### Phase 3.F — Performance (TC-PERF)
- TC-PERF-01: Cold start < 3s
- TC-PERF-02: Tab switch < 500ms
- TC-PERF-03: List scroll 60fps with 100+ items
- TC-PERF-04: Save transaction < 1s
- TC-PERF-05: No memory growth after 50 add/delete cycles

---

Each phase corresponds to a user flow group in `test-cases-simple-money-tracker.md`. The agent executes tests in this order, verifying each phase before proceeding.