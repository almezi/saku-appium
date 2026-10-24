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
 * decimal.
 */
export function parseAmountText(text: string): number {
  const normalized = text.replace(/\u2212/g, '-')
  const matches = normalized.match(/-?\d[\d.,]*/g)
  const last = matches?.[matches.length - 1]
  if (!last) {
    throw new Error(`Cannot parse amount from text: "${text}"`)
  }
  // Drop thousand dots, then treat a trailing comma group as decimals.
  const cleaned = last.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
  const value = Number(cleaned)
  if (Number.isNaN(value)) {
    throw new Error(`Cannot parse amount from text: "${text}"`)
  }
  return value
}

/** Indonesian savings-rate rendering: 75 -> "75,0%", -12.25 -> "−12,3%" (1 decimal, comma). */
export function formatSavingsRate(rate: number): string {
  const sign = rate < 0 ? '\u2212' : ''
  const abs = Math.abs(rate).toFixed(1).replace('.', ',')
  return `${sign}${abs}%`
}
