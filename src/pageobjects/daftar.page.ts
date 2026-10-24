import { byTag, scrollToTagMatches } from '../helpers/locators'
import { tags } from '../config/tags'
import { parseAmountText } from '../helpers/money'
import { BasePage } from './base.page'
import type { ChainablePromiseElement, ChainablePromiseArray } from '../types'

/** Amount-bearing tagged nodes are containers; the value renders in a child TextView. */
export async function readAmount(el: ChainablePromiseElement): Promise<number> {
  const texts: string[] = []
  const own = (await el.getText()).trim()
  if (own) texts.push(own)
  const desc = await el.getAttribute('content-desc').catch(() => '')
  if (desc && desc.trim()) texts.push(desc.trim())
  const children = await el.$$(`android=new UiSelector().className("android.widget.TextView")`)
  for (const child of children) {
    const t = (await child.getText()).trim()
    if (t) texts.push(t)
  }
  // The value node renders after the label ("MASUK" -> "Rp 250.000"), so the
  // last digit-bearing text wins.
  const withDigits = texts.filter((t) => /\d/.test(t))
  if (withDigits.length === 0) {
    throw new Error(`No amount text found on element (tried node, content-desc, children)`)
  }
  return parseAmountText(withDigits[withDigits.length - 1])
}

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

  async summaryIncome(): Promise<number> {
    return readAmount(byTag(tags.daftar.summaryMasuk))
  }

  async summaryExpense(): Promise<number> {
    return readAmount(byTag(tags.daftar.summaryKeluar))
  }

  async monthLabel(): Promise<string> {
    return this.monthLabelEl.getText()
  }

  async prevMonth(): Promise<void> {
    await byTag(tags.daftar.monthPrev).click()
  }

  async nextMonth(): Promise<void> {
    await byTag(tags.daftar.monthNext).click()
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

  /** True when a row rendering `snippet` exists without scrolling the list. */
  async hasRowText(snippet: string): Promise<boolean> {
    return $(
      `android=new UiSelector().textContains("${snippet}")`,
    ).isDisplayed()
  }

  /**
   * Row action clicks go through UiScrollable, and Compose recomposition can
   * stale the resolved element between find and click — retry once on a
   * fresh query.
   */
  private async tapRowAction(tagPattern: string): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await scrollToTagMatches(tagPattern).click()
        return
      } catch {
        // stale element — re-query and retry
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

  /** Any rendered transaction row. */
  async firstRow(): Promise<ChainablePromiseElement> {
    return scrollToTagMatches('daftar_item_.*')
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
}
