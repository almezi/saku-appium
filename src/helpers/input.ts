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
 */
import type { ChainablePromiseElement } from '../types'

export async function typeIntoTaggedField(
  field: ChainablePromiseElement,
  text: string,
  label = 'tagged field',
): Promise<void> {
  let landed = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    // Focus the inner editor node where one exists: a cached-bounds click on
    // the wrapper can land on a scrim once the keyboard resize shifts the
    // layout (seen live on the kategori rename dialog).
    const editor = await field.$('.//android.widget.EditText')
    const inner = (await editor.isExisting().catch(() => false)) ? editor : field
    await inner.click()
    const current = await fieldText(field).catch(() => '')
    if (current.length > 0) {
      await driver.keys('\uE003'.repeat(current.length + 2))
    }
    await driver.keys(text)
    await driver.hideKeyboard().catch(() => undefined)
    landed = await fieldText(field).catch(() => '')
    if (landed === text) return
  }
  throw new Error(
    `typeIntoTaggedField: "${label}" holds "${landed}" instead of "${text}" after 3 attempts`,
  )
}

/** Rendered text of a field via its inner EditText node (the wrapper's own text is empty). */
export async function fieldText(field: ChainablePromiseElement): Promise<string> {
  const editor = await field.$('.//android.widget.EditText')
  if (!(await editor.isExisting())) return ''
  return (await editor.getText()).trim()
}
