/**
 * Rupiah formatting/parsing per UI_SPEC.md:
 * `Rp 212.121` — dot thousands separators, no decimals, U+2212 minus for
 * negatives (never "Rp -212.121").
 */

/** 1234567 -> "Rp 1.234.567" */
export function formatRp(amount: number): string {
  return `Rp ${amount.toLocaleString('de-DE')}`
}

/** -50000 -> "\u2212Rp 50.000" (U+2212 minus, as the app renders it) */
export function formatNegativeRp(amount: number): string {
  return `\u2212Rp ${Math.abs(amount).toLocaleString('de-DE')}`
}

/** Signed display used in transaction rows/day totals: expenses render "\u2212Rp 50.000". */
export function formatSignedRp(amount: number): string {
  return amount < 0 ? formatNegativeRp(amount) : formatRp(amount)
}

/**
 * "Rp 1.234.567" | "\u2212Rp 50.000" | "Masuk Rp 250.000" | "\u2212671,1%" -> 1234567 | -50000 | 250000 | -671.1
 * Takes the last numeric run so leading labels ("Masuk", "SALDO BERSIH") are
 * ignored; treats U+2212 and ASCII '-' as minus, dots as thousands, comma as
 * decimal. Each run is signed by the minus preceding IT, so mixed-sign
 * comparison rows ("\u2212Rp 50.000 \u2026 Rp 25.000") parse to 25000.
 */
export function parseAmountText(text: string): number {
  const normalized = text.replace(/\u2212/g, '-')
  // Iterate the numeric runs with their indices: each run's sign is carried
  // by the gap immediately before it — the text between the previous run's
  // end (or the string start) and this run's start. Checking the gap (not
  // the whole string head, R9) keeps a minus on an EARLIER run from leaking
  // into the last one: "\u2212Rp 50.000 \u2026 Rp 25.000" -> 25000.
  const runs = [...normalized.matchAll(/\d[\d.,]*/g)]
  const last = runs[runs.length - 1]
  if (!last) {
    throw new Error(`Cannot parse amount from text: "${text}"`)
  }
  // Drop thousand dots, then treat a trailing comma group as decimals.
  const cleaned = last[0].replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
  const value = Number(cleaned)
  if (Number.isNaN(value)) {
    throw new Error(`Cannot parse amount from text: "${text}"`)
  }
  // A minus in that gap signs the run wherever it renders — directly before
  // the digits ("-671,1%") or before the currency ("\u2212Rp 75.000",
  // "\u2026 \u2212Rp 4.000").
  const previous = runs[runs.length - 2]
  const gapStart = previous ? (previous.index ?? 0) + previous[0].length : 0
  const negative = normalized.slice(gapStart, last.index).includes('-')
  return negative && value > 0 ? -value : value
}

/** Indonesian savings-rate rendering: 75 -> "75,0%", -12.25 -> "−12,3%" (1 decimal, comma). */
export function formatSavingsRate(rate: number): string {
  const sign = rate < 0 ? '\u2212' : ''
  const abs = Math.abs(rate).toFixed(1).replace('.', ',')
  return `${sign}${abs}%`
}
