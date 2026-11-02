/**
 * TC-BACKUP on iOS — 1:1 port of backup.spec.ts (the Android spec is the
 * source of truth for the flow; only the driver layer changes). One `it` per
 * checklist id so a failure maps straight onto progress.md 2.C.
 *
 * Platform adaptations (verified live via Appium MCP on iPhone 18 Pro /
 * iOS 27.0, 2026-10-27):
 *  - the Cadangan screen carries NO tag on this build (only `cadangan_export_*`
 *    survive), so it is anchored on the "Cadangan" title and its status/warning
 *    are read as rendered output — see cadangan.ios.page.ts;
 *  - export writes `Documents/saku-cadangan.csv|.json` INSIDE the app's data
 *    container and then presents `UIActivityViewController`. There is no
 *    `adb run-as` equivalent, so the files are read from the host through
 *    `xcrun simctl get_app_container` (the container UUID changes whenever the
 *    app is reinstalled, so it is resolved per read);
 *  - the share popover IS published to XCUITest (`PopoverDismissRegion`), so
 *    it is both detectable and dismissible — no `driver.back()` (iOS has none,
 *    and the dismiss region sits UNDER the popover content);
 *  - "Cadangan terakhir" updates as soon as the export writes the file, so
 *    TC-BACKUP-05 asserts no-data-change instead of an unchanged timestamp,
 *    exactly like Android;
 *  - TC-BACKUP-04 is skipped: the app's import picker
 *    (`UIDocumentPickerViewController`) is fully out-of-process on iOS 27 —
 *    its remote view is NOT published to the accessibility tree (unlike the
 *    share popover) and coordinate taps do not reach it either, so neither
 *    element queries nor blind taps can select a file. Verified live 3×;
 *    see bugs/BUG_Found_10.md — the iOS analogue of Android's BUG_Found_02;
 *  - M1 convergence (2026-10-28) — the iOS twin exposes the same public API
 *    as the Android twin (statusTexts/statusText/warningCard renames); only
 *    the locator layer differs.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { iosByTag } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { categories } from "../../config/categories";
import { createTransactionIos, uniqueNote } from "../../helpers/transactions";
import { DaftarIosPage } from "../../pageobjects/daftar.ios.page";
import { CadanganIosPage } from "../../pageobjects/cadangan.ios.page";
import { APP_COLD_START_IOS, ELEMENT_PRESENT } from "../../config/timeouts";

const IOS_BUNDLE = "id.almezi.saku";
// Fallback ONLY, for host commands that somehow run before the session exists.
// The helper prefers the live session's udid so parallel runs (SAKU_IOS_DEVICES)
// address their own simulator instead of one value shared by every worker.
const FALLBACK_UDID = process.env.IOS_UDID ?? "80FCD259-BA75-4018-8FE6-31F4E812AD9B";
// xcode-select on this machine points at CommandLineTools, which ships no iOS
// SDK; wdio.ios.conf.ts already pins DEVELOPER_DIR for its own `xcrun` calls,
// but this spec shells out independently so it pins it too.
const XCODE_DEVELOPER_DIR = "/Applications/Xcode.app/Contents/Developer";
const CSV_HEADER = "date,type,amount,category,account,note";
const SEED_AMOUNT = 50_000;
const seedNote = uniqueNote("backup");

/**
 * The udid of the simulator THIS worker's session actually drives, read from
 * the live session's capabilities (never from the environment) so parallel
 * runs address their own device.
 */
async function deviceUdid(): Promise<string> {
  const caps = (await driver.capabilities) as Record<string, unknown>;
  return (caps["appium:udid"] as string | undefined) ?? FALLBACK_UDID;
}

/** `xcrun simctl` with DEVELOPER_DIR pinned (see XCODE_DEVELOPER_DIR). */
function simctl(args: string): string {
  return execSync(`xcrun simctl ${args}`, {
    encoding: "utf8",
    env: { ...process.env, DEVELOPER_DIR: process.env.DEVELOPER_DIR ?? XCODE_DEVELOPER_DIR },
  });
}

/** Reads an export from the app's Documents dir (NSDocumentDirectory on iOS). */
async function readExportedFile(fileName: string): Promise<string> {
  const container = simctl(`get_app_container ${await deviceUdid()} ${IOS_BUNDLE} data`).trim();
  return readFileSync(`${container}/Documents/${fileName}`, "utf8");
}

describe("TC-BACKUP — backup & export (Phase 2) on iOS @regression", () => {
  const daftar = new DaftarIosPage();
  const cadangan = new CadanganIosPage();

  before(async () => {
    await expect(iosByTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START_IOS });
    // Seed one income so the status card reports "1 transaksi" and the export
    // files have a known single row to assert on.
    await createTransactionIos({
      type: "pemasukan",
      amount: SEED_AMOUNT,
      categoryId: categories.income.salary,
      note: seedNote,
    });
  });

  it("TC-BACKUP-01 tapping the daftar backup button opens the Cadangan screen @regression", async () => {
    // The seed's save leaves the app on Tambah; the backup button lives on the
    // Transaksi screen, so navigate there first.
    await daftar.open();
    await cadangan.openFromDaftar();
    await expect(cadangan.screen).toBeDisplayed();
    const status = await cadangan.statusText();
    expect(status).toContain("1 transaksi");
    expect(status).toContain("Belum pernah");
    await expect(cadangan.warningCard).toBeDisplayed();
  });

  it("TC-BACKUP-02 exporting JSON opens the share sheet with the backup file @regression", async () => {
    await cadangan.exportJsonButton.click();
    await cadangan.waitForShareSheet();
    expect(await cadangan.shareSheetCaption()).toContain("saku-cadangan");
    await cadangan.dismissShareSheet();
    await expect(cadangan.screen).toBeDisplayed();
  });

  it("TC-BACKUP-03 the exported files contain the current transaction @regression", async () => {
    const json = JSON.parse(await readExportedFile("saku-cadangan.json")) as {
      transactions: Array<{ amount: number; note: string | null }>;
    };
    const seeded = json.transactions.find((t) => t.note === seedNote);
    expect(seeded?.amount).toBe(SEED_AMOUNT);

    // Re-export CSV so the file reflects the same data, then assert content.
    await cadangan.exportCsvButton.click();
    await cadangan.waitForShareSheet();
    await cadangan.dismissShareSheet();
    const csv = (await readExportedFile("saku-cadangan.csv")).replace(/^\uFEFF/, "");
    expect(csv).toContain(CSV_HEADER);
    expect(csv).toContain(seedNote);
    expect(csv).toContain(`,${SEED_AMOUNT},`);
  });

  it("TC-BACKUP-05 cancelling the export leaves no side effects @regression", async () => {
    await cadangan.exportCsvButton.click();
    await cadangan.waitForShareSheet();
    await cadangan.dismissShareSheet();
    await expect(cadangan.screen).toBeDisplayed();
    // Cancelling the share must not touch data: the transaction count is
    // unchanged and no toast surfaced. "Cadangan terakhir" is NOT asserted
    // here — the export already wrote the backup file, so the app correctly
    // reports a backup date instead of "Belum pernah" (verified live).
    const status = await cadangan.statusText();
    expect(status).toContain("1 transaksi");
    expect(await iosByTag(tags.component.toast).isExisting()).toBe(false);
  });

  // The import picker cannot be driven on iOS: see the file header and
  // bugs/BUG_Found_10.md. Skipped per the repo's iOS-blocked-case convention
  // (same shape as TC-LIST-07/08), not because the app is at fault.
  it.skip("TC-BACKUP-04 importing a backup restores its transactions (skipped on iOS: system file picker is out-of-process) @regression", async () => {});

  it("TC-BACKUP-06 exporting with zero transactions produces a valid empty file @regression", async () => {
    // Cadangan has no bottom bar, so leave it through its own back button
    // before deleting on Transaksi.
    await cadangan.tapBack();
    await daftar.waitForScreen();
    // Remove the seed to reach the empty state.
    await daftar.tapDelete(categories.income.salary);
    await daftar.confirmDeleteSheet();
    await expect(iosByTag(tags.daftar.emptyState)).toBeDisplayed({ wait: ELEMENT_PRESENT });

    // The empty list has no `daftar_backup_button`; its empty state carries the
    // same onOpenBackup action on the secondary button.
    await cadangan.openFromEmptyDaftar();
    await cadangan.exportCsvButton.click();
    await cadangan.waitForShareSheet();
    await cadangan.dismissShareSheet();
    const csv = (await readExportedFile("saku-cadangan.csv")).replace(/^\uFEFF/, "");
    expect(csv.trim()).toBe(CSV_HEADER);
  });
});
