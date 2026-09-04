/**
 * XP and reputation.
 *
 * PURE MODULE. No I/O. The server is the only thing that actually awards XP
 * (see rpc_create_report / rpc_vote_report in supabase/schema.sql) — this
 * module exists so the client can predict and display awards, and so the
 * anti-spam arithmetic is testable.
 *
 * Design rule from the product brief: accuracy and confirmation must be worth
 * more than volume. That is enforced here as arithmetic rather than as a
 * policy — see spamYield() vs accurateYield() in tools/test.html.
 */

export const XP = {
  /** Filing a report is barely rewarded. Volume is not the goal. */
  REPORT_SUBMITTED: 2,
  /** Being right is where the value is. */
  REPORT_CONFIRMED: 15,
  REPORT_HIGH_CONFIDENCE: 15,
  /** Being wrong costs more than filing was worth. */
  REPORT_DISMISSED: -10,
  /** Participating in someone else's signal. */
  VOTE_CAST: 3,
  /** Judging correctly — paid when the report settles the way you voted. */
  VOTE_ACCURATE: 5,
  /** Showing up. */
  DAILY_FIRST_ACTION: 5,
  STREAK_5_DAY: 20,
};

/** Underground, not corporate. Order matters — ascending by threshold. */
export const RANKS = [
  { name: 'ROOKIE', at: 0 },
  { name: 'SPOTTER', at: 100 },
  { name: 'SCOUT', at: 300 },
  { name: 'TRACKER', at: 750 },
  { name: 'INSIDER', at: 1500 },
  { name: 'VETERAN', at: 3000 },
  { name: 'LEGEND', at: 6000 },
];

/** Rank for a given XP total. */
export function rankFor(xp) {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.at) current = r;
    else break;
  }
  return current.name;
}

/** The next rank up, or null at LEGEND. */
export function nextRank(xp) {
  return RANKS.find((r) => r.at > xp) ?? null;
}

/**
 * Progress toward the next rank, 0..1. Returns 1 at LEGEND.
 * Used by the progress meter on PROFILE.
 */
export function rankProgress(xp) {
  const next = nextRank(xp);
  if (!next) return 1;
  const current = RANKS.filter((r) => r.at <= xp).pop() ?? RANKS[0];
  const span = next.at - current.at;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (xp - current.at) / span));
}

/** XP still needed for the next rank, or 0 at LEGEND. */
export function xpToNext(xp) {
  const next = nextRank(xp);
  return next ? Math.max(0, next.at - xp) : 0;
}

/**
 * XP a reporter earns as their report climbs the confidence ladder.
 * Awards are cumulative and paid once per transition, so a report that goes
 * straight to HIGH_CONFIDENCE still pays the CONFIRMED step.
 *
 * @param {string} from  previous STATE
 * @param {string} to    new STATE
 */
export function xpForStateChange(from, to) {
  if (from === to) return 0;
  let total = 0;
  const rank = { UNCONFIRMED: 0, CONFIRMED: 1, HIGH_CONFIDENCE: 2 };
  if (to === 'DISMISSED') return XP.REPORT_DISMISSED;
  const a = rank[from];
  const b = rank[to];
  if (a == null || b == null || b <= a) return 0;
  if (a < 1 && b >= 1) total += XP.REPORT_CONFIRMED;
  if (a < 2 && b >= 2) total += XP.REPORT_HIGH_CONFIDENCE;
  return total;
}

/** Human label for an XP ledger entry. */
export const XP_REASON_LABEL = {
  REPORT_SUBMITTED: 'SIGNAL SENT',
  REPORT_CONFIRMED: 'SIGNAL CONFIRMED',
  REPORT_HIGH_CONFIDENCE: 'HIGH CONFIDENCE REACHED',
  REPORT_DISMISSED: 'SIGNAL REJECTED',
  VOTE_CAST: 'INTEL CONFIRMED',
  VOTE_ACCURATE: 'ACCURATE CALL',
  DAILY_FIRST_ACTION: 'DAILY CHECK-IN',
  STREAK_5_DAY: '5-DAY STREAK',
};
