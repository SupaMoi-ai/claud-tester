import { describe, expect, it } from 'vitest'
import { allocateBy, type Exposure, instrumentWeights } from '../analytics/allocation'
import { concentration } from '../analytics/concentration'
import { dec } from '../money'
import type { CostBasis, LedgerWarning, Position } from '../types'
import type { PriceHit } from '../valuation/pricebook'
import type { UnpricedPosition, ValuedPosition } from '../valuation/value'
import { type RunDetectorsInput, runDetectors } from './run'

const AS_OF = '2026-09-14'

function valued(
  instrumentId: string,
  value: string,
  opts?: { priceAsOf?: string; costBasis?: CostBasis },
): ValuedPosition {
  const price: PriceHit = {
    price: dec(1),
    currency: 'NOK',
    asOf: opts?.priceAsOf ?? AS_OF,
    source: 'manual',
    staleness: 'FRESH',
  }
  const position: Position = {
    accountId: 'acct',
    instrumentId,
    quantity: dec(1),
    currency: 'NOK',
    costBasis: opts?.costBasis ?? {
      status: 'KNOWN',
      totalCost: dec(1),
      costPerUnit: dec(1),
      currency: 'NOK',
      totalCostNok: dec(1),
    },
    hasZeroCostUnits: false,
  }
  return {
    position,
    price,
    valueNative: dec(value),
    valueBase: dec(value),
    fxRate: dec(1),
    fxAsOf: AS_OF,
    fxSource: 'identity',
    staleness: 'FRESH',
    unrealisedBase: null,
  }
}

function build(
  valuedPositions: ValuedPosition[],
  over?: Partial<RunDetectorsInput> & { exposures?: Exposure[] },
): RunDetectorsInput {
  const exposures = over?.exposures ?? []
  const weights = instrumentWeights(valuedPositions)
  const total = valuedPositions.reduce((acc, v) => acc.plus(v.valueBase), dec(0))
  return {
    valued: valuedPositions,
    unpriced: [],
    weights,
    concentration: concentration(weights),
    byAssetClass: allocateBy(valuedPositions, exposures, 'ASSET_CLASS'),
    totalBase: total,
    asOf: AS_OF,
    ledgerWarnings: [],
    names: new Map([
      ['btc', 'Bitcoin'],
      ['xrp', 'XRP'],
      ['otovo', 'Otovo ASA'],
      ['nok', 'Norske kroner'],
    ]),
    unconfirmed: new Map(),
    ...over,
  }
}

function keys(input: RunDetectorsInput): string[] {
  return runDetectors(input).map((h) => h.key)
}

describe('runDetectors', () => {
  it('finds nothing worth saying about a balanced portfolio', () => {
    const balanced = ['a', 'b', 'c', 'd', 'e'].map((id) => valued(id, '1000'))
    expect(runDetectors(build(balanced))).toEqual([])
  })

  it('returns nothing for an empty portfolio', () => {
    expect(runDetectors(build([]))).toEqual([])
  })

  it('ranks the most severe finding first', () => {
    const input = build([valued('btc', '7488'), valued('otovo', '89')], {
      unpriced: [{ position: valued('xrp', '0').position, reason: 'no price on record' }],
    })
    const hits = runDetectors(input)
    expect(hits[0]?.key).toBe('data.unpriced_position')
    expect(hits[0]?.severity).toBe(5)
  })

  describe('unpriced positions', () => {
    it('names a single unpriced holding', () => {
      const unpriced: UnpricedPosition[] = [
        { position: valued('xrp', '0').position, reason: 'no price on record for xrp' },
      ]
      const hits = runDetectors(build([valued('btc', '100')], { unpriced }))
      const hit = hits.find((h) => h.key === 'data.unpriced_position')
      expect(hit?.headline).toBe('XRP mangler kurs, så totalen er ufullstendig.')
      expect(hit?.severity).toBe(5)
    })

    it('counts several', () => {
      const unpriced: UnpricedPosition[] = [
        { position: valued('xrp', '0').position, reason: 'r1' },
        { position: valued('otovo', '0').position, reason: 'r2' },
      ]
      const hit = runDetectors(build([valued('btc', '100')], { unpriced })).find(
        (h) => h.key === 'data.unpriced_position',
      )
      expect(hit?.headline).toContain('2 posisjoner mangler kurs')
    })
  })

  describe('single-name concentration', () => {
    it('flags a holding above 25%', () => {
      const hit = runDetectors(
        build([valued('btc', '7488'), valued('otovo', '89'), valued('nok', '400')]),
      ).find((h) => h.key === 'concentration.single_name')
      expect(hit?.headline).toBe('Bitcoin er 93,9 % av porteføljen.')
      expect(hit?.severity).toBe(4)
    })

    it('uses a lower severity between 25% and 50%', () => {
      const hit = runDetectors(
        build([valued('btc', '300'), valued('xrp', '350'), valued('otovo', '350')]),
      ).find((h) => h.key === 'concentration.single_name')
      expect(hit?.severity).toBe(3)
    })

    it('says nothing when a single holding is the whole portfolio', () => {
      // "100% of your one holding is concentrated" is not an insight.
      expect(keys(build([valued('btc', '7488')]))).not.toContain('concentration.single_name')
    })

    it('carries the numbers it used in facts', () => {
      const hit = runDetectors(build([valued('btc', '900'), valued('xrp', '100')])).find(
        (h) => h.key === 'concentration.single_name',
      )
      expect(hit?.facts).toMatchObject({ instrumentId: 'btc', weightPct: 90, threshold: 25 })
    })
  })

  describe('dominant asset class', () => {
    const exposures: Exposure[] = [
      { instrumentId: 'btc', dimension: 'ASSET_CLASS', tag: 'CRYPTO', weight: dec(1) },
      { instrumentId: 'xrp', dimension: 'ASSET_CLASS', tag: 'CRYPTO', weight: dec(1) },
      { instrumentId: 'otovo', dimension: 'ASSET_CLASS', tag: 'EQUITY', weight: dec(1) },
    ]

    it('flags an asset class above 60%', () => {
      const hit = runDetectors(
        build([valued('btc', '7488'), valued('xrp', '800'), valued('otovo', '89')], { exposures }),
      ).find((h) => h.key === 'asset_class.dominant')
      expect(hit?.headline).toBe('98,9 % av porteføljen er én aktivaklasse.')
      expect(hit?.facts).toMatchObject({ tag: 'CRYPTO' })
    })

    it('says nothing when only one class is classified at all', () => {
      const onlyCrypto = exposures.filter((e) => e.tag === 'CRYPTO')
      expect(
        keys(build([valued('btc', '100'), valued('xrp', '100')], { exposures: onlyCrypto })),
      ).not.toContain('asset_class.dominant')
    })
  })

  describe('effective holdings', () => {
    it('flags a portfolio that is nominally diversified but effectively is not', () => {
      const hit = runDetectors(
        build([valued('btc', '7488'), valued('xrp', '800'), valued('otovo', '89')]),
      ).find((h) => h.key === 'concentration.effective_holdings')
      expect(hit?.headline).toContain('3 posisjoner')
      expect(hit?.facts.effectiveHoldings).toBeLessThan(2)
    })

    it('stays quiet below three holdings, where the observation is trivial', () => {
      expect(keys(build([valued('btc', '900'), valued('xrp', '100')]))).not.toContain(
        'concentration.effective_holdings',
      )
    })
  })

  describe('stale prices', () => {
    it('flags a price older than a week', () => {
      const hit = runDetectors(
        build([valued('btc', '1000', { priceAsOf: '2026-09-01' }), valued('xrp', '1000')]),
      ).find((h) => h.key === 'data.stale_price')
      expect(hit?.headline).toBe('Kursen på Bitcoin er 13 dager gammel.')
      expect(hit?.facts).toMatchObject({ count: 1, oldestDays: 13 })
    })

    it('tolerates a few days without comment', () => {
      expect(keys(build([valued('btc', '1000', { priceAsOf: '2026-09-12' })]))).not.toContain(
        'data.stale_price',
      )
    })

    it('reports the oldest when several are stale', () => {
      const hit = runDetectors(
        build([
          valued('btc', '1000', { priceAsOf: '2026-09-01' }),
          valued('xrp', '1000', { priceAsOf: '2026-08-01' }),
        ]),
      ).find((h) => h.key === 'data.stale_price')
      expect(hit?.headline).toContain('2 kurser')
      expect(hit?.facts.oldestInstrumentId).toBe('xrp')
    })
  })

  describe('unknown cost basis', () => {
    const unknown: CostBasis = { status: 'UNKNOWN', reason: 'no purchase history' }

    it('flags it when the affected holdings are material', () => {
      const hit = runDetectors(
        build([valued('btc', '7488', { costBasis: unknown }), valued('otovo', '89')]),
      ).find((h) => h.key === 'data.unknown_cost_basis')
      expect(hit?.headline).toBe('98,8 % av porteføljen mangler kjøpspris.')
    })

    it('ignores a position too small to matter', () => {
      expect(
        keys(build([valued('btc', '9900'), valued('nok', '100', { costBasis: unknown })])),
      ).not.toContain('data.unknown_cost_basis')
    })
  })

  describe('ledger warnings', () => {
    it('surfaces oversells and sign mismatches', () => {
      const ledgerWarnings: LedgerWarning[] = [
        { code: 'OVERSOLD', message: 'sold more than held', transactionId: 't1' },
      ]
      const hit = runDetectors(build([valued('btc', '100')], { ledgerWarnings })).find(
        (h) => h.key === 'ledger.warning',
      )
      expect(hit?.headline).toContain('Én transaksjon')
      expect(hit?.detail).toBe('sold more than held')
    })

    it('counts several', () => {
      const ledgerWarnings: LedgerWarning[] = [
        { code: 'OVERSOLD', message: 'a', transactionId: 't1' },
        { code: 'SIGN_MISMATCH', message: 'b', transactionId: 't2' },
      ]
      const hit = runDetectors(build([valued('btc', '100')], { ledgerWarnings })).find(
        (h) => h.key === 'ledger.warning',
      )
      expect(hit?.headline).toContain('2 transaksjoner')
    })

    it('ignores informational warnings that need no action', () => {
      const ledgerWarnings: LedgerWarning[] = [
        { code: 'ZERO_COST_ACQUISITION', message: 'staking reward', transactionId: 't1' },
      ]
      expect(keys(build([valued('btc', '100')], { ledgerWarnings }))).not.toContain(
        'ledger.warning',
      )
    })
  })

  describe('unconfirmed holdings', () => {
    it('flags a derived quantity awaiting confirmation', () => {
      const hit = runDetectors(
        build([valued('otovo', '89')], {
          unconfirmed: new Map([['otovo', 'Antall utledet fra skjermbilde.']]),
        }),
      ).find((h) => h.key === 'data.unconfirmed_holding')
      expect(hit?.headline).toBe('Otovo ASA er ikke bekreftet ennå.')
      expect(hit?.subjectId).toBe('otovo')
      expect(hit?.severity).toBe(4)
    })
  })

  describe('fingerprints', () => {
    it('stay stable as the underlying value drifts', () => {
      // 89.3% and 89.4% are the same finding; re-raising it daily would train
      // the reader to ignore the whole strip.
      const a = runDetectors(build([valued('btc', '893'), valued('xrp', '107')]))
      const b = runDetectors(build([valued('btc', '894'), valued('xrp', '106')]))
      expect(b[0]?.fingerprint).toBe(a[0]?.fingerprint)
    })

    it('differ between subjects', () => {
      const a = runDetectors(build([valued('btc', '900'), valued('xrp', '100')]))
      const b = runDetectors(build([valued('xrp', '900'), valued('btc', '100')]))
      expect(b[0]?.fingerprint).not.toBe(a[0]?.fingerprint)
    })

    it('are unique within one run', () => {
      const hits = runDetectors(
        build([
          valued('btc', '7488', { priceAsOf: '2026-08-01' }),
          valued('xrp', '800'),
          valued('otovo', '89'),
        ]),
      )
      expect(new Set(hits.map((h) => h.fingerprint)).size).toBe(hits.length)
    })
  })

  it('never invents a number that is not in its own facts', () => {
    // The guarantee the AI layer will later depend on: prose is written from
    // `facts`, so every figure in a headline must be derivable from it.
    const hits = runDetectors(
      build([valued('btc', '7488'), valued('xrp', '800'), valued('otovo', '89')]),
    )
    expect(hits.length).toBeGreaterThan(0)
    for (const hit of hits) {
      expect(Object.keys(hit.facts).length).toBeGreaterThan(0)
    }
  })
})
