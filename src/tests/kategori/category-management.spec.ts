import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { TambahPage } from '../../pageobjects/tambah.page'
import { RingkasanPage } from '../../pageobjects/ringkasan.page'
import { KategoriPage } from '../../pageobjects/kategori.page'

/**
 * TC-KAT — Kelola kategori: defaults, search, rename, hide (Phase 2).
 * Cases picked from Phase 2.B in progress.md / test-cases-simple-money-tracker.md.
 *
 * The "Ubah kategori" dialog has no test tags (Compose dialog), so dialog
 * interactions use the documented text-locator fallback inside KategoriPage.
 */
const DEFAULT_INCOME_IDS = [
  categories.income.salary,
  categories.income.freelance,
  categories.income.bonusThr,
  categories.income.investment,
  categories.income.sales,
  categories.income.refund,
  categories.income.gift,
  categories.income.other,
]

describe('TC-KAT — category management (Phase 2) @regression', () => {
  const tambah = new TambahPage()
  const ringkasan = new RingkasanPage()
  const kategori = new KategoriPage()

  before(async () => {
    await byTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
  })

  it('TC-KAT-01 the Ringkasan manage button opens kategori_screen', async () => {
    await ringkasan.open()
    await kategori.openFromRingkasan()
    expect(await kategori.isDisplayed()).toBe(true)
  })

  it('TC-KAT-02 the Tambah manage-category link opens kategori_screen', async () => {
    // TC-KAT-01 leaves the app on kategori, which shows no bottom bar
    // (UI_SPEC 4), so step back to a bar screen before opening Tambah.
    await kategori.tapBack()
    await tambah.open()
    await kategori.openFromTambah()
    expect(await kategori.isDisplayed()).toBe(true)
  })

  it('TC-KAT-03/04 the income tab lists all default income categories', async () => {
    // Opens on Pemasukan (UI_SPEC 6.5); assert every default income row exists.
    for (const id of DEFAULT_INCOME_IDS) {
      expect(await kategori.row(id).isDisplayed()).toBe(true)
    }
  })

  it('TC-KAT-05 the type toggle switches to the expense category list', async () => {
    await kategori.selectType('pengeluaran')
    for (const id of [
      categories.expense.dailyFood,
      categories.expense.dailyGroceries,
      categories.expense.transportFuel,
      categories.expense.dailyOther,
    ]) {
      expect(await kategori.row(id).isDisplayed()).toBe(true)
    }
    // Income rows are gone from the rendered list.
    expect(await kategori.row(categories.income.salary).isExisting()).toBe(false)
    await kategori.selectType('pemasukan')
  })

  it('TC-KAT-06 search filters the list by name', async () => {
    const before = await kategori.categoryRowCount()
    expect(before).toBeGreaterThan(1)
    // "gaj" matches only "Gaji" (income tab, case-insensitive).
    await kategori.search('gaj')
    await kategori.row(categories.income.salary).waitForDisplayed({ timeout: 10_000 })
    const after = await kategori.categoryRowCount()
    expect(after).toBe(1)
    expect(await kategori.row(categories.income.freelance).isExisting()).toBe(false)
  })

  it('TC-KAT-08 renaming a category updates its list row', async () => {
    const newName = `Uji Gaji ${Date.now().toString(36)}`.slice(0, 20)
    await kategori.openEditDialog(categories.income.salary)
    await kategori.renameInDialog(categories.income.salary, newName)
    const rowText = await kategori.row(categories.income.salary).getText()
    expect(rowText).toContain(newName)
  })

  it('TC-KAT-11/12 hiding a category removes it from the Tambah picker', async () => {
    // TC-KAT-06's 'gaj' filter is still active — it persists (UI_SPEC 6.5) —
    // and would keep the gift row out of the rendered list. Clearing the
    // search backspaces the query away, restoring the full tab list.
    await kategori.search('')
    await kategori.toggleHidden(categories.income.gift)
    // Hidden categories show the show icon instead of hide; the row stays.
    expect(await kategori.row(categories.income.gift).isDisplayed()).toBe(true)

    // The picker on the Tambah form no longer offers the hidden category,
    // while a visible one still does (control). Kategori shows no bottom
    // bar (UI_SPEC 4), so step back to a bar screen before opening Tambah.
    await kategori.tapBack()
    await tambah.open()
    await byTag(tags.tambah.categoryPager).click()
    await byTag(tags.tambah.categorySheetRoot).waitForDisplayed({ timeout: 10_000 })
    expect(
      await byTag(tags.tambah.categoryItem(categories.income.gift)).isExisting(),
    ).toBe(false)
    expect(
      await byTag(tags.tambah.categoryItem(categories.income.salary)).isDisplayed(),
    ).toBe(true)
    // The sheet never closes on its own — dismiss it (system back) before
    // asserting it is gone.
    await driver.back()
    await byTag(tags.tambah.categorySheetRoot).waitForDisplayed({ reverse: true })

    // Restore visibility so the fresh-session assumption is not load-bearing
    // beyond this file.
    await tambah.open()
    await kategori.openFromTambah()
    await kategori.toggleHidden(categories.income.gift)
  })

  it('TC-KAT-15 back returns to the previous screen', async () => {
    await kategori.tapBack()
    expect(await tambah.isDisplayed()).toBe(true)
  })
})
