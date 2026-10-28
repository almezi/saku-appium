import { $$ } from "@wdio/globals";
import { iosByTag } from "../helpers/locators";
import {
  iosColumnTexts,
  iosPageNodes,
  iosReadAmount,
  iosStaticTexts,
  iosTextsInRect,
} from "../helpers/elements";
import { tags } from "../config/tags";
import { formatMonthYear, parseMonthLabel, shiftMonthYear } from "../helpers/months";
import { BaseIosPage } from "./base.ios.page";
import { MONTH_LABEL_RECOMPOSE, STALE_RETRY, SWIPE_ANIM } from "../config/settles";
import { ELEMENT_PRESENT, SURFACE_DISMISS } from "../config/timeouts";

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
    super(tags.daftar.screen);
  }

  async open(): Promise<void> {
    await iosByTag(tags.navDaftar).click();
    await this.waitForScreen();
  }

  /**
   * Total income of the rendered month. The empty list replaces the whole
   * header strip with the empty state, so a missing strip means "no income"
   * (measured live 2026-10-27 — the node is absent, not "Rp 0").
   */
  async summaryIncome(): Promise<number> {
    const summary = iosByTag(tags.daftar.summaryMasuk);
    if (!(await summary.isExisting().catch(() => false))) return 0;
    return iosReadAmount(summary);
  }

  async summaryExpense(): Promise<number> {
    return iosReadAmount(iosByTag(tags.daftar.summaryKeluar));
  }

  /**
   * First element whose rendered label contains `snippet` (a formatted
   * amount). Rendered-output lookup by text is the same documented exception
   * as the Android findRowText — rows render no unique tag of their own.
   */
  async findRowText(snippet: string): Promise<ChainablePromiseElement> {
    const matches = $$(`-ios predicate string: label CONTAINS "${snippet}"`);
    if ((await matches.length) === 0) {
      throw new Error(`No element with label containing "${snippet}"`);
    }
    // The length throw above is the real runtime guard — an unawaited
    // chainable index is never undefined; this is only a type bridge.
    const first = matches[0];
    if (first === undefined) throw new Error(`No element with label containing "${snippet}"`);
    return first;
  }

  /**
   * Net total of the first (newest) day header. The header row is tagged
   * `daftar_day_header_<dateMillis>`; iosReadAmount takes the last
   * digit-bearing text among its static-text children, i.e. the total.
   */
  async firstDayHeaderTotal(): Promise<number> {
    const headers = $$(`-ios predicate string: name MATCHES "daftar_day_header_.+"`);
    if ((await headers.length) === 0) {
      throw new Error("No daftar_day_header_* element found in the tree");
    }
    // The length throw above is the real runtime guard — an unawaited
    // chainable index is never undefined; this is only a type bridge.
    const header = headers[0];
    if (header === undefined) throw new Error("No daftar_day_header_* element found in the tree");
    return iosReadAmount(header);
  }

  /**
   * The transaction card whose rendered text contains `snippet`.
   *
   * Scoped to the `daftar_item_<id>` cards: a page-wide label lookup hits
   * the month summary first (it renders the same amount as the row), so the
   * summary would answer every amount lookup.
   *
   * The card's texts are read from the card's frame: Compose hoists them
   * OUT of the tagged node on iOS, so a tree-only child query finds nothing
   * (measured 2026-10-27 — the card renders "Rp 5.000" on the page but the
   * `daftar_item_1` node has no children).
   */
  async findTransactionRow(snippet: string): Promise<ChainablePromiseElement> {
    const cards = await this.cardTexts();
    const match = cards.find((card) => card.texts.some((text) => text.includes(snippet)));
    if (!match) throw new Error(`No transaction row containing "${snippet}"`);
    return $(`-ios predicate string: name == "${match.id}"`);
  }

  /** How many transaction cards render `snippet` in their text. */
  async countTransactionRows(snippet: string): Promise<number> {
    const cards = await this.cardTexts();
    return cards.filter((card) => card.texts.some((text) => text.includes(snippet))).length;
  }

  /**
   * The `daftar_item_<id>` cards with the texts they render.
   *
   * Read from ONE page-source dump: Compose renders the card texts as
   * SIBLINGS of the tagged card (the card node itself is an empty `Other`),
   * so the texts are recovered by geometry — and reading them per card with
   * element calls is quadratic (12 cards took over 180 s that way, measured
   * 2026-10-27).
   */
  private async cardTexts(): Promise<{ id: string; texts: string[] }[]> {
    const nodes = await iosPageNodes();
    const texts = iosStaticTexts(nodes);
    return nodes
      .filter((node) => /^daftar_item_\d+$/.test(node.name))
      .map((card) => ({ id: card.name, texts: iosTextsInRect(card, texts) }));
  }

  /**
   * Edit affordance of the (unique) transaction using `categoryId`. The
   * card's buttons carry `daftar_item_<txId>_edit_<categoryId>` — matched by
   * predicate regex (the ios twin of Android's resourceIdMatches
   * UiScrollable lookup), with a bounded swipe-and-retry for rows below the
   * fold.
   */
  async tapEdit(categoryId: string): Promise<void> {
    const pattern = `-ios predicate string: name MATCHES "daftar_item_.*_edit_${categoryId}"`;
    for (let attempt = 0; attempt < 3; attempt++) {
      // The chainable re-queries the tree on every command access, so a
      // length read after the swipe reflects the post-scroll state.
      const buttons = $$(pattern);
      if ((await buttons.length) > 0) {
        // The length check above is the real runtime guard — an unawaited
        // chainable index is never undefined; this is only a type bridge.
        const button = buttons[0];
        if (button !== undefined) {
          try {
            await button.click();
            return;
          } catch {
            // Stale handle after recomposition — settle and re-query.
            await driver.pause(STALE_RETRY);
          }
        }
      }
      await this.swipeList("up");
    }
    throw new Error(`Edit affordance for category "${categoryId}" could not be clicked`);
  }

  /**
   * Delete affordance of the (unique) transaction using `categoryId`; opens
   * the screen-level confirmation sheet (`daftar_delete_sheet`), the iOS twin
   * of the Android `tapDelete`. Same card-button predicate as `tapEdit`.
   */
  async tapDelete(categoryId: string): Promise<void> {
    const pattern = `-ios predicate string: name MATCHES "daftar_item_.*_delete_${categoryId}"`;
    for (let attempt = 0; attempt < 3; attempt++) {
      const buttons = $$(pattern);
      if ((await buttons.length) > 0) {
        // The length check above is the real runtime guard — an unawaited
        // chainable index is never undefined; this is only a type bridge.
        const button = buttons[0];
        if (button !== undefined) {
          try {
            await button.click();
            return;
          } catch {
            // Stale handle after recomposition — settle and re-query.
            await driver.pause(STALE_RETRY);
          }
        }
      }
      await this.swipeList("up");
    }
    throw new Error(`Delete affordance for category "${categoryId}" could not be clicked`);
  }

  /** Confirms the open delete sheet and waits for it to close. */
  async confirmDeleteSheet(): Promise<void> {
    await iosByTag(tags.daftar.deleteSheet).waitForDisplayed({ timeout: ELEMENT_PRESENT });
    await iosByTag(tags.component.sheetConfirm).click();
    await iosByTag(tags.daftar.deleteSheet).waitForDisplayed({
      timeout: SURFACE_DISMISS,
      reverse: true,
    });
  }

  /**
   * Texts the empty state renders.
   *
   * The tagged node is an empty `Other` — Compose renders the empty-state
   * strings ("Belum ada transaksi bulan ini", the hint, the two buttons) as
   * SIBLINGS, so they are recovered from the node's frame (measured
   * 2026-10-27).
   */
  async emptyStateTexts(): Promise<string[]> {
    const nodes = await iosPageNodes();
    const empty = nodes.find((node) => node.name === tags.daftar.emptyState);
    if (!empty) return [];
    return iosTextsInRect(empty, iosStaticTexts(nodes));
  }

  async monthLabel(): Promise<string> {
    return iosByTag(tags.daftar.monthLabel).getText();
  }

  /**
   * Month switching with a verify-retry (iOS twin of the Android Daftar
   * list): the arrow click can race list recomposition and silently not
   * register. The switch is verified against the PARSED target (month,
   * year), not merely a changed label — R1: a double-registered or
   * wrong-direction click also changes the label and used to pass; it now
   * fails immediately with the landed vs. target month.
   */
  private async switchMonth(arrow: string, direction: "prev" | "next"): Promise<void> {
    const before = await this.monthLabel();
    const start = parseMonthLabel(before);
    const target = shiftMonthYear(start, direction);
    for (let attempt = 0; attempt < 3; attempt++) {
      await iosByTag(arrow).click();
      // Recomposition is not instantaneous: a label read immediately after
      // the click returns the old value, and re-clicking on it steps two
      // months. Settle first, then let a failed read surface instead of
      // masking it as "unchanged".
      await driver.pause(MONTH_LABEL_RECOMPOSE);
      const after = parseMonthLabel(await this.monthLabel());
      if (after.monthIndex === target.monthIndex && after.year === target.year) return;
      // Only retry the still-showing-old-month case (the silent no-op). A
      // label that moved to the WRONG month means a click double-registered —
      // re-clicking would step further away, so fail with the landed month.
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
    await this.switchMonth(tags.daftar.monthPrev, "prev");
  }

  async nextMonth(): Promise<void> {
    await this.switchMonth(tags.daftar.monthNext, "next");
  }

  async dayHeaderCount(): Promise<number> {
    const headers = $$(`-ios predicate string: name MATCHES "daftar_day_header_.+"`);
    return headers.length;
  }

  /**
   * Weekday, date and net total of the first (newest) day header.
   *
   * The header node is an empty `Other` and its three strings are siblings,
   * so they are read from the node's frame — column by column, because the
   * dump order (weekday, total, date) is not the visual one (measured
   * 2026-10-27).
   */
  async firstDayHeaderTexts(): Promise<string[]> {
    const nodes = await iosPageNodes();
    const header = nodes.find((node) => /^daftar_day_header_.+$/.test(node.name));
    if (!header) throw new Error("No daftar_day_header_* element found");
    return iosColumnTexts(header, iosStaticTexts(nodes));
  }

  /**
   * Category, type label and amount of the transaction card rendering
   * `snippet`.
   *
   * Scoped to the cards: a page-wide label lookup answers with the month
   * summary, which renders the same amount as the row.
   */
  async rowTexts(snippet: string): Promise<string[]> {
    const cards = await this.cardTexts();
    const match = cards.find((card) => card.texts.some((text) => text.includes(snippet)));
    if (!match) throw new Error(`No transaction row containing "${snippet}"`);
    return match.texts;
  }

  /**
   * The rendered amount of every transaction card, in list order.
   *
   * Read from ONE page-source dump (iosPageNodes): Compose hoists the card
   * texts out of the tagged node, so the amounts are recovered by geometry,
   * and doing that per card with element reads is quadratic — 12 cards took
   * over 180 s that way (measured 2026-10-27).
   */
  async rowAmountTextsInOrder(): Promise<string[]> {
    const amounts: string[] = [];
    for (const card of await this.cardTexts()) {
      const amount = card.texts.find((text) => /\d/.test(text) && text.startsWith("Rp"));
      if (amount) amounts.push(amount);
    }
    return amounts;
  }

  /**
   * The topmost composed transaction card and its vertical position.
   *
   * Read from ONE page-source dump (iosPageNodes) for the same reason as
   * rowAmountTextsInOrder: per-element location reads would cost one
   * round-trip each. The scroll assertions need the y to prove the list
   * actually moved.
   */
  async firstCardPosition(): Promise<{ id: string; y: number } | null> {
    const nodes = await iosPageNodes();
    const cards = nodes.filter((node) => /^daftar_item_\d+$/.test(node.name));
    if (cards.length === 0) return null;
    const top = cards.reduce((a, b) => (b.y < a.y ? b : a));
    return { id: top.name.replace("daftar_item_", ""), y: top.y };
  }

  async swipeList(direction: "up" | "down"): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    const x = Math.floor(width / 2);
    const yStart = direction === "up" ? Math.floor(height * 0.7) : Math.floor(height * 0.3);
    const yEnd = direction === "up" ? Math.floor(height * 0.3) : Math.floor(height * 0.7);
    await driver.performActions([
      {
        type: "pointer",
        id: "finger1",
        parameters: { pointerType: "touch" },
        actions: [
          { type: "pointerMove", duration: 0, x, y: yStart },
          { type: "pointerDown", button: 0 },
          { type: "pause", duration: 150 },
          { type: "pointerMove", duration: 500, x, y: yEnd },
          { type: "pointerUp", button: 0 },
        ],
      },
    ]);
    await driver.pause(SWIPE_ANIM);
  }
}
