import { byTag, allByTagMatches, scrollToTag } from '../helpers/locators'
import { tags } from '../config/tags'
import { BasePage } from './base.page'
import { typeIntoTaggedField } from '../helpers/input'
import type { ChainablePromiseElement } from '../types'

/**
 * Test tags for the Kelola kategori screen, from TESTABILITY.md ("Kelola
 * kategori" section). They live here instead of config/tags.ts only because
 * that file is frozen for Phase 1; the values mirror TestTags.kt exactly.
 *
 * Row suffix format follows the locator map in
 * test-cases-simple-money-tracker.md: `kategori_row_{type}_{slug}` — the
 * category id itself (`inc_salary`) already carries type and slug, so the row
 * tag is `kategori_row_<categoryId>` and the row actions are prefixed.
 */
export const kategoriTags = {
  screen: 'kategori_screen',
  toggleType: 'kategori_toggle_type',
  toggleIncome: 'kategori_toggle_type_0',
  toggleExpense: 'kategori_toggle_type_1',
  row: (categoryId: string) => `kategori_row_${categoryId}`,
  rowEdit: (categoryId: string) => `kategori_row_edit_${categoryId}`,
  rowHide: (categoryId: string) => `kategori_row_hide_${categoryId}`,
  rowDelete: (categoryId: string) => `kategori_row_delete_${categoryId}`,
  addButton: 'kategori_add_button',
  deleteSheet: 'kategori_delete_sheet',
  // Rename dialog (verified live): tagged field and buttons, no text
  // fallbacks needed despite being a Compose dialog.
  formName: 'kategori_form_name',
  formSave: 'kategori_form_save',
  formCancel: 'kategori_form_cancel',
} as const

/**
 * Kelola kategori screen, reached from Ringkasan (`ringkasan_kelola_button`)
 * or from the Tambah form (`tambah_link_kelola_kategori`). Search uses the
 * shared `component_field_search` design-system tag.
 *
 * The "Ubah kategori" dialog is a Compose dialog with no test tags
 * (test-cases-simple-money-tracker.md locator map), so the dialog input and
 * "Batal"/"Ubah" buttons use text locators — the documented fallback.
 */
export class KategoriPage extends BasePage {
  constructor() {
    super(kategoriTags.screen)
  }

  row(categoryId: string): ChainablePromiseElement {
    return byTag(kategoriTags.row(categoryId))
  }

  /** The row's color mark square (verified live: a 32×32 px child of the row). */
  mark(categoryId: string): ChainablePromiseElement {
    return byTag(`mark_${categoryId}`)
  }

  /** "Ubah kategori" dialog name field (dialog is fully tagged on build v2.2). */
  get formName(): ChainablePromiseElement {
    return byTag(kategoriTags.formName)
  }

  get formSave(): ChainablePromiseElement {
    return byTag(kategoriTags.formSave)
  }

  get formCancel(): ChainablePromiseElement {
    return byTag(kategoriTags.formCancel)
  }

  /** Scrolls a category row into view (LazyColumn rows recompose off-screen). */
  async scrollToRow(categoryId: string): Promise<void> {
    await scrollToTag(kategoriTags.row(categoryId))
  }

  async openFromRingkasan(): Promise<void> {
    await byTag(tags.ringkasan.kelolaButton).click()
    await this.waitForScreen()
  }

  async openFromTambah(): Promise<void> {
    await byTag(tags.tambah.linkKelolaKategori).click()
    await this.waitForScreen()
  }

  /** Toggle between Pemasukan (income) and Pengeluaran (expense) lists. */
  async selectType(type: 'pemasukan' | 'pengeluaran'): Promise<void> {
    await byTag(type === 'pemasukan' ? kategoriTags.toggleIncome : kategoriTags.toggleExpense).click()
  }

  /** Types into the shared search field; text filters the current tab by name. */
  async search(query: string): Promise<void> {
    await typeIntoTaggedField(byTag(tags.component.fieldSearch), query)
  }

  /**
   * Count of top-level category rows currently rendered in the active tab.
   * The negative lookahead skips the `kategori_row_edit_/hide_/delete_` action
   * nodes that share the row tag prefix.
   */
  async categoryRowCount(): Promise<number> {
    const rows = await allByTagMatches('kategori_row_(?!(edit|hide|delete)).*')
    return rows.length
  }

  /** Opens the "Ubah kategori" dialog for `categoryId`. */
  async openEditDialog(categoryId: string): Promise<void> {
    // The expense list holds 27 rows; scroll the row into view before
    // clicking or it may not be composed at all.
    await scrollToTag(kategoriTags.row(categoryId))
    await byTag(kategoriTags.rowEdit(categoryId)).click()
    await byTag(kategoriTags.formName).waitForDisplayed({ timeout: 10_000 })
  }

  /**
   * Renames the category in the open dialog via the shared verified typing
   * helper. The keyboard resize shifts the dialog, so a cached-bounds click
   * on the field wrapper can land on the scrim and dismiss the dialog — the
   * helper clicks the field's inner node, verifies the text landed and
   * retries, and throws if it never does, so Save below only runs with the
   * intended content. If the dialog was dismissed before typing starts, it
   * is reopened first.
   */
  async renameInDialog(categoryId: string, newName: string): Promise<void> {
    const field = byTag(kategoriTags.formName)
    if (!(await field.isExisting().catch(() => false))) {
      await this.openEditDialog(categoryId)
    }
    await typeIntoTaggedField(field, newName, kategoriTags.formName)
    const save = byTag(kategoriTags.formSave)
    await save.waitForDisplayed({ timeout: 5_000 })
    await save.click()
    await save.waitForDisplayed({ reverse: true, timeout: 5_000 })
  }

  /** Hides (or, when hidden, shows) the category via the eye toggle. */
  async toggleHidden(categoryId: string): Promise<void> {
    await byTag(kategoriTags.rowHide(categoryId)).click()
  }
}
