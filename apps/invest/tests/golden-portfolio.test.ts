import { describe, expect, it } from 'vitest'
import { instrumentWeights } from '@/domain/analytics/allocation'
import { concentration } from '@/domain/analytics/concentration'
import { derivePositions } from '@/domain/ledger/positions'
import { dec } from '@/domain/money'
import { RecordFxBook, RecordPriceBook } from '@/domain/valuation/pricebook'
import { valuePositions } from '@/domain/valuation/value'
import { AS_OF, CORPORATE_ACTIONS, FX, PRICES, TRANSACTIONS } from './fixtures/portfolio'

/**
 * End-to-end regression net over the real portfolio.
 *
 * Every assertion here is an exact decimal string, not a float comparison. If
 * one of these changes, either the ledger, the split adjustment, the valuation
 * or the weighting broke -- and this suite says which.
 */
describe('golden portfolio (real holdings, 2026-09-14)', () => {
  const positions = derivePositions({
    transactions: TRANSACTIONS,
    corporateActions: CORPORATE_ACTIONS,
    asOf: AS_OF,
  })

  const valuation = valuePositions({
    positions: positions.positions,
    prices: new RecordPriceBook(PRICES),
    fx: new RecordFxBook(FX),
    asOf: AS_OF,
    base: 'NOK',
  })

  it('derives four positions', () => {
    expect(positions.positions).toHaveLength(4)
  })

  it('restates Otovo from 80 pre-split shares to 8 post-split shares', () => {
    const otovo = positions.positions.find((p) => p.instrumentId === 'otovo')
    expect(otovo?.quantity.toString()).toBe('8')
  })

  it('restates the Otovo cost basis to 144.06 NOK per post-split share', () => {
    const otovo = positions.positions.find((p) => p.instrumentId === 'otovo')
    expect(otovo?.costBasis.status).toBe('KNOWN')
    if (otovo?.costBasis.status !== 'KNOWN') throw new Error('unreachable')

    // 80 x 14.406 pre-split = 1152.48 NOK total, unchanged by the split.
    expect(otovo.costBasis.totalCost.toString()).toBe('1152.48')
    expect(otovo.costBasis.costPerUnit.toString()).toBe('144.06')
  })

  it('preserves crypto quantities exactly, with no float drift', () => {
    const btc = positions.positions.find((p) => p.instrumentId === 'btc')
    const xrp = positions.positions.find((p) => p.instrumentId === 'xrp')
    expect(btc?.quantity.toString()).toBe('0.01022079')
    expect(xrp?.quantity.toString()).toBe('60.950208')
  })

  it('reports the Firi holdings as cost-basis-unknown rather than zero', () => {
    const btc = positions.positions.find((p) => p.instrumentId === 'btc')
    expect(btc?.costBasis.status).toBe('UNKNOWN')
    if (btc?.costBasis.status !== 'UNKNOWN') throw new Error('unreachable')
    expect(btc.costBasis.reason).toMatch(/unknown rather than zero/)
  })

  it('values every position and reports complete coverage', () => {
    expect(valuation.complete).toBe(true)
    expect(valuation.coverage).toEqual({ priced: 4, total: 4 })
    expect(valuation.unpriced).toHaveLength(0)
  })

  it('reproduces the screenshot values to the øre', () => {
    const byId = new Map(valuation.valued.map((v) => [v.position.instrumentId, v]))
    expect(byId.get('btc')?.valueBase.toDecimalPlaces(2).toString()).toBe('7488.01')
    expect(byId.get('xrp')?.valueBase.toDecimalPlaces(2).toString()).toBe('800.89')
    expect(byId.get('nok')?.valueBase.toString()).toBe('0.01')
    // Nordnet displays 89; 8 x 11.15 is 89.20. The computed value wins.
    expect(byId.get('otovo')?.valueBase.toString()).toBe('89.2')
  })

  it('totals 8 378.11 NOK', () => {
    expect(valuation.totalBase.toDecimalPlaces(2).toString()).toBe('8378.11')
  })

  it('computes the Otovo unrealised loss against its derived cost', () => {
    const otovo = valuation.valued.find((v) => v.position.instrumentId === 'otovo')
    // 89.20 - 1152.48
    expect(otovo?.unrealisedBase?.toString()).toBe('-1063.28')
  })

  it('reports no unrealised figure where cost basis is unknown', () => {
    const btc = valuation.valued.find((v) => v.position.instrumentId === 'btc')
    expect(btc?.unrealisedBase).toBeNull()
  })

  describe('structure', () => {
    const weights = instrumentWeights(valuation.valued)
    const conc = concentration(weights)

    it('is 98.94% crypto', () => {
      const crypto = weights
        .filter((w) => w.instrumentId === 'btc' || w.instrumentId === 'xrp')
        .reduce((acc, w) => acc.plus(w.weight), dec(0))
      expect(crypto.times(100).toDecimalPlaces(2).toString()).toBe('98.94')
    })

    it('is 89.38% Bitcoin alone', () => {
      const btc = weights.find((w) => w.instrumentId === 'btc')
      expect(btc?.weight.times(100).toDecimalPlaces(2).toString()).toBe('89.38')
    })

    it('leaves Otovo at 1.06% -- a rounding error in portfolio terms', () => {
      const otovo = weights.find((w) => w.instrumentId === 'otovo')
      expect(otovo?.weight.times(100).toDecimalPlaces(2).toString()).toBe('1.06')
    })

    it('has an HHI of 0.808, i.e. 1.24 effective holdings', () => {
      expect(conc.hhi.toDecimalPlaces(6).toString()).toBe('0.808056')
      expect(conc.effectiveHoldings?.toDecimalPlaces(2).toString()).toBe('1.24')
      expect(conc.largest?.instrumentId).toBe('btc')
    })
  })
})
