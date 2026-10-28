/**
 * Stable category and account IDs (TESTABILITY.md / AccountSeed.kt).
 * Tests reference categories and accounts by ID, never by display name.
 */
export const categories = {
  income: {
    salary: "inc_salary",
    freelance: "inc_freelance",
    bonusThr: "inc_bonus_thr",
    investment: "inc_investment",
    sales: "inc_sales",
    refund: "inc_refund",
    transferIn: "inc_transfer_in", // countsInTotals = false
    gift: "inc_gift",
    other: "inc_other",
  },
  expense: {
    financeInvestment: "exp_finance_investment", // countsInTotals = false
    financeSavings: "exp_finance_savings", // countsInTotals = false
    dailyFood: "exp_daily_food",
    dailyGroceries: "exp_daily_groceries",
    transportFuel: "exp_transport_fuel",
    transportPublic: "exp_transport_public",
    // Verified on the live kategori screen: expense "other" categories are
    // namespaced per group; a bare `exp_other` does not exist.
    dailyOther: "exp_daily_other",
  },
} as const;

export const accounts = {
  tunai: "acc_tunai",
  bca: "acc_bca",
  gopay: "acc_gopay",
} as const;

export type TransactionType = "pemasukan" | "pengeluaran";
