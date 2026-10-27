import { $$ } from '@wdio/globals'
import { iosByTag } from '../helpers/locators'
import { iosAmountText, iosReadAmount } from '../helpers/elements'
import { tags } from '../config/tags'
import { BaseIosPage } from './base.ios.page'

/**
 * Ringkasan (summary) on iOS — accessibility-id twin of RingkasanPage,
 * kept to the pieces the TC-INC/TC-EXP port needs.
 *
 * breakdownItemTexts ports the Android page-source-dump trick: deep
 * LazyColumn rows stale between find and read, so the row's texts are parsed
 * from one atomic `getPageSource()` XML. The iOS dump labels the same texts
 * differently — identifiers on the `name` attribute, rendered strings on
 * `label` — so the slice-and-extract keys off those.
 */
export class RingkasanIosPage extends BaseIosPage {
  constructor() {
    super(tags.ringkasan.screen)
  }

  async open(): Promise<void> {
    await iosByTag(tags.navRingkasan).click()
    await this.waitForScreen()
  }

  async balanceValue(): Promise<number> {
    return iosReadAmount(iosByTag(tags.ringkasan.balanceValue))
  }

  /** Raw rendered balance text (e.g. "\u2212Rp 275.000") for exact assertions. */
  async balanceText(): Promise<string> {
    return iosAmountText(iosByTag(tags.ringkasan.balanceValue))
  }

  async incomeTotal(): Promise<number> {
    return iosReadAmount(iosByTag(tags.ringkasan.totalsCardIncome))
  }

  async expenseTotal(): Promise<number> {
    return iosReadAmount(iosByTag(tags.ringkasan.totalsCardExpense))
  }

  /**
   * Rendered texts of a breakdown category row — name, percentage and
   * formatted amount (e.g. ["Makanan & Minuman", "100%", "Rp 75.000"]).
   * Slices the page source from the row's `name="<tag>"` to the next
   * `ringkasan_` tag and extracts `label="..."` values, retrying with a
   * content swipe when the row is below the fold.
   *
   * @param categoryId Category id of the row's test tag — see
   * tags.ringkasan.categoryItem.
   */
  async breakdownItemTexts(categoryId: string): Promise<string[]> {
    const tag = tags.ringkasan.categoryItem(categoryId)
    for (let attempt = 0; attempt < 3; attempt++) {
      const xml = await driver.getPageSource()
      const texts = iosChildTextsFromSource(xml, tag)
      if (texts.length > 0) return texts
      await this.scrollContentDown()
    }
    throw new Error(`Breakdown item ${categoryId} not found in the iOS page source`)
  }

  /** One swipe upward over the summary content (same mechanics as Android). */
  async scrollContentDown(): Promise<void> {
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
          { type: 'pointerMove', duration: 500, x, y: Math.floor(height * 0.3) },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
    await driver.pause(400)
  }
}

/**
 * Non-empty label attributes of the subtree under the node whose `name`
 * (accessibilityIdentifier) equals `identifier`. The subtree ends where the
 * next tagged ringkasan node begins — same structural assumption as the
 * Android childTextsFromSource.
 */
function iosChildTextsFromSource(xml: string, identifier: string): string[] {
  const marker = `name="${identifier}"`
  const start = xml.indexOf(marker)
  if (start === -1) return []
  const rest = xml.slice(start + marker.length)
  const next = rest.search(
    /name="ringkasan_(category_item_|breakdown_|totals_|savings_|balance_|anggaran_|kelola_|comparison|empty_)/,
  )
  const segment = next === -1 ? rest.slice(0, 10_000) : rest.slice(0, next)
  return [...segment.matchAll(/label="([^"]+)"/g)]
    .map((m) => (m[1] ?? '').replace(/&amp;/g, '&').trim())
    .filter((t) => t.length > 0 && t !== identifier)
}
