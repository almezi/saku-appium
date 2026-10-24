import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransaction, uniqueNote } from '../../helpers/transactions'
import { TambahPage } from '../../pageobjects/tambah.page'
import { DaftarPage } from '../../pageobjects/daftar.page'
import { RingkasanPage } from '../../pageobjects/ringkasan.page'
import { formatRp } from '../../helpers/money'

const AMOUNT = 250_000

describe('TC-INC — add income (Phase 1)', () => {
  const tambah = new TambahPage()
  const daftar = new DaftarPage()
  const ringkasan = new RingkasanPage()

  before(async () => {
    await byTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
    await createTransaction({
      type: 'pemasukan',
      amount: AMOUNT,
      categoryId: categories.income.salary,
      note: uniqueNote('inc'),
    })
  })

  it('TC-INC-01 income with amount and category saves and shows the toast', async () => {
    // createTransaction already waited for the toast; assert we are back on a
    // clean Tambah form (saving never leaves the screen).
    expect(await tambah.isDisplayed()).toBe(true)
  })

  it('TC-INC-08 form resets after save', async () => {
    expect(await tambah.getHelperText()).toBe('Isi jumlah dan kategori dulu')
    expect(await tambah.isSaveEnabled()).toBe(false)
  })

  it('TC-INC-02 saved income appears in the Transaksi list today', async () => {
    await daftar.open()
    // Rows render category, type label and amount, not the note.
    const row = await daftar.findRowText(formatRp(AMOUNT))
    expect(await row.isDisplayed()).toBe(true)
  })

  it('TC-INC-03 list income summary increases to the saved amount', async () => {
    expect(await daftar.summaryIncome()).toBe(AMOUNT)
    expect(await daftar.summaryExpense()).toBe(0)
  })

  it('TC-INC-04 Ringkasan income card and balance reflect the income', async () => {
    await ringkasan.open()
    expect(await ringkasan.incomeTotal()).toBe(AMOUNT)
    expect(await ringkasan.balanceValue()).toBe(AMOUNT)
    expect(await ringkasan.balanceText()).toBe(formatRp(AMOUNT))
  })
})
