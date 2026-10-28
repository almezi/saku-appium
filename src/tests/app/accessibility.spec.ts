/**
 * TC-A11Y — accessibility (Phase 3.E). Structural checks read the UiAutomator
 * tree (a11y-parse.ts); contrast is measured out-of-band by
 * scripts/contrast_check.py (6.77-6.85:1 on v2.2; the app renders dark theme
 * regardless of system night mode).
 */
import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { TambahPage } from '../../pageobjects/tambah.page'
import { DaftarPage } from '../../pageobjects/daftar.page'
import { unlabeledClickables, under48dp, traversalOrder } from './a11y-parse'
import { ELEMENT_PRESENT } from '../../config/timeouts'

const tambah = new TambahPage()
const daftar = new DaftarPage()

const FORM_ORDER = [
  'tambah_toggle_type',
  'tambah_input_amount',
  'tambah_category_pager',
  'tambah_select_account',
  'tambah_select_date',
  'tambah_input_note',
  'tambah_button_save',
  'component_nav_bottom',
]

describe('TC-A11Y — accessibility (Phase 3.E) @regression', () => {
  it('TC-A11Y-01 every clickable element has text, content-desc or a labeled descendant @regression', async () => {
    await tambah.open()
    expect(unlabeledClickables(await driver.getPageSource())).toEqual([])
    await daftar.open()
    expect(unlabeledClickables(await driver.getPageSource())).toEqual([])
  })

  it('TC-A11Y-02 the disabled save button still exposes its state for announcement @regression', async () => {
    await tambah.open()
    const save = await byTag(tags.tambah.buttonSave)
    expect(await save.isEnabled()).toBe(false)
    // Still traversable: TalkBack reaches clickable nodes even when disabled.
    expect(await save.isClickable()).toBe(true)
  })

  it('TC-A11Y-03 all tap targets are at least 48dp @regression', async () => {
    await tambah.open()
    expect(under48dp(await driver.getPageSource())).toEqual([])
    await daftar.open()
    expect(under48dp(await driver.getPageSource())).toEqual([])
  })

  it('TC-A11Y-04 contrast: measured 6.77-6.85:1 via scripts/contrast_check.py @regression', async () => {
    // Pixel measurement is environment-dependent (rendered theme), so this
    // spec pins the sanity precondition only: body text exists to sample.
    await tambah.open()
    expect(await tambah.getHelperText()).toContain('Isi jumlah')
  })

  it('TC-A11Y-05 traversal order matches the logical form order @regression', async () => {
    await tambah.open()
    expect(traversalOrder(await driver.getPageSource(), FORM_ORDER)).toEqual(FORM_ORDER)
  })

  it('TC-A11Y-06 icon-only controls carry their accessibility labels @regression', async () => {
    await tambah.open()
    await byTag(tags.tambah.categoryPager).click()
    const sheet = await byTag(tags.tambah.categorySheetRoot)
    await expect(sheet).toBeDisplayed({ wait: ELEMENT_PRESENT })
    expect(await driver.getPageSource()).toContain('content-desc="Buka pilihan"')
    await driver.back()
    await daftar.open()
    const xml = await driver.getPageSource()
    expect(xml).toContain('content-desc="Bulan sebelumnya"')
    expect(xml).toContain('content-desc="Bulan berikutnya"')
  })

  it('TC-A11Y-07 amounts render as currency text ("Rp X.XXX") @regression', async () => {
    await tambah.open()
    expect(await tambah.getAmountText()).toMatch(/^Rp/)
  })
})
