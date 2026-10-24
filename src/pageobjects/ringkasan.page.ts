import { byTag, scrollToTag } from '../helpers/locators'
import { tags } from '../config/tags'
import { BasePage } from './base.page'
import { readAmount } from './daftar.page'
import type { Element } from 'webdriverio'

export class RingkasanPage extends BasePage {
  constructor() {
    super(tags.ringkasan.screen)
  }

  async open(): Promise<void> {
    await byTag(tags.navRingkasan).click()
    await this.waitForScreen()
  }

  async balanceValue(): Promise<number> {
    return readAmount(byTag(tags.ringkasan.balanceValue))
  }

  async balanceText(): Promise<string> {
    return byTag(tags.ringkasan.balanceValue).getText()
  }

  async incomeTotal(): Promise<number> {
    return readAmount(byTag(tags.ringkasan.totalsCardIncome))
  }

  async expenseTotal(): Promise<number> {
    return readAmount(byTag(tags.ringkasan.totalsCardExpense))
  }

  async savingsText(): Promise<string> {
    return byTag(tags.ringkasan.savingsValue).getText()
  }

  async monthLabel(): Promise<string> {
    return byTag(tags.ringkasan.monthLabel).getText()
  }

  async openAnggaran(): Promise<void> {
    await byTag(tags.ringkasan.anggaranButton).click()
  }

  async openKelolaKategori(): Promise<void> {
    await byTag(tags.ringkasan.kelolaButton).click()
  }

  /**
   * Rendered texts of a breakdown category row — name, percentage and
   * formatted amount (e.g. ["Makanan & Minuman", "100%", "Rp 75.000"]).
   * Scrolls the LazyColumn when the row is below the fold.
   */
  async breakdownItemTexts(categoryId: string): Promise<string[]> {
    const item = await scrollToTag(tags.ringkasan.categoryItem(categoryId))
    const children = await item.$$('android=new UiSelector().className("android.widget.TextView")')
    const texts: string[] = []
    for (const child of children) {
      const text = ((await child.getText()) || '').trim()
      if (text) texts.push(text)
    }
    return texts
  }

  /** Rendered texts of the "Pemasukan vs pengeluaran" comparison card. */
  async comparisonTexts(): Promise<string[]> {
    const children = await byTag(tags.ringkasan.comparison).$$(
      'android=new UiSelector().className("android.widget.TextView")',
    )
    const texts: string[] = []
    for (const child of children) {
      const text = ((await child.getText()) || '').trim()
      if (text) texts.push(text)
    }
    return texts
  }

  /** Child texts of the empty state (title, hint, action label). */
  async emptyStateTexts(): Promise<string[]> {
    const children = await byTag(tags.ringkasan.emptyState).$$(
      'android=new UiSelector().className("android.widget.TextView")',
    )
    const texts: string[] = []
    for (const child of children) {
      const text = ((await child.getText()) || '').trim()
      if (text) texts.push(text)
    }
    return texts
  }

  /**
   * Bar-fill fraction of one breakdown row: the row's untagged trailing Views
   * are [bar container, bar fill] (verified live — at 80% the fill is 712 px
   * of a 890 px container), so fill.width / container.width is the share.
   */
  async breakdownBarRatio(categoryId: string): Promise<number> {
    const item = await scrollToTag(tags.ringkasan.categoryItem(categoryId))
    const views = await item.$$('android=new UiSelector().className("android.view.View")')
    const viewList = await views as unknown as Element[]
    if (viewList.length < 2) {
      throw new Error(`Breakdown item ${categoryId} has no bar views`)
    }
    const container = await viewList[viewList.length - 2].getSize()
    const fill = await viewList[viewList.length - 1].getSize()
    return fill.width / container.width
  }

  /**
   * Month switching with a verify-retry (same as the Daftar list): the arrow
   * click can race recomposition and silently not register.
   */
  private async switchMonth(arrow: string): Promise<void> {
    const before = await this.monthLabel()
    for (let attempt = 0; attempt < 3; attempt++) {
      await byTag(arrow).click()
      const after = await this.monthLabel().catch(() => before)
      if (after !== before) return
    }
    throw new Error(`Month switch via ${arrow} did not change the label from "${before}"`)
  }

  async prevMonth(): Promise<void> {
    await this.switchMonth(tags.ringkasan.monthPrev)
  }

  async nextMonth(): Promise<void> {
    await this.switchMonth(tags.ringkasan.monthNext)
  }
}
