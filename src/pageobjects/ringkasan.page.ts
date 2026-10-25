import { byTag, scrollToTag } from '../helpers/locators'
import { barFillRatio, extractChildTexts, readAmount } from '../helpers/elements'
import { tags } from '../config/tags'
import { BasePage } from './base.page'

/** Non-empty text attributes of the subtree under the node with `resourceId`. */
function childTextsFromSource(xml: string, resourceId: string): string[] {
  const marker = `resource-id="${resourceId}"`
  const start = xml.indexOf(marker)
  if (start === -1) return []
  const rest = xml.slice(start + marker.length)
  // The subtree ends where the next tagged summary node begins.
  const next = rest.search(
    /resource-id="ringkasan_(category_item_|breakdown_|totals_|savings_|balance_|anggaran_|kelola_|comparison|empty_)/,
  )
  const segment = next === -1 ? rest.slice(0, 10_000) : rest.slice(0, next)
  return [...segment.matchAll(/text="([^"]+)"/g)]
    .map((m) => m[1].replace(/&amp;/g, '&').trim())
    .filter((t) => t.length > 0)
}

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

  // Click-wait audit (code review Step 10): openAnggaran() and
  // openKelolaKategori() click targets that belong to the Ringkasan screen
  // this page is already on — open() ends in waitForScreen(), and WDIO's
  // command auto-wait (waitforTimeout 15 s) bridges any remaining
  // post-transition composition lag, so an explicit waitForExist guard
  // would be redundant. Same verdict for open() (nav bar of the source
  // screen, arrival verified by waitForScreen) and switchMonth() (arrows
  // of the current screen; a missed click is caught by its label retry).
  // Arrival on the target screen is asserted by the calling spec, matching
  // openFromRingkasan() in the anggaran/kategori page objects.
  async openAnggaran(): Promise<void> {
    await byTag(tags.ringkasan.anggaranButton).click()
  }

  async openKelolaKategori(): Promise<void> {
    await byTag(tags.ringkasan.kelolaButton).click()
  }

  /**
   * Rendered texts of a breakdown category row — name, percentage and
   * formatted amount (e.g. ["Makanan & Minuman", "100%", "Rp 75.000"]).
   *
   * Read from a full page-source dump instead of element handles: rows deep
   * in the LazyColumn (the expense card is the last section) stale out
   * between find and read under WebdriverIO — three element-read runs
   * failed. The dump is atomic, so the row's children are parsed from the
   * XML directly; a scrollGesture retry covers rows not yet composed.
   *
   * @param categoryId Category id of the row's test tag — see
   * tags.ringkasan.categoryItem.
   * @returns The row's child texts in render order; throws naming the
   * category when it never appears in the page source.
   */
  async breakdownItemTexts(categoryId: string): Promise<string[]> {
    const tag = tags.ringkasan.categoryItem(categoryId)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await scrollToTag(tag)
      } catch {
        // Row not reachable by UiScrollable — the dump below decides.
      }
      const xml = await driver.getPageSource()
      const texts = childTextsFromSource(xml, tag)
      if (texts.length > 0) return texts
      await this.scrollContentDown()
    }
    throw new Error(`Breakdown item ${categoryId} not found in page source`)
  }

  /**
   * Rendered texts of the "Pemasukan vs pengeluaran" comparison card —
   * scrolled into view first, since the card can sit below the fold in the
   * summary LazyColumn.
   */
  async comparisonTexts(): Promise<string[]> {
    return extractChildTexts(scrollToTag(tags.ringkasan.comparison))
  }

  /**
   * Child texts of the empty state (title, hint, action label). Read without
   * scrolling: the empty state replaces the whole content area when a month
   * has no data — no scrollable container exists for UiScrollable to attach
   * to — and it always sits at the top of the screen.
   */
  async emptyStateTexts(): Promise<string[]> {
    return extractChildTexts(byTag(tags.ringkasan.emptyState))
  }

  /**
   * Bar-fill fraction of one breakdown row: the row's untagged trailing Views
   * are [bar container, bar fill] (verified live — at 80% the fill is 712 px
   * of a 890 px container), so fill.width / container.width is the share.
   * Exactly two Views are required — a different count means the layout
   * drifted (e.g. a wrapper View appeared), and failing loudly beats
   * silently reading the wrong pair.
   *
   * @param categoryId Category id of the row's test tag — see
   * tags.ringkasan.categoryItem.
   * @returns The bar-fill share (fill width / container width) of the row;
   * throws when no attempt yields exactly two measurable bar Views.
   */
  async breakdownBarRatio(categoryId: string): Promise<number> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const item = await scrollToTag(tags.ringkasan.categoryItem(categoryId))
        // UiScrollable can resolve a ghost reference when the row never
        // composes — confirm existence for a clear failure instead of an
        // opaque child-enumeration error.
        await item.waitForExist({ timeout: 10_000 })
        // WDIO v9 types the `$$` chainable's `length` as Promise<number>;
        // spread the awaited result into a real array before indexing.
        const viewList = [
          ...(await item.$$('android=new UiSelector().className("android.view.View")')),
        ]
        if (viewList.length !== 2) continue
        const container = await viewList[0].getSize()
        const fill = await viewList[1].getSize()
        return barFillRatio(container.width, fill.width)
      } catch {
        // Stale element or mid-recompose ghost — back off before the fresh
        // re-query (same error-path pause as DaftarPage.tapRowAction).
        await driver.pause(500)
      }
    }
    throw new Error(`Breakdown item ${categoryId} has no measurable bar views`)
  }

  /**
   * One W3C touch swipe upward, revealing content below. The
   * `mobile: scrollGesture` 'down' direction is a silent no-op on this
   * Compose LazyColumn (verified live via curl: 'up' scrolls, 'down'
   * returns false at both ends), so the list is scrolled with raw touch
   * actions instead.
   */
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

  /**
   * Scrolls the summary LazyColumn to its bottom so the expense-breakdown
   * rows (the last section, partly under the floating nav) compose before
   * they are read.
   */
  async scrollToBottom(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await this.scrollContentDown()
    }
  }

  /**
   * Month switching with a verify-retry (same as the Daftar list): the arrow
   * click can race recomposition and silently not register.
   *
   * @param arrow Test tag of the switcher arrow to tap —
   * tags.ringkasan.monthPrev or tags.ringkasan.monthNext.
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
    await this.switchMonth(tags.ringkasan.monthPrev)
  }

  async nextMonth(): Promise<void> {
    await this.switchMonth(tags.ringkasan.monthNext)
  }
}
