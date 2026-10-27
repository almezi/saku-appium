/**
 * Shared text-entry helper for Compose text fields: the tag sits on a wrapper
 * node (where `addValue` fails with "did you interact with the correct
 * element"), so click the field's inner editor to focus, backspace any
 * existing text away, then send keys to the focused field. Every attempt is
 * verified via `fieldText` and the whole clear-then-type sequence retries up
 * to 3 times — cached-bounds clicks and keyboard races can drop or duplicate
 * keys, and typing blindly would let a form be saved with wrong content.
 * Throws an error naming `label` (pass the test tag) when the text never
 * lands, so callers never proceed with stale field content.
 *
 * Verification modes: 'exact' (default) requires the rendered text to equal
 * the typed text — right for plain fields. 'digits' compares digit content
 * only, for currency fields the app formats as you type ("254000" renders
 * "Rp 254.000", so exact equality can never hold there).
 */
import { $ } from '@wdio/globals'
import type { ChainablePromiseElement } from '../types'

export type FieldVerify = 'exact' | 'digits'

export async function typeIntoTaggedField(
  field: ChainablePromiseElement,
  text: string,
  label = 'tagged field',
  verify: FieldVerify = 'exact',
): Promise<void> {
  const landedOk =
    verify === 'digits'
      ? (held: string) => held.replace(/\D/g, '') === text.replace(/\D/g, '')
      : (held: string) => held === text
  // Re-resolve the field on EVERY attempt: the kategori rename dialog
  // recomposes while the keyboard resizes, and the handle resolved in an
  // earlier attempt is stale — reusing the passed chainable would fail all
  // retries identically. Resolving from the selector re-queries fresh.
  const selector = String(await Promise.resolve(field.selector))
  let landed = ''
  let lastError: unknown = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Composition wait: on a cold start the first field lookup can run
      // while the screen is still composing, and the interaction retries
      // below span only ~1 s. Wait for the field to enter the tree first;
      // the retry loop then handles interaction-level staleness only.
      await $(selector).waitForExist({ timeout: 15_000 })
      const fresh = await $(selector)
      // Focus the inner editor node where one exists: a cached-bounds click on
      // the wrapper can land on a scrim once the keyboard resize shifts the
      // layout (seen live on the kategori rename dialog).
      const editor = await fresh.$('.//android.widget.EditText')
      const inner = (await editor.isExisting().catch(() => false)) ? editor : fresh
      await inner.click()
      const current = await fieldText(fresh).catch(() => '')
      if (current.length > 0) {
        await driver.keys('\uE003'.repeat(current.length + 2))
      }
      await driver.keys(text)
      await driver.hideKeyboard().catch(() => undefined)
      landed = await fieldText(fresh).catch(() => '')
      if (landedOk(landed)) return
      lastError = null
    } catch (e) {
      // Transient interaction failure — settle, then retry on a fresh query.
      lastError = e
      await driver.pause(500)
    }
  }
  if (lastError) throw lastError
  throw new Error(
    `typeIntoTaggedField: "${label}" holds "${landed}" instead of "${text}" after 3 attempts`,
  )
}

/**
 * Rendered text of a field. Tambah/Anggaran tags sit on wrapper nodes whose
 * value renders in an inner EditText; the kategori rename dialog tags the
 * EditText itself (verified live: class android.widget.EditText with
 * resource-id kategori_form_name and no inner editor) — so fall back to the
 * field's own text when no inner editor exists.
 */
export async function fieldText(field: ChainablePromiseElement): Promise<string> {
  const editor = await field.$('.//android.widget.EditText')
  if (await editor.isExisting().catch(() => false)) {
    return (await editor.getText()).trim()
  }
  return (await field.getText().catch(() => '')).trim()
}

/**
 * Keyboard-free text entry: writes `text` straight through the
 * instrumentation (UiAutomator2 setText, the same path as Appium MCP
 * set_value), replacing any existing content — no focus click, no IME, no
 * keyboard. Built for the "Ubah kategori" dialog, whose keyboard-resize
 * recomposition kept dismissing the dialog mid-typing under WebdriverIO
 * (BUG_Found_04; the identical flow works live via MCP set_value). Because
 * the keyboard never opens, Compose fields that need focus to accept
 * setText may ignore the write — the verify step catches that and the whole
 * attempt retries on a fresh query; if a field genuinely cannot take a
 * keyboard-free write, callers should fall back to typeIntoTaggedField.
 */
export async function setValueIntoTaggedField(
  field: ChainablePromiseElement,
  text: string,
  label = 'tagged field',
  verify: FieldVerify = 'exact',
): Promise<void> {
  const landedOk =
    verify === 'digits'
      ? (held: string) => held.replace(/\D/g, '') === text.replace(/\D/g, '')
      : (held: string) => held === text
  const selector = String(await Promise.resolve(field.selector))
  let landed = ''
  let lastError: unknown = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await $(selector).waitForExist({ timeout: 15_000 })
      const fresh = await $(selector)
      await fresh.setValue(text)
      landed = await fieldText(fresh).catch(() => '')
      if (landedOk(landed)) return
      lastError = null
    } catch (e) {
      lastError = e
      await driver.pause(500)
    }
  }
  if (lastError) throw lastError
  throw new Error(
    `setValueIntoTaggedField: "${label}" holds "${landed}" instead of "${text}" after 3 attempts`,
  )
}

/* ------------------------------------------------------------------ *
 * iOS twins — verified live 2026-10-27 (spike, iPhone 18 Pro/iOS 27). *
 * ------------------------------------------------------------------ */

/**
 * Rendered text of an iOS Compose field. The test tag sits on an
 * accessible=false wrapper (XCUIElementTypeOther) whose own getText() is
 * empty; the value renders on a descendant editor node's `value` attribute —
 * measured as XCUIElementTypeTextView for both the amount and note fields
 * ("Rp 254.000" / "spike-note-1"). Falls back to the wrapper's own text for
 * fields whose tag lands directly on the editor.
 */
export async function iosFieldText(field: ChainablePromiseElement): Promise<string> {
  const editor = await field.$(
    '-ios predicate string: type == "XCUIElementTypeTextView" OR type == "XCUIElementTypeTextField"',
  )
  if (await editor.isExisting().catch(() => false)) {
    const value = ((await editor.getAttribute('value')) || '').trim()
    if (value) return value
  }
  return ((await field.getText().catch(() => '')) || '').trim()
}

/**
 * iOS twin of typeIntoTaggedField: click the tagged field to focus, clear
 * any existing content, type via addValue, verify via iosFieldText, retry
 * the whole sequence up to 3 times on a fresh query (same contract as the
 * Android helper).
 *
 * Spike evidence driving the design:
 *  - addValue after a focus click lands the text (the Compose editor accepts
 *    WDA typeText); `setValue` APPENDS instead of replacing on this build,
 *    so it is not used;
 *  - clearing uses element.clear() on the inner editor, with a backspace-key
 *    fallback (repeat \uE003) for the case clear() races the composition;
 *  - verification is mandatory: the field live-formats currency ("254000"
 *    renders "Rp 254.000"), so callers of amount fields pass 'digits'.
 */
export async function iosTypeIntoTaggedField(
  field: ChainablePromiseElement,
  text: string,
  label = 'tagged field',
  verify: FieldVerify = 'exact',
): Promise<void> {
  const landedOk =
    verify === 'digits'
      ? (held: string) => held.replace(/\D/g, '') === text.replace(/\D/g, '')
      : (held: string) => held === text
  const selector = String(await Promise.resolve(field.selector))
  let landed = ''
  let lastError: unknown = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await $(selector).waitForExist({ timeout: 15_000 })
      const fresh = await $(selector)
      await fresh.click()
      const editor = await fresh.$(
        '-ios predicate string: type == "XCUIElementTypeTextView" OR type == "XCUIElementTypeTextField"',
      )
      const target = (await editor.isExisting().catch(() => false)) ? editor : fresh
      const current = await iosFieldText(fresh).catch(() => '')
      if (current.length > 0) {
        await target.clearValue().catch(async () => {
          // clearValue() can race the composition on a just-focused field;
          // the keyboard backspace key is the fallback (WDA maps \uE003).
          await fresh.addValue('\uE003'.repeat(current.length + 2))
        })
      }
      await target.addValue(text)
      // Dismiss the keyboard so it cannot cover the save button or sheet
      // taps that follow; iOS has no system back to do it implicitly.
      await driver.hideKeyboard().catch(() => undefined)
      landed = await iosFieldText(fresh).catch(() => '')
      if (landedOk(landed)) return
      lastError = null
    } catch (e) {
      lastError = e
      await driver.pause(500)
    }
  }
  if (lastError) throw lastError
  throw new Error(
    `iosTypeIntoTaggedField: "${label}" holds "${landed}" instead of "${text}" after 3 attempts`,
  )
}
