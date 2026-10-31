/**
 * TC-PERS — persistence (Phase 3.C). Run notes in progress.md. Contract:
 * kill/relaunch keeps committed data and resets tab + month; a save raced
 * with force-stop may commit or not — assert only that the DB stays readable;
 * reinstall clears everything.
 */
import { execSync } from "node:child_process";
import { byTag } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { categories } from "../../config/categories";
import { createTransaction } from "../../helpers/transactions";

import { TambahPage } from "../../pageobjects/tambah.page";
import { DaftarPage } from "../../pageobjects/daftar.page";
import { APP_RELAUNCH } from "../../config/timeouts";

const PACKAGE = "id.almezi.simplemoneytracker_kt";
const APK = "resources/SimpleMoneyTrackerKT-v2.2.apk";

const tambah = new TambahPage();
const daftar = new DaftarPage();

describe("TC-PERS — persistence (Phase 3.C) @regression", () => {
  const seeded = [150_000, 75_000];
  const seededTotal = seeded.reduce((a, b) => a + b, 0);

  before(async () => {
    await tambah.open();
    for (const [i, amount] of seeded.entries()) {
      await createTransaction({
        type: "pemasukan",
        amount,
        categoryId: i === 0 ? categories.income.salary : categories.income.freelance,
      });
    }
  });

  it("TC-PERS-01 kill + relaunch keeps every committed transaction @regression", async () => {
    await driver.terminateApp(PACKAGE);
    await driver.activateApp(PACKAGE);
    await daftar.open();
    expect(await daftar.summaryIncome()).toBe(seededTotal);
  });

  it("TC-PERS-02 relaunch resets the selected tab to Tambah @regression", async () => {
    // We are on Daftar right now; kill from here and relaunch.
    await driver.terminateApp(PACKAGE);
    await driver.activateApp(PACKAGE);
    await expect(byTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_RELAUNCH });
    await expect(tambah.screen).toBeDisplayed();
  });

  it("TC-PERS-03 relaunch resets the selected month to current @regression", async () => {
    await daftar.open();
    const current = await daftar.monthLabel();
    await daftar.prevMonth(); // verify-retry helper on the page object
    expect(await daftar.monthLabel()).not.toBe(current);
    await driver.terminateApp(PACKAGE);
    await driver.activateApp(PACKAGE);
    await daftar.open();
    expect(await daftar.monthLabel()).toBe(current);
  });

  it("TC-PERS-04 force-stop racing a save leaves the DB readable @regression", async () => {
    await tambah.open();
    await tambah.fillForm({
      type: "pemasukan",
      amount: 88_888,
      categoryId: categories.income.gift,
    });
    await tambah.saveButton.click();
    await driver.terminateApp(PACKAGE); // no toast wait: kill as the save lands
    await driver.activateApp(PACKAGE);
    // No crash and the list renders with prior data intact; the racing row
    // itself may legitimately be present or absent.
    await daftar.open();
    expect(await daftar.summaryIncome()).toBeGreaterThanOrEqual(seededTotal);
  });

  it("TC-PERS-05 reinstall clears all data @regression", async () => {
    execSync(`adb uninstall ${PACKAGE}`, { stdio: "inherit" });
    execSync(`adb install ${APK}`, { stdio: "inherit" });
    await driver.activateApp(PACKAGE);
    await daftar.open();
    await expect(byTag(tags.daftar.emptyState)).toBeDisplayed({ wait: APP_RELAUNCH });
    expect(await daftar.summaryIncome()).toBe(0);
  });
});
