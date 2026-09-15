import { type Decimal, ratio, ZERO } from '../money'
import type { ValuedPosition } from '../valuation/value'

export type ExposureDimension =
  | 'ASSET_CLASS'
  | 'SECTOR'
  | 'GEOGRAPHY'
  | 'THEME'
  | 'FACTOR'
  | 'CURRENCY'

export type Exposure = {
  readonly instrumentId: string
  readonly dimension: ExposureDimension
  readonly tag: string
  /** Share of the instrument attributed to this tag, in (0, 1]. */
  readonly weight: Decimal
}

export type AllocationSlice = {
  readonly tag: string
  readonly valueBase: Decimal
  /** Share of the priced total, in [0, 1]. */
  readonly weight: Decimal
  readonly instrumentIds: readonly string[]
}

export type AllocationResult = {
  readonly dimension: ExposureDimension
  readonly slices: readonly AllocationSlice[]
  readonly totalBase: Decimal
  /**
   * Value whose instruments carry no exposure tag on this dimension. Reported
   * separately rather than folded into an "Other" slice, because unclassified
   * is a data gap to fix, not a category to own.
   */
  readonly unclassifiedBase: Decimal
}

/**
 * Splits portfolio value across the tags of one exposure dimension.
 *
 * Weights are per-instrument and may sum to less than 1 (partially classified)
 * or, on overlapping dimensions like THEME, to more than 1. The function never
 * normalises them silently -- for ASSET_CLASS and GEOGRAPHY a sum below 1
 * leaves the remainder in `unclassifiedBase`, where it is visible.
 */
export function allocateBy(
  valued: readonly ValuedPosition[],
  exposures: readonly Exposure[],
  dimension: ExposureDimension,
): AllocationResult {
  const byInstrument = new Map<string, Exposure[]>()
  for (const e of exposures) {
    if (e.dimension !== dimension) continue
    const list = byInstrument.get(e.instrumentId)
    if (list) list.push(e)
    else byInstrument.set(e.instrumentId, [e])
  }

  const totals = new Map<string, { value: Decimal; instruments: Set<string> }>()
  let total = ZERO
  let unclassified = ZERO

  for (const v of valued) {
    total = total.plus(v.valueBase)
    const tags = byInstrument.get(v.position.instrumentId)

    if (!tags || tags.length === 0) {
      unclassified = unclassified.plus(v.valueBase)
      continue
    }

    let attributed = ZERO
    for (const tag of tags) {
      const share = v.valueBase.times(tag.weight)
      attributed = attributed.plus(share)
      const slot = totals.get(tag.tag)
      if (slot) {
        slot.value = slot.value.plus(share)
        slot.instruments.add(v.position.instrumentId)
      } else {
        totals.set(tag.tag, {
          value: share,
          instruments: new Set([v.position.instrumentId]),
        })
      }
    }

    const remainder = v.valueBase.minus(attributed)
    if (remainder.greaterThan(0)) unclassified = unclassified.plus(remainder)
  }

  const slices: AllocationSlice[] = [...totals.entries()]
    .map(([tag, slot]) => ({
      tag,
      valueBase: slot.value,
      weight: ratio(slot.value, total) ?? ZERO,
      instrumentIds: [...slot.instruments].sort(),
    }))
    .sort((a, b) => b.valueBase.comparedTo(a.valueBase) || a.tag.localeCompare(b.tag))

  return { dimension, slices, totalBase: total, unclassifiedBase: unclassified }
}

export type InstrumentWeight = {
  readonly instrumentId: string
  readonly valueBase: Decimal
  readonly weight: Decimal
}

/**
 * Portfolio weights per instrument, aggregating the same instrument held
 * across several accounts -- concentration is a property of what you own, not
 * of where you happen to custody it.
 */
export function instrumentWeights(valued: readonly ValuedPosition[]): InstrumentWeight[] {
  const totals = new Map<string, Decimal>()
  let total = ZERO

  for (const v of valued) {
    total = total.plus(v.valueBase)
    const existing = totals.get(v.position.instrumentId)
    totals.set(v.position.instrumentId, existing ? existing.plus(v.valueBase) : v.valueBase)
  }

  return [...totals.entries()]
    .map(([instrumentId, valueBase]) => ({
      instrumentId,
      valueBase,
      weight: ratio(valueBase, total) ?? ZERO,
    }))
    .sort(
      (a, b) => b.valueBase.comparedTo(a.valueBase) || a.instrumentId.localeCompare(b.instrumentId),
    )
}
