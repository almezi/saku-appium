import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { APP_COLD_START } from '../../config/timeouts'

const APP_ID = 'id.almezi.simplemoneytracker_kt'

describe('TC-NAV — smoke & navigation @sanity', () => {
  before(async () => {
    await expect(byTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START })
  })

  it('TC-NAV-01 app launches on the Tambah screen @sanity', async () => {
    await expect(byTag(tags.tambah.screen)).toBeDisplayed()
  })

  it('TC-NAV-02 Tambah tab shows tambah_screen @sanity', async () => {
    // The bottom bar renders all three tabs and tapping Tambah (re)shows its
    // screen — it is the start tab, so this also covers the re-tap case.
    await expect(byTag(tags.navBottom)).toBeDisplayed()
    await expect(byTag(tags.navTambah)).toBeDisplayed()
    await expect(byTag(tags.navDaftar)).toBeDisplayed()
    await expect(byTag(tags.navRingkasan)).toBeDisplayed()
    await byTag(tags.navTambah).click()
    await expect(byTag(tags.tambah.screen)).toBeDisplayed()
    await expect(byTag(tags.tambah.screen)).toBeDisplayed()
  })

  it('TC-NAV-03 Transaksi tab opens daftar_screen @sanity', async () => {
    await byTag(tags.navDaftar).click()
    await expect(byTag(tags.daftar.screen)).toBeDisplayed()
  })

  it('TC-NAV-04 Ringkasan tab opens ringkasan_screen @sanity', async () => {
    await byTag(tags.navRingkasan).click()
    await expect(byTag(tags.ringkasan.screen)).toBeDisplayed()
  })

  it('TC-NAV-05 round-trip across all tabs without crashing @sanity', async () => {
    await byTag(tags.navTambah).click()
    await expect(byTag(tags.tambah.screen)).toBeDisplayed()
    await byTag(tags.navDaftar).click()
    await expect(byTag(tags.daftar.screen)).toBeDisplayed()
    await byTag(tags.navRingkasan).click()
    await expect(byTag(tags.ringkasan.screen)).toBeDisplayed()
    await byTag(tags.navTambah).click()
    await expect(byTag(tags.tambah.screen)).toBeDisplayed()
  })

  it('TC-NAV-06 back button on each tab does not crash @sanity', async () => {
    // On Daftar and Ringkasan, BACK pops to the start tab (verified: the app
    // stays foreground and lands on tambah_screen).
    await byTag(tags.navDaftar).click()
    await expect(byTag(tags.daftar.screen)).toBeDisplayed()
    await driver.back()
    await expect(byTag(tags.tambah.screen)).toBeDisplayed()

    await byTag(tags.navRingkasan).click()
    await expect(byTag(tags.ringkasan.screen)).toBeDisplayed()
    await driver.back()
    await expect(byTag(tags.tambah.screen)).toBeDisplayed()

    // On the start tab, BACK backgrounds the app; it must return cleanly.
    await driver.back()
    await driver.activateApp(APP_ID)
    await expect(byTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START })
  })

  it('TC-NAV-07 selected tab state persists on re-tap @sanity', async () => {
    // Compose's selected semantics do not surface through UiAutomator2
    // (verified: `selected` is false on every tab item), so assert
    // behaviorally — re-tapping the active tab keeps its screen and does not
    // bounce back to the start tab.
    await byTag(tags.navDaftar).click()
    await expect(byTag(tags.daftar.screen)).toBeDisplayed()
    await byTag(tags.navDaftar).click()
    await expect(byTag(tags.daftar.screen)).toBeDisplayed()
    expect(await byTag(tags.tambah.screen).isExisting()).toBe(false)

    await byTag(tags.navRingkasan).click()
    await expect(byTag(tags.ringkasan.screen)).toBeDisplayed()
    await byTag(tags.navRingkasan).click()
    await expect(byTag(tags.ringkasan.screen)).toBeDisplayed()
    expect(await byTag(tags.tambah.screen).isExisting()).toBe(false)
  })

  it('TC-NAV-08 20 rapid tab switches cause no ANR @sanity', async () => {
    const cycle = [tags.navDaftar, tags.navTambah, tags.navRingkasan]
    for (let i = 0; i < 20; i++) {
      const tab = cycle[i % cycle.length]
      if (tab === undefined) continue
      await byTag(tab).click()
    }
    // An ANR would surface here as a UiAutomator2 timeout instead of a
    // displayed screen; assert the app still responds and settles.
    await byTag(tags.navTambah).click()
    await expect(byTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START })
  })
})
