import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransaction, uniqueNote } from '../../helpers/transactions'
import { DaftarPage } from '../../pageobjects/daftar.page'
import { RingkasanPage } from '../../pageobjects/ringkasan.page'
import { formatNegativeRp } from '../../helpers/money'

const INCOME = 200_000
const EXPENSE = 75_000
const BIG_EXPENSE = 500_000

describe('TC-EXP — add expense (Phase 1)', () => {
  const daftar = new DaftarPage()
  const ringkasan = new RingkasanPage()

  before(async () => {
    await byTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
    await createTransaction({
      type: 'pemasukan',
      amount: INCOME,
      categoryId: categories.income.freelance,
      note: uniqueNote('exp-inc'),
    })
    await createTransaction({
      type: 'pengeluaran',
      amount: EXPENSE,
      categoryId: categories.expense.dailyFood,
      note: uniqueNote('exp'),
    })
  })

  it('TC-EXP-01 expense saves and appears in the list with the U+2212 minus', async () => {
    await daftar.open()
    // Rows render the amount, not the note.
    const row = await daftar.findRowText(formatNegativeRp(EXPENSE))
    expect(await row.isDisplayed()).toBe(true)
  })

  it('TC-EXP-03 list expense summary equals the saved expense', async () => {
    expect(await daftar.summaryExpense()).toBe(EXPENSE)
    expect(await daftar.summaryIncome()).toBe(INCOME)
  })

  it('TC-EXP-04 balance decreases to income minus expense', async () => {
    await ringkasan.open()
    expect(await ringkasan.balanceValue()).toBe(INCOME - EXPENSE)
  })

  it('TC-EXP-08 expense above balance renders a negative balance', async () => {
    const tambahTag = byTag(tags.navTambah)
    await tambahTag.click()
    await createTransaction({
      type: 'pengeluaran',
      amount: BIG_EXPENSE,
      categoryId: categories.expense.transportFuel,
      note: uniqueNote('exp-big'),
    })
    await ringkasan.open()
    const balance = INCOME - EXPENSE - BIG_EXPENSE
    expect(await ringkasan.balanceValue()).toBe(balance)
    expect(await ringkasan.balanceText()).toBe(formatNegativeRp(balance))
  })
})
