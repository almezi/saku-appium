import { iosByTag } from '../../helpers/locators'
import { tags } from '../../config/tags'

// The iOS target of the multiplatform app (iosApp/ in the app repo). The
// Android suite drives id.almezi.simplemoneytracker_kt; the iOS bundle has
// its own id.
const APP_ID = 'id.almezi.saku'

/**
 * TC-NAV on iOS — same 8 cases as navigation.spec.ts, executed against the
 * Compose Multiplatform build (Saku.app). The tag contract carries over
 * unchanged (testTag -> accessibilityIdentifier, TESTABILITY.md), so every
 * assertion mirrors the Android spec; the only platform adaptation is
 * TC-NAV-06, where iOS has no system BACK button.
 */
describe('TC-NAV — smoke & navigation on iOS @sanity', () => {
  before(async () => {
    // The iOS accessibility tree is populated lazily (TESTABILITY.md) and
    // noReset:false reinstalls the app, so the first launch needs a wider
    // window than the Android spec's 30 s.
    await iosByTag(tags.tambah.screen).waitForDisplayed({ timeout: 45_000 })
  })

  it('TC-NAV-01 app launches on the Tambah screen @sanity', async () => {
    expect(await iosByTag(tags.tambah.screen).isDisplayed()).toBe(true)
  })

  it('TC-NAV-02 Tambah tab shows tambah_screen @sanity', async () => {
    // The bottom bar renders all three tabs and tapping Tambah (re)shows its
    // screen — it is the start tab, so this also covers the re-tap case.
    expect(await iosByTag(tags.navBottom).isDisplayed()).toBe(true)
    expect(await iosByTag(tags.navTambah).isDisplayed()).toBe(true)
    expect(await iosByTag(tags.navDaftar).isDisplayed()).toBe(true)
    expect(await iosByTag(tags.navRingkasan).isDisplayed()).toBe(true)
    await iosByTag(tags.navTambah).click()
    await iosByTag(tags.tambah.screen).waitForDisplayed()
    expect(await iosByTag(tags.tambah.screen).isDisplayed()).toBe(true)
  })

  it('TC-NAV-03 Transaksi tab opens daftar_screen @sanity', async () => {
    await iosByTag(tags.navDaftar).click()
    await iosByTag(tags.daftar.screen).waitForDisplayed()
  })

  it('TC-NAV-04 Ringkasan tab opens ringkasan_screen @sanity', async () => {
    await iosByTag(tags.navRingkasan).click()
    await iosByTag(tags.ringkasan.screen).waitForDisplayed()
  })

  it('TC-NAV-05 round-trip across all tabs without crashing @sanity', async () => {
    await iosByTag(tags.navTambah).click()
    await iosByTag(tags.tambah.screen).waitForDisplayed()
    await iosByTag(tags.navDaftar).click()
    await iosByTag(tags.daftar.screen).waitForDisplayed()
    await iosByTag(tags.navRingkasan).click()
    await iosByTag(tags.ringkasan.screen).waitForDisplayed()
    await iosByTag(tags.navTambah).click()
    await iosByTag(tags.tambah.screen).waitForDisplayed()
  })

  it('TC-NAV-06 system navigation on each tab does not crash @sanity', async () => {
    // iOS has no system BACK button, so the Android spec's driver.back()
    // steps are adapted: the platform way to leave a screen is backgrounding
    // the app and returning. The app must come back alive and functional.
    // Android pops Daftar/Ringkasan back to the start tab on BACK; iOS has
    // no back stack, so either the same screen (state kept) or the start
    // tab (reset) is acceptable — same "verify" precedent as TC-PERS-02.
    await iosByTag(tags.navDaftar).click()
    await iosByTag(tags.daftar.screen).waitForDisplayed()
    await driver.background(2)
    await driver.activateApp(APP_ID)
    const daftarKept = await iosByTag(tags.daftar.screen).isExisting()
    const daftarReset = await iosByTag(tags.tambah.screen).isExisting()
    expect(daftarKept || daftarReset).toBe(true)
    console.log(
      `[TC-NAV-06] after background on Daftar: ${daftarKept ? 'Daftar restored' : 'reset to Tambah'}`,
    )

    await iosByTag(tags.navRingkasan).click()
    await iosByTag(tags.ringkasan.screen).waitForDisplayed()
    await driver.background(2)
    await driver.activateApp(APP_ID)
    const ringkasanKept = await iosByTag(tags.ringkasan.screen).isExisting()
    const ringkasanReset = await iosByTag(tags.tambah.screen).isExisting()
    expect(ringkasanKept || ringkasanReset).toBe(true)
    console.log(
      `[TC-NAV-06] after background on Ringkasan: ${ringkasanKept ? 'Ringkasan restored' : 'reset to Tambah'}`,
    )

    // From the start tab, the round-trip must land back on Tambah cleanly.
    await iosByTag(tags.navTambah).click()
    await iosByTag(tags.tambah.screen).waitForDisplayed()
    await driver.background(2)
    await driver.activateApp(APP_ID)
    await iosByTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
  })

  it('TC-NAV-07 selected tab state persists on re-tap @sanity', async () => {
    // Re-tapping the active tab must keep its screen and not bounce back to
    // the start tab.
    await iosByTag(tags.navDaftar).click()
    await iosByTag(tags.daftar.screen).waitForDisplayed()
    await iosByTag(tags.navDaftar).click()
    await iosByTag(tags.daftar.screen).waitForDisplayed()
    expect(await iosByTag(tags.tambah.screen).isExisting()).toBe(false)

    await iosByTag(tags.navRingkasan).click()
    await iosByTag(tags.ringkasan.screen).waitForDisplayed()
    await iosByTag(tags.navRingkasan).click()
    await iosByTag(tags.ringkasan.screen).waitForDisplayed()
    expect(await iosByTag(tags.tambah.screen).isExisting()).toBe(false)
  })

  it('TC-NAV-08 20 rapid tab switches cause no freeze @sanity', async () => {
    const cycle = [tags.navDaftar, tags.navTambah, tags.navRingkasan]
    for (let i = 0; i < 20; i++) {
      const tab = cycle[i % cycle.length]
      if (tab === undefined) continue
      await iosByTag(tab).click()
    }
    // A frozen app would surface as a command timeout instead of a displayed
    // screen; assert the app still responds and settles.
    await iosByTag(tags.navTambah).click()
    await iosByTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
  })
})
