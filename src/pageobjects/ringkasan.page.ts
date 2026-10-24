import { byTag, scrollToTag } from '../helpers/locators'
import { tags } from '../config/tags'
import { BasePage } from './base.page'
import { readAmount } from './daftar.page'

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
}
