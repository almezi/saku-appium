import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransaction, uniqueNote } from '../../helpers/transactions'
import { DaftarPage } from '../../pageobjects/daftar.page'
import { RingkasanPage } from '../../pageobjects/ringkasan.page'
import { formatNegativeRp, formatSavingsRate } from '../../helpers/money'

const INCOME = 200_000
const EXPENSE = 50_000
const EXTRA_EXPENSE = 300_000

describe('TC-SUM — Ringkasan summary math (Phase 1)', () => {
  const daftar = new DaftarPage()
  const ringkasan = new RingkasanPage()

  before(async () => {
    await byTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
    await createTransaction({
      type: 'pemasukan',
      amount: INCOME,
      categoryId: categories.income.salary,
      note: uniqueNote('sum-inc'),
    })
    await createTransaction({
      type: 'pengeluaran',
      amount: EXPENSE,
      categoryId: categories.expense.dailyFood,
      note: uniqueNote('sum-exp'),
    })
  })

  it('TC-SUM-01 balance value equals income minus expense', async () => {
    await ringkasan.open()
    expect(await ringkasan.balanceValue()).toBe(INCOME - EXPENSE)
  })

  it('TC-SUM-02/03 totals cards match the Transaksi summaries for the same month', async () => {
    const [cardIncome, cardExpense] = await Promise.all([
      ringkasan.incomeTotal(),
      ringkasan.expenseTotal(),
    ])
    await daftar.open()
    expect(cardIncome).toBe(await daftar.summaryIncome())
    expect(cardExpense).toBe(await daftar.summaryExpense())
  })

  it('TC-SUM-04 savings rate follows (income − expense) / income with one comma decimal', async () => {
    await ringkasan.open()
    const expected = ((INCOME - EXPENSE) / INCOME) * 100
    expect(await ringkasan.savingsText()).toBe(formatSavingsRate(expected))
  })

  it('TC-SUM-12 negative balance renders U+2212Rp, not "Rp -"', async () => {
    await byTag(tags.navTambah).click()
    await createTransaction({
      type: 'pengeluaran',
      amount: EXTRA_EXPENSE,
      categoryId: categories.expense.transportPublic,
      note: uniqueNote('sum-neg'),
    })
    await ringkasan.open()
    const balance = INCOME - EXPENSE - EXTRA_EXPENSE
    expect(await ringkasan.balanceValue()).toBe(balance)
    expect(await ringkasan.balanceText()).toBe(formatNegativeRp(balance))
  })
})
