/**
 * iOS twin of delete-undo.spec.ts — TC-DEL / TC-UNDO, delete with confirmation
 * sheet and undo toast (Phase 1), all @integration (the Android spec is the
 * source of truth; two describes: the confirmation/undo window, then the
 * deletion effects on list, Ringkasan and breakdown).
 *
 * iOS adaptations, each because the Android locator does not exist here:
 *  - rows are addressed by their `daftar_item_<id>` identifier through
 *    `-ios predicate string:` (`iosAllByTagMatches`), the twin of Android's
 *    `resourceIdMatches`;
 *  - a row is found by its rendered text (`findTransactionRow`) because Compose
 *    hoists the card's strings out of the tagged node (BUG_Found_13).
 *
 * Verified live on iPhone 18 Pro (2026-10-29): the delete confirmation sheet
 * (`daftar_delete_sheet`) exposes a populated accessibility tree on iOS — both
 * `component_sheet_button_confirm` and `component_sheet_button_cancel` resolve —
 * and the post-delete toast carries a reachable `component_toast_action`, so
 * unlike the save toast it is automatable and the undo cases run here.
 */
import { iosByTag, iosAllByTag, iosAllByTagMatches } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { categories } from "../../config/categories";
import { createTransactionIos, tapUndoActionIos, uniqueNote } from "../../helpers/transactions";
import { DaftarIosPage } from "../../pageobjects/daftar.ios.page";
import { RingkasanIosPage } from "../../pageobjects/ringkasan.ios.page";
import { formatRp } from "../../helpers/money";
import { UNDO_TOAST_EXPIRY, UNDO_TOAST_PASSED } from "../../config/settles";
import { APP_COLD_START, ELEMENT_PRESENT } from "../../config/timeouts";

const AMOUNT = 111_000;

/** Transaction cards still in the tree — the iOS twin of `daftar_item_\d+$`. */
async function rowCount(): Promise<number> {
  return (await iosAllByTagMatches("daftar_item_[0-9]+$")).length;
}

describe("TC-DEL / TC-UNDO — delete with confirmation and undo (Phase 1) on iOS @integration", () => {
  const daftar = new DaftarIosPage();

  async function openDeleteSheet(): Promise<void> {
    await daftar.tapDelete(categories.income.gift);
    await expect(iosByTag(tags.daftar.deleteSheet)).toBeDisplayed();
  }

  async function confirmDelete(): Promise<void> {
    await iosByTag(tags.component.sheetConfirm).click();
    await expect(iosByTag(tags.daftar.deleteSheet)).not.toBeDisplayed();
    await expect(iosByTag(tags.component.toast)).toBeDisplayed({ wait: ELEMENT_PRESENT });
  }

  before(async () => {
    await expect(iosByTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START });
    await createTransactionIos({
      type: "pemasukan",
      amount: AMOUNT,
      categoryId: categories.income.gift,
      note: uniqueNote("del"),
    });
  });

  it("TC-DEL-01 tapping Hapus opens the confirmation sheet @integration", async () => {
    await daftar.open();
    await openDeleteSheet();
  });

  it("TC-DEL-03 cancelling the sheet keeps the transaction @integration", async () => {
    await iosByTag(tags.component.sheetCancel).click();
    await expect(iosByTag(tags.daftar.deleteSheet)).not.toBeDisplayed();
    await expect(await daftar.findTransactionRow(formatRp(AMOUNT))).toBeDisplayed();
    expect(await daftar.summaryIncome()).toBe(AMOUNT);
  });

  it("TC-UNDO-01 confirming shows the toast with an undo action @integration", async () => {
    await openDeleteSheet();
    await confirmDelete();
    await expect(iosByTag(tags.component.toast)).toBeDisplayed();
    await expect(iosByTag(tags.component.toastAction)).toBeDisplayed();
  });

  it("TC-UNDO-02 tapping Urungkan before the timeout restores the transaction @integration", async () => {
    await tapUndoActionIos();
    await expect(await daftar.findTransactionRow(formatRp(AMOUNT))).toBeDisplayed();
    expect(await daftar.summaryIncome()).toBe(AMOUNT);
  });

  it("TC-DEL-02 deleting without undo makes the deletion permanent @integration", async () => {
    await openDeleteSheet();
    await confirmDelete();
    // Toast expiry (5s) makes the deletion permanent. Wait past it with a
    // plain pause: the toast node can linger composed after expiry, so a
    // disappearance wait is unreliable (same flake as the Android twin).
    await driver.pause(UNDO_TOAST_EXPIRY);
    // With no transactions left the list swaps to its empty state and the
    // summary cards leave the hierarchy entirely (verified live on iOS).
    await expect(iosByTag(tags.daftar.emptyState)).toBeDisplayed({ wait: ELEMENT_PRESENT });
    expect(await rowCount()).toBe(0);
  });
});

describe("TC-DEL — delete effects on list, Ringkasan and breakdown (Phase 1) on iOS @integration", () => {
  const daftar = new DaftarIosPage();
  const ringkasan = new RingkasanIosPage();

  const SALES_INCOME = 210_000;
  const FOOD_EXPENSE = 75_000;

  async function confirmPermanentDelete(): Promise<void> {
    await expect(iosByTag(tags.daftar.deleteSheet)).toBeDisplayed();
    await iosByTag(tags.component.sheetConfirm).click();
    // Wait past the 5 s undo window with a plain pause: the toast node can
    // linger composed after expiry, so a disappearance wait is unreliable.
    await expect(iosByTag(tags.component.toast)).toBeDisplayed({ wait: ELEMENT_PRESENT });
    await driver.pause(UNDO_TOAST_EXPIRY);
  }

  /** Rows whose delete affordance still carries `categoryId`. */
  async function rowDeleteCount(categoryId: string): Promise<number> {
    return (await iosAllByTagMatches(`daftar_item_.*_delete_${categoryId}`)).length;
  }

  before(async () => {
    // The first describe ends on the Daftar screen — navigate to the form
    // explicitly instead of assuming a fresh launch.
    await iosByTag(tags.navTambah).click();
    await expect(iosByTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START });
    await createTransactionIos({
      type: "pemasukan",
      amount: SALES_INCOME,
      categoryId: categories.income.sales,
      note: uniqueNote("delx-inc"),
    });
    await createTransactionIos({
      type: "pengeluaran",
      amount: FOOD_EXPENSE,
      categoryId: categories.expense.dailyFood,
      note: uniqueNote("delx-exp"),
    });
  });

  it("TC-DEL-05 deleting updates the Ringkasan cards and balance @integration", async () => {
    await ringkasan.open();
    const expenseBefore = await ringkasan.expenseTotal();
    const balanceBefore = await ringkasan.balanceValue();
    await daftar.open();
    await daftar.tapDelete(categories.expense.dailyFood);
    await confirmPermanentDelete();
    await ringkasan.open();
    expect(await ringkasan.expenseTotal()).toBe(expenseBefore - FOOD_EXPENSE);
    expect(await ringkasan.balanceValue()).toBe(balanceBefore + FOOD_EXPENSE);
  });

  it("TC-DEL-06 deleting removes the stale breakdown entry @integration", async () => {
    await ringkasan.open();
    const foodItems = await iosAllByTag(tags.ringkasan.categoryItem(categories.expense.dailyFood));
    expect(foodItems.length).toBe(0);
    // The remaining income category is untouched.
    const texts = await ringkasan.breakdownItemTexts(categories.income.sales);
    expect(texts).toContain(formatRp(SALES_INCOME));
  });

  it("TC-DEL-07 deleting two items back-to-back removes both @integration", async () => {
    await daftar.open();
    await createTransactionIos({
      type: "pemasukan",
      amount: 88_000,
      categoryId: categories.income.bonusThr,
      note: uniqueNote("delx-a"),
    });
    await createTransactionIos({
      type: "pemasukan",
      amount: 33_000,
      categoryId: categories.income.other,
      note: uniqueNote("delx-b"),
    });
    // createTransactionIos leaves the app on the Tambah form.
    await daftar.open();
    await daftar.tapDelete(categories.income.bonusThr);
    await expect(iosByTag(tags.daftar.deleteSheet)).toBeDisplayed();
    await iosByTag(tags.component.sheetConfirm).click();
    // Second delete immediately — the first undo toast is still up (the
    // Android twin confirmed the sheet opens over it).
    await daftar.tapDelete(categories.income.other);
    await expect(iosByTag(tags.daftar.deleteSheet)).toBeDisplayed();
    await iosByTag(tags.component.sheetConfirm).click();
    // Second undo window (5 s) — pause past it; the following assertions
    // prove both deletions stuck.
    await driver.pause(UNDO_TOAST_PASSED);
    expect(await rowDeleteCount(categories.income.bonusThr)).toBe(0);
    expect(await rowDeleteCount(categories.income.other)).toBe(0);
    expect(await daftar.summaryIncome()).toBe(SALES_INCOME);
  });

  it("TC-DEL-04 deleting the last item of the month shows the empty state @integration", async () => {
    await daftar.tapDelete(categories.income.sales);
    await confirmPermanentDelete();
    await expect(iosByTag(tags.daftar.emptyState)).toBeDisplayed({ wait: ELEMENT_PRESENT });
    expect(await rowCount()).toBe(0);
  });
});
