import { $, $$ } from "@wdio/globals";
import { byTag } from "../helpers/locators";
import { tags } from "../config/tags";
import { BasePage } from "./base.page";
import type { ChainablePromiseElement } from "../types";
import { SCREEN_READY, SURFACE_DISMISS, SYSTEM_SHEET } from "../config/timeouts";

/**
 * Cadangan (backup) screen, reached from Transaksi via the daftar entry
 * button ("Cadangan & ekspor data") or, on an emptied list, the empty
 * state's secondary button ("Impor dari cadangan"); no bottom bar.
 *
 * The v2.3 redesign dropped the `cadangan_screen` tag along with the status
 * card, import entry, import result/error and warning strip tags — those
 * surfaces render as untagged output now and are read by text (see
 * BUG_Found_15.md). Export behaviour is unchanged: tapping an export button
 * writes `cache/backups/saku-cadangan.csv|.json` inside the app's private
 * storage and then opens the system share sheet (package
 * com.android.intentresolver); the file is already on disk while the sheet
 * is up, so specs can dismiss the sheet and read the file through
 * `adb shell run-as`. Import opens the system file picker (SAF) — the one
 * device-dependent surface; v2.3 reports no result node and no toast, only
 * the status line's count changes (verified live 2026-10-28).
 */
export class CadanganPage extends BasePage {
  constructor() {
    // The v2.3 redesign dropped `cadangan_screen`, and of the surviving tags
    // only the export cards render on this screen in every state (verified
    // live with 0 transactions, 2026-10-28) — the CSV card anchors screen
    // detection (waitForScreen/isDisplayed from BasePage).
    super(tags.cadangan.exportCsv);
  }

  /**
   * Entry from Transaksi. The `daftar_backup_button` only exists when the
   * list has transactions — the emptied list renders no backup button; use
   * openFromEmptyDaftar() there.
   */
  async openFromDaftar(): Promise<void> {
    await byTag(tags.cadangan.daftarEntryButton).click();
    await this.waitForScreen();
  }

  /**
   * Entry from an emptied Transaksi list: its empty state's secondary button
   * ("Impor dari cadangan") carries the same onOpenBackup action the missing
   * `daftar_backup_button` would (verified live on v2.3, 2026-10-28; twin of
   * the iOS page's method).
   */
  async openFromEmptyDaftar(): Promise<void> {
    await byTag(tags.daftar.emptyStateSecondary).click();
    await this.waitForScreen();
  }

  get exportCsvButton(): ChainablePromiseElement {
    return byTag(tags.cadangan.exportCsv);
  }

  get exportJsonButton(): ChainablePromiseElement {
    return byTag(tags.cadangan.exportJson);
  }

  /**
   * Documented text-lookup exception to the tag-only locator rule: v2.3
   * dropped `cadangan_import_button` (BUG_Found_15), the label "Pulihkan
   * dari cadangan" is unique to this screen, and clicking the text node
   * works because its centre lands inside the surrounding clickable
   * container.
   */
  get importButton(): ChainablePromiseElement {
    return $('android=new UiSelector().text("Pulihkan dari cadangan")');
  }

  /**
   * Same documented-exception rationale as importButton: v2.3 dropped
   * `cadangan_warning` (BUG_Found_15) and the strip's first TextView text is
   * unique to this screen.
   */
  get warningCard(): ChainablePromiseElement {
    return $('android=new UiSelector().text("Hanya tersimpan di perangkat ini")');
  }

  /**
   * v2.3 renders the status card as untagged output — the one status line
   * ("N transaksi  ·  N akun  ·  N kategori"), the CADANGAN TERAKHIR block
   * with its Perlu/Aman pill and the warning strip are all plain TextViews,
   * so status assertions read rendered texts (twin of the iOS page's
   * screenTexts).
   */
  async statusTexts(): Promise<string[]> {
    const nodes = await $$('android=new UiSelector().className("android.widget.TextView")');
    const texts: string[] = [];
    for (const node of nodes) {
      const text = ((await node.getText()) || "").trim();
      if (text) texts.push(text);
    }
    return texts;
  }

  /** The screen's rendered texts joined, for `toContain` status assertions. */
  async statusText(): Promise<string> {
    return (await this.statusTexts()).join(" | ");
  }

  /**
   * v2.3 gives Cadangan a tagged back button (`component_button_back`);
   * waiting for the list afterwards matches the iOS twin.
   */
  async tapBack(): Promise<void> {
    await byTag(tags.component.buttonBack).click();
    await byTag(tags.daftar.screen).waitForDisplayed({ timeout: SCREEN_READY });
  }

  /** True while the system share sheet is foregrounded after an export. */
  async isShareSheetOpen(): Promise<boolean> {
    return (await driver.getCurrentPackage()) === "com.android.intentresolver";
  }

  /** Bounded wait for the share sheet an export opens. */
  async waitForShareSheet(timeout = SYSTEM_SHEET): Promise<void> {
    await driver.waitUntil(() => this.isShareSheetOpen(), {
      timeout,
      timeoutMsg: "Share sheet did not open after the export",
    });
  }

  /**
   * BACK dismisses the system share sheet (twin of the iOS popover
   * dismissal); the wait proves the app — not another overlay — is
   * foregrounded again before the spec keeps asserting.
   */
  async dismissShareSheet(): Promise<void> {
    await driver.back();
    await driver.waitUntil(async () => !(await this.isShareSheetOpen()), {
      timeout: SURFACE_DISMISS,
    });
  }
}
