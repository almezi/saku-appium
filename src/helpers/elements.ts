/**
 * Shared element-reading helpers. Locating and scrolling live in
 * locators.ts; these helpers read text off already-addressable elements.
 */
import type { ChainablePromiseElement } from '../types'
import { parseAmountText } from './money'

/**
 * Non-empty trimmed texts of `parent`'s children matching `selector`, in DOM
 * order. Defaults to TextView children — the read pattern for every
 * tagged-container label list (empty states, comparison cards, rows).
 */
export async function extractChildTexts(
  parent: ChainablePromiseElement,
  selector = 'android=new UiSelector().className("android.widget.TextView")',
): Promise<string[]> {
  const children = await parent.$$(selector)
  const texts: string[] = []
  for (const child of children) {
    const text = ((await child.getText()) || '').trim()
    if (text) texts.push(text)
  }
  return texts
}

/** Amount-bearing tagged nodes are containers; the value renders in a child TextView. */
export async function readAmount(el: ChainablePromiseElement): Promise<number> {
  const texts: string[] = []
  const own = (await el.getText()).trim()
  if (own) texts.push(own)
  const desc = await el.getAttribute('content-desc').catch(() => '')
  if (desc && desc.trim()) texts.push(desc.trim())
  texts.push(...(await extractChildTexts(el)))
  // The value node renders after the label ("MASUK" -> "Rp 250.000"), so the
  // last digit-bearing text wins.
  const withDigits = texts.filter((t) => /\d/.test(t))
  if (withDigits.length === 0) {
    throw new Error(`No amount text found on element (tried node, content-desc, children)`)
  }
  return parseAmountText(withDigits[withDigits.length - 1])
}
