import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { type Decimal, dec } from '../money'
import type { CorporateAction, Transaction, TxnType } from '../types'
import { derivePositions } from './positions'

const ACCOUNT = 'acct'
const INSTRUMENT = 'inst'

function txn(over: Partial<Transaction> & { id: string }): Transaction {
  return {
    accountId: ACCOUNT,
    instrumentId: INSTRUMENT,
    type: 'BUY',
    tradeDate: '2026-01-01',
    quantity: dec(10),
    price: dec(100),
    fee: dec(0),
    currency: 'NOK',
    fxRateToNok: null,
    ...over,
  }
}

function derive(transactions: Transaction[], corporateActions: CorporateAction[] = []) {
  return derivePositions({ transactions, corporateActions, asOf: '2026-09-14' })
}

function only(transactions: Transaction[], actions: CorporateAction[] = []) {
  const result = derive(transactions, actions)
  const position = result.positions[0]
  if (!position) throw new Error('expected a position')
  return { position, result }
}

describe('derivePositions', () => {
  it('returns nothing for an empty ledger', () => {
    const result = derive([])
    expect(result.positions).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.asOf).toBe('2026-09-14')
  })

  it('accumulates buys and averages the cost', () => {
    const { position } = only([
      txn({ id: 'a', quantity: dec(10), price: dec(100) }),
      txn({ id: 'b', quantity: dec(10), price: dec(200), tradeDate: '2026-02-01' }),
    ])
    expect(position.quantity.toString()).toBe('20')
    if (position.costBasis.status !== 'KNOWN') throw new Error('expected known cost')
    expect(position.costBasis.totalCost.toString()).toBe('3000')
    expect(position.costBasis.costPerUnit.toString()).toBe('150')
  })

  it('includes fees in the cost basis', () => {
    const { position } = only([txn({ id: 'a', quantity: dec(10), price: dec(100), fee: dec(29) })])
    if (position.costBasis.status !== 'KNOWN') throw new Error('expected known cost')
    expect(position.costBasis.totalCost.toString()).toBe('1029')
  })

  it('removes cost proportionally on a sell, leaving cost per unit unchanged', () => {
    const { position } = only([
      txn({ id: 'a', quantity: dec(10), price: dec(100) }),
      txn({ id: 'b', type: 'SELL', quantity: dec(-4), tradeDate: '2026-03-01' }),
    ])
    expect(position.quantity.toString()).toBe('6')
    if (position.costBasis.status !== 'KNOWN') throw new Error('expected known cost')
    expect(position.costBasis.totalCost.toString()).toBe('600')
    expect(position.costBasis.costPerUnit.toString()).toBe('100')
  })

  it('drops a fully closed position', () => {
    const result = derive([
      txn({ id: 'a', quantity: dec(10) }),
      txn({ id: 'b', type: 'SELL', quantity: dec(-10), tradeDate: '2026-03-01' }),
    ])
    expect(result.positions).toEqual([])
  })

  it('ignores transactions dated after the valuation date', () => {
    const result = derive([txn({ id: 'a', tradeDate: '2027-01-01' })])
    expect(result.positions).toEqual([])
  })

  it('separates the same instrument held on different accounts', () => {
    const result = derive([
      txn({ id: 'a', accountId: 'firi' }),
      txn({ id: 'b', accountId: 'nordnet' }),
    ])
    expect(result.positions).toHaveLength(2)
    expect(result.positions.map((p) => p.accountId)).toEqual(['firi', 'nordnet'])
  })

  describe('corrections', () => {
    it('excludes a reversed transaction and the correction itself', () => {
      const result = derive([
        txn({ id: 'a', quantity: dec(10) }),
        txn({ id: 'b', quantity: dec(999), tradeDate: '2026-02-01' }),
        txn({
          id: 'c',
          type: 'CORRECTION',
          reversesTransactionId: 'b',
          tradeDate: '2026-02-02',
          quantity: null,
          price: null,
        }),
      ])
      expect(result.positions[0]?.quantity.toString()).toBe('10')
    })
  })

  describe('cost basis honesty', () => {
    it('reports UNKNOWN when an opening balance has no price', () => {
      const { position } = only([
        txn({ id: 'a', type: 'OPENING_BALANCE', price: null, quantity: dec('0.01022079') }),
      ])
      expect(position.costBasis.status).toBe('UNKNOWN')
      if (position.costBasis.status !== 'UNKNOWN') throw new Error('unreachable')
      expect(position.costBasis.reason).toContain('unknown rather than zero')
    })

    it('stays UNKNOWN once poisoned, even if later buys have prices', () => {
      const { position } = only([
        txn({ id: 'a', type: 'OPENING_BALANCE', price: null }),
        txn({ id: 'b', price: dec(100), tradeDate: '2026-02-01' }),
      ])
      expect(position.costBasis.status).toBe('UNKNOWN')
    })

    it('reports a null NOK cost when a foreign trade captured no FX rate', () => {
      const { position, result } = only([
        txn({ id: 'a', currency: 'USD', fxRateToNok: null, price: dec(50) }),
      ])
      if (position.costBasis.status !== 'KNOWN') throw new Error('expected known cost')
      expect(position.costBasis.totalCost.toString()).toBe('500')
      expect(position.costBasis.totalCostNok).toBeNull()
      expect(result.warnings.map((w) => w.code)).toContain('MISSING_FX_RATE')
    })

    it('converts a foreign trade at its captured rate', () => {
      const { position } = only([
        txn({
          id: 'a',
          currency: 'USD',
          fxRateToNok: dec('10.42'),
          price: dec(50),
          quantity: dec(2),
        }),
      ])
      if (position.costBasis.status !== 'KNOWN') throw new Error('expected known cost')
      expect(position.costBasis.totalCostNok?.toString()).toBe('1042')
    })
  })

  describe('zero-cost acquisitions', () => {
    it('adds staking rewards as units without cost and flags them', () => {
      const { position, result } = only([
        txn({ id: 'a', quantity: dec(10), price: dec(100) }),
        txn({
          id: 'b',
          type: 'STAKING_REWARD',
          quantity: dec(2),
          price: null,
          tradeDate: '2026-02-01',
        }),
      ])
      expect(position.quantity.toString()).toBe('12')
      expect(position.hasZeroCostUnits).toBe(true)
      if (position.costBasis.status !== 'KNOWN') throw new Error('expected known cost')
      expect(position.costBasis.totalCost.toString()).toBe('1000')
      expect(result.warnings.map((w) => w.code)).toContain('ZERO_COST_ACQUISITION')
    })

    it('treats a priced staking reward as income at fair value', () => {
      const { position } = only([
        txn({ id: 'a', type: 'STAKING_REWARD', quantity: dec(2), price: dec(50) }),
      ])
      if (position.costBasis.status !== 'KNOWN') throw new Error('expected known cost')
      expect(position.costBasis.totalCost.toString()).toBe('100')
      expect(position.hasZeroCostUnits).toBe(false)
    })
  })

  describe('warnings', () => {
    it('flags a sell stored with a positive quantity and still gets the balance right', () => {
      const { position, result } = only([
        txn({ id: 'a', quantity: dec(10) }),
        txn({ id: 'b', type: 'SELL', quantity: dec(4), tradeDate: '2026-03-01' }),
      ])
      expect(position.quantity.toString()).toBe('6')
      const warning = result.warnings.find((w) => w.code === 'SIGN_MISMATCH')
      expect(warning?.message).toContain('contradicts the transaction type')
    })

    it('skips a quantity-bearing transaction with no quantity', () => {
      const result = derive([txn({ id: 'a', quantity: null })])
      expect(result.positions).toEqual([])
      expect(result.warnings.map((w) => w.code)).toContain('MISSING_QUANTITY')
    })

    it('flags overselling and reports the resulting negative position', () => {
      const { position, result } = only([
        txn({ id: 'a', quantity: dec(5) }),
        txn({ id: 'b', type: 'SELL', quantity: dec(-8), tradeDate: '2026-03-01' }),
      ])
      expect(position.quantity.toString()).toBe('-3')
      const codes = result.warnings.map((w) => w.code)
      expect(codes).toContain('OVERSOLD')
      expect(codes).toContain('NEGATIVE_POSITION')
    })

    it('ignores non-quantity transaction types', () => {
      const result = derive([txn({ id: 'a', type: 'DIVIDEND', quantity: null, price: null })])
      expect(result.positions).toEqual([])
      expect(result.warnings).toEqual([])
    })

    it('handles a zero-quantity row without a spurious sign warning', () => {
      const result = derive([txn({ id: 'a', quantity: dec(0), price: dec(100) })])
      expect(result.positions).toEqual([])
      expect(result.warnings.filter((w) => w.code === 'SIGN_MISMATCH')).toEqual([])
    })

    it('reports UNKNOWN cost when a disposal leaves a zero-quantity remnant', () => {
      // Selling everything then re-acquiring nothing leaves quantity at zero;
      // the position is dropped rather than reporting a divide-by-zero cost.
      const result = derive([
        txn({ id: 'a', quantity: dec(5) }),
        txn({ id: 'b', type: 'SELL', quantity: dec(-5), tradeDate: '2026-02-01' }),
      ])
      expect(result.positions).toEqual([])
    })
  })

  describe('property: replay integrity', () => {
    const buySell = fc.array(
      fc.record({
        kind: fc.constantFrom<TxnType>('BUY', 'SELL'),
        qty: fc.integer({ min: 1, max: 100 }),
        price: fc.integer({ min: 1, max: 1000 }),
      }),
      { minLength: 1, maxLength: 12 },
    )

    it('is independent of the order rows are supplied in', () => {
      fc.assert(
        fc.property(buySell, (rows) => {
          const built = rows.map((r, i) =>
            txn({
              id: `t${String(i).padStart(3, '0')}`,
              type: r.kind,
              quantity: r.kind === 'SELL' ? dec(-r.qty) : dec(r.qty),
              price: dec(r.price),
              tradeDate: '2026-01-01',
            }),
          )
          const forward = derive(built).positions[0]?.quantity.toString() ?? 'none'
          const backward = derive([...built].reverse()).positions[0]?.quantity.toString() ?? 'none'
          expect(backward).toBe(forward)
        }),
        { numRuns: 200 },
      )
    })

    it('never produces a cost per unit that disagrees with total cost divided by quantity', () => {
      fc.assert(
        fc.property(buySell, (rows) => {
          const built = rows.map((r, i) =>
            txn({
              id: `t${String(i).padStart(3, '0')}`,
              type: r.kind,
              quantity: r.kind === 'SELL' ? dec(-r.qty) : dec(r.qty),
              price: dec(r.price),
              tradeDate: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
            }),
          )
          const position = derive(built).positions[0]
          if (position?.costBasis.status !== 'KNOWN') return
          const implied: Decimal = position.costBasis.totalCost.div(position.quantity)
          expect(implied.minus(position.costBasis.costPerUnit).abs().lessThan('1e-20')).toBe(true)
        }),
        { numRuns: 200 },
      )
    })
  })
})
