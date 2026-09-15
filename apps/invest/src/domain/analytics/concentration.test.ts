import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { dec } from '../money'
import type { InstrumentWeight } from './allocation'
import { concentration, topNShare } from './concentration'

function w(instrumentId: string, weight: string): InstrumentWeight {
  return { instrumentId, valueBase: dec(weight).times(1000), weight: dec(weight) }
}

describe('concentration', () => {
  it('returns a valid empty result for a portfolio with no holdings', () => {
    const result = concentration([])
    expect(result.hhi.toString()).toBe('0')
    expect(result.effectiveHoldings).toBeNull()
    expect(result.largest).toBeNull()
    expect(result.count).toBe(0)
  })

  it('scores a single holding at maximum concentration', () => {
    const result = concentration([w('btc', '1')])
    expect(result.hhi.toString()).toBe('1')
    expect(result.effectiveHoldings?.toString()).toBe('1')
    expect(result.top1.toString()).toBe('1')
  })

  it('scores four equal holdings as four effective holdings', () => {
    const result = concentration([w('a', '0.25'), w('b', '0.25'), w('c', '0.25'), w('d', '0.25')])
    expect(result.hhi.toString()).toBe('0.25')
    expect(result.effectiveHoldings?.toString()).toBe('4')
  })

  it('describes the real portfolio as barely more than one holding', () => {
    const result = concentration([w('btc', '0.8938'), w('xrp', '0.0956'), w('otovo', '0.0106')])
    expect(result.effectiveHoldings?.toDecimalPlaces(2).toString()).toBe('1.24')
    expect(result.largest?.instrumentId).toBe('btc')
  })

  it('reports top-1 and top-3 shares', () => {
    const result = concentration([w('a', '0.4'), w('b', '0.3'), w('c', '0.2'), w('d', '0.1')])
    expect(result.top1.toString()).toBe('0.4')
    expect(result.top3.toString()).toBe('0.9')
  })

  it('does not depend on input order', () => {
    const items = [w('a', '0.5'), w('b', '0.3'), w('c', '0.2')]
    const forward = concentration(items)
    const backward = concentration([...items].reverse())
    expect(backward.hhi.toString()).toBe(forward.hhi.toString())
    expect(backward.largest?.instrumentId).toBe(forward.largest?.instrumentId)
  })
})

describe('topNShare', () => {
  const items = [w('a', '0.5'), w('b', '0.3'), w('c', '0.2')]

  it('sums the largest n', () => {
    expect(topNShare(items, 2).toString()).toBe('0.8')
  })

  it('returns zero for a non-positive n', () => {
    expect(topNShare(items, 0).toString()).toBe('0')
    expect(topNShare(items, -1).toString()).toBe('0')
  })

  it('caps at the number of holdings available', () => {
    expect(topNShare(items, 99).toString()).toBe('1')
  })
})

describe('property: HHI bounds', () => {
  it('stays within (0, 1] and never exceeds top1 by more than the rest allow', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 20 }),
        (raw) => {
          const total = raw.reduce((a, b) => a + b, 0)
          const weights = raw.map((v, i) => w(`i${i}`, dec(v).div(total).toString()))
          const result = concentration(weights)
          expect(result.hhi.greaterThan(0)).toBe(true)
          expect(result.hhi.lessThanOrEqualTo(dec(1).plus('1e-20'))).toBe(true)
          // A portfolio can never be less concentrated than perfectly equal-weighted.
          expect(
            result.effectiveHoldings?.lessThanOrEqualTo(dec(weights.length).plus('1e-15')),
          ).toBe(true)
          // Nor more concentrated than its own largest holding implies.
          expect(result.hhi.greaterThanOrEqualTo(result.top1.times(result.top1))).toBe(true)
        },
      ),
      { numRuns: 300 },
    )
  })
})
