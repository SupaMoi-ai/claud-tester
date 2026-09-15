import { type Decimal, ONE, safeDiv } from '../money'

export type ReturnDecomposition = {
  /** Return from the security's own price move, in its quote currency. */
  readonly security: Decimal
  /** Return from the quote currency moving against the base currency. */
  readonly fx: Decimal
  /**
   * The cross term, security x fx.
   *
   * Reported separately and never silently folded into either leg. On a
   * position that doubled while the krone weakened 10%, the interaction is a
   * real 10 percentage points that belongs to neither the company nor the
   * currency, and attributing it to one of them is how "my stock returns"
   * stop adding up to the portfolio return.
   */
  readonly interaction: Decimal
  /** (1 + security)(1 + fx) - 1. Exact, not a sum of approximations. */
  readonly total: Decimal
}

export type DecomposeInput = {
  /** Price per unit at the start, in the security's quote currency. */
  readonly priceStart: Decimal
  readonly priceEnd: Decimal
  /** Units of base currency per one unit of quote currency. */
  readonly fxStart: Decimal
  readonly fxEnd: Decimal
}

/**
 * Splits a foreign holding's return into what the asset did and what the
 * currency did.
 *
 * This is the calculation a Norwegian investor most needs and most trackers
 * omit: a US stock up 5% while USD/NOK falls 6% is a loss in kroner, and
 * knowing which half hurt changes what you do about it.
 *
 * Returns null if either starting value is zero, rather than dividing by zero.
 */
export function decomposeReturn(input: DecomposeInput): ReturnDecomposition | null {
  const securityRatio = safeDiv(input.priceEnd, input.priceStart)
  const fxRatio = safeDiv(input.fxEnd, input.fxStart)
  if (securityRatio === null || fxRatio === null) return null

  const security = securityRatio.minus(ONE)
  const fx = fxRatio.minus(ONE)

  return {
    security,
    fx,
    interaction: security.times(fx),
    total: securityRatio.times(fxRatio).minus(ONE),
  }
}
