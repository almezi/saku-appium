/**
 * UI-driven arrange helpers for specs. createTransaction (and its iOS twin)
 * seed data through the real Tambah form — TESTABILITY.md's `test_seed`
 * intent extras are not implemented in the app — uniqueNote mints a per-run
 * marker so row lookups never collide, and tapUndoAction waits for and taps
 * the undo toast's "Urungkan" action.
 */
import { byTag, iosByTag } from "./locators";
import { tags } from "../config/tags";
import { TambahPage, type TransactionFormInput } from "../pageobjects/tambah.page";
import { TambahIosPage } from "../pageobjects/tambah.ios.page";
import { ELEMENT_PRESENT_QUICK } from "../config/timeouts";

/**
 * UI-driven data setup: creates a transaction through the Tambah form.
 * Used by specs as their arrange step. (The `test_seed` intent extras from
 * TESTABILITY.md are not implemented in the app yet, so data setup goes
 * through the real UI.)
 */
export async function createTransaction(input: TransactionFormInput): Promise<void> {
  const tambah = new TambahPage();
  await tambah.open();
  await tambah.fillForm(input);
  await tambah.save();
}

/** iOS twin of createTransaction: same input contract, iOS locators. */
export async function createTransactionIos(input: TransactionFormInput): Promise<void> {
  const tambah = new TambahIosPage();
  await tambah.open();
  await tambah.fillForm(input);
  await tambah.save();
}

/** Unique marker per run so row lookups never collide between tests. */
export function uniqueNote(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

/** Waits for the undo toast action ("Urungkan") and taps it. */
export async function tapUndoAction(): Promise<void> {
  const action = byTag(tags.component.toastAction);
  await action.waitForDisplayed({ timeout: ELEMENT_PRESENT_QUICK });
  await action.click();
}

/**
 * iOS twin of tapUndoAction. Verified live on iPhone 18 Pro (2026-10-29): the
 * DELETE confirmation does raise `component_toast` with a reachable
 * `component_toast_action`, unlike the save toast, which iOS renders without
 * either tag (tambah.ios.page.ts `save()`, performance.ios.spec.ts). The
 * window is the app's 5 s, so this stays a single find-then-click.
 */
export async function tapUndoActionIos(): Promise<void> {
  const action = iosByTag(tags.component.toastAction);
  await action.waitForDisplayed({ timeout: ELEMENT_PRESENT_QUICK });
  await action.click();
}
