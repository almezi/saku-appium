import { $$ } from '@wdio/globals'
import { iosByTag } from '../helpers/locators'
import { iosReadAmount } from '../helpers/elements'
import { tags } from '../config/tags'
import { BaseIosPage } from './base.ios.page'

/**
 * Transaksi list on iOS — accessibility-id twin of DaftarPage, kept to the
 * pieces the TC-INC/TC-EXP port needs. Method names mirror the Android page.
 *
 * iOS adaptations of the Android locator mechanics:
 *  - `resourceIdMatches("daftar_item_.*")` becomes an XCUITest predicate on
 *    the `name` attribute, which carries the accessibilityIdentifier;
 *  - there is no UiScrollable — row lookups query the tree directly (the
 *    wave's data volumes keep every needed row composed) with a bounded
 *    swipe fallback;
 *  - driver.back() does not exist on iOS (no system BACK), so flows leave
 *    screens through their UI affordances instead.
 */
export class DaftarIosPage extends BaseIosPage {
  constructor() {
    super(tags.daftar.screen)
  }

  async open(): Promise<void> {
    await iosByTag(tags.navDaftar).click()
    await this.waitForScreen()
  }

  async summaryIncome(): Promise<number> {
    return iosReadAmount(iosByTag(tags.daftar.summaryMasuk))
  }

  async summaryExpense(): Promise<number> {
    return iosReadAmount(iosByTag(tags.daftar.summaryKeluar))
  }

  /**
   * First element whose rendered label contains `snippet` (a formatted
   * amount). Rendered-output lookup by text is the same documented exception
   * as the Android findRowText — rows render no unique tag of their own.
   */
  async findRowText(snippet: string): Promise<ChainablePromiseElement> {
    const matches = $$(`-ios predicate string: label CONTAINS "${snippet}"`)
    if ((await matches.length) === 0) {
      throw new Error(`No element with label containing "${snippet}"`)
    }
    return matches[0]
  }

  /**
   * Net total of the first (newest) day header. The header row is tagged
   * `daftar_day_header_<dateMillis>`; iosReadAmount takes the last
   * digit-bearing text among its static-text children, i.e. the total.
   */
  async firstDayHeaderTotal(): Promise<number> {
    const headers = $$(`-ios predicate string: name MATCHES "daftar_day_header_.+"`)
    if ((await headers.length) === 0) {
      throw new Error('No daftar_day_header_* element found in the tree')
    }
    return iosReadAmount(headers[0])
  }

  /**
   * Edit affordance of the (unique) transaction using `categoryId`. The
   * card's buttons carry `daftar_item_<txId>_edit_<categoryId>` — matched by
   * predicate regex (the ios twin of Android's resourceIdMatches
   * UiScrollable lookup), with a bounded swipe-and-retry for rows below the
   * fold.
   */
  async tapEdit(categoryId: string): Promise<void> {
    const pattern = `-ios predicate string: name MATCHES "daftar_item_.*_edit_${categoryId}"`
    for (let attempt = 0; attempt < 3; attempt++) {
      // The chainable re-queries the tree on every command access, so a
      // length read after the swipe reflects the post-scroll state.
      const buttons = $$(pattern)
      if ((await buttons.length) > 0) {
        try {
          await buttons[0].click()
          return
        } catch {
          // Stale handle after recomposition — settle and re-query.
          await driver.pause(500)
        }
      }
      await this.swipeListUp()
    }
    throw new Error(`Edit affordance for category "${categoryId}" could not be clicked`)
  }

  /** One raw-touch swipe up over the list (bounded-scroll fallback). */
  private async swipeListUp(): Promise<void> {
    const { width, height } = await driver.getWindowSize()
    const x = Math.floor(width / 2)
    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x, y: Math.floor(height * 0.7) },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 150 },
          { type: 'pointerMove', duration: 500, x, y: Math.floor(height * 0.35) },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
    await driver.pause(400)
  }
}
