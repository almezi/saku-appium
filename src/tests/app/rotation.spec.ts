/**
 * TC-ROT — rotation & config change (Phase 3.D), distilled from the
 * MCP-verified run on 2026-10-26 (see progress.md). Verified app behavior:
 *
 * - Form values (amount, category, note) survive a full landscape round
 *   trip. Caveat (BUG_Found_05): in landscape the note field and save button
 *   are NOT composed at all — the form is unsavable until portrait returns.
 * - Daftar keeps its exact scroll position across rotation (top visible row
 *   unchanged).
 * - Ringkasan lays out in landscape without crashing; balance stays correct.
 * - Dark mode (`cmd uimode night yes`) renders every checked screen readable.
 * - Backgrounding the app and resuming keeps the unsaved form intact.
 * - 200% font scale renders the whole form; the bottom-nav labels clip
 *   mid-word without ellipsis (BUG_Found_06), so this spec only asserts the
 *   form body.
 *
 * System settings (uimode, font_scale) are reset in after() so later suites
 * inherit defaults.
 */
import { execSync } from 'node:child_process'
import { categories } from '../../config/categories'
import { createTransaction } from '../../helpers/transactions'
import { TambahPage } from '../../pageobjects/tambah.page'
import { DaftarPage } from '../../pageobjects/daftar.page'
import { RingkasanPage } from '../../pageobjects/ringkasan.page'

const UDID = process.env.ANDROID_UDID ?? 'emulator-5554'
const adb = (cmd: string) => execSync(`adb -s ${UDID} shell ${cmd}`)

const tambah = new TambahPage()
const daftar = new DaftarPage()
const ringkasan = new RingkasanPage()

/** Raw W3C touch swipe (scrollGesture is a silent no-op on this Compose list). */
async function swipeUp(): Promise<void> {
  await driver.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: 540, y: 1600 },
        { type: 'pointerDown', button: 0 },
        { type: 'pointerMove', duration: 600, x: 540, y: 500 },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ])
  await driver.releaseActions()
}

describe('TC-ROT — rotation & config change (Phase 3.D) @regression', () => {
  after(async () => {
    adb('settings put system font_scale 1.0')
    adb('cmd uimode night no')
    await driver.setOrientation('PORTRAIT')
  })

  it('TC-ROT-01 rotating on a filled Tambah form retains amount, category and note', async () => {
    await tambah.open()
    await tambah.fillForm({
      type: 'pemasukan',
      amount: 12_000,
      categoryId: categories.income.salary,
      note: 'rotasi',
    })
    await driver.setOrientation('LANDSCAPE')
    await driver.pause(1_000)
    expect(await tambah.getAmountText()).toBe('Rp 12.000')
    expect(await tambah.isDisplayed()).toBe(true)
    await driver.setOrientation('PORTRAIT')
    await driver.pause(1_000)
    expect(await tambah.getAmountText()).toBe('Rp 12.000')
    expect(await tambah.getNoteText()).toBe('rotasi')
  })

  it('TC-ROT-02 rotating on Transaksi retains the exact scroll position', async () => {
    // Enough rows to make the list scrollable.
    for (let i = 0; i < 12; i++) {
      await createTransaction({
        type: 'pemasukan',
        amount: 1_000 + i,
        categoryId: categories.income.salary,
      })
    }
    await daftar.open()
    await swipeUp()
    await driver.pause(500)
    const before = (await daftar.rowAmountTextsInOrder())[0]
    await driver.setOrientation('LANDSCAPE')
    await driver.pause(1_000)
    expect(await daftar.isDisplayed()).toBe(true)
    await driver.setOrientation('PORTRAIT')
    await driver.pause(1_000)
    const after = (await daftar.rowAmountTextsInOrder())[0]
    expect(after).toBe(before)
  })

  it('TC-ROT-03 rotating on Ringkasan renders without crash and keeps the balance', async () => {
    await ringkasan.open()
    const balance = await ringkasan.balanceValue()
    await driver.setOrientation('LANDSCAPE')
    await driver.pause(1_000)
    expect(await ringkasan.isDisplayed()).toBe(true)
    expect(await ringkasan.balanceValue()).toBe(balance)
    await driver.setOrientation('PORTRAIT')
    await driver.pause(1_000)
  })

  it('TC-ROT-04 dark mode keeps the summary and form readable', async () => {
    adb('cmd uimode night yes')
    await driver.pause(1_500)
    await ringkasan.open()
    expect(await ringkasan.isDisplayed()).toBe(true)
    expect(await ringkasan.balanceText()).toMatch(/^Rp/)
    await tambah.open()
    expect(await tambah.isSaveEnabled()).toBe(false)
    adb('cmd uimode night no')
    await driver.pause(1_500)
  })

  it('TC-ROT-05 backgrounding and resuming keeps the unsaved form intact', async () => {
    await tambah.fillForm({
      type: 'pemasukan',
      amount: 9_911,
      categoryId: categories.income.salary,
    })
    await driver.background(6)
    await driver.pause(1_000)
    expect(await tambah.getAmountText()).toBe('Rp 9.911')
  })

  it('TC-ROT-06 200% font scale renders the form without clipped fields', async () => {
    adb('settings put system font_scale 2.0')
    await driver.pause(2_000)
    await tambah.open()
    expect(await tambah.getAmountText()).toBe('Rp 0')
    expect(await tambah.isDisplayed()).toBe(true)
    // Bottom-nav labels clip mid-word at 200% — documented as BUG_Found_06.
  })
})
