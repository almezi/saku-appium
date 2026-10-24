/**
 * Shared text-entry helper for Compose text fields, mirroring the approach in
 * TambahPage: the tag sits on a wrapper node, so click to focus, backspace any
 * existing text away, then send keys to the focused field.
 */
import type { ChainablePromiseElement } from '../types'

export async function typeIntoTaggedField(
  field: ChainablePromiseElement,
  text: string,
): Promise<void> {
  await field.click()
  const current = await fieldText(field)
  if (current.length > 0) {
    await driver.keys('\uE003'.repeat(current.length + 2))
  }
  await driver.keys(text)
  await driver.hideKeyboard().catch(() => undefined)
}

/** Rendered text of a field via its inner EditText node (the wrapper's own text is empty). */
export async function fieldText(field: ChainablePromiseElement): Promise<string> {
  const editor = await field.$('.//android.widget.EditText')
  if (!(await editor.isExisting())) return ''
  return (await editor.getText()).trim()
}
