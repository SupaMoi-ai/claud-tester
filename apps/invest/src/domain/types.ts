import type { CurrencyCode, Decimal, IsoDate } from './money'

export type InstrumentKind = 'EQUITY' | 'ETF' | 'FUND' | 'BOND' | 'CRYPTO' | 'CASH' | 'COMMODITY'

/**
 * Ledger entry types.
 *
 * `OPENING_BALANCE` is how a holding whose purchase history you don't have
 * enters the system: a quantity, and a cost basis that may be known, estimated
 * or genuinely absent. It never invents a purchase date.
 *
 * `CORRECTION` exists because the ledger is append-only: a mistake is fixed by
 * a new row pointing at the one it reverses, never by an UPDATE.
 */
export type TxnType =
  | 'OPENING_BALANCE'
  | 'BUY'
  | 'SELL'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'DIVIDEND'
  | 'INTEREST'
  | 'FEE'
  | 'TAX'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'STAKING_REWARD'
  | 'AIRDROP'
  | 'CORRECTION'

/** Direction a transaction type moves the position it belongs to. */
export const QUANTITY_SIGN: Readonly<Partial<Record<TxnType, 1 | -1>>> = Object.freeze({
  OPENING_BALANCE: 1,
  BUY: 1,
  TRANSFER_IN: 1,
  STAKING_REWARD: 1,
  AIRDROP: 1,
  SELL: -1,
  TRANSFER_OUT: -1,
})

/** Types that acquire units at no cost, which drags average cost down. */
export const ZERO_COST_ACQUISITIONS: ReadonlySet<TxnType> = new Set<TxnType>([
  'STAKING_REWARD',
  'AIRDROP',
])

export function affectsQuantity(type: TxnType): boolean {
  return QUANTITY_SIGN[type] !== undefined
}

export type Instrument = {
  readonly id: string
  readonly kind: InstrumentKind
  readonly symbol: string
  readonly name: string
  /** Currency this instrument is quoted in. For CASH, the currency it *is*. */
  readonly currency: CurrencyCode
  readonly mic?: string
  readonly isin?: string
}

export type Transaction = {
  readonly id: string
  readonly accountId: string
  readonly instrumentId: string
  readonly type: TxnType
  readonly tradeDate: IsoDate
  /**
   * Signed: positive increases the position. Magnitude is authoritative; a
   * sign that contradicts `type` is reported as a `LedgerWarning` rather than
   * silently absorbed.
   */
  readonly quantity: Decimal | null
  /** Per unit, in `currency`. Null means "cost basis genuinely unknown". */
  readonly price: Decimal | null
  readonly fee: Decimal
  readonly currency: CurrencyCode
  /** Rate captured at trade time. Null for NOK-denominated rows. */
  readonly fxRateToNok: Decimal | null
  /** New row that reverses an earlier one. Both stay in the ledger. */
  readonly reversesTransactionId?: string
}

export type CorporateActionType =
  | 'SPLIT'
  | 'REVERSE_SPLIT'
  | 'SPINOFF'
  | 'MERGER'
  | 'TICKER_CHANGE'
  | 'DELISTING'

/**
 * A split is a property of the instrument, not of any one account's ledger:
 * it applies to every holder and it must retroactively adjust historical
 * *prices* too, which a per-account ledger row cannot express.
 *
 * Ratio is "`ratioNum` new shares per `ratioDen` old shares". Otovo's 10-for-1
 * reverse split (ex-date 2026-02-03) is `{ ratioNum: 1, ratioDen: 10 }`.
 */
export type CorporateAction = {
  readonly id: string
  readonly instrumentId: string
  readonly type: CorporateActionType
  readonly exDate: IsoDate
  readonly ratioNum: Decimal
  readonly ratioDen: Decimal
}

export type LedgerWarningCode =
  | 'SIGN_MISMATCH'
  | 'NEGATIVE_POSITION'
  | 'MISSING_QUANTITY'
  | 'UNKNOWN_COST_BASIS'
  | 'ZERO_COST_ACQUISITION'
  | 'MISSING_FX_RATE'
  | 'OVERSOLD'

export type LedgerWarning = {
  readonly code: LedgerWarningCode
  readonly message: string
  readonly transactionId?: string
  readonly accountId?: string
  readonly instrumentId?: string
}

/**
 * Cost basis is a three-state fact, not a number that defaults to zero.
 * "I don't know what I paid" is a legitimate, representable answer -- and for
 * holdings imported from a broker screenshot it is the honest one.
 */
export type CostBasis =
  | {
      readonly status: 'KNOWN'
      readonly totalCost: Decimal
      readonly costPerUnit: Decimal
      readonly currency: CurrencyCode
      /** Null when an FX rate was missing on at least one contributing row. */
      readonly totalCostNok: Decimal | null
    }
  | { readonly status: 'UNKNOWN'; readonly reason: string }

export type Position = {
  readonly accountId: string
  readonly instrumentId: string
  readonly quantity: Decimal
  readonly currency: CurrencyCode
  readonly costBasis: CostBasis
  /** True when staking rewards or airdrops contributed units at no cost. */
  readonly hasZeroCostUnits: boolean
}

export type PositionSet = {
  readonly positions: readonly Position[]
  readonly warnings: readonly LedgerWarning[]
  readonly asOf: IsoDate
}
