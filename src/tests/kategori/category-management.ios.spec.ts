import { iosByTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransactionIos } from '../../helpers/transactions'
import { TambahIosPage } from '../../pageobjects/tambah.ios.page'
import { RingkasanIosPage } from '../../pageobjects/ringkasan.ios.page'
import { KategoriIosPage } from '../../pageobjects/kategori.ios.page'

/**
 * TC-KAT on iOS — port of category-management.spec.ts (the Android spec is
 * the source of truth for the flow; only the driver layer changes). Cases are
 * split so a failure maps onto one progress.md id (03/04 and 11/12 share a
 * test, as on Android).
 *
 * Platform adaptations (verified live via Appium MCP on iPhone 18 Pro /
 * iOS 27.0, 2026-10-27):
 *  - the Ringkasan Kelola button is hidden while the month has no
 *    transactions (UI_SPEC 6.3), so `before` seeds one income;
 *  - Kategori has no bottom bar: leaving it taps `component_button_back`
 *    (no system BACK on iOS);
 *  - default categories render only the eye toggle — the pencil and trash
 *    exist only for custom rows (KelolaKategoriScreen.kt) — so TC-KAT-07/08/
 *    09/10 run against a custom category created through the "Tambah
 *    kategori" form instead of `inc_salary`, and the ids are runtime-generated
 *    (`cus_pem_<epochMs>`);
 *  - row text is read by geometry: the row's testTag lands on an empty Other
 *    and the texts are hoisted to siblings inside the list;
 *  - the rename dialog PREFILLS the field with the custom name and is not
 *    dismissed by the keyboard (unlike BUG_Found_04 on Android), so TC-KAT-10
 *    and TC-KAT-08 run on iOS where they are it.skip-ped on Android.
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

const SEED_INCOME = 50_000
const RUN = Date.now().toString(36)
const CUSTOM_NAME = `Uji ${RUN}`.slice(0, 20)
const RENAMED_NAME = `Ubah ${RUN}`.slice(0, 20)

describe('TC-KAT — category management (Phase 2) on iOS @regression', () => {
  const tambah = new TambahIosPage()
  const ringkasan = new RingkasanIosPage()
  const kategori = new KategoriIosPage()
  let customId = ''

  before(async () => {
    await expect(iosByTag(tags.tambah.screen)).toBeDisplayed({ wait: 45_000 })
    // Un-hides Ringkasan's Kelola button on an otherwise empty month.
    await createTransactionIos({
      type: 'pemasukan',
      amount: SEED_INCOME,
      categoryId: categories.income.salary,
    })
  })

  it('TC-KAT-01 the Ringkasan manage button opens kategori_screen @regression', async () => {
    await ringkasan.open()
    await kategori.openFromRingkasan()
    await expect(kategori.screen).toBeDisplayed()
  })

  it('TC-KAT-02 the Tambah manage-category link opens kategori_screen @regression', async () => {
    // Kategori shows no bottom bar, so step back to Ringkasan first.
    await kategori.tapBack()
    await ringkasan.waitForScreen()
    await tambah.open()
    await kategori.openFromTambah()
    await expect(kategori.screen).toBeDisplayed()
  })

  it('TC-KAT-03/04 the income tab lists all default income categories @regression', async () => {
    // Opens on Pemasukan; the list is a LazyColumn, so scroll each row below
    // the header before asserting (9 defaults).
    for (const id of DEFAULT_INCOME_IDS) {
      await kategori.scrollToRow(id)
      await expect(kategori.rowHide(id)).toBeDisplayed()
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
      await expect(kategori.rowHide(id)).toBeDisplayed()
    }
    // Income rows are gone from the rendered list.
    expect(await kategori.rowHide(categories.income.salary).isExisting()).toBe(false)
    await kategori.selectType('pemasukan')
  })

  it('TC-KAT-06 search filters the list by name @regression', async () => {
    const before = await kategori.categoryRowCount()
    expect(before).toBeGreaterThan(1)
    // "gaj" matches only "Gaji" (income tab, case-insensitive).
    await kategori.search('gaj')
    await expect(kategori.rowHide(categories.income.salary)).toBeDisplayed({ wait: 10_000 })
    expect(await kategori.categoryRowCount()).toBe(1)
    expect(await kategori.rowHide(categories.income.freelance).isExisting()).toBe(false)
  })

  it('TC-KAT-07 the pencil opens the "Ubah kategori" dialog with its field and actions @regression', async () => {
    // TC-KAT-06's filter persists; clear it, then create the custom category
    // the pencil/trash flows need (default rows have no edit affordance).
    await kategori.search('')
    customId = await kategori.createCategory(CUSTOM_NAME)
    expect(customId).toContain('cus_pem_')

    await kategori.openEditDialog(customId)
    await expect(kategori.formName).toBeDisplayed()
    await expect(kategori.formCancel).toBeDisplayed()
    // iOS prefills the dialog with the custom name (Android opens empty).
    expect(await kategori.renameFieldText()).toBe(CUSTOM_NAME)
    await kategori.cancelRename()
    expect(await kategori.formName.isExisting()).toBe(false)
  })

  it('TC-KAT-09 saving an empty name is blocked and the dialog stays open @regression', async () => {
    await kategori.openEditDialog(customId)
    await kategori.typeRename('')
    await kategori.saveRename()
    await expect(kategori.formName).toBeDisplayed()
    // The category kept its name while the dialog stayed open.
    await kategori.cancelRename()
    expect(await kategori.rowText(customId)).toContain(CUSTOM_NAME)
  })

  it('TC-KAT-10 cancelling the dialog leaves the category unchanged @regression', async () => {
    await kategori.openEditDialog(customId)
    await kategori.typeRename('Jangan Disimpan')
    await kategori.cancelRename()
    expect(await kategori.rowText(customId)).not.toContain('Jangan Disimpan')
  })

  it('TC-KAT-13 the row shows the Bawaan transaction count @regression', async () => {
    expect(await kategori.rowText(categories.income.salary)).toContain('Bawaan ·')
  })

  it('TC-KAT-14 the category color mark renders @regression', async () => {
    await kategori.scrollToRow(categories.income.salary)
    await expect(kategori.mark(categories.income.salary)).toBeDisplayed({ wait: 10_000 })
    await expect(kategori.mark(categories.income.salary)).toBeDisplayed()
  })

  it('TC-KAT-08 renaming a category updates its list row @regression', async () => {
    await kategori.openEditDialog(customId)
    await kategori.typeRename(RENAMED_NAME)
    await kategori.saveRename()
    await kategori.waitForDialogClosed()
    expect(await kategori.rowText(customId)).toContain(RENAMED_NAME)
  })

  it('TC-KAT-11/12 hiding a category removes it from the Tambah picker @regression', async () => {
    // Clear any filter so the gift row is in the rendered list, then hide it.
    await kategori.search('')
    await kategori.setHidden(categories.income.gift, true)
    // Hidden categories show the "show" icon instead of hide; the row stays.
    await expect(kategori.rowHide(categories.income.gift)).toBeDisplayed()

    // The picker on the Tambah form no longer offers the hidden category,
    // while a visible one still does (control). Kategori shows no bottom
    // bar, so step back to Tambah.
    await kategori.tapBack()
    await tambah.waitForScreen()
    await iosByTag(tags.tambah.categoryPager).click()
    await expect(iosByTag(tags.tambah.categorySheetRoot)).toBeDisplayed({ wait: 10_000 })
    expect(
      await iosByTag(tags.tambah.categoryItem(categories.income.gift)).isExisting(),
    ).toBe(false)
    expect(
      await iosByTag(tags.tambah.categoryItem(categories.income.salary)).isExisting(),
    ).toBe(true)
    // The sheet has no cancel button on iOS (and no system BACK).
    await kategori.dismissSheet(tags.tambah.categorySheetRoot)

    // Restore visibility so the fresh-session assumption is not load-bearing
    // beyond this file.
    await kategori.openFromTambah()
    await kategori.setHidden(categories.income.gift, false)
  })

  it('TC-KAT-15 back returns to the previous screen @regression', async () => {
    await kategori.tapBack()
    await expect(tambah.screen).toBeDisplayed()
  })
})
