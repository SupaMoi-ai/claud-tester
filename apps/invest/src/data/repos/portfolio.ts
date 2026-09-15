import 'server-only'
import type { TransactionSql } from 'postgres'
import type { Exposure, ExposureDimension } from '@/domain/analytics/allocation'
import { type CurrencyCode, dec } from '@/domain/money'
import type {
  CorporateAction,
  Instrument,
  InstrumentKind,
  Transaction,
  TxnType,
} from '@/domain/types'
import type { FxRecord, PriceRecord } from '@/domain/valuation/pricebook'
import * as Q from './queries'

/**
 * Reads the raw material the domain engine needs.
 *
 * Every numeric column is cast to text in SQL and parsed with `dec()`. That is
 * not belt-and-braces: `numeric` arriving as a JS number is a float, and a
 * float cannot hold 0.01022079 BTC exactly. The casts make the intent explicit
 * at the point it matters, independently of the driver's own configuration.
 */

export type AccountRow = {
  readonly id: string
  readonly name: string
  readonly kind: string
  readonly provider: string | null
  readonly currency: CurrencyCode
  readonly taxWrapper: string
}

export async function listAccounts(sql: TransactionSql): Promise<AccountRow[]> {
  const rows = await sql.unsafe<
    Array<{
      id: string
      name: string
      kind: string
      provider: string | null
      currency: string
      tax_wrapper: string
    }>
  >(Q.LIST_ACCOUNTS)
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    provider: r.provider,
    currency: r.currency,
    taxWrapper: r.tax_wrapper,
  }))
}

export async function listInstruments(sql: TransactionSql): Promise<Instrument[]> {
  const rows = await sql.unsafe<
    Array<{
      id: string
      kind: string
      symbol: string
      name: string
      currency: string
      mic: string | null
      isin: string | null
    }>
  >(Q.LIST_INSTRUMENTS)
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as InstrumentKind,
    symbol: r.symbol,
    name: r.name,
    currency: r.currency,
    ...(r.mic ? { mic: r.mic } : {}),
    ...(r.isin ? { isin: r.isin } : {}),
  }))
}

export type TransactionRow = Transaction & {
  readonly costBasisConfidence: 'KNOWN' | 'ESTIMATED' | 'UNKNOWN'
  readonly note: string | null
}

export async function listTransactions(
  sql: TransactionSql,
  opts?: { instrumentId?: string },
): Promise<TransactionRow[]> {
  const rows = await sql.unsafe<
    Array<{
      id: string
      account_id: string
      instrument_id: string | null
      type: string
      trade_date: string
      quantity: string | null
      price: string | null
      fee: string
      currency: string
      fx_rate_to_nok: string | null
      cost_basis_confidence: string
      reverses_transaction_id: string | null
      note: string | null
    }>
  >(
    opts?.instrumentId ? Q.LIST_TRANSACTIONS_FOR_INSTRUMENT : Q.LIST_TRANSACTIONS,
    opts?.instrumentId ? [opts.instrumentId] : [],
  )

  return rows.map((r) => ({
    id: r.id,
    accountId: r.account_id,
    // Guarded by the `instrument_id is not null` predicate above.
    instrumentId: r.instrument_id as string,
    type: r.type as TxnType,
    tradeDate: r.trade_date,
    quantity: r.quantity === null ? null : dec(r.quantity),
    price: r.price === null ? null : dec(r.price),
    fee: dec(r.fee),
    currency: r.currency,
    fxRateToNok: r.fx_rate_to_nok === null ? null : dec(r.fx_rate_to_nok),
    costBasisConfidence: r.cost_basis_confidence as TransactionRow['costBasisConfidence'],
    note: r.note,
    ...(r.reverses_transaction_id ? { reversesTransactionId: r.reverses_transaction_id } : {}),
  }))
}

export async function listCorporateActions(sql: TransactionSql): Promise<CorporateAction[]> {
  const rows = await sql.unsafe<
    Array<{
      id: string
      instrument_id: string
      type: string
      ex_date: string
      ratio_num: string | null
      ratio_den: string | null
    }>
  >(Q.LIST_CORPORATE_ACTIONS)
  return rows.map((r) => ({
    id: r.id,
    instrumentId: r.instrument_id,
    type: r.type as CorporateAction['type'],
    exDate: r.ex_date,
    ratioNum: dec(r.ratio_num ?? '1'),
    ratioDen: dec(r.ratio_den ?? '1'),
  }))
}

/**
 * Prices at or before `asOf`.
 *
 * Deliberately excludes anything dated later, so a historical valuation cannot
 * see the future. Where several sources have the same date the most recently
 * fetched wins.
 */
export async function listPrices(sql: TransactionSql, asOf: string): Promise<PriceRecord[]> {
  const rows = await sql.unsafe<
    Array<{
      instrument_id: string
      as_of: string
      close: string
      currency: string
      source: string
    }>
  >(Q.LIST_PRICES, [asOf])
  return rows.map((r) => ({
    instrumentId: r.instrument_id,
    asOf: r.as_of,
    price: dec(r.close),
    currency: r.currency,
    source: r.source,
  }))
}

export async function listFxRates(sql: TransactionSql, asOf: string): Promise<FxRecord[]> {
  const rows = await sql.unsafe<
    Array<{ base: string; quote: string; as_of: string; rate: string; source: string }>
  >(Q.LIST_FX_RATES, [asOf])
  return rows.map((r) => ({
    base: r.base,
    quote: r.quote,
    asOf: r.as_of,
    rate: dec(r.rate),
    source: r.source,
  }))
}

export async function listExposures(sql: TransactionSql): Promise<Exposure[]> {
  const rows = await sql.unsafe<
    Array<{ instrument_id: string; dimension: string; tag: string; weight: string }>
  >(Q.LIST_EXPOSURES)
  return rows.map((r) => ({
    instrumentId: r.instrument_id,
    dimension: r.dimension as ExposureDimension,
    tag: r.tag,
    weight: dec(r.weight),
  }))
}
