/**
 * iOS twin of ringkasan.page.ts — the Ringkasan (summary) screen. Locators
 * are accessibility ids from the TESTABILITY.md tag contract
 * (src/config/tags.ts); container texts and the bar ratio keep iOS mechanics
 * the Android ones cannot express (Compose hoists container strings to
 * siblings; the bar exposes no fill) — documented in the class block below.
 */
import { iosByTag } from "../helpers/locators";
import {
  iosAmountText,
  iosExtractChildTexts,
  iosPageNodes,
  iosReadAmount,
  iosStaticTexts,
  iosTextsInside,
  iosTextsInRect,
} from "../helpers/elements";
import { formatMonthYear, parseMonthLabel, shiftMonthYear } from "../helpers/months";
import { tags } from "../config/tags";
import type { ChainablePromiseElement } from "../types";
import { BaseIosPage } from "./base.ios.page";
import { MONTH_LABEL_RECOMPOSE, SWIPE_ANIM } from "../config/settles";

/**
 * Ringkasan (summary) on iOS — accessibility-id twin of RingkasanPage. The
 * public method surface matches the Android page one-to-one, so a Ringkasan
 * spec reads the same on both platforms.
 *
 * breakdownItemTexts ports the Android page-source-dump trick: deep
 * LazyColumn rows stale between find and read, so the row's texts are parsed
 * from one atomic `getPageSource()` XML. The iOS dump labels the same texts
 * differently — identifiers on the `name` attribute, rendered strings on
 * `label` — so the slice-and-extract keys off those.
 *
 * Two reads keep their iOS mechanics rather than the Android ones, because
 * the Android mechanics do not exist on this platform:
 *  - container text reads (`comparisonTexts`, `emptyStateTexts`) go through
 *    the page-source frame, not a child query: Compose hoists a tagged
 *    container's strings OUT of the container node on iOS, so the node is an
 *    empty `Other` and its texts are siblings (bugs/BUG_Found_13.md) — the same
 *    reason `anggaran.ios.page.ts` and `daftar.ios.page.ts` read by geometry;
 *  - `breakdownBarRatio` cannot be the Android fill/container measurement:
 *    the iOS bar is a drawing-only node with no accessibility fill (measured
 *    for the Anggaran bars, see `anggaran.ios.page.ts` `barWidth`). The share
 *    is instead taken from the row's rendered percentage text, so the method
 *    keeps the Android contract (0…1 fraction) — at the precision the label
 *    is rounded to.
 *
 * Exercised on iPhone 18 Pro (2026-10-29): `summary.ios.spec.ts` 13/13. The run
 * is also what surfaced the iOS-only step in `scrollSwitcherIntoView` — the
 * month switcher is not sticky, so an arrow above the fold cannot be tapped.
 */
export class RingkasanIosPage extends BaseIosPage {
  constructor() {
    super(tags.ringkasan.screen);
  }

  async open(): Promise<void> {
    await iosByTag(tags.navRingkasan).click();
    await this.waitForScreen();
  }

  async balanceValue(): Promise<number> {
    return iosReadAmount(iosByTag(tags.ringkasan.balanceValue));
  }

  /** Raw rendered balance text (e.g. "\u2212Rp 275.000") for exact assertions. */
  async balanceText(): Promise<string> {
    return iosAmountText(iosByTag(tags.ringkasan.balanceValue));
  }

  async incomeTotal(): Promise<number> {
    return iosReadAmount(iosByTag(tags.ringkasan.totalsCardIncome));
  }

  async expenseTotal(): Promise<number> {
    return iosReadAmount(iosByTag(tags.ringkasan.totalsCardExpense));
  }

  /**
   * Raw savings-rate text as rendered ("37,5%", "—" when income is 0). The
   * digit-free "—" is the point: `iosAmountText` throws on it, so this reads
   * the node's rendered text through the same candidate order without
   * filtering for digits.
   */
  async savingsText(): Promise<string> {
    return iosRenderedText(iosByTag(tags.ringkasan.savingsValue));
  }

  async monthLabel(): Promise<string> {
    return iosByTag(tags.ringkasan.monthLabel).getText();
  }

  // Click-wait audit, same verdict as the Android twins: the button belongs
  // to the Ringkasan screen this page is already on (open() ends in
  // waitForScreen), and the WDIO command auto-wait bridges post-transition
  // composition lag. Arrival on the target screen is asserted by the caller.
  async openAnggaran(): Promise<void> {
    await iosByTag(tags.ringkasan.anggaranButton).click();
  }

  async openKelolaKategori(): Promise<void> {
    await iosByTag(tags.ringkasan.kelolaButton).click();
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
    const tag = tags.ringkasan.categoryItem(categoryId);
    for (let attempt = 0; attempt < 3; attempt++) {
      const xml = await driver.getPageSource();
      const texts = iosChildTextsFromSource(xml, tag);
      if (texts.length > 0) return texts;
      await this.scrollContentDown();
    }
    throw new Error(`Breakdown item ${categoryId} not found in the iOS page source`);
  }

  /**
   * The category share as a 0…1 fraction, read from the row's rendered
   * percentage text instead of bar geometry — see the class note on why the
   * Android fill/container measurement has no iOS counterpart.
   *
   * @param categoryId Category id of the row's test tag — see
   * tags.ringkasan.categoryItem.
   */
  async breakdownBarRatio(categoryId: string): Promise<number> {
    const texts = await this.breakdownItemTexts(categoryId);
    const percent = texts.find((text) => /^\d+%$/.test(text));
    if (!percent) {
      throw new Error(
        `Breakdown item ${categoryId} renders no percentage text: ${JSON.stringify(texts)}`,
      );
    }
    return Number.parseInt(percent, 10) / 100;
  }

  /**
   * Rendered texts of the "Pemasukan vs pengeluaran" comparison card.
   * Scrolling stands in for Android's `scrollToTag` (no UiScrollable on iOS):
   * the card can sit below the fold and is then not composed yet.
   */
  async comparisonTexts(): Promise<string[]> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const texts = await this.textsInsideTag(tags.ringkasan.comparison);
      if (texts.length > 0) return texts;
      await this.scrollContentDown();
    }
    return [];
  }

  /**
   * Child texts of the empty state (title, hint, action label), read without
   * scrolling — same reasoning as Android: the empty state replaces the whole
   * content area, so it always sits on screen.
   */
  async emptyStateTexts(): Promise<string[]> {
    return this.textsInsideTag(tags.ringkasan.emptyState);
  }

  /**
   * Labels rendered inside the frame of the node tagged `tag`, from ONE page
   * source dump. Returns [] when the node has not composed yet.
   */
  private async textsInsideTag(tag: string): Promise<string[]> {
    const nodes = await iosPageNodes();
    const host = nodes.find((node) => node.name === tag);
    if (!host) return [];
    return iosTextsInRect(host, iosStaticTexts(nodes));
  }

  /** One swipe upward over the summary content (same mechanics as Android). */
  async scrollContentDown(): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    const x = Math.floor(width / 2);
    await driver.performActions([
      {
        type: "pointer",
        id: "finger1",
        parameters: { pointerType: "touch" },
        actions: [
          { type: "pointerMove", duration: 0, x, y: Math.floor(height * 0.75) },
          { type: "pointerDown", button: 0 },
          { type: "pause", duration: 150 },
          { type: "pointerMove", duration: 500, x, y: Math.floor(height * 0.3) },
          { type: "pointerUp", button: 0 },
        ],
      },
    ]);
    await driver.pause(SWIPE_ANIM);
  }

  /**
   * Swipes to the bottom of the summary list so the expense-breakdown rows
   * (the last section) compose before they are read — the iOS twin of the
   * Android `scrollToBottom`, with swipes standing in for UiScrollable.
   */
  async scrollToBottom(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await this.scrollContentDown();
    }
  }

  /**
   * One swipe downward over the summary content (the reverse of
   * `scrollContentDown`) — private because the Android twin has no upward
   * scroll to mirror, so the public surfaces stay equal.
   */
  private async scrollContentUp(): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    const x = Math.floor(width / 2);
    await driver.performActions([
      {
        type: "pointer",
        id: "finger1",
        parameters: { pointerType: "touch" },
        actions: [
          { type: "pointerMove", duration: 0, x, y: Math.floor(height * 0.3) },
          { type: "pointerDown", button: 0 },
          { type: "pause", duration: 150 },
          { type: "pointerMove", duration: 500, x, y: Math.floor(height * 0.75) },
          { type: "pointerUp", button: 0 },
        ],
      },
    ]);
    await driver.pause(SWIPE_ANIM);
  }

  /**
   * Swipes the month switcher back into the viewport before its arrow is
   * tapped.
   *
   * iOS-only, and the reason is a tap mechanic, not a locator one: the
   * switcher scrolls with the summary content, and an XCUITest click is a
   * screen-coordinate tap, so an arrow scrolled above the fold takes the hit
   * without doing anything — while its label still reads (measured
   * 2026-10-29: TC-SUM-10 straight after TC-SUM-13 left the screen at the
   * bottom; three prev clicks, label unmoved). Android needs no equivalent —
   * UiAutomator2 clicks the node itself, visibility included.
   */
  private async scrollSwitcherIntoView(arrow: string): Promise<void> {
    const { height } = await driver.getWindowSize();
    for (let attempt = 0; attempt < 4; attempt++) {
      const nodes = await iosPageNodes();
      const handle = nodes.find((node) => node.name === arrow);
      if (!handle) return;
      if (handle.y >= 0 && handle.y + handle.height <= height) return;
      await this.scrollContentUp();
    }
  }

  /**
   * Month switching with a verify-retry — the iOS twin of the Android
   * `switchMonth`, kept identical including the R1 guard: the switch is
   * verified against the PARSED target (month, year), so a click that
   * double-registered fails loudly instead of passing on "label changed".
   */
  private async switchMonth(arrow: string, direction: "prev" | "next"): Promise<void> {
    await this.scrollSwitcherIntoView(arrow);
    const before = await this.monthLabel();
    const start = parseMonthLabel(before);
    const target = shiftMonthYear(start, direction);
    for (let attempt = 0; attempt < 3; attempt++) {
      await iosByTag(arrow).click();
      // Recomposition is not instantaneous: a label read immediately after the
      // click returns the old value, and re-clicking on it steps two months.
      await driver.pause(MONTH_LABEL_RECOMPOSE);
      const after = parseMonthLabel(await this.monthLabel());
      if (after.monthIndex === target.monthIndex && after.year === target.year) return;
      if (after.monthIndex !== start.monthIndex || after.year !== start.year) {
        throw new Error(
          `Month switch via ${arrow} landed on "${formatMonthYear(after)}" instead of "${formatMonthYear(target)}"`,
        );
      }
    }
    throw new Error(
      `Month switch via ${arrow} did not reach ${formatMonthYear(target)} from "${before}"`,
    );
  }

  async prevMonth(): Promise<void> {
    await this.switchMonth(tags.ringkasan.monthPrev, "prev");
  }

  async nextMonth(): Promise<void> {
    await this.switchMonth(tags.ringkasan.monthNext, "next");
  }
}

/**
 * Rendered text of an iOS tagged node without requiring digits ("" when the
 * node renders nothing). The candidate order is the one `iosAmountText`
 * documents — the tag usually lands on an accessible=false wrapper whose own
 * getText() is empty, the string sits on `value`/`label`, and Compose can
 * hoist it to a sibling inside the node's frame.
 */
async function iosRenderedText(el: ChainablePromiseElement): Promise<string> {
  const own = ((await el.getText().catch(() => "")) || "").trim();
  if (own) return own;
  for (const attr of ["value", "label"] as const) {
    const value = ((await el.getAttribute(attr).catch(() => "")) || "").trim();
    if (value) return value;
  }
  const children = await iosExtractChildTexts(el);
  const child = children[0];
  if (child) return child;
  const inside = await iosTextsInside(el);
  return inside[0] ?? "";
}

/**
 * Non-empty label attributes of the subtree under the node whose `name`
 * (accessibilityIdentifier) equals `identifier`. The subtree ends where the
 * next tagged ringkasan node begins — same structural assumption as the
 * Android childTextsFromSource.
 */
function iosChildTextsFromSource(xml: string, identifier: string): string[] {
  const marker = `name="${identifier}"`;
  const start = xml.indexOf(marker);
  if (start === -1) return [];
  const rest = xml.slice(start + marker.length);
  const next = rest.search(
    /name="ringkasan_(category_item_|breakdown_|totals_|savings_|balance_|anggaran_|kelola_|comparison|empty_)/,
  );
  const segment = next === -1 ? rest.slice(0, 10_000) : rest.slice(0, next);
  return [...segment.matchAll(/label="([^"]+)"/g)]
    .map((m) => (m[1] ?? "").replace(/&amp;/g, "&").trim())
    .filter((t) => t.length > 0 && t !== identifier);
}
