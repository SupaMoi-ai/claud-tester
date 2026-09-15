import type { AllocationResult, InstrumentWeight } from '../analytics/allocation'
import type { ConcentrationResult } from '../analytics/concentration'
import { type Decimal, dec } from '../money'
import type { LedgerWarning } from '../types'
import { daysBetween } from '../valuation/pricebook'
import type { UnpricedPosition, ValuedPosition } from '../valuation/value'
import type { DetectorHit, Severity } from './types'

export type { DetectorHit, DetectorKey, Severity } from './types'

/** Thresholds, in one place so they can be tuned without hunting through code. */
export const THRESHOLDS = {
  singleNameWeight: dec('0.25'),
  dominantAssetClassWeight: dec('0.60'),
  effectiveHoldings: 2,
  unknownCostBasisWeight: dec('0.05'),
  stalePriceDays: 7,
} as const

export type RunDetectorsInput = {
  readonly valued: readonly ValuedPosition[]
  readonly unpriced: readonly UnpricedPosition[]
  readonly weights: readonly InstrumentWeight[]
  readonly concentration: ConcentrationResult
  readonly byAssetClass: AllocationResult
  readonly totalBase: Decimal
  readonly asOf: string
  readonly ledgerWarnings: readonly LedgerWarning[]
  /** Display name per instrument id, so findings read in plain language. */
  readonly names: ReadonlyMap<string, string>
  /** Instruments whose quantity or cost basis the user has not yet confirmed. */
  readonly unconfirmed: ReadonlyMap<string, string>
}

/**
 * Runs every detector and returns findings, most severe first.
 *
 * Pure, and therefore testable: the same portfolio always produces the same
 * findings in the same order. Nothing here asks a model anything.
 */
export function runDetectors(input: RunDetectorsInput): DetectorHit[] {
  const hits: DetectorHit[] = [
    ...detectUnpriced(input),
    ...detectUnconfirmed(input),
    ...detectSingleNameConcentration(input),
    ...detectDominantAssetClass(input),
    ...detectEffectiveHoldings(input),
    ...detectStalePrices(input),
    ...detectUnknownCostBasis(input),
    ...detectLedgerWarnings(input),
  ]

  return hits.sort((a, b) => b.severity - a.severity || a.key.localeCompare(b.key))
}

function pct(value: Decimal): string {
  return `${value.times(100).toDecimalPlaces(1).toString().replace('.', ',')} %`
}

function nameOf(input: RunDetectorsInput, id: string): string {
  return input.names.get(id) ?? id
}

/**
 * A position the app cannot value.
 *
 * Ranked above everything else: while this is true, every other number on the
 * screen is a partial truth, and the person needs to know that first.
 */
function detectUnpriced(input: RunDetectorsInput): DetectorHit[] {
  if (input.unpriced.length === 0) return []
  const names = input.unpriced.map((u) => nameOf(input, u.position.instrumentId))
  return [
    {
      key: 'data.unpriced_position',
      severity: 5,
      headline:
        input.unpriced.length === 1
          ? `${names[0]} mangler kurs, så totalen er ufullstendig.`
          : `${input.unpriced.length} posisjoner mangler kurs, så totalen er ufullstendig.`,
      detail: input.unpriced[0]?.reason ?? '',
      facts: { count: input.unpriced.length, instruments: names.join(', ') },
      fingerprint: `data.unpriced_position:${names.slice().sort().join('|')}`,
    },
  ]
}

/** A holding whose quantity or cost was derived rather than recorded. */
function detectUnconfirmed(input: RunDetectorsInput): DetectorHit[] {
  return [...input.unconfirmed.entries()].map(([instrumentId, reason]) => ({
    key: 'data.unconfirmed_holding' as const,
    severity: 4 as Severity,
    headline: `${nameOf(input, instrumentId)} er ikke bekreftet ennå.`,
    detail: reason,
    subjectId: instrumentId,
    facts: { instrumentId, reason },
    fingerprint: `data.unconfirmed_holding:${instrumentId}`,
  }))
}

function detectSingleNameConcentration(input: RunDetectorsInput): DetectorHit[] {
  const largest = input.concentration.largest
  if (!largest || largest.weight.lessThanOrEqualTo(THRESHOLDS.singleNameWeight)) return []
  if (input.weights.length < 2) return []

  return [
    {
      key: 'concentration.single_name',
      severity: largest.weight.greaterThan('0.5') ? 4 : 3,
      headline: `${nameOf(input, largest.instrumentId)} er ${pct(largest.weight)} av porteføljen.`,
      detail:
        'Én posisjon av denne størrelsen bestemmer i praksis hvordan hele porteføljen beveger seg.',
      subjectId: largest.instrumentId,
      facts: {
        instrumentId: largest.instrumentId,
        weightPct: largest.weight.times(100).toDecimalPlaces(2).toNumber(),
        threshold: THRESHOLDS.singleNameWeight.times(100).toNumber(),
      },
      fingerprint: `concentration.single_name:${largest.instrumentId}`,
    },
  ]
}

function detectDominantAssetClass(input: RunDetectorsInput): DetectorHit[] {
  const top = input.byAssetClass.slices[0]
  if (!top || top.weight.lessThanOrEqualTo(THRESHOLDS.dominantAssetClassWeight)) return []
  if (input.byAssetClass.slices.length < 2) return []

  return [
    {
      key: 'asset_class.dominant',
      severity: 3,
      headline: `${pct(top.weight)} av porteføljen er én aktivaklasse.`,
      detail:
        'Risikoen din kommer i hovedsak fra én kilde. En investering i samme klasse forsterker ' +
        'den eksponeringen, mens en annen klasse gir en annen kilde til avkastning.',
      facts: {
        tag: top.tag,
        weightPct: top.weight.times(100).toDecimalPlaces(2).toNumber(),
      },
      fingerprint: `asset_class.dominant:${top.tag}`,
    },
  ]
}

function detectEffectiveHoldings(input: RunDetectorsInput): DetectorHit[] {
  const effective = input.concentration.effectiveHoldings
  if (!effective) return []
  if (input.concentration.count < 3) return []
  if (effective.greaterThanOrEqualTo(THRESHOLDS.effectiveHoldings)) return []

  return [
    {
      key: 'concentration.effective_holdings',
      severity: 2,
      headline: `${input.concentration.count} posisjoner, men konsentrasjonen tilsvarer ${effective
        .toDecimalPlaces(1)
        .toString()
        .replace('.', ',')}.`,
      detail: 'De minste posisjonene påvirker resultatet lite uansett hva som skjer med dem.',
      facts: {
        count: input.concentration.count,
        effectiveHoldings: effective.toDecimalPlaces(2).toNumber(),
        hhi: input.concentration.hhi.toDecimalPlaces(4).toNumber(),
      },
      fingerprint: 'concentration.effective_holdings',
    },
  ]
}

function detectStalePrices(input: RunDetectorsInput): DetectorHit[] {
  const stale = input.valued
    .map((v) => ({ v, age: daysBetween(v.price.asOf, input.asOf) }))
    .filter(({ age }) => age > THRESHOLDS.stalePriceDays)

  if (stale.length === 0) return []

  const oldest = stale.reduce((a, b) => (a.age >= b.age ? a : b))
  return [
    {
      key: 'data.stale_price',
      severity: 3,
      headline:
        stale.length === 1
          ? `Kursen på ${nameOf(input, oldest.v.position.instrumentId)} er ${oldest.age} dager gammel.`
          : `${stale.length} kurser er mer enn ${THRESHOLDS.stalePriceDays} dager gamle.`,
      detail: 'Verdiene bygger på siste kjente kurs, ikke på dagens.',
      subjectId: oldest.v.position.instrumentId,
      facts: {
        count: stale.length,
        oldestDays: oldest.age,
        oldestInstrumentId: oldest.v.position.instrumentId,
      },
      fingerprint: `data.stale_price:${stale
        .map((s) => s.v.position.instrumentId)
        .sort()
        .join('|')}`,
    },
  ]
}

/**
 * Unknown cost basis on a position large enough to matter.
 *
 * Not a data-entry nag: without a cost basis there is no return figure at all
 * for that holding, so a chunk of "how am I doing?" is simply unanswerable.
 */
function detectUnknownCostBasis(input: RunDetectorsInput): DetectorHit[] {
  const affected = input.valued.filter((v) => {
    if (v.position.costBasis.status === 'KNOWN') return false
    const weight = input.totalBase.isZero() ? dec(0) : v.valueBase.div(input.totalBase)
    return weight.greaterThan(THRESHOLDS.unknownCostBasisWeight)
  })

  if (affected.length === 0) return []

  const share = affected
    .reduce((acc, v) => acc.plus(v.valueBase), dec(0))
    .div(input.totalBase.isZero() ? dec(1) : input.totalBase)

  return [
    {
      key: 'data.unknown_cost_basis',
      severity: 2,
      headline: `${pct(share)} av porteføljen mangler kjøpspris.`,
      detail: 'Uten kjøpspris kan avkastningen på disse posisjonene ikke beregnes.',
      facts: {
        count: affected.length,
        sharePct: share.times(100).toDecimalPlaces(2).toNumber(),
        instruments: affected.map((v) => v.position.instrumentId).join(', '),
      },
      fingerprint: `data.unknown_cost_basis:${affected
        .map((v) => v.position.instrumentId)
        .sort()
        .join('|')}`,
    },
  ]
}

/** Ledger integrity problems surfaced by the replay -- oversells, bad signs. */
function detectLedgerWarnings(input: RunDetectorsInput): DetectorHit[] {
  const serious = input.ledgerWarnings.filter(
    (w) => w.code === 'OVERSOLD' || w.code === 'NEGATIVE_POSITION' || w.code === 'SIGN_MISMATCH',
  )
  if (serious.length === 0) return []

  const first = serious[0]
  return [
    {
      key: 'ledger.warning',
      severity: 4,
      headline:
        serious.length === 1
          ? 'Én transaksjon ser ut til å mangle eller være feilført.'
          : `${serious.length} transaksjoner ser ut til å mangle eller være feilført.`,
      detail: first?.message ?? '',
      facts: { count: serious.length, codes: serious.map((w) => w.code).join(', ') },
      fingerprint: `ledger.warning:${serious
        .map((w) => `${w.code}:${w.transactionId ?? w.instrumentId ?? ''}`)
        .sort()
        .join('|')}`,
    },
  ]
}
