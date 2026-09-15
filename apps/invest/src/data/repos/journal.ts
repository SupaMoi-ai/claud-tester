import 'server-only'
import type { TransactionSql } from 'postgres'
import { type Decimal, dec } from '@/domain/money'
import * as Q from './queries'

export type JournalKind =
  | 'BOUGHT'
  | 'ADDED'
  | 'REDUCED'
  | 'SOLD'
  | 'DECIDED_NOT_TO_BUY'
  | 'THESIS_REVIEW'
  | 'NOTE'

export type JournalEntry = {
  readonly id: string
  readonly occurredAt: string
  readonly kind: JournalKind
  readonly title: string | null
  readonly body: string
  readonly whatIExpected: string | null
  readonly instrumentId: string | null
  readonly instrumentName: string | null
  readonly conviction: number | null
}

export async function listJournal(
  sql: TransactionSql,
  opts?: { instrumentId?: string; limit?: number },
): Promise<JournalEntry[]> {
  const rows = await sql.unsafe<
    Array<{
      id: string
      occurred_at: string
      kind: string
      title: string | null
      body_md: string
      what_i_expected: string | null
      instrument_id: string | null
      instrument_name: string | null
      conviction: number | null
    }>
  >(
    opts?.instrumentId ? Q.LIST_JOURNAL_FOR_INSTRUMENT : Q.LIST_JOURNAL,
    opts?.instrumentId ? [opts.instrumentId, opts.limit ?? 100] : [opts?.limit ?? 100],
  )

  return rows.map((r) => ({
    id: r.id,
    occurredAt: r.occurred_at,
    kind: r.kind as JournalKind,
    title: r.title,
    body: r.body_md,
    whatIExpected: r.what_i_expected,
    instrumentId: r.instrument_id,
    instrumentName: r.instrument_name,
    conviction: r.conviction,
  }))
}

export type WatchlistItem = {
  readonly id: string
  readonly instrumentId: string
  readonly instrumentName: string
  readonly instrumentSymbol: string
  readonly addedAt: string
  readonly targetBuyPrice: Decimal | null
  readonly targetCurrency: string | null
  readonly whatWouldMakeMeBuy: string | null
}

export async function listWatchlist(sql: TransactionSql): Promise<WatchlistItem[]> {
  const rows = await sql.unsafe<
    Array<{
      id: string
      instrument_id: string
      instrument_name: string
      instrument_symbol: string
      added_at: string
      target_buy_price: string | null
      target_currency: string | null
      what_would_make_me_buy: string | null
    }>
  >(Q.LIST_WATCHLIST)

  return rows.map((r) => ({
    id: r.id,
    instrumentId: r.instrument_id,
    instrumentName: r.instrument_name,
    instrumentSymbol: r.instrument_symbol,
    addedAt: r.added_at,
    targetBuyPrice: r.target_buy_price === null ? null : dec(r.target_buy_price),
    targetCurrency: r.target_currency,
    whatWouldMakeMeBuy: r.what_would_make_me_buy,
  }))
}
