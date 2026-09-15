import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { dec } from '../money'
import { decomposeReturn } from './attribution'

describe('decomposeReturn', () => {
  it('splits a foreign holding into security and currency legs', () => {
    // US stock +10%, USD/NOK -5%.
    const r = decomposeReturn({
      priceStart: dec(100),
      priceEnd: dec(110),
      fxStart: dec(10),
      fxEnd: dec('9.5'),
    })
    if (!r) throw new Error('expected a decomposition')
    expect(r.security.toString()).toBe('0.1')
    expect(r.fx.toString()).toBe('-0.05')
    expect(r.interaction.toString()).toBe('-0.005')
    // 1.10 x 0.95 - 1 = 0.045
    expect(r.total.toString()).toBe('0.045')
  })

  it('shows a gain in local currency becoming a loss in kroner', () => {
    // The case a Norwegian investor most needs: +5% asset, -6% currency.
    const r = decomposeReturn({
      priceStart: dec(100),
      priceEnd: dec(105),
      fxStart: dec(10),
      fxEnd: dec('9.4'),
    })
    if (!r) throw new Error('expected a decomposition')
    expect(r.security.isPositive()).toBe(true)
    expect(r.total.isNegative()).toBe(true)
    expect(r.total.toDecimalPlaces(4).toString()).toBe('-0.013')
  })

  it('leaves the FX leg at zero for a domestic holding', () => {
    const r = decomposeReturn({
      priceStart: dec(100),
      priceEnd: dec(120),
      fxStart: dec(1),
      fxEnd: dec(1),
    })
    expect(r?.fx.toString()).toBe('0')
    expect(r?.interaction.toString()).toBe('0')
    expect(r?.total.toString()).toBe('0.2')
  })

  it('returns null rather than dividing by a zero starting price', () => {
    expect(
      decomposeReturn({ priceStart: dec(0), priceEnd: dec(1), fxStart: dec(1), fxEnd: dec(1) }),
    ).toBeNull()
    expect(
      decomposeReturn({ priceStart: dec(1), priceEnd: dec(1), fxStart: dec(0), fxEnd: dec(1) }),
    ).toBeNull()
  })

  it('always reconciles: security + fx + interaction equals total', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        fc.integer({ min: 1, max: 100_000 }),
        fc.integer({ min: 1, max: 100_000 }),
        fc.integer({ min: 1, max: 100_000 }),
        (p0, p1, f0, f1) => {
          const r = decomposeReturn({
            priceStart: dec(p0),
            priceEnd: dec(p1),
            fxStart: dec(f0),
            fxEnd: dec(f1),
          })
          if (!r) throw new Error('expected a decomposition')
          const recombined = r.security.plus(r.fx).plus(r.interaction)
          expect(recombined.minus(r.total).abs().lessThan('1e-25')).toBe(true)
        },
      ),
      { numRuns: 300 },
    )
  })
})
