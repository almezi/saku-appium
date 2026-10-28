import { iosByTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransactionIos } from '../../helpers/transactions'
import { RingkasanIosPage } from '../../pageobjects/ringkasan.ios.page'
import { AnggaranIosPage } from '../../pageobjects/anggaran.ios.page'
import { formatRp } from '../../helpers/money'
import { APP_COLD_START_IOS } from '../../config/timeouts'

/**
 * TC-BUDGET on iOS — 1:1 port of budget.spec.ts (the Android spec is the
 * source of truth for the flow; only the driver layer changes). Cases are
 * split into one `it` per checklist id so a failure maps straight onto
 * progress.md 2.A.
 *
 * Platform adaptations (verified live via Appium MCP on iPhone 18 Pro /
 * iOS 27.0, 2026-10-27):
 *  - the Ringkasan Anggaran button is hidden while the month has no
 *    transactions (UI_SPEC 6.3), so `before` seeds one income;
 *  - Anggaran has no bottom bar: leaving it taps `component_button_back`
 *    (no system BACK on iOS);
 *  - the screen header title/month are untagged StaticTexts, read as
 *    rendered output (month is matched against the current Indonesian
 *    "Month YYYY" label);
 *  - the progress bar is a drawing-only node (no accessibility fill), so it
 *    is asserted structurally by its measured track width while numeric
 *    progress comes from the "Rp X dari Rp Y" text;
 *  - status strings and "Sisa/Lebih" lines are rendered-output assertions on
 *    the row text, exactly like the Android suite.
 */
const BUDGET_LIMIT = 500_000
const EDITED_LIMIT = 600_000
const FIRST_EXPENSE = 100_000 // 20% of the limit -> "Aman"
const SECOND_EXPENSE = 450_000 // total 550.000 -> 110% -> "Lewat batas"
const SEED_INCOME = 50_000 // spends no budget, keeps the "Aman" math intact
const MONTH_LABEL = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
  new Date(),
)
const CATEGORY_NAME = 'Makanan & Minuman' // exp_daily_food display name

describe('TC-BUDGET — monthly category budgets (Phase 2) on iOS @regression', () => {
  const ringkasan = new RingkasanIosPage()
  const anggaran = new AnggaranIosPage()

  before(async () => {
    await expect(iosByTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START_IOS })
    await createTransactionIos({
      type: 'pemasukan',
      amount: SEED_INCOME,
      categoryId: categories.income.salary,
    })
    await ringkasan.open()
  })

  it('TC-BUDGET-01 tapping the Ringkasan budget button opens the Anggaran screen @regression', async () => {
    await anggaran.openFromRingkasan()
    await expect(anggaran.screen).toBeDisplayed()
  })

  it('TC-BUDGET-11 back returns to Ringkasan @regression', async () => {
    await anggaran.tapBack()
    await ringkasan.waitForScreen()
    // Re-enter for the flow that follows.
    await anggaran.openFromRingkasan()
  })

  it('TC-BUDGET-02 title, month label and empty state render; total card is hidden @regression', async () => {
    expect(await anggaran.screenText()).toContain('Anggaran')
    expect(await anggaran.monthLabel()).toBe(MONTH_LABEL)
    await expect(anggaran.emptyState).toBeDisplayed()
    expect(await anggaran.totalCard.isExisting()).toBe(false)
  })

  it('TC-BUDGET-06 "Atur anggaran baru" opens the new-budget form @regression', async () => {
    await anggaran.openForm()
    await expect(anggaran.formScreen).toBeDisplayed()
  })

  it('TC-BUDGET-07 a saved limit is displayed as a row and the total card appears @regression', async () => {
    await anggaran.selectFormCategory(categories.expense.dailyFood)
    await anggaran.fillLimit(BUDGET_LIMIT)
    expect(await anggaran.isFormSaveEnabled()).toBe(true)
    await anggaran.saveForm()
    await expect(anggaran.row(categories.expense.dailyFood)).toBeDisplayed()
    await expect(anggaran.totalCard).toBeDisplayed()
  })

  it('TC-BUDGET-03 total card shows ANGGARAN, the amount, "Rp X dari Rp Y" and a bar @regression', async () => {
    const texts = await anggaran.totalCardTexts()
    expect(texts).toContain('ANGGARAN')
    expect(texts).toContain(formatRp(0))
    expect(texts).toContain(`Rp 0 dari ${formatRp(BUDGET_LIMIT)}`)
    // iOS exposes the bar track but not its fill fraction; 330 px measured.
    expect(await anggaran.totalCardBarWidth()).toBeGreaterThan(300)
  })

  it('TC-BUDGET-04 per-category card shows name, Aman, spent-of, remaining and a bar @regression', async () => {
    const text = await anggaran.rowText(categories.expense.dailyFood)
    expect(text).toContain(CATEGORY_NAME)
    expect(text).toContain('Aman')
    expect(text).toContain(`Rp 0 dari ${formatRp(BUDGET_LIMIT)}`)
    expect(text).toContain(`Sisa ${formatRp(BUDGET_LIMIT)}`)
    expect(await anggaran.rowBarWidth(categories.expense.dailyFood)).toBeGreaterThan(300)
  })

  it('TC-BUDGET-08 progress reflects the month expense total with status Aman @regression', async () => {
    // Anggaran has no bottom bar, so seeding through the Tambah form starts
    // from Ringkasan.
    await anggaran.tapBack()
    await ringkasan.waitForScreen()
    await createTransactionIos({
      type: 'pengeluaran',
      amount: FIRST_EXPENSE,
      categoryId: categories.expense.dailyFood,
    })
    await ringkasan.open()
    await anggaran.openFromRingkasan()

    const text = await anggaran.rowText(categories.expense.dailyFood)
    expect(text).toContain(formatRp(FIRST_EXPENSE))
    expect(text).toContain(`dari ${formatRp(BUDGET_LIMIT)}`)
    expect(text).toContain(`Sisa ${formatRp(BUDGET_LIMIT - FIRST_EXPENSE)}`)
    expect(text).toContain('Aman')
    expect(await anggaran.totalCardTexts()).toContain(formatRp(FIRST_EXPENSE))
  })

  it('TC-BUDGET-09 exceeding the limit shows the warning status @regression', async () => {
    await anggaran.tapBack()
    await ringkasan.waitForScreen()
    await createTransactionIos({
      type: 'pengeluaran',
      amount: SECOND_EXPENSE,
      categoryId: categories.expense.dailyFood,
    })
    await ringkasan.open()
    await anggaran.openFromRingkasan()

    const spent = FIRST_EXPENSE + SECOND_EXPENSE
    const text = await anggaran.rowText(categories.expense.dailyFood)
    expect(text).toContain('Lewat batas')
    expect(text).toContain(`${formatRp(spent)} dari ${formatRp(BUDGET_LIMIT)}`)
    expect(text).toContain(`Lebih ${formatRp(spent - BUDGET_LIMIT)}`)
  })

  it('TC-BUDGET-05 row Ubah opens the prefilled form and row Hapus opens the delete sheet @regression', async () => {
    await anggaran.tapRowEdit(categories.expense.dailyFood)
    await expect(anggaran.formScreen).toBeDisplayed()
    expect(await anggaran.getLimitText()).toBe(formatRp(BUDGET_LIMIT))
    await anggaran.tapBack()
    await anggaran.waitForScreen()

    await anggaran.tapRowDelete(categories.expense.dailyFood)
    // The delete sheet has no public page anchor (anggaranTags lives in the
    // Android page), so assert its always-present cancel button via the tag
    // layer — the same node cancelDeleteSheet taps.
    await expect(iosByTag(tags.component.sheetCancel)).toBeDisplayed()
    await anggaran.cancelDeleteSheet()
    await expect(anggaran.row(categories.expense.dailyFood)).toBeDisplayed()
  })

  it('TC-BUDGET-10 editing then removing the budget works and keeps transactions @regression', async () => {
    await anggaran.tapRowEdit(categories.expense.dailyFood)
    await anggaran.fillLimit(EDITED_LIMIT)
    await anggaran.saveForm()
    expect(await anggaran.rowText(categories.expense.dailyFood)).toContain(
      `dari ${formatRp(EDITED_LIMIT)}`,
    )

    await anggaran.tapRowEdit(categories.expense.dailyFood)
    await anggaran.deleteFromForm()
    await expect(anggaran.emptyState).toBeDisplayed()
    expect(await anggaran.row(categories.expense.dailyFood).isExisting()).toBe(false)

    await anggaran.tapBack()
    await ringkasan.waitForScreen()
    expect(await ringkasan.expenseTotal()).toBe(FIRST_EXPENSE + SECOND_EXPENSE)
    expect(await ringkasan.incomeTotal()).toBe(SEED_INCOME)
  })
})
