import type { Decimal } from '../money'

export type DetectorKey =
  | 'concentration.single_name'
  | 'concentration.effective_holdings'
  | 'asset_class.dominant'
  | 'data.unpriced_position'
  | 'data.stale_price'
  | 'data.unknown_cost_basis'
  | 'data.unconfirmed_holding'
  | 'ledger.warning'

/** 1 = worth knowing, 5 = deal with this now. */
export type Severity = 1 | 2 | 3 | 4 | 5

/**
 * A finding produced by deterministic code.
 *
 * `facts` is the only place numbers may come from. When the AI layer arrives it
 * writes prose *from* this payload and a guard checks that every figure in its
 * sentence appears here -- the model never decides whether something is an
 * issue, only how to say it. That inversion is what makes these findings stable
 * between page loads and testable at all.
 *
 * `headline` is the code-written sentence, and it is always sufficient on its
 * own; AI prose is an enhancement, never a dependency.
 */
export type DetectorHit = {
  readonly key: DetectorKey
  readonly severity: Severity
  readonly headline: string
  readonly detail?: string
  readonly subjectId?: string
  readonly facts: Readonly<Record<string, string | number | boolean>>
  /**
   * Stable identity for this finding, so the same observation is not raised
   * afresh on every render. Includes the subject but not the exact value, so a
   * concentration that drifts from 89.3% to 89.4% stays one finding.
   */
  readonly fingerprint: string
}

export type DetectorContext = {
  readonly totalBase: Decimal
  readonly asOf: string
}
