/**
 * UiAutomator XML tree analysis for the TC-A11Y checks. Dependency-free;
 * parses any element tag name (wdio returns <node>, MCP dumps class names).
 */
const PX_PER_DP = 2.625 // 420dpi profile; recalc via `adb shell wm density` if it changes
const MIN_TAP_DP = 48

interface Node {
  rid: string
  cls: string
  text: string
  desc: string
  clickable: boolean
  bounds: string
  children: Node[]
}

interface TagEvent {
  type: 'open' | 'close'
  attrs: Record<string, string>
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
    for (const a of inner.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = a[2]
    events.push({ type: 'open', attrs })
    if (inner.trimEnd().endsWith('/')) events.push({ type: 'close', attrs: {} })
  }
  return events
}

function buildTree(xml: string): Node[] {
  const roots: Node[] = []
  const stack: Node[] = []
  for (const ev of tokenize(xml)) {
    if (ev.type === 'open') {
      const node: Node = {
        rid: ev.attrs['resource-id'] ?? '',
        cls: ev.attrs.class ?? '',
        text: ev.attrs.text ?? '',
        desc: ev.attrs['content-desc'] ?? '',
        clickable: ev.attrs.clickable === 'true',
        bounds: ev.attrs.bounds ?? '',
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

function walk(node: Node, visit: (n: Node) => void): void {
  visit(node)
  for (const c of node.children) walk(c, visit)
}

function labeled(node: Node): boolean {
  return node.text.trim().length > 0 || node.desc.trim().length > 0
}

/** Clickable nodes with neither their own text/desc nor a labeled descendant. */
export function unlabeledClickables(xml: string): string[] {
  const bad: string[] = []
  for (const root of buildTree(xml)) {
    walk(root, (n) => {
      if (!n.clickable || labeled(n)) return
      let hasLabeledDescendant = false
      walk(n, (d) => {
        if (d !== n && labeled(d)) hasLabeledDescendant = true
      })
      if (!hasLabeledDescendant) bad.push(n.rid || n.cls || '(unnamed)')
    })
  }
  return bad
}

/** Clickable controls whose bounds are under 48dp in either dimension. */
export function under48dp(xml: string): string[] {
  const bad: string[] = []
  const seen = new Set<string>()
  const min = MIN_TAP_DP * PX_PER_DP
  for (const root of buildTree(xml)) {
    walk(root, (n) => {
      if (!n.clickable) return
      const m = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(n.bounds)
      if (!m) return
      const w = Number(m[3]) - Number(m[1])
      const h = Number(m[4]) - Number(m[2])
      if (w >= min - 0.5 && h >= min - 0.5) return
      const key = `${n.rid}|${n.bounds}`
      if (!seen.has(key)) {
        seen.add(key)
        bad.push(`${n.rid || n.cls} ${w}x${h}px`)
      }
    })
  }
  return bad
}

/** Document order of the given resource-id prefixes (TalkBack traversal proxy). */
export function traversalOrder(xml: string, keys: string[]): string[] {
  const order: string[] = []
  for (const root of buildTree(xml)) {
    walk(root, (n) => {
      for (const k of keys) {
        if ((n.rid === k || n.rid.startsWith(k)) && !order.includes(k)) order.push(k)
      }
    })
  }
  return order
}
