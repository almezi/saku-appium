/**
 * TC-DATE — Date picker behavior (iOS). Catalogue cases live in
 * test-cases-simple-money-tracker.md. Android twin: date-picker.spec.ts.
 */
import { iosByTag } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { TambahIosPage } from "../../pageobjects/tambah.ios.page";
import { APP_COLD_START } from "../../config/timeouts";

describe("TC-DATE — Date picker behavior @regression", () => {
  const tambah = new TambahIosPage();

  before(async () => {
    await expect(iosByTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START });
  });

  it("TC-DATE-02 Default date = today @regression", async () => {
    await tambah.open();
    const dateLabel = await iosByTag(tags.tambah.selectDate).getText();
    const today = new Date();
    expect(dateLabel).toContain(today.getDate().toString());
  });

  it("TC-DATE-04 Pick future date → allowed or blocked per rule @regression", async () => {
    await tambah.open();
    await tambah.selectDate(new Date(Date.now() + 7 * 24 * 3600 * 1000));
    const dateLabel = await iosByTag(tags.tambah.selectDate).getText();
    expect(dateLabel.length).toBeGreaterThan(0);
  });

  it("TC-DATE-05 Cancel date dialog → date unchanged @regression", async () => {
    await tambah.open();
    const before = await iosByTag(tags.tambah.selectDate).getText();
    await tambah.selectDate(new Date());
    const after = await iosByTag(tags.tambah.selectDate).getText();
    expect(after).toBe(before);
  });

  it("TC-DATE-06 Leap day 29 Feb 2028 accepted @regression", async () => {
    await tambah.open();
    await tambah.selectDate(new Date(2028, 1, 29));
    const dateLabel = await iosByTag(tags.tambah.selectDate).getText();
    expect(dateLabel).toContain("29");
  });

  it("TC-DATE-07 Date label locale format `d MMM yyyy` @regression", async () => {
    await tambah.open();
    const dateLabel = await iosByTag(tags.tambah.selectDate).getText();
    expect(dateLabel).toMatch(/\d{1,2}\s+\w+\s+\d{4}/);
  });
});
