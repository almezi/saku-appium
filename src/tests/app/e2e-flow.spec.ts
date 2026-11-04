/**
 * TC-E2E — end-to-end flow (rollout, unnumbered id): input income and expense
 * through Tambah → see both in the Transaksi list → see the Ringkasan
 * summaries/balance update. Spans Tambah → Daftar → Ringkasan, so it is
 * @integration, not a single-screen case. `@e2e` is not in the enforced
 * test-type vocabulary (@sanity/@regression/@integration), so @integration is
 * the correct tier for a multi-screen flow.
 *
 * Android spec; iOS twin: e2e-flow.ios.spec.ts, same ids/assertions,
 * `createTransactionIos` + iOS page twins. Locators from TESTABILITY.md tags.
 */
import { byTag } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { categories } from "../../config/categories";
import { TambahPage } from "../../pageobjects/tambah.page";
import { DaftarPage } from "../../pageobjects/daftar.page";
import { RingkasanPage } from "../../pageobjects/ringkasan.page";
import { formatRp } from "../../helpers/money";
import { APP_COLD_START } from "../../config/timeouts";

const INCOME = 250_000;
const EXPENSE = 50_000;

describe("TC-E2E — income + expense flow → list → summary @e2e", () => {
  const tambah = new TambahPage();
  const daftar = new DaftarPage();
  const ringkasan = new RingkasanPage();

  before(async () => {
    await expect(byTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START });
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
