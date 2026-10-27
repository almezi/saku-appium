/**
 * TC-VAL — form validation (Phase 3.A) on iOS. The Android spec
 * (src/tests/tambah/validation.spec.ts) is the source of truth for the cases
 * and the assertions; only the driver layer changes.
 *
 * Platform adaptations, all measured live via Appium MCP (iPhone 18 Pro /
 * iOS 27, 2026-10-27):
 *  - the amount field drops every non-digit, so 'abc' renders an empty
 *    field — the same outcome Android reaches through its numeric keyboard,
 *    written as "inject the raw text, read what rendered";
 *  - iOS setValue APPENDS instead of replacing, so every write clears the
 *    field first (a backspace burst; verified live);
 *  - the note field caps at 60 characters, exactly like Android, and takes
 *    emoji/unicode through the same write path;
 *  - the save button sits UNDER the software keyboard on iOS (there is no
 *    system BACK to dismiss it implicitly), so the save flow dismisses the
 *    keyboard first — TC-VAL-16 and TC-VAL-17 cover that path;
 *  - the category selection has no in-app clear affordance (the sheet only
 *    lists categories), so the "nothing selected" state is reached by
 *    restarting the app.
 *
 * Each case starts from a known form state instead of inheriting the
 * previous case's, so a skipped case cannot cascade into the next one.
 */
import { iosByTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { formatRp } from '../../helpers/money'
import { iosClearField, iosDismissKeyboard, iosKeyboardShown, iosWriteNote, iosWriteRaw } from '../../helpers/input'
import { TambahIosPage } from '../../pageobjects/tambah.ios.page'
import { DaftarIosPage } from '../../pageobjects/daftar.ios.page'
import { UbahIosPage } from '../../pageobjects/ubah.ios.page'

const BUNDLE_ID = 'id.almezi.saku'

const tambah = new TambahIosPage()
const daftar = new DaftarIosPage()
const ubah = new UbahIosPage()

/** Writes raw text into the amount field and returns the rendered text. */
async function writeAmount(text: string): Promise<string> {
  return iosWriteRaw(tambah.amountInput, text, tags.tambah.inputAmount)
}

/**
 * Types a note the way a user does (one keystroke at a time), so the app's
 * own 60-character cap applies keystroke by keystroke.
 */
async function writeNote(text: string): Promise<string> {
  return iosWriteRaw(tambah.noteInput, text, tags.tambah.inputNote)
}

/**
 * Writes a note straight through the editor node: the iOS keyboard
 * simulation cannot type emoji / CJK (they are dropped silently), while the
 * value-set path delivers them verbatim.
 */
async function writeNoteExact(text: string): Promise<string> {
  return iosWriteNote(tambah.noteInput, text, tags.tambah.inputNote)
}

/** Empties the amount field. */
async function clearAmount(): Promise<void> {
  await iosClearField(tambah.amountInput)
}

/**
 * Restarts the app onto a fresh Tambah form (empty amount, no category).
 * The category selection cannot be cleared from the UI, so the cases that
 * need "nothing selected" restart the app.
 */
async function freshForm(): Promise<void> {
  await driver.terminateApp(BUNDLE_ID)
  await driver.activateApp(BUNDLE_ID)
  await iosByTag(tags.navTambah).waitForDisplayed({ timeout: 30_000 })
  await tambah.open()
}

describe('TC-VAL — form validation (Phase 3.A) on iOS @regression', () => {
  before(async () => {
    await freshForm()
  })

  it('TC-VAL-01 empty amount + empty category keeps save disabled with combined helper @regression', async () => {
    await freshForm()
    expect(await tambah.isSaveEnabled()).toBe(false)
    expect(await tambah.getHelperText()).toBe('Isi jumlah dan kategori dulu')
  })

  it('TC-VAL-02 amount only keeps save disabled, helper asks for the category @regression', async () => {
    await freshForm()
    await writeAmount('50000')
    expect(await tambah.getAmountText()).toBe('Rp 50.000')
    expect(await tambah.isSaveEnabled()).toBe(false)
    expect(await tambah.getHelperText()).toBe('Pilih kategori dulu')
  })

  it('TC-VAL-03 category only keeps save disabled, helper asks for the amount @regression', async () => {
    await clearAmount()
    await tambah.selectCategory(categories.income.salary)
    expect(await tambah.isSaveEnabled()).toBe(false)
    expect(await tambah.getHelperText()).toBe('Isi jumlah dulu')
  })

  it('TC-VAL-04 amount 0 renders "Rp 0" but counts as not set @regression', async () => {
    await writeAmount('0')
    expect(await tambah.getAmountText()).toBe('Rp 0')
    expect(await tambah.isSaveEnabled()).toBe(false)
  })

  it('TC-VAL-05 negative input is normalized: minus stripped, save enables @regression', async () => {
    await writeAmount('-5000')
    expect(await tambah.getAmountText()).toBe('Rp 5.000')
    expect(await tambah.isSaveEnabled()).toBe(true)
  })

  it('TC-VAL-06 letters typed on the numeric keyboard are rejected @regression', async () => {
    await writeAmount('abc')
    expect((await tambah.getAmountText()).replace(/\D/g, '')).toBe('')
  })

  it('TC-VAL-07 symbols typed on the numeric keyboard are rejected @regression', async () => {
    await writeAmount('!@#')
    expect((await tambah.getAmountText()).replace(/\D/g, '')).toBe('')
  })

  it('TC-VAL-08 scientific notation "1e9" lands as literal digits 19 @regression', async () => {
    await writeAmount('1e9')
    expect(await tambah.getAmountText()).toBe('Rp 19')
  })

  it('TC-VAL-09 18-digit overflow clamps at 12 digits without crashing @regression', async () => {
    await writeAmount('9'.repeat(18))
    expect(await tambah.getAmountText()).toBe('Rp 999.999.999.999')
    expect(await tambah.isDisplayed()).toBe(true)
  })

  it('TC-VAL-10 leading zeros parse as their numeric value (0005000 -> 5.000) @regression', async () => {
    await writeAmount('0005000')
    expect(await tambah.getAmountText()).toBe('Rp 0.005.000')
    await tambah.save()
    await daftar.open()
    // Scoped to the transaction cards: the month summary renders the same
    // amount and would answer a page-wide lookup.
    const row = await daftar.findTransactionRow(formatRp(5_000))
    expect(await row.isDisplayed()).toBe(true)
    await tambah.open()
  })

  it('TC-VAL-11 decimal point is rejected; digits concatenate (5000.50 -> 500.050) @regression', async () => {
    await writeAmount('5000.50')
    expect(await tambah.getAmountText()).toBe('Rp 500.050')
  })

  it('TC-VAL-12 space-only note saves as empty @regression', async () => {
    await writeAmount('25000')
    await tambah.selectCategory(categories.income.freelance)
    await writeNote('   ')
    await tambah.save()
    await daftar.open()
    await ubah.openFromDaftar(daftar, categories.income.freelance)
    expect((await tambah.getNoteText()).trim()).toBe('')
    await ubah.tapBack()
    await daftar.waitForScreen()
  })

  it('TC-VAL-13 note caps at exactly 60 characters without crashing @regression', async () => {
    await tambah.open()
    await writeNote('a'.repeat(70))
    expect((await tambah.getNoteText()).length).toBe(60)
    expect(await tambah.isDisplayed()).toBe(true)
  })

  it('TC-VAL-14 emoji note saves and renders (verified by reopening in edit) @regression', async () => {
    const note = '🎈🎉💰'
    await tambah.open()
    await writeNoteExact(note)
    await writeAmount('10000')
    await tambah.selectCategory(categories.income.gift)
    await tambah.save()
    await daftar.open()
    await ubah.openFromDaftar(daftar, categories.income.gift)
    expect(await tambah.getNoteText()).toBe(note)
    await ubah.tapBack()
    await daftar.waitForScreen()
  })

  it('TC-VAL-15 unicode note saves and renders exactly @regression', async () => {
    const note = 'Café naïve 日本語 Ελληνικά Жrustum $ ₺ ✓'
    await tambah.open()
    await writeNoteExact(note)
    await writeAmount('15000')
    await tambah.selectCategory(categories.income.other)
    await tambah.save()
    await daftar.open()
    await ubah.openFromDaftar(daftar, categories.income.other)
    expect(await tambah.getNoteText()).toBe(note)
    await ubah.tapBack()
    await daftar.waitForScreen()
  })

  it('TC-VAL-16 rapid double-tap on save creates exactly one transaction @regression', async () => {
    await tambah.open()
    await writeAmount('7777')
    await tambah.selectCategory(categories.income.investment)
    // iOS: the save button sits under the keyboard, so it is dismissed first
    // — otherwise the tap lands on a keypad digit instead of the button.
    await iosDismissKeyboard()
    await tambah.saveButton.doubleClick()
    await daftar.open()
    // Amount text is controlled test data, so the card count is unambiguous.
    expect(await daftar.countTransactionRows(formatRp(7_777))).toBe(1)
  })

  it('TC-VAL-17 saving with the keyboard open works and resets the form @regression', async () => {
    await tambah.open()
    await writeAmount('3333')
    await tambah.selectCategory(categories.income.refund)
    // Keep the keyboard up (no dismissal) while the note is typed.
    await writeNote('kb open')
    expect(await iosKeyboardShown()).toBe(true)
    await tambah.save()
    expect(await tambah.isSaveEnabled()).toBe(false)
    expect(await tambah.getHelperText()).toBe('Isi jumlah dan kategori dulu')
    await daftar.open()
    const row = await daftar.findTransactionRow(formatRp(3_333))
    expect(await row.isDisplayed()).toBe(true)
  })
})
