/**
 * iOS twin of cadangan.page.ts — the Cadangan (backup & export) screen, the
 * same public API method-for-method (M1 convergence). Locators are
 * accessibility ids from the TESTABILITY.md tag contract
 * (src/config/tags.ts); the class block below records which cadangan tags
 * this build actually applies and how each untagged surface is resolved.
 */
import { $, $$ } from "@wdio/globals";
import { iosByTag } from "../helpers/locators";
import { tags } from "../config/tags";
import type { ChainablePromiseElement } from "../types";
import { SCREEN_READY_IOS, SURFACE_DISMISS, SYSTEM_SHEET } from "../config/timeouts";

/**
 * Cadangan (backup & export) on iOS — accessibility-id twin of CadanganPage.
 * The twins expose the SAME public API method-for-method (M1 convergence,
 * 2026-10-28: statusTexts/statusText/warningCard renamed to match Android);
 * platform differences are internal — the locator layer, the share popover
 * (iOS) vs the system share sheet (Android), and tapBack (iOS has no system
 * BACK). The two documented iOS-only extras are the `screen` title anchor and
 * `shareSheetCaption()`.
 *
 * This file no longer imports the Android page module: its three surviving
 * tags now live on `tags.cadangan` in src/config/tags.ts, which removes the
 * last page-object cross-import for cadangan (review finding S5).
 *
 * Tag drift on this build (verified live via MCP on the iPhone 18 Pro
 * simulator, iOS 27.0, 2026-10-27): only `cadangan_export_csv` and
 * `cadangan_export_json` are applied. `cadangan_screen`, `cadangan_status_card`,
 * `cadangan_import_button`, `cadangan_import_result`, `cadangan_import_error`
 * and `cadangan_warning` exist in TestTags.kt but are attached to no node, so
 * the screen, the status line, the import button and the warning card are
 * resolved as rendered output — the same documented exception the Anggaran and
 * Kategori ports use for untagged headers.
 *
 * Live facts baked in here:
 *  - the screen root has no tag: it is anchored on the "Cadangan" title
 *    StaticText (the only node with that exact label while the screen is up);
 *  - the status line is ONE StaticText "<n> transaksi  ·  <n> akun  ·
 *    <n> kategori" (two spaces around the middle dot, from
 *    `joinToString("  ·  ")`), so status assertions read the screen's texts;
 *  - there is no system BACK: leaving taps `component_button_back`;
 *  - export presents `UIActivityViewController` as a popover. Unlike the
 *    document picker, this remote view IS published to XCUITest, so the sheet
 *    is detectable (`PopoverDismissRegion` covers the whole screen) and is
 *    dismissed by tapping that region.
 */

/** The screen's title — the only node with this exact label on Cadangan. */
const TITLE = '-ios predicate string: type == "XCUIElementTypeStaticText" AND label == "Cadangan"';

/**
 * The import button (the `cadangan_import_button` tag is not applied). Its
 * child StaticText carries the same label, hence the Button type guard.
 */
const IMPORT_BUTTON =
  '-ios predicate string: type == "XCUIElementTypeButton" AND label == "Pulihkan dari cadangan"';

/** Warning card; its Button label is "<note>, Detail" (the note plus the link). */
const WARNING_CARD =
  '-ios predicate string: type == "XCUIElementTypeButton" AND name BEGINSWITH "Hanya tersimpan di perangkat ini"';

/** Full-screen dismiss region of the presented share popover. */
const SHARE_SHEET = '-ios predicate string: name == "PopoverDismissRegion"';

/** The popover's top caption, which renders the exported file's base name. */
const SHARE_CAPTION = '-ios predicate string: name == "LP.CaptionBar.TopCaption"';

export class CadanganIosPage {
  /** Entry from Transaksi: the backup button lives on the daftar screen. */
  async openFromDaftar(): Promise<void> {
    await iosByTag(tags.cadangan.daftarEntryButton).click();
    await this.waitForScreen();
  }

  /**
   * Entry from an EMPTY Transaksi list. With no transactions the daftar screen
   * renders a different layout — MonthSwitcher + EmptyState, with no
   * `daftar_backup_button` at all — and the same `onOpenBackup` action moves
   * to the empty state's secondary button ("…ekspor data"). Verified live.
   */
  async openFromEmptyDaftar(): Promise<void> {
    await iosByTag(tags.daftar.emptyStateSecondary).click();
    await this.waitForScreen();
  }

  /**
   * Title anchor — a documented iOS-only extra: Android anchors screen
   * detection on the export card, while this build applies no
   * `cadangan_screen` tag on iOS, so the "Cadangan" title StaticText is the
   * only stable node with that exact label while the screen is up.
   */
  get screen(): ChainablePromiseElement {
    return $(TITLE);
  }

  get exportCsvButton(): ChainablePromiseElement {
    return iosByTag(tags.cadangan.exportCsv);
  }

  get exportJsonButton(): ChainablePromiseElement {
    return iosByTag(tags.cadangan.exportJson);
  }

  get importButton(): ChainablePromiseElement {
    return $(IMPORT_BUTTON);
  }

  get warningCard(): ChainablePromiseElement {
    return $(WARNING_CARD);
  }

  async waitForScreen(timeout = SCREEN_READY_IOS): Promise<void> {
    await this.screen.waitForDisplayed({ timeout });
  }

  async isDisplayed(): Promise<boolean> {
    return this.screen.isDisplayed();
  }

  /** Back to Transaksi (no system BACK on iOS). */
  async tapBack(): Promise<void> {
    await iosByTag(tags.component.buttonBack).click();
  }

  /**
   * Every rendered StaticText on the screen, top-to-bottom. v2.3 renders the
   * status card as untagged output on BOTH platforms — the "<n> transaksi ·
   * <n> akun · <n> kategori" summary plus the CADANGAN TERAKHIR block and its
   * Perlu/Aman pill — so status assertions read rendered texts.
   */
  async statusTexts(): Promise<string[]> {
    const nodes = await $$('-ios predicate string: type == "XCUIElementTypeStaticText"');
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

  /** True while the share popover is up after an export. */
  async isShareSheetOpen(): Promise<boolean> {
    return $(SHARE_SHEET).isExisting();
  }

  async waitForShareSheet(timeout = SYSTEM_SHEET): Promise<void> {
    await $(SHARE_SHEET).waitForExist({ timeout });
  }

  /** File base name the popover is sharing (e.g. "saku-cadangan"). */
  async shareSheetCaption(): Promise<string> {
    return $(SHARE_CAPTION).getText();
  }

  /** Dismisses the share popover by tapping outside it. */
  async dismissShareSheet(): Promise<void> {
    await $(SHARE_SHEET).click();
    await $(SHARE_SHEET).waitForExist({ timeout: SURFACE_DISMISS, reverse: true });
  }
}
