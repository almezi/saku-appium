/**
 * Indonesian display-label mapping for category IDs.
 *
 * Source of truth: TESTABILITY.md "CATEGORIES (merged)" section — IDs are
 * stable, display names live in string resources. The release APK v2.2 does
 * NOT expose `tambah_category_item_<id>` resource-ids on the Tambah category
 * sheet (BUG_Found-07), so the only stable locator signal for sheet rows is
 * their rendered text label. This map provides that lookup.
 *
 * The locator-rule exception: TESTABILITY.md "never locate by visible text" is
 * violated here only because the app ships no test tags on sheet items in v2.2.
 * Once the app tags sheet rows (TestTags.kt: TAMBAH_CATEGORY_ITEM_<id>), this
 * file should be deleted and selectCategory should revert to byTag().
 */
export const categoryLabels: Record<string, string> = {
  // Income (9)
  inc_salary: "Gaji",
  inc_freelance: "Freelance",
  inc_bonus_thr: "Bonus & THR",
  inc_investment: "Investasi",
  inc_sales: "Penjualan",
  inc_refund: "Refund",
  inc_transfer_in: "Transfer Masuk",
  inc_gift: "Hadiah",
  inc_other: "Lainnya",

  // Expense — finance (6)
  exp_finance_investment: "Investasi",
  exp_finance_savings: "Tabungan",
  exp_finance_transfer_out: "Transfer Keluar",
  exp_finance_insurance: "Asuransi",
  exp_finance_tax: "Pajak",
  exp_finance_other: "Lainnya (Keuangan)",

  // Expense — daily (4)
  exp_daily_food: "Makanan & Minuman",
  exp_daily_groceries: "Belanja Bulanan",
  exp_daily_household: "Kebutuhan Rumah Tangga",
  exp_daily_other: "Lainnya (Harian)",

  // Expense — health (4)
  exp_health_doctor: "Dokter",
  exp_health_medicine: "Obat-obatan",
  exp_health_gym: "Olahraga / Gym",
  exp_health_other: "Lainnya (Kesehatan)",

  // Expense — lifestyle (4)
  exp_lifestyle_clothing: "Pakaian",
  exp_lifestyle_electronics: "Elektronik",
  exp_lifestyle_grooming: "Perawatan Diri",
  exp_lifestyle_other: "Lainnya (Gaya Hidup)",

  // Expense — transport (5)
  exp_transport_fuel: "Bahan Bakar",
  exp_transport_parking: "Parkir",
  exp_transport_public: "Transportasi Umum",
  exp_transport_travel: "Perjalanan / Travel",
  exp_transport_other: "Lainnya (Transportasi)",

  // Expense — education (3)
  exp_education_course: "Kursus / Pelatihan",
  exp_education_books: "Buku / Edukasi",
  exp_education_other: "Lainnya (Pendidikan)",

  // Expense — other (1)
  exp_other: "Lainnya",
} as const;
