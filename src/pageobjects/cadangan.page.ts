import { byTag } from '../helpers/locators'
import { BasePage } from './base.page'
import type { ChainablePromiseElement } from 'webdriverio'

/**
 * Test tags for the Cadangan (backup/export) screen, from TESTABILITY.md
 * ("Cadangan" section). They live here instead of config/tags.ts only because
 * that file is frozen for Phase 1; the values mirror TestTags.kt exactly.
 */
export const cadanganTags = {
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
 * Cadangan (backup & export) screen, opened from Transaksi via
 * `daftar_backup_button`. No bottom bar, only a back button.
 */
export class CadanganPage extends BasePage {
  constructor() {
    super(cadanganTags.screen)
  }

  async openFromDaftar(): Promise<void> {
    await byTag('daftar_backup_button').click()
    await this.waitForScreen()
  }

  get statusCard(): ChainablePromiseElement {
    return byTag(cadanganTags.statusCard)
  }

  get warningCard(): ChainablePromiseElement {
    return byTag(cadanganTags.warning)
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
}
