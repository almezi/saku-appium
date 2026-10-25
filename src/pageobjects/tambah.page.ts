import { byTag } from '../helpers/locators'
import { typeIntoTaggedField, fieldText } from '../helpers/input'
import { tags } from '../config/tags'
import { accounts, type TransactionType } from '../config/categories'
import { BasePage } from './base.page'
import type { ChainablePromiseElement } from '../types'

export interface TransactionFormInput {
  type?: TransactionType
  amount: number
  categoryId: string
  note?: string
  accountId?: string
  /** Explicit transaction date; the form keeps the last-used date across saves. */
  date?: Date
}

/**
 * Tambah screen. The same form components back the Ubah (edit) screen,
 * which is why field selectors live on tags.tambah for both.
 */
export class TambahPage extends BasePage {
  constructor() {
    super(tags.tambah.screen)
  }

  get amountInput(): ChainablePromiseElement {
    return byTag(tags.tambah.inputAmount)
  }

  get noteInput(): ChainablePromiseElement {
    return byTag(tags.tambah.inputNote)
  }

  get saveButton(): ChainablePromiseElement {
    return byTag(tags.tambah.buttonSave)
  }

  get helperText(): ChainablePromiseElement {
    return byTag(tags.tambah.helper)
  }

  async open(): Promise<void> {
    await byTag(tags.navTambah).click()
    await this.waitForScreen()
  }

  async selectType(type: TransactionType): Promise<void> {
    const toggle = type === 'pemasukan' ? tags.tambah.toggleIncome : tags.tambah.toggleExpense
    await byTag(toggle).click()
  }

  async fillAmount(amount: number): Promise<void> {
    // 'digits': the field live-formats the input as currency ("254000"
    // renders "Rp 254.000"), so exact-equality verification can never hold.
    await typeIntoTaggedField(this.amountInput, String(amount), tags.tambah.inputAmount, 'digits')
  }

  async fillNote(note: string): Promise<void> {
    await typeIntoTaggedField(this.noteInput, note, tags.tambah.inputNote)
  }

  /**
   * Opens the category sheet and taps the category; the sheet closes itself
   * on select. The click can race the keyboard-dismiss animation, so the
   * sheet wait retries the tap once before giving up. Long lists (27 expense
   * categories) scroll via mobile: scrollGesture inside the sheet.
   */
  async selectCategory(categoryId: string): Promise<void> {
    const itemTag = tags.tambah.categoryItem(categoryId)
    const sheet = byTag(tags.tambah.categorySheetRoot)

    for (let attempt = 0; attempt < 2; attempt++) {
      await byTag(tags.tambah.categoryPager).click()
      if (await sheet.waitForDisplayed({ timeout: 5_000 }).catch(() => false)) break
    }
    await sheet.waitForDisplayed({ timeout: 10_000 })

    const item = byTag(itemTag)
    const sheetId = await sheet.elementId
    for (let scroll = 0; scroll < 8 && !(await item.isExisting().catch(() => false)); scroll++) {
      await driver.execute('mobile: scrollGesture', {
        elementId: sheetId,
        direction: 'down',
        percent: 45,
      })
    }
    await item.waitForDisplayed({ timeout: 5_000 })
    await item.click()
    await sheet.waitForDisplayed({ reverse: true })
  }

  async selectAccount(accountId: string): Promise<void> {
    await byTag(tags.tambah.selectAccount).click()
    await byTag(tags.tambah.sheetAccount).waitForDisplayed()
    await byTag(tags.tambah.accountItem(accountId)).click()
    await byTag(tags.tambah.sheetAccount).waitForDisplayed({ reverse: true })
  }

  /**
   * Picks a date in the Material date picker. Day cells carry no tags —
   * verified live, each renders its full English long date ("Friday,
   * October 23, 2026"; today's cell prefixes "Today, "), so textContains on
   * the long date matches either form. OK confirms via tambah_date_picker_ok.
   */
  async selectDate(date: Date): Promise<void> {
    const label = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
    await byTag(tags.tambah.selectDate).click()
    await byTag(tags.tambah.datePicker).waitForDisplayed({ timeout: 10_000 })
    const cell = $(`android=new UiSelector().textContains("${label}")`)
    // The wanted month is already open for near-today dates; step back a
    // month at most (covers yesterday on the 1st) via the picker's prev arrow.
    for (let attempt = 0; attempt < 2 && !(await cell.isExisting()); attempt++) {
      const prev = $(
        `android=new UiSelector().descriptionContains("previous month")`,
      )
      await prev.click()
    }
    await cell.waitForDisplayed({ timeout: 5_000 })
    await cell.click()
    await byTag(tags.tambah.datePickerOk).click()
    await byTag(tags.tambah.datePicker).waitForDisplayed({ reverse: true })
  }

  async fillForm(input: TransactionFormInput): Promise<void> {
    if (input.type) await this.selectType(input.type)
    await this.fillAmount(input.amount)
    await this.selectCategory(input.categoryId)
    if (input.accountId && input.accountId !== accounts.tunai) {
      await this.selectAccount(input.accountId)
    }
    if (input.date) await this.selectDate(input.date)
    if (input.note) await this.fillNote(input.note)
  }

  async isSaveEnabled(): Promise<boolean> {
    return this.saveButton.isEnabled()
  }

  /** Saves and waits for the confirmation toast (the app stays on Tambah). */
  async save(): Promise<void> {
    await this.saveButton.click()
    await byTag(tags.component.toast).waitForDisplayed({ timeout: 10_000 })
  }

  async getAmountText(): Promise<string> {
    return fieldText(this.amountInput)
  }

  async getNoteText(): Promise<string> {
    return fieldText(this.noteInput)
  }

  /** Rendered account name on the account selector (e.g. "Tunai", "BCA"). */
  async getAccountText(): Promise<string> {
    const label = await byTag(tags.tambah.selectAccount).$('.//android.widget.TextView')
    if (!(await label.isExisting())) return ''
    return (await label.getText()).trim()
  }

  async getHelperText(): Promise<string> {
    return this.helperText.getText()
  }
}
