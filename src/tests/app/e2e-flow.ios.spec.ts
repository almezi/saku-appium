/**
 * TC-E2E on iOS — end-to-end flow: input income and expense through Tambah →
 * see both in the Transaksi list → see the Ringkasan summaries/balance update.
 * 1:1 port of e2e-flow.spec.ts (Android is the source of truth for cases and
 * assertions; only the driver layer changes: byTag → iosByTag, TambahPage →
 * TambahIosPage). Tagged @e2e (@e2e is the sibling tier for single-screen flows).
 */
import { iosByTag } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { categories } from "../../config/categories";
import { TambahIosPage } from "../../pageobjects/tambah.ios.page";
import { DaftarIosPage } from "../../pageobjects/daftar.ios.page";
import { RingkasanIosPage } from "../../pageobjects/ringkasan.ios.page";
import { formatRp } from "../../helpers/money";
import { APP_COLD_START_IOS } from "../../config/timeouts";

const INCOME = 250_000;
const EXPENSE = 50_000;

describe("TC-E2E — income + expense flow → list → summary @e2e", () => {
  const tambah = new TambahIosPage();
  const daftar = new DaftarIosPage();
  const ringkasan = new RingkasanIosPage();

  before(async () => {
    await expect(iosByTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START_IOS });
  });

  it("income saved via Tambah appears in Transaksi list and Ringkasan income card @e2e", async () => {
    await tambah.open();
    await tambah.fillForm({
      type: "pemasukan",
      amount: INCOME,
      categoryId: categories.income.salary,
    });
    await tambah.save();

    await daftar.open();
    expect(await daftar.summaryIncome()).toBe(INCOME);
    expect(await daftar.summaryExpense()).toBe(0);

    await ringkasan.open();
    expect(await ringkasan.incomeTotal()).toBe(INCOME);
    expect(await ringkasan.balanceValue()).toBe(INCOME);
    expect(await ringkasan.balanceText()).toBe(formatRp(INCOME));
  });

  it("expense saved via Tambah appears in Transaksi list and decrements Ringkasan balance @e2e", async () => {
    await tambah.open();
    await tambah.fillForm({
      type: "pengeluaran",
      amount: EXPENSE,
      categoryId: categories.expense.dailyFood,
    });
    await tambah.save();

    await daftar.open();
    expect(await daftar.summaryIncome()).toBe(INCOME);
    expect(await daftar.summaryExpense()).toBe(EXPENSE);

    await ringkasan.open();
    expect(await ringkasan.expenseTotal()).toBe(EXPENSE);
    expect(await ringkasan.balanceValue()).toBe(INCOME - EXPENSE);
    expect(await ringkasan.balanceText()).toBe(formatRp(INCOME - EXPENSE));
  });
});
