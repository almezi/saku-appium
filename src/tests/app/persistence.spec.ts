/**
 * TC-PERS — persistence (Phase 3.C), distilled from the MCP-verified run on
 * 2026-10-26 (5/5 pass; see progress.md). Verified app behavior:
 *
 * - Kill + relaunch: tab resets to Tambah, month resets to current, all
 *   committed transactions survive (totals unchanged).
 * - A save tapped immediately before force-stop may or may not commit —
 *   either is acceptable; the assertion is "no crash, DB still readable".
 * - Reinstall clears all data (empty state returns).
 *
 * PERS-04's kill race: click save and terminateApp() without waiting for the
 * toast — the process dies within ms of the commit, which is the same race
 * the adb tap+force-stop probe exercised live.
 */
import { execSync } from 'node:child_process'
import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransaction } from '../../helpers/transactions'
import { formatRp } from '../../helpers/money'
import { TambahPage } from '../../pageobjects/tambah.page'
import { DaftarPage } from '../../pageobjects/daftar.page'

const PACKAGE = 'id.almezi.simplemoneytracker_kt'
const APK = 'resources/SimpleMoneyTrackerKT-v2.2.apk'

const tambah = new TambahPage()
const daftar = new DaftarPage()

describe('TC-PERS — persistence (Phase 3.C) @regression', () => {
  const seeded = [150_000, 75_000]
  const seededTotal = seeded.reduce((a, b) => a + b, 0)

  before(async () => {
    await tambah.open()
    for (const [i, amount] of seeded.entries()) {
      await createTransaction({
        type: 'pemasukan',
        amount,
        categoryId: i === 0 ? categories.income.salary : categories.income.freelance,
      })
    }
  })

  it('TC-PERS-01 kill + relaunch keeps every committed transaction', async () => {
    await driver.terminateApp(PACKAGE)
    await driver.activateApp(PACKAGE)
    await daftar.open()
    expect(await daftar.summaryIncome()).toBe(seededTotal)
  })

  it('TC-PERS-02 relaunch resets the selected tab to Tambah', async () => {
    // We are on Daftar right now; kill from here and relaunch.
    await driver.terminateApp(PACKAGE)
    await driver.activateApp(PACKAGE)
    await byTag(tags.tambah.screen).waitForDisplayed({ timeout: 15_000 })
    expect(await tambah.isDisplayed()).toBe(true)
  })

  it('TC-PERS-03 relaunch resets the selected month to current', async () => {
    await daftar.open()
    const current = await daftar.monthLabel()
    await daftar.prevMonth() // verify-retry helper on the page object
    expect(await daftar.monthLabel()).not.toBe(current)
    await driver.terminateApp(PACKAGE)
    await driver.activateApp(PACKAGE)
    await daftar.open()
    expect(await daftar.monthLabel()).toBe(current)
  })

  it('TC-PERS-04 force-stop racing a save leaves the DB readable', async () => {
    await tambah.open()
    await tambah.fillForm({
      type: 'pemasukan',
      amount: 88_888,
      categoryId: categories.income.gift,
    })
    await tambah.saveButton.click()
    await driver.terminateApp(PACKAGE) // no toast wait: kill as the save lands
    await driver.activateApp(PACKAGE)
    // No crash and the list renders with prior data intact; the racing row
    // itself may legitimately be present or absent.
    await daftar.open()
    expect(await daftar.summaryIncome()).toBeGreaterThanOrEqual(seededTotal)
  })

  it('TC-PERS-05 reinstall clears all data', async () => {
    execSync(`adb uninstall ${PACKAGE}`, { stdio: 'inherit' })
    execSync(`adb install ${APK}`, { stdio: 'inherit' })
    await driver.activateApp(PACKAGE)
    await daftar.open()
    await byTag(tags.daftar.emptyState).waitForDisplayed({ timeout: 15_000 })
    expect(await daftar.summaryIncome()).toBe(0)
  })
})
