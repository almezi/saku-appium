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
