# Saku Design System

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
