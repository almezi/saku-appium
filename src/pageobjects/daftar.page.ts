import { byTag, scrollToTagMatches } from '../helpers/locators'
import { tags } from '../config/tags'
import { readAmount } from '../helpers/elements'
import { BasePage } from './base.page'
import type { ChainablePromiseElement } from '../types'

export class DaftarPage extends BasePage {
  constructor() {
    super(tags.daftar.screen)
  }

  async open(): Promise<void> {
    await byTag(tags.navDaftar).click()
    await this.waitForScreen()
  }

  get monthLabelEl(): ChainablePromiseElement {
    return byTag(tags.daftar.monthLabel)
  }

  get emptyState(): ChainablePromiseElement {
    return byTag(tags.daftar.emptyState)
  }

  /** Child texts of the empty state (title, hint, actions). */
  async emptyStateTexts(): Promise<string[]> {
    const children = await this.emptyState.$$(
      'android=new UiSelector().className("android.widget.TextView")',
    )
    const texts: string[] = []
    for (const child of children) {
      const text = ((await child.getText()) || '').trim()
      if (text) texts.push(text)
    }
    return texts
  }

  async summaryIncome(): Promise<number> {
    return readAmount(byTag(tags.daftar.summaryMasuk))
  }

  async summaryExpense(): Promise<number> {
    return readAmount(byTag(tags.daftar.summaryKeluar))
  }

  async monthLabel(): Promise<string> {
    return this.monthLabelEl.getText()
  }

  /**
   * Month switching with a verify-retry: the arrow click can race list
   * recomposition and silently not register, so re-click until the label
   * actually changes (bounded).
   */
  private async switchMonth(arrow: string): Promise<void> {
    const before = await this.monthLabel()
    for (let attempt = 0; attempt < 3; attempt++) {
      await byTag(arrow).click()
      // Recomposition is not instantaneous: a label read immediately after
      // the click returns the old value, and re-clicking on it steps two
      // months. Settle first, then let a failed read surface instead of
      // masking it as "unchanged".
      await driver.pause(300)
      const after = await this.monthLabel()
      if (after !== before) return
    }
    throw new Error(`Month switch via ${arrow} did not change the label from "${before}"`)
  }

  async prevMonth(): Promise<void> {
    await this.switchMonth(tags.daftar.monthPrev)
  }

  async nextMonth(): Promise<void> {
    await this.switchMonth(tags.daftar.monthNext)
  }

  /**
   * Scrolls the list until a transaction row's rendered text contains
   * `snippet` (a unique note or formatted amount) and returns the text node.
   * Interaction stays on tags; text lookup is for rendered-output assertions.
   */
  async findRowText(snippet: string): Promise<ChainablePromiseElement> {
    return $(
      `android=new UiScrollable(new UiSelector().scrollable(true))` +
        `.scrollIntoView(new UiSelector().textContains("${snippet}"))`,
    )
  }

  /**
   * Row action clicks go through UiScrollable, and Compose recomposition can
   * stale the resolved element between find and click — retry on a fresh
   * query, with a pause so a just-dismissed overlay (toast, date picker
   * window) can release the click interception.
   */
  private async tapRowAction(tagPattern: string): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await scrollToTagMatches(tagPattern).click()
        return
      } catch {
        await driver.pause(500)
      }
    }
    throw new Error(`Row action ${tagPattern} could not be clicked`)
  }

  /** Edit affordance for the (unique) transaction using `categoryId`. */
  async tapEdit(categoryId: string): Promise<void> {
    await this.tapRowAction(`daftar_item_.*_edit_${categoryId}`)
  }

  /** Delete affordance for the (unique) transaction using `categoryId`. */
  async tapDelete(categoryId: string): Promise<void> {
    await this.tapRowAction(`daftar_item_.*_delete_${categoryId}`)
  }

  /**
   * Child texts of the transaction row whose rendered text contains
   * `snippet` — category, type label, amount. findRowText resolves the
   * matching TEXT node, so the row container is reached via the nearest
   * daftar_item ancestor (XPath); a scroll-to-top first keeps top rows
   * composed even when a previous test scrolled the list. Like tapRowAction,
   * the whole scroll-find-enumerate is retried on a fresh query — Compose
   * recomposition can stale the row between find and enumeration.
   */
  async rowTexts(snippet: string): Promise<string[]> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await scrollToTagMatches('daftar_item_.*')
        const row = await $(
          `//android.widget.TextView[contains(@text, "${snippet}")]/ancestor::*[starts-with(@resource-id, "daftar_item_")][1]`,
        )
        const children = await row.$$('android=new UiSelector().className("android.widget.TextView")')
        const texts: string[] = []
        for (const child of children) {
          const text = ((await child.getText()) || '').trim()
          if (text) texts.push(text)
        }
        return texts
      } catch {
        await driver.pause(500)
      }
    }
    throw new Error(`Row texts for "${snippet}" could not be read`)
  }

  async dayHeaderCount(): Promise<number> {
    const headers = await $$(`android=new UiSelector().resourceIdMatches("daftar_day_header_.*")`)
    return headers.length
  }

  /**
   * Net total of the first (newest) day header — weekday, date and amount
   * render as child TextViews and readAmount takes the last digit-bearing
   * text, i.e. the total.
   */
  async firstDayHeaderTotal(): Promise<number> {
    return readAmount(
      $(`android=new UiSelector().resourceIdMatches("daftar_day_header_.*")`),
    )
  }

  /**
   * Rendered texts of the first (newest) day header in order — weekday
   * ("SABTU"), date ("24 Okt 2026") and net total ("Rp …" / "−Rp …").
   */
  async firstDayHeaderTexts(): Promise<string[]> {
    const header = $(`android=new UiSelector().resourceIdMatches("daftar_day_header_.*")`)
    const children = await header.$$('android=new UiSelector().className("android.widget.TextView")')
    const texts: string[] = []
    for (const child of children) {
      const text = ((await child.getText()) || '').trim()
      if (text) texts.push(text)
    }
    return texts
  }

  /**
   * Amount text of each composed transaction row, in list (DOM) order.
   * Rows are LazyColumn items, so this covers the composed window only —
   * enough for order assertions near the top of the list.
   */
  async rowAmountTextsInOrder(): Promise<string[]> {
    const rows = await $$('android=new UiSelector().resourceIdMatches("daftar_item_\\d+$")')
    const amounts: string[] = []
    for (const row of rows) {
      const children = await row.$$('android=new UiSelector().className("android.widget.TextView")')
      for (const child of children) {
        const text = ((await child.getText()) || '').trim()
        // Row amounts are the only digit-bearing text ("Rp 60.000", never
        // the type label or category name).
        if (/[\d]/.test(text) && text.startsWith('Rp')) {
          amounts.push(text)
          break
        }
      }
    }
    return amounts
  }
}
