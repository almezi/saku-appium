import { byTag } from '../helpers/locators'
import { tags } from '../config/tags'
import { accounts, type TransactionType } from '../config/categories'
import { BasePage } from './base.page'
import type { ChainablePromiseElement } from 'webdriverio'

export interface TransactionFormInput {
  type?: TransactionType
  amount: number
  categoryId: string
  note?: string
  accountId?: string
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
    await this.typeIntoField(this.amountInput, String(amount))
  }

  async fillNote(note: string): Promise<void> {
    await this.typeIntoField(this.noteInput, note)
  }

  /**
   * Compose text fields expose the tag on a wrapper node, so `addValue` on it
   * fails with "did you interact with the correct element". Click to focus,
   * backspace any existing text away, then send keys to the focused field.
   */
  private async typeIntoField(field: ChainablePromiseElement, text: string): Promise<void> {
    await field.click()
    const current = await this.fieldText(field)
    if (current.length > 0) {
      await driver.keys('\uE003'.repeat(current.length + 2))
    }
    await driver.keys(text)
    await driver.hideKeyboard().catch(() => undefined)
  }

  /** Rendered text of a field via its inner EditText node (the wrapper's own text is empty). */
  private async fieldText(field: ChainablePromiseElement): Promise<string> {
    const editor = await field.$('.//android.widget.EditText')
    if (!(await editor.isExisting())) return ''
    return (await editor.getText()).trim()
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

  async fillForm(input: TransactionFormInput): Promise<void> {
    if (input.type) await this.selectType(input.type)
    await this.fillAmount(input.amount)
    await this.selectCategory(input.categoryId)
    if (input.accountId && input.accountId !== accounts.tunai) {
      await this.selectAccount(input.accountId)
    }
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
    return this.fieldText(await this.amountInput)
  }

  async getHelperText(): Promise<string> {
    return this.helperText.getText()
  }
}
