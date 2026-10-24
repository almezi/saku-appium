import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransaction, uniqueNote } from '../../helpers/transactions'
import { DaftarPage } from '../../pageobjects/daftar.page'
import { formatNegativeRp, formatRp } from '../../helpers/money'

const INCOME = 254_000
const EXPENSE = 131_000

describe('TC-LIST — transaction list (Phase 1)', () => {
  const daftar = new DaftarPage()
  const incomeNote = uniqueNote('list-inc')
  const expenseNote = uniqueNote('list-exp')

  before(async () => {
    await byTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
    await createTransaction({
      type: 'pemasukan',
      amount: INCOME,
      categoryId: categories.income.sales,
      note: incomeNote,
    })
    await createTransaction({
      type: 'pengeluaran',
      amount: EXPENSE,
      categoryId: categories.expense.dailyGroceries,
      note: expenseNote,
    })
  })

  it('TC-LIST-03 both transactions group under today with a day header', async () => {
    await daftar.open()
    expect(await daftar.dayHeaderCount()).toBeGreaterThanOrEqual(1)
    expect(await (await daftar.findRowText(incomeNote)).isDisplayed()).toBe(true)
    expect(await (await daftar.findRowText(expenseNote)).isDisplayed()).toBe(true)
  })

  it('TC-LIST-05 rows render formatted amounts with the right sign', async () => {
    expect(await (await daftar.findRowText(formatRp(INCOME))).isDisplayed()).toBe(true)
    expect(await (await daftar.findRowText(formatNegativeRp(EXPENSE))).isDisplayed()).toBe(true)
  })

  it('TC-LIST-09 income summary equals the sum of income rows this month', async () => {
    expect(await daftar.summaryIncome()).toBe(INCOME)
  })

  it('TC-LIST-10 expense summary equals the sum of expense rows this month', async () => {
    expect(await daftar.summaryExpense()).toBe(EXPENSE)
  })
})
