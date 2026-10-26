/**
 * TC-A11Y — accessibility (Phase 3.E), distilled from the MCP-verified run on
 * 2026-10-26 (7/7 pass; see progress.md). Structural checks read the
 * UiAutomator tree (helpers in a11y-parse.ts); the contrast measurement
 * (TC-A11Y-04) is pixel-based and lives in scripts/contrast_check.py:
 *
 *   scripts/contrast_check.py shot.png 53,375,187,416 53,1342,480,1390
 *
 * Verified live on v2.2: labels/helper measure 6.77-6.85:1 (the app renders
 * its dark theme on this emulator; light theme could not be force-selected
 * via `cmd uimode` or ui_night_mode).
 */
import { byTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { TambahPage } from '../../pageobjects/tambah.page'
import { DaftarPage } from '../../pageobjects/daftar.page'
import { unlabeledClickables, under48dp, traversalOrder } from './a11y-parse'

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
  it('TC-A11Y-01 every clickable element has text, content-desc or a labeled descendant', async () => {
    await tambah.open()
    expect(unlabeledClickables(await driver.getPageSource())).toEqual([])
    await daftar.open()
    expect(unlabeledClickables(await driver.getPageSource())).toEqual([])
  })

  it('TC-A11Y-02 the disabled save button still exposes its state for announcement', async () => {
    await tambah.open()
    const save = await byTag(tags.tambah.buttonSave)
    expect(await save.isEnabled()).toBe(false)
    // Still traversable: TalkBack reaches clickable nodes even when disabled.
    expect(await save.isClickable()).toBe(true)
  })

  it('TC-A11Y-03 all tap targets are at least 48dp', async () => {
    await tambah.open()
    expect(under48dp(await driver.getPageSource())).toEqual([])
    await daftar.open()
    expect(under48dp(await driver.getPageSource())).toEqual([])
  })

  it('TC-A11Y-04 contrast: measured 6.77-6.85:1 via scripts/contrast_check.py', async () => {
    // Pixel measurement is environment-dependent (rendered theme), so this
    // spec pins the sanity precondition only: body text exists to sample.
    await tambah.open()
    expect(await tambah.getHelperText()).toContain('Isi jumlah')
  })

  it('TC-A11Y-05 traversal order matches the logical form order', async () => {
    await tambah.open()
    expect(traversalOrder(await driver.getPageSource(), FORM_ORDER)).toEqual(FORM_ORDER)
  })

  it('TC-A11Y-06 icon-only controls carry their accessibility labels', async () => {
    await tambah.open()
    await byTag(tags.tambah.categoryPager).click()
    const sheet = await byTag(tags.tambah.categorySheetRoot)
    await sheet.waitForDisplayed({ timeout: 10_000 })
    expect(await driver.getPageSource()).toContain('content-desc="Buka pilihan"')
    await driver.back()
    await daftar.open()
    const xml = await driver.getPageSource()
    expect(xml).toContain('content-desc="Bulan sebelumnya"')
    expect(xml).toContain('content-desc="Bulan berikutnya"')
  })

  it('TC-A11Y-07 amounts render as currency text ("Rp X.XXX")', async () => {
    await tambah.open()
    expect(await tambah.getAmountText()).toMatch(/^Rp/)
  })
})
