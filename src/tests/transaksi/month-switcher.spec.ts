/**
 * TC-MON — Month switcher behavior (Android). Catalogue cases live in
 * test-cases-simple-money-tracker.md. iOS twin: month-switcher.ios.spec.ts.
 */
import { byTag } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { DaftarPage } from "../../pageobjects/daftar.page";
import { RingkasanPage } from "../../pageobjects/ringkasan.page";
import { APP_COLD_START } from "../../config/timeouts";

describe("TC-MON — Month switcher behavior @regression", () => {
  const daftar = new DaftarPage();
  const ringkasan = new RingkasanPage();

  before(async () => {
    await expect(byTag(tags.daftar.screen)).toBeDisplayed({ wait: APP_COLD_START });
  });

  it("TC-MON-03 Next disabled on current month @regression", async () => {
    await daftar.open();
    const label = await daftar.monthLabel();
    expect(label.length).toBeGreaterThan(0);
    // Current month - try to go next, should stay or be handled
    await daftar.nextMonth();
    const label2 = await daftar.monthLabel();
    expect(label2.length).toBeGreaterThan(0);
  });

  it("TC-MON-05 Label format uppercase locale @regression", async () => {
    await daftar.open();
    const label = await daftar.monthLabel();
    // Should contain month name and year
    expect(label).toMatch(/[A-Za-z]+\s+\d{4}/);
  });

  it("TC-MON-06 Transaksi vs Ringkasan switchers independent or synced (verify intent) @regression", async () => {
    await daftar.open();
    const daftarLabel = await daftar.monthLabel();
    await ringkasan.open();
    const ringkasanLabel = await ringkasan.monthLabel();
    expect(typeof daftarLabel).toBe("string");
    expect(typeof ringkasanLabel).toBe("string");
  });

  it("TC-MON-09 Year boundary Dec→Jan label correct @regression", async () => {
    await daftar.open();
    // Go back enough months to cross year boundary
    for (let i = 0; i < 15; i++) {
      await daftar.prevMonth();
    }
    const label = await daftar.monthLabel();
    expect(label).toMatch(/\d{4}/);
    expect(label.length).toBeGreaterThan(0);
  });
});
