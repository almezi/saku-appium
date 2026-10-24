import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransaction, tapUndoAction, uniqueNote } from '../../helpers/transactions'
import { DaftarPage } from '../../pageobjects/daftar.page'
import { RingkasanPage } from '../../pageobjects/ringkasan.page'
import { formatRp } from '../../helpers/money'

const AMOUNT = 111_000

describe('TC-DEL / TC-UNDO — delete with confirmation and undo (Phase 1)', () => {
  const daftar = new DaftarPage()

  async function openDeleteSheet(): Promise<void> {
    await daftar.tapDelete(categories.income.gift)
    await byTag(tags.daftar.deleteSheet).waitForDisplayed()
  }

  async function confirmDelete(): Promise<void> {
    await byTag(tags.component.sheetConfirm).click()
    await byTag(tags.daftar.deleteSheet).waitForDisplayed({ reverse: true })
    await byTag(tags.component.toast).waitForDisplayed({ timeout: 10_000 })
  }

  before(async () => {
    await byTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
    await createTransaction({
      type: 'pemasukan',
      amount: AMOUNT,
      categoryId: categories.income.gift,
      note: uniqueNote('del'),
    })
  })

  it('TC-DEL-01 tapping Hapus opens the confirmation sheet', async () => {
    await daftar.open()
    await openDeleteSheet()
  })

  it('TC-DEL-03 cancelling the sheet keeps the transaction', async () => {
    await byTag(tags.component.sheetCancel).click()
    await byTag(tags.daftar.deleteSheet).waitForDisplayed({ reverse: true })
    expect(await (await daftar.findRowText(formatRp(AMOUNT))).isDisplayed()).toBe(true)
    expect(await daftar.summaryIncome()).toBe(AMOUNT)
  })

  it('TC-UNDO-01 confirming shows the toast with an undo action', async () => {
    await openDeleteSheet()
    await confirmDelete()
    expect(await byTag(tags.component.toast).isDisplayed()).toBe(true)
    expect(await byTag(tags.component.toastAction).isDisplayed()).toBe(true)
  })

  it('TC-UNDO-02 tapping Urungkan before the timeout restores the transaction', async () => {
    await tapUndoAction()
    expect(await (await daftar.findRowText(formatRp(AMOUNT))).isDisplayed()).toBe(true)
    expect(await daftar.summaryIncome()).toBe(AMOUNT)
  })

  it('TC-DEL-02 deleting without undo makes the deletion permanent', async () => {
    await openDeleteSheet()
    await confirmDelete()
    // Toast expiry (5s) makes the deletion permanent. Wait past it with a
    // plain pause: the toast node can linger composed after expiry, so a
    // disappearance wait is unreliable (flaked across runs).
    await driver.pause(6_000)
    // With no transactions left the list swaps to its empty state and the
    // summary cards leave the hierarchy entirely (verified live).
    await byTag(tags.daftar.emptyState).waitForDisplayed({ timeout: 10_000 })
    const rows = await $$('android=new UiSelector().resourceIdMatches("daftar_item_\\d+$")')
    expect(rows.length).toBe(0)
  })
})

describe('TC-DEL — delete effects on list, Ringkasan and breakdown (Phase 1)', () => {
  const daftar = new DaftarPage()
  const ringkasan = new RingkasanPage()

  const SALES_INCOME = 210_000
  const FOOD_EXPENSE = 75_000

  async function confirmPermanentDelete(): Promise<void> {
    await byTag(tags.daftar.deleteSheet).waitForDisplayed()
    await byTag(tags.component.sheetConfirm).click()
    // Wait past the 5 s undo window with a plain pause: the toast node can
    // linger composed after expiry, so a disappearance wait is unreliable.
    await byTag(tags.component.toast).waitForDisplayed({ timeout: 10_000 })
    await driver.pause(6_000)
  }

  before(async () => {
    // The first describe ends on the Daftar screen — navigate back to the
    // form explicitly instead of assuming a fresh launch.
    await byTag(tags.navTambah).click()
    await byTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
    await createTransaction({
      type: 'pemasukan',
      amount: SALES_INCOME,
      categoryId: categories.income.sales,
      note: uniqueNote('delx-inc'),
    })
    await createTransaction({
      type: 'pengeluaran',
      amount: FOOD_EXPENSE,
      categoryId: categories.expense.dailyFood,
      note: uniqueNote('delx-exp'),
    })
  })

  it('TC-DEL-05 deleting updates the Ringkasan cards and balance', async () => {
    await ringkasan.open()
    const expenseBefore = await ringkasan.expenseTotal()
    const balanceBefore = await ringkasan.balanceValue()
    await daftar.open()
    await daftar.tapDelete(categories.expense.dailyFood)
    await confirmPermanentDelete()
    await ringkasan.open()
    expect(await ringkasan.expenseTotal()).toBe(expenseBefore - FOOD_EXPENSE)
    expect(await ringkasan.balanceValue()).toBe(balanceBefore + FOOD_EXPENSE)
  })

  it('TC-DEL-06 deleting removes the stale breakdown entry', async () => {
    await ringkasan.open()
    const foodItems = await $$(
      `android=new UiSelector().resourceId("ringkasan_category_item_${categories.expense.dailyFood}")`,
    )
    expect(foodItems.length).toBe(0)
    // The remaining income category is untouched.
    const texts = await ringkasan.breakdownItemTexts(categories.income.sales)
    expect(texts).toContain(formatRp(SALES_INCOME))
  })

  it('TC-DEL-07 deleting two items back-to-back removes both', async () => {
    await daftar.open()
    await createTransaction({
      type: 'pemasukan',
      amount: 88_000,
      categoryId: categories.income.bonusThr,
      note: uniqueNote('delx-a'),
    })
    await createTransaction({
      type: 'pemasukan',
      amount: 33_000,
      categoryId: categories.income.other,
      note: uniqueNote('delx-b'),
    })
    // createTransaction leaves the app on the Tambah form.
    await daftar.open()
    await daftar.tapDelete(categories.income.bonusThr)
    await byTag(tags.daftar.deleteSheet).waitForDisplayed()
    await byTag(tags.component.sheetConfirm).click()
    // Second delete immediately — the first undo toast is still up
    // (verified live: the sheet opens over it).
    await daftar.tapDelete(categories.income.other)
    await byTag(tags.daftar.deleteSheet).waitForDisplayed()
    await byTag(tags.component.sheetConfirm).click()
    // Second undo window (5 s) — pause past it; the following assertions
    // prove both deletions stuck.
    await driver.pause(6_500)
    const bonusRows = await $$(
      `android=new UiSelector().resourceIdMatches("daftar_item_.*_delete_${categories.income.bonusThr}")`,
    )
    expect(bonusRows.length).toBe(0)
    const otherRows = await $$(
      `android=new UiSelector().resourceIdMatches("daftar_item_.*_delete_${categories.income.other}")`,
    )
    expect(otherRows.length).toBe(0)
    expect(await daftar.summaryIncome()).toBe(SALES_INCOME)
  })

  it('TC-DEL-04 deleting the last item of the month shows the empty state', async () => {
    await daftar.tapDelete(categories.income.sales)
    await confirmPermanentDelete()
    await byTag(tags.daftar.emptyState).waitForDisplayed({ timeout: 10_000 })
    const rows = await $$('android=new UiSelector().resourceIdMatches("daftar_item_\\d+$")')
    expect(rows.length).toBe(0)
  })
})
