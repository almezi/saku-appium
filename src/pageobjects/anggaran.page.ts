import { byTag } from '../helpers/locators'
import { tags } from '../config/tags'
import { BasePage } from './base.page'
import { typeIntoTaggedField } from '../helpers/input'
import type { ChainablePromiseElement } from '../types'

/**
 * Test tags for the Anggaran (budget) screen and form, from TESTABILITY.md
 * ("Anggaran" section). They live here instead of config/tags.ts only because
 * that file is frozen for Phase 1; the values mirror TestTags.kt exactly.
 * The trailing shared-form tags exist in no catalogue at all (TESTABILITY.md
 * omits them) — verified live on the budget form, kept here under the same
 * frozen-tags.ts rule.
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
  // Shared budget-form component tags, absent from every catalogue.
  sheetPicker: 'component_sheet_picker',
  categoryChip: (categoryId: string) => `component_row_category_chip_${categoryId}`,
  inputAmount: 'component_input_amount',
} as const

/**
 * Anggaran (budget) screen. Opened from Ringkasan via
 * `ringkasan_anggaran_button`; it has no bottom bar, only a back button.
 *
 * The budget form reuses shared design-system tags: `component_input_amount`
 * for "Batas bulanan", `component_button_primary` for "Simpan anggaran",
 * `component_button_text_danger` for "Hapus anggaran" (edit mode only). All
 * but `component_input_amount` live in tags.component; it and the category
 * picker-sheet tags are absent from TESTABILITY.md and are catalogued in
 * anggaranTags above (tags.ts is frozen for Phase 1).
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
    await byTag(tags.ringkasan.anggaranButton).click()
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
    const sheet = byTag(anggaranTags.sheetPicker)
    await sheet.waitForDisplayed({ timeout: 10_000 })
    const chip = byTag(anggaranTags.categoryChip(categoryId))
    await chip.waitForDisplayed({ timeout: 10_000 })
    await chip.click()
    await sheet.waitForDisplayed({ reverse: true })
  }

  /** Fills "Batas bulanan" on the open budget form. */
  async fillLimit(amount: number): Promise<void> {
    // 'digits': currency-formatted field, same as tambah.fillAmount.
    await typeIntoTaggedField(
      byTag(anggaranTags.inputAmount),
      String(amount),
      'budget limit',
      'digits',
    )
  }

  /** "Simpan anggaran" on the open budget form. */
  async saveForm(): Promise<void> {
    await byTag(tags.component.buttonPrimary).click()
    await byTag(tags.component.toast).waitForDisplayed({ timeout: 10_000 })
    await byTag(tags.component.toast).waitForDisplayed({ reverse: true, timeout: 10_000 })
  }

  /** "Ubah" button on the budget row for `categoryId` (text locator, see class doc). */
  async tapRowEdit(categoryId: string): Promise<void> {
    const edit = await this.row(categoryId).$('android=new UiSelector().text("Ubah")')
    await edit.click()
    await this.formCategory.waitForDisplayed({ timeout: 10_000 })
  }

  /** "Hapus anggaran" danger button, shown on the form in edit mode. */
  async deleteFromForm(): Promise<void> {
    await byTag(tags.component.buttonTextDanger).click()
    await byTag(anggaranTags.deleteSheet).waitForDisplayed({ timeout: 10_000 })
    await byTag(tags.component.sheetConfirm).click()
    await byTag(anggaranTags.deleteSheet).waitForDisplayed({ reverse: true })
  }

  /** Rendered text of a budget row (name, status, "Rp X dari Rp Y", "Sisa/Lebih Rp Z"). */
  async rowText(categoryId: string): Promise<string> {
    const row = this.row(categoryId)
    await row.waitForDisplayed({ timeout: 10_000 })
    return row.getText()
  }
}
