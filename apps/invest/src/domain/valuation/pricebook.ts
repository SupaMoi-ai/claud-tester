import { type CurrencyCode, type Decimal, dec, type IsoDate, ONE } from '../money'

export type Staleness = 'FRESH' | 'STALE' | 'VERY_STALE'

/**
 * The core data-integrity type of the application.
 *
 * A lookup is `OK` with provenance, or `MISSING` with a reason. There is no
 * third case, and deliberately no `number | null` anywhere -- a caller cannot
 * accidentally treat an absent price as zero, because `MISSING` carries no
 * numeric field at all. "Never fabricate a price" is therefore a type error
 * rather than a discipline someone has to remember.
 */
export type Lookup<T> =
  | { readonly status: 'OK'; readonly hit: T }
  | { readonly status: 'MISSING'; readonly reason: string }

export function found<T>(hit: T): Lookup<T> {
  return { status: 'OK', hit }
}

export function missing<T>(reason: string): Lookup<T> {
  return { status: 'MISSING', reason }
}

export type PriceHit = {
  readonly price: Decimal
  readonly currency: CurrencyCode
  readonly asOf: IsoDate
  readonly source: string
  readonly staleness: Staleness
}

export type FxHit = {
  readonly rate: Decimal
  readonly base: CurrencyCode
  readonly quote: CurrencyCode
  readonly asOf: IsoDate
  readonly source: string
  readonly staleness: Staleness
}

export interface PriceBook {
  /** Price per unit of `instrumentId`, as known on `on`. */
  at(instrumentId: string, on: IsoDate): Lookup<PriceHit>
}

export interface FxBook {
  /** Units of `quote` per one unit of `base`, as known on `on`. */
  rate(base: CurrencyCode, quote: CurrencyCode, on: IsoDate): Lookup<FxHit>
}

export type PriceRecord = {
  readonly instrumentId: string
  readonly asOf: IsoDate
  readonly price: Decimal
  readonly currency: CurrencyCode
  readonly source: string
}

export type FxRecord = {
  readonly base: CurrencyCode
  readonly quote: CurrencyCode
  readonly asOf: IsoDate
  readonly rate: Decimal
  readonly source: string
}

/** Whole days between two ISO dates. Both are treated as UTC midnight. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  const a = Date.parse(`${from}T00:00:00Z`)
  const b = Date.parse(`${to}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}

export type StalenessThresholds = {
  readonly staleAfterDays: number
  readonly veryStaleAfterDays: number
}

export const DEFAULT_STALENESS: StalenessThresholds = { staleAfterDays: 1, veryStaleAfterDays: 4 }

export function classifyStaleness(
  asOf: IsoDate,
  on: IsoDate,
  thresholds: StalenessThresholds = DEFAULT_STALENESS,
): Staleness {
  const age = daysBetween(asOf, on)
  if (age > thresholds.veryStaleAfterDays) return 'VERY_STALE'
  if (age > thresholds.staleAfterDays) return 'STALE'
  return 'FRESH'
}

/**
 * A `PriceBook` over records already loaded from the database.
 *
 * Resolves the most recent observation at or before the requested date -- the
 * last close is carried forward and labelled stale, never interpolated and
 * never invented. A price dated *after* the requested date is ignored, so
 * historical valuations cannot see the future.
 */
export class RecordPriceBook implements PriceBook {
  private readonly byInstrument: Map<string, PriceRecord[]>

  constructor(
    records: readonly PriceRecord[],
    private readonly thresholds: StalenessThresholds = DEFAULT_STALENESS,
  ) {
    this.byInstrument = new Map()
    for (const r of records) {
      const list = this.byInstrument.get(r.instrumentId)
      if (list) list.push(r)
      else this.byInstrument.set(r.instrumentId, [r])
    }
    for (const list of this.byInstrument.values()) {
      list.sort((a, b) => (a.asOf < b.asOf ? -1 : a.asOf > b.asOf ? 1 : 0))
    }
  }

  at(instrumentId: string, on: IsoDate): Lookup<PriceHit> {
    const list = this.byInstrument.get(instrumentId)
    if (!list || list.length === 0) {
      return missing(`no price on record for instrument ${instrumentId}`)
    }
    const record = latestAtOrBefore(list, on)
    if (!record) {
      const first = list[0]
      return missing(
        `no price for instrument ${instrumentId} on or before ${on}` +
          (first ? ` (earliest known is ${first.asOf})` : ''),
      )
    }
    return found({
      price: record.price,
      currency: record.currency,
      asOf: record.asOf,
      source: record.source,
      staleness: classifyStaleness(record.asOf, on, this.thresholds),
    })
  }
}

/**
 * An `FxBook` over records already loaded from the database.
 *
 * Rates are stored in one direction only (`1 base = rate NOK`); the inverse is
 * derived here rather than in SQL, and a same-currency request short-circuits
 * to exactly 1 without consulting any source.
 */
export class RecordFxBook implements FxBook {
  private readonly byPair: Map<string, FxRecord[]>

  constructor(
    records: readonly FxRecord[],
    private readonly thresholds: StalenessThresholds = DEFAULT_STALENESS,
  ) {
    this.byPair = new Map()
    for (const r of records) {
      const key = pairKey(r.base, r.quote)
      const list = this.byPair.get(key)
      if (list) list.push(r)
      else this.byPair.set(key, [r])
    }
    for (const list of this.byPair.values()) {
      list.sort((a, b) => (a.asOf < b.asOf ? -1 : a.asOf > b.asOf ? 1 : 0))
    }
  }

  rate(base: CurrencyCode, quote: CurrencyCode, on: IsoDate): Lookup<FxHit> {
    if (base === quote) {
      return found({
        rate: ONE,
        base,
        quote,
        asOf: on,
        source: 'identity',
        staleness: 'FRESH' as const,
      })
    }

    const direct = this.resolve(base, quote, on)
    if (direct) return found(direct)

    const inverse = this.resolve(quote, base, on)
    if (inverse && !inverse.rate.isZero()) {
      return found({
        rate: dec(1).div(inverse.rate),
        base,
        quote,
        asOf: inverse.asOf,
        source: `${inverse.source} (inverted)`,
        staleness: classifyStaleness(inverse.asOf, on, this.thresholds),
      })
    }

    return missing(`no FX rate on record for ${base}/${quote} on or before ${on}`)
  }

  private resolve(base: CurrencyCode, quote: CurrencyCode, on: IsoDate): FxHit | null {
    const list = this.byPair.get(pairKey(base, quote))
    if (!list) return null
    const record = latestAtOrBefore(list, on)
    if (!record) return null
    return {
      rate: record.rate,
      base: record.base,
      quote: record.quote,
      asOf: record.asOf,
      source: record.source,
      staleness: classifyStaleness(record.asOf, on, this.thresholds),
    }
  }
}

function pairKey(base: CurrencyCode, quote: CurrencyCode): string {
  return `${base}/${quote}`
}

/** Binary search for the last element with `asOf <= on`. Lists are pre-sorted. */
function latestAtOrBefore<T extends { asOf: IsoDate }>(
  sorted: readonly T[],
  on: IsoDate,
): T | null {
  let lo = 0
  let hi = sorted.length - 1
  let best: T | null = null
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const candidate = sorted[mid]
    if (!candidate) break
    if (candidate.asOf <= on) {
      best = candidate
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return best
}
