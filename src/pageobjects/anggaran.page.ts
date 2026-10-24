import { byTag } from '../helpers/locators'
import { BasePage } from './base.page'
import { typeIntoTaggedField } from '../helpers/input'
import type { ChainablePromiseElement } from 'webdriverio'

/**
 * Test tags for the Anggaran (budget) screen and form, from TESTABILITY.md
 * ("Anggaran" section). They live here instead of config/tags.ts only because
 * that file is frozen for Phase 1; the values mirror TestTags.kt exactly.
 */
export const anggaranTags = {
  screen: 'anggaran_screen',
  totalCard: 'anggaran_total_card',
  list: 'anggaran_list',
  row: (categoryId: string) => `anggaran_row_${categoryId}`,
  addButton: 'anggaran_add_button',
  emptyState: 'anggaran_empty_state',
  formCategory: 'anggaran_form_category',
  deleteSheet: 'anggaran_delete_sheet',
} as const

/**
 * Anggaran (budget) screen. Opened from Ringkasan via
 * `ringkasan_anggaran_button`; it has no bottom bar, only a back button.
 *
 * The budget form reuses shared design-system tags (TESTABILITY.md, "Shared
 * design system components"): `component_input_amount` for "Batas bulanan",
 * `component_button_primary` for "Simpan anggaran",
 * `component_button_text_danger` for "Hapus anggaran" (edit mode only).
 *
 * The per-row "Ubah"/"Hapus" buttons are not in the tag contract, so those two
 * fall back to text locators scoped to the row (UI_SPEC.md 6.6 names them).
 */
export class AnggaranPage extends BasePage {
  constructor() {
    super(anggaranTags.screen)
  }

  get totalCard(): ChainablePromiseElement {
    return byTag(anggaranTags.totalCard)
  }

  get emptyState(): ChainablePromiseElement {
    return byTag(anggaranTags.emptyState)
  }

  get addButton(): ChainablePromiseElement {
    return byTag(anggaranTags.addButton)
  }

  get formCategory(): ChainablePromiseElement {
    return byTag(anggaranTags.formCategory)
  }

  row(categoryId: string): ChainablePromiseElement {
    return byTag(anggaranTags.row(categoryId))
  }

  async openFromRingkasan(): Promise<void> {
    await byTag('ringkasan_anggaran_button').click()
    await this.waitForScreen()
  }

  /** Opens the shared budget form ("Anggaran baru" / "Ubah anggaran"). */
  async openForm(): Promise<void> {
    await this.addButton.click()
    await this.formCategory.waitForDisplayed({ timeout: 10_000 })
  }

  /** Picks the budgeted category in the form's category picker sheet. */
  async selectFormCategory(categoryId: string): Promise<void> {
    await this.formCategory.click()
    const sheet = byTag('component_sheet_picker')
    await sheet.waitForDisplayed({ timeout: 10_000 })
    const chip = byTag(`component_row_category_chip_${categoryId}`)
    await chip.waitForDisplayed({ timeout: 10_000 })
    await chip.click()
    await sheet.waitForDisplayed({ reverse: true })
  }

  /** Fills "Batas bulanan" on the open budget form. */
  async fillLimit(amount: number): Promise<void> {
    await typeIntoTaggedField(byTag('component_input_amount'), String(amount))
  }

  /** "Simpan anggaran" on the open budget form. */
  async saveForm(): Promise<void> {
    await byTag('component_button_primary').click()
    await byTag('component_toast').waitForDisplayed({ timeout: 10_000 })
    await byTag('component_toast').waitForDisplayed({ reverse: true, timeout: 10_000 })
  }

  /** "Ubah" button on the budget row for `categoryId` (text locator, see class doc). */
  async tapRowEdit(categoryId: string): Promise<void> {
    const edit = await this.row(categoryId).$('android=new UiSelector().text("Ubah")')
    await edit.click()
    await this.formCategory.waitForDisplayed({ timeout: 10_000 })
  }

  /** "Hapus anggaran" danger button, shown on the form in edit mode. */
  async deleteFromForm(): Promise<void> {
    await byTag('component_button_text_danger').click()
    await byTag(anggaranTags.deleteSheet).waitForDisplayed({ timeout: 10_000 })
    await byTag('component_sheet_button_confirm').click()
    await byTag(anggaranTags.deleteSheet).waitForDisplayed({ reverse: true })
  }

  /** Rendered text of a budget row (name, status, "Rp X dari Rp Y", "Sisa/Lebih Rp Z"). */
  async rowText(categoryId: string): Promise<string> {
    const row = this.row(categoryId)
    await row.waitForDisplayed({ timeout: 10_000 })
    return row.getText()
  }
}
