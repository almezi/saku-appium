import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { $ } from '@wdio/globals'
import { byTag } from '../../helpers/locators'
import { categories } from '../../config/categories'
import { createTransaction, uniqueNote } from '../../helpers/transactions'
import { DaftarPage } from '../../pageobjects/daftar.page'
import { CadanganPage } from '../../pageobjects/cadangan.page'

/**
 * TC-BACK — Cadangan / backup & export (Phase 2).
 * Cases picked from Phase 2.C in progress.md / test-cases-simple-money-tracker.md.
 *
 * Export flow verified live (2026-10-25, see progress.md): the app writes
 * `cache/backups/saku-cadangan.csv|.json` and opens the system share sheet;
 * the file exists while the sheet is up, so each export test dismisses the
 * sheet and reads the file via `adb shell run-as`. The CSV carries a UTF-8
 * BOM and the header `date,type,amount,category,account,note`; the JSON has
 * `version / transactions[] / categories / budgets / accounts`. Import opens
 * the system SAF picker — the device-dependent surface in this file; the
 * drive below taps the pushed file by name inside the picker.
 *
 * Same-session live verification (2026-10-25 evening, emulator-5554 after
 * cold reboot, app v2.2) added two facts this spec must respect:
 * ① The SAF picker opens on "Recent files", which is MediaStore-indexed — a
 *   freshly `adb push`ed file is NOT listed there. The drive must navigate
 *   Show roots → Downloads (a direct filesystem listing) before the file row
 *   resolves.
 * ② "Cadangan terakhir" updates as soon as an export writes the file — the
 *   share sheet being cancelled does NOT revert it to "belum pernah". The
 *   backup genuinely exists, so that is correct app behaviour; TC-BACKUP-05
 *   asserts no-data-change instead of an unchanged timestamp.
 */
const APP_ID = 'id.almezi.simplemoneytracker_kt'
// Fallback ONLY, for adb calls that somehow run before the session exists.
// The helpers below prefer the live session's udid: in multi-device runs
// (SAKU_DEVICES / shard mode) the env var is one value shared by every
// worker, so it would silently send all workers' adb traffic to one device.
const FALLBACK_UDID = process.env.ANDROID_UDID ?? 'emulator-5554'
const CSV_HEADER = 'date,type,amount,category,account,note'
const IMPORT_FILE_NAME = 'saku-import-test.json'
const navTag = 'component_nav_bottom_daftar'
const SEED_AMOUNT = 50_000
const IMPORT_AMOUNT = 77_000
const seedNote = uniqueNote('backup')

/**
 * The udid of the device THIS worker's session actually drives. Read from the
 * live session's capabilities (set per device by wdio.conf.ts) — never from
 * the environment — so parallel/shard runs address their own device.
 */
async function deviceUdid(): Promise<string> {
  const caps = (await driver.capabilities) as Record<string, unknown>
  return (caps['appium:udid'] as string | undefined) ?? FALLBACK_UDID
}

async function adbShell(command: string): Promise<string> {
  return execSync(`adb -s ${await deviceUdid()} shell "${command}"`, { encoding: 'utf8' })
}

async function readExportedFile(path: string): Promise<string> {
  return adbShell(`run-as ${APP_ID} cat ${path}`)
}

async function pushImportFile(): Promise<void> {
  const payload = {
    version: 1,
    transactions: [
      {
        type: 'pemasukan',
        amount: IMPORT_AMOUNT,
        categoryId: categories.income.salary,
        accountId: 'acc_tunai',
        dateEpochMillis: Date.now(),
        createdAt: Date.now(),
        note: 'impor-restore-77k',
      },
    ],
    categories: [],
    budgets: [],
    accounts: [
      { id: 'acc_tunai', name: 'Tunai', sortOrder: 0 },
      { id: 'acc_bca', name: 'BCA', sortOrder: 1 },
      { id: 'acc_gopay', name: 'GoPay', sortOrder: 2 },
    ],
  }
  const localPath = '/tmp/saku-import-test.json'
  writeFileSync(localPath, JSON.stringify(payload))
  execSync(`adb -s ${await deviceUdid()} push ${localPath} /sdcard/Download/${IMPORT_FILE_NAME}`)
}

/**
 * Taps a node of the system SAF picker (documentsui has no test tags, so
 * text/description locators are the only option there). Drawer animation
 * stale-resolves handles, so retry on a fresh query like tapRowAction does.
 */
async function tapPickerNode(selector: string, label: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const node = $(`android=new UiSelector().${selector}`)
      await node.waitForDisplayed({ timeout: 5_000 })
      await node.click()
      return
    } catch {
      await driver.pause(500)
    }
  }
  throw new Error(`SAF picker node "${label}" could not be tapped`)
}

describe('TC-BACK — backup & export (Phase 2) @regression', () => {
  const daftar = new DaftarPage()
  const cadangan = new CadanganPage()

  before(async () => {
    await daftar.open()
    // Seed one income so the status card reports "1 transaksi tersimpan" and
    // the export files have a known single row to assert on.
    await createTransaction({
      type: 'pemasukan',
      amount: SEED_AMOUNT,
      categoryId: categories.income.salary,
      note: seedNote,
    })
  })

  it('TC-BACKUP-01 tapping the daftar backup button opens the Cadangan screen @regression', async () => {
    // The seed's save leaves the app on Tambah; the backup button lives on
    // the Transaksi screen, so navigate there first.
    await daftar.open()
    await cadangan.openFromDaftar()
    expect(await cadangan.isDisplayed()).toBe(true)
    const status = (await cadangan.statusTexts()).join(' ')
    expect(status).toContain('1 transaksi tersimpan')
    expect(status).toContain('belum pernah')
    expect(await cadangan.warningCard.isDisplayed()).toBe(true)
  })

  it('TC-BACKUP-02 exporting JSON opens the share sheet with the backup file @regression', async () => {
    await cadangan.exportJsonButton.click()
    await driver.waitUntil(() => cadangan.isShareSheetOpen(), { timeout: 15_000 })
    const fileName = $('android=new UiSelector().textContains("saku-cadangan.json")')
    expect(await fileName.isDisplayed()).toBe(true)
    await driver.back() // dismiss the share sheet
    expect(await cadangan.isDisplayed()).toBe(true)
  })

  it('TC-BACKUP-03 the exported files contain the current transaction @regression', async () => {
    const json = JSON.parse(await readExportedFile('cache/backups/saku-cadangan.json')) as {
      transactions: Array<{ amount: number; note: string | null }>
    }
    const seeded = json.transactions.find((t) => t.note === seedNote)
    expect(seeded?.amount).toBe(SEED_AMOUNT)

    // Re-export CSV so the file reflects the same data, then assert content.
    await cadangan.exportCsvButton.click()
    await driver.waitUntil(() => cadangan.isShareSheetOpen(), { timeout: 15_000 })
    await driver.back()
    const csv = (await readExportedFile('cache/backups/saku-cadangan.csv')).replace(/^\uFEFF/, '')
    expect(csv).toContain(CSV_HEADER)
    expect(csv).toContain(seedNote)
    expect(csv).toContain(`,${SEED_AMOUNT},`)
  })

  it('TC-BACKUP-05 cancelling the export leaves no side effects @regression', async () => {
    await cadangan.exportCsvButton.click()
    await driver.waitUntil(() => cadangan.isShareSheetOpen(), { timeout: 15_000 })
    await driver.back()
    expect(await cadangan.isDisplayed()).toBe(true)
    // Cancelling the share must not touch data: the transaction count is
    // unchanged and no import result/error surfaced. "Cadangan terakhir" is
    // NOT asserted here — the export already wrote the backup file, so the
    // app correctly reports a backup date instead of "belum pernah"
    // (verified live, see the header note).
    const status = (await cadangan.statusTexts()).join(' ')
    expect(status).toContain('1 transaksi tersimpan')
    expect(await cadangan.importResult.isExisting()).toBe(false)
    expect(await cadangan.importError.isExisting()).toBe(false)
  })

  it('TC-BACKUP-04 importing a backup restores its transactions @regression', async () => {
    await pushImportFile()
    await cadangan.importButton.click()

    // SAF picker: it opens on "Recent files", which is MediaStore-indexed and
    // does not list a freshly pushed file — navigate to the Downloads root
    // (a direct filesystem listing) where the pushed file is always visible.
    await driver.waitUntil(
      async () => (await driver.getCurrentPackage()).includes('documentsui'),
      { timeout: 15_000 },
    )
    await tapPickerNode('description("Show roots")', 'Show roots')
    await tapPickerNode('text("Downloads")', 'Downloads root')
    // Resolve the file row with a plain text query: the roots drawer is also
    // scrollable, so a UiScrollable here can race the drawer closing and
    // scroll the drawer instead of the file list. The Downloads listing is
    // short; a settle wait plus waitForDisplayed is enough (verified live).
    await driver.pause(800)
    const fileRow = $(`android=new UiSelector().textContains("${IMPORT_FILE_NAME}")`)
    await fileRow.waitForDisplayed({ timeout: 10_000 })
    await fileRow.click()

    await cadangan.importResult.waitForDisplayed({ timeout: 20_000 })
    const result = await cadangan.importResult.getText()
    expect(result).toContain('1 transaksi ditambahkan')
    const status = (await cadangan.statusTexts()).join(' ')
    expect(status).toContain('2 transaksi tersimpan')
    await adbShell(`rm -f /sdcard/Download/${IMPORT_FILE_NAME}`)
  })

  it('TC-BACKUP-06 exporting with zero transactions produces a valid empty file @regression', async () => {
    // TC-BACKUP-04 can leave the SAF picker foregrounded, and a successful
    // import still leaves the app on Cadangan — a pushed screen with a back
    // button and NO bottom bar. Back out (bounded) until the bottom
    // navigation exists, then go to Daftar.
    for (let back = 0; back < 3 && !(await byTag(navTag).isExisting()); back++) {
      await driver.back()
    }
    await daftar.open()
    // Remove both transactions (seed + import) to reach the empty state.
    for (let i = 0; i < 2; i++) {
      await daftar.tapDelete(categories.income.salary)
      await daftar.confirmDeleteSheet()
    }
    expect(await daftar.emptyState.isDisplayed()).toBe(true)

    await cadangan.openFromDaftar()
    await cadangan.exportCsvButton.click()
    await driver.waitUntil(() => cadangan.isShareSheetOpen(), { timeout: 15_000 })
    await driver.back()
    const csv = (await readExportedFile('cache/backups/saku-cadangan.csv')).replace(/^\uFEFF/, '')
    expect(csv.trim()).toBe(CSV_HEADER)
  })
})
