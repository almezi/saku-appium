import { byTag } from './locators'
import { tags } from '../config/tags'
import { TambahPage, type TransactionFormInput } from '../pageobjects/tambah.page'

/**
 * UI-driven data setup: creates a transaction through the Tambah form.
 * Used by specs as their arrange step. (The `test_seed` intent extras from
 * TESTABILITY.md are not implemented in the app yet, so data setup goes
 * through the real UI.)
 */
export async function createTransaction(input: TransactionFormInput): Promise<void> {
  const tambah = new TambahPage()
  await tambah.open()
  await tambah.fillForm(input)
  await tambah.save()
}

/** Unique marker per run so row lookups never collide between tests. */
export function uniqueNote(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`
}

/** Waits for the undo toast action ("Urungkan") and taps it. */
export async function tapUndoAction(): Promise<void> {
  const action = byTag(tags.component.toastAction)
  await action.waitForDisplayed({ timeout: 5_000 })
  await action.click()
}
