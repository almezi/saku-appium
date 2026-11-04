/**
 * TC-ACC on iOS — 1:1 port of account-picker.spec.ts (the Android spec is the
 * source of truth for cases and assertions; only the driver layer changes:
 * byTag -> iosByTag, pages -> their .ios.page twins, system BACK -> scrim tap
 * via TambahIosPage.dismissAccountSheet).
 */
import { iosByTag } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { accounts } from "../../config/categories";
import { TambahIosPage } from "../../pageobjects/tambah.ios.page";
import { APP_COLD_START_IOS } from "../../config/timeouts";

describe("TC-ACC — account picker (S2) on iOS @regression", () => {
  const tambah = new TambahIosPage();

  before(async () => {
    await expect(iosByTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START_IOS });
  });

  it("TC-ACC-01 tapping tambah_select_account opens the account picker @regression", async () => {
    await tambah.open();
    await iosByTag(tags.tambah.selectAccount).click();
    await expect(iosByTag(tags.tambah.sheetAccount)).toBeDisplayed();
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
    await iosByTag(tags.tambah.selectAccount).click();
    await expect(iosByTag(tags.tambah.sheetAccount)).toBeDisplayed();
    await tambah.dismissAccountSheet();
    expect(await tambah.getAccountText()).toBe(before);
  });
});
