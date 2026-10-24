import { byTag } from '../helpers/locators'
import { tags } from '../config/tags'
import { BasePage } from './base.page'
import { DaftarPage } from './daftar.page'
import type { ChainablePromiseElement, ChainablePromiseArray } from '../types'

/**
 * Ubah transaksi (edit). Shares its form fields with Tambah — the form
 * component is one and the same, so amount/category/note use tags.tambah.
 */
export class UbahPage extends BasePage {
  constructor() {
    super(tags.ubah.screen)
  }

  get saveButton(): ChainablePromiseElement {
    return byTag(tags.ubah.buttonSave)
  }

  get deleteButton(): ChainablePromiseElement {
    return byTag(tags.ubah.buttonDelete)
  }

  get headerText(): Promise<string> {
    return byTag(tags.ubah.header).getText()
  }

  /** Opens the edit screen from the Transaksi list via the row's edit affordance. */
  async openFromDaftar(daftar: DaftarPage, categoryId: string): Promise<void> {
    await daftar.tapEdit(categoryId)
    await this.waitForScreen()
  }

  async isSaveEnabled(): Promise<boolean> {
    return this.saveButton.isEnabled()
  }

  /** Saving returns to the Transaksi list. */
  async save(): Promise<void> {
    await this.saveButton.click()
    await byTag(tags.daftar.screen).waitForDisplayed({ timeout: 15_000 })
  }

  async tapDelete(): Promise<void> {
    await this.deleteButton.click()
  }
}
