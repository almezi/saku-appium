import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { $ } from '@wdio/globals'
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
 */
const APP_ID = 'id.almezi.simplemoneytracker_kt'
const UDID = process.env.ANDROID_UDID ?? 'emulator-5554'
const CSV_HEADER = 'date,type,amount,category,account,note'
const IMPORT_FILE_NAME = 'saku-import-test.json'
const SEED_AMOUNT = 50_000
const IMPORT_AMOUNT = 77_000
const seedNote = uniqueNote('backup')

function adbShell(command: string): string {
  return execSync(`adb -s ${UDID} shell "${command}"`, { encoding: 'utf8' })
}

function readExportedFile(path: string): string {
  return adbShell(`run-as ${APP_ID} cat ${path}`)
}

function pushImportFile(): void {
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
  execSync(`adb -s ${UDID} push ${localPath} /sdcard/Download/${IMPORT_FILE_NAME}`)
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

  it('TC-BACKUP-01 tapping the daftar backup button opens the Cadangan screen', async () => {
    await cadangan.openFromDaftar()
    expect(await cadangan.isDisplayed()).toBe(true)
    const status = (await cadangan.statusTexts()).join(' ')
    expect(status).toContain('1 transaksi tersimpan')
    expect(status).toContain('belum pernah')
    expect(await cadangan.warningCard.isDisplayed()).toBe(true)
  })

  it('TC-BACKUP-02 exporting JSON opens the share sheet with the backup file', async () => {
    await cadangan.exportJsonButton.click()
    await driver.waitUntil(() => cadangan.isShareSheetOpen(), { timeout: 15_000 })
    const fileName = $('android=new UiSelector().textContains("saku-cadangan.json")')
    expect(await fileName.isDisplayed()).toBe(true)
    await driver.back() // dismiss the share sheet
    expect(await cadangan.isDisplayed()).toBe(true)
  })

  it('TC-BACKUP-03 the exported files contain the current transaction', async () => {
    const json = JSON.parse(readExportedFile('cache/backups/saku-cadangan.json')) as {
      transactions: Array<{ amount: number; note: string | null }>
    }
    const seeded = json.transactions.find((t) => t.note === seedNote)
    expect(seeded?.amount).toBe(SEED_AMOUNT)

    // Re-export CSV so the file reflects the same data, then assert content.
    await cadangan.exportCsvButton.click()
    await driver.waitUntil(() => cadangan.isShareSheetOpen(), { timeout: 15_000 })
    await driver.back()
    const csv = readExportedFile('cache/backups/saku-cadangan.csv').replace(/^\uFEFF/, '')
    expect(csv).toContain(CSV_HEADER)
    expect(csv).toContain(seedNote)
    expect(csv).toContain(`,${SEED_AMOUNT},`)
  })

  it('TC-BACKUP-05 cancelling the export leaves no side effects', async () => {
    await cadangan.exportCsvButton.click()
    await driver.waitUntil(() => cadangan.isShareSheetOpen(), { timeout: 15_000 })
    await driver.back()
    expect(await cadangan.isDisplayed()).toBe(true)
    const status = (await cadangan.statusTexts()).join(' ')
    expect(status).toContain('1 transaksi tersimpan')
    expect(status).toContain('belum pernah')
  })

  it('TC-BACKUP-04 importing a backup restores its transactions', async () => {
    pushImportFile()
    await cadangan.importButton.click()

    // SAF picker: wait for the documents UI or the file row, then tap it.
    await driver.waitUntil(
      async () =>
        (await driver.getCurrentPackage()).includes('documentsui') ||
        (await $('android=new UiSelector().textContains("saku-import-test")')
          .isExisting()
          .catch(() => false)),
      { timeout: 15_000 },
    )
    const fileRow = $(
      `android=new UiScrollable(new UiSelector().scrollable(true))` +
        `.scrollIntoView(new UiSelector().textContains("${IMPORT_FILE_NAME}"))`,
    )
    await fileRow.click()

    await cadangan.importResult.waitForDisplayed({ timeout: 20_000 })
    const result = await cadangan.importResult.getText()
    expect(result).toContain('1 transaksi ditambahkan')
    const status = (await cadangan.statusTexts()).join(' ')
    expect(status).toContain('2 transaksi tersimpan')
    adbShell(`rm -f /sdcard/Download/${IMPORT_FILE_NAME}`)
  })

  it('TC-BACKUP-06 exporting with zero transactions produces a valid empty file', async () => {
    // Remove both transactions (seed + import) to reach the empty state.
    await daftar.open()
    for (let i = 0; i < 2; i++) {
      await daftar.tapDelete(categories.income.salary)
      await daftar.confirmDeleteSheet()
    }
    expect(await daftar.emptyState.isDisplayed()).toBe(true)

    await cadangan.openFromDaftar()
    await cadangan.exportCsvButton.click()
    await driver.waitUntil(() => cadangan.isShareSheetOpen(), { timeout: 15_000 })
    await driver.back()
    const csv = readExportedFile('cache/backups/saku-cadangan.csv').replace(/^\uFEFF/, '')
    expect(csv.trim()).toBe(CSV_HEADER)
  })
})
