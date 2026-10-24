# Simple Money Tracker — E2E Test Cases

App: `id.almezi.simplemoneytracker_kt` | Platform: Android (UiAutomator2) | Date: 2026-10-23

## Screens & locator map

### Navigation (bottom bar)
| Element | resource-id / strategy |
|---|---|
| Tambah tab | `component_nav_bottom_tambah` |
| Transaksi tab | `component_nav_bottom_daftar` |
| Ringkasan tab | `component_nav_bottom_ringkasan` |

### Tambah (Add Transaction) — `tambah_screen`
| Element | resource-id |
|---|---|
| Type toggle container | `tambah_toggle_type` |
| Income (Pemasukan) | `tambah_toggle_type_0` |
| Expense (Pengeluaran) | `tambah_toggle_type_1` |
| Amount input | `tambah_input_amount` (EditText child) |
| Manage category link | `tambah_link_kelola_kategori` |
| Category picker | `tambah_category_pager` ("Pilih Kategori") |
| Account picker | `tambah_select_account` (default "Tunai") |
| Date picker | `tambah_select_date` (default "23 Okt 2026") |
| Note input | `tambah_input_note` (EditText) |
| Helper text | `tambah_helper` ("Isi jumlah dan kategori dulu") |
| Save button | `tambah_button_save` (disabled until amount+category) |

### Transaksi (List) — `daftar_screen`
| Element | resource-id |
|---|---|
| Month switcher container | `daftar_month_switcher` |
| Prev month | `daftar_month_switcher_prev` |
| Month label | `daftar_month_switcher_label` ("OKTOBER 2026") |
| Next month | `daftar_month_switcher_next` (disabled on current month) |
| Income summary | `daftar_summary_masuk` |
| Expense summary | `daftar_summary_keluar` |
| Backup/export | `daftar_backup_button` |
| Day header | `daftar_day_header_{ts}` |
| Item row | `daftar_item_{n}` |
| Item edit | `daftar_item_{n}_edit_{cat}` |
| Item delete | `daftar_item_{n}_delete_{cat}` |

### Ringkasan (Summary) — `ringkasan_screen`
| Element | resource-id |
|---|---|
| Month switcher | `ringkasan_month_switcher` (+ prev/label/next) |
| Balance card | `ringkasan_balance_card` |
| Balance value | `ringkasan_balance_value` |
| Income card | `ringkasan_totals_card_income` |
| Expense card | `ringkasan_totals_card_expense` |
| Savings row | `ringkasan_savings_row` |
| Savings rate | `ringkasan_savings_value` (e.g. "−671,1%") |
| Budget button | `ringkasan_anggaran_button` |
| Manage category | `ringkasan_kelola_button` |
| Comparison | `ringkasan_comparison` |
| Income breakdown | `ringkasan_breakdown_income` |
| Expense breakdown | `ringkasan_breakdown_expense` |
| Category item | `ringkasan_category_item_{type}_{slug}` |

### Kelola Kategori — `kategori_screen`
| Element | resource-id / strategy |
|---|---|
| Back button | `component_button_back` (content-desc "Kembali") |
| Type toggle | `kategori_toggle_type` (+ `_0` income, `_1` expense) |
| Search field | `component_field_search` (EditText) |
| Row | `kategori_row_{type}_{slug}` |
| Mark | `mark_{type}_{slug}` |
| Edit | `kategori_row_edit_{type}_{slug}` (content-desc "Ubah kategori") |
| Hide | `kategori_row_hide_{type}_{slug}` (content-desc "Sembunyikan kategori") |
| Edit dialog | text "Ubah kategori", field placeholder "1–20 karakter", buttons "Batal"/"Ubah" |

Income categories (default): `inc_bonus_thr`, `inc_freelance`, `inc_gift`, `inc_investment`, `inc_other`, `inc_refund`, `inc_salary`.
Expense categories (default): `exp_daily_food`, `exp_daily_groceries`, `exp_daily_household`, `exp_daily_other`, `exp_education_books`, `exp_education_course`, `exp_education_other`, + more (scrollable).

### Anggaran (Budget) — no resource-ids (Compose)
Locate by text/content-desc only:
- Title "Anggaran", month label "Oktober 2026"
- Total card: "ANGGARAN", "Rp 25.000", "Rp 25.000 dari Rp 5.000.000", progress bar
- Per-category card: category name, status "Aman", progress bar, "Rp X dari Rp Y", "Sisa Rp Z", buttons "Ubah"/"Hapus"
- Button "Atur anggaran baru"

---

## Test cases

### A. Smoke & navigation (TC-NAV)
- TC-NAV-01 App launches, `tambah_screen` visible
- TC-NAV-02 Tambah tab → `tambah_screen` present
- TC-NAV-03 Transaksi tab → `daftar_screen` present
- TC-NAV-04 Ringkasan tab → `ringkasan_screen` present
- TC-NAV-05 Round-trip all tabs, no crash
- TC-NAV-06 Back button on each tab, no crash
- TC-NAV-07 Selected tab state persists on re-tap
- TC-NAV-08 20 rapid tab switches, no ANR

### B. Add income (TC-INC)
- TC-INC-01 Income + amount + category → save enabled → save succeeds
- TC-INC-02 Saved income appears in Transaksi same day
- TC-INC-03 `daftar_summary_masuk` increments
- TC-INC-04 Ringkasan income card + balance update
- TC-INC-05 Income with note → note persisted (verify on edit reopen)
- TC-INC-06 Income on non-default account recorded correctly
- TC-INC-07 Multiple incomes same day → day total = sum
- TC-INC-08 Form resets after save (amount 0, category placeholder, note empty)
- TC-INC-09 Save returns to Tambah / confirmation shown

### C. Add expense (TC-EXP)
- TC-EXP-01 Expense + amount + category → save succeeds
- TC-EXP-02 Expense appears in list, day total shows `−Rp`
- TC-EXP-03 `daftar_summary_keluar` increments
- TC-EXP-04 Ringkasan balance decrements
- TC-EXP-05 Expense breakdown category shows 100% for single item
- TC-EXP-06 Expense on default account Tunai
- TC-EXP-07 Mixed income+expense same day → day total = net
- TC-EXP-08 Expense > balance → balance negative `−Rp`

### D. Form validation (TC-VAL)
- TC-VAL-01 Empty amount + empty category → save disabled
- TC-VAL-02 Amount only → save disabled, helper "Isi jumlah dan kategori dulu"
- TC-VAL-03 Category only → save disabled
- TC-VAL-04 Amount `0` → save disabled (or accepted per rule)
- TC-VAL-05 Negative amount `-5000` → rejected/normalized
- TC-VAL-06 Letters `abc` → rejected (numeric keyboard)
- TC-VAL-07 Symbols `!@#` → rejected
- TC-VAL-08 Scientific `1e9` → rejected or clamped
- TC-VAL-09 Overflow `999999999999999999` → no crash
- TC-VAL-10 Leading zeros `0005000` → parsed as 5000
- TC-VAL-11 Decimal `5000.50` → handled per rule
- TC-VAL-12 Space-only note → saved as empty
- TC-VAL-13 Note max length → no crash
- TC-VAL-14 Emoji note → saved and rendered
- TC-VAL-15 Unicode note → saved correctly
- TC-VAL-16 Rapid double-tap save → only one transaction
- TC-VAL-17 Save with keyboard open → works

### E. Amount input behavior (TC-AMT)
- TC-AMT-01 Tap amount → numeric keyboard appears
- TC-AMT-02 Typed digits format live as `Rp X.XXX`
- TC-AMT-03 Backspace to empty → helper state returns
- TC-AMT-04 Clear field → save re-disables
- TC-AMT-05 Thousand separator auto-inserted
- TC-AMT-06 Cursor position stable during formatting
- TC-AMT-07 Max digits limit → no crash

### F. Category selection (TC-CAT)
- TC-CAT-01 Tap `tambah_category_pager` → picker opens
- TC-CAT-02 Picker lists categories filtered by type
- TC-CAT-03 Switch type after selecting category → resets or stays valid
- TC-CAT-04 Select category → label replaces "Pilih Kategori"
- TC-CAT-05 Dismiss picker → state unchanged
- TC-CAT-06 `tambah_link_kelola_kategori` opens `kategori_screen`
- TC-CAT-07 Selected category shown in saved list row
- TC-CAT-08 Category avatar initials render

### G. Account selection (TC-ACC)
- TC-ACC-01 Tap `tambah_select_account` → picker opens
- TC-ACC-02 Default account = Tunai
- TC-ACC-03 Switch account → label updates
- TC-ACC-04 Dismiss without select → unchanged
- TC-ACC-05 Account persisted in saved transaction

### H. Date picker (TC-DATE)
- TC-DATE-01 Tap `tambah_select_date` → date dialog opens
- TC-DATE-02 Default date = today
- TC-DATE-03 Pick past date → lands in that month's list
- TC-DATE-04 Pick future date → allowed or blocked per rule
- TC-DATE-05 Cancel date dialog → date unchanged
- TC-DATE-06 Leap day 29 Feb 2028 accepted
- TC-DATE-07 Date label locale format `d MMM yyyy`
- TC-DATE-08 Backdated transaction shows in correct month summary

### I. Save button state machine (TC-SAVE)
- TC-SAVE-01 Initial state disabled (verified `enabled="false"`)
- TC-SAVE-02 Enabled only when amount > 0 AND category selected
- TC-SAVE-03 Disable when amount cleared
- TC-SAVE-04 Disable when category cleared
- TC-SAVE-05 Enabled state visual contrast differs (a11y)
- TC-SAVE-06 Tap disabled button → no action, no crash

### J. Transaction list (TC-LIST)
- TC-LIST-01 Empty month → empty state / zero summaries
- TC-LIST-02 Day header shows weekday + date + net total
- TC-LIST-03 Items grouped under correct day header
- TC-LIST-04 Items sorted newest first
- TC-LIST-05 Row shows category, type label, formatted amount
- TC-LIST-06 Income row no minus; day total `−Rp` for expenses
- TC-LIST-07 Long category name truncates/wraps, no overlap
- TC-LIST-08 Scroll 100+ items, no crash
- TC-LIST-09 `daftar_summary_masuk` = sum income in month
- TC-LIST-10 `daftar_summary_keluar` = sum expense in month
- TC-LIST-11 Pull-to-refresh → data still correct

### K. Edit transaction (TC-EDIT)
- TC-EDIT-01 Tap `Ubah` → form opens prefilled
- TC-EDIT-02 Change amount → save → row updates
- TC-EDIT-03 Change category → breakdown recalculates
- TC-EDIT-04 Change type income→expense → summaries swap
- TC-EDIT-05 Change date → item moves to new month
- TC-EDIT-06 Edit note only → amount/category intact
- TC-EDIT-07 Cancel edit → no data change
- TC-EDIT-08 Edit to invalid state (amount 0) → save blocked

### L. Delete transaction (TC-DEL)
- TC-DEL-01 Tap `Hapus` → confirmation dialog
- TC-DEL-02 Confirm → row removed, summaries decrease
- TC-DEL-03 Cancel → row remains
- TC-DEL-04 Delete last item of month → empty state
- TC-DEL-05 Delete updates Ringkasan balance/cards
- TC-DEL-06 Delete removes stale breakdown entry
- TC-DEL-07 Rapid delete two items → both removed

### M. Month switcher (TC-MON)
- TC-MON-01 Prev decrements month label (Transaksi)
- TC-MON-02 Next increments month
- TC-MON-03 Next disabled on current month
- TC-MON-04 Prev far back → no crash, empty list
- TC-MON-05 Label format uppercase locale
- TC-MON-06 Transaksi vs Ringkasan switchers independent or synced (verify intent)
- TC-MON-07 Switch month with items → correct data set loads
- TC-MON-08 Switch back to current month → original data restored
- TC-MON-09 Year boundary Dec→Jan label correct

### N. Summary / Ringkasan (TC-SUM)
- TC-SUM-01 `ringkasan_balance_value` = income − expense (verified `−Rp 21.758`)
- TC-SUM-02 Income card == `daftar_summary_masuk`
- TC-SUM-03 Expense card == `daftar_summary_keluar`
- TC-SUM-04 Savings rate formula (verified `−671,1%`)
- TC-SUM-05 Savings rate = 0% when income 0 (no divide-by-zero)
- TC-SUM-06 Comparison amounts match cards
- TC-SUM-07 Income breakdown percentages sum 100%
- TC-SUM-08 Expense breakdown percentages sum 100%
- TC-SUM-09 Breakdown bar width proportional
- TC-SUM-10 Empty month → all zeros, no NaN/Infinity
- TC-SUM-11 Large values format with separators, no clipping
- TC-SUM-12 Negative balance renders `−Rp` not `Rp -`
- TC-SUM-13 Scroll to bottom → all sections render

### O. Cross-screen consistency (TC-CONS)
- TC-CONS-01 Add → Transaksi + Ringkasan update without manual refresh
- TC-CONS-02 Edit → all three screens consistent
- TC-CONS-03 Delete → all three screens consistent
- TC-CONS-04 Month switch on one screen vs other (verify intent)
- TC-CONS-05 Totals on Transaksi == totals on Ringkasan same month

### P. Backup & export (TC-BACKUP)
- TC-BACKUP-01 Tap `daftar_backup_button` → backup/export UI
- TC-BACKUP-02 Export creates file / share sheet opens
- TC-BACKUP-03 Exported file contains current transactions
- TC-BACKUP-04 Import backup restores data (if exists)
- TC-BACKUP-05 Cancel export → no side effects
- TC-BACKUP-06 Export with zero transactions → valid empty file or blocked

### Q. Budget / Anggaran (TC-BUDGET)
- TC-BUDGET-01 Tap `ringkasan_anggaran_button` → budget screen opens
- TC-BUDGET-02 Title "Anggaran", month label "Oktober 2026"
- TC-BUDGET-03 Total card shows "ANGGARAN", amount, "Rp X dari Rp Y", progress bar
- TC-BUDGET-04 Per-category card: name, status "Aman", progress bar, "Rp X dari Rp Y", "Sisa Rp Z"
- TC-BUDGET-05 Per-category "Ubah" / "Hapus" buttons work
- TC-BUDGET-06 Tap "Atur anggaran baru" → new budget flow
- TC-BUDGET-07 Set budget → saved and displayed
- TC-BUDGET-08 Budget progress reflects expense total
- TC-BUDGET-09 Over-budget state shows warning status
- TC-BUDGET-10 Edit/remove budget works
- TC-BUDGET-11 Back button returns to Ringkasan

### R. Category management (TC-KAT)
- TC-KAT-01 Tap `ringkasan_kelola_button` → `kategori_screen` opens
- TC-KAT-02 Tap `tambah_link_kelola_kategori` → `kategori_screen` opens
- TC-KAT-03 Type toggle switches income/expense category lists
- TC-KAT-04 Income list: 7 default categories (bonus_thr, freelance, gift, investment, other, refund, salary)
- TC-KAT-05 Expense list: default categories (daily_*, education_*, ...)
- TC-KAT-06 Search field filters by name
- TC-KAT-07 Edit (pencil) opens "Ubah kategori" dialog, field placeholder "1–20 karakter"
- TC-KAT-08 Rename category → list row + breakdown + transactions update
- TC-KAT-09 Rename empty/invalid → blocked or "Ubah" disabled
- TC-KAT-10 Cancel edit dialog → no change
- TC-KAT-11 Hide (eye-slash) toggles category visibility
- TC-KAT-12 Hidden category not shown in picker
- TC-KAT-13 Category shows "Bawaan · N transaksi" count
- TC-KAT-14 Category mark color renders
- TC-KAT-15 Back button returns to previous screen

### S. Persistence (TC-PERS)
- TC-PERS-01 Kill app, relaunch → transactions persist
- TC-PERS-02 Relaunch → selected tab resets to Tambah (or persists, verify)
- TC-PERS-03 Relaunch → selected month resets to current
- TC-PERS-04 Force-stop mid-save → no corrupt DB, no crash
- TC-PERS-05 Reinstall → data cleared

### T. Rotation & config change (TC-ROT)
- TC-ROT-01 Rotate on Tambah with form filled → values retained or reset (verify)
- TC-ROT-02 Rotate on Transaksi → scroll position retained
- TC-ROT-03 Rotate on Ringkasan → no crash, layout adapts
- TC-ROT-04 Dark mode toggle → all screens readable, contrast OK
- TC-ROT-05 App backgrounded → resumed, no data loss
- TC-ROT-06 Font scale 200% → no clipped text

### U. Accessibility (TC-A11Y)
- TC-A11Y-01 All interactive elements have content-desc or text
- TC-A11Y-02 Save button announces disabled state
- TC-A11Y-03 Tap targets ≥ 48dp
- TC-A11Y-04 Contrast ratio ≥ 4.5:1 for body text
- TC-A11Y-05 TalkBack traversal order logical
- TC-A11Y-06 Icon-only buttons have labels ("Buka pilihan", "Bulan sebelumnya")
- TC-A11Y-07 Amount values readable as currency

### V. Performance (TC-PERF)
- TC-PERF-01 Cold start < 3s
- TC-PERF-02 Tab switch < 500ms
- TC-PERF-03 List scroll 60fps with 100+ items
- TC-PERF-04 Save transaction < 1s
- TC-PERF-05 No memory growth after 50 add/delete cycles

### W. Debug Tooling & Seeding (TC-SEED)
- TC-SEED-01 Launch with intent extra `test_seed = seed_empty` → database initialized empty
- TC-SEED-02 Launch with `test_seed = seed_month_mixed` → loads mixed data per specification
- TC-SEED-03 Launch with `test_seed = seed_excluded_categories` → loads special categories (Transfer, Tabungan, Investasi)
- TC-SEED-04 Launch with `test_seed = seed_month_boundaries` → data at start & end of month tested
- TC-SEED-05 Launch with `test_seed = seed_same_day_ordering` → same-day transaction ordering by created time tested
- TC-SEED-06 Launch with intent extra `test_now = 2026-09-15T10:00` → app uses injected fake clock, not system clock
- TC-SEED-07 Verify release build is clean of debug seeding hooks

### X. Undo Delete Toast (TC-UNDO)
- TC-UNDO-01 Delete transaction → toast with "Urungkan" action appears
- TC-UNDO-02 Tap "Urungkan" before timeout → transaction restored, summary & list updated
- TC-UNDO-03 Let toast expire without tap → deletion becomes permanent

### Y. Excluded & Transfer Categories (TC-EXC)
- TC-EXC-01 Verify transfer/savings categories treated per UI_SPEC.md rules (excluded from regular expense counting or budget if set accordingly)

---

Total: ~140 test cases across 25 areas. Locators verified via live page source (id strategy failed for some; use xpath `//*[@resource-id="..."]` or accessibility id on text labels).
