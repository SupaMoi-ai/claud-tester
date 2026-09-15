import { describe, expect, it } from 'vitest'
import { dec } from '../money'
import {
  classifyStaleness,
  daysBetween,
  type FxRecord,
  found,
  missing,
  type PriceRecord,
  RecordFxBook,
  RecordPriceBook,
} from './pricebook'

const prices: PriceRecord[] = [
  {
    instrumentId: 'otovo',
    asOf: '2026-09-10',
    price: dec('11.00'),
    currency: 'NOK',
    source: 'eodhd',
  },
  {
    instrumentId: 'otovo',
    asOf: '2026-09-14',
    price: dec('11.15'),
    currency: 'NOK',
    source: 'eodhd',
  },
  { instrumentId: 'aapl', asOf: '2026-09-14', price: dec('220'), currency: 'USD', source: 'eodhd' },
]

describe('helpers', () => {
  it('constructs both lookup shapes', () => {
    expect(found(1)).toEqual({ status: 'OK', hit: 1 })
    expect(missing('nope')).toEqual({ status: 'MISSING', reason: 'nope' })
  })

  it('counts whole days, including across a month boundary', () => {
    expect(daysBetween('2026-09-10', '2026-09-14')).toBe(4)
    expect(daysBetween('2026-08-31', '2026-09-01')).toBe(1)
    expect(daysBetween('2026-09-14', '2026-09-14')).toBe(0)
  })

  it('classifies staleness against the default thresholds', () => {
    expect(classifyStaleness('2026-09-14', '2026-09-14')).toBe('FRESH')
    expect(classifyStaleness('2026-09-13', '2026-09-14')).toBe('FRESH')
    expect(classifyStaleness('2026-09-11', '2026-09-14')).toBe('STALE')
    expect(classifyStaleness('2026-09-01', '2026-09-14')).toBe('VERY_STALE')
  })

  it('honours custom thresholds', () => {
    const t = { staleAfterDays: 0, veryStaleAfterDays: 1 }
    expect(classifyStaleness('2026-09-13', '2026-09-14', t)).toBe('STALE')
    expect(classifyStaleness('2026-09-12', '2026-09-14', t)).toBe('VERY_STALE')
  })
})

describe('RecordPriceBook', () => {
  const book = new RecordPriceBook(prices)

  it('returns the price on the exact date', () => {
    const result = book.at('otovo', '2026-09-14')
    expect(result.status).toBe('OK')
    if (result.status !== 'OK') throw new Error('unreachable')
    expect(result.hit.price.toString()).toBe('11.15')
    expect(result.hit.source).toBe('eodhd')
    expect(result.hit.staleness).toBe('FRESH')
  })

  it('carries the last close forward and marks it stale', () => {
    const result = book.at('otovo', '2026-09-12')
    if (result.status !== 'OK') throw new Error('expected a hit')
    // Carried forward from the 10th, not interpolated towards the 14th.
    // Decimal normalises trailing zeros, so 11.00 stringifies as '11' -- which
    // is why display formatting uses toFixed, never toString.
    expect(result.hit.price.toFixed(2)).toBe('11.00')
    expect(result.hit.asOf).toBe('2026-09-10')
    expect(result.hit.staleness).toBe('STALE')
  })

  it('never looks into the future', () => {
    const result = book.at('otovo', '2026-09-01')
    expect(result.status).toBe('MISSING')
    if (result.status !== 'MISSING') throw new Error('unreachable')
    expect(result.reason).toContain('earliest known is 2026-09-10')
  })

  it('reports an unknown instrument as MISSING, not zero', () => {
    const result = book.at('unknown', '2026-09-14')
    expect(result.status).toBe('MISSING')
    if (result.status !== 'MISSING') throw new Error('unreachable')
    expect(result.reason).toContain('no price on record')
  })

  it('handles an empty book', () => {
    expect(new RecordPriceBook([]).at('otovo', '2026-09-14').status).toBe('MISSING')
  })

  it('sorts unordered input', () => {
    const shuffled = new RecordPriceBook([...prices].reverse())
    const result = shuffled.at('otovo', '2026-09-14')
    if (result.status !== 'OK') throw new Error('expected a hit')
    expect(result.hit.price.toString()).toBe('11.15')
  })
})

describe('RecordFxBook', () => {
  const rates: FxRecord[] = [
    { base: 'USD', quote: 'NOK', asOf: '2026-09-12', rate: dec('10.42'), source: 'norgesbank' },
    { base: 'EUR', quote: 'NOK', asOf: '2026-09-12', rate: dec('11.68'), source: 'norgesbank' },
  ]
  const book = new RecordFxBook(rates)

  it('returns exactly 1 for a same-currency request without consulting any source', () => {
    const result = book.rate('NOK', 'NOK', '2026-09-14')
    if (result.status !== 'OK') throw new Error('expected a hit')
    expect(result.hit.rate.toString()).toBe('1')
    expect(result.hit.source).toBe('identity')
    expect(result.hit.staleness).toBe('FRESH')
  })

  it('resolves a stored direction', () => {
    const result = book.rate('USD', 'NOK', '2026-09-12')
    if (result.status !== 'OK') throw new Error('expected a hit')
    expect(result.hit.rate.toString()).toBe('10.42')
  })

  it('derives the inverse rather than storing both directions', () => {
    const result = book.rate('NOK', 'USD', '2026-09-12')
    if (result.status !== 'OK') throw new Error('expected a hit')
    expect(result.hit.rate.toDecimalPlaces(8).toString()).toBe('0.09596929')
    expect(result.hit.source).toContain('inverted')
  })

  it('marks a carried-forward rate as stale, because Norges Bank has no weekend', () => {
    const result = book.rate('USD', 'NOK', '2026-09-14')
    if (result.status !== 'OK') throw new Error('expected a hit')
    expect(result.hit.asOf).toBe('2026-09-12')
    expect(result.hit.staleness).toBe('STALE')
  })

  it('reports an unknown pair as MISSING', () => {
    const result = book.rate('JPY', 'NOK', '2026-09-14')
    expect(result.status).toBe('MISSING')
    if (result.status !== 'MISSING') throw new Error('unreachable')
    expect(result.reason).toContain('JPY/NOK')
  })

  it('reports MISSING when the only record post-dates the request', () => {
    expect(book.rate('USD', 'NOK', '2026-01-01').status).toBe('MISSING')
  })

  it('refuses to invert a zero rate', () => {
    const zeroBook = new RecordFxBook([
      { base: 'USD', quote: 'NOK', asOf: '2026-09-12', rate: dec(0), source: 'broken' },
    ])
    expect(zeroBook.rate('NOK', 'USD', '2026-09-14').status).toBe('MISSING')
  })
})
