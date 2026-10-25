/**
 * Unit tests for the element helpers — run with `npm run test:unit` (Node's
 * built-in test runner via the ts-node hook; no emulator needed). The
 * element-dependent helpers are exercised through structural mock elements
 * (just getText/getAttribute/$$), so the trim/filter/last-digit-bearing
 * selection rules get fast feedback without a device.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { barFillRatio, extractChildTexts, readAmount } from '../elements'
import type { ChainablePromiseElement } from '../../types'

/** Structural mock of a WDIO element — only what the helpers touch. */
function fakeElement(opts: {
  text?: string
  desc?: string
  childTexts?: (string | undefined)[]
}): ChainablePromiseElement {
  return {
    getText: async () => opts.text ?? '',
    getAttribute: async () => opts.desc ?? '',
    $$: async () => (opts.childTexts ?? []).map((t) => ({ getText: async () => t })),
  } as unknown as ChainablePromiseElement
}

test('barFillRatio computes the fill share from rendered widths', () => {
  // Live-verified on the breakdown card: at 80% the fill is 712 px of an
  // 890 px container.
  assert.equal(barFillRatio(890, 712), 0.8)
  assert.equal(barFillRatio(890, 890), 1)
  assert.equal(barFillRatio(890, 0), 0)
})

test('barFillRatio rejects a non-positive container width', () => {
  assert.throws(() => barFillRatio(0, 100), /must be positive/)
  assert.throws(() => barFillRatio(-890, 100), /must be positive/)
})

test('extractChildTexts trims, drops empties and keeps order', async () => {
  const el = fakeElement({ childTexts: ['  Belum ada data  ', '', undefined, 'Atur'] })
  assert.deepEqual(await extractChildTexts(el), ['Belum ada data', 'Atur'])
})

test('extractChildTexts queries TextView children by default', async () => {
  let received = ''
  const el = {
    $$: async (sel: string) => {
      received = sel
      return [{ getText: async () => 'x' }]
    },
  } as unknown as ChainablePromiseElement
  await extractChildTexts(el)
  assert.equal(received, 'android=new UiSelector().className("android.widget.TextView")')
})

test('readAmount takes the last digit-bearing child text', async () => {
  const el = fakeElement({ childTexts: ['MASUK', 'Rp 250.000'] })
  assert.equal(await readAmount(el), 250_000)
})

test('readAmount falls back to own text, then content-desc', async () => {
  assert.equal(await readAmount(fakeElement({ text: 'Rp 60.000' })), 60_000)
  assert.equal(await readAmount(fakeElement({ desc: 'SALDO Rp 1.000' })), 1_000)
})

test('readAmount parses negative totals from children', async () => {
  const el = fakeElement({ childTexts: ['SABTU', '24 Okt 2026', '\u2212Rp 12.500'] })
  assert.equal(await readAmount(el), -12_500)
})

test('readAmount throws when no candidate text bears digits', async () => {
  await assert.rejects(() => readAmount(fakeElement({ childTexts: ['MASUK', 'KELUAR'] })), /No amount text/)
})
