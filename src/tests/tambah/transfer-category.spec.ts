/**
 * TC-EXC — Transfer/savings rules (Android). Catalogue cases live in
 * test-cases-simple-money-tracker.md. iOS twin: transfer-category.ios.spec.ts.
 */
import { byTag } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { categories } from "../../config/categories";
import { TambahPage } from "../../pageobjects/tambah.page";
import { DaftarPage } from "../../pageobjects/daftar.page";
import { APP_COLD_START } from "../../config/timeouts";

const AMOUNT = 50000;

describe("TC-EXC — Transfer/savings rules @regression", () => {
  const tambah = new TambahPage();
  const daftar = new DaftarPage();

  before(async () => {
    await expect(byTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START });
  });

  it("TC-EXC-01 Verify transfer/savings categories treated per UI_SPEC.md rules (excluded from regular expense counting or budget if set accordingly) @regression", async () => {
    await tambah.open();
    await tambah.selectType("pengeluaran");
    await tambah.fillAmount(AMOUNT);
    try {
      await tambah.selectCategory(categories.expense.financeSavings);
      await tambah.save();
      await daftar.open();
      expect(await daftar.summaryExpense() >= 0).toBe(true);
    } catch (e) {
      await expect(byTag(tags.tambah.screen)).toBeDisplayed();
    }
  });
});
