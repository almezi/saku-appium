import { iosByTag } from "../helpers/locators";
import { iosFieldText, iosTypeIntoTaggedField } from "../helpers/input";
import { tags } from "../config/tags";
import { BaseIosPage } from "./base.ios.page";
import type { ChainablePromiseElement } from "../types";
import { SHEET_CLOSE_SETTLE_QUICK, STALE_RETRY_QUICK, SWIPE_ANIM } from "../config/settles";
import {
  COMPOSITION_WAIT,
  ELEMENT_PRESENT,
  SCREEN_READY,
  SURFACE_DISMISS,
} from "../config/timeouts";

type Rect = { x: number; y: number; width: number; height: number };

function containsCenter(outer: Rect, inner: Rect): boolean {
  const cx = inner.x + inner.width / 2;
  const cy = inner.y + inner.height / 2;
  return (
    cx >= outer.x && cx <= outer.x + outer.width && cy >= outer.y && cy <= outer.y + outer.height
  );
}

/**
 * Anggaran (budget) on iOS — accessibility-id twin of AnggaranPage, driven by
 * the same tag contract (testTag -> accessibilityIdentifier). Every tag used
 * here was verified live on the iPhone 18 Pro simulator (iOS 27.0) on
 * 2026-10-27; method names mirror the Android page.
 *
 * iOS-specific behaviors baked into this port:
 *  - the screen has no bottom bar, only `component_button_back` (Kembali);
 *  - the title ("Anggaran") and month ("Oktober 2026") render as UNTAGGED
 *    StaticTexts, so they are read from a page-source dump as rendered output
 *    (documented text-read exception, same class as findRowText);
 *  - the total card and budget rows are tagged on an EMPTY Other node: the
 *    card's texts are hoisted to sibling nodes inside `anggaran_list`, so
 *    they are read by geometry (center inside the card's rect) rather than
 *    by tree nesting;
 *  - the progress bar is a drawing-only Compose Box: the tree exposes one
 *    untagged Other node per bar (measured 330 px wide) but never the filled
 *    fraction, so the bar is asserted structurally by width, the numeric
 *    progress by the "Rp X dari Rp Y" rendered text;
 *  - budget rows lazy-compose below the total card; reads retry on a fresh
 *    query and fall back to a content swipe.
 */
export class AnggaranIosPage extends BaseIosPage {
  constructor() {
    super(tags.anggaran.screen);
  }

  get totalCard(): ChainablePromiseElement {
    return iosByTag(tags.anggaran.totalCard);
  }

  get emptyState(): ChainablePromiseElement {
    return iosByTag(tags.anggaran.emptyState);
  }

  get addButton(): ChainablePromiseElement {
    return iosByTag(tags.anggaran.addButton);
  }

  get formScreen(): ChainablePromiseElement {
    return iosByTag(tags.anggaran.formScreen);
  }

  get formCategory(): ChainablePromiseElement {
    return iosByTag(tags.anggaran.formCategory);
  }

  get formLimit(): ChainablePromiseElement {
    return iosByTag(tags.anggaran.formLimit);
  }

  get formSave(): ChainablePromiseElement {
    return iosByTag(tags.anggaran.formSave);
  }

  get formDelete(): ChainablePromiseElement {
    return iosByTag(tags.anggaran.formDelete);
  }

  row(categoryId: string): ChainablePromiseElement {
    return iosByTag(tags.anggaran.row(categoryId));
  }

  async openFromRingkasan(): Promise<void> {
    await iosByTag(tags.ringkasan.anggaranButton).click();
    await this.waitForScreen();
  }

  /** Opens the shared budget form ("Anggaran baru" / "Ubah anggaran"). */
  async openForm(): Promise<void> {
    await this.addButton.click();
    await this.formScreen.waitForDisplayed({ timeout: SCREEN_READY });
  }

  async isFormDisplayed(): Promise<boolean> {
    return this.formScreen.isDisplayed();
  }

  async isFormSaveEnabled(): Promise<boolean> {
    return this.formSave.isEnabled();
  }

  /**
   * Picks the budgeted category in the form's picker sheet. The sheet root is
   * the close signal (the form field shows the same display name once the
   * selection lands, so waiting on the option text can never succeed — same
   * rationale as the Android page).
   */
  async selectFormCategory(categoryId: string): Promise<void> {
    await this.formCategory.click();
    const sheet = iosByTag(tags.anggaran.formCategorySheet);
    await sheet.waitForExist({ timeout: COMPOSITION_WAIT });
    await iosByTag(tags.anggaran.formCategoryOption(categoryId)).click();
    await this.waitForSheetClosed(tags.anggaran.formCategorySheet);
  }

  /** Fills "Batas bulanan" on the open budget form. */
  async fillLimit(amount: number): Promise<void> {
    await iosTypeIntoTaggedField(this.formLimit, String(amount), tags.anggaran.formLimit, "digits");
  }

  /** Rendered limit text of the open form ("Rp 500.000"). */
  async getLimitText(): Promise<string> {
    return iosFieldText(this.formLimit);
  }

  /** "Simpan anggaran"; waits for the form to close back onto Anggaran. */
  async saveForm(): Promise<void> {
    await this.formSave.click();
    await this.formScreen.waitForExist({ timeout: SCREEN_READY, reverse: true });
    await this.waitForScreen();
  }

  /** "Ubah" on the budget row for `categoryId`. */
  async tapRowEdit(categoryId: string): Promise<void> {
    await iosByTag(tags.anggaran.rowEdit(categoryId)).click();
    await this.formScreen.waitForDisplayed({ timeout: SCREEN_READY });
  }

  /** Row "Hapus": opens the screen-level confirmation sheet. */
  async tapRowDelete(categoryId: string): Promise<void> {
    await iosByTag(tags.anggaran.rowDelete(categoryId)).click();
    await iosByTag(tags.anggaran.screenDeleteSheet).waitForExist({ timeout: COMPOSITION_WAIT });
  }

  async isDeleteSheetDisplayed(): Promise<boolean> {
    return iosByTag(tags.anggaran.screenDeleteSheet).isDisplayed();
  }

  async cancelDeleteSheet(): Promise<void> {
    await iosByTag(tags.component.sheetCancel).click();
    await this.waitForSheetClosed(tags.anggaran.screenDeleteSheet);
  }

  /** Edit form → "Hapus anggaran" → confirm; ends back on Anggaran. */
  async deleteFromForm(): Promise<void> {
    await this.formDelete.click();
    const sheet = iosByTag(tags.anggaran.deleteSheet);
    await sheet.waitForExist({ timeout: COMPOSITION_WAIT });
    await iosByTag(tags.component.sheetConfirm).click();
    await this.waitForSheetClosed(tags.anggaran.deleteSheet);
    await this.formScreen.waitForExist({ timeout: SCREEN_READY, reverse: true });
    await this.waitForScreen();
  }

  /**
   * Rendered text of a budget row (name, status, "Rp X dari Rp Y",
   * "Sisa/Lebih Rp Z", action labels).
   *
   * The row's testTag lands on an EMPTY Other node on iOS: Compose
   * Multiplatform hoists the card's texts OUT of the tagged container and
   * renders them as subsequent siblings inside `anggaran_list` (verified in
   * a page-source dump, 2026-10-27 — the tagged node has no descendants at
   * all). The texts are therefore read by geometry: every static text whose
   * center falls inside the row's measured rect, ordered top-to-bottom.
   * A content swipe covers a row composed below the fold.
   */
  async rowText(categoryId: string): Promise<string> {
    const row = this.row(categoryId);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await row.waitForExist({ timeout: ELEMENT_PRESENT });
        const texts = await this.textsInside(await this.rectOf(row));
        if (texts.length > 0) return texts.join(" ");
      } catch {
        // Stale handle mid-recompose — settle and re-query below.
      }
      await this.scrollContentUp();
    }
    throw new Error(`Budget row "${categoryId}" rendered no text on iOS`);
  }

  /** Texts of the total card: label, spent amount, "Rp X dari Rp Y". */
  async totalCardTexts(): Promise<string[]> {
    await this.totalCard.waitForExist({ timeout: ELEMENT_PRESENT });
    return this.textsInside(await this.rectOf(this.totalCard));
  }

  /**
   * Width of the row's progress bar (the widest Other node inside the row's
   * rect). The bar's FILL fraction is not exposed to accessibility on iOS —
   * only the track node exists — so callers assert existence/proportion via
   * this width and the rendered "Rp X dari Rp Y" text.
   */
  async rowBarWidth(categoryId: string): Promise<number> {
    return this.barWidth(tags.anggaran.row(categoryId));
  }

  /** Same measurement for the total card's progress bar. */
  async totalCardBarWidth(): Promise<number> {
    return this.barWidth(tags.anggaran.totalCard);
  }

  /**
   * Rendered month label of the screen header ("Oktober 2026"). Untagged on
   * iOS — read from the page-source dump, matching only the title-case
   * "Month YYYY" shape so date labels ("27 Okt 2026") never match.
   */
  async monthLabel(): Promise<string> {
    const xml = await driver.getPageSource();
    const label = xml.match(/value="([A-Z][a-z]+ \d{4})"/)?.[1];
    if (!label) throw new Error("Month label not found on the Anggaran screen");
    return label;
  }

  /** Joined rendered values of the whole screen (rendered-output assertion). */
  async screenText(): Promise<string> {
    const xml = await driver.getPageSource();
    return [...xml.matchAll(/value="([^"]+)"/g)]
      .map((m) => (m[1] ?? "").replace(/&amp;/g, "&").replace(/&quot;/g, '"'))
      .join(" | ");
  }

  private async barWidth(tag: string): Promise<number> {
    const host = iosByTag(tag);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await host.waitForExist({ timeout: ELEMENT_PRESENT });
        const rect = await this.rectOf(host);
        const nodes = await $$('-ios predicate string: type == "XCUIElementTypeOther"');
        let widest = 0;
        for (const node of nodes) {
          const inner = await this.rectOf(node).catch(() => null);
          // The bar track is narrower than the card it sits in; this also
          // skips the card's own node and the decorative nodes beside the list.
          if (!inner || inner.width >= rect.width || !containsCenter(rect, inner)) continue;
          if (inner.width > widest) widest = inner.width;
        }
        if (widest > 0) return widest;
      } catch {
        // Stale handle — retry on a fresh query.
      }
      await driver.pause(STALE_RETRY_QUICK);
    }
    throw new Error(`No measurable progress-bar node under "${tag}"`);
  }

  /** Static texts whose centers fall inside `rect`, top-to-bottom then left-to-right. */
  private async textsInside(rect: Rect): Promise<string[]> {
    const nodes = await $$('-ios predicate string: type == "XCUIElementTypeStaticText"');
    const found: { y: number; x: number; text: string }[] = [];
    for (const node of nodes) {
      const inner = await this.rectOf(node).catch(() => null);
      if (!inner || !containsCenter(rect, inner)) continue;
      const text = ((await node.getText()) || "").trim();
      if (text) found.push({ y: inner.y, x: inner.x, text });
    }
    return found.sort((a, b) => a.y - b.y || a.x - b.x).map((entry) => entry.text);
  }

  private async rectOf(
    el: Pick<ChainablePromiseElement, "getLocation" | "getSize">,
  ): Promise<Rect> {
    const { x, y } = await el.getLocation();
    const { width, height } = await el.getSize();
    return { x, y, width, height };
  }

  /** A settle pause lets the dismiss animation start before the reverse wait. */
  private async waitForSheetClosed(rootTag: string): Promise<void> {
    await driver.pause(SHEET_CLOSE_SETTLE_QUICK);
    await iosByTag(rootTag).waitForExist({ timeout: SURFACE_DISMISS, reverse: true });
  }

  private async scrollContentUp(): Promise<void> {
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
          { type: "pointerMove", duration: 500, x, y: Math.floor(height * 0.45) },
          { type: "pointerUp", button: 0 },
        ],
      },
    ]);
    await driver.pause(SWIPE_ANIM);
  }
}
