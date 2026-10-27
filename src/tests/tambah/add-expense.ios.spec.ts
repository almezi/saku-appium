import { categories } from '../../config/categories'
import { createTransactionIos, uniqueNote } from '../../helpers/transactions'
import { DaftarIosPage } from '../../pageobjects/daftar.ios.page'
import { RingkasanIosPage } from '../../pageobjects/ringkasan.ios.page'
import { UbahIosPage } from '../../pageobjects/ubah.ios.page'
import { TambahIosPage } from '../../pageobjects/tambah.ios.page'
import { formatNegativeRp, formatRp } from '../../helpers/money'

/**
 * TC-EXP on iOS — 1:1 port of add-expense.spec.ts (the Android spec is the
 * source of truth for cases and assertions; only the driver layer changes).
 *
 * Platform adaptations, mirroring the TC-NAV-06 precedent: iOS has no system
 * BACK, so the Ubah (edit) screen is left via its toolbar back button.
 */
const EXPENSE = 75_000
const INCOME = 200_000
const BIG_EXPENSE = 500_000

describe('TC-EXP — add expense (Phase 1) on iOS @regression', () => {
  const tambah = new TambahIosPage()
  const daftar = new DaftarIosPage()
  const ringkasan = new RingkasanIosPage()
  const ubah = new UbahIosPage()

  // The expense is the only transaction of the day so the day total renders
  // the negative "−Rp" form before later tests add income on top.
  before(async () => {
    await createTransactionIos({
      type: 'pengeluaran',
      amount: EXPENSE,
      categoryId: categories.expense.dailyFood,
      note: uniqueNote('exp'),
    })
  })

  it('TC-EXP-01 expense saves and appears in the list', async () => {
    await daftar.open()
    // Rows render the unsigned amount (sign comes from the type label and
    // the day-total/net color), so assert on the plain formatted value.
    const row = await daftar.findRowText(formatRp(EXPENSE))
    expect(await row.isDisplayed()).toBe(true)
  })

  it('TC-EXP-02 expense-only day total renders −Rp', async () => {
    // Verified live: the day header renders "−Rp 75.000" (U+2212 minus),
    // which parseAmountText reads back as a negative number.
    expect(await daftar.firstDayHeaderTotal()).toBe(-EXPENSE)
  })

  it('TC-EXP-03 list expense summary equals the saved expense', async () => {
    expect(await daftar.summaryExpense()).toBe(EXPENSE)
    expect(await daftar.summaryIncome()).toBe(0)
  })

  it('TC-EXP-04 Ringkasan balance decrements below zero', async () => {
    await ringkasan.open()
    expect(await ringkasan.expenseTotal()).toBe(EXPENSE)
    expect(await ringkasan.balanceValue()).toBe(-EXPENSE)
    expect(await ringkasan.balanceText()).toBe(formatNegativeRp(EXPENSE))
  })

  it('TC-EXP-05 single expense category shows 100% of the breakdown', async () => {
    const texts = await ringkasan.breakdownItemTexts(categories.expense.dailyFood)
    expect(texts).toContain('100%')
    expect(texts).toContain(formatRp(EXPENSE))
  })

  it('TC-EXP-06 expense on the default account Tunai is recorded correctly', async () => {
    // Rows never show the account; the edit form's account selector does.
    await daftar.open()
    await ubah.openFromDaftar(daftar, categories.expense.dailyFood)
    expect(await tambah.getAccountText()).toBe('Tunai')
    await ubah.tapBack()
    await daftar.waitForScreen()
  })

  it('TC-EXP-07 mixed income and expense same day net to the day total', async () => {
    await createTransactionIos({
      type: 'pemasukan',
      amount: INCOME,
      categoryId: categories.income.freelance,
      note: uniqueNote('exp-inc'),
    })
    await daftar.open()
    expect(await daftar.firstDayHeaderTotal()).toBe(INCOME - EXPENSE)
    expect(await daftar.summaryIncome()).toBe(INCOME)
    expect(await daftar.summaryExpense()).toBe(EXPENSE)
  })

  it('TC-EXP-08 expense above balance renders a negative balance', async () => {
    await createTransactionIos({
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
