import { type Decimal, type DecimalLike, dec } from '@/domain/money'

/**
 * Norwegian number formatting and, more importantly, parsing.
 *
 * Parsing is the dangerous half. Nordnet and Firi emit numbers with
 * non-breaking and narrow no-break space separators, comma decimals, `kr`
 * suffixes, Unicode minus (U+2212) and parenthesised negatives. `parseFloat`
 * silently returns 1 for "1 234,56" -- off by three orders of magnitude, with
 * no error. Every broker-sourced number goes through `parseNbNumber`.
 */

// Defined by code point rather than as literals: these characters are visually
// identical to a plain space in an editor, and telling them apart is this
// file's entire job. A formatter cannot silently normalise them away here.
const NBSP = String.fromCharCode(0x00a0) // no-break space
const NARROW_NBSP = String.fromCharCode(0x202f) // narrow no-break space
const THIN_SPACE = String.fromCharCode(0x2009) // thin space
const UNICODE_MINUS = String.fromCharCode(0x2212) // minus sign, not a hyphen

export type ParseResult =
  | { readonly ok: true; readonly value: Decimal }
  | { readonly ok: false; readonly reason: string }

/**
 * Parses a Norwegian-formatted number.
 *
 * Handles: "1 234,56", "1.234,56", "1 234,56 kr", "-1 234,56", "−1 234,56"
 * (Unicode minus), "(1 234,56)" (parenthesised negative), "1234.56" (plain),
 * and "12,5 %".
 *
 * Returns a discriminated result rather than NaN, so an unparseable cell
 * becomes a visible import error instead of a silent zero.
 */
export function parseNbNumber(input: string): ParseResult {
  const original = input
  let s = input.trim()
  if (s === '') return { ok: false, reason: 'empty' }

  // Parenthesised negatives, as accounting software writes them.
  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1).trim()
  }

  // Currency and percent suffixes/prefixes.
  s = s
    .replace(/\s*(kr|NOK|USD|EUR|SEK|DKK|GBP|%)\s*$/i, '')
    .replace(/^\s*(kr|NOK|USD|EUR|SEK|DKK|GBP)\s*/i, '')
    .trim()

  // Unicode minus and the various non-breaking spaces brokers use as
  // thousands separators.
  s = s
    .replaceAll(UNICODE_MINUS, '-')
    .replaceAll(NBSP, '')
    .replaceAll(NARROW_NBSP, '')
    .replaceAll(THIN_SPACE, '')
    .replaceAll(' ', '')

  if (s.startsWith('-')) {
    negative = !negative
    s = s.slice(1)
  } else if (s.startsWith('+')) {
    s = s.slice(1)
  }

  if (s === '') return { ok: false, reason: `no digits in ${JSON.stringify(original)}` }

  s = normaliseSeparators(s)

  if (!/^\d*\.?\d+$/.test(s)) {
    return { ok: false, reason: `not a number: ${JSON.stringify(original)}` }
  }

  try {
    const value = dec(s)
    return { ok: true, value: negative ? value.negated() : value }
  } catch {
    return { ok: false, reason: `not a number: ${JSON.stringify(original)}` }
  }
}

/**
 * Resolves the comma/period ambiguity.
 *
 * Norwegian uses comma for decimals and period for thousands, but plain
 * machine output uses the opposite. The last separator present wins, which
 * correctly reads both "1.234,56" and "1,234.56", and a lone separator is
 * treated as a thousands grouping only when it is followed by exactly three
 * digits ("1.234" is 1234; "1.23" is 1.23).
 */
function normaliseSeparators(s: string): string {
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')

  if (lastComma >= 0 && lastDot >= 0) {
    return lastComma > lastDot ? s.replaceAll('.', '').replace(',', '.') : s.replaceAll(',', '')
  }

  // A lone comma is always a decimal separator in Norwegian, even with three
  // trailing digits ("1,234" is one-point-two-three-four, not one thousand).
  if (lastComma >= 0) return s.replace(',', '.')

  if (lastDot >= 0) {
    const decimals = s.length - lastDot - 1
    const groupsOnly = decimals === 3 && /^\d{1,3}(\.\d{3})+$/.test(s)
    return groupsOnly ? s.replaceAll('.', '') : s
  }

  return s
}

// ---------------------------------------------------------------- formatting

const nf = (opts: Intl.NumberFormatOptions) => new Intl.NumberFormat('nb-NO', opts)

const KRONER = nf({ minimumFractionDigits: 0, maximumFractionDigits: 0 })
const KRONER_ORE = nf({ minimumFractionDigits: 2, maximumFractionDigits: 2 })
const PERCENT = nf({ minimumFractionDigits: 1, maximumFractionDigits: 1 })

/**
 * Formats a NOK amount.
 *
 * Whole kroner by default: on an 8 000 kr portfolio, øre are noise. Amounts
 * under 100 kr keep two decimals, because there rounding to whole kroner
 * throws away a meaningful share of the number.
 */
export function formatNok(amount: DecimalLike, opts?: { decimals?: 0 | 2 }): string {
  const d = dec(amount)
  const decimals = opts?.decimals ?? (d.abs().lessThan(100) && !d.isZero() ? 2 : 0)
  const formatter = decimals === 2 ? KRONER_ORE : KRONER
  return `${formatter.format(Number(d.toFixed(decimals)))}${NBSP}kr`
}

/** A signed amount, for changes. Uses a real minus sign, not a hyphen. */
export function formatNokDelta(amount: DecimalLike, opts?: { decimals?: 0 | 2 }): string {
  const d = dec(amount)
  const body = formatNok(d.abs(), opts)
  if (d.isZero()) return body
  return `${d.isNegative() ? UNICODE_MINUS : '+'}${body}`
}

/**
 * Formats a ratio in [0,1] as a percentage.
 *
 * Percentages are secondary in this app: a 0.9% move on an 89 kr position is
 * 80 øre, and leading with the percentage makes a rounding error look like
 * news. Lead with `formatNok`, follow with this.
 */
export function formatPercent(ratio: DecimalLike, opts?: { signed?: boolean }): string {
  const d = dec(ratio).times(100)
  const body = `${PERCENT.format(Number(d.abs().toFixed(1)))}${NBSP}%`
  if (!opts?.signed || d.isZero()) return d.isNegative() ? `${UNICODE_MINUS}${body}` : body
  return `${d.isNegative() ? UNICODE_MINUS : '+'}${body}`
}

/**
 * Formats an instrument quantity.
 *
 * Crypto keeps its significant digits (0.01022079 BTC must not become 0.01);
 * share counts render as integers when whole.
 */
export function formatQuantity(quantity: DecimalLike, maxDecimals = 8): string {
  const d = dec(quantity)
  if (d.isInteger()) return nf({ maximumFractionDigits: 0 }).format(Number(d.toFixed(0)))
  const trimmed = d.toDecimalPlaces(maxDecimals).toString()
  return trimmed.replace('.', ',')
}

/** "14. sep." -- for staleness labels. */
export function formatShortDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return isoDate
  return new Intl.DateTimeFormat('nb-NO', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(parsed)
}

/** The em dash used wherever a value is genuinely unavailable. */
export const NO_VALUE = '—'
