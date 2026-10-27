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

/**
 * iOS twin of extractChildTexts: reads the tagged container's
 * XCUIElementTypeStaticText children (the platform equivalent of the
 * Android TextView children — verified live 2026-10-27 on the Tambah helper
 * tag, whose child static texts enumerate exactly the rendered strings).
 * getText() on those children returns the rendered text; the predicate makes
 * no positional assumptions (CMP tree depth is not fixed on iOS either).
 */
export async function iosExtractChildTexts(
  parent: ChainablePromiseElement,
  selector = '-ios predicate string: type == "XCUIElementTypeStaticText"',
): Promise<string[]> {
  const children = await parent.$$(selector)
  const texts: string[] = []
  for (const child of children) {
    const text = ((await child.getText()) || '').trim()
    if (text) texts.push(text)
  }
  return texts
}

/**
 * Amount-bearing tagged nodes are containers; the value renders in a child TextView. */
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

/**
 * iOS twin of readAmount. The tagged node is usually an accessible=false
 * wrapper whose own getText() is empty, so in addition to own text and child
 * static texts this reads the wrapper's `value`/`label` attributes (XCUITest
 * exposes them even when the node itself is not accessible) before falling
 * back to the children. Same last-digit-bearing-text rule: the value node
 * renders after the label ("MASUK" -> "Rp 250.000").
 */
export async function iosReadAmount(el: ChainablePromiseElement): Promise<number> {
  const texts: string[] = []
  const own = ((await el.getText()) || '').trim()
  if (own) texts.push(own)
  for (const attr of ['value', 'label'] as const) {
    const v = ((await el.getAttribute(attr).catch(() => '')) || '').trim()
    if (v) texts.push(v)
  }
  texts.push(...(await iosExtractChildTexts(el)))
  const withDigits = texts.filter((t) => /\d/.test(t))
  if (withDigits.length === 0) {
    throw new Error(`No amount text found on element (tried node, value/label attrs, static-text children)`)
  }
  return parseAmountText(withDigits[withDigits.length - 1])
}

/**
 * Raw amount-bearing text of an iOS tagged node (the string that
 * iosReadAmount would parse, e.g. "\u2212Rp 75.000") for exact-rendering
 * assertions. Same candidate order as iosReadAmount; throws like it when no
 * digit-bearing text exists.
 */
export async function iosAmountText(el: ChainablePromiseElement): Promise<string> {
  const texts: string[] = []
  const own = ((await el.getText()) || '').trim()
  if (own) texts.push(own)
  for (const attr of ['value', 'label'] as const) {
    const v = ((await el.getAttribute(attr).catch(() => '')) || '').trim()
    if (v) texts.push(v)
  }
  texts.push(...(await iosExtractChildTexts(el)))
  const withDigits = texts.filter((t) => /\d/.test(t))
  if (withDigits.length === 0) {
    throw new Error(`No amount text found on element (tried node, value/label attrs, static-text children)`)
  }
  return withDigits[withDigits.length - 1]
}

/**
 * Bar-fill share of a row's progress bar from the rendered widths: fill /
 * container. A non-positive container width means the row never composed or
 * the layout changed — throw so the caller's retry re-queries instead of
 * computing a bogus ratio.
 */
export function barFillRatio(containerWidth: number, fillWidth: number): number {
  if (containerWidth <= 0) {
    throw new Error(`Bar container width must be positive, got ${containerWidth}`)
  }
  return fillWidth / containerWidth
}
