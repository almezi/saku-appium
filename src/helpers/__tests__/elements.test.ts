/**
 * Unit tests for the pure element helpers — run with `npm run test:unit`
 * (Node's built-in test runner via the ts-node hook; no emulator needed).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { barFillRatio } from '../elements'

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
