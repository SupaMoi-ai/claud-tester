import Decimal from 'decimal.js'

/**
 * Configured once, for the whole domain layer.
 *
 * 40 significant digits comfortably round-trips `numeric(38,18)` quantities
 * (0.01022079 BTC must survive exactly) and `numeric(28,10)` money. Banker's
 * rounding avoids the systematic upward bias of ROUND_HALF_UP when many small
 * amounts are summed.
 *
 * toExpNeg/toExpPos are pushed out so `toString()` never produces exponential
 * notation -- a "1e-8 BTC" leaking into a UI or a SQL literal is a real bug.
 */
Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -30,
  toExpPos: 40,
})

export { Decimal }

/** ISO-4217 for fiat ('NOK', 'USD'), or an asset symbol for crypto ('BTC'). */
export type CurrencyCode = string

/** ISO-8601 calendar date, `YYYY-MM-DD`, on the Europe/Oslo calendar. */
export type IsoDate = string

export const NOK: CurrencyCode = 'NOK'

export const ZERO = new Decimal(0)
export const ONE = new Decimal(1)

export type DecimalLike = Decimal | string | number

/**
 * Numbers arrive from Postgres as strings (see CLAUDE.md -- PostgREST would
 * serialise `numeric` to a float and lose precision). Accepting `number` here
 * is a convenience for tests and literal constants only.
 */
export function dec(value: DecimalLike): Decimal {
  return value instanceof Decimal ? value : new Decimal(value)
}

export type Money = {
  readonly amount: Decimal
  readonly currency: CurrencyCode
}

export function money(amount: DecimalLike, currency: CurrencyCode): Money {
  return { amount: dec(amount), currency }
}

export function zeroMoney(currency: CurrencyCode): Money {
  return { amount: ZERO, currency }
}

export class CurrencyMismatchError extends Error {
  constructor(a: CurrencyCode, b: CurrencyCode) {
    super(`Cannot combine ${a} and ${b}: convert to a common currency first`)
    this.name = 'CurrencyMismatchError'
  }
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new CurrencyMismatchError(a.currency, b.currency)
  return { amount: a.amount.plus(b.amount), currency: a.currency }
}

export function subMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new CurrencyMismatchError(a.currency, b.currency)
  return { amount: a.amount.minus(b.amount), currency: a.currency }
}

export function sumMoney(items: readonly Money[], currency: CurrencyCode): Money {
  return items.reduce<Money>((acc, m) => addMoney(acc, m), zeroMoney(currency))
}

export function scaleMoney(m: Money, factor: DecimalLike): Money {
  return { amount: m.amount.times(dec(factor)), currency: m.currency }
}

/**
 * Safe division. Returns null on a zero denominator rather than Infinity or
 * NaN -- both of which would render as a plausible-looking number downstream.
 */
export function safeDiv(numerator: Decimal, denominator: Decimal): Decimal | null {
  if (denominator.isZero()) return null
  return numerator.div(denominator)
}

/** A fraction of a whole, as a ratio in [0, 1]. Null when the whole is zero. */
export function ratio(part: Decimal, whole: Decimal): Decimal | null {
  return safeDiv(part, whole)
}
