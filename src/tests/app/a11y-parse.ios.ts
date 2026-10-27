/**
 * XCUITest accessibility-tree analysis for the TC-A11Y checks — the iOS twin
 * of a11y-parse.ts.
 *
 * Every attribute the checks read is shaped differently from UiAutomator's:
 *  - the app's test tag is the ACCESSIBILITY IDENTIFIER and lives in `name`
 *    (Android: a bare `resource-id`);
 *  - the spoken label lives in `label`, the rendered text in `value`
 *    (Android: `content-desc` and `text`);
 *  - interactivity is the `traits` attribute: a control carries the "Button"
 *    trait, a disabled one "NotEnabled, Button" (Android: `clickable="true"`);
 *  - geometry is in POINTS, not pixels (the app window measures 402x874 pt on
 *    the iPhone 18 Pro), so the tap-target floor is Apple's 44 pt instead of
 *    the Android 48 dp / 2.625 density conversion.
 *
 * A control's `label` is the COMPOSED accessibility label — its own text plus
 * the labels of its children ("Pilih Kategori, Buka pilihan") — which is
 * exactly what VoiceOver announces, so it is the right signal for the label
 * check. Icon-only controls keep their own label on the Image node
 * ("Buka pilihan", "Bulan sebelumnya"), which is what iconLabels reads.
 *
 * Dependency-free; parses any element tag name (wdio returns <node>, MCP
 * dumps class names).
 */
const MIN_TAP_PT = 44

interface IosNode {
  type: string
  name: string
  label: string
  value: string
  traits: string
  enabled: boolean
  width: number
  height: number
  children: IosNode[]
}

interface TagEvent {
  type: 'open' | 'close'
  attrs: Record<string, string>
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
}

function tokenize(xml: string): TagEvent[] {
  const events: TagEvent[] = []
  let idx = 0
  for (;;) {
    const lt = xml.indexOf('<', idx)
    if (lt === -1) break
    if (xml.startsWith('</', lt)) {
      idx = xml.indexOf('>', lt) + 1
      events.push({ type: 'close', attrs: {} })
      continue
    }
    // Scan to the tag's `>` honoring quoted attribute values.
    let j = lt + 1
    while (j < xml.length && xml[j] !== '>') {
      if (xml[j] === '"') j = xml.indexOf('"', j + 1)
      j++
    }
    const inner = xml.slice(lt + 1, j)
    idx = j + 1
    if (inner.startsWith('?') || inner.startsWith('!')) continue
    const attrs: Record<string, string> = {}
    for (const a of inner.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = decodeEntities(a[2])
    events.push({ type: 'open', attrs })
    if (inner.trimEnd().endsWith('/')) events.push({ type: 'close', attrs: {} })
  }
  return events
}

function buildTree(xml: string): IosNode[] {
  const roots: IosNode[] = []
  const stack: IosNode[] = []
  for (const ev of tokenize(xml)) {
    if (ev.type === 'open') {
      const node: IosNode = {
        type: ev.attrs.type ?? '',
        name: ev.attrs.name ?? '',
        label: ev.attrs.label ?? '',
        value: ev.attrs.value ?? '',
        traits: ev.attrs.traits ?? '',
        enabled: ev.attrs.enabled === 'true',
        width: Number(ev.attrs.width ?? 0),
        height: Number(ev.attrs.height ?? 0),
        children: [],
      }
      const parent = stack[stack.length - 1]
      if (parent) parent.children.push(node)
      else roots.push(node)
      stack.push(node)
    } else {
      stack.pop()
    }
  }
  return roots
}

function walk(node: IosNode, visit: (n: IosNode) => void): void {
  visit(node)
  for (const c of node.children) walk(c, visit)
}

function labeled(node: IosNode): boolean {
  return node.label.trim().length > 0 || node.value.trim().length > 0
}

/** A control is anything carrying the "Button" trait (disabled: "NotEnabled, Button"). */
function interactive(node: IosNode): boolean {
  return node.traits
    .split(',')
    .map((trait) => trait.trim())
    .includes('Button')
}

/** Controls with neither their own label/value nor a labeled descendant. */
export function unlabeledClickables(xml: string): string[] {
  const bad: string[] = []
  for (const root of buildTree(xml)) {
    walk(root, (n) => {
      if (!interactive(n) || labeled(n)) return
      let hasLabeledDescendant = false
      walk(n, (d) => {
        if (d !== n && labeled(d)) hasLabeledDescendant = true
      })
      if (!hasLabeledDescendant) bad.push(n.name || n.type || '(unnamed)')
    })
  }
  return bad
}

/** Controls whose bounds are under `min` points in either dimension. */
export function underMinTapTarget(xml: string, min = MIN_TAP_PT): string[] {
  const bad: string[] = []
  const seen = new Set<string>()
  for (const root of buildTree(xml)) {
    walk(root, (n) => {
      if (!interactive(n)) return
      if (n.width >= min - 0.5 && n.height >= min - 0.5) return
      const key = `${n.name}|${n.width}x${n.height}`
      if (!seen.has(key)) {
        seen.add(key)
        bad.push(`${n.name || n.type} ${n.width}x${n.height}pt`)
      }
    })
  }
  return bad
}

/** Document order of the given accessibility identifiers (VoiceOver traversal proxy). */
export function traversalOrder(xml: string, keys: string[]): string[] {
  const order: string[] = []
  for (const root of buildTree(xml)) {
    walk(root, (n) => {
      for (const k of keys) {
        if ((n.name === k || n.name.startsWith(k)) && !order.includes(k)) order.push(k)
      }
    })
  }
  return order
}

/** Labels of the icon-only controls (Image nodes), in document order. */
export function iconLabels(xml: string): string[] {
  const labels: string[] = []
  for (const root of buildTree(xml)) {
    walk(root, (n) => {
      if (n.type === 'XCUIElementTypeImage' && n.label.trim().length > 0) labels.push(n.label.trim())
    })
  }
  return labels
}
