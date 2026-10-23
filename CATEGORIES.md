# CATEGORIES

IDs are stable and never change. Default categories keep their display name in string resources; a custom or renamed category stores its own text in `customName`, which wins over the resource.

## Columns

| Column | Meaning |
|---|---|
| `id` | stable key, referenced by transactions and budgets |
| `nameRes` | string resource name, empty for custom categories |
| `groupId` | expense grouping, `null` for income and custom categories |
| `countsInTotals` | `false` excludes the category from income, expense and balance totals |
| `type` | `pemasukan` or `pengeluaran` |
| `colorHex` | one of the eight palette colors in `tokens.css`, assigned once on first run |
| `isDefault` | seeded category, cannot be deleted |
| `isHidden` | hidden categories stay out of the Tambah form but keep their history |
| `customName` | rename, or the name of a custom category |

## Rules

- Only `inc_transfer_in`, `exp_finance_investment` and `exp_finance_savings` have `countsInTotals = false`
- Default categories can be renamed and hidden, never deleted
- Custom categories can be deleted. The delete moves their transactions to "Lainnya" of the same type and removes their budget, all in one database transaction
- Hidden categories stay visible in the Transaksi list and in reports
- Category names are 1-20 characters and unique per type, compared case-insensitively
- Custom category ids start with `cus_` and are never reused
- Tests reference categories by ID, never by name

## Income (9)

| ID | Name (id-ID) | countsInTotals |
|---|---|---|
| inc_salary | Gaji | true |
| inc_freelance | Freelance | true |
| inc_bonus_thr | Bonus & THR | true |
| inc_investment | Investasi | true |
| inc_sales | Penjualan | true |
| inc_refund | Refund | true |
| inc_transfer_in | Transfer Masuk | false |
| inc_gift | Hadiah | true |
| inc_other | Lainnya | true |

## Expense (27)

| Group | ID | Name (id-ID) | countsInTotals |
|---|---|---|---|
| grp_finance | exp_finance_investment | Investasi | false |
| grp_finance | exp_finance_savings | Tabungan | false |
| grp_finance | exp_finance_transfer_out | Transfer Keluar | true |
| grp_finance | exp_finance_insurance | Asuransi | true |
| grp_finance | exp_finance_tax | Pajak | true |
| grp_finance | exp_finance_other | Lainnya (Keuangan) | true |
| grp_daily | exp_daily_food | Makanan & Minuman | true |
| grp_daily | exp_daily_groceries | Belanja Bulanan | true |
| grp_daily | exp_daily_household | Kebutuhan Rumah Tangga | true |
| grp_daily | exp_daily_other | Lainnya (Harian) | true |
| grp_health | exp_health_doctor | Dokter | true |
| grp_health | exp_health_medicine | Obat-obat | true |
| grp_health | exp_health_gym | Olahraga / Gym | true |
| grp_health | exp_health_other | Lainnya (Kesehatan) | true |
| grp_lifestyle | exp_lifestyle_clothing | Pakaian | true |
| grp_lifestyle | exp_lifestyle_electronics | Elektronik | true |
| grp_lifestyle | exp_lifestyle_grooming | Perawatan Diri | true |
| grp_lifestyle | exp_lifestyle_other | Lainnya (Gaya Hidup) | true |
| grp_transport | exp_transport_fuel | Bahan Bakar | true |
| grp_transport | exp_transport_parking | Parkir | true |
| grp_transport | exp_transport_public | Transportasi Umum | true |
| grp_transport | exp_transport_travel | Perjalanan / Travel | true |
| grp_transport | exp_transport_other | Lainnya (Transportasi) | true |
| grp_education | exp_education_course | Kursus / Pelatihan | true |
| grp_education | exp_education_books | Buku / Edukasi | true |
| grp_education | exp_education_other | Lainnya (Pendidikan) | true |
| grp_other | exp_other | Lainnya | true |

`exp_other` is the fallback target when a custom category is deleted. `exp_finance_investment` and `exp_finance_savings` keep `countsInTotals = false` so that savings moves do not cancel real spending in the monthly total.