import { describe, expect, it } from 'vitest'
import { dec } from '@/domain/money'
import {
  formatNok,
  formatNokDelta,
  formatPercent,
  formatQuantity,
  formatShortDate,
  parseNbNumber,
} from './format-nb'

// By code point: these are indistinguishable from ASCII space/hyphen on screen.
const NBSP = String.fromCharCode(0x00a0)
const NARROW_NBSP = String.fromCharCode(0x202f)
const MINUS = String.fromCharCode(0x2212)

function parsed(input: string): string {
  const result = parseNbNumber(input)
  if (!result.ok) throw new Error(`expected a number, got: ${result.reason}`)
  return result.value.toString()
}

describe('parseNbNumber', () => {
  /**
   * The formats actually observed in Nordnet and Firi output. parseFloat
   * returns 1 for the first of these, which is the bug this table prevents.
   */
  const cases: Array<[string, string]> = [
    [`1${NBSP}234,56`, '1234.56'],
    [`1${NARROW_NBSP}234,56`, '1234.56'],
    ['1 234,56', '1234.56'],
    ['1.234,56', '1234.56'],
    ['1,234.56', '1234.56'],
    ['1234.56', '1234.56'],
    ['1234,56', '1234.56'],
    ['11,15', '11.15'],
    ['0,01022079', '0.01022079'],
    ['60,950208', '60.950208'],
    [`7${NBSP}488,01${NBSP}kr`, '7488.01'],
    ['7488,01 kr', '7488.01'],
    ['kr 89', '89'],
    ['89 NOK', '89'],
    ['-92,26', '-92.26'],
    [`${MINUS}92,26`, '-92.26'],
    [`${MINUS}1${NBSP}063,28${NBSP}kr`, '-1063.28'],
    ['(1 063,28)', '-1063.28'],
    [`(${MINUS}5)`, '5'],
    ['+0,90', '0.9'],
    ['0,90 %', '0.9'],
    ['12,5%', '12.5'],
    // Ambiguous pair, resolved by Norwegian convention: a lone period grouping
    // three digits is thousands, a lone comma is always a decimal separator.
    ['1.234', '1234'],
    ['1,234', '1.234'],
    ['1.234.567', '1234567'],
    ['1.23', '1.23'],
    ['  42  ', '42'],
    ['0', '0'],
    ['0,00', '0'],
  ]

  for (const [input, expected] of cases) {
    it(`parses ${JSON.stringify(input)} as ${expected}`, () => {
      expect(parsed(input)).toBe(expected)
    })
  }

  it('reproduces the real Otovo screenshot row', () => {
    const quantity = parseNbNumber('8')
    const price = parseNbNumber(`11,15${NBSP}kr`)
    if (!quantity.ok || !price.ok) throw new Error('expected both to parse')
    expect(quantity.value.times(price.value).toFixed(2)).toBe('89.20')
  })

  describe('rejections', () => {
    const bad = ['', '   ', 'abc', 'kr', '-', '1,2,3.4.5', '12abc', 'NaN', '--5']
    for (const input of bad) {
      it(`refuses ${JSON.stringify(input)} instead of returning NaN`, () => {
        expect(parseNbNumber(input).ok).toBe(false)
      })
    }

    it('explains why it refused', () => {
      const result = parseNbNumber('abc')
      expect(result.ok).toBe(false)
      if (result.ok) throw new Error('unreachable')
      expect(result.reason).toContain('abc')
    })
  })
})

describe('formatNok', () => {
  it('renders whole kroner with a non-breaking space group separator', () => {
    expect(formatNok(8378)).toBe(`8${NBSP}378${NBSP}kr`)
  })

  it('keeps øre below 100 kr, where rounding would distort the number', () => {
    expect(formatNok(dec('89.2'))).toBe(`89,20${NBSP}kr`)
    expect(formatNok(dec('0.01'))).toBe(`0,01${NBSP}kr`)
  })

  it('renders zero as whole kroner', () => {
    expect(formatNok(0)).toBe(`0${NBSP}kr`)
  })

  it('honours an explicit precision', () => {
    expect(formatNok(8378, { decimals: 2 })).toBe(`8${NBSP}378,00${NBSP}kr`)
    expect(formatNok(dec('89.2'), { decimals: 0 })).toBe(`89${NBSP}kr`)
  })
})

describe('formatNokDelta', () => {
  it('uses a real minus sign, not a hyphen', () => {
    expect(formatNokDelta(dec('-1063.28'))).toBe(`${MINUS}1${NBSP}063${NBSP}kr`)
  })

  it('marks gains explicitly', () => {
    expect(formatNokDelta(112)).toBe(`+112${NBSP}kr`)
  })

  it('leaves zero unsigned', () => {
    expect(formatNokDelta(0)).toBe(`0${NBSP}kr`)
  })
})

describe('formatPercent', () => {
  it('formats a ratio with a comma decimal', () => {
    expect(formatPercent(dec('0.9894'))).toBe(`98,9${NBSP}%`)
  })

  it('signs when asked', () => {
    expect(formatPercent(dec('0.009'), { signed: true })).toBe(`+0,9${NBSP}%`)
    expect(formatPercent(dec('-0.9226'), { signed: true })).toBe(`${MINUS}92,3${NBSP}%`)
  })

  it('shows a negative sign even when unsigned formatting is requested', () => {
    expect(formatPercent(dec('-0.05'))).toBe(`${MINUS}5,0${NBSP}%`)
  })

  it('leaves zero unsigned', () => {
    expect(formatPercent(0, { signed: true })).toBe(`0,0${NBSP}%`)
  })
})

describe('formatQuantity', () => {
  it('keeps every significant digit of a crypto quantity', () => {
    // 0.01022079 must never render as 0,01.
    expect(formatQuantity(dec('0.01022079'))).toBe('0,01022079')
    expect(formatQuantity(dec('60.950208'))).toBe('60,950208')
  })

  it('renders whole share counts as integers', () => {
    expect(formatQuantity(dec(8))).toBe('8')
    expect(formatQuantity(dec(1500))).toBe(`1${NBSP}500`)
  })
})

describe('formatShortDate', () => {
  it('formats an ISO date for a staleness label', () => {
    expect(formatShortDate('2026-09-14')).toMatch(/14\.\s*sep/)
  })

  it('passes through an unparseable input rather than rendering "Invalid Date"', () => {
    expect(formatShortDate('not-a-date')).toBe('not-a-date')
  })
})
