# Saku Screens, Navigation, and Business Rules

Screen names match the artboards on the "Saku Revamp" canvas. Use them as route or component names.

## 1. Navigation map

```
Bottom bar: [Tambah] [Transaksi] [Ringkasan]

Tambah (Pemasukan / Pengeluaran)
  -> Kelola kategori (link on the Kategori label, Pengeluaran variant)

Transaksi
  -> Ubah transaksi (per transaction)
       -> Konfirmasi hapus (sheet)
  -> Konfirmasi hapus (sheet, per transaction)
  -> Cadangan data (button "Cadangan & ekspor data")
  -> Transaksi kosong (when the month has no transactions)

Ringkasan
  -> Anggaran (button)
       -> Ubah anggaran (per budget, and "Atur anggaran baru")
            -> Konfirmasi hapus anggaran (sheet, from Ubah anggaran)
       -> Anggaran baru (button at the bottom)
       -> Konfirmasi hapus anggaran (sheet, per budget card)
  -> Kelola kategori (button)
       -> Tambah kategori (button)
       -> Konfirmasi hapus kategori (sheet, custom categories only)
  -> Ringkasan kosong (when the month has no transactions)
```

Back button ("<") always returns to the previous screen. Sheets close with "Batal" and return to the screen underneath.

## 2. Screen inventory

### 2.1 Tambah (Pemasukan)
- **Purpose:** add an income transaction.
- **Contents, top to bottom:** header ("Tambah transaksi" and today's short date), segmented toggle (Pemasukan selected), amount input (green), category chips (3 columns), Akun select and Tanggal side by side, Catatan field, primary button, bottom bar.
- **Default state:** type = Pemasukan, amount = Rp 0, category = none selected, account = last used account, date = today, note empty.
- **Button:** "Simpan transaksi", disabled until amount > 0 and category selected. Helper text above the button says what's missing: "Isi jumlah dulu", "Pilih kategori dulu", or "Isi jumlah dan kategori dulu".
- **Save:** returns to the previous tab or stays on Tambah with the fields cleared, depending on the chosen behavior (decision for the team; default: clear the fields and show a short confirmation).

### 2.2 Tambah (Pengeluaran)
- **Purpose:** add an expense transaction.
- **Differences from 2.1:** expense toggle selected, expense color (pink-red) for the amount, category chips use the wrapping pill layout, header label "TAMBAH PENGELUARAN" in expense color, primary button text "Simpan Pengeluaran" in expense button color (`--color-expense-button`), and a "Kelola kategori" link next to the Kategori label.
- **Category list:** expense categories only (Makan & Minum, Transportasi, Belanja, Hiburan, Kesehatan, Tagihan, Lainnya, plus any custom expense categories that are not hidden).
- **Switching type** keeps the amount and note, and clears the category if it does not belong to the new type.

### 2.3 Transaksi
- **Purpose:** see and manage transactions for the selected month.
- **Header:** month switcher. Next button disabled on the current month.
- **Summary strip:** Masuk (income total) and Keluar (expense total), side by side.
- **Button:** "Cadangan & ekspor data" below the summary strip, opens the Cadangan screen.
- **List:** grouped by day. Each day header shows the day name, date, and net total for the day. Each transaction is a card with "Ubah" and "Hapus".
- **Ordering:** newest day first. Within a day, newest entry first.
- **Bottom bar:** shown.

### 2.4 Transaksi kosong
- **When:** the selected month has no transactions.
- **Contents:** summary strip with Rp 0 in muted color, empty state (icon, "Belum ada transaksi bulan ini", body "Catat pemasukan atau pengeluaran pertamamu. Semua tersimpan di perangkat ini."), button "Tambah transaksi", secondary button "Impor dari cadangan".
- **Bottom bar:** shown.

### 2.5 Ubah transaksi
- **Purpose:** edit an existing transaction.
- **Contents:** back button, title "Ubah transaksi", the same fields as Tambah, pre-filled. Type toggle reflects the saved type.
- **Buttons:** "Simpan perubahan" (primary), "Hapus transaksi" (text, danger).
- **Bottom bar:** hidden.
- **Save:** only enabled if something changed. Return to Transaksi after saving.

### 2.6 Konfirmasi hapus (transaction)
- **Sheet over the Transaksi list** (dimmed).
- **Title:** "Hapus transaksi?"
- **Body:** "[Nama] sebesar [amount] pada [date] akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
- **Buttons:** "Batal" and "Ya, hapus".

### 2.7 Ringkasan
- **Purpose:** monthly overview.
- **Header:** month switcher.
- **Balance card:** "SALDO BERSIH", balance (green if ≥ 0, expense color if < 0), sub-tiles for Pemasukan and Pengeluaran.
- **Savings rate:** one row, label "Tingkat tabungan", value with one decimal and a comma ("99,9%"). Rule in section 4.
- **Links:** two buttons, "Anggaran" and "Kelola kategori".
- **Breakdown cards:**
  1. "Pemasukan vs pengeluaran": two bars, both amounts shown.
  2. "Pemasukan per kategori": one row per income category, sorted by amount, with share of total income.
  3. "Pengeluaran per kategori": one row per expense category, sorted by amount, with share of total expense.
- **Bottom bar:** shown.

### 2.8 Ringkasan kosong
- **When:** the selected month has no transactions.
- **Contents:** balance card with Rp 0 in muted color, sub-tiles muted, empty state ("Belum ada data untuk diringkas", body "Ringkasan akan muncul setelah kamu mencatat transaksi pertama bulan ini."), button "Tambah transaksi".
- **Hide** the savings rate, breakdown cards, and links while empty.
- **Bottom bar:** shown.

### 2.9 Anggaran
- **Purpose:** see budgets for the selected month.
- **Header:** back button, title "Anggaran", month label.
- **Total card:** total spent of total budget, bar.
- **Budget list:** one budget progress row per category that has a budget (see 01-design-system 5.15). Sorted with the most-used first.
- **Bottom button:** "Atur anggaran baru" (opens Anggaran baru).
- **Empty state:** when no budgets exist, show the empty pattern with "Belum ada anggaran" and button "Atur anggaran baru". Hide the total card.
- **Bottom bar:** hidden.

### 2.10 Anggaran baru and Ubah anggaran
- **Purpose:** create or edit a monthly budget for one category. These two screens share one layout.
- **Title:** "Anggaran baru" when creating, "Ubah anggaran" when editing.
- **Fields:**
  - Kategori: select, lists expense categories that do not already have a budget (in edit mode, the current category is shown as selected and cannot be changed).
  - Batas bulanan: amount input, Rp 0 by default. Must be greater than 0.
  - Note under the limit: "Batas berlaku mulai [bulan tahun]. Bulan berikutnya mengikuti batas ini." (creating) / "Batas berlaku untuk [bulan tahun] saja." (editing).
  - Switch: "Ingatkan saat 80% terpakai". Default on.
- **Buttons:** "Simpan anggaran" (primary, disabled until category and limit are set). In edit mode also "Hapus anggaran" (text, danger).
- **Bottom bar:** hidden.

### 2.11 Konfirmasi hapus anggaran
- **Sheet over the budget form (edit mode) or budget list.**
- **Title:** "Hapus anggaran [kategori]?"
- **Body:** "Batas Rp [limit] untuk [kategori] akan dihapus. Pengeluaran yang sudah dicatat tetap ada di daftar transaksi."
- **Buttons:** "Batal" and "Ya, hapus".

### 2.12 Kelola kategori
- **Purpose:** manage categories.
- **Header:** back button, title.
- **Segmented toggle:** Pengeluaran / Pemasukan. Changes the list.
- **Rows:** colored square, name, sub-line ("Bawaan" or "Buatan sendiri", and usage count).
- **Actions per row:**
  - Default categories: "Ubah" (rename is allowed; see rule 5.2), "Sembunyikan" (hides from forms).
  - Custom categories: "Ubah", "Sembunyikan", "Hapus".
  - Hidden categories: "Tampilkan" (restores them).
- **Bottom:** hint text "Kategori bawaan tidak bisa dihapus, hanya disembunyikan", button "Tambah kategori".
- **Bottom bar:** hidden.

### 2.13 Tambah kategori
- **Purpose:** create a custom category.
- **Fields:** type toggle (Pengeluaran default), name (max 20 characters), color (6 swatches, one selected, default purple), live preview chip.
- **Button:** "Simpan kategori" (disabled until name is valid and unique within the type).
- **Bottom bar:** hidden.

### 2.14 Konfirmasi hapus kategori
- **Sheet over Kelola kategori.** Shown only for custom categories.
- **Title:** "Hapus kategori [nama]?"
- **Body:** "Kategori ini dipakai di [n] transaksi. Transaksi tersebut akan dipindah ke Lainnya. Tindakan ini tidak bisa dibatalkan."
- **If the category is unused**, body: "Kategori ini belum dipakai. Tindakan ini tidak bisa dibatalkan."
- **Buttons:** "Batal" and "Ya, hapus".

### 2.15 Cadangan data
- **Purpose:** backup and restore.
- **Contents:** status card (count of transactions stored on this device, last backup date or "belum pernah"), export section (CSV and JSON buttons), import section (file picker area, duplicate rule note), warning card ("Data hanya tersimpan di browser atau perangkat ini...").
- **Bottom bar:** hidden.

## 3. Form and data behavior

- **Amount input:** digits only. Stored as an integer in rupiah (no decimals). Display with dots as thousand separators. Max value: 999.999.999.999.
- **Date:** default today (device time, Asia/Jakarta by default). Cannot be in the future for expenses; income may be dated ahead only if the user chooses (default rule: disallow future dates for both, keep it simple for MVP).
- **Required fields to save a transaction:** type, amount > 0, category, account, date.
- **Note:** optional, max 60 characters.
- **Save feedback:** a short toast at the bottom, above the bar: "Transaksi disimpan" (auto-dismiss in 2 seconds).
- **Delete feedback:** toast "Transaksi dihapus" with an "Urungkan" (undo) action for 5 seconds. Undo restores the item. (Recommended; the design does not show it. Add it to the first build.)

## 4. Calculation rules

- **Masuk (income total):** sum of all income transactions in the month.
- **Keluar (expense total):** sum of all expense transactions in the month.
- **Saldo bersih:** income total − expense total, for the month only (not all-time). Show as "Rp 211.998" or "−Rp 123" if negative.
- **Tingkat tabungan (savings rate):** (income − expense) ÷ income × 100, one decimal, comma as decimal separator ("99,9%").
  - If income = 0: show "—" and the hint "Tambah pemasukan untuk melihat tingkat tabungan". (Design did not cover this.)
  - If the result is negative: show it with a minus sign in expense color.
- **Category share:** category total ÷ total of that type × 100, rounded to a whole number. Show both amount and share.
- **Budget spent:** sum of expense transactions in that category for the month. Budgets do not carry over to the next month automatically; the next month uses the same limit unless edited.
- **Budget status:** see 01-design-system 5.16.
- **Remaining budget:** limit − spent. Show "Sisa Rp X" when positive, "Lebih Rp X" when over.

## 5. Category and data rules

1. Default categories for expense: Makan & Minum, Transportasi, Belanja, Hiburan, Kesehatan, Tagihan, Lainnya.
2. Default categories for income: Gaji, Freelance, Bonus & THR, Investasi, Hadiah, Lainnya.
3. Default categories cannot be deleted. They can be renamed or hidden.
4. Custom categories can be deleted. Deleting moves their transactions to "Lainnya" of the same type and removes their budget.
5. Hidden categories do not appear in the Tambah form but stay in past transactions and reports.
6. Category name: 1–20 characters, unique within its type (case-insensitive).
7. Each category has one color from the palette.

## 6. Budget rules

- One budget per expense category per month (in MVP, one budget per category, applies to every month until edited).
- Deleting a budget does not change any transaction.
- Editing a budget's limit changes the bar and status immediately.
- Budgets are for expenses only.

## 7. Backup rules

- **Export CSV:** one row per transaction, columns: date (YYYY-MM-DD), type (income/expense), amount (integer), category, account, note. UTF-8 with BOM so Excel opens Indonesian characters correctly.
- **Export JSON:** the full data set (accounts, categories, transactions, budgets) with a `version` field.
- **Import:** accepts the JSON format from Saku. CSV import is optional for the first build. Duplicate rule: a transaction is a duplicate when date, type, amount, category, account, and note all match an existing one. Duplicates are skipped and counted in the result message: "12 transaksi ditambahkan, 3 dilewati karena sudah ada."
- **Import never deletes** existing data.
- **Warning:** show the warning card on the Cadangan screen every time.

## 8. Empty and error states

| Situation | What to show |
|---|---|
| Month with no transactions (Transaksi) | Transaksi kosong |
| Month with no transactions (Ringkasan) | Ringkasan kosong |
| No budgets | Empty state on Anggaran |
| No custom categories | Hide the custom section, no empty state needed |
| Save fails (storage full or blocked) | Toast "Gagal menyimpan. Coba lagi." with the data kept in the form |
| Import file invalid | Inline message under the import area: "File tidak valid. Pilih file CSV atau JSON dari Saku." |
| Export fails | Toast "Gagal mengekspor data." |

## 9. Copy reference (Indonesian)

Use these exact strings. They match the canvas.

- Tambah transaksi / Tambah pengeluaran / Transaksi Baru
- Pemasukan / Pengeluaran / Masuk / Keluar
- Jumlah / Kategori / Akun / Tanggal / Catatan (opsional)
- Simpan transaksi / Simpan Pengeluaran / Simpan perubahan
- Isi jumlah dan kategori dulu
- Ubah / Hapus / Batal / Ya, hapus
- Hapus transaksi? / Hapus anggaran [kategori]? / Hapus kategori [nama]?
- Belum ada transaksi bulan ini / Belum ada data untuk diringkas / Belum ada anggaran
- Saldo bersih / Tingkat tabungan / Pemasukan vs pengeluaran
- Anggaran / Atur anggaran baru / Simpan anggaran / Ingatkan saat 80% terpakai
- Aman / Hampir habis / Lewat batas / Sisa / Lebih
- Kelola kategori / Tambah kategori / Simpan kategori / Sembunyikan / Tampilkan / Bawaan / Buatan sendiri
- Cadangan & ekspor data / Ekspor CSV / Ekspor JSON / Impor dari cadangan
- Data hanya tersimpan di browser atau perangkat ini. Jika data dihapus atau ganti perangkat, buat cadangan dulu.

## 10. Data model (suggested)

```
Account      { id, name, createdAt }
Category     { id, name, type: "income" | "expense", color, isDefault, isHidden, createdAt }
Transaction  { id, type: "income" | "expense", amount (integer rupiah), categoryId, accountId, date (YYYY-MM-DD), note, createdAt, updatedAt }
Budget       { id, categoryId, limit (integer rupiah), alertAt80: boolean, createdAt, updatedAt }
```

Keep existing transactions. If the old app used different fields, write a migration that maps them to this model before the UI changes.
