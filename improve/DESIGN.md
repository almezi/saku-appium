# Saku Design Package

## 00-README


This package turned the Saku canvas design into the build instructions used for this app's redesign (build complete — specs in `01`/`02` remain as reference).

## What is in this package

| File | Purpose | Give to the AI? |
|---|---|---|
| `00-README.md` | This overview and how to use the package | No (for you) |
| `01-design-system.md` | Colors, type, spacing, radius, and every component | Yes |
| `tokens.css` | Design tokens as CSS variables, ready to paste into your project | Yes |
| `02-screens-and-rules.md` | Every screen, its states, navigation, and business rules | Yes |

## How to use it

1. **Read `02-screen-inventory` first** so you know the full scope.
2. **Check your current stack.** Vibe coding works best when the AI knows your framework (React, Vue, Flutter, plain HTML, etc.).
3. **Copy `tokens.css` into your project** before anything else. Every later step uses these variables.
4. **Work from `02-screens-and-rules.md`** for screen behaviour and business rules.
5. **Test after each step** on a phone-sized screen (390 px wide).

## Ground rules for the AI

- Keep the existing data. Do not wipe the user's stored transactions when changing the UI.
- Use the exact copy in Indonesian from the spec. Do not translate it into English.
- Do not use emoji as icons in the new UI. Use the colored dot or simple SVG icons from the spec.
- Every money amount uses the format `Rp 212.121` (dot as thousand separator, no decimals).
- Build the screens with the components in `01-design-system.md`. Do not invent new button or card styles.

## Known decisions to confirm before building

These are open decisions. The AI should ask you before implementing them, or you can decide now:

1. **Expense color.** The Tambah Pengeluaran screen uses pink-red (`#f0708a`). The Transaksi list and Ringkasan use amber (`#fb923c`). Pick one. This package uses **pink-red for expense everywhere** because it matches the Pengeluaran form in your app. Change `--color-expense` in `tokens.css` if you prefer amber.
2. **Minimum touch target.** Some buttons in the design are 36 px tall. The package sets the minimum to **44 px** for every tappable element.
3. **Savings rate with zero income.** The design does not cover this case. This package shows `—` instead of a percentage.
4. **Account picker sheet and budget creation validation.** These have field designs but no full flow yet. The spec below defines the expected behavior.
5. **Transfers between accounts.** Not designed yet. Leave them out of the first build.

## Scope of the first build (MVP)

In scope:
- Add income and expense (with account and category)
- Transaction list with edit, delete (with confirmation), and month navigation
- Monthly summary (balance, income vs expense, savings rate, category breakdown)
- Accounts (picker on the add form; create or rename accounts in a simple list)
- Budgets per category (create, edit, delete with confirmation)
- Categories (default and custom; add, rename, hide; delete custom only)
- Backup: export CSV or JSON, import from file
- Empty states for the transaction list, the summary, and budgets

Out of scope for this build:
- Transfers between accounts
- Recurring transactions
- Multi-currency
- Cloud sync or login

## Where the design lives

The canvas named "Saku Revamp" contains these artboards: Tambah, Tambah Pengeluaran, Transaksi, Transaksi Kosong, Ubah transaksi, Konfirmasi hapus, Ringkasan, Ringkasan Kosong, Anggaran, Anggaran Baru, Ubah anggaran, Konfirmasi hapus anggaran, Kelola kategori, Tambah kategori, Konfirmasi hapus kategori, and Cadangan data. Use the artboard names as the screen names in your code.

---

## 01-design-system


Use the variables in `tokens.css`. Do not hard-code colors or sizes in components.

## 1. Principles

- **Dark only** for this version. One theme, no light mode.
- **Numbers are read first.** Amounts use the monospace font and are large on summary screens.
- **Color is never the only signal.** Income and expense also use an arrow icon and a word ("Pemasukan", "Pengeluaran"). Budget states also use a text label.
- **Every tappable thing is at least 44 px tall.**
- **Mobile first.** Design for 390 px width. Desktop is out of scope for this version.

## 2. Typography

| Role | Font | Size | Weight | Use |
|---|---|---|---|---|
| Screen title | DM Sans | 20–22 px | 700 | "Tambah transaksi", "Anggaran" |
| Section label | DM Sans | 12 px | 400 | Uppercase, letter-spacing 0.08em, muted color. "KATEGORI", "AKUN" |
| Body | DM Sans | 14–15 px | 400–600 | Row names, notes |
| Caption | DM Sans | 12–13 px | 400 | Helper text, sub-labels |
| Amount large | DM Mono | 34 px | 500 | Net balance |
| Amount medium | DM Mono | 24–30 px | 500 | Input amount, budget total |
| Amount small | DM Mono | 15–17 px | 500 | List amounts, summary cards |
| Month label | DM Mono | 13–14 px | 500 | "OKTOBER 2026", uppercase, letter-spacing 0.12em, accent violet |

All amounts use `font-variant-numeric: tabular-nums` so digits line up.

## 3. Color roles

| Role | Token | Hex | Use |
|---|---|---|---|
| Background | `--color-bg` | #0e0e12 | Screen background |
| Surface | `--color-surface` | #17171d | Cards, inputs, nav bar |
| Raised surface | `--color-surface-raised` | #1c1c26 | Secondary buttons, sheets |
| Border | `--color-border` | #26262e | Card and input borders |
| Primary | `--color-primary` | #5b4bd6 | Main save button (white text) |
| Income | `--color-income` | #6ee7a0 | Income amounts, income toggle, "Aman" |
| Expense | `--color-expense` | #f0708a | Expense amounts, expense toggle |
| Warning | `--color-warning` | #f6c453 | "Hampir habis" |
| Danger | `--color-danger` | #b3373f | Confirm-delete button (white text) |

Contrast check: body text (#f2f2f5 and #d6d6de) and muted text (#9a9aa8) on the surface (#17171d) meet WCAG AA. Keep placeholder text at #8a8a98 or lighter.

## 4. Spacing and radius

- Screen padding: 56 px top (status bar), 20 px left and right, 20–24 px bottom.
- Gap between sections: 14 px. Gap inside a card: 10–12 px. Gap between chips: 8 px.
- Radius: inputs 14 px, cards 16 px, summary cards 18 px, buttons 12–14 px, sheets 24 px (top corners only), bottom nav 22 px.

## 5. Components

### 5.1 Primary button
- Height 52 px, full width, radius 14 px, background `--color-primary`, text white 16 px bold.
- Disabled: background `--color-surface`, text `--color-text-disabled`. Show the reason above it, in 13 px muted text (e.g. "Isi jumlah dan kategori dulu").

### 5.2 Secondary button
- Height 44–52 px, radius 12–14 px, background `--color-surface-raised`, border `--color-border-strong`, text `--color-text-secondary` 14–15 px semibold.

### 5.3 Destructive button
- Background `--color-danger` with white text for confirming a delete (only inside a confirmation sheet).
- In a row or card: background `--color-danger-surface`, border `--color-danger-border`, text `--color-danger-text`.
- Plain text delete (e.g. "Hapus transaksi" at the bottom of an edit screen): no background, text `--color-danger-text`, height 44 px.

### 5.4 Segmented toggle (Pemasukan / Pengeluaran)
- Container: surface background, border, radius 14 px, padding 4 px.
- Options: 44 px tall, radius 10 px, 15 px semibold.
- Selected income: background `--color-income-selected`, border `--color-income-border`, text `--color-income`.
- Selected expense: background `--color-expense-surface`, border `--color-expense-border`, text `--color-expense`.
- Unselected: transparent background, text `--color-text-muted`.

### 5.5 Amount input
- Container: surface, border, radius 16 px, padding 12 px 16 px.
- Label (section label style) above the value.
- Value: DM Mono 30 px. Color follows the selected type (income green or expense pink).
- Typing: digits only; dot thousand separators added as the user types. Max 12 digits.
- Empty value shows "Rp 0" in muted color.

### 5.6 Category chip grid (Tambah screens)
- 3 columns on 390 px. Each chip: 56 px tall, radius 14 px, 13 px semibold, colored square 12 px (radius 3 px) before the label.
- Selected: border and background from the type color (income: green; expense: pink-red), text `--color-text`.
- Unselected: surface background, border `--color-border`, text `--color-text-secondary`.
- Long names wrap to two lines, never truncate silently.

### 5.7 Category chip row (Pengeluaran screen variant)
- Flex wrap, pill chips 40 px tall, padding 0 12 px, radius 12 px, colored square 10 px.
- Use this layout if the category list grows past 6 items.

### 5.8 Select field (account, category)
- Height 48 px, surface background, border, radius 14 px, 15 px semibold text, chevron icon (12 px, muted) on the right.
- Opens a bottom sheet list (see 5.12).

### 5.9 Date and note fields
- Date: height 48 px, surface, border, radius 14 px, 15 px text, short format ("9 Okt 2026").
- Note: height 48 px, placeholder text "Tambah catatan (opsional)". Max 60 characters.

### 5.10 Transaction card (list row)
- Card: surface, border, radius 16 px, padding 14 px, two stacked parts.
- Top row: 40 px rounded square icon (radius 12 px) with the category's colored tint, name (15 px semibold) and type label (12 px muted) on the left, amount (DM Mono 15 px, income green or expense pink-red) on the right.
- Bottom row: two buttons side by side, 40 px tall: "Ubah" (secondary) and "Hapus" (destructive, card style).
- Group cards by day with a day header line (section label style on the left, day total in mono on the right).

### 5.11 Summary card (Ringkasan)
- Balance card: surface, border, radius 18 px, padding 20 px. Label "SALDO BERSIH", balance in DM Mono 34 px (green if positive, muted if zero). Two sub-tiles below: Pemasukan (green tint) and Pengeluaran (pink tint), each with radius 12 px.
- Breakdown cards: surface, border, radius 16 px, padding 16 px. Section label, rows with name left and amount right, bar 8 px high, radius 4 px, background `--color-border`, fill in the type color.

### 5.12 Bottom sheet
- Anchored to the bottom. Background `--color-surface-raised`, top border `--color-border-strong`, radius 24 px on top corners, padding 22 px 20 px 28 px.
- Drag handle: 40 × 4 px, radius 2 px, color `#3a3a48`, centered.
- Scrim behind: `--color-scrim`.
- Two buttons side by side at the bottom. Cancel on the left (secondary), confirm on the right (primary or danger).

### 5.13 Bottom navigation
- Floating bar: 64 px tall, 16 px from left and right, 20 px from bottom, surface background, border, radius 22 px.
- Three items: Tambah, Transaksi, Ringkasan. Active item: violet text (`--color-accent-text`), bold, background `--color-accent-surface`, radius 14 px, padding 10 px 18 px.
- Hide the bar on edit, confirm, and budget form screens. Show it on Tambah, Transaksi, and Ringkasan only.
- Reserve 84 px of bottom space on every screen that shows the bar, so content never sits under it.

### 5.14 Month switcher
- Left and right buttons 40 × 40 px, radius 12 px, surface background, border. The next-month button is disabled (text `--color-text-disabled`) when showing the current month. Do not allow navigating into the future.
- Center label: DM Mono 14 px, uppercase, letter-spacing 0.12em, accent violet.

### 5.15 Budget progress row
- Card: surface, border, radius 16 px, padding 14 px, gap 10 px.
- Top line: category name (15 px semibold) on the left, status label on the right (DM Mono 13 px in the status color).
- Bar: 8 px high, fill width = min(spent ÷ limit, 100%). Fill color is the status color.
- Numbers line: "Rp 450.000 dari Rp 500.000" on the left, "Sisa Rp 50.000" or "Lebih Rp 45.000" on the right.
- Action row: "Ubah" and "Hapus" buttons, 40 px tall, half width each.

### 5.16 Budget status
| Spent ÷ limit | Label | Color |
|---|---|---|
| under 75% | Aman | `--color-income` |
| 75% to under 100% | Hampir habis | `--color-warning` |
| 100% or more | Lewat batas | `--color-expense` |

### 5.17 Switch (toggle)
- 48 × 28 px, radius 14 px, padding 3 px. On: background `--color-primary`, knob white 22 px aligned right. Off: background `--color-border-strong`, knob aligned left.

### 5.18 Empty state
- Centered in the free space. Icon 72 px (simple line illustration, muted colors, not emoji). Title 18 px bold. Body 14 px muted, max 2 lines. One primary action, optionally one secondary action below it.

### 5.19 Confirmation for destructive actions
- Always use a bottom sheet (5.12) for delete. Never delete on the first tap.
- Title names the item ("Hapus transaksi?", "Hapus anggaran Belanja?", "Hapus kategori Kopi kantor?").
- Body states the consequence in one or two sentences.
- Buttons: "Batal" (left) and "Ya, hapus" (right, danger).

### 5.20 Back button and header
- Back: 40 × 40 px, radius 12 px, surface background, border, "<" icon 18 px.
- Header: back button, title (20 px bold), optional right-side label (month or action). Height 40 px.

## 6. Icons and category marks

- Do not use emoji as icons in the new UI. (The current app uses emoji; the revamp replaces them.)
- Category marks: a colored square 10–14 px with radius 3–4 px, from the category palette in `tokens.css`.
- Transaction avatars: a 40 px rounded square with the first two letters of the category name (e.g. "MM" for Makan & Minum) in the category color. Use this as a placeholder until you add icons.
- Simple line icons (chevron, plus, arrow) are fine. Use one icon set for the whole app.

## 7. Motion

- Sheets slide up over 200 ms. Respect the reduced-motion setting.
- Button press: scale to 0.98 over 100 ms. No other decorative animation.

---

## 02-screens-and-rules


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

---

