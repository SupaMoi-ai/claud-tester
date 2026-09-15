import { describe, expect, it } from 'vitest'
import {
  addMoney,
  CurrencyMismatchError,
  Decimal,
  dec,
  money,
  ratio,
  safeDiv,
  scaleMoney,
  subMoney,
  sumMoney,
  zeroMoney,
} from './money'

describe('dec', () => {
  it('accepts strings, numbers and Decimals', () => {
    expect(dec('1.5').toString()).toBe('1.5')
    expect(dec(1.5).toString()).toBe('1.5')
    expect(dec(new Decimal('1.5')).toString()).toBe('1.5')
  })

  it('returns the same instance when given a Decimal', () => {
    const d = new Decimal('2')
    expect(dec(d)).toBe(d)
  })

  it('preserves crypto precision that a float would destroy', () => {
    // 0.1 + 0.2 !== 0.3 in IEEE-754; it must here.
    expect(dec('0.1').plus(dec('0.2')).toString()).toBe('0.3')
    expect(dec('0.01022079').toString()).toBe('0.01022079')
  })

  it('never renders in exponential notation', () => {
    expect(dec('0.000000000000001').toString()).toBe('0.000000000000001')
    expect(dec('1000000000000000000').toString()).toBe('1000000000000000000')
  })
})

describe('money arithmetic', () => {
  it('adds and subtracts within a currency', () => {
    expect(addMoney(money(2, 'NOK'), money(3, 'NOK')).amount.toString()).toBe('5')
    expect(subMoney(money(5, 'NOK'), money(3, 'NOK')).amount.toString()).toBe('2')
  })

  it('refuses to combine different currencies', () => {
    expect(() => addMoney(money(1, 'NOK'), money(1, 'USD'))).toThrow(CurrencyMismatchError)
    expect(() => subMoney(money(1, 'NOK'), money(1, 'USD'))).toThrow(/Cannot combine NOK and USD/)
  })

  it('sums a list, starting from zero', () => {
    const total = sumMoney([money(1, 'NOK'), money('2.5', 'NOK')], 'NOK')
    expect(total.amount.toString()).toBe('3.5')
    expect(sumMoney([], 'NOK').amount.toString()).toBe('0')
  })

  it('scales', () => {
    expect(scaleMoney(money(10, 'NOK'), '0.5').amount.toString()).toBe('5')
  })

  it('builds a zero', () => {
    expect(zeroMoney('USD')).toEqual({ amount: dec(0), currency: 'USD' })
  })
})

describe('safeDiv and ratio', () => {
  it('divides normally', () => {
    expect(safeDiv(dec(10), dec(4))?.toString()).toBe('2.5')
    expect(ratio(dec(1), dec(4))?.toString()).toBe('0.25')
  })

  it('returns null on a zero denominator instead of Infinity or NaN', () => {
    // Infinity would render as a plausible-looking number somewhere downstream.
    expect(safeDiv(dec(1), dec(0))).toBeNull()
    expect(ratio(dec(1), dec(0))).toBeNull()
  })
})
