# Saku Revamp: Design and Build Package

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
