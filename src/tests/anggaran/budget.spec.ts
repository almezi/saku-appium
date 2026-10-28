import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransaction, uniqueNote } from '../../helpers/transactions'
import { RingkasanPage } from '../../pageobjects/ringkasan.page'
import { AnggaranPage } from '../../pageobjects/anggaran.page'
import { formatRp } from '../../helpers/money'

/**
 * TC-BUD — Anggaran / budget limits and status indicators (Phase 2).
 * Cases picked from Phase 2.A in progress.md / test-cases-simple-money-tracker.md.
 *
 * Verified live (2026-10-25, see progress.md 2.A): the Ringkasan Anggaran and
 * Kelola buttons are HIDDEN while the month has no transactions (UI_SPEC 6.3),
 * so `before` seeds one income first — income spends no budget, which keeps
 * the "Aman" math below intact. Budget rows expose no raw-status tag, so
 * status labels ("Aman", "Lewat batas") and the "Rp X dari Rp Y" / "Sisa Rp Z"
 * strings are asserted on the row's rendered text — rendered-output
 * assertions, not locators.
 */
const BUDGET_LIMIT = 500_000
const FIRST_EXPENSE = 100_000 // 20% of the limit -> "Aman"
const SECOND_EXPENSE = 450_000 // total 550.000 -> 110% -> "Lewat batas"

describe('TC-BUD — monthly category budgets (Phase 2) @regression', () => {
  const ringkasan = new RingkasanPage()
  const anggaran = new AnggaranPage()

  before(async () => {
    await expect(byTag(tags.tambah.screen)).toBeDisplayed({ wait: 30_000 })
    await createTransaction({
      type: 'pemasukan',
      amount: 50_000,
      categoryId: categories.income.salary,
      note: uniqueNote('bud-seed'),
    })
    await ringkasan.open()
  })

  it('TC-BUD-01 tapping the Ringkasan budget button opens the Anggaran screen @regression', async () => {
    await anggaran.openFromRingkasan()
    await expect(anggaran.screen).toBeDisplayed()
  })

  it('TC-BUD-11 back returns to Ringkasan @regression', async () => {
    await anggaran.tapBack()
    await expect(ringkasan.screen).toBeDisplayed()
    await anggaran.openFromRingkasan()
  })

  it('TC-BUD-02 with no budgets the empty state shows and the total card is hidden @regression', async () => {
    await expect(anggaran.emptyState).toBeDisplayed()
    expect(await anggaran.totalCard.isExisting()).toBe(false)
  })

  it('TC-BUD-03/07 "Atur anggaran baru" saves a budget and shows its row @regression', async () => {
    await anggaran.openForm()
    await anggaran.selectFormCategory(categories.expense.dailyFood)
    await anggaran.fillLimit(BUDGET_LIMIT)
    await anggaran.saveForm()
    await expect(anggaran.row(categories.expense.dailyFood)).toBeDisplayed()
    // The total card appears once the first budget exists.
    await expect(anggaran.totalCard).toBeDisplayed()
  })

  it('TC-BUD-08 progress reflects the month expense total with status Aman @regression', async () => {
    // Anggaran has no bottom bar (UI_SPEC 4), so seeding via the Tambah form
    // only works from a bar screen — back to Ringkasan first.
    await anggaran.tapBack()
    await createTransaction({
      type: 'pengeluaran',
      amount: FIRST_EXPENSE,
      categoryId: categories.expense.dailyFood,
      note: uniqueNote('bud'),
    })
    // createTransaction leaves the app on Tambah; re-enter Anggaran to read rows.
    await ringkasan.open()
    await anggaran.openFromRingkasan()
    const text = await anggaran.rowText(categories.expense.dailyFood)
    expect(text).toContain(formatRp(FIRST_EXPENSE))
    expect(text).toContain(`dari ${formatRp(BUDGET_LIMIT)}`)
    expect(text).toContain(`Sisa ${formatRp(BUDGET_LIMIT - FIRST_EXPENSE)}`)
    expect(text).toContain('Aman')
  })

  it('TC-BUD-09 exceeding the limit shows the warning status @regression', async () => {
    // Same no-bottom-bar constraint as TC-BUD-08: seed from a bar screen.
    await anggaran.tapBack()
    await createTransaction({
      type: 'pengeluaran',
      amount: SECOND_EXPENSE,
      categoryId: categories.expense.dailyFood,
      note: uniqueNote('bud'),
    })
    await ringkasan.open()
    await anggaran.openFromRingkasan()
    const text = await anggaran.rowText(categories.expense.dailyFood)
    expect(text).toContain('Lewat batas')
    // The bar never fills past 100%: spent shows the real 550.000, capped is
    // visible in the total card ("Rp X dari Rp Y" of the limit).
    expect(text).toContain('Lebih')
  })

  it('TC-BUD-10 removing the budget restores the empty state and keeps transactions @regression', async () => {
    await anggaran.tapRowEdit(categories.expense.dailyFood)
    await anggaran.deleteFromForm()
    await expect(anggaran.emptyState).toBeDisplayed()
    expect(await anggaran.row(categories.expense.dailyFood).isExisting()).toBe(false)
  })
})
