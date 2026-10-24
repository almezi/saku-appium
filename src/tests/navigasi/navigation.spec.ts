import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'

const APP_ID = 'id.almezi.simplemoneytracker_kt'

describe('TC-NAV — smoke & navigation', () => {
  before(async () => {
    await byTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
  })

  it('TC-NAV-01 app launches on the Tambah screen', async () => {
    expect(await byTag(tags.tambah.screen).isDisplayed()).toBe(true)
  })

  it('TC-NAV-02 Tambah tab shows tambah_screen', async () => {
    // The bottom bar renders all three tabs and tapping Tambah (re)shows its
    // screen — it is the start tab, so this also covers the re-tap case.
    expect(await byTag(tags.navBottom).isDisplayed()).toBe(true)
    expect(await byTag(tags.navTambah).isDisplayed()).toBe(true)
    expect(await byTag(tags.navDaftar).isDisplayed()).toBe(true)
    expect(await byTag(tags.navRingkasan).isDisplayed()).toBe(true)
    await byTag(tags.navTambah).click()
    await byTag(tags.tambah.screen).waitForDisplayed()
    expect(await byTag(tags.tambah.screen).isDisplayed()).toBe(true)
  })

  it('TC-NAV-03 Transaksi tab opens daftar_screen', async () => {
    await byTag(tags.navDaftar).click()
    await byTag(tags.daftar.screen).waitForDisplayed()
  })

  it('TC-NAV-04 Ringkasan tab opens ringkasan_screen', async () => {
    await byTag(tags.navRingkasan).click()
    await byTag(tags.ringkasan.screen).waitForDisplayed()
  })

  it('TC-NAV-05 round-trip across all tabs without crashing', async () => {
    await byTag(tags.navTambah).click()
    await byTag(tags.tambah.screen).waitForDisplayed()
    await byTag(tags.navDaftar).click()
    await byTag(tags.daftar.screen).waitForDisplayed()
    await byTag(tags.navRingkasan).click()
    await byTag(tags.ringkasan.screen).waitForDisplayed()
    await byTag(tags.navTambah).click()
    await byTag(tags.tambah.screen).waitForDisplayed()
  })

  it('TC-NAV-06 back button on each tab does not crash', async () => {
    // On Daftar and Ringkasan, BACK pops to the start tab (verified: the app
    // stays foreground and lands on tambah_screen).
    await byTag(tags.navDaftar).click()
    await byTag(tags.daftar.screen).waitForDisplayed()
    await driver.back()
    await byTag(tags.tambah.screen).waitForDisplayed()

    await byTag(tags.navRingkasan).click()
    await byTag(tags.ringkasan.screen).waitForDisplayed()
    await driver.back()
    await byTag(tags.tambah.screen).waitForDisplayed()

    // On the start tab, BACK backgrounds the app; it must return cleanly.
    await driver.back()
    await driver.activateApp(APP_ID)
    await byTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
  })

  it('TC-NAV-07 selected tab state persists on re-tap', async () => {
    // Compose's selected semantics do not surface through UiAutomator2
    // (verified: `selected` is false on every tab item), so assert
    // behaviorally — re-tapping the active tab keeps its screen and does not
    // bounce back to the start tab.
    await byTag(tags.navDaftar).click()
    await byTag(tags.daftar.screen).waitForDisplayed()
    await byTag(tags.navDaftar).click()
    await byTag(tags.daftar.screen).waitForDisplayed()
    expect(await byTag(tags.tambah.screen).isExisting()).toBe(false)

    await byTag(tags.navRingkasan).click()
    await byTag(tags.ringkasan.screen).waitForDisplayed()
    await byTag(tags.navRingkasan).click()
    await byTag(tags.ringkasan.screen).waitForDisplayed()
    expect(await byTag(tags.tambah.screen).isExisting()).toBe(false)
  })

  it('TC-NAV-08 20 rapid tab switches cause no ANR', async () => {
    const cycle = [tags.navDaftar, tags.navTambah, tags.navRingkasan]
    for (const tab of Array.from({ length: 20 }, (_, i) => cycle[i % cycle.length])) {
      await byTag(tab).click()
    }
    // An ANR would surface here as a UiAutomator2 timeout instead of a
    // displayed screen; assert the app still responds and settles.
    await byTag(tags.navTambah).click()
    await byTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
  })
})
