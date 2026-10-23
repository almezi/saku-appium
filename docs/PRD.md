# Product Requirement Document (PRD) — Saku (SimpleMoneyTracker-KT)

**Document Status:** Approved / Baseline  
**Target Release Platform:** Android (Kotlin Multiplatform / Compose Multiplatform architecture)  
**Package Name:** `id.almezi.simplemoneytracker_kt`  
**Primary Locale:** Indonesian (`id-ID`)  

---

## 1. Executive Summary & Vision

**Saku** is a lightweight, local-only, offline personal money tracking application. It allows users to record daily income and expenses in Indonesian Rupiah (IDR), categorize transactions, set category-based monthly budgets, inspect monthly financial summaries, and perform offline data backups.

Saku is engineered as a deterministic **test target for mobile automation**, prioritizing explicit state management, predictable data persistence, zero network dependencies, and complete test tag coverage (`TestTags.kt`).

---

## 2. Product Goals & Non-Goals

### 2.1 Product Goals
1. **Frictionless Expense & Income Recording:** Quick entry of transaction amounts, categories, accounts, dates, and optional notes.
2. **Monthly Financial Overview:** View transactions grouped by day, net monthly balance, savings rate, and category breakdowns.
3. **Category Budgeting:** Monitor monthly expense limits per category with visual thresholds and alerts.
4. **Customizable Categories:** Provide flexible default categories and allow creation, renaming, hiding, or deletion of custom categories.
5. **Local Data Portability:** Enable offline backup (export/import) via JSON/CSV files without cloud lock-in.
6. **High Testability:** Expose stable UI test tags for automated end-to-end testing without debug artifacts leaking into production.

### 2.2 Explicit Non-Goals (Out of Scope)
- **No User Accounts or Authentication:** No login, registration, PIN, pattern lock, or biometric security.
- **No Network / Cloud Sync:** Strictly offline app with local Room database storage; no backend APIs or remote telemetry.
- **No Multi-Currency / Multi-Wallet:** IDR only; single wallet model with fixed payment accounts (Tunai, BCA, GoPay).
- **No Account Transfers:** Transfers between payment accounts are unsupported.
- **No Recurring Transactions or Notifications:** No background services, scheduled transactions, or push/local alerts.
- **No Charts or Complex Analytics:** Financial reports rely on structured cards and progress bars instead of visual graphs.

---

## 3. User Persona & User Stories

### 3.1 Primary User Persona
- **Name:** Personal Budgeter (Indonesian User)
- **Device:** Android Smartphone
- **Needs:** Fast, private, offline expense tracking without ads, complex setup, or cloud sync requirements.

### 3.2 User Stories

| ID | Persona | User Action | Desired Outcome |
|---|---|---|---|
| **US-01** | User | Enter income/expense with amount, category, account, date, and note | Easily log daily cash flow |
| **US-02** | User | View monthly transaction history grouped by day with daily net totals | Track daily spending habits |
| **US-03** | User | View monthly net balance, savings rate, and category spending breakdown | Understand overall monthly financial performance |
| **US-04** | User | Edit or delete existing transactions with an undo option | Correct mistakes without data loss |
| **US-05** | User | Set monthly spending limits per expense category | Avoid overspending in specific categories |
| **US-06** | User | Add, rename, hide, or delete custom categories | Tailor category structure to personal preferences |
| **US-07** | User | Export data to JSON/CSV and import JSON backups | Safeguard data across app reinstalls or device transfers |
| **US-08** | QA / Automation | Interact with UI elements using stable test tags | Run automated UI and integration test suites |

---

## 4. Product Features & Detailed Requirements

### 4.1 Transaction Entry (Tambah Transaksi Screen)
- **Header:** Shows "Tambah transaksi" or "TAMBAH PENGELUARAN" styled according to transaction type.
- **Type Toggle:** Segmented selector between **Pemasukan** (Income) and **Pengeluaran** (Expense). Default: Pemasukan.
- **Amount Field:**
  - Whole IDR values only (`Long`).
  - Range: `1` to `999.999.999.999` (12 digits maximum).
  - Formatted dynamically with dot thousands separators as typed (e.g., `Rp 250.000`).
- **Category Picker:**
  - Flat searchable modal/picker listing categories belonging to the active transaction type.
  - Switching transaction type resets category if it does not match the new type.
  - Link to "Kelola kategori".
- **Account & Date Selection:**
  - Account dropdown: Defaulting to **Tunai** (options: Tunai, BCA, GoPay).
  - Date picker: Defaults to today (formatted in `Asia/Jakarta`). Future dates are disabled.
- **Note Field:** Optional text input, maximum 60 characters.
- **Validation & Submit:**
  - Submit button is disabled until valid amount and category are selected.
  - Displays dynamic helper text: "Isi jumlah dulu", "Pilih kategori dulu", or "Isi jumlah dan kategori dulu".
  - On submission: Saves transaction, resets amount/category/note, retains selected account and date, stays on screen, and displays toast "Transaksi disimpan".

### 4.2 Transaction History & Monthly List (Transaksi Screen)
- **Month Selector:** Navigate between months (`Asia/Jakarta` 1st to last day inclusive). Next month button is disabled when viewing the current month.
- **Summary Banner:** Highlights total income ("Masuk") in green and total expense ("Keluar") in red/pink.
- **Day Grouping:** Transactions grouped by calendar day sorted date descending (`dateEpochMillis DESC`), then creation time descending (`createdAt DESC`). Day header displays total net amount for that day.
- **Transaction Row:**
  - Displays category icon/avatar, category name, account tag, and formatted amount.
  - Quick action buttons: **Ubah** (Edit) and **Hapus** (Delete).
- **Deletion Workflow:**
  - Bottom sheet confirmation: `"[nama] sebesar [amount] pada [date] akan dihapus permanen..."`.
  - Confirmation triggers row removal and shows a 5-second snackbar/toast with an **Urungkan** (Undo) button.
- **Empty State:** Shows "Belum ada transaksi bulan ini" with direct action buttons to "Tambah transaksi" or "Impor dari cadangan".

### 4.3 Financial Summary (Ringkasan Screen)
- **Net Balance Card:**
  - Calculates `Net Balance = Income - Expense`.
  - Visual styling: Green when balance $\ge 0$, expense pink/red when negative. Negative values use U+2212 minus sign (`−`).
  - Sub-tiles for total Pemasukan and Pengeluaran.
- **Savings Rate Metric:**
  - Formula: $\text{Savings Rate} = \frac{\text{Income} - \text{Expense}}{\text{Income}} \times 100\%$, formatted with 1 decimal place (e.g., `99,9%`).
  - Handles zero income by displaying "—" alongside hint "Tambah pemasukan untuk melihat tingkat tabungan".
- **Category Breakdown Cards:**
  - Separate lists for Income and Expense categories sorted by amount descending with share percentage.
  - Categories with 0 amount are hidden from breakdown.
- **Total Exclusion Rules:**
  - Categories flagged with `countsInTotals = false` are excluded from all totals, net balance, and savings rate calculations.
  - Excluded categories: `inc_transfer_in` (Transfer Masuk), `exp_finance_investment` (Investasi), `exp_finance_savings` (Tabungan).

### 4.4 Category Budgeting (Anggaran Screen & Form)
- **Scope:** Applies exclusively to Expense categories (1 budget per expense category).
- **Budget Duration:** Limits apply to every calendar month until edited or removed.
- **Status Indicators:**
  - **Aman (Safe):** Spending $< 75\%$ of limit (Green progress bar).
  - **Hampir habis (Warning):** Spending $\ge 75\%$ and $< 100\%$ (Amber progress bar).
  - **Lewat batas (Over Limit):** Spending $\ge 100\%$ (Red/Pink progress bar clamped at 100%).
- **Budget Row Info:** Displays category name, spent vs limit amount (`Rp 450.000 dari Rp 500.000`), remaining/exceeded amount, and status pill.
- **Budget Form:**
  - Category selector (locked when editing an existing budget).
  - Monthly limit amount field.
  - Toggle switch "Ingatkan saat 80% terpakai" (enabled by default).

### 4.5 Category Management (Kelola Kategori & Form)
- **Tabs & Search:** Segmented control for Pemasukan / Pengeluaran with realtime name filtering.
- **Default Categories:**
  - Seeded categories (9 Income, 27 Expense).
  - Cannot be deleted. Can be renamed (`customName`) or hidden (`isHidden`).
- **Custom Categories:**
  - Created by user (Name: 1-20 characters, unique per type case-insensitively, assigned 1 of 8 palette colors).
  - Can be edited, hidden, or deleted.
  - Deleting a custom category reassigns its associated transactions to the fallback category (`inc_other` / `exp_other`) and removes associated budget in a single database transaction.

### 4.6 Data Backup & Portability (Cadangan Screen)
- **Status Card:** Displays total local transactions count and last backup timestamp.
- **Export Capabilities:**
  - **JSON Export:** Serializes transactions, categories, budgets, and accounts into a structured JSON file.
  - **CSV Export:** Exports transactions as UTF-8 with BOM.
- **Import Capabilities:**
  - Supports importing Saku JSON files.
  - **Duplicate Detection:** Transactions are matched on `dateEpochMillis | type | amount | categoryId | accountId | note`. Duplicate rows are skipped during import.
  - Import summary dialog: `"[N] transaksi ditambahkan, [M] dilewati karena sudah ada."`

---

## 5. Technical Architecture & Constraints

- **Architecture Pattern:** MVVM (UI $\rightarrow$ ViewModel StateFlow $\rightarrow$ Repository $\rightarrow$ Room DB DAO).
- **Dependency Management:** Manual Dependency Injection (No Hilt / Koin).
- **Timezone & Clock Abstraction:** All date calculations rely on `Asia/Jakarta` timezone (`TimeZone.of("Asia/Jakarta")`). Time is provided via an injectable `Clock` interface (never directly calling system time).
- **Localization & Design System:**
  - Indonesian language primary (`SakuStrings` generated from XML).
  - Dark mode exclusively using design tokens (`#0e0e12` background, `#17171d` surface, `#5b4bd6` primary, `#6ee7a0` green, `#f0708a` pink-red).
  - Typography: DM Sans for UI text, DM Mono for amounts.
- **Testability:** Strict requirement that all interactive or asserted UI elements implement test tags defined in `TestTags.kt`.

---

## 6. Success Metrics & Quality Criteria

1. **Zero Data Loss:** Database migrations and transaction edits retain data integrity across app restarts and updates.
2. **Deterministic UI State:** Screen state fully managed via `StateFlow` and testable via automated UI tests.
3. **Strict Compliance with Scope:** No feature creep or undocumented permissions.
