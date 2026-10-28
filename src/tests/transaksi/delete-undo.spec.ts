import { byTag, allByTag, allByTagMatches } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { categories } from "../../config/categories";
import { createTransaction, tapUndoAction, uniqueNote } from "../../helpers/transactions";
import { DaftarPage } from "../../pageobjects/daftar.page";
import { RingkasanPage } from "../../pageobjects/ringkasan.page";
import { formatRp } from "../../helpers/money";
import { UNDO_TOAST_EXPIRY, UNDO_TOAST_PASSED } from "../../config/settles";
import { APP_COLD_START, ELEMENT_PRESENT } from "../../config/timeouts";

const AMOUNT = 111_000;

describe("TC-DEL / TC-UNDO — delete with confirmation and undo (Phase 1) @integration", () => {
  const daftar = new DaftarPage();

  async function openDeleteSheet(): Promise<void> {
    await daftar.tapDelete(categories.income.gift);
    await expect(byTag(tags.daftar.deleteSheet)).toBeDisplayed();
  }

  async function confirmDelete(): Promise<void> {
    await byTag(tags.component.sheetConfirm).click();
    await expect(byTag(tags.daftar.deleteSheet)).not.toBeDisplayed();
    await expect(byTag(tags.component.toast)).toBeDisplayed({ wait: ELEMENT_PRESENT });
  }

  before(async () => {
    await expect(byTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START });
    await createTransaction({
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
    await byTag(tags.component.sheetCancel).click();
    await expect(byTag(tags.daftar.deleteSheet)).not.toBeDisplayed();
    await expect(await daftar.findRowText(formatRp(AMOUNT))).toBeDisplayed();
    expect(await daftar.summaryIncome()).toBe(AMOUNT);
  });

  it("TC-UNDO-01 confirming shows the toast with an undo action @integration", async () => {
    await openDeleteSheet();
    await confirmDelete();
    await expect(byTag(tags.component.toast)).toBeDisplayed();
    await expect(byTag(tags.component.toastAction)).toBeDisplayed();
  });

  it("TC-UNDO-02 tapping Urungkan before the timeout restores the transaction @integration", async () => {
    await tapUndoAction();
    await expect(await daftar.findRowText(formatRp(AMOUNT))).toBeDisplayed();
    expect(await daftar.summaryIncome()).toBe(AMOUNT);
  });

  it("TC-DEL-02 deleting without undo makes the deletion permanent @integration", async () => {
    await openDeleteSheet();
    await confirmDelete();
    // Toast expiry (5s) makes the deletion permanent. Wait past it with a
    // plain pause: the toast node can linger composed after expiry, so a
    // disappearance wait is unreliable (flaked across runs).
    await driver.pause(UNDO_TOAST_EXPIRY);
    // With no transactions left the list swaps to its empty state and the
    // summary cards leave the hierarchy entirely (verified live).
    await expect(byTag(tags.daftar.emptyState)).toBeDisplayed({ wait: ELEMENT_PRESENT });
    const rows = await allByTagMatches("daftar_item_\\d+$");
    expect(rows.length).toBe(0);
  });
});

describe("TC-DEL — delete effects on list, Ringkasan and breakdown (Phase 1) @integration", () => {
  const daftar = new DaftarPage();
  const ringkasan = new RingkasanPage();

  const SALES_INCOME = 210_000;
  const FOOD_EXPENSE = 75_000;

  async function confirmPermanentDelete(): Promise<void> {
    await expect(byTag(tags.daftar.deleteSheet)).toBeDisplayed();
    await byTag(tags.component.sheetConfirm).click();
    // Wait past the 5 s undo window with a plain pause: the toast node can
    // linger composed after expiry, so a disappearance wait is unreliable.
    await expect(byTag(tags.component.toast)).toBeDisplayed({ wait: ELEMENT_PRESENT });
    await driver.pause(UNDO_TOAST_EXPIRY);
  }

  before(async () => {
    // The first describe ends on the Daftar screen — navigate back to the
    // form explicitly instead of assuming a fresh launch.
    await byTag(tags.navTambah).click();
    await expect(byTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START });
    await createTransaction({
      type: "pemasukan",
      amount: SALES_INCOME,
      categoryId: categories.income.sales,
      note: uniqueNote("delx-inc"),
    });
    await createTransaction({
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
    const foodItems = await allByTag(tags.ringkasan.categoryItem(categories.expense.dailyFood));
    expect(foodItems.length).toBe(0);
    // The remaining income category is untouched.
    const texts = await ringkasan.breakdownItemTexts(categories.income.sales);
    expect(texts).toContain(formatRp(SALES_INCOME));
  });

  it("TC-DEL-07 deleting two items back-to-back removes both @integration", async () => {
    await daftar.open();
    await createTransaction({
      type: "pemasukan",
      amount: 88_000,
      categoryId: categories.income.bonusThr,
      note: uniqueNote("delx-a"),
    });
    await createTransaction({
      type: "pemasukan",
      amount: 33_000,
      categoryId: categories.income.other,
      note: uniqueNote("delx-b"),
    });
    // createTransaction leaves the app on the Tambah form.
    await daftar.open();
    await daftar.tapDelete(categories.income.bonusThr);
    await expect(byTag(tags.daftar.deleteSheet)).toBeDisplayed();
    await byTag(tags.component.sheetConfirm).click();
    // Second delete immediately — the first undo toast is still up
    // (verified live: the sheet opens over it).
    await daftar.tapDelete(categories.income.other);
    await expect(byTag(tags.daftar.deleteSheet)).toBeDisplayed();
    await byTag(tags.component.sheetConfirm).click();
    // Second undo window (5 s) — pause past it; the following assertions
    // prove both deletions stuck.
    await driver.pause(UNDO_TOAST_PASSED);
    const bonusRows = await allByTagMatches(`daftar_item_.*_delete_${categories.income.bonusThr}`);
    expect(bonusRows.length).toBe(0);
    const otherRows = await allByTagMatches(`daftar_item_.*_delete_${categories.income.other}`);
    expect(otherRows.length).toBe(0);
    expect(await daftar.summaryIncome()).toBe(SALES_INCOME);
  });

  it("TC-DEL-04 deleting the last item of the month shows the empty state @integration", async () => {
    await daftar.tapDelete(categories.income.sales);
    await confirmPermanentDelete();
    await expect(byTag(tags.daftar.emptyState)).toBeDisplayed({ wait: ELEMENT_PRESENT });
    const rows = await allByTagMatches("daftar_item_\\d+$");
    expect(rows.length).toBe(0);
  });
});
