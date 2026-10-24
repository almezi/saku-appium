import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'

describe('TC-NAV — smoke & navigation', () => {
  before(async () => {
    await byTag(tags.tambah.screen).waitForDisplayed({ timeout: 30_000 })
  })

  it('TC-NAV-01 app launches on the Tambah screen', async () => {
    expect(await byTag(tags.tambah.screen).isDisplayed()).toBe(true)
  })

  it('TC-NAV-02 bottom bar renders all three tabs', async () => {
    expect(await byTag(tags.navBottom).isDisplayed()).toBe(true)
    expect(await byTag(tags.navTambah).isDisplayed()).toBe(true)
    expect(await byTag(tags.navDaftar).isDisplayed()).toBe(true)
    expect(await byTag(tags.navRingkasan).isDisplayed()).toBe(true)
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
})
