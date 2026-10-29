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
import { SHEET_CLOSE_SETTLE } from "../config/settles";
import { COMPOSITION_WAIT, ELEMENT_PRESENT, ELEMENT_PRESENT_QUICK } from "../config/timeouts";

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
   * Release APK v2.2: the Tambah category sheet rows carry NO resource-ids —
   * `tambah_category_item_<id>` tags are absent from the accessibility tree
   * (BUG_Found-07). The only stable locator signal is the row's Indonesian
   * display-label text, so we scroll the sheet's LazyColumn via UiScrollable
   * and match by text. Long lists scroll inside the sheet.
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

    // UiScrollable finds the row whether it's already visible or below the
    // fold; `text()` is an exact match on the TextView label.
    const item = $(
      `android=new UiScrollable(new UiSelector().scrollable(true))` +
        `.scrollIntoView(new UiSelector().text("${label}"))`,
    );
    await item.waitForDisplayed({ timeout: ELEMENT_PRESENT });
    await item.click();

    // The sheet closes on selection. The label text also renders in the form's
    // category pager afterwards, so a reverse-wait on the text node is
    // unreliable — a short settle pause lets the dismiss animation finish.
    await driver.pause(SHEET_CLOSE_SETTLE);
  }

  async selectAccount(accountId: string): Promise<void> {
    await byTag(tags.tambah.selectAccount).click();
    await byTag(tags.tambah.sheetAccount).waitForDisplayed();
    await byTag(tags.tambah.accountItem(accountId)).click();
    await byTag(tags.tambah.sheetAccount).waitForDisplayed({ reverse: true });
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
