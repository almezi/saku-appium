/**
 * Android page for the Tambah (add transaction) form; iOS twin:
 * tambah.ios.page.ts. Field locators are TESTABILITY.md tags
 * (src/config/tags.ts); the same form components back the Ubah screen, so
 * TransactionFormInput is the shared input contract of both platforms.
 * Category picking is the documented text-lookup exception (BUG_Found-07).
 */
import { byTag } from "../helpers/locators";
import { typeIntoTaggedField, fieldText } from "../helpers/input";
import { tags } from "../config/tags";
import { accounts, type TransactionType } from "../config/categories";
import { categoryLabels } from "../config/category-labels";
import { BasePage } from "./base.page";
import type { ChainablePromiseElement } from "../types";
import { SHEET_CLOSE_SETTLE, SWIPE_ANIM } from "../config/settles";
import {
  COMPOSITION_WAIT,
  ELEMENT_PRESENT,
  ELEMENT_PRESENT_QUICK,
  SURFACE_DISMISS,
} from "../config/timeouts";

export interface TransactionFormInput {
  type?: TransactionType;
  amount: number;
  categoryId: string;
  note?: string;
  accountId?: string;
  /** Explicit transaction date; the form keeps the last-used date across saves. */
  date?: Date;
}

/**
 * Tambah screen. The same form components back the Ubah (edit) screen,
 * which is why field selectors live on tags.tambah for both.
 */
export class TambahPage extends BasePage {
  constructor() {
    super(tags.tambah.screen);
  }

  get amountInput(): ChainablePromiseElement {
    return byTag(tags.tambah.inputAmount);
  }

  get noteInput(): ChainablePromiseElement {
    return byTag(tags.tambah.inputNote);
  }

  get saveButton(): ChainablePromiseElement {
    return byTag(tags.tambah.buttonSave);
  }

  get helperText(): ChainablePromiseElement {
    return byTag(tags.tambah.helper);
  }

  async open(): Promise<void> {
    await byTag(tags.navTambah).click();
    await this.waitForScreen();
  }

  async selectType(type: TransactionType): Promise<void> {
    const toggle = type === "pemasukan" ? tags.tambah.toggleIncome : tags.tambah.toggleExpense;
    await byTag(toggle).click();
  }

  async fillAmount(amount: number): Promise<void> {
    // 'digits': the field live-formats the input as currency ("254000"
    // renders "Rp 254.000"), so exact-equality verification can never hold.
    await typeIntoTaggedField(this.amountInput, String(amount), tags.tambah.inputAmount, "digits");
  }

  async fillNote(note: string): Promise<void> {
    await typeIntoTaggedField(this.noteInput, note, tags.tambah.inputNote);
  }

  /**
   * Opens the category sheet and taps the category; the sheet closes itself
   * on select.
   *
   * The sheet is a LazyColumn: rows below the initial viewport are not
   * composed at all, and UiScrollable cannot scroll it (BUG_Found_16 — its
   * fling DISMISSED the modal). Rows carry per-id tags (verified live on
   * v2.2 and v2.4), so the row is reached by tag with a bounded raw-touch
   * swipe-and-check — the kategori.scrollToRow pattern — never by text:
   * the sheet's own search box holds the same label once typed, so
   * `UiSelector().text(label)` resolved to the search EditText first and the
   * tap re-focused the field, leaving the sheet open (measured live, v2.4).
   * Typing into that box is unreliable too ("Lainnya" landed as "Lainya" on
   * 3/3 attempts), so the search path is gone.
   *
   * On screen transitions (Daftar → Tambah) the `tambah_screen` tag can
   * display before child Compose nodes compose — wait for the pager to exist
   * before clicking to avoid a stale-not-found race.
   */
  async selectCategory(categoryId: string): Promise<void> {
    const label = categoryLabels[categoryId];
    if (!label) {
      throw new Error(`No display-label mapping for category "${categoryId}"`);
    }

    const pager = byTag(tags.tambah.categoryPager);
    await pager.waitForExist({ timeout: COMPOSITION_WAIT });
    await pager.click();

    // Sweep content-up first; the return content-down sweep catches a row
    // stepped over by the ~40%-screen swipe (kategori.scrollToRow order).
    const row = byTag(tags.tambah.categoryItem(categoryId));
    let visible = false;
    for (const direction of ["up", "down"] as const) {
      for (let sweep = 0; sweep < 12 && !visible; sweep++) {
        visible = await this.rowFullyVisible(row);
        if (!visible) await this.swipeSheet(direction);
      }
    }
    await row.waitForDisplayed({ timeout: ELEMENT_PRESENT });
    await row.click();

    // The sheet closes on selection, and the selected label keeps rendering
    // inside the form's pager — so the selection is verified by the sheet
    // root disappearing (the pager keeps the text, the sheet does not).
    await byTag(tags.tambah.categorySheetRoot)
      .waitForExist({ timeout: ELEMENT_PRESENT_QUICK, reverse: true })
      .catch(() => undefined);
    // A short settle pause lets the dismiss animation finish before the
    // caller re-reads the form.
    await driver.pause(SHEET_CLOSE_SETTLE);
  }

  /**
   * Composed but clipped at the viewport edge is not tappable — the row must
   * be fully inside the window before the click (same rule as
   * kategori.addButtonInView).
   */
  private async rowFullyVisible(row: ChainablePromiseElement): Promise<boolean> {
    if (!(await row.isDisplayed().catch(() => false))) return false;
    const top = await row.getLocation().catch(() => null);
    const size = await row.getSize().catch(() => null);
    if (!top || !size) return false;
    const { height } = await driver.getWindowSize();
    return top.y >= 0 && top.y + size.height <= height;
  }

  async selectAccount(accountId: string): Promise<void> {
    await byTag(tags.tambah.selectAccount).click();
    await byTag(tags.tambah.sheetAccount).waitForDisplayed();
    await byTag(tags.tambah.accountItem(accountId)).click();
    await byTag(tags.tambah.sheetAccount).waitForDisplayed({ reverse: true });
  }

  /**
   * Dismisses the account picker sheet without selecting an account. System
   * BACK dismisses a modal bottom sheet on Android; the reverse wait proves
   * the sheet root left the tree before the caller re-reads the form.
   */
  async dismissAccountSheet(): Promise<void> {
    await this.systemBack();
    await byTag(tags.tambah.sheetAccount).waitForDisplayed({
      reverse: true,
      timeout: SURFACE_DISMISS,
    });
  }

  /**
   * Dismisses the category picker sheet without selecting a category. System
   * BACK dismisses a modal bottom sheet on Android; the reverse wait proves
   * the sheet root left the tree before the caller re-reads the form.
   */
  async dismissCategorySheet(): Promise<void> {
    await this.systemBack();
    await byTag(tags.tambah.categorySheetRoot).waitForDisplayed({
      reverse: true,
      timeout: SURFACE_DISMISS,
    });
  }

  /** The category row's avatar (CategoryAvatar, e.g. avatar_inc_salary). */
  avatar(categoryId: string): ChainablePromiseElement {
    return byTag(tags.tambah.categoryAvatar(categoryId));
  }

  /**
   * Picks a date in the Material date picker. Day cells carry no tags —
   * verified live, each renders its full English long date ("Friday,
   * October 23, 2026"; today's cell prefixes "Today, "), so textContains on
   * the long date matches either form. OK confirms via tambah_date_picker_ok.
   */
  async selectDate(date: Date): Promise<void> {
    const label = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
    await byTag(tags.tambah.selectDate).click();
    await byTag(tags.tambah.datePicker).waitForDisplayed({ timeout: ELEMENT_PRESENT });
    const cell = $(`android=new UiSelector().textContains("${label}")`);
    // The wanted month is already open for near-today dates; step back a
    // month at most (covers yesterday on the 1st) via the picker's prev arrow.
    for (let attempt = 0; attempt < 2 && !(await cell.isExisting()); attempt++) {
      const prev = $(`android=new UiSelector().descriptionContains("previous month")`);
      await prev.click();
    }
    await cell.waitForDisplayed({ timeout: ELEMENT_PRESENT_QUICK });
    await cell.click();
    await byTag(tags.tambah.datePickerOk).click();
    await byTag(tags.tambah.datePicker).waitForDisplayed({ reverse: true });
  }

  async fillForm(input: TransactionFormInput): Promise<void> {
    if (input.type) await this.selectType(input.type);
    await this.fillAmount(input.amount);
    await this.selectCategory(input.categoryId);
    if (input.accountId && input.accountId !== accounts.tunai) {
      await this.selectAccount(input.accountId);
    }
    if (input.date) await this.selectDate(input.date);
    if (input.note) await this.fillNote(input.note);
  }

  async isSaveEnabled(): Promise<boolean> {
    return this.saveButton.isEnabled();
  }

  /**
   * One raw-touch swipe of the open category sheet (~40% of the screen). Raw
   * W3C actions, not `mobile: scrollGesture` (a silent no-op on Compose
   * LazyColumns here) and not UiScrollable (its fling dismissed the sheet —
   * BUG_Found_16). Private: the surface the twins share is selectCategory;
   * the fallback mechanism is Android-only.
   */
  private async swipeSheet(direction: "up" | "down"): Promise<void> {
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

  /** Saves and waits for the confirmation toast (the app stays on Tambah). */
  async save(): Promise<void> {
    await this.saveButton.click();
    await byTag(tags.component.toast).waitForDisplayed({ timeout: ELEMENT_PRESENT });
  }

  async getAmountText(): Promise<string> {
    return fieldText(this.amountInput);
  }

  async getNoteText(): Promise<string> {
    return fieldText(this.noteInput);
  }

  /** Rendered account name on the account selector (e.g. "Tunai", "BCA"). */
  async getAccountText(): Promise<string> {
    const label = await byTag(tags.tambah.selectAccount).$(".//android.widget.TextView");
    if (!(await label.isExisting())) return "";
    return (await label.getText()).trim();
  }

  async getHelperText(): Promise<string> {
    return this.helperText.getText();
  }
}
