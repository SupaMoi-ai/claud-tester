import { type Decimal, dec, safeDiv, ZERO } from '../money'
import type { InstrumentWeight } from './allocation'

export type ConcentrationResult = {
  /** Herfindahl-Hirschman index, sum of squared weights, in (0, 1]. */
  readonly hhi: Decimal
  /**
   * 1 / HHI -- the number of equally-sized holdings that would be as
   * concentrated as this portfolio. Far more legible than the index itself:
   * "you effectively own 1.2 things" lands where "HHI 0.81" does not.
   */
  readonly effectiveHoldings: Decimal | null
  readonly top1: Decimal
  readonly top3: Decimal
  readonly largest: InstrumentWeight | null
  readonly count: number
}

/**
 * Concentration of a set of portfolio weights.
 *
 * Returns an empty-but-valid result for an empty portfolio rather than
 * throwing or producing NaN, because "no holdings" is a state the UI renders
 * on day one, before anything has been entered.
 */
export function concentration(weights: readonly InstrumentWeight[]): ConcentrationResult {
  if (weights.length === 0) {
    return { hhi: ZERO, effectiveHoldings: null, top1: ZERO, top3: ZERO, largest: null, count: 0 }
  }

  const sorted = [...weights].sort((a, b) => b.weight.comparedTo(a.weight))

  let hhi = ZERO
  for (const w of sorted) hhi = hhi.plus(w.weight.times(w.weight))

  return {
    hhi,
    effectiveHoldings: safeDiv(dec(1), hhi),
    top1: topNShare(sorted, 1),
    top3: topNShare(sorted, 3),
    largest: sorted[0] ?? null,
    count: sorted.length,
  }
}

/** Combined weight of the `n` largest holdings. */
export function topNShare(weights: readonly InstrumentWeight[], n: number): Decimal {
  if (n <= 0) return ZERO
  return [...weights]
    .sort((a, b) => b.weight.comparedTo(a.weight))
    .slice(0, n)
    .reduce<Decimal>((acc, w) => acc.plus(w.weight), ZERO)
}
