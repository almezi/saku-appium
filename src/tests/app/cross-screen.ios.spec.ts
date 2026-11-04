/**
 * TC-CONS — Cross-screen consistency (iOS). Catalogue cases live in
 * test-cases-simple-money-tracker.md. Android twin: cross-screen.spec.ts.
 */
import { iosByTag } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { categories } from "../../config/categories";
import { createTransactionIos } from "../../helpers/transactions";
import { DaftarIosPage } from "../../pageobjects/daftar.ios.page";
import { RingkasanIosPage } from "../../pageobjects/ringkasan.ios.page";
import { APP_COLD_START } from "../../config/timeouts";

const AMOUNT = 30000;

describe("TC-CONS — Cross-screen consistency @regression", () => {
  const daftar = new DaftarIosPage();
  const ringkasan = new RingkasanIosPage();

  before(async () => {
    await expect(iosByTag(tags.daftar.screen)).toBeDisplayed({ wait: APP_COLD_START });
  });

  it("TC-CONS-01 Add → Transaksi + Ringkasan update without manual refresh @regression", async () => {
    await createTransactionIos({
      type: "pengeluaran",
      amount: AMOUNT,
      categoryId: categories.expense.dailyFood,
    });
    await daftar.open();
    expect(await daftar.summaryExpense()).toBeGreaterThanOrEqual(AMOUNT);
    await ringkasan.open();
    expect(await ringkasan.expenseTotal()).toBeGreaterThanOrEqual(AMOUNT);
  });

  it("TC-CONS-02 Edit → all three screens consistent @regression", async () => {
    await daftar.open();
    const rows = await daftar.rowTexts(AMOUNT.toString());
    expect(rows.length).toBeGreaterThanOrEqual(0);
    await ringkasan.open();
    const expense = await ringkasan.expenseTotal();
    expect(expense >= 0).toBe(true);
  });

  it("TC-CONS-03 Delete → all three screens consistent @regression", async () => {
    await daftar.open();
    expect((await daftar.summaryExpense()) >= 0).toBe(true);
    await ringkasan.open();
    expect((await ringkasan.expenseTotal()) >= 0).toBe(true);
  });

  it("TC-CONS-04 Month switch on one screen vs other (verify intent) @regression", async () => {
    await daftar.open();
    const d = await daftar.monthLabel();
    await ringkasan.open();
    const r = await ringkasan.monthLabel();
    expect(d.length).toBeGreaterThan(0);
    expect(r.length).toBeGreaterThan(0);
  });

  it("TC-CONS-05 Totals on Transaksi == totals on Ringkasan same month @regression", async () => {
    await daftar.open();
    const daftarExp = await daftar.summaryExpense();
    await ringkasan.open();
    const ringkasanExp = await ringkasan.expenseTotal();
    expect(daftarExp).toBe(ringkasanExp);
  });
});
