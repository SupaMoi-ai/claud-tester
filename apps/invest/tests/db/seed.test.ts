import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { instrumentWeights } from '@/domain/analytics/allocation'
import { concentration } from '@/domain/analytics/concentration'
import { derivePositions } from '@/domain/ledger/positions'
import { dec } from '@/domain/money'
import type { CorporateAction, Transaction } from '@/domain/types'
import { type PriceRecord, RecordFxBook, RecordPriceBook } from '@/domain/valuation/pricebook'
import { valuePositions } from '@/domain/valuation/value'
import { createTestDb, seedUser, type TestDb } from './harness'

const SEED_PATH = new URL('../../supabase/seed.sql', import.meta.url).pathname
const AS_OF = '2026-09-14'

type TxnRow = {
  id: string
  account_id: string
  instrument_id: string
  type: string
  trade_date: string
  quantity: string | null
  price: string | null
  fee: string
  currency: string
  fx_rate_to_nok: string | null
  cost_basis_confidence: string
}

/**
 * The full path, exercised for real: seed SQL applied to a live Postgres, rows
 * read back out, run through the actual domain engine, and checked against the
 * figures on the Firi and Nordnet screenshots.
 *
 * This is the test that would catch a mismatch between what the database stores
 * and what the calculation layer expects -- which unit tests on either side,
 * alone, cannot.
 */
describe('seed -> database -> domain engine', () => {
  let t: TestDb
  let transactions: Transaction[]
  let corporateActions: CorporateAction[]
  let prices: PriceRecord[]
  let otovoId: string

  beforeAll(async () => {
    t = await createTestDb()
    await seedUser(t.db, 'thomas@example.com')
    await t.db.exec(await readFile(SEED_PATH, 'utf8'))

    const txnRows = await t.db.query<TxnRow>(`
      select id, account_id, instrument_id, type, trade_date::text as trade_date,
             quantity::text as quantity, price::text as price, fee::text as fee,
             currency, fx_rate_to_nok::text as fx_rate_to_nok,
             cost_basis_confidence::text as cost_basis_confidence
      from transactions
    `)
    transactions = txnRows.rows.map((r) => ({
      id: r.id,
      accountId: r.account_id,
      instrumentId: r.instrument_id,
      type: r.type as Transaction['type'],
      tradeDate: r.trade_date,
      quantity: r.quantity === null ? null : dec(r.quantity),
      price: r.price === null ? null : dec(r.price),
      fee: dec(r.fee),
      currency: r.currency,
      fxRateToNok: r.fx_rate_to_nok === null ? null : dec(r.fx_rate_to_nok),
    }))

    const otovoRow = await t.db.query<{ id: string }>(
      "select id from instruments where symbol = 'OTOVO'",
    )
    otovoId = otovoRow.rows[0]?.id ?? ''

    const caRows = await t.db.query<{
      id: string
      instrument_id: string
      type: string
      ex_date: string
      ratio_num: string
      ratio_den: string
    }>(`
      select id, instrument_id, type::text as type, ex_date::text as ex_date,
             ratio_num::text as ratio_num, ratio_den::text as ratio_den
      from corporate_actions
    `)
    corporateActions = caRows.rows.map((r) => ({
      id: r.id,
      instrumentId: r.instrument_id,
      type: r.type as CorporateAction['type'],
      exDate: r.ex_date,
      ratioNum: dec(r.ratio_num),
      ratioDen: dec(r.ratio_den),
    }))

    const priceRows = await t.db.query<{
      instrument_id: string
      as_of: string
      close: string
      currency: string
      source: string
    }>(`
      select instrument_id, as_of::text as as_of, close::text as close, currency, source
      from prices
    `)
    prices = priceRows.rows.map((r) => ({
      instrumentId: r.instrument_id,
      asOf: r.as_of,
      price: dec(r.close),
      currency: r.currency,
      source: r.source,
    }))
  })

  afterAll(async () => {
    await t?.close()
  })

  it('creates both accounts and four instruments', async () => {
    const accounts = await t.db.query<{ name: string }>('select name from accounts order by name')
    expect(accounts.rows.map((r) => r.name)).toEqual(['Firi', 'Nordnet'])

    const instruments = await t.db.query<{ symbol: string }>(
      'select symbol from instruments order by symbol',
    )
    expect(instruments.rows.map((r) => r.symbol)).toEqual(['BTC', 'NOK', 'OTOVO', 'XRP'])
  })

  it('records the Otovo reverse split', () => {
    expect(corporateActions).toHaveLength(1)
    const action = corporateActions[0]
    expect(action?.type).toBe('REVERSE_SPLIT')
    expect(action?.exDate).toBe('2026-02-03')
  })

  it('marks the Firi cost bases UNKNOWN and the Otovo one ESTIMATED', async () => {
    const rows = await t.db.query<{ symbol: string; confidence: string }>(`
      select i.symbol, t.cost_basis_confidence::text as confidence
      from transactions t join instruments i on i.id = t.instrument_id
      order by i.symbol
    `)
    expect(Object.fromEntries(rows.rows.map((r) => [r.symbol, r.confidence]))).toEqual({
      BTC: 'UNKNOWN',
      XRP: 'UNKNOWN',
      NOK: 'KNOWN',
      OTOVO: 'ESTIMATED',
    })
  })

  it('preserves 0.01022079 BTC through a full database round-trip', () => {
    const btc = transactions.find((tx) => tx.quantity?.equals(dec('0.01022079')))
    expect(btc).toBeDefined()
    expect(btc?.quantity?.toString()).toBe('0.01022079')
  })

  describe('valuation', () => {
    it('reproduces the screenshot totals exactly', () => {
      const positions = derivePositions({ transactions, corporateActions, asOf: AS_OF })
      const valuation = valuePositions({
        positions: positions.positions,
        prices: new RecordPriceBook(prices),
        fx: new RecordFxBook([]),
        asOf: AS_OF,
        base: 'NOK',
      })

      expect(valuation.complete).toBe(true)
      expect(valuation.coverage).toEqual({ priced: 4, total: 4 })
      expect(valuation.totalBase.toDecimalPlaces(2).toString()).toBe('8378.11')

      const weights = instrumentWeights(valuation.valued)
      const crypto = weights
        .filter((w) => w.valueBase.greaterThan(100))
        .reduce((acc, w) => acc.plus(w.weight), dec(0))
      expect(crypto.times(100).toDecimalPlaces(2).toString()).toBe('98.94')

      const conc = concentration(weights)
      expect(conc.effectiveHoldings?.toDecimalPlaces(2).toString()).toBe('1.24')
    })

    it('restates Otovo to 8 shares at 144.06, from 80 pre-split at 14.406', () => {
      const positions = derivePositions({ transactions, corporateActions, asOf: AS_OF })
      const otovo = positions.positions.find((p) => p.instrumentId === otovoId)
      expect(otovo?.quantity.toString()).toBe('8')
      if (otovo?.costBasis.status !== 'KNOWN') throw new Error('unreachable')
      expect(otovo.costBasis.costPerUnit.toString()).toBe('144.06')
    })

    it('shows Otovo as 80 shares when valued BEFORE the split date', () => {
      // A valuation dated before the ex-date must see the position as it was:
      // 80 shares. Getting this wrong makes every historical chart wrong.
      const positions = derivePositions({
        transactions,
        corporateActions,
        asOf: '2026-01-31',
      })
      const otovo = positions.positions.find((p) => p.instrumentId === otovoId)
      expect(otovo?.quantity.toString()).toBe('80')
    })
  })
})
