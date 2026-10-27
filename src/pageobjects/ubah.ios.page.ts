import { iosByTag } from '../helpers/locators'
import { iosPageNodes, iosStaticTexts, iosTextsInRect } from '../helpers/elements'
import { tags } from '../config/tags'
import { BaseIosPage } from './base.ios.page'
import type { DaftarIosPage } from './daftar.ios.page'
import type { ChainablePromiseElement } from '../types'

/**
 * Ubah transaksi (edit) on iOS. Shares its form fields with Tambah — the
 * form component is one and the same, so amount/category/note reads
 * live on the TambahIosPage against tags.tambah.
 *
 * tapBack() taps the header's back button (`component_button_back`) — the
 * platform-equivalent of Android's toolbar back; iOS has no system BACK to
 * press (same adaptation as TC-NAV-06).
 */
export class UbahIosPage extends BaseIosPage {
  constructor() {
    super(tags.ubah.screen)
  }

  get saveButton(): ChainablePromiseElement {
    return iosByTag(tags.ubah.buttonSave)
  }

  get deleteButton(): ChainablePromiseElement {
    return iosByTag(tags.ubah.buttonDelete)
  }

  /**
   * Header title.
   *
   * The tagged header node is an empty `Other` — Compose renders the title
   * ("Ubah transaksi") as a SIBLING of it, so the text is read from the
   * header's frame (measured 2026-10-27).
   */
  async headerLabel(): Promise<string> {
    const own = ((await iosByTag(tags.ubah.header).getText()) || '').trim()
    if (own) return own
    const nodes = await iosPageNodes()
    const header = nodes.find((node) => node.name === tags.ubah.header)
    if (!header) return ''
    return iosTextsInRect(header, iosStaticTexts(nodes))[0] ?? ''
  }

  /** Opens the edit screen from the Transaksi list via the row's edit affordance. */
  async openFromDaftar(daftar: DaftarIosPage, categoryId: string): Promise<void> {
    await daftar.tapEdit(categoryId)
    await this.waitForScreen()
  }

  async isSaveEnabled(): Promise<boolean> {
    return this.saveButton.isEnabled()
  }

  /** Saving returns to the Transaksi list. */
  async save(): Promise<void> {
    await this.saveButton.click()
    await iosByTag(tags.daftar.screen).waitForDisplayed({ timeout: 15_000 })
  }

  async tapDelete(): Promise<void> {
    await this.deleteButton.click()
  }

  /** Leaving without saving returns to the Transaksi list. */
  async tapBack(): Promise<void> {
    await super.tapBack()
    await iosByTag(tags.daftar.screen).waitForDisplayed({ timeout: 15_000 })
  }
}
