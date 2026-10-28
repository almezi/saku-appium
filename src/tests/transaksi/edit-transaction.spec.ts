import { byTag, allByTag } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { categories } from "../../config/categories";
import { createTransaction, uniqueNote } from "../../helpers/transactions";
import { DaftarPage } from "../../pageobjects/daftar.page";
import { RingkasanPage } from "../../pageobjects/ringkasan.page";
import { UbahPage } from "../../pageobjects/ubah.page";
import { TambahPage } from "../../pageobjects/tambah.page";
import { formatRp } from "../../helpers/money";
import { APP_COLD_START, ELEMENT_PRESENT, ELEMENT_PRESENT_QUICK } from "../../config/timeouts";

const AMOUNT = 123_000;
const NEW_AMOUNT = 456_000;

describe("TC-EDIT — edit transaction (Phase 1) @regression", () => {
  const daftar = new DaftarPage();
  const ringkasan = new RingkasanPage();
  const ubah = new UbahPage();
  const tambah = new TambahPage();
  const note = uniqueNote("edit");
  const today = new Date();
  // The 15th of the previous month: far enough inside the month that the
  // Material picker needs exactly one prev-month step from today's grid.
  const prevMonthDay = new Date(today.getFullYear(), today.getMonth() - 1, 15);
  const idDate = (d: Date) =>
    new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d);

  before(async () => {
    await expect(byTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START });
    await createTransaction({
      type: "pemasukan",
      amount: AMOUNT,
      categoryId: categories.income.refund,
      note,
    });
  });

  /**
   * The Ubah screen renders its categories inline in the pager (no bottom
   * sheet like Tambah), and both categories used here sit on the first page,
   * so a direct tap on the item tag is enough.
   */
  async function selectCategoryInline(categoryId: string): Promise<void> {
    const item = byTag(tags.tambah.categoryItem(categoryId));
    await expect(item).toBeDisplayed({ wait: ELEMENT_PRESENT_QUICK });
    await item.click();
  }

  // Test order follows a data timeline, not the checklist numbering: the
  // date-move (TC-EDIT-05) runs LAST because row-action taps are only
  // exercised from the current-month view — after the move the row lives in
  // the previous month and the taps stopped registering under WebdriverIO
  // (verified clickable there via MCP; a timing/window quirk, not app logic).

  it("TC-EDIT-01 tapping Ubah opens the form prefilled @regression", async () => {
    await daftar.open();
    await daftar.tapEdit(categories.income.refund);
    await ubah.waitForScreen();
    await expect(ubah.screen).toBeDisplayed();
    expect(await ubah.headerLabel()).toBe("Ubah transaksi");
    expect(await tambah.getAmountText()).toBe(formatRp(AMOUNT));
    expect(await tambah.getNoteText()).toBe(note);
    // UI_SPEC 6.4: "Simpan perubahan" is enabled only when something changed.
    expect(await ubah.isSaveEnabled()).toBe(false);
  });

  it("TC-EDIT-02 changing the amount and saving updates the row and summary @regression", async () => {
    await tambah.fillAmount(NEW_AMOUNT);
    await ubah.save();
    await expect(await daftar.findRowText(formatRp(NEW_AMOUNT))).toBeDisplayed();
    expect(await daftar.summaryIncome()).toBe(NEW_AMOUNT);
    // Rendered-text lookup, deliberately outside the tag contract: the stale
    // amount must be gone from the screen entirely, wherever it might render.
    const staleAmountTexts = await $$(
      `android=new UiSelector().textContains("${formatRp(AMOUNT)}")`,
    );
    expect(staleAmountTexts.length).toBe(0);
  });

  it("TC-EDIT-03 changing the category recalculates the Ringkasan breakdown @regression", async () => {
    await daftar.tapEdit(categories.income.refund);
    await ubah.waitForScreen();
    await selectCategoryInline(categories.income.salary);
    await ubah.save();
    await ringkasan.open();
    const salaryRow = await ringkasan.breakdownItemTexts(categories.income.salary);
    expect(salaryRow).toContain(formatRp(NEW_AMOUNT));
    const refundItems = await allByTag(tags.ringkasan.categoryItem(categories.income.refund));
    expect(refundItems.length).toBe(0);
  });

  it("TC-EDIT-04 switching income to expense swaps the summaries @regression", async () => {
    await daftar.open();
    await daftar.tapEdit(categories.income.salary);
    await ubah.waitForScreen();
    // The edit screen's type toggle uses the shared segmented ids (verified
    // live; Tambah's tambah_toggle_type_* does not exist here).
    await byTag(tags.component.toggleSegmented(1)).click();
    // Switching type clears the income category — pick an expense one.
    await selectCategoryInline(categories.expense.dailyFood);
    await ubah.save();
    expect(await daftar.summaryExpense()).toBe(NEW_AMOUNT);
    expect(await daftar.summaryIncome()).toBe(0);
    expect(await daftar.firstDayHeaderTotal()).toBe(-NEW_AMOUNT);
  });

  it("TC-EDIT-06 editing only the note keeps amount and category @regression", async () => {
    const editedNote = uniqueNote("note");
    await daftar.tapEdit(categories.expense.dailyFood);
    await ubah.waitForScreen();
    await tambah.fillNote(editedNote);
    await ubah.save();
    await daftar.tapEdit(categories.expense.dailyFood);
    await ubah.waitForScreen();
    expect(await tambah.getNoteText()).toBe(editedNote);
    expect(await tambah.getAmountText()).toBe(formatRp(NEW_AMOUNT));
    const mark = byTag(tags.tambah.categoryMark(categories.expense.dailyFood));
    await expect(mark).toBeDisplayed({ wait: ELEMENT_PRESENT_QUICK });
    await ubah.systemBack();
    await expect(byTag(tags.daftar.screen)).toBeDisplayed();
  });

  it("TC-EDIT-07 leaving the edit without saving keeps the data @regression", async () => {
    await daftar.tapEdit(categories.expense.dailyFood);
    await ubah.waitForScreen();
    await tambah.fillAmount(999_999);
    await ubah.systemBack();
    await expect(byTag(tags.daftar.screen)).toBeDisplayed();
    await expect(await daftar.findRowText(formatRp(NEW_AMOUNT))).toBeDisplayed();
    await daftar.tapEdit(categories.expense.dailyFood);
    await ubah.waitForScreen();
    expect(await tambah.getAmountText()).toBe(formatRp(NEW_AMOUNT));
  });

  it("TC-EDIT-08 editing to an invalid amount blocks save @regression", async () => {
    // Still on the reopened edit screen from TC-EDIT-07.
    await tambah.fillAmount(0);
    expect(await ubah.isSaveEnabled()).toBe(false);
    await ubah.systemBack();
    await expect(byTag(tags.daftar.screen)).toBeDisplayed();
  });

  it("TC-EDIT-05 changing the date moves the item to another month @regression", async () => {
    await daftar.tapEdit(categories.expense.dailyFood);
    await ubah.waitForScreen();
    await tambah.selectDate(prevMonthDay);
    await ubah.save();
    // The list keeps showing the current month, which now has no transactions.
    await expect(byTag(tags.daftar.emptyState)).toBeDisplayed({ wait: ELEMENT_PRESENT });
    await daftar.prevMonth();
    await expect(await daftar.findRowText(formatRp(NEW_AMOUNT))).toBeDisplayed();
    const headerTexts = await daftar.firstDayHeaderTexts();
    expect(headerTexts).toContain(idDate(prevMonthDay));
  });
});
