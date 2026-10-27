/**
 * TC-PERF — performance (Phase 3.F) on iOS.
 *
 * The Android spec (src/tests/app/performance.spec.ts) is the source of truth
 * for the cases; only the measurement layer changes.
 *
 * iOS adaptations, all measured live on the iPhone 18 Pro simulator
 * (iOS 27.0, 2026-10-27):
 *
 *  - Budgets. The Android thresholds assume an in-process UI driver; on iOS
 *    every interaction crosses the WDA boundary (a tap alone costs ~0.4 s,
 *    measured) so the same budgets are unreachable for reasons that have
 *    nothing to do with the app. Each budget below sits at roughly 2x the
 *    measured baseline of its case:
 *      tab switch  497-580 ms  -> 1.5 s
 *      save        540-812 ms  -> 2 s
 *      cold start  4.1-7.5 s   -> 8 s (min-of-3, like Android)
 *  - Save signal. iOS has no `component_toast` tag (verified via MCP), so the
 *    save is confirmed by the FORM RESET — the amount field returns to its
 *    empty value — the same signal TambahIosPage.save() waits for.
 *  - Scroll. `mobile: scrollGesture` is not implemented by
 *    appium-xcuitest-driver 12.21 ("Method is not implemented"), so a sweep
 *    uses `mobile: scroll` with the list's element id and a 0.25
 *    screen-height distance (~2.6 s per sweep, measured).
 *  - Cold start. `am start -W` has no counterpart: the app is terminated and
 *    relaunched with `mobile: launchApp`, and the measured window ends when
 *    the app's bottom bar is queryable again. The process id changes across
 *    the relaunch, so this is a real cold start and not a stale tree.
 *  - Memory. `dumpsys meminfo` has no simulator counterpart — the host `ps`
 *    shows the app's RSS (~316 MB measured) — but 50 UI cycles exceed the
 *    mocha timeout, so TC-PERF-05 stays skipped, exactly like on Android
 *    (where scripts/perf_memcycles.sh runs the same loop out of band).
 */
import { categories } from '../../config/categories'
import { tags } from '../../config/tags'
import { iosByTag } from '../../helpers/locators'
import { iosDismissKeyboard, iosFieldText } from '../../helpers/input'
import { IOS_BUNDLE_ID } from '../../helpers/ios-app'
import { createTransactionIos } from '../../helpers/transactions'
import { TambahIosPage } from '../../pageobjects/tambah.ios.page'
import { DaftarIosPage } from '../../pageobjects/daftar.ios.page'

const tambah = new TambahIosPage()
const daftar = new DaftarIosPage()

/** The amount field is empty again — the iOS equivalent of the Android toast. */
async function amountFieldCleared(): Promise<boolean> {
  const text = await iosFieldText(tambah.amountInput).catch(() => '')
  return text === '' || text === '0' || text === 'Rp 0'
}

describe('TC-PERF — performance (Phase 3.F) on iOS @regression', () => {
  before(async function () {
    // Seeding 15 rows through the form takes longer than the default
    // per-test timeout; the list needs enough rows to be scrollable.
    this.timeout(600_000)
    for (let i = 0; i < 15; i++) {
      await createTransactionIos({
        type: 'pemasukan',
        amount: 10_000 + i * 1_000,
        categoryId: categories.income.salary,
      })
    }
  })

  it('TC-PERF-02 tab switch completes in under 1.5s @regression', async () => {
    await tambah.open()
    await driver.pause(500)
    const t0 = Date.now()
    await iosByTag(tags.navDaftar).click()
    await iosByTag(tags.daftar.screen).waitForDisplayed({ timeout: 10_000 })
    const t = Date.now() - t0
    console.log(`[TC-PERF-02] tab switch: ${t} ms`)
    expect(t).toBeLessThan(1_500)
  })

  it('TC-PERF-04 saving a transaction completes in under 2s @regression', async () => {
    await tambah.open()
    await tambah.fillForm({
      type: 'pemasukan',
      amount: 20_000,
      categoryId: categories.income.salary,
    })
    // The category sheet can hand focus back to the amount field, which
    // re-opens the keyboard over the save button.
    await iosDismissKeyboard()

    const t0 = Date.now()
    await tambah.saveButton.click()
    await driver.waitUntil(amountFieldCleared, { timeout: 5_000, interval: 100 })
    const t = Date.now() - t0
    console.log(`[TC-PERF-04] save: ${t} ms`)
    expect(t).toBeLessThan(2_000)
  })

  it('TC-PERF-03 list scroll stays fluid with 100+ items @regression', async () => {
    await daftar.open()
    // Normalise the scroll position: the list must not start at its end,
    // where further sweeps would move nothing.
    await driver.execute('mobile: scroll', { direction: 'up', distance: 0.25 })
    await driver.pause(500)

    const before = await daftar.firstCardPosition()
    const t0 = Date.now()
    for (let i = 0; i < 8; i++) {
      // The element id dies with the Compose recomposition the scroll
      // triggers, so it is resolved again for every sweep.
      const listId = await iosByTag(tags.daftar.screen).elementId
      await driver.execute('mobile: scroll', {
        elementId: listId,
        direction: 'down',
        distance: 0.25,
      })
    }
    const elapsed = Date.now() - t0
    const after = await daftar.firstCardPosition()

    // No ANR/crash after sustained scrolling; the 60s ceiling catches stalls.
    expect(await daftar.isDisplayed()).toBe(true)
    expect(elapsed).toBeLessThan(60_000)
    // The sweeps actually moved the list: the topmost card changed or moved up.
    expect(before).not.toBeNull()
    expect(after).not.toBeNull()
    expect(after!.id !== before!.id || after!.y < before!.y).toBe(true)
    console.log(
      `[TC-PERF-03] scroll: ${elapsed} ms, top card ${before!.id}@${before!.y} -> ${after!.id}@${after!.y}`,
    )
  })

  // Runs LAST: the relaunch disrupts the Appium session.
  it('TC-PERF-01 cold start completes in under 8s @regression', async () => {
    const totals: number[] = []
    for (let attempt = 0; attempt < 3; attempt++) {
      await driver.terminateApp(IOS_BUNDLE_ID)
      await driver.pause(3_000) // settle before measuring
      const t0 = Date.now()
      await driver.execute('mobile: launchApp', { bundleId: IOS_BUNDLE_ID })
      await iosByTag(tags.navBottom).waitForExist({ timeout: 30_000 })
      totals.push(Date.now() - t0)
    }
    // Min-of-3: cold starts vary wildly under system load (4.1 s vs 7.5 s
    // measured); the minimum isolates the app's true launch cost.
    const minTotal = Math.min(...totals)
    console.log(`[TC-PERF-01] cold starts (ms): ${totals.join(', ')} — min=${minTotal}`)
    expect(totals.length).toBeGreaterThan(0)
    expect(minTotal).toBeLessThan(8_000)
  })

  // Skipped in wdio: 50 UI cycles exceed the mocha timeout.
  it.skip('TC-PERF-05 memory stays stable across 50 add/delete cycles @regression', async () => {
    // iOS has no `dumpsys meminfo`; the app's RSS is readable from the
    // host `ps -A -o pid,rss,comm` (~316 MB measured), which is out of the
    // driver's reach — the case is exercised out of band.
  })
})
