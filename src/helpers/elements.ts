/**
 * Shared element-reading helpers. Locating and scrolling live in
 * locators.ts; these helpers read text off already-addressable elements.
 */
import { $$ } from '@wdio/globals'
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
 * Static texts rendered INSIDE a tagged node's measured rect, top-to-bottom
 * then left-to-right.
 *
 * Compose Multiplatform on iOS hoists the children of a tagged container
 * (cards, rows) OUT of the container node in the accessibility tree: the tag
 * lands on an empty `Other` and its texts become SIBLINGS in the enclosing
 * list (verified in an `anggaran_total_card` page-source dump, 2026-10-27).
 * Tree-based child queries return nothing there, so the rendered strings are
 * recovered from the geometry instead. Returns [] when the node has no rect
 * (not composed yet) so callers can keep their existing fallbacks.
 */
export async function iosTextsInside(el: ChainablePromiseElement): Promise<string[]> {
  const { x, y } = await el.getLocation().catch(() => ({ x: 0, y: 0, width: 0, height: 0 }))
  const { width, height } = await el.getSize().catch(() => ({ width: 0, height: 0 }))
  if (width <= 0 || height <= 0) return []
  const nodes = await $$('-ios predicate string: type == "XCUIElementTypeStaticText"')
  const found: { y: number; x: number; text: string }[] = []
  for (const node of nodes) {
    const loc = await node.getLocation().catch(() => null)
    const size = await node.getSize().catch(() => null)
    if (!loc || !size) continue
    const cx = loc.x + size.width / 2
    const cy = loc.y + size.height / 2
    if (cx < x || cx > x + width || cy < y || cy > y + height) continue
    const text = ((await node.getText().catch(() => '')) || '').trim()
    if (text) found.push({ y: loc.y, x: loc.x, text })
  }
  return found.sort((a, b) => a.y - b.y || a.x - b.x).map((entry) => entry.text)
}

/**
 * iOS twin of readAmount. The tagged node is usually an accessible=false
 * wrapper whose own getText() is empty, so in addition to own text and child
 * static texts this reads the wrapper's `value`/`label` attributes (XCUITest
 * exposes them even when the node itself is not accessible), and finally the
 * texts rendered inside the node's rect (see iosTextsInside). Same
 * last-digit-bearing-text rule: the value node renders after the label
 * ("MASUK" -> "Rp 250.000").
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
  let withDigits = texts.filter((t) => /\d/.test(t))
  if (withDigits.length === 0) {
    withDigits = (await iosTextsInside(el)).filter((t) => /\d/.test(t))
  }
  if (withDigits.length === 0) {
    throw new Error(`No amount text found on element (tried node, value/label attrs, static-text children, rect)`)
  }
  // Prefer a currency-shaped candidate: day headers also render a date
  // ("27 Okt 2026"), which would otherwise win the last-digit rule.
  const currency = withDigits.filter((t) => /Rp\s?\d/.test(t))
  const pool = currency.length > 0 ? currency : withDigits
  return parseAmountText(pool[pool.length - 1])
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
  let withDigits = texts.filter((t) => /\d/.test(t))
  if (withDigits.length === 0) {
    withDigits = (await iosTextsInside(el)).filter((t) => /\d/.test(t))
  }
  if (withDigits.length === 0) {
    throw new Error(`No amount text found on element (tried node, value/label attrs, static-text children, rect)`)
  }
  // Same currency preference as iosReadAmount (skips a day header's date).
  const currency = withDigits.filter((t) => /Rp\s?\d/.test(t))
  const pool = currency.length > 0 ? currency : withDigits
  return pool[pool.length - 1]
}

/** A node of the XCUITest page-source dump, with its frame. */
export interface IosPageNode {
  type: string
  name: string
  label: string
  value: string
  x: number
  y: number
  width: number
  height: number
}

/**
 * Every node of the current screen with its frame, parsed from ONE
 * page-source dump.
 *
 * The XCUITest dump carries name/label/value/x/y/width/height, so a single
 * round-trip replaces the per-element getText + getLocation + getSize reads.
 * That matters because the geometry fallback (iosTextsInside) is quadratic in
 * the number of containers: reading 12 transaction cards that way took more
 * than 180 s (measured 2026-10-27, TC-ROT-02 timed out), while the dump is
 * one request for the whole screen.
 */
export async function iosPageNodes(): Promise<IosPageNode[]> {
  const xml = await driver.getPageSource()
  const nodes: IosPageNode[] = []
  for (const match of xml.matchAll(/<XCUIElementType([A-Za-z]+)\b([^>]*)>/g)) {
    const attrs = match[2].replace(/\/$/, '')
    nodes.push({
      type: `XCUIElementType${match[1]}`,
      name: iosXmlAttr(attrs, 'name'),
      label: iosXmlAttr(attrs, 'label'),
      value: iosXmlAttr(attrs, 'value'),
      x: Number(iosXmlAttr(attrs, 'x')),
      y: Number(iosXmlAttr(attrs, 'y')),
      width: Number(iosXmlAttr(attrs, 'width')),
      height: Number(iosXmlAttr(attrs, 'height')),
    })
  }
  return nodes
}

/** True when `inner`'s centre falls inside `outer`'s frame. */
export function iosNodeContains(outer: IosPageNode, inner: IosPageNode): boolean {
  const cx = inner.x + inner.width / 2
  const cy = inner.y + inner.height / 2
  return cx >= outer.x && cx <= outer.x + outer.width && cy >= outer.y && cy <= outer.y + outer.height
}

/** The screen's static-text nodes (the ones carrying a rendered label), in dump order. */
export function iosStaticTexts(nodes: IosPageNode[]): IosPageNode[] {
  return nodes.filter((node) => node.type === 'XCUIElementTypeStaticText' && node.label)
}

/**
 * Labels of the static texts rendered inside `container`'s frame, in
 * reading order (top-to-bottom, then left-to-right).
 */
export function iosTextsInRect(container: IosPageNode, texts: IosPageNode[]): string[] {
  return texts
    .filter((text) => iosNodeContains(container, text))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((text) => text.label)
}

/**
 * Labels inside `container`'s frame, read COLUMN by column: the left half
 * top-to-bottom first, then the right half.
 *
 * The XCUITest tree order is not the visual order: a day header renders
 * "SELASA" and "27 Okt 2026" stacked at the left with "−Rp 50.000" at the
 * right, but the dump lists the weekday, the total and only then the date
 * (measured 2026-10-27). Splitting the frame in half restores the reading
 * order the Android twin reports (weekday, date, total).
 */
export function iosColumnTexts(container: IosPageNode, texts: IosPageNode[]): string[] {
  const inside = texts.filter((text) => iosNodeContains(container, text))
  const mid = container.x + container.width / 2
  const byReadingOrder = (a: IosPageNode, b: IosPageNode) => a.y - b.y || a.x - b.x
  const left = inside.filter((text) => text.x + text.width / 2 < mid).sort(byReadingOrder)
  const right = inside.filter((text) => text.x + text.width / 2 >= mid).sort(byReadingOrder)
  return [...left, ...right].map((text) => text.label)
}

/** Decoded value of an XML attribute in a page-source fragment. */
function iosXmlAttr(attrs: string, name: string): string {
  const match = attrs.match(new RegExp(`\\b${name}="([^"]*)"`))
  if (!match) return ''
  return match[1]
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
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
