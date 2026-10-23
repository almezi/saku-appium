# 6. Functional Specifications & Business Logic Rules

Purpose: state what the app does **and why**, including the edge cases where
the behaviour is not obvious from the UI.

`UI_SPEC.md` is the authoritative product spec. This document explains the
rules behind it and traces each one to the code that implements it, so a
future engineer can see the intent without reverse-engineering the ViewModels.

Verified against branch `feature/improve-design-2.0`, HEAD `8c7dc3a`.

---

## 6.1 Product statement

Saku is a personal money tracker for a single user on a single device. The
user records income and expense against a category and an account, reviews
them by month, sets budgets per category, and keeps their own backups.

It is **not a product**. It is a test target for mobile automation, built small
and deliberately. It has exactly one user — whoever holds the phone — and no
server to talk to.

---

## 6.2 Users and user stories

### Primary persona

An individual, Indonesian-speaking, tracking personal finances in rupiah on
their own Android phone. No shared household access, no business use, no
multi-device requirement.

### User stories

| # | As a… | I want to… | So that… | Implemented in |
|---|---|---|---|---|
| US-01 | User | Record an income or expense with an amount, category, account, date and optional note | My cash flow is captured without fuss | `ui/tambah/` |
| US-02 | User | See all transactions for a month, grouped by day with a net per day | I can review where my money went | `ui/daftar/` |
| US-03 | User | See my balance, savings rate, and per-category breakdown | I understand the month's shape at a glance | `ui/ringkasan/` |
| US-04 | User | Correct or remove a mistake | The record stays trustworthy | `ui/ubah/` |
| US-05 | User | Set a monthly limit per expense category and see how much is left | I notice before I overspend | `ui/anggaran/` |
| US-06 | User | Create, rename, hide or delete my own categories | The app fits how I actually spend | `ui/kategori/` |
| US-07 | User | Export my data and re-import it | A lost or replaced phone is not a total loss | `ui/cadangan/` |
| US-08 | Automation | Address any element by a stable test tag | The app can be driven reliably | `TestTags.kt` |

### Explicitly out of scope

`UI_SPEC.md` §7 and `AGENTS.md` both forbid: login or PIN, multi-wallet,
multi-currency, transfers between accounts, recurring transactions, **CSV
import**, charts, cloud sync, notifications.

These are not backlog items. Adding any of them requires changing `UI_SPEC.md`
first.

---

## 6.3 Business rules

### Amount

| Rule | Detail | Implemented in |
|---|---|---|
| Whole rupiah only | `Long`, no decimals, no sen | `Transaction.amount` |
| Range | `1` to `999_999_999_999` (12 digits) | `MAX_AMOUNT` in `SakuFormat.kt` |
| Input sanitisation | Non-digits stripped, then truncated to 12 characters | `sanitizeAmountInput()` |
| Display | `Rp 212.121` — dot thousands separators, no decimals | `formatRupiah()`, `groupDigits()` |
| Negative display | U+2212 MINUS SIGN (`−`), not ASCII hyphen | `private const val MINUS = "−"` |
| Input is held as a string | `amountDigits: String`, parsed on demand | `TambahUiState.amount` |

The string-based amount is deliberate: it keeps the raw keystrokes for the text
field while deriving the `Long` for storage, and it caps length at the source
rather than by rejecting input after the fact.

### Dates

| Rule | Detail | Implemented in |
|---|---|---|
| No future dates | The picker cannot select past today | `TransactionForm.kt` |
| Timezone | **Asia/Jakarta**, not the device timezone | `val JAKARTA = TimeZone.of("Asia/Jakarta")` |
| Storage | Instant at midnight Asia/Jakarta on the chosen day | `dateEpochMillis` |
| Month filter | 1st 00:00:00.000 through the last day, inclusive | `SakuMonth.startMillis()` / `endMillisExclusive()` |
| Month bounds implementation | `[start, start of next month)` — half-open interval | `SakuMonth` |
| Current time | Always from the injected `Clock`, never `System.currentTimeMillis()` | `Clock.kt` |

The half-open range matters: it avoids an off-by-one that would drop the last
transaction of a 31-day month.

### Sorting

| Rule | Detail |
|---|---|
| Primary | `dateEpochMillis DESC` |
| Secondary | `createdAt DESC` |
| Grouping | Transactions are grouped by Jakarta calendar day, days descending |
| Within a day | `createdAt DESC` — newest first |

Implemented in `DaftarViewModel.rebuild()`. Note that
`TransactionDao.getAll()` only orders by date; the `createdAt` tiebreak is
applied in the ViewModel.

### Totals

| Rule | Detail |
|---|---|
| Income | Sum of `pemasukan` in the month |
| Expense | Sum of `pengeluaran` in the month |
| Balance | `income - expense` |
| Exclusions | Categories with `countsInTotals = false` are excluded from **all** totals |

The three excluded categories are:

| Category ID | Name | Type |
|---|---|---|
| `inc_transfer_in` | Transfer Masuk | income |
| `exp_finance_investment` | Investasi | expense |
| `exp_finance_savings` | Tabungan | expense |

**Why:** moving money into savings or an investment is not spending. Counting
Tabungan as an expense would make a disciplined saver look like a spender and
would cancel the money against the income that funded it. `CATEGORIES.md`
states this explicitly.

`Lainnya` and the other "Lainnya (…)" categories are **not** excluded — they
are ordinary categories that happen to be catch-alls.

### Savings rate

```
rate = (income - expense) / income * 100
```

- One decimal place, comma as the decimal separator: `99,9%`
- **Zero income → `—`**, with the hint "Tambah pemasukan untuk melihat
  tingkat tabungan". No divide-by-zero, no `0%`, no `∞`
- Negative rates are possible and render with the U+2212 minus

Implemented in `formatSavingsRate()`.

### Budgets

| Rule | Detail | Implemented in |
|---|---|---|
| Scope | Expenses only | `sumAmountForCategoryBetween` filters `type = 'pengeluaran'` |
| Cardinality | One budget per expense category | `categoryId` is the primary key |
| Duration | The limit applies to **every** month until it is edited | No month column in `budgets` |
| Status: Aman | `< 75%` used | `BudgetStatus.Safe` |
| Status: Hampir habis | `>= 75%` and `< 100%` | `BudgetStatus.AlmostGone` |
| Status: Lewat batas | `>= 100%` | `BudgetStatus.OverLimit` |
| Progress bar | Clamped to 100%; never overflows | `coerceIn(0f, 1f)` |
| Threshold constant | `0.75` | `BudgetStatus.ALMOST_GONE_THRESHOLD` |
| Sort order | Highest percentage used first | `sortedByDescending { it.fraction }` |
| Alert switch | `alertAt80`, **on by default** | `TambahKategoriViewModel` / budget form |
| Delete a budget | Never touches transactions | `BudgetRepository.deleteBudget()` deletes one row |
| `limit <= 0` | Treated as `Safe` (guard against divide-by-zero) | `BudgetStatus.of()` |

Timestamps: `saveBudget()` preserves `createdAt` from the existing row and
always refreshes `updatedAt`, both from the injected `Clock`.

### Categories

| Rule | Detail |
|---|---|
| IDs are stable | Referenced by transactions and budgets; never change |
| Default categories | Cannot be deleted — only renamed or hidden |
| Custom categories | Can be deleted, renamed, hidden |
| Name length | 1–20 characters (`CATEGORY_NAME_MAX = 20`) |
| Uniqueness | Unique **per type**, compared case-insensitively via `LOWER(customName)` |
| Custom ID format | `"cus_" + type.take(3) + "_" + clock.currentTimeMillis()`; the `cus_` prefix marks it and IDs are never reused |
| Delete behavior | Transactions move to `exp_other` / `inc_other` of the same type; the budget is removed; all in one DB transaction |
| Hidden categories | Stay out of the Tambah picker but remain in the Transaksi list and in reports |
| Rename | Stored in `customName`, which wins over the string resource |
| Seed colors | Assigned once from a hash of the ID; `WHERE colorHex IS NULL` so a user choice is never overwritten |

### Accounts

| Rule | Detail |
|---|---|
| Count | One wallet; seeded `acc_tunai` (Tunai), `acc_bca` (BCA), `acc_gopay` (GoPay) |
| Default | `acc_tunai` — the value used as the column default and the fallback |
| On transactions | Every transaction records which account it moved through |
| Transfers | **Not supported.** No transfer entity, no move-between-accounts logic |
| User management | No screen to create or rename accounts exists today |

### Delete

| Rule | Detail |
|---|---|
| Confirmation | Always required, from a bottom sheet |
| Sheet text | "[nama] sebesar [amount] pada [date] akan dihapus permanen. Tindakan ini tidak bisa dibatalkan." |
| Actions | "Batal" and "Ya, hapus" |
| After delete | Toast "Transaksi dihapus" with an **"Urungkan"** action for 5 seconds |
| Undo window | `SakuMotion.undoToastMillis = 5000L` |

Undo is implemented as a re-insert of the deleted row. ⚠️ Because `id` is
`autoGenerate`, the restored transaction receives a **new id**. A third-party
automation suite holding the old id would not find the row again. This is a
known, accepted tradeoff, not an oversight — see
[01 §1.12](01-architecture-blueprint.md).

### Save behaviour

| Rule | Detail |
|---|---|
| Disabled until valid | `canSave = hasAmount && hasCategory && !isSaving` |
| Helper text | "Isi jumlah dulu", "Pilih kategori dulu", or "Isi jumlah dan kategori dulu" |
| On success (Tambah) | Clears amount, category and note; **keeps** account and date; shows "Transaksi disimpan" |
| Navigation | Saving **never** leaves the Tambah screen |
| On success (Ubah) | Returns to Transaksi; "Simpan perubahan" is enabled only when something actually changed |

### Category reset on type switch

| Rule | Detail |
|---|---|
| Trigger | Changing `type` between Pemasukan and Pengeluaran |
| Keeps | Amount and note |
| Clears | The selected category, **if** it does not belong to the new type |
| Implementation | `updateType()` checks `_categories.value` for the selected ID's type before clearing |

`TambahViewModel.updateType()` retains the category when the new type matches
the current category's `storageValue`, and re-subscribes the category list.

---

## 6.4 Edge cases

### Amount

| Input | Result |
|---|---|
| Empty | Helper "Isi jumlah dulu"; save disabled |
| `0` | Invalid — minimum is 1. Helper text shown |
| `abc`, `-5`, `1.5` | Digits filtered: `abc` → empty, `-5` → `5`, `1.5` → `15` |
| 13 digits | Truncated to 12 |
| `999999999999` | Valid, the maximum |
| Pasted 20-digit value | Truncated to the first 12 digits |
| Very large value, font shrinks | `SakuFields.kt` measures text and reduces the font size as the digit count grows |

### Dates

| Case | Result |
|---|---|
| Selecting today | Allowed; placeholder shows today's date |
| Selecting a future date | Not offered by the picker |
| 1st of a month at 00:00 Jakarta | Included — `>=` bound |
| Last day of a month at 23:59:59.999 | Included — `<` next month's start |
| A month with no transactions | Empty state; the month switcher stays usable so other months can be browsed |
| Viewing the current month | "Next month" is disabled |
| Month arithmetic across a year boundary | Handled by `LocalDate.plus(month)` in `SakuMonth.shifted()`, so Dec → Jan is correct |

### Totals

| Case | Result |
|---|---|
| Income 0 | Savings rate `—`, with the explanatory hint |
| Expense 0 | Balance equals income; the comparison shows income only |
| All transactions are excluded categories | Totals read 0; the month looks empty even though rows exist |
| Negative balance | Balance uses the expense colour; the minus renders as U+2212 |
| Category total 0 | Filtered out of the breakdown (`it.total > 0L`) |
| Share percentage when the type total is 0 | 0, and `formatCategoryShare` returns `—` |

### Categories

| Case | Result |
|---|---|
| Renaming a category that already exists | Renaming is free; only *creation* enforces uniqueness. Two categories can then share a display name |
| Creating a category with a duplicate name | `nameError = true`; "Simpan kategori" disabled |
| Creating a category with an empty name | Invalid, length 0 |
| Deleting a category with 0 transactions | Allowed; the confirmation reports 0 will move |
| Deleting a default category | Not offered — only "Ubah" and "Sembunyikan" |
| Hiding the only visible category | The picker shows empty; the history is unaffected |
| Deleting a category whose fallback is also hidden | Transactions still move to `exp_other` / `inc_other`; hidden status affects the picker, not the data |

### Budgets

| Case | Result |
|---|---|
| Budget exists, no spending | 0% used, "Aman", full bar empty |
| Spending exactly the limit | 100% → "Lewat batas", bar full |
| Overspending | Bar clamps at 100%; the row shows "Lebih Rp …" rather than "Sisa" |
| No budgets | Empty state "Belum ada anggaran"; the total card is hidden |
| Editing a budget's category | Locked while editing — category select disabled |
| Deleting a budget | Confirmation sheet; transactions untouched |
| Budget on a hidden category | Still tracked and displayed in the Anggaran list |

### Backup / import

| Case | Result |
|---|---|
| Importing a JSON with new transactions | "N transaksi ditambahkan, M dilewati karena sudah ada." |
| Importing a file with all duplicates | 0 added, all skipped |
| Importing a CSV file | **"File tidak valid."** — the importer parses JSON only. The message is misleading; it names CSV as an accepted option |
| Importing a malformed file | Same error path; `runCatching` on `parseJson` |
| Importing the same file twice | Second run skips everything as duplicates |
| Import failure mid-insert | `runCatching` around the bulk insert → error state; existing data untouched |
| Export target | `getExternalFilesDir(null)/saku-cadangan.{csv,json}`, falling back to `filesDir` |

**Duplicate detection key** — a transaction is a duplicate when all six fields
match exactly:

```
dateEpochMillis | type | amount | categoryId | accountId | note
```

Notes are normalised with `orEmpty()`, so a `null` note and an empty-string note
count as the same. `createdAt` is **not** part of the key.

---

## 6.5 RBAC

**There is no role-based access control.** The app has a single implicit role.

| Aspect | Reality |
|---|---|
| User identity | None. No login, no PIN, no account. `UI_SPEC.md` §7 forbids them |
| Authorization | None. Every function is available to whoever launches the app |
| Roles | One: the device owner |
| Permissions | **Zero** Android permissions declared — the app cannot read contacts, location, files outside its sandbox, or the network |
| Multi-user | Not supported. The database belongs to one device |
| Data isolation | None needed. All data lives in the app's private storage |
| Accessibility of stored data | `allowBackup="true"` means Android's system cloud backup includes the Room database. Worth an explicit decision for a finance app |

If RBAC were ever needed — say, a household mode — it would be a new feature and
would have to be added to `UI_SPEC.md` before any code is written.

---

## 6.6 Business logic that is easy to break

Fragile invariants worth calling out explicitly:

1. **`createdAt` is not round-tripped through backup.** Export omits it; import
   defaults it to `0L`. Re-imported transactions lose their intra-day ordering
   and sort last within their day.
2. **Accounts are dropped on import.** `BackupRepository.parseJson()` returns
   `BackupData(transactions, categories, emptyList(), budgets)` — the accounts
   list is empty regardless of what the file contains.
3. **Only custom categories are exported.** `buildBackup()` filters
   `!it.isDefault`, so a renamed *default* category exports without its rename.
4. **Type strings are Indonesian and are persisted.** `"pemasukan"` /
   `"pengeluaran"` appear in the DB, in SQL, and in raw string comparisons in
   several DAO queries. Renaming them requires a data migration.
5. **Category IDs are load-bearing.** Transactions, budgets, backups and the
   automation suite all reference them. They must never change.
6. **No Room foreign keys.** Integrity is application-enforced, so a raw SQL
   edit or a bad migration can leave orphaned `categoryId` values.
7. **`DaftarViewModel` loads the whole table.** Fine for personal volumes; not
   a pattern to copy.

---

## 6.7 Traceability

| Rule area | Spec | Code |
|---|---|---|
| Amount, dates, sorting, totals | `UI_SPEC.md` §2 | `ui/designsystem/SakuFormat.kt` |
| Category columns and IDs | `CATEGORIES.md` | `data/CategorySeed.kt`, `ui/CategoryUiMapper.kt` |
| Data model, migrations | `UI_SPEC.md` §3 | `data/*.kt` |
| Navigation | `UI_SPEC.md` §4 | `navigation/NavGraph.kt` |
| Design tokens | `UI_SPEC.md` §5 | `ui/designsystem/` |
| Screen behaviour | `UI_SPEC.md` §6.1–6.7 | `ui/<feature>/` |
| Out of scope | `UI_SPEC.md` §7 | — |
| Budget thresholds | `UI_SPEC.md` §6.6 | `ui/designsystem/SakuBudget.kt` |
| Import duplicate rule | `UI_SPEC.md` §6.7 | `ui/cadangan/CadanganViewModel.kt` |
| Test tags | `TESTABILITY.md` | `TestTags.kt` |

---

## See also

- `UI_SPEC.md` — the authoritative spec this document explains
- [01-architecture-blueprint.md](01-architecture-blueprint.md) — where the rules live in code