/**
 * TC-AMT — amount input behavior (Phase 3.B), distilled from the live MCP run
 * on 2026-10-26 (see progress.md §3.B). Interaction facts encoded here:
 *
 * - Tapping `tambah_input_amount` focuses the inner Compose EditText and opens
 *   the numeric keyboard (verified live via MCP `appium_mobile_keyboard` action=is_shown).
 * - The field live-formats typed digits as currency: "250000" renders "Rp 250.000"
 *   — dot thousands separators, no decimals. "1234567" renders "Rp 1.234.567".
 * - The InputFilter drops every non-digit; a leading minus is stripped
 *   ("-5000" -> "Rp 5.000"). 18 typed digits clamp at 12 (10^12-1):
 *   "999999999999999999" renders "Rp 999.999.999.999" without crashing.
 * - Backspace (native DEL keycode 67) edits from the end of the value; clearing
 *   to empty restores the amount-missing helper state and re-disables save.
 */
import { categories } from '../../config/categories'
import { TambahPage } from '../../pageobjects/tambah.page'
import type { ChainablePromiseElement } from '../../types'

const tambah = new TambahPage()

/** Inner EditText of a tagged wrapper field (where text actually lands). */
async function editorOf(field: ChainablePromiseElement): Promise<ChainablePromiseElement> {
  return field.$('.//android.widget.EditText')
}

/** Replace field content via UiObject2 setValue (clears + sets). */
async function setDirect(field: ChainablePromiseElement, text: string): Promise<void> {
  const editor = await editorOf(field)
  await editor.setValue(text)
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

describe('TC-AMT — amount input behavior (Phase 3.B) @regression', () => {
  before(async () => {
    await tambah.open()
  })

  beforeEach(async () => {
    await clearByBackspace(tambah.amountInput)
  })

  it('TC-AMT-01 tapping the amount field opens the numeric keyboard', async () => {
    const editor = await editorOf(tambah.amountInput)
    await editor.click()
    await editor.waitForDisplayed({ timeout: 10_000 })
    expect(Boolean(await editor.getAttribute('focused'))).toBe(true)
  })

  it('TC-AMT-02 typed digits format live as "Rp X.XXX"', async () => {
    await typeKeys(tambah.amountInput, '250000')
    expect(await tambah.getAmountText()).toBe('Rp 250.000')
  })

  it('TC-AMT-03 backspace to empty returns helper state and re-disables save', async () => {
    await tambah.selectCategory(categories.income.salary)
    await typeKeys(tambah.amountInput, '10000')
    expect(await tambah.isSaveEnabled()).toBe(true)
    await clearByBackspace(tambah.amountInput)
    expect(await tambah.isSaveEnabled()).toBe(false)
    expect(await tambah.getHelperText()).toBe('Isi jumlah dulu')
  })

  it('TC-AMT-04 clear field re-disables save', async () => {
    await setDirect(tambah.amountInput, '10000')
    await tambah.selectCategory(categories.income.salary)
    expect(await tambah.isSaveEnabled()).toBe(true)
    await clearByBackspace(tambah.amountInput)
    expect(await tambah.isSaveEnabled()).toBe(false)
  })

  it('TC-AMT-05 thousand separator auto-inserted on formatted amounts', async () => {
    await typeKeys(tambah.amountInput, '1234567')
    expect(await tambah.getAmountText()).toBe('Rp 1.234.567')
  })

  it('TC-AMT-06 cursor stays at end during formatting edits', async () => {
    await typeKeys(tambah.amountInput, '123', true)
    expect(await tambah.getAmountText()).toBe('Rp 123')
    // Native DEL edits from the end: one backspace drops the last digit only.
    await driver.pressKeyCode(67)
    expect(await tambah.getAmountText()).toBe('Rp 12')
    await typeKeys(tambah.amountInput, '4', true)
    expect(await tambah.getAmountText()).toBe('Rp 124')
  })

  it('TC-AMT-07 max digits limit clamps at 12 without crashing', async () => {
    await clearByBackspace(tambah.amountInput)
    await typeKeys(tambah.amountInput, '9'.repeat(18))
    expect(await tambah.getAmountText()).toBe('Rp 999.999.999.999')
    expect(await tambah.isDisplayed()).toBe(true)
  })
})
