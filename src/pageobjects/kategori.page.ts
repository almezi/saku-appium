import { byTag, allByTagMatches } from '../helpers/locators'
import { BasePage } from './base.page'
import { typeIntoTaggedField } from '../helpers/input'
import type { ChainablePromiseElement } from 'webdriverio'

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

  async openFromRingkasan(): Promise<void> {
    await byTag('ringkasan_kelola_button').click()
    await this.waitForScreen()
  }

  async openFromTambah(): Promise<void> {
    await byTag('tambah_link_kelola_kategori').click()
    await this.waitForScreen()
  }

  /** Toggle between Pemasukan (income) and Pengeluaran (expense) lists. */
  async selectType(type: 'pemasukan' | 'pengeluaran'): Promise<void> {
    await byTag(type === 'pemasukan' ? kategoriTags.toggleIncome : kategoriTags.toggleExpense).click()
  }

  /** Types into the shared search field; text filters the current tab by name. */
  async search(query: string): Promise<void> {
    await typeIntoTaggedField(byTag('component_field_search'), query)
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
    await byTag(kategoriTags.rowEdit(categoryId)).click()
    await $('android=new UiSelector().textContains("Ubah kategori")').waitForDisplayed({
      timeout: 10_000,
    })
  }

  /**
   * Renames the category in the open dialog. The dialog field exposes the
   * "1–20 karakter" placeholder as text (no test tag), so it is located by
   * that documented placeholder.
   */
  async renameInDialog(newName: string): Promise<void> {
    const input = $('android=new UiSelector().textContains("karakter")')
    await input.waitForDisplayed({ timeout: 10_000 })
    await typeIntoTaggedField(input, newName)
    await $('android=new UiSelector().text("Ubah")').click()
  }

  /** Cancels the open edit dialog via "Batal" (no change). */
  async cancelDialog(): Promise<void> {
    await $('android=new UiSelector().text("Batal")').click()
  }

  /** Hides (or, when hidden, shows) the category via the eye toggle. */
  async toggleHidden(categoryId: string): Promise<void> {
    await byTag(kategoriTags.rowHide(categoryId)).click()
  }
}
