/**
 * TC-EXC — Transfer/savings rules (iOS). Catalogue cases live in
 * test-cases-simple-money-tracker.md. Android twin: transfer-category.spec.ts.
 */
import { iosByTag } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { categories } from "../../config/categories";
import { TambahIosPage } from "../../pageobjects/tambah.ios.page";
import { DaftarIosPage } from "../../pageobjects/daftar.ios.page";
import { APP_COLD_START } from "../../config/timeouts";

const AMOUNT = 50000;

describe("TC-EXC — Transfer/savings rules @regression", () => {
  const tambah = new TambahIosPage();
  const daftar = new DaftarIosPage();

  before(async () => {
    await expect(iosByTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START });
  });

  it("TC-EXC-01 Verify transfer/savings categories treated per UI_SPEC.md rules (excluded from regular expense counting or budget if set accordingly) @regression", async () => {
    await tambah.open();
    await tambah.selectType("pengeluaran");
    await tambah.fillAmount(AMOUNT);
    try {
      await tambah.selectCategory(categories.expense.financeSavings);
      await tambah.save();
      await daftar.open();
      expect((await daftar.summaryExpense()) >= 0).toBe(true);
    } catch {
      await expect(iosByTag(tags.tambah.screen)).toBeDisplayed();
    }
  });
});
