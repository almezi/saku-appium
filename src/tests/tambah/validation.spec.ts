/**
 * TC-VAL — form validation (Phase 3.A). Full run notes live in progress.md;
 * constraints the tests rely on: the amount filter drops every non-digit
 * (letters/symbols/'.'/'-'), native keycode 67 is the only working backspace
 * (W3C \uE003 is a no-op here), and element setValue is the only path that
 * injects emoji/unicode notes.
 */
import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { formatRp } from '../../helpers/money'
import { TambahPage } from '../../pageobjects/tambah.page'
import { DaftarPage } from '../../pageobjects/daftar.page'
import { UbahPage } from '../../pageobjects/ubah.page'
import type { ChainablePromiseElement } from '../../types'

const tambah = new TambahPage()
const daftar = new DaftarPage()
const ubah = new UbahPage()

/** Inner EditText of a tagged wrapper field (where text actually lands). */
async function editorOf(field: ChainablePromiseElement): Promise<ChainablePromiseElement> {
  return field.$('.//android.widget.EditText')
}

/** Focus + clear a field with native DEL (keycode 67) keypresses. */
async function clearByBackspace(field: ChainablePromiseElement): Promise<void> {
  const editor = await editorOf(field)
  await editor.click()
  for (let i = 0; i < 16; i++) await driver.pressKeyCode(67)
  await driver.hideKeyboard().catch(() => undefined)
}

/** Type as keyboard events (the realistic user path), then hide the keyboard. */
async function typeKeys(field: ChainablePromiseElement, text: string, keepKeyboard = false): Promise<void> {
  const editor = await editorOf(field)
  await editor.click()
  await driver.keys(text)
  if (!keepKeyboard) await driver.hideKeyboard().catch(() => undefined)
}

/** Replace field content via UiObject2 setText (works for emoji/unicode). */
async function setDirect(field: ChainablePromiseElement, text: string): Promise<void> {
  const editor = await editorOf(field)
  await editor.setValue(text)
}

describe('TC-VAL — form validation (Phase 3.A) @regression', () => {
  before(async () => {
    await tambah.open()
  })

  it('TC-VAL-01 empty amount + empty category keeps save disabled with combined helper @regression', async () => {
    expect(await tambah.isSaveEnabled()).toBe(false)
    expect(await tambah.getHelperText()).toBe('Isi jumlah dan kategori dulu')
  })

  it('TC-VAL-02 amount only keeps save disabled, helper asks for the category @regression', async () => {
    await typeKeys(tambah.amountInput, '50000')
    expect(await tambah.getAmountText()).toBe('Rp 50.000')
    expect(await tambah.isSaveEnabled()).toBe(false)
    expect(await tambah.getHelperText()).toBe('Pilih kategori dulu')
  })

  it('TC-VAL-03 category only keeps save disabled, helper asks for the amount @regression', async () => {
    await clearByBackspace(tambah.amountInput)
    await tambah.selectCategory(categories.income.salary)
    expect(await tambah.isSaveEnabled()).toBe(false)
    expect(await tambah.getHelperText()).toBe('Isi jumlah dulu')
  })

  it('TC-VAL-04 amount 0 renders "Rp 0" but counts as not set @regression', async () => {
    await setDirect(tambah.amountInput, '0')
    expect(await tambah.getAmountText()).toBe('Rp 0')
    expect(await tambah.isSaveEnabled()).toBe(false)
  })

  it('TC-VAL-05 negative input is normalized: minus stripped, save enables @regression', async () => {
    await setDirect(tambah.amountInput, '-5000')
    expect(await tambah.getAmountText()).toBe('Rp 5.000')
    expect(await tambah.isSaveEnabled()).toBe(true)
  })

  it('TC-VAL-06 letters typed on the numeric keyboard are rejected @regression', async () => {
    await clearByBackspace(tambah.amountInput)
    await typeKeys(tambah.amountInput, 'abc')
    expect((await tambah.getAmountText()).replace(/\D/g, '')).toBe('')
  })

  it('TC-VAL-07 symbols typed on the numeric keyboard are rejected @regression', async () => {
    await typeKeys(tambah.amountInput, '!@#')
    expect((await tambah.getAmountText()).replace(/\D/g, '')).toBe('')
  })

  it('TC-VAL-08 scientific notation "1e9" lands as literal digits 19 @regression', async () => {
    await typeKeys(tambah.amountInput, '1e9')
    expect(await tambah.getAmountText()).toBe('Rp 19')
  })

  it('TC-VAL-09 18-digit overflow clamps at 12 digits without crashing @regression', async () => {
    await clearByBackspace(tambah.amountInput)
    await typeKeys(tambah.amountInput, '9'.repeat(18))
    expect(await tambah.getAmountText()).toBe('Rp 999.999.999.999')
    await expect(tambah.screen).toBeDisplayed()
  })

  it('TC-VAL-10 leading zeros parse as their numeric value (0005000 -> 5.000) @regression', async () => {
    await setDirect(tambah.amountInput, '0005000')
    expect(await tambah.getAmountText()).toBe('Rp 0.005.000')
    await tambah.save()
    await daftar.open()
    const row = await daftar.findRowText(formatRp(5_000))
    await expect(row).toBeDisplayed()
    await tambah.open()
  })

  it('TC-VAL-11 decimal point is rejected; digits concatenate (5000.50 -> 500.050) @regression', async () => {
    await typeKeys(tambah.amountInput, '5000.50')
    expect(await tambah.getAmountText()).toBe('Rp 500.050')
    await clearByBackspace(tambah.amountInput)
  })

  it('TC-VAL-12 space-only note saves as empty @regression', async () => {
    await setDirect(tambah.amountInput, '25000')
    await tambah.selectCategory(categories.income.salary)
    await typeKeys(tambah.noteInput, '   ')
    await tambah.save()
    await daftar.open()
    await daftar.tapEdit(categories.income.salary)
    await ubah.waitForScreen()
    expect((await tambah.getNoteText()).trim()).toBe('')
    await ubah.tapBack()
    await daftar.waitForScreen()
  })

  it('TC-VAL-13 note caps at exactly 60 characters without crashing @regression', async () => {
    await tambah.open()
    await typeKeys(tambah.noteInput, 'a'.repeat(70))
    expect((await tambah.getNoteText()).length).toBe(60)
    await expect(tambah.screen).toBeDisplayed()
  })

  it('TC-VAL-14 emoji note saves and renders (verified by reopening in edit) @regression', async () => {
    const note = '🎈🎉💰'
    await setDirect(tambah.noteInput, note)
    await setDirect(tambah.amountInput, '10000')
    await tambah.selectCategory(categories.income.freelance)
    await tambah.save()
    await daftar.open()
    await daftar.tapEdit(categories.income.freelance)
    await ubah.waitForScreen()
    expect(await tambah.getNoteText()).toBe(note)
    await ubah.tapBack()
    await daftar.waitForScreen()
  })

  it('TC-VAL-15 unicode note saves and renders exactly @regression', async () => {
    const note = 'Café naïve 日本語 Ελληνικά Жrustum $ ₺ ✓'
    await tambah.open()
    await setDirect(tambah.noteInput, note)
    await setDirect(tambah.amountInput, '15000')
    await tambah.selectCategory(categories.income.gift)
    await tambah.save()
    await daftar.open()
    await daftar.tapEdit(categories.income.gift)
    await ubah.waitForScreen()
    expect(await tambah.getNoteText()).toBe(note)
    await ubah.tapBack()
    await daftar.waitForScreen()
  })

  it('TC-VAL-16 rapid double-tap on save creates exactly one transaction @regression', async () => {
    await tambah.open()
    await setDirect(tambah.amountInput, '7777')
    await tambah.selectCategory(categories.income.other)
    await tambah.saveButton.doubleClick()
    await daftar.open()
    // Amount text is controlled test data, so a text count is unambiguous.
    const rows = await $$(`android=new UiSelector().text("${formatRp(7_777)}")`)
    expect(rows.length).toBe(1)
  })

  it('TC-VAL-17 saving with the keyboard open works and resets the form @regression', async () => {
    await tambah.open()
    await setDirect(tambah.amountInput, '3333')
    await tambah.selectCategory(categories.income.refund)
    // Keep the keyboard up (no hideKeyboard) when tapping save.
    await typeKeys(tambah.noteInput, 'kb open', true)
    await tambah.saveButton.click()
    await expect(byTag(tags.component.toast)).toBeDisplayed({ wait: 10_000 }).catch(() => undefined)
    expect(await tambah.getHelperText()).toBe('Isi jumlah dan kategori dulu')
    await daftar.open()
    const row = await daftar.findRowText(formatRp(3_333))
    await expect(row).toBeDisplayed()
  })
})
