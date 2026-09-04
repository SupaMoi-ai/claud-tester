/**
 * Community inspection signals — confidence state machine.
 *
 * PURE MODULE. No I/O, no DOM, no imports from data/ or ui/.
 * The database enforces these same rules server-side (see supabase/schema.sql);
 * this module exists so the client can render state instantly and so the rules
 * are testable in isolation (tools/test.html).
 *
 * A single report is only a signal. Community confirmation is what makes it
 * reliable, and time is what makes it irrelevant.
 */

export const STATE = {
  UNCONFIRMED: 'UNCONFIRMED',
  CONFIRMED: 'CONFIRMED',
  HIGH_CONFIDENCE: 'HIGH_CONFIDENCE',
  DISMISSED: 'DISMISSED',
  EXPIRED: 'EXPIRED',
};

/** Human-facing labels. Never show raw enum values in the UI. */
export const STATE_LABEL = {
  UNCONFIRMED: 'UNCONFIRMED',
  CONFIRMED: 'CONFIRMED',
  HIGH_CONFIDENCE: 'HIGH CONFIDENCE',
  DISMISSED: 'NOT THERE',
  EXPIRED: 'EXPIRED',
};

export const CONTEXT = { STATION: 'station', TRAIN: 'train' };
export const DIRECTION = { NORTH: 'north', SOUTH: 'south' };

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

/**
 * Score thresholds. Weighted, not raw counts — see voteWeight().
 * CONFIRMED at 2 means one corroboration from a reasonably-reputed user,
 * not a single tap from a friend.
 */
export const THRESHOLD = {
  CONFIRMED: 2,
  HIGH_CONFIDENCE: 4,
  DISMISSED: -2,
};

/**
 * Base time-to-live in minutes.
 *
 * A station signal outlives a train signal because a train moves: intel about
 * "inspectors on the 07:42" decays as that service travels away from you,
 * while "inspectors at Bryne" stays locally true for longer.
 *
 * 40 minutes is long enough to help someone 3-4 stops away (northern L5 stop
 * spacing is ~3-6 min) and short enough that stale intel dies before it
 * misleads anyone.
 */
export const TTL_BASE_MIN = { station: 40, train: 25 };

/** Each net confirmation buys the signal more life, up to a hard ceiling. */
export const TTL_PER_CONFIRM_MIN = 8;
export const TTL_MAX_BONUS_MIN = 40;

/** Past this fraction of its life a signal renders as visibly decaying. */
export const DECAY_AT = 0.6;

/** Anti-flood: a user may hold this many UNCONFIRMED signals at once. */
export const MAX_UNCONFIRMED_PER_USER = 2;

/** Anti-flood: minimum seconds between two reports from the same user. */
export const REPORT_COOLDOWN_SEC = 90;

/**
 * A vote from someone far from the reported location is worth less. This is
 * what stops a coordinated group in another city from promoting anything they
 * like. Distance is measured in station indices along the line.
 */
export const PLAUSIBLE_RADIUS_STOPS = 3;
export const IMPLAUSIBLE_WEIGHT = 0.25;

/** Reputation bonus by rank. Caps at +1.0 so no single user can force a state. */
export const RANK_VOTE_BONUS = {
  ROOKIE: 0,
  SPOTTER: 0.1,
  SCOUT: 0.2,
  TRACKER: 0.3,
  INSIDER: 0.5,
  VETERAN: 0.7,
  LEGEND: 1.0,
};

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Weight of one vote.
 *
 * @param {string} rank            Voter's rank name.
 * @param {boolean} plausible      Is the voter near the reported location?
 * @returns {number}
 */
export function voteWeight(rank, plausible) {
  const base = 1 + (RANK_VOTE_BONUS[rank] ?? 0);
  return plausible ? base : base * IMPLAUSIBLE_WEIGHT;
}

/**
 * Is a voter close enough for their vote to carry full weight?
 * Either they are physically within PLAUSIBLE_RADIUS_STOPS of the report, or
 * they have a saved journey that covers the reported station.
 *
 * @param {number|null} voterStationIdx  Voter's nearest station index, or null.
 * @param {number} reportStationIdx
 * @param {Array<{fromIdx:number,toIdx:number}>} [journeys]
 */
export function isPlausibleVoter(voterStationIdx, reportStationIdx, journeys = []) {
  if (
    typeof voterStationIdx === 'number' &&
    Math.abs(voterStationIdx - reportStationIdx) <= PLAUSIBLE_RADIUS_STOPS
  ) {
    return true;
  }
  return journeys.some((j) => {
    const lo = Math.min(j.fromIdx, j.toIdx);
    const hi = Math.max(j.fromIdx, j.toIdx);
    return reportStationIdx >= lo && reportStationIdx <= hi;
  });
}

/**
 * Net weighted score for a report.
 *
 * @param {Array<{vote:number, weight:number}>} votes  vote is +1 or -1.
 * @returns {number}
 */
export function score(votes) {
  return votes.reduce((sum, v) => sum + v.vote * v.weight, 0);
}

/** Net confirmations, used for TTL extension. Never negative. */
export function netConfirmations(votes) {
  const net = votes.reduce((n, v) => n + (v.vote > 0 ? 1 : -1), 0);
  return Math.max(0, net);
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * Expiry timestamp for a report, given how much corroboration it has.
 *
 * @param {number} createdAtMs
 * @param {string} context      CONTEXT.STATION | CONTEXT.TRAIN
 * @param {number} confirms     Net confirmations.
 * @returns {number} epoch ms
 */
export function expiresAt(createdAtMs, context, confirms = 0) {
  const base = TTL_BASE_MIN[context] ?? TTL_BASE_MIN.station;
  const bonus = Math.min(confirms * TTL_PER_CONFIRM_MIN, TTL_MAX_BONUS_MIN);
  return createdAtMs + (base + bonus) * 60_000;
}

/**
 * Resolve a report's current state.
 *
 * Expiry and dismissal are terminal and are checked first: a signal that has
 * run out of time is EXPIRED even if it was once HIGH_CONFIDENCE, because the
 * question the user is asking is "is this true *now*".
 *
 * @param {{createdAtMs:number, context:string, votes:Array}} report
 * @param {number} nowMs
 * @returns {string} STATE
 */
export function resolveState(report, nowMs = Date.now()) {
  const s = score(report.votes ?? []);
  if (s <= THRESHOLD.DISMISSED) return STATE.DISMISSED;

  const end = expiresAt(
    report.createdAtMs,
    report.context,
    netConfirmations(report.votes ?? []),
  );
  if (nowMs >= end) return STATE.EXPIRED;

  if (s >= THRESHOLD.HIGH_CONFIDENCE) return STATE.HIGH_CONFIDENCE;
  if (s >= THRESHOLD.CONFIRMED) return STATE.CONFIRMED;
  return STATE.UNCONFIRMED;
}

/** A signal is worth drawing on the map only while it is live. */
export function isActive(state) {
  return (
    state === STATE.UNCONFIRMED ||
    state === STATE.CONFIRMED ||
    state === STATE.HIGH_CONFIDENCE
  );
}

/**
 * Fraction of life elapsed, 0..1. Drives the visual decay of a marker so age
 * is readable without parsing text.
 */
export function decayFraction(report, nowMs = Date.now()) {
  const end = expiresAt(
    report.createdAtMs,
    report.context,
    netConfirmations(report.votes ?? []),
  );
  const span = end - report.createdAtMs;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (nowMs - report.createdAtMs) / span));
}

export function isDecaying(report, nowMs = Date.now()) {
  return decayFraction(report, nowMs) >= DECAY_AT;
}

// ---------------------------------------------------------------------------
// Reporting slots
// ---------------------------------------------------------------------------

/**
 * How many of a user's report slots are in use.
 *
 * Only UNCONFIRMED reports consume a slot. The moment a report is corroborated
 * by the community — or dies, either by expiring or being rejected — the slot
 * comes back. This is what stops one person flooding the map without punishing
 * someone whose reports keep turning out to be right.
 *
 * @param {Array} reports  The user's own reports.
 * @param {number} nowMs
 */
export function slotsUsed(reports, nowMs = Date.now()) {
  return reports.filter((r) => resolveState(r, nowMs) === STATE.UNCONFIRMED).length;
}

export function slotsFree(reports, nowMs = Date.now()) {
  return Math.max(0, MAX_UNCONFIRMED_PER_USER - slotsUsed(reports, nowMs));
}

/**
 * May this user file a new report right now?
 * Returns a reason string when they may not, so the UI can say why rather than
 * just disabling a button.
 *
 * @returns {{allowed:boolean, reason?:string}}
 */
export function canReport(reports, lastReportAtMs, nowMs = Date.now()) {
  if (slotsFree(reports, nowMs) <= 0) {
    return {
      allowed: false,
      reason: `BOTH SIGNAL SLOTS IN USE — WAIT FOR CONFIRMATION OR EXPIRY`,
    };
  }
  if (lastReportAtMs != null) {
    const waited = (nowMs - lastReportAtMs) / 1000;
    if (waited < REPORT_COOLDOWN_SEC) {
      const left = Math.ceil(REPORT_COOLDOWN_SEC - waited);
      return { allowed: false, reason: `COOLDOWN — ${left}S` };
    }
  }
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

/**
 * Confidence as a 0..1 bar value, for the meter in the signal panel.
 * Deliberately saturates at HIGH_CONFIDENCE — we never render "100% certain",
 * because crowdsourced information never is.
 */
export function confidenceFraction(report) {
  const s = score(report.votes ?? []);
  if (s <= 0) return 0.15; // an unconfirmed report is still a signal, not nothing
  return Math.min(1, s / THRESHOLD.HIGH_CONFIDENCE);
}

/** Count of positive votes, for "CONFIRMED BY 4". */
export function confirmCount(report) {
  return (report.votes ?? []).filter((v) => v.vote > 0).length;
}

export function rejectCount(report) {
  return (report.votes ?? []).filter((v) => v.vote < 0).length;
}
