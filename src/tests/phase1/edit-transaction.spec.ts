import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransaction, uniqueNote } from '../../helpers/transactions'
import { DaftarPage } from '../../pageobjects/daftar.page'
import { UbahPage } from '../../pageobjects/ubah.page'
import { TambahPage } from '../../pageobjects/tambah.page'
import { formatRp } from '../../helpers/money'

const AMOUNT = 123_000
const NEW_AMOUNT = 456_000

describe('TC-EDIT — edit transaction (Phase 1)', () => {
  const daftar = new DaftarPage()
  const ubah = new UbahPage()
  const tambah = new TambahPage()
  const note = uniqueNote('edit')

  before(async () => {
    await byTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
    await createTransaction({
      type: 'pemasukan',
      amount: AMOUNT,
      categoryId: categories.income.refund,
      note,
    })
  })

  it('TC-EDIT-01 tapping Ubah opens the form prefilled with the saved amount', async () => {
    await daftar.open()
    await ubah.openFromDaftar(daftar, categories.income.refund)
    expect(await ubah.isDisplayed()).toBe(true)
    expect(await tambah.getAmountText()).toBe(formatRp(AMOUNT))
  })

  it('TC-EDIT-02 changing the amount and saving updates the row', async () => {
    await tambah.fillAmount(NEW_AMOUNT)
    await ubah.save()
    const updated = await daftar.findRowText(formatRp(NEW_AMOUNT))
    expect(await updated.isDisplayed()).toBe(true)
  })

  it('TC-EDIT-07 leaving edit without saving keeps the original data', async () => {
    await ubah.openFromDaftar(daftar, categories.income.refund)
    await tambah.fillAmount(AMOUNT)
    await ubah.systemBack()
    await byTag(tags.daftar.screen).waitForDisplayed()
    // The unsaved amount (AMOUNT) is gone; the row still shows NEW_AMOUNT
    // persisted by the previous edit.
    expect(await (await daftar.findRowText(formatRp(NEW_AMOUNT))).isDisplayed()).toBe(true)
  })
})
