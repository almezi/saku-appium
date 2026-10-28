/**
 * TC-PERS — persistence (Phase 3.C) on iOS. The Android spec
 * (src/tests/app/persistence.spec.ts) is the source of truth for the cases;
 * only the driver layer changes.
 *
 * Platform adaptations, all measured live via Appium MCP (iPhone 18 Pro /
 * iOS 27, 2026-10-27):
 *  - "kill" is `mobile: terminateApp` + `mobile: activateApp` on the bundle
 *    id "id.almezi.saku" (the Android twin of force-stop);
 *  - the relaunch resets the selected tab to Tambah and the month back to
 *    the current one, exactly like Android;
 *  - "reinstall" is `xcrun simctl uninstall/install` on the booted simulator
 *    — the iOS twin of `adb uninstall` + `adb install`;
 *  - the empty list renders NO summary strip on iOS (the header is replaced
 *    by the empty state), so a cleared database reads as 0 rather than
 *    "Rp 0".
 */
import { execSync } from 'node:child_process'
import { iosByTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransactionIos } from '../../helpers/transactions'
import { IOS_APP_PATH, IOS_BUNDLE_ID } from '../../helpers/ios-app'
import { iosDismissKeyboard, iosKeyboardShown } from '../../helpers/input'
import { TambahIosPage } from '../../pageobjects/tambah.ios.page'
import { DaftarIosPage } from '../../pageobjects/daftar.ios.page'

// Fallback ONLY, for host commands that somehow run before the session exists.
// The helper prefers the live session's udid so parallel runs address their
// own simulator instead of one value shared by every worker.
const FALLBACK_UDID = process.env.IOS_UDID ?? '80FCD259-BA75-4018-8FE6-31F4E812AD9B'
// xcode-select on this machine points at CommandLineTools, which ships no iOS
// SDK, so the simctl calls pin DEVELOPER_DIR themselves.
const XCODE_DEVELOPER_DIR = '/Applications/Xcode.app/Contents/Developer'

const tambah = new TambahIosPage()
const daftar = new DaftarIosPage()

/**
 * The udid of the simulator THIS worker's session actually drives, read from
 * the live session's capabilities (never from the environment) so parallel
 * runs address their own device.
 */
async function deviceUdid(): Promise<string> {
  const caps = (await driver.capabilities) as Record<string, unknown>
  return (caps['appium:udid'] as string | undefined) ?? FALLBACK_UDID
}

/** `xcrun simctl` with DEVELOPER_DIR pinned. */
function simctl(args: string): string {
  return execSync(`xcrun simctl ${args}`, {
    encoding: 'utf8',
    env: { ...process.env, DEVELOPER_DIR: process.env.DEVELOPER_DIR ?? XCODE_DEVELOPER_DIR },
  })
}

/**
 * Kills the app and launches it again, then waits for the navigation shell.
 * The iOS accessibility tree is populated lazily, so the first lookup after a
 * cold start can miss for several seconds.
 */
async function relaunch(): Promise<void> {
  await driver.terminateApp(IOS_BUNDLE_ID)
  await driver.activateApp(IOS_BUNDLE_ID)
  await expect(iosByTag(tags.navBottom)).toBeDisplayed({ wait: 45_000 })
}

/** Dismisses the keyboard and waits until it is really gone. */
async function dismissKeyboard(): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await iosDismissKeyboard()
    if (!(await iosKeyboardShown().catch(() => false))) return
    await driver.pause(400)
  }
}

describe('TC-PERS — persistence (Phase 3.C) on iOS @regression', () => {
  const seeded = [150_000, 75_000]
  const seededTotal = seeded.reduce((a, b) => a + b, 0)

  before(async () => {
    await tambah.open()
    for (const [i, amount] of seeded.entries()) {
      await createTransactionIos({
        type: 'pemasukan',
        amount,
        categoryId: i === 0 ? categories.income.salary : categories.income.freelance,
      })
    }
  })

  it('TC-PERS-01 kill + relaunch keeps every committed transaction @regression', async () => {
    await relaunch()
    await daftar.open()
    expect(await daftar.summaryIncome()).toBe(seededTotal)
  })

  it('TC-PERS-02 relaunch resets the selected tab to Tambah @regression', async () => {
    // We are on Daftar right now; kill from here and relaunch.
    await daftar.open()
    await relaunch()
    await expect(tambah.screen).toBeDisplayed()
    await expect(daftar.screen).not.toBeDisplayed()
  })

  it('TC-PERS-03 relaunch resets the selected month to current @regression', async () => {
    await daftar.open()
    const current = await daftar.monthLabel()
    await daftar.prevMonth()
    expect(await daftar.monthLabel()).not.toBe(current)
    await relaunch()
    await daftar.open()
    expect(await daftar.monthLabel()).toBe(current)
  })

  it('TC-PERS-04 force-stop racing a save leaves the DB readable @regression', async () => {
    await tambah.open()
    await tambah.fillForm({
      type: 'pemasukan',
      amount: 88_888,
      categoryId: categories.income.gift,
    })
    // The save button sits under the keyboard on iOS, so it is dismissed
    // before the tap — otherwise the tap lands on a keypad digit.
    await dismissKeyboard()
    await tambah.saveButton.click()
    await driver.terminateApp(IOS_BUNDLE_ID) // no wait: kill as the save lands
    await driver.activateApp(IOS_BUNDLE_ID)
    // No crash and the list renders with prior data intact; the racing row
    // itself may legitimately be present or absent.
    await expect(iosByTag(tags.navBottom)).toBeDisplayed({ wait: 45_000 })
    await daftar.open()
    expect(await daftar.summaryIncome()).toBeGreaterThanOrEqual(seededTotal)
  })

  it('TC-PERS-05 reinstall clears all data @regression', async () => {
    const udid = await deviceUdid()
    simctl(`terminate ${udid} ${IOS_BUNDLE_ID}`)
    simctl(`uninstall ${udid} ${IOS_BUNDLE_ID}`)
    simctl(`install ${udid} ${IOS_APP_PATH}`)
    await driver.activateApp(IOS_BUNDLE_ID)
    await expect(iosByTag(tags.navBottom)).toBeDisplayed({ wait: 45_000 })
    await daftar.open()
    await expect(iosByTag(tags.daftar.emptyState)).toBeDisplayed({ wait: 15_000 })
    expect(await daftar.summaryIncome()).toBe(0)
  })
})
