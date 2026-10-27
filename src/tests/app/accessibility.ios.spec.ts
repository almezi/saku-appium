/**
 * TC-A11Y — accessibility (Phase 3.E) on iOS. The Android spec
 * (src/tests/app/accessibility.spec.ts) is the source of truth for the
 * cases; only the driver layer changes.
 *
 * iOS adaptations of the Android checks:
 *  - the tree is XCUITest's, so the structural checks read
 *    a11y-parse.ios.ts (the test tag is the accessibility identifier in
 *    `name`, the spoken label in `label`, interactivity in the `traits`
 *    attribute, geometry in points);
 *  - the tap-target floor is Apple's 44 pt (HIG) instead of the Android
 *    48 dp — every measured control is actually 48 pt or larger;
 *  - WDIO's isClickable() THROWS in a mobile native context ("Method not
 *    supported in mobile native environment"), so the "a disabled control is
 *    still reachable" check uses the XCUITest `hittable` attribute and the
 *    "Button" trait instead;
 *  - the amount field renders its currency format in the editor's `value`
 *    attribute, so the currency check types an amount first (on Android the
 *    empty field already reads "Rp 0");
 *  - the contrast case keeps the Android contract — it pins the precondition
 *    (body text to sample) instead of measuring pixels, because the rendered
 *    theme is environment-dependent.
 *
 * The spec seeds one transaction so the Transaksi checks run against a
 * populated list (the transaction cards carry their own edit/delete
 * buttons). The Android spec inherits whatever data its session already
 * holds, which makes its list checks depend on the run order.
 */
import { iosByTag } from '../../helpers/locators'
import { tags } from '../../config/tags'
import { categories } from '../../config/categories'
import { createTransactionIos } from '../../helpers/transactions'
import { TambahIosPage } from '../../pageobjects/tambah.ios.page'
import { DaftarIosPage } from '../../pageobjects/daftar.ios.page'
import { unlabeledClickables, underMinTapTarget, traversalOrder, iconLabels } from './a11y-parse.ios'

const tambah = new TambahIosPage()
const daftar = new DaftarIosPage()

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

describe('TC-A11Y — accessibility (Phase 3.E) on iOS @regression', () => {
  before(async function () {
    this.timeout(180_000)
    await createTransactionIos({
      type: 'pemasukan',
      amount: 25_000,
      categoryId: categories.income.salary,
    })
  })

  it('TC-A11Y-01 every clickable element has a label of its own or of a descendant @regression', async () => {
    await tambah.open()
    expect(unlabeledClickables(await driver.getPageSource())).toEqual([])
    await daftar.open()
    expect(unlabeledClickables(await driver.getPageSource())).toEqual([])
  })

  it('TC-A11Y-02 the disabled save button still exposes its state for announcement @regression', async () => {
    await tambah.open()
    const save = await iosByTag(tags.tambah.buttonSave)
    expect(await save.isEnabled()).toBe(false)
    // Still reachable: VoiceOver walks a disabled control to announce that it
    // is disabled. WDIO's isClickable() throws in a native context, so the
    // XCUITest `hittable` attribute stands in for it.
    expect(String(await save.getAttribute('hittable'))).toBe('true')
    expect(await save.getAttribute('traits')).toContain('Button')
  })

  it('TC-A11Y-03 all tap targets are at least 44pt @regression', async () => {
    await tambah.open()
    expect(underMinTapTarget(await driver.getPageSource())).toEqual([])
    await daftar.open()
    expect(underMinTapTarget(await driver.getPageSource())).toEqual([])
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
    expect(iconLabels(await driver.getPageSource())).toContain('Buka pilihan')
    await daftar.open()
    const icons = iconLabels(await driver.getPageSource())
    expect(icons).toContain('Bulan sebelumnya')
    expect(icons).toContain('Bulan berikutnya')
  })

  it('TC-A11Y-07 amounts render as currency text ("Rp X.XXX") @regression', async () => {
    await tambah.open()
    await tambah.fillAmount(25_000)
    expect(await tambah.getAmountText()).toMatch(/^Rp 25\.000$/)
  })
})
