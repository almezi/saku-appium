import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransaction, uniqueNote } from '../../helpers/transactions'
import { DaftarPage } from '../../pageobjects/daftar.page'
import { RingkasanPage } from '../../pageobjects/ringkasan.page'
import { KategoriPage } from '../../pageobjects/kategori.page'
import { TambahPage } from '../../pageobjects/tambah.page'
import { formatNegativeRp, formatRp } from '../../helpers/money'

// A: yesterday income. B: today expense (large — today nets negative so the
// day header renders the −Rp form). C: today income, created last, so the
// newest-first order assertion has a within-day ordering to check.
const A_YESTERDAY_INCOME = 254_000
const B_TODAY_EXPENSE = 500_000
const C_TODAY_INCOME = 60_000
// Today's day header nets only today's items; A counts in yesterday's header
// and the month summaries.
const TODAY_NET = C_TODAY_INCOME - B_TODAY_EXPENSE // −440_000

const idDate = (d: Date) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
const ID_WEEKDAYS = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']

describe('TC-LIST — transaction list (Phase 1) @regression', () => {
  const daftar = new DaftarPage()
  const ringkasan = new RingkasanPage()
  const kategori = new KategoriPage()
  const tambah = new TambahPage()
  const today = new Date()
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Dated creations each open the Material date picker (~45–60s per
  // transaction); mocha's timeout is raised globally because WDIO's
  // wrapper ignores this.timeout() inside hooks.
  before(async () => {
    await byTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
  })

  it('seeds three transactions across two days @regression', async () => {
    await createTransaction({
      type: 'pemasukan',
      amount: A_YESTERDAY_INCOME,
      categoryId: categories.income.sales,
      note: uniqueNote('list-a'),
      date: yesterday,
    })
    await createTransaction({
      type: 'pengeluaran',
      amount: B_TODAY_EXPENSE,
      categoryId: categories.expense.dailyGroceries,
      note: uniqueNote('list-b'),
      date: today,
    })
    await createTransaction({
      type: 'pemasukan',
      amount: C_TODAY_INCOME,
      categoryId: categories.income.investment,
      note: uniqueNote('list-c'),
      date: today,
    })
    await daftar.open()
    expect(await daftar.dayHeaderCount()).toBe(2)
  })

  it('TC-LIST-01 empty month shows the empty state @regression', async () => {
    await daftar.open()
    await daftar.prevMonth()
    try {
      const prevLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })
        .format(new Date(today.getFullYear(), today.getMonth() - 1, 1))
        .toUpperCase()
      expect(await daftar.monthLabel()).toBe(prevLabel)
      // The empty state's text lives in child TextViews (the container's own
      // text is empty), and it replaces the whole list including summaries.
      const texts = await daftar.emptyStateTexts()
      expect(texts.join(' ')).toContain('Belum ada transaksi bulan ini')
    } finally {
      // Always return to the seeded month, even when an assertion fails —
      // later tests depend on being back on the current month.
      await daftar.nextMonth()
    }
    expect(await daftar.dayHeaderCount()).toBeGreaterThanOrEqual(1)
  })

  it('TC-LIST-02 day header shows weekday, date and net total @regression', async () => {
    // The today header is the first (newest) one; its net is negative, so
    // this also pins the −Rp rendering of an expense-heavy day.
    const texts = await daftar.firstDayHeaderTexts()
    expect(texts[0]).toBe(ID_WEEKDAYS[today.getDay()])
    expect(texts[1]).toBe(idDate(today))
    expect(texts[2]).toBe(formatNegativeRp(Math.abs(TODAY_NET)))
  })

  it('TC-LIST-04 items sort newest first (days and within a day) @regression', async () => {
    // Runs while the list is still at the top: C (created last) before B
    // under today's header, and the yesterday header comes after today's.
    const amounts = await daftar.rowAmountTextsInOrder()
    expect(amounts[0]).toBe(formatRp(C_TODAY_INCOME))
    expect(amounts[1]).toBe(formatRp(B_TODAY_EXPENSE))
    expect(amounts[2]).toBe(formatRp(A_YESTERDAY_INCOME))
  })

  it('TC-LIST-06 income rows carry no minus; expense-heavy day total does @regression', async () => {
    const amounts = await daftar.rowAmountTextsInOrder()
    const incomeRows = [formatRp(C_TODAY_INCOME), formatRp(A_YESTERDAY_INCOME)]
    for (const row of amounts.filter((a) => incomeRows.includes(a))) {
      expect(row.startsWith('\u2212')).toBe(false)
    }
    expect(await daftar.firstDayHeaderTotal()).toBe(TODAY_NET)
  })

  it('TC-LIST-03 items group under their own day headers @regression', async () => {
    expect(await daftar.dayHeaderCount()).toBe(2)
    // findRowText scrolls the LazyColumn — the yesterday income is only
    // visible under the older header.
    const yesterdayRow = await daftar.findRowText(formatRp(A_YESTERDAY_INCOME))
    expect(await yesterdayRow.isDisplayed()).toBe(true)
  })

  it('TC-LIST-05 rows render category, type label and formatted amount @regression', async () => {
    const incomeRow = await daftar.rowTexts(formatRp(C_TODAY_INCOME))
    expect(incomeRow).toContain('Investasi')
    expect(incomeRow).toContain('Pemasukan')
    expect(incomeRow).toContain(formatRp(C_TODAY_INCOME))

    const expenseRow = await daftar.rowTexts(formatRp(B_TODAY_EXPENSE))
    expect(expenseRow).toContain('Pengeluaran')
    expect(expenseRow).toContain(formatRp(B_TODAY_EXPENSE))
  })

  // Unblocked 2026-10-27: the dialog self-dismiss was caused by typing's
  // keyboard-open recomposition (BUG_Found_04, 8 historical failures) —
  // renameInDialog now writes through keyboard-free instrumentation setText
  // (setValueIntoTaggedField, the flow that always worked live via Appium
  // MCP set_value), so the keyboard never opens and the dialog stays put.
  it('TC-LIST-07 long category name does not overlap the row amount @regression', async () => {
    const LONG_NAME = 'KATEGORI PANJANG SEK' // dialog max is 20 chars
    await ringkasan.open()
    await kategori.openFromRingkasan()
    try {
      await kategori.selectType('pengeluaran')
      await kategori.openEditDialog(categories.expense.dailyOther)
      await kategori.renameInDialog(categories.expense.dailyOther, LONG_NAME)
    } finally {
      // Return to Ringkasan regardless of failures above — a stray dialog
      // would swallow one back press, and later tests need the bottom bar.
      await kategori.systemBack().catch(() => undefined)
      if (!(await ringkasan.isDisplayed().catch(() => false))) {
        await kategori.systemBack().catch(() => undefined)
      }
      await ringkasan.waitForScreen()
    }

    await createTransaction({
      type: 'pengeluaran',
      amount: 10_000,
      categoryId: categories.expense.dailyOther,
      date: today,
    })
    await daftar.open()
    const row = await daftar.findRowText(formatRp(10_000))
    expect(await row.isDisplayed()).toBe(true)

    // Layout contract: the (possibly truncated) category text must stay
    // clear of the amount text — their bounds must not intersect. Element
    // handles (not just texts) are needed for the bounds read, so
    // extractChildTexts cannot replace this raw child enumeration.
    const children = await row.$$('android=new UiSelector().className("android.widget.TextView")')
    let name: WebdriverIO.Element | undefined
    let amount: WebdriverIO.Element | undefined
    for (const child of children) {
      const text = ((await child.getText()) || '').trim()
      if (text.startsWith('KATEGORI')) name = child
      if (text === formatRp(10_000)) amount = child
    }
    // Guard-narrowing instead of casts after toBeDefined(): a missing child
    // is a layout-contract break and fails with its own message.
    if (!name || !amount) {
      throw new Error('Row rendered neither a KATEGORI label nor the amount text')
    }
    const nameBox = await name.getLocation()
    const nameSize = await name.getSize()
    const amountBox = await amount.getLocation()
    expect(nameBox.x + nameSize.width).toBeLessThanOrEqual(amountBox.x + 1)
  })

  it('TC-LIST-09 income summary equals the sum of income rows this month @regression', async () => {
    await daftar.open()
    expect(await daftar.summaryIncome()).toBe(A_YESTERDAY_INCOME + C_TODAY_INCOME)
  })

  // +10_000: TC-LIST-07's renamed-category expense now exists (it runs
  // before this test in file order and is dated today).
  it('TC-LIST-10 expense summary equals the sum of expense rows this month @regression', async () => {
    expect(await daftar.summaryExpense()).toBe(B_TODAY_EXPENSE + 10_000)
  })

  // Unblocked 2026-10-27. The app has no test_seed intent (grep-confirmed in
  // the app source), so the 100 items are still created through the real
  // form — but split across several it() blocks so each stays inside the
  // 180 s mocha budget (a single hook/it cannot hold ~10 min of seeding).
  // Per-item cost is ~5–7 s: the loop stays on the Tambah form (saving never
  // leaves it, and the form keeps the last-used date, verified), and no
  // date-picker is ever opened. The scroll itself uses daftar.swipeList —
  // raw W3C touch swipes, because `mobile: scrollGesture` is a silent no-op
  // on this Compose LazyColumn (verified live, see the 1.E progress note).
  const BULK_COUNT = 100
  const BULK_PER_SEED = 15 // ≈90–120 s per chunk; the last chunk carries the remainder
  for (
    let chunk = 0;
    chunk < Math.ceil(BULK_COUNT / BULK_PER_SEED);
    chunk++
  ) {
    const first = chunk * BULK_PER_SEED + 1
    const last = Math.min((chunk + 1) * BULK_PER_SEED, BULK_COUNT)
    it(`TC-LIST-08 seeds bulk items ${first}–${last} of ${BULK_COUNT} @regression`, async () => {
      await tambah.open()
      for (let i = first; i <= last; i++) {
        if ((i - first) % 5 === 0) console.log(`[TC-LIST-08] creating bulk item ${i}/${BULK_COUNT}`)
        await tambah.selectType('pengeluaran')
        await tambah.fillAmount(1_000)
        await tambah.selectCategory(categories.expense.dailyFood)
        await tambah.save()
      }
      // Spot-check per chunk: the created items are already in the list.
      await daftar.open()
      expect(await daftar.summaryExpense()).toBe(
        B_TODAY_EXPENSE + 10_000 + last * 1_000,
      )
    })
  }

  it('TC-LIST-08 scrolling 100+ items does not crash @regression', async () => {
    await daftar.open()
    // Down to the bottom of the LazyColumn and back: 14 swipes ≈ 100+ rows
    // at ~7–8 rows per screenful. A crash or freeze surfaces as a command
    // timeout here.
    for (let i = 0; i < 14; i++) await daftar.swipeList('up')
    expect(await daftar.dayHeaderCount()).toBeGreaterThanOrEqual(1)
    for (let i = 0; i < 14; i++) await daftar.swipeList('down')
    // Back at the top the list is intact: no creation lost, top rows still
    // render, and the month summary still accounts for every bulk expense.
    const amounts = await daftar.rowAmountTextsInOrder()
    expect(amounts[0]).toBe(formatRp(C_TODAY_INCOME))
    expect(await daftar.summaryExpense()).toBe(
      B_TODAY_EXPENSE + 10_000 + BULK_COUNT * 1_000,
    )
  })
})
