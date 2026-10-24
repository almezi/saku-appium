import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { accounts, categories } from '../../config/categories'
import { createTransaction, uniqueNote } from '../../helpers/transactions'
import { TambahPage } from '../../pageobjects/tambah.page'
import { DaftarPage } from '../../pageobjects/daftar.page'
import { RingkasanPage } from '../../pageobjects/ringkasan.page'
import { UbahPage } from '../../pageobjects/ubah.page'
import { formatRp } from '../../helpers/money'

const AMOUNT = 250_000
const NOTE = uniqueNote('inc')

describe('TC-INC — add income (Phase 1)', () => {
  const tambah = new TambahPage()
  const daftar = new DaftarPage()
  const ringkasan = new RingkasanPage()
  const ubah = new UbahPage()

  before(async () => {
    await byTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
    await createTransaction({
      type: 'pemasukan',
      amount: AMOUNT,
      categoryId: categories.income.salary,
      note: NOTE,
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

  it('TC-INC-05 note is persisted (verified by reopening in edit)', async () => {
    await daftar.open()
    await ubah.openFromDaftar(daftar, categories.income.salary)
    expect(await tambah.getNoteText()).toBe(NOTE)
    // Leave without saving so the data stays untouched for later tests.
    await ubah.tapBack()
    await daftar.waitForScreen()
  })

  it('TC-INC-06 income on a non-default account is recorded correctly', async () => {
    const bankAmount = 175_000
    await createTransaction({
      type: 'pemasukan',
      amount: bankAmount,
      categoryId: categories.income.freelance,
      accountId: accounts.bca,
    })
    // It counts into the month summary alongside the default-account income...
    await daftar.open()
    expect(await daftar.summaryIncome()).toBe(AMOUNT + bankAmount)
    // ...and the account persists — rows never show it, so verify on edit.
    await ubah.openFromDaftar(daftar, categories.income.freelance)
    expect(await tambah.getAccountText()).toBe('BCA')
    await ubah.tapBack()
    await daftar.waitForScreen()
  })

  it('TC-INC-07 multiple incomes same day sum into the day header total', async () => {
    const extras = [50_000, 25_000]
    const extraCategories = [categories.income.refund, categories.income.gift]
    for (let i = 0; i < extras.length; i++) {
      await createTransaction({
        type: 'pemasukan',
        amount: extras[i],
        categoryId: extraCategories[i],
      })
    }
    await daftar.open()
    // All four incomes are today, so the (single) day header nets the sum.
    expect(await daftar.firstDayHeaderTotal()).toBe(AMOUNT + 175_000 + 50_000 + 25_000)
  })

  it('TC-INC-09 save shows the confirmation toast and stays on Tambah', async () => {
    await tambah.open()
    await tambah.fillForm({
      type: 'pemasukan',
      amount: 10_000,
      categoryId: categories.income.other,
    })
    expect(await tambah.isSaveEnabled()).toBe(true)
    await tambah.saveButton.click()
    await byTag(tags.component.toast).waitForDisplayed({ timeout: 10_000 })
    expect(await byTag(tags.component.toast).isDisplayed()).toBe(true)
    expect(await tambah.isDisplayed()).toBe(true)
  })
})
