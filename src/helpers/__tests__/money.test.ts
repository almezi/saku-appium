/**
 * Unit tests for the pure money helpers — run with `npm run test:unit`
 * (Node's built-in test runner via the ts-node hook; no emulator needed).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatRp, formatNegativeRp, formatSignedRp, parseAmountText } from "../money";

test("formatRp renders dot thousands separators without decimals", () => {
  assert.equal(formatRp(1_234_567), "Rp 1.234.567");
  assert.equal(formatRp(0), "Rp 0");
});

test("formatNegativeRp uses U+2212 and keeps the amount absolute", () => {
  assert.equal(formatNegativeRp(-50_000), "\u2212Rp 50.000");
  assert.equal(formatNegativeRp(50_000), "\u2212Rp 50.000");
});

test("formatSignedRp signs only negatives", () => {
  assert.equal(formatSignedRp(75_000), "Rp 75.000");
  assert.equal(formatSignedRp(-75_000), "\u2212Rp 75.000");
});

test("parseAmountText reads dot thousands separators", () => {
  assert.equal(parseAmountText("Rp 1.234.567"), 1_234_567);
  assert.equal(parseAmountText("Rp 60.000"), 60_000);
});

test("parseAmountText takes the last numeric run, ignoring leading labels", () => {
  assert.equal(parseAmountText("Masuk Rp 250.000"), 250_000);
  assert.equal(parseAmountText("SALDO BERSIH Rp 212.121"), 212_121);
});

test("parseAmountText treats U+2212 and ASCII minus as sign before the currency", () => {
  assert.equal(parseAmountText("\u2212Rp 50.000"), -50_000);
  assert.equal(parseAmountText("-Rp 50.000"), -50_000);
});

test("parseAmountText reads comma decimals and percentages", () => {
  assert.equal(parseAmountText("100%"), 100);
  assert.equal(parseAmountText("671,1%"), 671.1);
  assert.equal(parseAmountText("\u2212671,1%"), -671.1);
});

test("parseAmountText throws when no numeric run exists", () => {
  assert.throws(() => parseAmountText("Masuk"), /Cannot parse amount/);
  assert.throws(() => parseAmountText(""), /Cannot parse amount/);
});

// R9: each numeric run carries the sign of the minus immediately before it
// (in the gap between runs), so a leading minus on an earlier run cannot
// leak into the last one — what Ringkasan comparison rows render.
test("parseAmountText signs mixed-sign runs per run", () => {
  assert.equal(parseAmountText("\u2212Rp 50.000 \u2026 Rp 25.000"), 25_000);
  assert.equal(parseAmountText("Rp 10.000 \u2026 \u2212Rp 4.000"), -4_000);
  assert.equal(parseAmountText("\u2212Rp 10.000 \u2026 \u2212Rp 4.000"), -4_000);
  assert.equal(parseAmountText("Rp 10.000 \u2026 Rp 4.000"), 4_000);
});
