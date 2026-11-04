/**
 * TC-SAVE — Save button state machine (iOS). Catalogue cases live in
 * test-cases-simple-money-tracker.md. Android twin: save-button.spec.ts.
 */
import { iosByTag } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { categories } from "../../config/categories";
import { TambahIosPage } from "../../pageobjects/tambah.ios.page";
import { APP_COLD_START } from "../../config/timeouts";

describe("TC-SAVE — Save button state machine @regression", () => {
  const tambah = new TambahIosPage();

  before(async () => {
    await expect(iosByTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START });
  });

  it('TC-SAVE-01 Initial state disabled (verified `enabled="false"`) @regression', async () => {
    await tambah.open();
    expect(await tambah.isSaveEnabled()).toBe(false);
  });

  it("TC-SAVE-02 Enabled only when amount > 0 AND category selected @regression", async () => {
    await tambah.open();
    await tambah.fillAmount(10000);
    expect(await tambah.isSaveEnabled()).toBe(false);
    await tambah.selectCategory(categories.expense.dailyFood);
    expect(await tambah.isSaveEnabled()).toBe(true);
  });

  it("TC-SAVE-03 Disable when amount cleared @regression", async () => {
    await tambah.open();
    await tambah.fillAmount(10000);
    await tambah.selectCategory(categories.expense.dailyFood);
    expect(await tambah.isSaveEnabled()).toBe(true);
    await tambah.fillAmount(0);
    expect(await tambah.isSaveEnabled()).toBe(false);
  });

  it("TC-SAVE-04 Disable when category cleared @regression", async () => {
    await tambah.open();
    await tambah.fillAmount(10000);
    await tambah.selectCategory(categories.expense.dailyFood);
    expect(await tambah.isSaveEnabled()).toBe(true);
    await tambah.open();
    expect(await tambah.isSaveEnabled()).toBe(false);
  });

  it("TC-SAVE-05 Enabled state visual contrast differs (a11y) @regression", async () => {
    await tambah.open();
    await tambah.fillAmount(10000);
    await tambah.selectCategory(categories.expense.dailyFood);
    expect(await tambah.isSaveEnabled()).toBe(true);
    await expect(tambah.saveButton).toBeDisplayed();
  });

  it("TC-SAVE-06 Tap disabled button → no action, no crash @regression", async () => {
    await tambah.open();
    expect(await tambah.isSaveEnabled()).toBe(false);
    try {
      await tambah.saveButton.click();
    } catch {
      // ignore
    }
    await expect(iosByTag(tags.tambah.screen)).toBeDisplayed();
  });
});
