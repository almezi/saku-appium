import { iosByTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransactionIos, uniqueNote } from '../../helpers/transactions'
import { DaftarIosPage } from '../../pageobjects/daftar.ios.page'
import { RingkasanIosPage } from '../../pageobjects/ringkasan.ios.page'
import { UbahIosPage } from '../../pageobjects/ubah.ios.page'
import { TambahIosPage } from '../../pageobjects/tambah.ios.page'
import { formatRp } from '../../helpers/money'

const AMOUNT = 123_000
const NEW_AMOUNT = 456_000

describe('TC-EDIT — edit transaction (Phase 1) on iOS @regression', () => {
  const daftar = new DaftarIosPage()
  const ringkasan = new RingkasanIosPage()
  const ubah = new UbahIosPage()
  const tambah = new TambahIosPage()
  const note = uniqueNote('edit')
  const today = new Date()
  const prevMonthDay = new Date(today.getFullYear(), today.getMonth() - 1, 15)
  const idDate = (d: Date) =>
    new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)

  before(async () => {
    await iosByTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
    await createTransactionIos({
      type: 'pemasukan',
      amount: AMOUNT,
      categoryId: categories.income.refund,
      note,
    })
  })

  async function selectCategoryInline(categoryId: string): Promise<void> {
    const item = iosByTag(tags.tambah.categoryItem(categoryId))
    await item.waitForDisplayed({ timeout: 5_000 })
    await item.click()
  }

  it('TC-EDIT-01 tapping Ubah opens the form prefilled @regression', async () => {
    await daftar.open()
    await ubah.openFromDaftar(daftar, categories.income.refund)
    expect(await ubah.isDisplayed()).toBe(true)
    expect(await ubah.headerLabel()).toBe('Ubah transaksi')
    expect(await tambah.getAmountText()).toBe(formatRp(AMOUNT))
    expect(await tambah.getNoteText()).toBe(note)
    expect(await ubah.isSaveEnabled()).toBe(false)
  })

  it('TC-EDIT-02 changing the amount and saving updates the row and summary @regression', async () => {
    await tambah.fillAmount(NEW_AMOUNT)
    await ubah.save()
    expect(await (await daftar.findRowText(formatRp(NEW_AMOUNT))).isDisplayed()).toBe(true)
    expect(await daftar.summaryIncome()).toBe(NEW_AMOUNT)
  })

  it('TC-EDIT-03 changing the category recalculates the Ringkasan breakdown @regression', async () => {
    await ubah.openFromDaftar(daftar, categories.income.refund)
    await selectCategoryInline(categories.income.salary)
    await ubah.save()
    await ringkasan.open()
    const salaryRow = await ringkasan.breakdownItemTexts(categories.income.salary)
    expect(salaryRow).toContain(formatRp(NEW_AMOUNT))
  })

  it('TC-EDIT-04 switching income to expense swaps the summaries @regression', async () => {
    await daftar.open()
    await ubah.openFromDaftar(daftar, categories.income.salary)
    await iosByTag(tags.component.toggleSegmented(1)).click()
    await selectCategoryInline(categories.expense.dailyFood)
    await ubah.save()
    expect(await daftar.summaryExpense()).toBe(NEW_AMOUNT)
    expect(await daftar.summaryIncome()).toBe(0)
    expect(await daftar.firstDayHeaderTotal()).toBe(-NEW_AMOUNT)
  })

  it('TC-EDIT-06 editing only the note keeps amount and category @regression', async () => {
    const editedNote = uniqueNote('note')
    await ubah.openFromDaftar(daftar, categories.expense.dailyFood)
    await tambah.fillNote(editedNote)
    await ubah.save()
    await ubah.openFromDaftar(daftar, categories.expense.dailyFood)
    expect(await tambah.getNoteText()).toBe(editedNote)
    expect(await tambah.getAmountText()).toBe(formatRp(NEW_AMOUNT))
    const mark = iosByTag(tags.tambah.categoryMark(categories.expense.dailyFood))
    await mark.waitForDisplayed({ timeout: 5_000 })
    await ubah.tapBack()
    await iosByTag(tags.daftar.screen).waitForDisplayed()
  })

  it('TC-EDIT-07 leaving the edit without saving keeps the data @regression', async () => {
    await ubah.openFromDaftar(daftar, categories.expense.dailyFood)
    await tambah.fillAmount(999_999)
    await ubah.tapBack()
    await iosByTag(tags.daftar.screen).waitForDisplayed()
    expect(await (await daftar.findRowText(formatRp(NEW_AMOUNT))).isDisplayed()).toBe(true)
    await ubah.openFromDaftar(daftar, categories.expense.dailyFood)
    expect(await tambah.getAmountText()).toBe(formatRp(NEW_AMOUNT))
  })

  it('TC-EDIT-08 editing to an invalid amount blocks save @regression', async () => {
    await tambah.fillAmount(0)
    expect(await ubah.isSaveEnabled()).toBe(false)
    await ubah.tapBack()
    await iosByTag(tags.daftar.screen).waitForDisplayed()
  })

  it('TC-EDIT-05 changing the date moves the item to another month @regression', async () => {
    await ubah.openFromDaftar(daftar, categories.expense.dailyFood)
    await tambah.selectDate(prevMonthDay)
    await ubah.save()
    await iosByTag(tags.daftar.emptyState).waitForDisplayed({ timeout: 10_000 })
    await daftar.prevMonth()
    expect(await (await daftar.findRowText(formatRp(NEW_AMOUNT))).isDisplayed()).toBe(true)
    const headerTexts = await daftar.firstDayHeaderTexts()
    expect(headerTexts).toContain(idDate(prevMonthDay))
  })
})
