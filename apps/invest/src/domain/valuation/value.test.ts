import { describe, expect, it } from 'vitest'
import { type Decimal, dec } from '../money'
import type { CostBasis, Position } from '../types'
import { type FxRecord, type PriceRecord, RecordFxBook, RecordPriceBook } from './pricebook'
import { valuePositions } from './value'

const KNOWN_COST = (total: string, perUnit: string, nok: string | null): CostBasis => ({
  status: 'KNOWN',
  totalCost: dec(total),
  costPerUnit: dec(perUnit),
  currency: 'NOK',
  totalCostNok: nok === null ? null : dec(nok),
})

function pos(over: Partial<Position> & { instrumentId: string; quantity: Decimal }): Position {
  return {
    accountId: 'acct',
    currency: 'NOK',
    costBasis: { status: 'UNKNOWN', reason: 'test' },
    hasZeroCostUnits: false,
    ...over,
  }
}

const AS_OF = '2026-09-14'

const prices: PriceRecord[] = [
  { instrumentId: 'otovo', asOf: AS_OF, price: dec('11.15'), currency: 'NOK', source: 'eodhd' },
  { instrumentId: 'aapl', asOf: AS_OF, price: dec('220'), currency: 'USD', source: 'eodhd' },
  { instrumentId: 'old', asOf: '2026-08-01', price: dec('5'), currency: 'NOK', source: 'manual' },
]

const fx: FxRecord[] = [
  { base: 'USD', quote: 'NOK', asOf: AS_OF, rate: dec('10.42'), source: 'norgesbank' },
]

function value(positions: Position[]) {
  return valuePositions({
    positions,
    prices: new RecordPriceBook(prices),
    fx: new RecordFxBook(fx),
    asOf: AS_OF,
    base: 'NOK',
  })
}

describe('valuePositions', () => {
  it('values a domestic holding', () => {
    const result = value([pos({ instrumentId: 'otovo', quantity: dec(8) })])
    expect(result.valued[0]?.valueBase.toString()).toBe('89.2')
    expect(result.totalBase.toString()).toBe('89.2')
    expect(result.complete).toBe(true)
  })

  it('converts a foreign holding at the base-currency rate', () => {
    const result = value([pos({ instrumentId: 'aapl', quantity: dec(3) })])
    const valued = result.valued[0]
    expect(valued?.valueNative.toString()).toBe('660')
    expect(valued?.valueBase.toString()).toBe('6877.2')
    expect(valued?.fxRate.toString()).toBe('10.42')
    expect(valued?.fxSource).toBe('norgesbank')
  })

  it('excludes an unpriced position from the total instead of valuing it at zero', () => {
    const result = value([
      pos({ instrumentId: 'otovo', quantity: dec(8) }),
      pos({ instrumentId: 'ghost', quantity: dec(100) }),
    ])
    expect(result.totalBase.toString()).toBe('89.2')
    expect(result.complete).toBe(false)
    expect(result.coverage).toEqual({ priced: 1, total: 2 })
    expect(result.unpriced[0]?.reason).toContain('no price on record')
  })

  it('excludes a position whose FX rate is missing', () => {
    const result = valuePositions({
      positions: [pos({ instrumentId: 'aapl', quantity: dec(3) })],
      prices: new RecordPriceBook(prices),
      fx: new RecordFxBook([]),
      asOf: AS_OF,
      base: 'NOK',
    })
    expect(result.complete).toBe(false)
    expect(result.totalBase.toString()).toBe('0')
    expect(result.unpriced[0]?.reason).toContain('USD/NOK')
  })

  it('reports an empty portfolio as complete with a zero total', () => {
    const result = value([])
    expect(result.complete).toBe(true)
    expect(result.totalBase.toString()).toBe('0')
    expect(result.coverage).toEqual({ priced: 0, total: 0 })
  })

  it('sorts holdings by value, largest first', () => {
    const result = value([
      pos({ instrumentId: 'otovo', quantity: dec(8) }),
      pos({ instrumentId: 'aapl', quantity: dec(1) }),
    ])
    expect(result.valued.map((v) => v.position.instrumentId)).toEqual(['aapl', 'otovo'])
  })

  describe('staleness', () => {
    it('takes the worse of the price and FX staleness', () => {
      // Price is fresh, FX is four days old -> the value is only as fresh as FX.
      const result = valuePositions({
        positions: [pos({ instrumentId: 'aapl', quantity: dec(1) })],
        prices: new RecordPriceBook(prices),
        fx: new RecordFxBook([
          { base: 'USD', quote: 'NOK', asOf: '2026-09-10', rate: dec('10.42'), source: 'nb' },
        ]),
        asOf: AS_OF,
        base: 'NOK',
      })
      expect(result.valued[0]?.staleness).toBe('STALE')
    })

    it('marks a long-carried price as very stale but still values it', () => {
      const result = value([pos({ instrumentId: 'old', quantity: dec(2) })])
      expect(result.valued[0]?.staleness).toBe('VERY_STALE')
      expect(result.valued[0]?.valueBase.toString()).toBe('10')
    })
  })

  describe('unrealised gain', () => {
    it('computes it against the NOK cost basis', () => {
      const result = value([
        pos({
          instrumentId: 'otovo',
          quantity: dec(8),
          costBasis: KNOWN_COST('1152.48', '144.06', '1152.48'),
        }),
      ])
      expect(result.valued[0]?.unrealisedBase?.toString()).toBe('-1063.28')
    })

    it('returns null when the cost basis is unknown', () => {
      const result = value([pos({ instrumentId: 'otovo', quantity: dec(8) })])
      expect(result.valued[0]?.unrealisedBase).toBeNull()
    })

    it("returns null rather than converting an old cost at today's rate", () => {
      // Folding today's FX into a historical cost would silently mix currency
      // movement into what looks like a security return.
      const result = value([
        pos({
          instrumentId: 'aapl',
          quantity: dec(3),
          costBasis: KNOWN_COST('500', '166.67', null),
        }),
      ])
      expect(result.valued[0]?.unrealisedBase).toBeNull()
    })
  })
})
