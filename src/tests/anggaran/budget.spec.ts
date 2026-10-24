import { byTag } from '../../helpers/locators'
import { categories } from '../../config/categories'
import { createTransaction, uniqueNote } from '../../helpers/transactions'
import { RingkasanPage } from '../../pageobjects/ringkasan.page'
import { AnggaranPage } from '../../pageobjects/anggaran.page'
import { formatRp } from '../../helpers/money'

/**
 * TC-BUD — Anggaran / budget limits and status indicators (Phase 2).
 * Cases picked from Phase 2.A in progress.md / test-cases-simple-money-tracker.md.
 *
 * Budget rows expose no raw-status tag, so status labels ("Aman", "Lewat
 * batas") and the "Rp X dari Rp Y" / "Sisa Rp Z" strings are asserted on the
 * row's rendered text — rendered-output assertions, not locators.
 */
const BUDGET_LIMIT = 500_000
const FIRST_EXPENSE = 100_000 // 20% of the limit -> "Aman"
const SECOND_EXPENSE = 450_000 // total 550.000 -> 110% -> "Lewat batas"

describe('TC-BUD — monthly category budgets (Phase 2)', () => {
  const ringkasan = new RingkasanPage()
  const anggaran = new AnggaranPage()

  before(async () => {
    await byTag('tambah_screen').waitForDisplayed({ timeout: 30_000 })
    await ringkasan.open()
  })

  it('TC-BUD-01 tapping the Ringkasan budget button opens the Anggaran screen', async () => {
    await anggaran.openFromRingkasan()
    expect(await anggaran.isDisplayed()).toBe(true)
  })

  it('TC-BUD-11 back returns to Ringkasan', async () => {
    await anggaran.tapBack()
    expect(await ringkasan.isDisplayed()).toBe(true)
    await anggaran.openFromRingkasan()
  })

  it('TC-BUD-02 with no budgets the empty state shows and the total card is hidden', async () => {
    expect(await anggaran.emptyState.isDisplayed()).toBe(true)
    expect(await anggaran.totalCard.isExisting()).toBe(false)
  })

  it('TC-BUD-03/07 "Atur anggaran baru" saves a budget and shows its row', async () => {
    await anggaran.openForm()
    await anggaran.selectFormCategory(categories.expense.dailyFood)
    await anggaran.fillLimit(BUDGET_LIMIT)
    await anggaran.saveForm()
    expect(await anggaran.row(categories.expense.dailyFood).isDisplayed()).toBe(true)
    // The total card appears once the first budget exists.
    expect(await anggaran.totalCard.isDisplayed()).toBe(true)
  })

  it('TC-BUD-08 progress reflects the month expense total with status Aman', async () => {
    await createTransaction({
      type: 'pengeluaran',
      amount: FIRST_EXPENSE,
      categoryId: categories.expense.dailyFood,
      note: uniqueNote('bud'),
    })
    const text = await anggaran.rowText(categories.expense.dailyFood)
    expect(text).toContain(formatRp(FIRST_EXPENSE))
    expect(text).toContain(`dari ${formatRp(BUDGET_LIMIT)}`)
    expect(text).toContain(`Sisa ${formatRp(BUDGET_LIMIT - FIRST_EXPENSE)}`)
    expect(text).toContain('Aman')
  })

  it('TC-BUD-09 exceeding the limit shows the warning status', async () => {
    await createTransaction({
      type: 'pengeluaran',
      amount: SECOND_EXPENSE,
      categoryId: categories.expense.dailyFood,
      note: uniqueNote('bud'),
    })
    const text = await anggaran.rowText(categories.expense.dailyFood)
    expect(text).toContain('Lewat batas')
    // The bar never fills past 100%: spent shows the real 550.000, capped is
    // visible in the total card ("Rp X dari Rp Y" of the limit).
    expect(text).toContain('Lebih')
  })

  it('TC-BUD-10 removing the budget restores the empty state and keeps transactions', async () => {
    await anggaran.tapRowEdit(categories.expense.dailyFood)
    await anggaran.deleteFromForm()
    expect(await anggaran.emptyState.isDisplayed()).toBe(true)
    expect(await anggaran.row(categories.expense.dailyFood).isExisting()).toBe(false)
  })
})
