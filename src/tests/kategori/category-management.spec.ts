import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransaction, uniqueNote } from '../../helpers/transactions'
import { TambahPage } from '../../pageobjects/tambah.page'
import { RingkasanPage } from '../../pageobjects/ringkasan.page'
import { KategoriPage } from '../../pageobjects/kategori.page'
import { typeIntoTaggedField } from '../../helpers/input'

/**
 * TC-KAT — Kelola kategori: defaults, search, rename, hide (Phase 2).
 * Cases picked from Phase 2.B in progress.md / test-cases-simple-money-tracker.md.
 *
 * `before` seeds one income: on an empty month Ringkasan hides the Anggaran
 * AND Kelola buttons (UI_SPEC 6.3, verified live), so TC-KAT-01's entry path
 * needs a non-empty month (same trap budget.spec hit; first wdio run of this
 * file failed 0/13 on exactly that cascade, 2026-10-25).
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
  categories.income.transferIn,
  categories.income.gift,
  categories.income.other,
]

describe('TC-KAT — category management (Phase 2) @regression', () => {
  const tambah = new TambahPage()
  const ringkasan = new RingkasanPage()
  const kategori = new KategoriPage()

  before(async () => {
    await byTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
    // Un-hides Ringkasan's Kelola button on an otherwise empty month (see
    // the file comment); the category screens under test never read it.
    await createTransaction({
      type: 'pemasukan',
      amount: 50_000,
      categoryId: categories.income.salary,
      note: uniqueNote('kat-seed'),
    })
  })

  it('TC-KAT-01 the Ringkasan manage button opens kategori_screen @regression', async () => {
    await ringkasan.open()
    await kategori.openFromRingkasan()
    expect(await kategori.isDisplayed()).toBe(true)
  })

  it('TC-KAT-02 the Tambah manage-category link opens kategori_screen @regression', async () => {
    // TC-KAT-01 leaves the app on kategori, which shows no bottom bar
    // (UI_SPEC 4), so step back to a bar screen before opening Tambah.
    await kategori.tapBack()
    await tambah.open()
    await kategori.openFromTambah()
    expect(await kategori.isDisplayed()).toBe(true)
  })

  it('TC-KAT-03/04 the income tab lists all default income categories @regression', async () => {
    // Opens on Pemasukan (UI_SPEC 6.5); the list is a LazyColumn, so scroll
    // each row into view before asserting (9 defaults verified live — the
    // build adds inc_sales and inc_transfer_in to the original 7).
    for (const id of DEFAULT_INCOME_IDS) {
      await kategori.scrollToRow(id)
      expect(await kategori.row(id).isDisplayed()).toBe(true)
    }
  })

  it('TC-KAT-05 the type toggle switches to the expense category list @regression', async () => {
    await kategori.selectType('pengeluaran')
    for (const id of [
      categories.expense.dailyFood,
      categories.expense.dailyGroceries,
      categories.expense.transportFuel,
      categories.expense.dailyOther,
    ]) {
      await kategori.scrollToRow(id)
      expect(await kategori.row(id).isDisplayed()).toBe(true)
    }
    // Income rows are gone from the rendered list.
    expect(await kategori.row(categories.income.salary).isExisting()).toBe(false)
    await kategori.selectType('pemasukan')
  })

  it('TC-KAT-06 search filters the list by name @regression', async () => {
    const before = await kategori.categoryRowCount()
    expect(before).toBeGreaterThan(1)
    // "gaj" matches only "Gaji" (income tab, case-insensitive).
    await kategori.search('gaj')
    await kategori.row(categories.income.salary).waitForDisplayed({ timeout: 10_000 })
    const after = await kategori.categoryRowCount()
    expect(after).toBe(1)
    expect(await kategori.row(categories.income.freelance).isExisting()).toBe(false)
  })

  it('TC-KAT-07 the pencil opens the "Ubah kategori" dialog with its field and actions @regression', async () => {
    await kategori.search('') // TC-KAT-06's filter persists (UI_SPEC 6.5)
    await kategori.openEditDialog(categories.income.salary)
    expect(await kategori.formName.isDisplayed()).toBe(true)
    expect(await kategori.formCancel.isDisplayed()).toBe(true)
    await kategori.formCancel.click()
    await kategori.formCancel.waitForDisplayed({ reverse: true })
  })

  it('TC-KAT-09 renaming to an empty name is blocked @regression', async () => {
    await kategori.openEditDialog(categories.income.salary)
    // The dialog opens with an empty field (verified live): saving is
    // rejected ("Nama kategori tidak boleh kosong") and the dialog stays.
    await kategori.formSave.click()
    expect(await kategori.formName.isDisplayed()).toBe(true)
    await kategori.formCancel.click()
    await kategori.formCancel.waitForDisplayed({ reverse: true })
  })

  // TC-KAT-10 and TC-KAT-08 are it.skip-ped per the AGENTS.md 3-failure
  // rule: the "Ubah kategori" dialog self-dismisses between the open-wait
  // and typing under WebdriverIO (kategori_form_name gone for the full 15 s
  // waitForExist right after waitForDisplayed passed). Same signature as the
  // TC-LIST-07 skip in 1.D — dialog + keyboard-recompose flake, identical
  // flow works via Appium MCP set_value. See BUG_Found_04.md; revisit with
  // the setValue-based entry noted there.

  it.skip('TC-KAT-10 cancelling the dialog leaves the category unchanged @regression', async () => {
    await kategori.openEditDialog(categories.income.salary)
    await typeIntoTaggedField(kategori.formName, 'Jangan Disimpan')
    await kategori.formCancel.click()
    await kategori.formCancel.waitForDisplayed({ reverse: true })
    const rowText = await kategori.rowText(categories.income.salary)
    expect(rowText).not.toContain('Jangan Disimpan')
  })

  it('TC-KAT-13 the row shows the Bawaan transaction count @regression', async () => {
    const rowText = await kategori.rowText(categories.income.salary)
    expect(rowText).toContain('Bawaan ·')
  })

  it('TC-KAT-14 the category color mark renders @regression', async () => {
    await kategori.scrollToRow(categories.income.salary)
    expect(await kategori.mark(categories.income.salary).isDisplayed()).toBe(true)
  })

  it.skip('TC-KAT-08 renaming a category updates its list row @regression', async () => {
    const newName = `Uji Gaji ${Date.now().toString(36)}`.slice(0, 20)
    await kategori.openEditDialog(categories.income.salary)
    await kategori.renameInDialog(categories.income.salary, newName)
    const rowText = await kategori.rowText(categories.income.salary)
    expect(rowText).toContain(newName)
  })

  it('TC-KAT-11/12 hiding a category removes it from the Tambah picker @regression', async () => {
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

  it('TC-KAT-15 back returns to the previous screen @regression', async () => {
    await kategori.tapBack()
    expect(await tambah.isDisplayed()).toBe(true)
  })
})
