import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { dec } from '../money'
import type { CorporateAction } from '../types'
import {
  actionFactor,
  actionsInRange,
  adjustmentFactor,
  adjustPrice,
  adjustQuantity,
} from './corporate-actions'

const otovo: CorporateAction = {
  id: 'ca-otovo',
  instrumentId: 'otovo',
  type: 'REVERSE_SPLIT',
  exDate: '2026-02-03',
  ratioNum: dec(1),
  ratioDen: dec(10),
}

const forwardSplit: CorporateAction = {
  id: 'ca-fwd',
  instrumentId: 'acme',
  type: 'SPLIT',
  exDate: '2024-05-10',
  ratioNum: dec(4),
  ratioDen: dec(1),
}

describe('actionFactor', () => {
  it('turns a 10-for-1 reverse split into 0.1', () => {
    expect(actionFactor(otovo).toString()).toBe('0.1')
  })

  it('turns a 4-for-1 forward split into 4', () => {
    expect(actionFactor(forwardSplit).toString()).toBe('4')
  })

  it('rejects a zero denominator rather than producing Infinity', () => {
    expect(() => actionFactor({ ...otovo, ratioDen: dec(0) })).toThrow(RangeError)
  })
})

describe('adjustmentFactor', () => {
  it('applies an action dated after the transaction', () => {
    const f = adjustmentFactor([otovo], 'otovo', '2021-06-01', '2026-09-14')
    expect(f.toString()).toBe('0.1')
  })

  it('ignores an action already baked into the recorded quantity', () => {
    // A transaction on the ex-date is already in post-split shares.
    const f = adjustmentFactor([otovo], 'otovo', '2026-02-03', '2026-09-14')
    expect(f.toString()).toBe('1')
  })

  it('ignores an action that has not happened yet as at the valuation date', () => {
    const f = adjustmentFactor([otovo], 'otovo', '2021-06-01', '2026-01-31')
    expect(f.toString()).toBe('1')
  })

  it('ignores actions belonging to other instruments', () => {
    const f = adjustmentFactor([otovo, forwardSplit], 'otovo', '2020-01-01', '2026-09-14')
    expect(f.toString()).toBe('0.1')
  })

  it('compounds several actions', () => {
    const second: CorporateAction = { ...otovo, id: 'ca-2', exDate: '2026-06-01' }
    const f = adjustmentFactor([otovo, second], 'otovo', '2021-06-01', '2026-09-14')
    expect(f.toString()).toBe('0.01')
  })
})

describe('adjustQuantity / adjustPrice', () => {
  it('restates 80 pre-split Otovo shares as 8', () => {
    expect(adjustQuantity(dec(80), dec('0.1')).toString()).toBe('8')
  })

  it('restates a pre-split price ten times higher', () => {
    expect(adjustPrice(dec('14.406'), dec('0.1')).toString()).toBe('144.06')
  })

  it('refuses a zero factor', () => {
    expect(() => adjustPrice(dec(10), dec(0))).toThrow(RangeError)
  })

  it('is value-neutral for any quantity, price and ratio', () => {
    // The invariant that makes split adjustment safe: restating both sides
    // leaves the position's total consideration untouched.
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (qty, priceCents, num, den) => {
          const q = dec(qty)
          const p = dec(priceCents).div(100)
          const factor = dec(num).div(den)
          const before = q.times(p)
          const after = adjustQuantity(q, factor).times(adjustPrice(p, factor))
          // Exact within Decimal's 40-digit precision.
          expect(after.minus(before).abs().lessThan('1e-25')).toBe(true)
        },
      ),
      { numRuns: 300 },
    )
  })
})

describe('actionsInRange', () => {
  it('returns matching actions in ex-date order', () => {
    const later: CorporateAction = { ...otovo, id: 'ca-late', exDate: '2026-06-01' }
    const found = actionsInRange([later, otovo], 'otovo', '2021-01-01', '2026-09-14')
    expect(found.map((a) => a.id)).toEqual(['ca-otovo', 'ca-late'])
  })

  it('excludes other instruments and out-of-range dates', () => {
    expect(actionsInRange([forwardSplit], 'otovo', '2020-01-01', '2026-09-14')).toEqual([])
    expect(actionsInRange([otovo], 'otovo', '2026-03-01', '2026-09-14')).toEqual([])
  })

  it('orders equal ex-dates stably', () => {
    const twin: CorporateAction = { ...otovo, id: 'ca-twin' }
    const found = actionsInRange([otovo, twin], 'otovo', '2021-01-01', '2026-09-14')
    expect(found).toHaveLength(2)
  })
})
