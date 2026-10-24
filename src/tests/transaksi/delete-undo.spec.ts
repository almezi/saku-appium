import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransaction, tapUndoAction, uniqueNote } from '../../helpers/transactions'
import { DaftarPage } from '../../pageobjects/daftar.page'
import { formatRp } from '../../helpers/money'

const AMOUNT = 111_000

describe('TC-DEL / TC-UNDO — delete with confirmation and undo (Phase 1)', () => {
  const daftar = new DaftarPage()

  async function openDeleteSheet(): Promise<void> {
    await daftar.tapDelete(categories.income.gift)
    await byTag(tags.component.sheetBottom).waitForDisplayed()
  }

  async function confirmDelete(): Promise<void> {
    await byTag(tags.component.sheetConfirm).click()
    await byTag(tags.component.sheetBottom).waitForDisplayed({ reverse: true })
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
    await byTag(tags.component.sheetBottom).waitForDisplayed({ reverse: true })
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

  it('TC-DEL-02 deleting without undo removes the row and zeroes the summary', async () => {
    await openDeleteSheet()
    await confirmDelete()
    // Toast expiry (5s) makes the deletion permanent; wait it out.
    await byTag(tags.component.toast).waitForDisplayed({ reverse: true, timeout: 10_000 })
    expect(await daftar.summaryIncome()).toBe(0)
  })
})
