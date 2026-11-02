/**
 * TC-ACC — account picker (rollout S2) on Android, all @regression.
 * Direct assertions over TambahPage.selectAccount / getAccountText that
 * TC-INC-06's fillForm exercises behaviourally but never asserts directly.
 * iOS twin: account-picker.ios.spec.ts, same TC-ACC ids.
 * Locators are the test tags of TESTABILITY.md.
 */
import { byTag } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { accounts } from "../../config/categories";
import { TambahPage } from "../../pageobjects/tambah.page";
import { APP_COLD_START } from "../../config/timeouts";

describe("TC-ACC — account picker (S2) @regression", () => {
  const tambah = new TambahPage();

  before(async () => {
    await expect(byTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START });
  });

  it("TC-ACC-01 tapping tambah_select_account opens the account picker @regression", async () => {
    await tambah.open();
    await byTag(tags.tambah.selectAccount).click();
    await expect(byTag(tags.tambah.sheetAccount)).toBeDisplayed();
    await tambah.dismissAccountSheet();
  });

  it("TC-ACC-03 switching account updates the account label @regression", async () => {
    await tambah.open();
    await tambah.selectAccount(accounts.bca);
    expect(await tambah.getAccountText()).toBe("BCA");
    // Return to the default so the next case starts from Tunai.
    await tambah.selectAccount(accounts.tunai);
    expect(await tambah.getAccountText()).toBe("Tunai");
  });

  it("TC-ACC-04 dismissing the picker without selecting keeps the account @regression", async () => {
    await tambah.open();
    const before = await tambah.getAccountText();
    await byTag(tags.tambah.selectAccount).click();
    await expect(byTag(tags.tambah.sheetAccount)).toBeDisplayed();
    await tambah.dismissAccountSheet();
    expect(await tambah.getAccountText()).toBe(before);
  });
});
