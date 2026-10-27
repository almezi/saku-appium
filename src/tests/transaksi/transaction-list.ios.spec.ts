import { iosByTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransactionIos, uniqueNote } from '../../helpers/transactions'
import { DaftarIosPage } from '../../pageobjects/daftar.ios.page'
import { RingkasanIosPage } from '../../pageobjects/ringkasan.ios.page'
import { TambahIosPage } from '../../pageobjects/tambah.ios.page'
import { formatNegativeRp, formatRp } from '../../helpers/money'

const A_YESTERDAY_INCOME = 254_000
const B_TODAY_EXPENSE = 500_000
const C_TODAY_INCOME = 60_000
const TODAY_NET = C_TODAY_INCOME - B_TODAY_EXPENSE

const idDate = (d: Date) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
const ID_WEEKDAYS = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']

describe('TC-LIST — transaction list (Phase 1) on iOS @regression', () => {
  const daftar = new DaftarIosPage()
  const ringkasan = new RingkasanIosPage()
  const tambah = new TambahIosPage()
  const today = new Date()
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

  before(async () => {
    await iosByTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
  })

  it('seeds three transactions across two days', async () => {
    await createTransactionIos({
      type: 'pemasukan',
      amount: A_YESTERDAY_INCOME,
      categoryId: categories.income.sales,
      note: uniqueNote('list-a'),
      date: yesterday,
    })
    await createTransactionIos({
      type: 'pengeluaran',
      amount: B_TODAY_EXPENSE,
      categoryId: categories.expense.dailyGroceries,
      note: uniqueNote('list-b'),
      date: today,
    })
    await createTransactionIos({
      type: 'pemasukan',
      amount: C_TODAY_INCOME,
      categoryId: categories.income.investment,
      note: uniqueNote('list-c'),
      date: today,
    })
    await daftar.open()
    expect(await daftar.dayHeaderCount()).toBe(2)
  })

  it('TC-LIST-01 empty month shows the empty state', async () => {
    await daftar.open()
    await daftar.prevMonth()
    try {
      const prevLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })
        .format(new Date(today.getFullYear(), today.getMonth() - 1, 1))
        .toUpperCase()
      expect(await daftar.monthLabel()).toBe(prevLabel)
      const texts = await daftar.emptyStateTexts()
      expect(texts.join(' ')).toContain('Belum ada transaksi bulan ini')
    } finally {
      await daftar.nextMonth()
    }
    expect(await daftar.dayHeaderCount()).toBeGreaterThanOrEqual(1)
  })

  it('TC-LIST-02 day header shows weekday, date and net total', async () => {
    const texts = await daftar.firstDayHeaderTexts()
    expect(texts[0]).toBe(ID_WEEKDAYS[today.getDay()])
    expect(texts[1]).toBe(idDate(today))
    expect(texts[2]).toBe(formatNegativeRp(Math.abs(TODAY_NET)))
  })

  it('TC-LIST-04 items sort newest first (days and within a day)', async () => {
    const amounts = await daftar.rowAmountTextsInOrder()
    expect(amounts[0]).toBe(formatRp(C_TODAY_INCOME))
    expect(amounts[1]).toBe(formatRp(B_TODAY_EXPENSE))
    expect(amounts[2]).toBe(formatRp(A_YESTERDAY_INCOME))
  })

  it('TC-LIST-06 income rows carry no minus; expense-heavy day total does', async () => {
    const amounts = await daftar.rowAmountTextsInOrder()
    const incomeRows = [formatRp(C_TODAY_INCOME), formatRp(A_YESTERDAY_INCOME)]
    for (const row of amounts.filter((a) => incomeRows.includes(a))) {
      expect(row.startsWith('\u2212')).toBe(false)
    }
    expect(await daftar.firstDayHeaderTotal()).toBe(TODAY_NET)
  })

  it('TC-LIST-03 items group under their own day headers', async () => {
    expect(await daftar.dayHeaderCount()).toBe(2)
    const yesterdayRow = await daftar.findRowText(formatRp(A_YESTERDAY_INCOME))
    expect(await yesterdayRow.isDisplayed()).toBe(true)
  })

  it('TC-LIST-05 rows render category, type label and formatted amount', async () => {
    const incomeRow = await daftar.rowTexts(formatRp(C_TODAY_INCOME))
    expect(incomeRow).toContain('Investasi')
    expect(incomeRow).toContain('Pemasukan')
    expect(incomeRow).toContain(formatRp(C_TODAY_INCOME))

    const expenseRow = await daftar.rowTexts(formatRp(B_TODAY_EXPENSE))
    expect(expenseRow).toContain('Pengeluaran')
    expect(expenseRow).toContain(formatRp(B_TODAY_EXPENSE))
  })

  it.skip('TC-LIST-07 long category name does not overlap the row amount (skipped on iOS)', async () => {})

  it('TC-LIST-09 income summary equals the sum of income rows this month', async () => {
    await daftar.open()
    expect(await daftar.summaryIncome()).toBe(A_YESTERDAY_INCOME + C_TODAY_INCOME)
  })

  it('TC-LIST-10 expense summary equals the sum of expense rows this month', async () => {
    expect(await daftar.summaryExpense()).toBe(B_TODAY_EXPENSE)
  })

  it.skip('TC-LIST-08 seeds bulk items (skipped on iOS)', async () => {})
  it.skip('TC-LIST-08 scrolling 100+ items does not crash (skipped on iOS)', async () => {})

  it.skip('TC-LIST-11 pull-to-refresh keeps the data correct (skipped on iOS)', async () => {})
})
