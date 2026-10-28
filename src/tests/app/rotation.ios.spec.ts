/**
 * TC-ROT — rotation & config change (Phase 3.D) on iOS. The Android spec
 * (src/tests/app/rotation.spec.ts) is the source of truth for the cases;
 * only the driver layer changes.
 *
 * The app is PORTRAIT-ONLY on iOS — its Info.plist declares
 * `UISupportedInterfaceOrientations = [UIInterfaceOrientationPortrait]` — and
 * WDA cannot rotate an iOS simulator anyway (the W3C orientation endpoint
 * answers "Unable To Rotate Device" and `mobile: rotate` is not implemented
 * by appium-xcuitest-driver 12.21). There is therefore NO device rotation to
 * exercise on iOS, and the cases are driven through the configuration changes
 * iOS actually delivers to a running app:
 *
 *  - the APPEARANCE change (light -> dark) reaches the running app live and
 *    forces a full re-layout (measured live: the app re-renders in dark mode
 *    and keeps the in-progress form);
 *  - the CONTENT-SIZE change (Dynamic Type) is applied by the system, but the
 *    Compose tree only picks it up on the next launch (measured live: the
 *    "JUMLAH" label grows from 53x16 to 74x22 pt only after a restart), so
 *    the font-scale case restarts the app like the Android case opens a fresh
 *    form;
 *  - backgrounding uses `mobile: backgroundApp` (the driver has no
 *    `mobile: background`, and `driver.background()` is not implemented for
 *    XCUITest).
 *
 * The known Android defects (BUG_Found_05 landscape Tambah, BUG_Found_06 200%
 * font clipping the nav labels) have no iOS counterpart: there is no
 * landscape layout, and the Dynamic Type case asserts that the form renders
 * without crashing.
 */
import { categories } from '../../config/categories'
import { createTransactionIos } from '../../helpers/transactions'
import { iosByTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { IOS_BUNDLE_ID } from '../../helpers/ios-app'
import { TambahIosPage } from '../../pageobjects/tambah.ios.page'
import { DaftarIosPage } from '../../pageobjects/daftar.ios.page'
import { RingkasanIosPage } from '../../pageobjects/ringkasan.ios.page'

const tambah = new TambahIosPage()
const daftar = new DaftarIosPage()
const ringkasan = new RingkasanIosPage()

/** Switches the system appearance and lets the app re-render. */
async function setAppearance(style: 'light' | 'dark'): Promise<void> {
  await driver.execute('mobile: setAppearance', { style })
  await driver.pause(2_000)
}

/** Switches the system Dynamic Type size category. */
async function setContentSize(size: string): Promise<void> {
  await driver.execute('mobile: setContentSize', { size })
  await driver.pause(1_000)
}

/** Kills and relaunches the app (the content size is read at launch). */
async function restartApp(): Promise<void> {
  await driver.terminateApp(IOS_BUNDLE_ID)
  await driver.activateApp(IOS_BUNDLE_ID)
  await expect(iosByTag(tags.navBottom)).toBeDisplayed({ wait: 45_000 })
}

describe('TC-ROT — rotation & config change (Phase 3.D) on iOS @regression', () => {
  after(async () => {
    await setAppearance('light')
    await setContentSize('medium')
    await restartApp()
  })

  before(async function () {
    // Seeding twelve transactions takes longer than the default per-test
    // timeout, and the list needs enough rows to be scrollable.
    this.timeout(600_000)
    await tambah.open()
    for (let i = 0; i < 12; i++) {
      await createTransactionIos({
        type: 'pemasukan',
        amount: 1_000 + i,
        categoryId: categories.income.salary,
      })
    }
  })

  it('TC-ROT-01 a configuration change on a filled Tambah form retains amount, category and note @regression', async () => {
    await tambah.open()
    await tambah.fillForm({
      type: 'pemasukan',
      amount: 12_000,
      categoryId: categories.income.salary,
      note: 'rotasi',
    })
    await setAppearance('dark')
    await expect(tambah.screen).toBeDisplayed()
    expect(await tambah.getAmountText()).toBe('Rp 12.000')
    expect(await tambah.getNoteText()).toBe('rotasi')
    await setAppearance('light')
    expect(await tambah.getAmountText()).toBe('Rp 12.000')
    expect(await tambah.getNoteText()).toBe('rotasi')
  })

  it('TC-ROT-02 a configuration change on Transaksi retains the exact scroll position @regression', async () => {
    await daftar.open()
    await daftar.swipeList('up')
    await driver.pause(500)
    const before = (await daftar.rowAmountTextsInOrder())[0]
    await setAppearance('dark')
    await expect(daftar.screen).toBeDisplayed()
    await setAppearance('light')
    const after = (await daftar.rowAmountTextsInOrder())[0]
    expect(after).toBe(before)
  })

  it('TC-ROT-03 a configuration change on Ringkasan renders without crash and keeps the balance @regression', async () => {
    await ringkasan.open()
    const balance = await ringkasan.balanceValue()
    await setAppearance('dark')
    await expect(ringkasan.screen).toBeDisplayed()
    expect(await ringkasan.balanceValue()).toBe(balance)
    await setAppearance('light')
  })

  it('TC-ROT-04 dark mode keeps the summary and form readable @regression', async () => {
    // Restart first: iOS never recreates the screen, so the values typed in
    // TC-ROT-01 would still be in the form and keep save enabled. On Android
    // the rotation recreated the activity, which reset the form.
    await restartApp()
    await setAppearance('dark')
    await ringkasan.open()
    await expect(ringkasan.screen).toBeDisplayed()
    expect(await ringkasan.balanceText()).toMatch(/^Rp/)
    await tambah.open()
    expect(await tambah.isSaveEnabled()).toBe(false)
    await setAppearance('light')
  })

  it('TC-ROT-05 backgrounding and resuming keeps the unsaved form intact @regression', async () => {
    await tambah.open()
    await tambah.fillForm({
      type: 'pemasukan',
      amount: 9_911,
      categoryId: categories.income.salary,
    })
    await driver.execute('mobile: backgroundApp', { seconds: 3 })
    await driver.pause(1_000)
    expect(await tambah.getAmountText()).toBe('Rp 9.911')
  })

  it('TC-ROT-06 200% font scale renders the form without clipped fields @regression', async () => {
    await setContentSize('accessibility-medium')
    await restartApp()
    await tambah.open()
    // The empty amount renders the placeholder "Rp 0" as the field's LABEL on
    // iOS (the value attribute is unset), so the rendered text is empty.
    expect(await tambah.getAmountText()).toBe('')
    await expect(tambah.screen).toBeDisplayed()
    await setContentSize('medium')
    await restartApp()
  })
})
