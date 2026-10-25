import { byTag } from '../helpers/locators'
import { tags } from '../config/tags'
import { BasePage } from './base.page'
import { typeIntoTaggedField } from '../helpers/input'
import type { ChainablePromiseElement } from '../types'

/**
 * Test tags for the Anggaran (budget) screen and form, from TESTABILITY.md
 * ("Anggaran" section). Re-verified live against app build v2.2 (2026-10-25,
 * see progress.md 2.A): the form exposes its own `anggaran_form_*` tags —
 * the shared `component_input_amount` / `component_button_primary` /
 * `component_button_text_danger` tags from the earlier draft do NOT exist on
 * this build. The category picker sheet rows are untagged (documented text
 * fallback), while the per-row "Ubah"/"Hapus" actions ARE tagged.
 */
export const anggaranTags = {
  screen: 'anggaran_screen',
  totalCard: 'anggaran_total_card',
  list: 'anggaran_list',
  row: (categoryId: string) => `anggaran_row_${categoryId}`,
  rowEdit: (categoryId: string) => `anggaran_row_${categoryId}_edit_${categoryId}`,
  rowDelete: (categoryId: string) => `anggaran_row_${categoryId}_delete_${categoryId}`,
  addButton: 'anggaran_add_button',
  emptyState: 'anggaran_empty_state',
  formScreen: 'anggaran_form_screen',
  formCategory: 'anggaran_form_category',
  formLimit: 'anggaran_form_limit',
  formNote: 'anggaran_form_note',
  formSwitch: 'anggaran_form_switch',
  formSave: 'anggaran_form_save',
  formDelete: 'anggaran_form_delete',
  deleteSheet: 'anggaran_delete_sheet',
} as const

/**
 * Anggaran (budget) screen. Opened from Ringkasan via
 * `ringkasan_anggaran_button`; it has no bottom bar, only a back button.
 * Note the entry button itself is hidden while the month has no
 * transactions (UI_SPEC 6.3) — seed data before openFromRingkasan.
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

  get formSave(): ChainablePromiseElement {
    return byTag(anggaranTags.formSave)
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

  /**
   * Picks `displayName` in the form's category picker sheet. The sheet's
   * rows carry no test tags on build v2.2 (verified live) — the documented
   * text fallback applies; display names are stable app copy, not test data.
   */
  async selectFormCategory(displayName: string): Promise<void> {
    await this.formCategory.click()
    const chip = $(`android=new UiSelector().text("${displayName}")`)
    await chip.waitForDisplayed({ timeout: 10_000 })
    await chip.click()
    await chip.waitForDisplayed({ reverse: true, timeout: 10_000 })
  }

  /** Fills "Batas bulanan" on the open budget form. */
  async fillLimit(amount: number): Promise<void> {
    // 'digits': currency-formatted field, same as tambah.fillAmount.
    await typeIntoTaggedField(
      byTag(anggaranTags.formLimit),
      String(amount),
      anggaranTags.formLimit,
      'digits',
    )
  }

  /** "Simpan anggaran" on the open budget form; waits for the form to close. */
  async saveForm(): Promise<void> {
    await this.formSave.click()
    await this.formSave.waitForDisplayed({ reverse: true, timeout: 10_000 })
  }

  /** "Ubah" button on the budget row for `categoryId` (tag verified live). */
  async tapRowEdit(categoryId: string): Promise<void> {
    await byTag(anggaranTags.rowEdit(categoryId)).click()
    await this.formCategory.waitForDisplayed({ timeout: 10_000 })
  }

  /** "Hapus anggaran" danger button, shown on the form in edit mode. */
  async deleteFromForm(): Promise<void> {
    await byTag(anggaranTags.formDelete).click()
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
