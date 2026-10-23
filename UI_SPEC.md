# UI_SPEC

What the app does. Nothing about tests, tags or bugs lives here.
Companion files: CATEGORIES.md (category list), TESTABILITY.md (tags and debug hooks; the app-building AI must also read it).

## 1. Purpose and scope

A small, local-only personal money tracker (Indonesian UI). One wallet, IDR only, no login, no network. It is a test target, so keep it small. Do not add features that are not in this file.

## 2. Product rules

- **Amount:** whole rupiah only, min 1, max 999.999.999.999 (12 digits). Digits only, dot thousands separators added as the user types.
- **Dates:** no future dates. Uses the device timezone, formatted in Asia/Jakarta. Time comes from an injectable clock, never the system clock directly.
- **Categories:** the seeded list plus user-created ones (see CATEGORIES.md). Changing the transaction type clears a category that does not belong to the new type. Switching type keeps the amount and the note.
- **Accounts:** a single wallet. Every transaction records which account it moved through (seeded: Tunai, BCA, GoPay). There are no transfers between accounts.
- **Totals:** categories flagged `countsInTotals = false` (Transfer Masuk, Investasi as expense, Tabungan) are excluded from all totals.
- **Sorting:** list is sorted by date descending, then by created time descending.
- **Month filter:** covers the 1st through the last day of the month in Asia/Jakarta, inclusive.
- **Delete:** always asks for confirmation first, from a bottom sheet. Deleting a transaction shows an undo toast for 5 seconds.
- **Budgets:** expenses only, one per expense category, and the limit applies to every month until it is edited.
- **Currency display:** `Rp 212.121`, dot separators, no decimals, U+2212 minus sign for negatives.

## 3. Data model

Transaction
- `id` (unique)
- `type`: `pemasukan` or `pengeluaran`
- `categoryId` (stable ID from CATEGORIES.md)
- `accountId` (stable ID, defaults to Tunai)
- `amount`: whole rupiah, Long
- `dateEpochMillis`: instant at midnight in Asia/Jakarta
- `note`: optional text, max 60 characters
- `createdAt`: instant, from the injectable clock

Category: see CATEGORIES.md.

Account: `id`, `name`, `sortOrder`.

Budget: `categoryId` (primary key), `limitAmount`, `alertAt80`, `createdAt`, `updatedAt`.

Database version 3. Migrations 1 to 2 (accounts) and 2 to 3 (budgets, category columns) must keep existing rows.

## 4. Navigation

Bottom navigation with three items: **Tambah**, **Transaksi**, **Ringkasan**. The app opens on Tambah. Every other screen (Ubah transaksi, Kelola kategori, Tambah kategori, Anggaran, Anggaran baru, Cadangan) is reached from one of the three and shows a back button instead of the bottom bar. Implemented with Jetpack Navigation Compose.

## 5. Design language

Dark only. Tokens live in `ui/designsystem` and components in `ui/components`, both prefixed `Saku`. The values come from `improve/tokens.css`: background `#0e0e12`, surface `#17171d`, violet primary `#5b4bd6`, income `#6ee7a0`, expense `#f0708a`, danger `#b3373f`. DM Sans for UI text, DM Mono for every amount. Minimum touch target 48 dp.

All UI text lives in string resource files (Indonesian first).

## 6. Screens

### 6.1 Tambah

Fields, top to bottom:
1. Header: "Tambah transaksi", or "TAMBAH PENGELUARAN" in the expense color
2. Type toggle: "Pemasukan" | "Pengeluaran" (default Pemasukan)
3. Amount: label "JUMLAH", empty state shows "Rp 0" as a placeholder
4. Category: label "KATEGORI", a "Kelola kategori" link on both variants. A select field opens the category picker: a search field over one flat list, no group headings
5. Account select and date select side by side. Placeholder date is today, "9 Okt 2026"
6. Note: placeholder "Tambah catatan (opsional)", max 60 characters
7. Helper text above the button: "Isi jumlah dulu", "Pilih kategori dulu" or "Isi jumlah dan kategori dulu"
8. Button: "Simpan transaksi" in violet, "Simpan Pengeluaran" in the expense button color

Behavior:
- The button is disabled until amount and category are set.
- Saving clears the amount, category and note, keeps the account and date, and shows the toast "Transaksi disimpan".
- Saving never leaves the screen.

### 6.2 Transaksi

- Month switcher at the top, next month disabled when viewing the current month.
- Summary strip: "Masuk" (income, green) and "Keluar" (expense, pink-red).
- Button "Cadangan & ekspor data".
- Transactions grouped by day, newest day first. The day header shows the day name, the date and the net total of that day.
- Each row: category avatar, name, type label, amount, then "Ubah" and "Hapus".
- Delete opens a sheet: "[nama] sebesar [amount] pada [date] akan dihapus permanen. Tindakan ini tidak bisa dibatalkan." with "Batal" and "Ya, hapus". Afterwards a toast "Transaksi dihapus" offers "Urungkan" for 5 seconds.
- Empty month: "Belum ada transaksi bulan ini" with "Tambah transaksi" and "Impor dari cadangan".

### 6.3 Ringkasan

Same month switcher as Transaksi.
- Balance card: "SALDO BERSIH", green when zero or positive, expense color when negative, with Pemasukan and Pengeluaran sub-tiles.
- Savings rate: `(income - expense) / income * 100`, one decimal, comma separator ("99,9%"). Zero income shows "—" with the hint "Tambah pemasukan untuk melihat tingkat tabungan".
- Buttons "Anggaran" and "Kelola kategori".
- Breakdown cards: "Pemasukan vs pengeluaran", then income per category and expense per category, each sorted by amount descending with a share percentage.
- Empty month: balance in muted grey, the savings row, the buttons and the breakdown cards are hidden, and the empty state "Belum ada data untuk diringkas" is shown.

### 6.4 Ubah transaksi

Same form as Tambah, header "Ubah transaksi", no bottom bar, all fields pre-filled. "Simpan perubahan" is enabled only when something actually changed. Saving returns to Transaksi. A danger text button "Hapus transaksi" opens the same delete sheet.

### 6.5 Kelola kategori and Tambah kategori

- Toggle Pemasukan / Pengeluaran, opening on Pemasukan.
- A search field under the toggle filters the current tab by category name, case-insensitive. It stays put when the tab changes. No match shows "Kategori tidak ditemukan".
- Rows: color square, name, "Bawaan" or "Buatan sendiri", and the transaction count. Actions are icon-only buttons on the right of the row.
- Default categories get edit and hide. Custom categories also get delete. Hidden categories show the show icon instead of the hide icon.
- Hint "Kategori bawaan tidak bisa dihapus, hanya disembunyikan" and a "Tambah kategori" button.
- Deleting a custom category asks for confirmation and reports how many transactions move to "Lainnya".
- Tambah kategori: type toggle Pemasukan / Pengeluaran, opening on Pemasukan, name (1-20 characters, unique per type, case-insensitive), one of the eight palette colors with a live preview chip, and "Simpan kategori" disabled until the name is valid.

### 6.6 Anggaran and the budget form

- List: total spent of total budget with a progress bar, then one row per budget sorted by percentage used, highest first.
- Each row: category name, status label, bar, "Rp 450.000 dari Rp 500.000" and either "Sisa Rp 50.000" or "Lebih Rp 45.000", then "Ubah" and "Hapus".
- Status: under 75% "Aman" green, 75% to under 100% "Hampir habis" amber, 100% or more "Lewat batas" pink-red.
- The bar never fills past 100%.
- Empty state "Belum ada anggaran" with "Atur anggaran baru". The total card is hidden when there are no budgets.
- The form is shared: "Anggaran baru" or "Ubah anggaran", category select (categories without a budget, locked while editing), "Batas bulanan", a note that differs per mode, the switch "Ingatkan saat 80% terpakai" on by default, and "Simpan anggaran". Editing also shows "Hapus anggaran".
- Deleting a budget never touches a transaction.

### 6.7 Cadangan data

- Status card: transactions stored on this device and the last backup date, or "belum pernah".
- Export CSV (UTF-8 with BOM, one row per transaction) and export JSON (transactions, categories, budgets, accounts, plus a version).
- Import from a picked file, Saku JSON only. A transaction is a duplicate when date, type, amount, category, account and note all match. Result: "12 transaksi ditambahkan, 3 dilewati karena sudah ada." An unreadable file shows "File tidak valid. Pilih file CSV atau JSON dari Saku." Import never deletes anything.
- Warning card: "Data hanya tersimpan di perangkat ini. Jika data dihapus atau ganti perangkat, buat cadangan dulu."

## 7. Out of scope

Login or PIN, multi-wallet, multi-currency, transfers between accounts, recurring transactions, CSV import, charts, cloud sync, notifications.

## 8. Current Development Status

### Completed
- Room database with three migrations, all verified against a database that already held data
- Tambah, Transaksi, Ringkasan, Ubah transaksi, Kelola kategori, Tambah kategori, Anggaran, budget form, Cadangan
- Floating bottom navigation, design tokens and shared components
- Export CSV and JSON, import JSON with duplicate detection

### Architecture
- MVVM: UI → ViewModel (StateFlow) → Repository → DB
- Manual DI: no Hilt, no Koin
- Injectable clock: never call the system clock directly
- Testability: all interactive elements use test tags from TestTags.kt

### Known gaps
- CSV import is not implemented, so a CSV file shows the "file tidak valid" message.
- Export writes to the app's own external folder, which Android 11 and later hide from the file picker. There is no share sheet.
- The seeded category set (9 income, 27 expense) is much larger than the 6 and 7 in the design reference.
- No instrumented tests exist yet, so the UI is verified by hand rather than by `connectedAndroidTest`.