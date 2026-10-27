import { $ } from '@wdio/globals'
import { iosByTag } from '../helpers/locators'
import { iosTypeIntoTaggedField, iosFieldText, iosDismissKeyboard, iosKeyboardShown } from '../helpers/input'
import { iosExtractChildTexts } from '../helpers/elements'
import { tags } from '../config/tags'
import { accounts, type TransactionType } from '../config/categories'
import { BaseIosPage } from './base.ios.page'
import type { ChainablePromiseElement } from '../types'
import type { TransactionFormInput } from './tambah.page'

/**
 * Tambah screen on iOS — accessibility-id twin of TambahPage, driven by the
 * same tag contract (testTag -> accessibilityIdentifier). All method names
 * mirror the Android page so the iOS specs stay diff-parallel to them.
 *
 * Spike-verified (2026-10-27, iPhone 18 Pro / iOS 27.0):
 *  - the category sheet DOES expose its tree to XCUITest (rows resolve as
 *    Buttons tagged `tambah_category_item_<id>`), closing TESTABILITY.md's
 *    "bottom sheets empty the accessibility tree" open question for real
 *    accessibility clients — the Android release-APK gap (BUG_Found-07) has
 *    no iOS equivalent on this debug build;
 *  - the form's quick category chips share the row tags but never surface in
 *    the iOS accessibility tree, so there is no tag ambiguity while the
 *    sheet is open (and no chip shortcut — the sheet always opens);
 *  - select fields render the value on a child StaticText
 *    (`tambah_select_account` own label appends the chevron description
 *    ", Buka pilihan"), so account/date text reads go through the children.
 */
export class TambahIosPage extends BaseIosPage {
  constructor() {
    super(tags.tambah.screen)
  }

  get amountInput(): ChainablePromiseElement {
    return iosByTag(tags.tambah.inputAmount)
  }

  get noteInput(): ChainablePromiseElement {
    return iosByTag(tags.tambah.inputNote)
  }

  get saveButton(): ChainablePromiseElement {
    return iosByTag(tags.tambah.buttonSave)
  }

  get helperText(): ChainablePromiseElement {
    return iosByTag(tags.tambah.helper)
  }

  async open(): Promise<void> {
    await iosByTag(tags.navTambah).click()
    await this.waitForScreen()
  }

  async selectType(type: TransactionType): Promise<void> {
    const toggle = type === 'pemasukan' ? tags.tambah.toggleIncome : tags.tambah.toggleExpense
    await iosByTag(toggle).click()
  }

  async fillAmount(amount: number): Promise<void> {
    // 'digits': the field live-formats the input as currency ("254000"
    // renders "Rp 254.000"), so exact-equality verification can never hold.
    await iosTypeIntoTaggedField(this.amountInput, String(amount), tags.tambah.inputAmount, 'digits')
  }

  async fillNote(note: string): Promise<void> {
    await iosTypeIntoTaggedField(this.noteInput, note, tags.tambah.inputNote)
  }

  /**
   * Opens the category sheet and taps the row; the sheet closes itself on
   * select. Rows are tapped BY TAG here (unlike the Android text fallback,
   * BUG_Found-07) because the debug build tags them. The sheet's LazyColumn
   * can keep lower rows below the fold, so a miss falls back to a bounded
   * swipe inside the sheet area before re-querying.
   */
  async selectCategory(categoryId: string): Promise<void> {
    const rowTag = tags.tambah.categoryItem(categoryId)
    await iosByTag(tags.tambah.categoryPager).waitForExist({ timeout: 15_000 })
    await iosByTag(tags.tambah.categoryPager).click()

    // The sheet root reuses the bare category-item tag (TransactionForm.kt
    // passes TAMBAH_CATEGORY_ITEM as the sheet testTag; rows carry _<id>).
    await iosByTag(tags.tambah.categorySheetRoot).waitForExist({ timeout: 10_000 })

    for (let attempt = 0; attempt < 4; attempt++) {
      const row = iosByTag(rowTag)
      if (await row.isExisting().catch(() => false)) {
        try {
          await row.click()
          await this.waitForSheetClosed(tags.tambah.categorySheetRoot)
          return
        } catch {
          // Stale handle or mid-recompose ghost — settle, re-query below.
          await driver.pause(500)
        }
      }
      await this.swipeSheetContentUp()
    }
    throw new Error(`Category row "${categoryId}" never became tappable in the iOS sheet`)
  }

  async selectAccount(accountId: string): Promise<void> {
    await iosByTag(tags.tambah.selectAccount).click()
    await iosByTag(tags.tambah.sheetAccount).waitForExist({ timeout: 10_000 })
    await iosByTag(tags.tambah.accountItem(accountId)).click()
    await this.waitForSheetClosed(tags.tambah.sheetAccount)
  }

  /**
   * Picks a date in the Material3 date picker. Day cells are Buttons whose
   * label is the full English long date in iOS order ("Friday, 23 October
   * 2026" — unlike Android's "October 23, 2026"), today's cell prefixes
   * "Today, ". Off-screen month pages stay composed in the tree, so the
   * match is filtered by isDisplayed and the picker steps back a month when
   * the wanted day is not on the visible page (covers yesterday on the 1st).
   *
   * The cell label follows the DEVICE's day/month order, which is not the
   * one `Intl` produces for en-US: the simulator renders "Monday, 26
   * October 2026" (day first), so the en-GB rendering is matched as well.
   */
  async selectDate(date: Date): Promise<void> {
    const label = [
      new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date),
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date),
    ]
    await iosByTag(tags.tambah.selectDate).click()
    await iosByTag(tags.tambah.datePicker).waitForDisplayed({ timeout: 10_000 })
    for (let attempt = 0; attempt < 3; attempt++) {
      const cells = await $$(
        `-ios predicate string: type == "XCUIElementTypeButton" AND ` +
          `(${label.map((l) => `(label == "${l}" OR label == "Today, ${l}")`).join(' OR ')})`,
      )
      for (const cell of cells) {
        if (await cell.isDisplayed()) {
          await cell.click()
          await iosByTag(tags.tambah.datePickerOk).click()
          await iosByTag(tags.tambah.datePicker).waitForDisplayed({ timeout: 10_000, reverse: true })
          return
        }
      }
      // Not on the visible page — step back one month (Saku allows no future
      // dates, so stepping back is always the right direction).
      const prev = await $$('-ios predicate string: label == "Change to previous month"')
      await prev[0].click()
      await driver.pause(400)
    }
    throw new Error(`Date cell "${label[0]}" never became visible in the iOS date picker`)
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

  /**
   * Saves and waits for the form reset (iOS has no component_toast tag — tag
   * drift, verified via MCP 2026-10-27: no element with "toast"/"disimpan"
   * exists in the accessibility tree after save). The app stays on Tambah.
   * The save confirmation on iOS is the form reset: the amount field returns
   * to its default (the save button itself does NOT re-disable).
   *
   * The amount field keeps focus through later field interactions, so the
   * keyboard can reappear over the save button after the category sheet
   * closes; a WDA tap then hits a keypad digit and the tap is lost (measured
   * live: the amount grew by one digit and nothing saved). Each attempt
   * therefore dismisses and verifies the keyboard away before tapping.
   */
  async save(): Promise<void> {
    let lastState = ''
    for (let attempt = 0; attempt < 3; attempt++) {
      await iosDismissKeyboard()
      if (await iosKeyboardShown().catch(() => false)) {
        lastState = 'keyboard still shown'
        await driver.pause(500)
        continue
      }
      lastState = `saveEnabled=${await this.saveButton.isEnabled().catch(() => false)}`
      await this.saveButton.click()
      try {
        await driver.waitUntil(
          async () => {
            const text = await iosFieldText(this.amountInput).catch(() => '')
            return text === '' || text === '0' || text === 'Rp 0'
          },
          { timeout: 6_000 },
        )
        // Best-effort: confirm any toast that might surface on newer builds.
        const toast = iosByTag(tags.component.toast)
        await toast.waitForExist({ timeout: 2_000 }).catch(() => undefined)
        return
      } catch {
        // Click raced a recomposition — settle and retry on a fresh query.
        await driver.pause(700)
      }
    }
    throw new Error(`Save did not reset the amount field after 3 attempts (last state: ${lastState})`)
  }

  async getAmountText(): Promise<string> {
    return iosFieldText(this.amountInput)
  }

  async getNoteText(): Promise<string> {
    return iosFieldText(this.noteInput)
  }

  /**
   * Rendered account name on the account selector (e.g. "Tunai", "BCA").
   * The value renders on the field's first StaticText child; the wrapper's
   * own label appends the chevron content-description (", Buka pilihan"),
   * which is stripped when the fallback has to use it.
   */
  async getAccountText(): Promise<string> {
    const children = await iosExtractChildTexts(iosByTag(tags.tambah.selectAccount))
    if (children.length > 0) return children[0]
    const own = ((await iosByTag(tags.tambah.selectAccount).getText().catch(() => '')) || '').trim()
    return own.replace(/,\s*Buka pilihan$/, '').trim()
  }

  /**
   * Helper text below the note field. Own getText() works on this node
   * (verified), but the child static-text read is the robust path when the
   * wrapper re-composes, so try both.
   */
  async getHelperText(): Promise<string> {
    const own = ((await this.helperText.getText().catch(() => '')) || '').trim()
    if (own) return own
    const children = await iosExtractChildTexts(this.helperText)
    return children[0] ?? ''
  }

  /**
   * Verifies the sheet with `rootTag` is gone after a selection. A settle
   * pause first lets the dismiss animation start; the reverse wait then
   * covers the rest.
   */
  private async waitForSheetClosed(rootTag: string): Promise<void> {
    await driver.pause(500)
    await iosByTag(rootTag).waitForExist({ timeout: 10_000, reverse: true })
  }

  /** One swipe upward over the sheet's list area (lower half of the screen). */
  private async swipeSheetContentUp(): Promise<void> {
    const { width, height } = await driver.getWindowSize()
    const x = Math.floor(width / 2)
    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x, y: Math.floor(height * 0.75) },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 150 },
          { type: 'pointerMove', duration: 500, x, y: Math.floor(height * 0.45) },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
    await driver.pause(400)
  }
}
