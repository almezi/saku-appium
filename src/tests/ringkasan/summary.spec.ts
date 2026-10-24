import { byTag, scrollToTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransaction, uniqueNote } from '../../helpers/transactions'
import { DaftarPage } from '../../pageobjects/daftar.page'
import { RingkasanPage } from '../../pageobjects/ringkasan.page'
import {
  formatNegativeRp,
  formatRp,
  formatSavingsRate,
} from '../../helpers/money'

const EXPENSE = 50_000
const SALARY = 200_000
const SALES = 50_000
const EXTRA_EXPENSE = 300_000
const BIG_INCOME = 1_500_000_000

describe('TC-SUM — Ringkasan summary math (Phase 1)', () => {
  const daftar = new DaftarPage()
  const ringkasan = new RingkasanPage()

  before(async () => {
    await byTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
    // Expense first: the income-0 savings state (TC-SUM-05) is only
    // reachable before any income exists.
    await createTransaction({
      type: 'pengeluaran',
      amount: EXPENSE,
      categoryId: categories.expense.dailyFood,
      note: uniqueNote('sum-exp'),
    })
  })

  /** Percentage text ("80%") from a breakdown row's rendered texts. */
  function percentOf(texts: string[]): number {
    const pct = texts.find((t) => /^\d+%$/.test(t))
    if (!pct) throw new Error(`No percentage text in breakdown row: ${JSON.stringify(texts)}`)
    return parseInt(pct, 10)
  }

  it('TC-SUM-05 income 0 renders the savings dash — no divide-by-zero', async () => {
    await ringkasan.open()
    // Verified live: with income 0 the savings value renders "—" (with the
    // hint "Tambah pemasukan…"), never NaN/Infinity.
    expect(await ringkasan.savingsText()).toBe('—')
    expect(await ringkasan.balanceValue()).toBe(-EXPENSE)
    // The income breakdown card is hidden entirely in this state.
    expect(await byTag(tags.ringkasan.breakdownIncome).isExisting()).toBe(false)
  })

  it('seeds two incomes for the multi-category assertions', async () => {
    await createTransaction({
      type: 'pemasukan',
      amount: SALARY,
      categoryId: categories.income.salary,
      note: uniqueNote('sum-sal'),
    })
    await createTransaction({
      type: 'pemasukan',
      amount: SALES,
      categoryId: categories.income.sales,
      note: uniqueNote('sum-sal2'),
    })
  })

  it('TC-SUM-01 balance value equals income minus expense', async () => {
    await ringkasan.open()
    expect(await ringkasan.balanceValue()).toBe(SALARY + SALES - EXPENSE)
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
    const income = SALARY + SALES
    const expected = ((income - EXPENSE) / income) * 100
    expect(await ringkasan.savingsText()).toBe(formatSavingsRate(expected))
  })

  it('TC-SUM-07 income breakdown percentages sum to 100', async () => {
    await ringkasan.open()
    const salaryShare = percentOf(await ringkasan.breakdownItemTexts(categories.income.salary))
    const salesShare = percentOf(await ringkasan.breakdownItemTexts(categories.income.sales))
    expect(salaryShare + salesShare).toBe(100)
  })

  it('TC-SUM-08 expense breakdown percentages sum to 100', async () => {
    // The expense card is the last section — scroll it into composition
    // first (its rows stale out from under a bare scrollIntoView).
    await ringkasan.open()
    await ringkasan.scrollToBottom()
    expect(percentOf(await ringkasan.breakdownItemTexts(categories.expense.dailyFood))).toBe(100)
  })

  it('TC-SUM-09 breakdown bar widths match the category shares', async () => {
    const salaryRatio = await ringkasan.breakdownBarRatio(categories.income.salary)
    const salesRatio = await ringkasan.breakdownBarRatio(categories.income.sales)
    expect(salaryRatio).toBeCloseTo(SALARY / (SALARY + SALES), 1)
    expect(salesRatio).toBeCloseTo(SALES / (SALARY + SALES), 1)
  })

  it('TC-SUM-06 comparison amounts match the totals cards', async () => {
    const texts = await ringkasan.comparisonTexts()
    expect(texts).toContain(formatRp(SALARY + SALES))
    expect(texts).toContain(formatRp(EXPENSE))
  })

  it('TC-SUM-12 negative balance renders U+2212Rp, not "Rp -"', async () => {
    await createTransaction({
      type: 'pengeluaran',
      amount: EXTRA_EXPENSE,
      categoryId: categories.expense.transportPublic,
      note: uniqueNote('sum-neg'),
    })
    await ringkasan.open()
    const balance = SALARY + SALES - EXPENSE - EXTRA_EXPENSE
    expect(await ringkasan.balanceValue()).toBe(balance)
    expect(await ringkasan.balanceText()).toBe(formatNegativeRp(balance))
  })

  it('TC-SUM-11 large values format with separators and stay readable', async () => {
    await createTransaction({
      type: 'pemasukan',
      amount: BIG_INCOME,
      categoryId: categories.income.other,
      note: uniqueNote('sum-big'),
    })
    await ringkasan.open()
    const balance = SALARY + SALES + BIG_INCOME - EXPENSE - EXTRA_EXPENSE
    expect(await ringkasan.balanceText()).toBe(formatRp(balance))
    expect(await byTag(tags.ringkasan.balanceValue).isDisplayed()).toBe(true)
  })

  it('TC-SUM-13 scrolling to the bottom renders every section', async () => {
    await ringkasan.open()
    const kelola = await scrollToTag(tags.ringkasan.kelolaButton)
    expect(await kelola.isDisplayed()).toBe(true)
    const expenseCard = await scrollToTag(tags.ringkasan.breakdownExpense)
    expect(await expenseCard.isDisplayed()).toBe(true)
    const anggaran = await scrollToTag(tags.ringkasan.anggaranButton)
    expect(await anggaran.isDisplayed()).toBe(true)
  })

  it('TC-SUM-10 empty month shows the empty state with no NaN/Infinity', async () => {
    await ringkasan.prevMonth()
    await byTag(tags.ringkasan.emptyState).waitForDisplayed()
    expect((await ringkasan.emptyStateTexts()).join(' ')).toContain(
      'Belum ada data untuk diringkas',
    )
    // Verified live: the whole content area is replaced — no savings row,
    // no breakdown cards, no buttons.
    expect(await byTag(tags.ringkasan.savingsRow).isExisting()).toBe(false)
    expect(await byTag(tags.ringkasan.breakdownExpense).isExisting()).toBe(false)
    expect(await byTag(tags.ringkasan.balanceCard).isExisting()).toBe(false)
    // No broken math anywhere on screen.
    expect((await $$('android=new UiSelector().textContains("NaN")')).length).toBe(0)
    expect((await $$('android=new UiSelector().textContains("Infinity")')).length).toBe(0)
    await ringkasan.nextMonth()
  })
})
