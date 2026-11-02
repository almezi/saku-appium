/**
 * iOS twin of summary.spec.ts — TC-SUM, Ringkasan summary math (Phase 1), all
 * @regression (the Android spec is the source of truth; the TC-SETUP-02 title
 * is an arrange/seed block, not a catalogue case).
 *
 * Three Android mechanics have no iOS counterpart, so they are replaced here:
 *  - `scrollToTag` is UiScrollable, which does not exist on iOS — a Compose
 *    LazyColumn keeps off-screen sections out of the accessibility tree
 *    entirely, so TC-SUM-13 swipes until the tag composes (see scrollToVisible);
 *  - the NaN/Infinity probe reads ONE page-source dump instead of two
 *    `UiSelector().textContains()` queries — same intent, iOS locator mechanics;
 *  - container reads go through the iOS page objects, which recover the strings
 *    a tagged container renders as SIBLINGS (bugs/BUG_Found_13.md).
 *
 * Locators are the accessibility identifiers of TESTABILITY.md. Ran 13/13 on
 * iPhone 18 Pro (2026-10-29) — the run that found the switcher is not sticky,
 * which `RingkasanIosPage.switchMonth` now handles.
 */
import { iosByTag } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { categories } from "../../config/categories";
import { createTransactionIos, uniqueNote } from "../../helpers/transactions";
import { DaftarIosPage } from "../../pageobjects/daftar.ios.page";
import { RingkasanIosPage } from "../../pageobjects/ringkasan.ios.page";
import { formatNegativeRp, formatRp, formatSavingsRate } from "../../helpers/money";
import { APP_COLD_START } from "../../config/timeouts";

const EXPENSE = 50_000;
const SALARY = 200_000;
const SALES = 50_000;
const EXTRA_EXPENSE = 300_000;
const BIG_INCOME = 1_500_000_000;

describe("TC-SUM — Ringkasan summary math (Phase 1) on iOS @regression", () => {
  const daftar = new DaftarIosPage();
  const ringkasan = new RingkasanIosPage();

  before(async () => {
    await expect(iosByTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START });
    // Expense first: the income-0 savings state (TC-SUM-05) is only
    // reachable before any income exists.
    await createTransactionIos({
      type: "pengeluaran",
      amount: EXPENSE,
      categoryId: categories.expense.dailyFood,
      note: uniqueNote("sum-exp"),
    });
  });

  /** Percentage text ("80%") from a breakdown row's rendered texts. */
  function percentOf(texts: string[]): number {
    const pct = texts.find((t) => /^\d+%$/.test(t));
    if (!pct) throw new Error(`No percentage text in breakdown row: ${JSON.stringify(texts)}`);
    return parseInt(pct, 10);
  }

  /**
   * iOS stand-in for Android's UiScrollable `scrollToTag`. Swiping only travels
   * downwards, so the list is rebuilt from the top first — re-tapping the
   * already-selected Ringkasan tab does NOT reset it (TC-NAV-07 asserts that
   * tab state persists across a re-tap), so the round trip goes through Transaksi.
   */
  async function scrollToVisible(tag: string): Promise<void> {
    await daftar.open();
    await ringkasan.open();
    for (let attempt = 0; attempt < 5; attempt++) {
      if (
        await iosByTag(tag)
          .isDisplayed()
          .catch(() => false)
      )
        return;
      await ringkasan.scrollContentDown();
    }
    await expect(iosByTag(tag)).toBeDisplayed();
  }

  it("TC-SUM-05 income 0 renders the savings dash — no divide-by-zero @regression", async () => {
    await ringkasan.open();
    // Verified live: with income 0 the savings value renders "—", never
    // NaN/Infinity, and the income breakdown card is hidden entirely.
    expect(await ringkasan.savingsText()).toBe("—");
    expect(await ringkasan.balanceValue()).toBe(-EXPENSE);
    expect(await iosByTag(tags.ringkasan.breakdownIncome).isExisting()).toBe(false);
  });

  it("TC-SETUP-02 seeds two incomes for the multi-category assertions @regression", async () => {
    await createTransactionIos({
      type: "pemasukan",
      amount: SALARY,
      categoryId: categories.income.salary,
      note: uniqueNote("sum-sal"),
    });
    await createTransactionIos({
      type: "pemasukan",
      amount: SALES,
      categoryId: categories.income.sales,
      note: uniqueNote("sum-sal2"),
    });
  });

  it("TC-SUM-01 balance value equals income minus expense @regression", async () => {
    await ringkasan.open();
    expect(await ringkasan.balanceValue()).toBe(SALARY + SALES - EXPENSE);
  });

  it("TC-SUM-02/03 totals cards match the Transaksi summaries for the same month @regression", async () => {
    const [cardIncome, cardExpense] = await Promise.all([
      ringkasan.incomeTotal(),
      ringkasan.expenseTotal(),
    ]);
    await daftar.open();
    expect(cardIncome).toBe(await daftar.summaryIncome());
    expect(cardExpense).toBe(await daftar.summaryExpense());
  });

  it("TC-SUM-04 savings rate follows (income − expense) / income with one comma decimal @regression", async () => {
    await ringkasan.open();
    const income = SALARY + SALES;
    const expected = ((income - EXPENSE) / income) * 100;
    expect(await ringkasan.savingsText()).toBe(formatSavingsRate(expected));
  });

  it("TC-SUM-07 income breakdown percentages sum to 100 @regression", async () => {
    await ringkasan.open();
    const salaryShare = percentOf(await ringkasan.breakdownItemTexts(categories.income.salary));
    const salesShare = percentOf(await ringkasan.breakdownItemTexts(categories.income.sales));
    expect(salaryShare + salesShare).toBe(100);
  });

  it("TC-SUM-08 expense breakdown percentages sum to 100 @regression", async () => {
    // The expense card is the last section — swipe it into composition first,
    // the iOS twin of the Android scrollToBottom.
    await ringkasan.open();
    await ringkasan.scrollToBottom();
    expect(percentOf(await ringkasan.breakdownItemTexts(categories.expense.dailyFood))).toBe(100);
  });

  it("TC-SUM-09 breakdown bar widths match the category shares @regression", async () => {
    // The rows are back at the top of the list, so rebuild it first — TC-SUM-08
    // left the screen scrolled to the bottom.
    await scrollToVisible(tags.ringkasan.breakdownIncome);
    const salaryRatio = await ringkasan.breakdownBarRatio(categories.income.salary);
    const salesRatio = await ringkasan.breakdownBarRatio(categories.income.sales);
    expect(salaryRatio).toBeCloseTo(SALARY / (SALARY + SALES), 1);
    expect(salesRatio).toBeCloseTo(SALES / (SALARY + SALES), 1);
  });

  it("TC-SUM-06 comparison amounts match the totals cards @regression", async () => {
    await ringkasan.open();
    const texts = await ringkasan.comparisonTexts();
    expect(texts).toContain(formatRp(SALARY + SALES));
    expect(texts).toContain(formatRp(EXPENSE));
  });

  it('TC-SUM-12 negative balance renders U+2212Rp, not "Rp -" @regression', async () => {
    await createTransactionIos({
      type: "pengeluaran",
      amount: EXTRA_EXPENSE,
      categoryId: categories.expense.transportPublic,
      note: uniqueNote("sum-neg"),
    });
    await ringkasan.open();
    const balance = SALARY + SALES - EXPENSE - EXTRA_EXPENSE;
    expect(await ringkasan.balanceValue()).toBe(balance);
    expect(await ringkasan.balanceText()).toBe(formatNegativeRp(balance));
  });

  it("TC-SUM-11 large values format with separators and stay readable @regression", async () => {
    await createTransactionIos({
      type: "pemasukan",
      amount: BIG_INCOME,
      categoryId: categories.income.other,
      note: uniqueNote("sum-big"),
    });
    await ringkasan.open();
    const balance = SALARY + SALES + BIG_INCOME - EXPENSE - EXTRA_EXPENSE;
    expect(await ringkasan.balanceText()).toBe(formatRp(balance));
    await expect(iosByTag(tags.ringkasan.balanceValue)).toBeDisplayed();
  });

  it("TC-SUM-13 scrolling to the bottom renders every section @regression", async () => {
    await scrollToVisible(tags.ringkasan.kelolaButton);
    await expect(iosByTag(tags.ringkasan.kelolaButton)).toBeDisplayed();
    await scrollToVisible(tags.ringkasan.breakdownExpense);
    await expect(iosByTag(tags.ringkasan.breakdownExpense)).toBeDisplayed();
    await scrollToVisible(tags.ringkasan.anggaranButton);
    await expect(iosByTag(tags.ringkasan.anggaranButton)).toBeDisplayed();
  });

  it("TC-SUM-10 empty month shows the empty state with no NaN/Infinity @regression", async () => {
    await ringkasan.open();
    await ringkasan.prevMonth();
    await expect(iosByTag(tags.ringkasan.emptyState)).toBeDisplayed();
    expect((await ringkasan.emptyStateTexts()).join(" ")).toContain(
      "Belum ada data untuk diringkas",
    );
    // Verified live: the whole content area is replaced — no savings row,
    // no breakdown cards, no buttons.
    expect(await iosByTag(tags.ringkasan.savingsRow).isExisting()).toBe(false);
    expect(await iosByTag(tags.ringkasan.breakdownExpense).isExisting()).toBe(false);
    expect(await iosByTag(tags.ringkasan.balanceCard).isExisting()).toBe(false);
    // No broken math anywhere on screen. Rendered-text probes (not the tag
    // contract): NaN/Infinity would surface as visible text, not as a tag. One
    // dump replaces the Android pair of textContains queries.
    const xml = await driver.getPageSource();
    expect(xml).not.toContain("NaN");
    expect(xml).not.toContain("Infinity");
    await ringkasan.nextMonth();
  });
});
