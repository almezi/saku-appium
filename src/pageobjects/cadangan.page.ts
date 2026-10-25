import { byTag } from '../helpers/locators'
import { extractChildTexts } from '../helpers/elements'
import { BasePage } from './base.page'
import type { ChainablePromiseElement } from '../types'

/**
 * Test tags for the Cadangan (backup) screen, from TESTABILITY.md
 * ("Cadangan" section) — verified live on app build v2.2 (2026-10-25, see
 * progress.md 2.C probe): screen, status card, both export buttons, import
 * button and warning card all render with exactly these tags.
 */
export const cadanganTags = {
  daftarEntryButton: 'daftar_backup_button',
  screen: 'cadangan_screen',
  statusCard: 'cadangan_status_card',
  exportCsv: 'cadangan_export_csv',
  exportJson: 'cadangan_export_json',
  importButton: 'cadangan_import_button',
  importResult: 'cadangan_import_result',
  importError: 'cadangan_import_error',
  warning: 'cadangan_warning',
} as const

/**
 * Cadangan (backup) screen, reached from Transaksi via
 * `daftar_backup_button` ("Cadangan & ekspor data"); no bottom bar.
 *
 * Export behaviour verified live: tapping an export button writes
 * `cache/backups/saku-cadangan.csv|.json` inside the app's private storage
 * and then opens the system share sheet (package com.android.intentresolver).
 * The file is already on disk while the sheet is up, so specs can dismiss
 * the sheet and read the file through `adb shell run-as`. Import opens the
 * system file picker (SAF) — the one device-dependent surface; results are
 * reported through `cadangan_import_result` / `cadangan_import_error`.
 */
export class CadanganPage extends BasePage {
  constructor() {
    super(cadanganTags.screen)
  }

  /** Entry from Transaksi: the backup button lives on the daftar screen. */
  async openFromDaftar(): Promise<void> {
    await byTag(cadanganTags.daftarEntryButton).click()
    await this.waitForScreen()
  }

  get statusCard(): ChainablePromiseElement {
    return byTag(cadanganTags.statusCard)
  }

  get exportCsvButton(): ChainablePromiseElement {
    return byTag(cadanganTags.exportCsv)
  }

  get exportJsonButton(): ChainablePromiseElement {
    return byTag(cadanganTags.exportJson)
  }

  get importButton(): ChainablePromiseElement {
    return byTag(cadanganTags.importButton)
  }

  get importResult(): ChainablePromiseElement {
    return byTag(cadanganTags.importResult)
  }

  get importError(): ChainablePromiseElement {
    return byTag(cadanganTags.importError)
  }

  get warningCard(): ChainablePromiseElement {
    return byTag(cadanganTags.warning)
  }

  /** Child texts of the status card ("N transaksi tersimpan", last backup date). */
  async statusTexts(): Promise<string[]> {
    return extractChildTexts(this.statusCard)
  }

  /** True while the system share sheet is foregrounded after an export. */
  async isShareSheetOpen(): Promise<boolean> {
    return (await driver.getCurrentPackage()) === 'com.android.intentresolver'
  }
}
