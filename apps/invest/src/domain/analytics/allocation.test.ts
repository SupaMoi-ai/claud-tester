import { describe, expect, it } from 'vitest'
import { type Decimal, dec } from '../money'
import type { Position } from '../types'
import type { PriceHit } from '../valuation/pricebook'
import type { ValuedPosition } from '../valuation/value'
import { allocateBy, type Exposure, instrumentWeights } from './allocation'

const PRICE: PriceHit = {
  price: dec(1),
  currency: 'NOK',
  asOf: '2026-09-14',
  source: 'test',
  staleness: 'FRESH',
}

function valued(instrumentId: string, value: string, accountId = 'acct'): ValuedPosition {
  const position: Position = {
    accountId,
    instrumentId,
    quantity: dec(1),
    currency: 'NOK',
    costBasis: { status: 'UNKNOWN', reason: 'test' },
    hasZeroCostUnits: false,
  }
  const v: Decimal = dec(value)
  return {
    position,
    price: PRICE,
    valueNative: v,
    valueBase: v,
    fxRate: dec(1),
    fxAsOf: '2026-09-14',
    fxSource: 'identity',
    staleness: 'FRESH',
    unrealisedBase: null,
  }
}

function exposure(instrumentId: string, tag: string, weight = '1'): Exposure {
  return { instrumentId, dimension: 'ASSET_CLASS', tag, weight: dec(weight) }
}

describe('instrumentWeights', () => {
  it('computes weights over the priced total', () => {
    const weights = instrumentWeights([valued('btc', '7488.01'), valued('otovo', '89.2')])
    expect(weights[0]?.instrumentId).toBe('btc')
    expect(weights[0]?.weight.times(100).toDecimalPlaces(2).toString()).toBe('98.82')
  })

  it('aggregates the same instrument held across accounts', () => {
    // Concentration is a property of what you own, not where you custody it.
    const weights = instrumentWeights([
      valued('btc', '50', 'firi'),
      valued('btc', '50', 'coinbase'),
      valued('otovo', '100'),
    ])
    expect(weights).toHaveLength(2)
    const btc = weights.find((w) => w.instrumentId === 'btc')
    expect(btc?.valueBase.toString()).toBe('100')
    expect(btc?.weight.toString()).toBe('0.5')
  })

  it('returns an empty list for an empty portfolio', () => {
    expect(instrumentWeights([])).toEqual([])
  })

  it('yields zero weights rather than NaN when everything is worthless', () => {
    const weights = instrumentWeights([valued('dead', '0')])
    expect(weights[0]?.weight.toString()).toBe('0')
  })
})

describe('allocateBy', () => {
  it('splits value across tags', () => {
    const result = allocateBy(
      [valued('btc', '7488.01'), valued('xrp', '800.89'), valued('otovo', '89.2')],
      [exposure('btc', 'CRYPTO'), exposure('xrp', 'CRYPTO'), exposure('otovo', 'EQUITY')],
      'ASSET_CLASS',
    )
    expect(result.slices.map((s) => s.tag)).toEqual(['CRYPTO', 'EQUITY'])
    expect(result.slices[0]?.valueBase.toString()).toBe('8288.9')
    expect(result.slices[0]?.weight.times(100).toDecimalPlaces(2).toString()).toBe('98.94')
    expect(result.slices[0]?.instrumentIds).toEqual(['btc', 'xrp'])
    expect(result.unclassifiedBase.toString()).toBe('0')
  })

  it('supports look-through: one fund split across several tags', () => {
    const result = allocateBy(
      [valued('fund', '1000')],
      [
        { instrumentId: 'fund', dimension: 'GEOGRAPHY', tag: 'US', weight: dec('0.6') },
        { instrumentId: 'fund', dimension: 'GEOGRAPHY', tag: 'Europe', weight: dec('0.4') },
      ],
      'GEOGRAPHY',
    )
    expect(result.slices.map((s) => [s.tag, s.valueBase.toString()])).toEqual([
      ['US', '600'],
      ['Europe', '400'],
    ])
    expect(result.unclassifiedBase.toString()).toBe('0')
  })

  it('surfaces untagged value rather than hiding it in an "Other" bucket', () => {
    const result = allocateBy(
      [valued('btc', '100'), valued('mystery', '50')],
      [exposure('btc', 'CRYPTO')],
      'ASSET_CLASS',
    )
    expect(result.unclassifiedBase.toString()).toBe('50')
    expect(result.slices).toHaveLength(1)
  })

  it('treats a partially tagged instrument as partly unclassified', () => {
    const result = allocateBy(
      [valued('fund', '1000')],
      [exposure('fund', 'EQUITY', '0.7')],
      'ASSET_CLASS',
    )
    expect(result.slices[0]?.valueBase.toString()).toBe('700')
    expect(result.unclassifiedBase.toString()).toBe('300')
  })

  it('allows overlapping tags to exceed the total on a THEME dimension', () => {
    // A stock can be both "AI" and "Semiconductors"; that is not an error.
    const result = allocateBy(
      [valued('nvda', '100')],
      [
        { instrumentId: 'nvda', dimension: 'THEME', tag: 'AI', weight: dec(1) },
        { instrumentId: 'nvda', dimension: 'THEME', tag: 'Semis', weight: dec(1) },
      ],
      'THEME',
    )
    const sum = result.slices.reduce((acc, s) => acc.plus(s.valueBase), dec(0))
    expect(sum.toString()).toBe('200')
    expect(result.unclassifiedBase.toString()).toBe('0')
  })

  it('ignores exposures belonging to other dimensions', () => {
    const result = allocateBy(
      [valued('btc', '100')],
      [{ instrumentId: 'btc', dimension: 'SECTOR', tag: 'Tech', weight: dec(1) }],
      'ASSET_CLASS',
    )
    expect(result.slices).toEqual([])
    expect(result.unclassifiedBase.toString()).toBe('100')
  })

  it('handles an empty portfolio', () => {
    const result = allocateBy([], [], 'ASSET_CLASS')
    expect(result.slices).toEqual([])
    expect(result.totalBase.toString()).toBe('0')
  })

  it('yields a zero weight rather than NaN when the whole portfolio is worthless', () => {
    const result = allocateBy([valued('dead', '0')], [exposure('dead', 'EQUITY')], 'ASSET_CLASS')
    expect(result.slices[0]?.weight.toString()).toBe('0')
    expect(result.totalBase.toString()).toBe('0')
  })

  it('breaks ties between equal-valued slices by tag name', () => {
    const result = allocateBy(
      [valued('a', '100'), valued('b', '100')],
      [exposure('a', 'Zeta'), exposure('b', 'Alpha')],
      'ASSET_CLASS',
    )
    expect(result.slices.map((s) => s.tag)).toEqual(['Alpha', 'Zeta'])
  })
})
