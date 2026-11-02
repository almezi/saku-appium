/**
 * TC-CAT on iOS — 1:1 port of category-picker.spec.ts (the Android spec is the
 * source of truth for cases and assertions; only the driver layer changes:
 * byTag -> iosByTag for sheet lookups, system BACK -> scrim tap via
 * TambahIosPage.dismissCategorySheet).
 */
import { iosByTag } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { TambahIosPage } from "../../pageobjects/tambah.ios.page";
import { APP_COLD_START_IOS } from "../../config/timeouts";

describe("TC-CAT — category picker (S3) on iOS @regression", () => {
  const tambah = new TambahIosPage();

  before(async () => {
    await expect(iosByTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START_IOS });
  });

  it("TC-CAT-05 dismissing the category picker leaves the form state unchanged @regression", async () => {
    await tambah.open();
    await iosByTag(tags.tambah.categoryPager).click();
    await expect(iosByTag(tags.tambah.categorySheetRoot)).toBeDisplayed();
    await tambah.dismissCategorySheet();
    // No category was selected, so the form must be back to its default state.
    expect(await tambah.getHelperText()).toBe("Isi jumlah dan kategori dulu");
    expect(await tambah.isSaveEnabled()).toBe(false);
  });

  it("TC-CAT-08 category avatar initials render in the picker @regression", async () => {
    await tambah.open();
    await tambah.selectType("pemasukan");
    await iosByTag(tags.tambah.categoryPager).click();
    await expect(iosByTag(tags.tambah.categorySheetRoot)).toBeDisplayed();
    // Each category row renders its avatar (CategoryAvatar, e.g. avatar_inc_salary).
    expect(await tambah.avatar("inc_salary").isDisplayed()).toBe(true);
    await tambah.dismissCategorySheet();
  });
});
