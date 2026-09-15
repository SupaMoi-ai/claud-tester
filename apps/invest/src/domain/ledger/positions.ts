import { type CurrencyCode, type Decimal, type IsoDate, ONE, safeDiv, ZERO } from '../money'
import {
  affectsQuantity,
  type CorporateAction,
  type CostBasis,
  type LedgerWarning,
  type Position,
  type PositionSet,
  QUANTITY_SIGN,
  type Transaction,
  ZERO_COST_ACQUISITIONS,
} from '../types'
import { adjustmentFactor } from './corporate-actions'

export type DerivePositionsInput = {
  readonly transactions: readonly Transaction[]
  readonly corporateActions: readonly CorporateAction[]
  readonly asOf: IsoDate
}

/**
 * Replays the append-only ledger into current positions.
 *
 * Positions are always derived, never stored as truth. Everything downstream
 * -- valuation, allocation, concentration, the AI's context -- reads from this
 * function's output, so it is the single place where a quantity can go wrong.
 *
 * Cost basis uses the running average method. Norway's statutory method for
 * realised gains on shares is FIFO, which needs lot tracking; average cost is
 * the right choice for the *unrealised* cost-per-unit this function reports,
 * and `tax_lots` exists in the schema for when realised P&L is added.
 */
export function derivePositions(input: DerivePositionsInput): PositionSet {
  const { transactions, corporateActions, asOf } = input
  const warnings: LedgerWarning[] = []

  const reversed = new Set<string>()
  for (const txn of transactions) {
    if (txn.reversesTransactionId) reversed.add(txn.reversesTransactionId)
  }

  const applicable = transactions
    .filter((t) => t.tradeDate <= asOf && t.type !== 'CORRECTION' && !reversed.has(t.id))
    .sort(compareForReplay)

  const states = new Map<string, MutableState>()

  for (const txn of applicable) {
    if (!affectsQuantity(txn.type)) continue

    const key = positionKey(txn.accountId, txn.instrumentId)
    let state = states.get(key)
    if (!state) {
      state = newState(txn.accountId, txn.instrumentId, txn.currency)
      states.set(key, state)
    }

    const signed = signedQuantity(txn, warnings)
    if (signed === null) continue

    // Restate this historical quantity in the share terms in effect on `asOf`.
    const factor = adjustmentFactor(corporateActions, txn.instrumentId, txn.tradeDate, asOf)
    const adjustedQty = signed.times(factor)

    if (adjustedQty.isNegative()) {
      applyDisposal(state, adjustedQty, warnings, txn)
    } else {
      applyAcquisition(state, adjustedQty, factor, txn, warnings)
    }
  }

  const positions: Position[] = []
  for (const state of states.values()) {
    if (state.quantity.isZero()) continue

    if (state.quantity.isNegative()) {
      warnings.push({
        code: 'NEGATIVE_POSITION',
        message:
          `Position in ${state.instrumentId} on account ${state.accountId} is negative ` +
          `(${state.quantity.toString()}). The ledger is probably missing an acquisition.`,
        accountId: state.accountId,
        instrumentId: state.instrumentId,
      })
    }

    positions.push({
      accountId: state.accountId,
      instrumentId: state.instrumentId,
      quantity: state.quantity,
      currency: state.currency,
      costBasis: finaliseCostBasis(state),
      hasZeroCostUnits: state.hasZeroCostUnits,
    })
  }

  positions.sort(
    (a, b) =>
      a.accountId.localeCompare(b.accountId) || a.instrumentId.localeCompare(b.instrumentId),
  )

  return { positions, warnings, asOf }
}

type MutableState = {
  accountId: string
  instrumentId: string
  currency: CurrencyCode
  quantity: Decimal
  /** Total acquisition cost, in the transaction currency. */
  cost: Decimal
  /** Same, converted to NOK at each transaction's captured rate. */
  costNok: Decimal
  /** Non-null once any acquisition failed to record a price. */
  costUnknownReason: string | null
  nokUnknown: boolean
  hasZeroCostUnits: boolean
}

/**
 * A position is identified by account *and* instrument. Both are UUIDs, so a
 * separator that cannot occur inside either keeps the key unambiguous.
 */
function positionKey(accountId: string, instrumentId: string): string {
  return `${accountId}::${instrumentId}`
}

function newState(accountId: string, instrumentId: string, currency: CurrencyCode): MutableState {
  return {
    accountId,
    instrumentId,
    currency,
    quantity: ZERO,
    cost: ZERO,
    costNok: ZERO,
    costUnknownReason: null,
    nokUnknown: false,
    hasZeroCostUnits: false,
  }
}

/**
 * Same-date rows are ordered by id so a replay is deterministic and
 * order-independent for a given day -- asserted as a property test.
 */
function compareForReplay(a: Transaction, b: Transaction): number {
  if (a.tradeDate !== b.tradeDate) return a.tradeDate < b.tradeDate ? -1 : 1
  return a.id.localeCompare(b.id)
}

/**
 * The stored sign is authoritative in magnitude only. A SELL recorded with a
 * positive quantity is a data-entry error; we apply the sign the type implies
 * and report it, because silently trusting either one produces a wrong balance.
 */
function signedQuantity(txn: Transaction, warnings: LedgerWarning[]): Decimal | null {
  if (txn.quantity === null) {
    warnings.push({
      code: 'MISSING_QUANTITY',
      message: `${txn.type} transaction ${txn.id} has no quantity and was skipped`,
      transactionId: txn.id,
      accountId: txn.accountId,
      instrumentId: txn.instrumentId,
    })
    return null
  }

  const expected = QUANTITY_SIGN[txn.type]
  if (expected === undefined) return null

  const magnitude = txn.quantity.abs()
  const stored = txn.quantity.isNegative() ? -1 : 1

  if (!txn.quantity.isZero() && stored !== expected) {
    warnings.push({
      code: 'SIGN_MISMATCH',
      message:
        `${txn.type} transaction ${txn.id} stores quantity ${txn.quantity.toString()}, ` +
        `whose sign contradicts the transaction type. Treated as ` +
        `${expected === 1 ? '+' : '-'}${magnitude.toString()}.`,
      transactionId: txn.id,
      accountId: txn.accountId,
      instrumentId: txn.instrumentId,
    })
  }

  return expected === 1 ? magnitude : magnitude.negated()
}

function applyAcquisition(
  state: MutableState,
  adjustedQty: Decimal,
  factor: Decimal,
  txn: Transaction,
  warnings: LedgerWarning[],
): void {
  state.quantity = state.quantity.plus(adjustedQty)

  if (ZERO_COST_ACQUISITIONS.has(txn.type) && txn.price === null) {
    // Units acquired at no cost. Quantity rises, cost doesn't -- average cost
    // falls, which is correct, but it's worth surfacing.
    state.hasZeroCostUnits = true
    warnings.push({
      code: 'ZERO_COST_ACQUISITION',
      message:
        `${txn.type} transaction ${txn.id} added ${adjustedQty.toString()} units at no recorded ` +
        'cost, which lowers the average cost per unit.',
      transactionId: txn.id,
      accountId: txn.accountId,
      instrumentId: txn.instrumentId,
    })
    return
  }

  if (txn.price === null) {
    state.costUnknownReason ??=
      `${txn.type} transaction ${txn.id} records no price, so the cost basis of this ` +
      'position is unknown rather than zero.'
    warnings.push({
      code: 'UNKNOWN_COST_BASIS',
      message: state.costUnknownReason,
      transactionId: txn.id,
      accountId: txn.accountId,
      instrumentId: txn.instrumentId,
    })
    return
  }

  // Price is quoted per share as at the trade date; restate it the opposite
  // way to the quantity so the transaction's total consideration is unchanged.
  const adjustedPrice = factor.isZero() ? txn.price : txn.price.div(factor)
  const consideration = adjustedQty.times(adjustedPrice).plus(txn.fee)
  state.cost = state.cost.plus(consideration)

  const fx = resolveFxToNok(txn)
  if (fx === null) {
    state.nokUnknown = true
    warnings.push({
      code: 'MISSING_FX_RATE',
      message:
        `Transaction ${txn.id} is in ${txn.currency} with no captured NOK rate, so the NOK ` +
        'cost of this position cannot be established.',
      transactionId: txn.id,
      accountId: txn.accountId,
      instrumentId: txn.instrumentId,
    })
  } else {
    state.costNok = state.costNok.plus(consideration.times(fx))
  }
}

function applyDisposal(
  state: MutableState,
  adjustedQty: Decimal,
  warnings: LedgerWarning[],
  txn: Transaction,
): void {
  const disposed = adjustedQty.abs()

  if (disposed.greaterThan(state.quantity)) {
    warnings.push({
      code: 'OVERSOLD',
      message:
        `Transaction ${txn.id} disposes of ${disposed.toString()} units but only ` +
        `${state.quantity.toString()} are on record. The ledger is incomplete.`,
      transactionId: txn.id,
      accountId: txn.accountId,
      instrumentId: txn.instrumentId,
    })
  }

  // Remove cost proportionally to the fraction of the position sold, which is
  // exactly the average-cost method.
  const fraction = safeDiv(disposed, state.quantity)
  if (fraction !== null) {
    const remaining = ONE.minus(fraction)
    const keep = remaining.isNegative() ? ZERO : remaining
    state.cost = state.cost.times(keep)
    state.costNok = state.costNok.times(keep)
  }

  state.quantity = state.quantity.minus(disposed)
}

function resolveFxToNok(txn: Transaction): Decimal | null {
  if (txn.fxRateToNok !== null) return txn.fxRateToNok
  if (txn.currency === 'NOK') return ONE
  return null
}

/** Called only for states with a non-zero quantity; the caller drops the rest. */
function finaliseCostBasis(state: MutableState): CostBasis {
  if (state.costUnknownReason !== null) {
    return { status: 'UNKNOWN', reason: state.costUnknownReason }
  }

  return {
    status: 'KNOWN',
    totalCost: state.cost,
    costPerUnit: state.cost.div(state.quantity),
    currency: state.currency,
    totalCostNok: state.nokUnknown ? null : state.costNok,
  }
}
