/**
 * TC-CAT — category picker (rollout S3) on Android, all @regression.
 * TC-CAT-05 asserts directly over TambahPage's category picker (exercised
 * behaviourally by TC-INC/TC-EXP's fillForm but never asserted).
 * TC-CAT-08 asserts the category avatar (CategoryAvatar, `avatar_<id>`) which
 * renders on daftar transaction rows — not inside the Tambah picker sheet
 * (its rows carry the colour `mark_<id>` mark, not an avatar).
 * iOS twin: category-picker.ios.spec.ts, same TC-CAT ids.
 * Locators are the test tags of TESTABILITY.md.
 */
import { byTag } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { categories } from "../../config/categories";
import { createTransaction } from "../../helpers/transactions";
import { TambahPage } from "../../pageobjects/tambah.page";
import { DaftarPage } from "../../pageobjects/daftar.page";
import { APP_COLD_START } from "../../config/timeouts";

describe("TC-CAT — category picker (S3) @regression", () => {
  const tambah = new TambahPage();
  const daftar = new DaftarPage();

  before(async () => {
    await expect(byTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START });
  });

  it("TC-CAT-05 dismissing the category picker leaves the form state unchanged @regression", async () => {
    await tambah.open();
    await byTag(tags.tambah.categoryPager).click();
    await expect(byTag(tags.tambah.categorySheetRoot)).toBeDisplayed();
    await tambah.dismissCategorySheet();
    // No category was selected, so the form must be back to its default state.
    expect(await tambah.getHelperText()).toBe("Isi jumlah dan kategori dulu");
    expect(await tambah.isSaveEnabled()).toBe(false);
  });

  it("TC-CAT-08 category avatar initials render on the transaction row @regression", async () => {
    await createTransaction({
      type: "pemasukan",
      amount: 50_000,
      categoryId: categories.income.salary,
    });
    await daftar.open();
    // Newest transaction sorts to the top, so its row (and avatar) is visible.
    expect(await tambah.avatar("inc_salary").isDisplayed()).toBe(true);
  });
});
