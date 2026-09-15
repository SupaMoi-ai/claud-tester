import 'server-only'
import { withUser } from '@/data/db'
import {
  type AccountRow,
  listAccounts,
  listCorporateActions,
  listExposures,
  listFxRates,
  listInstruments,
  listPrices,
  listTransactions,
  type TransactionRow,
} from '@/data/repos/portfolio'
import {
  type AllocationResult,
  allocateBy,
  type Exposure,
  type InstrumentWeight,
  instrumentWeights,
} from '@/domain/analytics/allocation'
import { type ConcentrationResult, concentration } from '@/domain/analytics/concentration'
import { derivePositions } from '@/domain/ledger/positions'
import type { Instrument, LedgerWarning } from '@/domain/types'
import { RecordFxBook, RecordPriceBook } from '@/domain/valuation/pricebook'
import { type ValuationResult, valuePositions } from '@/domain/valuation/value'
import type { SessionUser } from '@/lib/supabase/server'

export type PortfolioView = {
  readonly asOf: string
  readonly valuation: ValuationResult
  readonly weights: readonly InstrumentWeight[]
  readonly concentration: ConcentrationResult
  readonly byAssetClass: AllocationResult
  readonly instruments: ReadonlyMap<string, Instrument>
  readonly accounts: ReadonlyMap<string, AccountRow>
  readonly transactions: readonly TransactionRow[]
  readonly exposures: readonly Exposure[]
  readonly warnings: readonly LedgerWarning[]
  /** True when the portfolio has no transactions at all. */
  readonly isEmpty: boolean
}

/**
 * Assembles everything the portfolio screens need, in one round trip.
 *
 * All the arithmetic happens in `src/domain`; this function only fetches rows
 * and hands them over. Keeping the composition here rather than in a page
 * component means the same view can feed the UI, the scenario engine and the
 * AI's context builder without any of them recomputing it differently.
 */
export async function loadPortfolio(user: SessionUser, asOf?: string): Promise<PortfolioView> {
  const date = asOf ?? todayInOslo()

  return withUser({ userId: user.id, accessToken: user.accessToken }, async (sql) => {
    const [accounts, instruments, transactions, corporateActions, prices, fx, exposures] =
      await Promise.all([
        listAccounts(sql),
        listInstruments(sql),
        listTransactions(sql),
        listCorporateActions(sql),
        listPrices(sql, date),
        listFxRates(sql, date),
        listExposures(sql),
      ])

    const positionSet = derivePositions({ transactions, corporateActions, asOf: date })

    const valuation = valuePositions({
      positions: positionSet.positions,
      prices: new RecordPriceBook(prices),
      fx: new RecordFxBook(fx),
      asOf: date,
      base: 'NOK',
    })

    const weights = instrumentWeights(valuation.valued)

    return {
      asOf: date,
      valuation,
      weights,
      concentration: concentration(weights),
      byAssetClass: allocateBy(valuation.valued, exposures, 'ASSET_CLASS'),
      instruments: new Map(instruments.map((i) => [i.id, i])),
      accounts: new Map(accounts.map((a) => [a.id, a])),
      transactions,
      exposures,
      warnings: positionSet.warnings,
      isEmpty: transactions.length === 0,
    }
  })
}

/**
 * Today's date on the Oslo calendar.
 *
 * Deliberately not `new Date().toISOString()`: a server running in UTC would
 * roll the date over at 01:00 or 02:00 local time, which silently shifts a
 * day's worth of transactions into the wrong bucket.
 */
export function todayInOslo(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
