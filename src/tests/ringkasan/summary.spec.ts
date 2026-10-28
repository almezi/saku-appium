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
import { APP_COLD_START } from '../../config/timeouts'

const EXPENSE = 50_000
const SALARY = 200_000
const SALES = 50_000
const EXTRA_EXPENSE = 300_000
const BIG_INCOME = 1_500_000_000

describe('TC-SUM — Ringkasan summary math (Phase 1) @regression', () => {
  const daftar = new DaftarPage()
  const ringkasan = new RingkasanPage()

  before(async () => {
    await expect(byTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START })
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

  it('TC-SUM-05 income 0 renders the savings dash — no divide-by-zero @regression', async () => {
    await ringkasan.open()
    // Verified live: with income 0 the savings value renders "—" (with the
    // hint "Tambah pemasukan…"), never NaN/Infinity.
    expect(await ringkasan.savingsText()).toBe('—')
    expect(await ringkasan.balanceValue()).toBe(-EXPENSE)
    // The income breakdown card is hidden entirely in this state.
    expect(await byTag(tags.ringkasan.breakdownIncome).isExisting()).toBe(false)
  })

  it('seeds two incomes for the multi-category assertions @regression', async () => {
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

  it('TC-SUM-01 balance value equals income minus expense @regression', async () => {
    await ringkasan.open()
    expect(await ringkasan.balanceValue()).toBe(SALARY + SALES - EXPENSE)
  })

  it('TC-SUM-02/03 totals cards match the Transaksi summaries for the same month @regression', async () => {
    const [cardIncome, cardExpense] = await Promise.all([
      ringkasan.incomeTotal(),
      ringkasan.expenseTotal(),
    ])
    await daftar.open()
    expect(cardIncome).toBe(await daftar.summaryIncome())
    expect(cardExpense).toBe(await daftar.summaryExpense())
  })

  it('TC-SUM-04 savings rate follows (income − expense) / income with one comma decimal @regression', async () => {
    await ringkasan.open()
    const income = SALARY + SALES
    const expected = ((income - EXPENSE) / income) * 100
    expect(await ringkasan.savingsText()).toBe(formatSavingsRate(expected))
  })

  it('TC-SUM-07 income breakdown percentages sum to 100 @regression', async () => {
    await ringkasan.open()
    const salaryShare = percentOf(await ringkasan.breakdownItemTexts(categories.income.salary))
    const salesShare = percentOf(await ringkasan.breakdownItemTexts(categories.income.sales))
    expect(salaryShare + salesShare).toBe(100)
  })

  it('TC-SUM-08 expense breakdown percentages sum to 100 @regression', async () => {
    // The expense card is the last section — scroll it into composition
    // first (its rows stale out from under a bare scrollIntoView).
    await ringkasan.open()
    await ringkasan.scrollToBottom()
    expect(percentOf(await ringkasan.breakdownItemTexts(categories.expense.dailyFood))).toBe(100)
  })

  it('TC-SUM-09 breakdown bar widths match the category shares @regression', async () => {
    const salaryRatio = await ringkasan.breakdownBarRatio(categories.income.salary)
    const salesRatio = await ringkasan.breakdownBarRatio(categories.income.sales)
    expect(salaryRatio).toBeCloseTo(SALARY / (SALARY + SALES), 1)
    expect(salesRatio).toBeCloseTo(SALES / (SALARY + SALES), 1)
  })

  it('TC-SUM-06 comparison amounts match the totals cards @regression', async () => {
    const texts = await ringkasan.comparisonTexts()
    expect(texts).toContain(formatRp(SALARY + SALES))
    expect(texts).toContain(formatRp(EXPENSE))
  })

  it('TC-SUM-12 negative balance renders U+2212Rp, not "Rp -" @regression', async () => {
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

  it('TC-SUM-11 large values format with separators and stay readable @regression', async () => {
    await createTransaction({
      type: 'pemasukan',
      amount: BIG_INCOME,
      categoryId: categories.income.other,
      note: uniqueNote('sum-big'),
    })
    await ringkasan.open()
    const balance = SALARY + SALES + BIG_INCOME - EXPENSE - EXTRA_EXPENSE
    expect(await ringkasan.balanceText()).toBe(formatRp(balance))
    await expect(byTag(tags.ringkasan.balanceValue)).toBeDisplayed()
  })

  it('TC-SUM-13 scrolling to the bottom renders every section @regression', async () => {
    await ringkasan.open()
    const kelola = await scrollToTag(tags.ringkasan.kelolaButton)
    await expect(kelola).toBeDisplayed()
    const expenseCard = await scrollToTag(tags.ringkasan.breakdownExpense)
    await expect(expenseCard).toBeDisplayed()
    const anggaran = await scrollToTag(tags.ringkasan.anggaranButton)
    await expect(anggaran).toBeDisplayed()
  })

  it('TC-SUM-10 empty month shows the empty state with no NaN/Infinity @regression', async () => {
    await ringkasan.prevMonth()
    await expect(byTag(tags.ringkasan.emptyState)).toBeDisplayed()
    expect((await ringkasan.emptyStateTexts()).join(' ')).toContain(
      'Belum ada data untuk diringkas',
    )
    // Verified live: the whole content area is replaced — no savings row,
    // no breakdown cards, no buttons.
    expect(await byTag(tags.ringkasan.savingsRow).isExisting()).toBe(false)
    expect(await byTag(tags.ringkasan.breakdownExpense).isExisting()).toBe(false)
    expect(await byTag(tags.ringkasan.balanceCard).isExisting()).toBe(false)
    // No broken math anywhere on screen. Rendered-text probes (not the tag
    // contract): NaN/Infinity would surface as visible text, not as a tag,
    // so these textContains selectors stay raw by design.
    expect((await $$('android=new UiSelector().textContains("NaN")')).length).toBe(0)
    expect((await $$('android=new UiSelector().textContains("Infinity")')).length).toBe(0)
    await ringkasan.nextMonth()
  })
})
