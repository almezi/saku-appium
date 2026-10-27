import { $, $$ } from '@wdio/globals'
import { iosByTag } from '../helpers/locators'
import { tags } from '../config/tags'
import { cadanganTags } from './cadangan.page'
import type { ChainablePromiseElement } from '../types'

/**
 * Cadangan (backup & export) on iOS — accessibility-id twin of CadanganPage.
 * Method names mirror the Android page; only the locator layer differs.
 *
 * Tag drift on this build (verified live via MCP on the iPhone 18 Pro
 * simulator, iOS 27.0, 2026-10-27): only `cadangan_export_csv` and
 * `cadangan_export_json` are applied. `cadangan_screen`, `cadangan_status_card`,
 * `cadangan_import_button`, `cadangan_import_result`, `cadangan_import_error`
 * and `cadangan_warning` exist in TestTags.kt but are attached to no node, so
 * the screen, the status line, the import button and the warning strip are
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
const TITLE = '-ios predicate string: type == "XCUIElementTypeStaticText" AND label == "Cadangan"'

/**
 * The import button (the `cadangan_import_button` tag is not applied). Its
 * child StaticText carries the same label, hence the Button type guard.
 */
const IMPORT_BUTTON =
  '-ios predicate string: type == "XCUIElementTypeButton" AND label == "Pulihkan dari cadangan"'

/** Warning strip; its Button label is "<note>, Detail" (the note plus the link). */
const WARNING_STRIP =
  '-ios predicate string: type == "XCUIElementTypeButton" AND name BEGINSWITH "Hanya tersimpan di perangkat ini"'

/** Full-screen dismiss region of the presented share popover. */
const SHARE_SHEET = '-ios predicate string: name == "PopoverDismissRegion"'

/** The popover's top caption, which renders the exported file's base name. */
const SHARE_CAPTION = '-ios predicate string: name == "LP.CaptionBar.TopCaption"'

export class CadanganIosPage {
  /** Entry from Transaksi: the backup button lives on the daftar screen. */
  async openFromDaftar(): Promise<void> {
    await iosByTag(cadanganTags.daftarEntryButton).click()
    await this.waitForScreen()
  }

  /**
   * Entry from an EMPTY Transaksi list. With no transactions the daftar screen
   * renders a different layout — MonthSwitcher + EmptyState, with no
   * `daftar_backup_button` at all — and the same `onOpenBackup` action moves
   * to the empty state's secondary button ("…ekspor data"). Verified live.
   */
  async openFromEmptyDaftar(): Promise<void> {
    await iosByTag(tags.daftar.emptyStateSecondary).click()
    await this.waitForScreen()
  }

  get screen(): ChainablePromiseElement {
    return $(TITLE)
  }

  get exportCsvButton(): ChainablePromiseElement {
    return iosByTag(cadanganTags.exportCsv)
  }

  get exportJsonButton(): ChainablePromiseElement {
    return iosByTag(cadanganTags.exportJson)
  }

  get importButton(): ChainablePromiseElement {
    return $(IMPORT_BUTTON)
  }

  get warningStrip(): ChainablePromiseElement {
    return $(WARNING_STRIP)
  }

  async waitForScreen(timeout = 30_000): Promise<void> {
    await this.screen.waitForDisplayed({ timeout })
  }

  async isDisplayed(): Promise<boolean> {
    return this.screen.isDisplayed()
  }

  /** Back to Transaksi (no system BACK on iOS). */
  async tapBack(): Promise<void> {
    await iosByTag(tags.component.buttonBack).click()
  }

  /**
   * Every rendered StaticText on the screen, top-to-bottom. The status card
   * has no tag, so its label/date/pill and the "n transaksi · n akun ·
   * n kategori" summary are read as rendered output.
   */
  async screenTexts(): Promise<string[]> {
    const nodes = await $$('-ios predicate string: type == "XCUIElementTypeStaticText"')
    const texts: string[] = []
    for (const node of nodes) {
      const text = ((await node.getText()) || '').trim()
      if (text) texts.push(text)
    }
    return texts
  }

  /** The screen's rendered texts joined, for `toContain` status assertions. */
  async screenText(): Promise<string> {
    return (await this.screenTexts()).join(' | ')
  }

  /** True while the share popover is up after an export. */
  async isShareSheetOpen(): Promise<boolean> {
    return $(SHARE_SHEET).isExisting()
  }

  async waitForShareSheet(timeout = 15_000): Promise<void> {
    await $(SHARE_SHEET).waitForExist({ timeout })
  }

  /** File base name the popover is sharing (e.g. "saku-cadangan"). */
  async shareSheetCaption(): Promise<string> {
    return $(SHARE_CAPTION).getText()
  }

  /** Dismisses the share popover by tapping outside it. */
  async dismissShareSheet(): Promise<void> {
    await $(SHARE_SHEET).click()
    await $(SHARE_SHEET).waitForExist({ timeout: 10_000, reverse: true })
  }
}