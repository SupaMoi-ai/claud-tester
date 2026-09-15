import { type CurrencyCode, type Decimal, type IsoDate, ZERO } from '../money'
import type { Position } from '../types'
import type { FxBook, PriceBook, PriceHit, Staleness } from './pricebook'

export type ValuedPosition = {
  readonly position: Position
  readonly price: PriceHit
  /** Quantity x price, in the price's own currency. */
  readonly valueNative: Decimal
  /** The same value converted to the base currency. */
  readonly valueBase: Decimal
  readonly fxRate: Decimal
  readonly fxAsOf: IsoDate
  readonly fxSource: string
  /** The worse of the price and FX staleness -- a value is only as fresh as its inputs. */
  readonly staleness: Staleness
  /** Unrealised gain in base currency. Null when cost basis is unknown. */
  readonly unrealisedBase: Decimal | null
}

export type UnpricedPosition = {
  readonly position: Position
  readonly reason: string
}

export type ValuationResult = {
  readonly base: CurrencyCode
  readonly asOf: IsoDate
  readonly valued: readonly ValuedPosition[]
  readonly unpriced: readonly UnpricedPosition[]
  /** Sum of the positions that *could* be valued. Never silently includes the rest. */
  readonly totalBase: Decimal
  readonly coverage: { readonly priced: number; readonly total: number }
  /**
   * False when at least one position could not be valued. The UI must render
   * the total as partial ("8 378 kr* - 3 av 4 posisjoner priset") rather than
   * presenting an incomplete sum as if it were the whole portfolio.
   */
  readonly complete: boolean
}

const STALENESS_RANK: Readonly<Record<Staleness, number>> = { FRESH: 0, STALE: 1, VERY_STALE: 2 }

function worse(a: Staleness, b: Staleness): Staleness {
  return STALENESS_RANK[a] >= STALENESS_RANK[b] ? a : b
}

export type ValuePositionsInput = {
  readonly positions: readonly Position[]
  readonly prices: PriceBook
  readonly fx: FxBook
  readonly asOf: IsoDate
  readonly base: CurrencyCode
}

/**
 * Values a set of positions in the base currency.
 *
 * A position whose price or FX rate is unavailable goes to `unpriced` with the
 * reason, and contributes nothing to `totalBase`. It is never valued at zero,
 * never carried at cost as a substitute, and never quietly dropped -- the
 * caller always learns that the total is partial via `complete` and `coverage`.
 */
export function valuePositions(input: ValuePositionsInput): ValuationResult {
  const { positions, prices, fx, asOf, base } = input

  const valued: ValuedPosition[] = []
  const unpriced: UnpricedPosition[] = []
  let total = ZERO

  for (const position of positions) {
    const priceLookup = prices.at(position.instrumentId, asOf)
    if (priceLookup.status === 'MISSING') {
      unpriced.push({ position, reason: priceLookup.reason })
      continue
    }
    const price = priceLookup.hit

    const fxLookup = fx.rate(price.currency, base, asOf)
    if (fxLookup.status === 'MISSING') {
      unpriced.push({ position, reason: fxLookup.reason })
      continue
    }
    const rate = fxLookup.hit

    const valueNative = position.quantity.times(price.price)
    const valueBase = valueNative.times(rate.rate)
    total = total.plus(valueBase)

    valued.push({
      position,
      price,
      valueNative,
      valueBase,
      fxRate: rate.rate,
      fxAsOf: rate.asOf,
      fxSource: rate.source,
      staleness: worse(price.staleness, rate.staleness),
      unrealisedBase: unrealised(position, valueBase),
    })
  }

  valued.sort((a, b) => b.valueBase.comparedTo(a.valueBase))

  return {
    base,
    asOf,
    valued,
    unpriced,
    totalBase: total,
    coverage: { priced: valued.length, total: positions.length },
    complete: unpriced.length === 0,
  }
}

/**
 * Unrealised gain against cost, in base currency.
 *
 * Requires a NOK cost basis captured at the transaction's own FX rate; when
 * that is absent the answer is null rather than a figure computed at today's
 * rate, which would silently fold currency movement into the security return.
 */
function unrealised(position: Position, valueBase: Decimal): Decimal | null {
  const cost = position.costBasis
  if (cost.status !== 'KNOWN') return null
  if (cost.totalCostNok === null) return null
  return valueBase.minus(cost.totalCostNok)
}
