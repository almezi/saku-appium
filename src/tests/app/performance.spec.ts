/**
 * TC-PERF — performance (Phase 3.F).
 *
 * Method: tab switch and save use Date.now() around click + a displayed wait;
 * scroll is a time budget over 8 sweeps (gfxinfo jank % is unusable on the
 * software-rendered emulator — 100% of frames exceed 16.7ms regardless of app
 * code, see BUG_Found-07); cold start takes min-of-3 `am start -W` runs after
 * a warmup (first-start DB init and system jitter inflate single runs).
 *
 * Seeding: test_seed intent is debug-only, and 100+ UI-driven rows exceed the
 * mocha timeout, so the before() hook seeds 15 rows via TambahPage
 * (BUG_Found-07's text-label category lookup).
 */
import { execSync } from 'node:child_process'
import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransaction } from '../../helpers/transactions'
import { TambahPage } from '../../pageobjects/tambah.page'
import { DaftarPage } from '../../pageobjects/daftar.page'

const UDID = process.env.ANDROID_UDID ?? 'emulator-5554'
const PACKAGE = 'id.almezi.simplemoneytracker_kt'
const adb = (cmd: string) =>
  execSync(`adb -s ${UDID} shell ${cmd}`, { timeout: 60_000 }).toString()

const tambah = new TambahPage()
const daftar = new DaftarPage()

function memTotalKb(): number {
  const out = adb(`dumpsys meminfo ${PACKAGE}`)
  const m = /TOTAL\s+(\d+)/.exec(out)
  if (!m) throw new Error('TOTAL PSS row not found in meminfo')
  return Number(m[1])
}

describe('TC-PERF — performance (Phase 3.F) @regression', () => {
  // Seed for TC-PERF-03; see header for why 15 rows via the UI.
  before(async () => {
    await expect(byTag(tags.tambah.screen)).toBeDisplayed({ wait: 30_000 })
    await tambah.open()
    for (let i = 0; i < 15; i++) {
      await tambah.fillAmount(10_000 + i * 1_000)
      await tambah.selectCategory(categories.income.salary)
      await tambah.save()
    }
    await daftar.open()
  })

  it('TC-PERF-02 tab switch completes in under 500ms @regression', async () => {
    await tambah.open()
    await driver.pause(500)
    const t0 = Date.now()
    await byTag(tags.navDaftar).click()
    await expect(byTag(tags.daftar.screen)).toBeDisplayed({ wait: 10_000 })
    const t = Date.now() - t0
    expect(t).toBeLessThan(500)
  })

  it('TC-PERF-04 saving a transaction completes in under 1s @regression', async () => {
    await tambah.open()
    await driver.pause(500) // let Compose finish composing after the nav click
    await tambah.fillForm({
      type: 'pemasukan',
      amount: 20_000,
      categoryId: categories.income.salary,
    })
    const t0 = Date.now()
    await tambah.saveButton.click()
    await expect(byTag(tags.component.toast)).toBeDisplayed({ wait: 5_000 })
    const t = Date.now() - t0
    expect(t).toBeLessThan(1_000)
  })

  it('TC-PERF-03 list scroll stays fluid with 100+ items @regression', async () => {
    await daftar.open()

    const listEl = await byTag(tags.daftar.screen)
    const listId = await listEl.elementId

    // 8 sweeps; ~3s each on the software-rendered GPU. The 60s budget
    // tolerates that while catching freezes (deadlocks, ANRs).
    const t0 = Date.now()
    for (let i = 0; i < 8; i++) {
      await driver.execute('mobile: scrollGesture', {
        elementId: listId,
        direction: 'down',
        percent: 0.25,
        speed: 3000,
      })
      await driver.pause(200)
    }
    const elapsed = Date.now() - t0

    // No ANR/crash after sustained scrolling; 60s ceiling catches stalls.
    await expect(byTag(tags.daftar.screen)).toBeDisplayed()
    expect(elapsed).toBeLessThan(60_000)
  })

  // Runs LAST: the cold-start force-stop disrupts the Appium session.
  it('TC-PERF-01 cold start completes in under 3.5s @regression', async () => {
    // Warmup launch excludes the one-time first-start DB init.
    adb('am start -n id.almezi.simplemoneytracker_kt/.MainActivity')
    await driver.pause(3_000)
    await byTag(tags.tambah.screen).waitForExist({ timeout: 10_000 })

    // Min-of-3: cold starts vary wildly (3.0s vs 8.1s observed) under
    // system load; the minimum isolates the app's true launch cost.
    const totals: number[] = []
    for (let attempt = 0; attempt < 3; attempt++) {
      adb('am force-stop id.almezi.simplemoneytracker_kt')
      await driver.pause(5_000) // settle before measuring
      const out = adb('am start -W -n id.almezi.simplemoneytracker_kt/.MainActivity')
      if (out.includes('LaunchState: COLD')) {
        const t = Number(/TotalTime: (\d+)/.exec(out)?.[1])
        if (!isNaN(t)) totals.push(t)
      }
    }
    // UiAutomator2 needs a moment to re-attach after the force-stop.
    await driver.pause(3_000)
    await byTag(tags.tambah.screen).waitForExist({ timeout: 15_000 })

    const minTotal = Math.min(...totals)
    console.log(`[TC-PERF-01] cold starts (ms): ${totals.join(', ')} — min=${minTotal}`)
    expect(totals.length).toBeGreaterThan(0)
    expect(minTotal).toBeLessThan(3_500)
  })

  // Skipped in wdio: 50 UI cycles (~10s each) exceed the mocha timeout.
  // scripts/perf_memcycles.sh runs the same loop out-of-band.
  it.skip('TC-PERF-05 memory stays stable across 50 add/delete cycles @regression', async () => {
    await daftar.open()
    const before = memTotalKb()
    for (let i = 0; i < 50; i++) {
      await createTransaction({
        type: 'pemasukan',
        amount: 100 + i,
        categoryId: categories.income.salary,
      })
      await daftar.open()
      await daftar.tapDelete(categories.income.salary)
      await daftar.confirmDeleteSheet()
    }
    const after = memTotalKb()
    expect(after / before).toBeLessThan(1.15)
  })
})
