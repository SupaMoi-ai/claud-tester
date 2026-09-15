import { type Decimal, type IsoDate, ONE } from '../money'
import type { CorporateAction } from '../types'

/**
 * Corporate-action adjustment.
 *
 * Otovo ASA is the worked example this module exists for: a 10-for-1 reverse
 * split with ex-date 2026-02-03. Eighty shares bought in 2021 are eight shares
 * today, and every price quoted before the ex-date is a tenth of its
 * present-day equivalent. Without this, a holding's history is wrong by 10x
 * and the return calculation is meaningless.
 */

/** Ratio as a single multiplier: `ratioNum / ratioDen`. A 10-for-1 reverse split is 0.1. */
export function actionFactor(action: CorporateAction): Decimal {
  if (action.ratioDen.isZero()) {
    throw new RangeError(`Corporate action ${action.id} has a zero denominator`)
  }
  return action.ratioNum.div(action.ratioDen)
}

/**
 * Cumulative factor converting a quantity recorded on `from` into the share
 * terms in effect on `until`.
 *
 * Actions are applied when `from < exDate <= until`: an action on its ex-date
 * has already taken effect, and one dated before the quantity was recorded is
 * already baked into it.
 */
export function adjustmentFactor(
  actions: readonly CorporateAction[],
  instrumentId: string,
  from: IsoDate,
  until: IsoDate,
): Decimal {
  let factor = ONE
  for (const action of actions) {
    if (action.instrumentId !== instrumentId) continue
    if (action.exDate <= from) continue
    if (action.exDate > until) continue
    factor = factor.times(actionFactor(action))
  }
  return factor
}

/** Restate a historical quantity in present-day shares. */
export function adjustQuantity(quantity: Decimal, factor: Decimal): Decimal {
  return quantity.times(factor)
}

/**
 * Restate a historical price in present-day per-share terms.
 *
 * Inverse of the quantity adjustment, which is what keeps a position's value
 * unchanged across a split: `(q x f) x (p / f) === q x p`. That invariant is
 * asserted as a property test.
 */
export function adjustPrice(price: Decimal, factor: Decimal): Decimal {
  if (factor.isZero()) {
    throw new RangeError('Cannot adjust a price by a zero factor')
  }
  return price.div(factor)
}

/** Actions affecting `instrumentId` within `(from, until]`, in ex-date order. */
export function actionsInRange(
  actions: readonly CorporateAction[],
  instrumentId: string,
  from: IsoDate,
  until: IsoDate,
): CorporateAction[] {
  return actions
    .filter((a) => a.instrumentId === instrumentId && a.exDate > from && a.exDate <= until)
    .sort((a, b) => (a.exDate < b.exDate ? -1 : a.exDate > b.exDate ? 1 : 0))
}
