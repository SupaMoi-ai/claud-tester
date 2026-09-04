/**
 * LOCAL MODE store.
 *
 * A localStorage implementation of exactly the operations the Supabase RPCs
 * expose, so the whole loop — report, confirm, promote, expire, earn XP — runs
 * before any backend exists, and so swapping backends changes one import
 * rather than every screen.
 *
 * This is a development and first-run mode, never a disguise. Nothing here is
 * shared with anyone: the community is this browser. The interface says LOCAL
 * in the top bar whenever this store is serving, and the seeded signals below
 * exist so the map has something to demonstrate on first open.
 *
 * The rules enforced here are the same ones domain/signals.js defines and the
 * database will enforce for real. Client-side enforcement is a convenience for
 * responsiveness; it is not security, and in Supabase mode the server is what
 * actually decides.
 */

import {
  STATE, CONTEXT,
  resolveState, canReport, isActive, voteWeight, isOnVoterRoute,
} from '../domain/signals.js';
import { XP, rankFor, xpForStateChange } from '../domain/xp.js';
import { STATIONS } from '../transport/stations.js';
import { generateHandle, normaliseHandle } from '../domain/handles.js';

const KEY = 'track5.local.v1';

let db = null;

function blank() {
  return {
    user: {
      id: `local-${Math.random().toString(36).slice(2, 10)}`,
      handle: null,
      xp: 0,
      avatar: {},
      cosmetics: [],
      createdAt: Date.now(),
    },
    reports: [],
    votes: [],        // { reportId, userId, vote, weight, at }
    xpEvents: [],
    chat: [],
    crews: [],
    journeys: [],
    lastReportAtMs: null,
    seeded: false,
  };
}

function load() {
  if (db) return db;
  try {
    const raw = localStorage.getItem(KEY);
    db = raw ? { ...blank(), ...JSON.parse(raw) } : blank();
  } catch {
    db = blank();
  }
  if (!db.seeded) {
    seed();
    db.seeded = true;
    save();
  }
  return db;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* Private mode or quota. The session still works, it just will not persist. */
  }
}

/**
 * Seed a small amount of plausible community activity.
 *
 * Without this the first run shows an empty line, which demonstrates nothing.
 * Deliberately modest: two signals at different confidence levels, so the
 * state machine is visible immediately, and neither is at the user's own
 * station so the first thing they see is someone else's intel.
 */
function seed() {
  const now = Date.now();
  const pick = (idx) => STATIONS.find((s) => s.idx === idx);

  db.reports.push({
    id: 'seed-1',
    userId: 'someone-else',
    stationIdx: pick(11).idx,           // Bryne
    direction: 'south',
    context: CONTEXT.STATION,
    createdAtMs: now - 6 * 60_000,
    votes: [
      { vote: 1, weight: 1 },
      { vote: 1, weight: 1.2 },
    ],
  });

  db.reports.push({
    id: 'seed-2',
    userId: 'someone-else-2',
    stationIdx: pick(4).idx,            // Jåttåvågen
    direction: 'north',
    context: CONTEXT.STATION,
    createdAtMs: now - 3 * 60_000,
    votes: [],
  });
}

/* --- Session -------------------------------------------------------------- */

export async function signIn() {
  const d = load();
  // Nobody is ever shown as ANON: a usable pseudonym is issued immediately and
  // can be changed on PROFILE. That is what "no real identity required" should
  // feel like — not an empty name.
  if (!d.user.handle) {
    d.user.handle = generateHandle();
    save();
  }
  return { ...d.user, rank: rankFor(d.user.xp) };
}

export async function setHandle(handle) {
  const d = load();
  const clean = normaliseHandle(handle);
  if (!clean) throw new Error('HANDLE MUST BE 2-20 LETTERS, DIGITS, _ OR -');
  d.user.handle = clean;
  save();
  return { ...d.user, rank: rankFor(d.user.xp) };
}

export async function getProfile() {
  const d = load();
  return { ...d.user, rank: rankFor(d.user.xp) };
}

/* --- XP ------------------------------------------------------------------- */

function award(kind, amount, refId = null) {
  const d = load();
  d.user.xp = Math.max(0, d.user.xp + amount);
  d.xpEvents.unshift({ kind, amount, refId, at: Date.now() });
  d.xpEvents = d.xpEvents.slice(0, 100);
}

export async function xpHistory() {
  return load().xpEvents.slice(0, 40);
}

/* --- Reports -------------------------------------------------------------- */

export async function listSignals() {
  const d = load();
  const now = Date.now();
  return d.reports.filter((r) => isActive(resolveState(r, now)));
}

export async function myReports() {
  const d = load();
  return d.reports.filter((r) => r.userId === d.user.id);
}

/**
 * File a report.
 *
 * Enforces the two-slot flood limit and the cooldown before writing, and
 * returns a reason on refusal so the interface can explain rather than just
 * disable a button.
 */
export async function createReport({ stationIdx, direction, context = CONTEXT.STATION }) {
  const d = load();
  const now = Date.now();
  const mine = d.reports.filter((r) => r.userId === d.user.id);

  const gate = canReport(mine, d.lastReportAtMs, now);
  if (!gate.allowed) return { ok: false, reason: gate.reason };

  const report = {
    id: `r-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: d.user.id,
    stationIdx,
    direction,
    context,
    createdAtMs: now,
    votes: [],
  };
  d.reports.unshift(report);
  d.lastReportAtMs = now;
  award('REPORT_SUBMITTED', XP.REPORT_SUBMITTED, report.id);
  save();
  return { ok: true, report };
}

/**
 * Confirm or reject someone else's report.
 *
 * Refuses self-votes and double-votes — the two ways a confidence score stops
 * meaning anything.
 */
export async function voteReport(reportId, vote, { weight = null } = {}) {
  const d = load();
  const report = d.reports.find((r) => r.id === reportId);
  if (!report) return { ok: false, reason: 'SIGNAL NOT FOUND' };
  if (report.userId === d.user.id) return { ok: false, reason: 'CANNOT CONFIRM YOUR OWN SIGNAL' };
  if (d.votes.some((v) => v.reportId === reportId && v.userId === d.user.id)) {
    return { ok: false, reason: 'ALREADY ANSWERED' };
  }

  // Weighted the same way public.vote_weight_for() does it, so local mode and
  // the real backend agree about what a vote is worth.
  if (weight == null) {
    const onRoute = isOnVoterRoute(null, report.stationIdx, d.journeys ?? []);
    weight = voteWeight(rankFor(d.user.xp), onRoute);
  }

  const before = resolveState(report, Date.now());
  report.votes.push({ vote, weight });
  d.votes.push({ reportId, userId: d.user.id, vote, weight, at: Date.now() });
  const after = resolveState(report, Date.now());

  award('VOTE_CAST', XP.VOTE_CAST, reportId);

  // In Supabase mode the reporter's promotion XP is credited to them by the
  // server. Locally there is only one user, so it is credited only when the
  // report is actually theirs.
  if (report.userId === d.user.id) {
    const gained = xpForStateChange(before, after);
    if (gained) award(after === STATE.DISMISSED ? 'REPORT_DISMISSED' : 'REPORT_CONFIRMED', gained, reportId);
  }

  save();
  return { ok: true, state: after };
}

export async function hasVoted(reportId) {
  const d = load();
  return d.votes.some((v) => v.reportId === reportId && v.userId === d.user.id);
}

export function lastReportAt() {
  return load().lastReportAtMs;
}

/* --- Journeys ------------------------------------------------------------- */

/**
 * Journeys.
 *
 * Returns a copy, not the internal array.
 *
 * state.js detects change by reference, so handing out the live array meant
 * saveJourney() mutated it in place, listJourneys() returned the very same
 * reference, and store.set() concluded nothing had changed — a saved journey
 * appeared on PROFILE but LIVE went on ignoring it until some unrelated update
 * happened to force a render. Every accessor here returns fresh objects for
 * that reason.
 */
export async function listJourneys() {
  return load().journeys.map((j) => ({ ...j }));
}

export async function saveJourney(journey) {
  const d = load();
  const id = journey.id ?? `j-${Date.now().toString(36)}`;
  const idx = d.journeys.findIndex((j) => j.id === id);
  const record = { ...journey, id };
  if (idx >= 0) d.journeys[idx] = record;
  else d.journeys.push(record);
  save();
  return record;
}

export async function deleteJourney(id) {
  const d = load();
  d.journeys = d.journeys.filter((j) => j.id !== id);
  save();
}

/* --- Chat ----------------------------------------------------------------- */

export async function listChat() {
  return load().chat.slice(-100);
}

export async function sendChat(body) {
  const d = load();
  const msg = {
    id: `m-${Date.now().toString(36)}`,
    userId: d.user.id,
    handle: d.user.handle ?? 'ANON',
    body: String(body).slice(0, 300),
    at: Date.now(),
  };
  d.chat.push(msg);
  d.chat = d.chat.slice(-200);
  save();
  return msg;
}

/* --- Crews ----------------------------------------------------------------
   Real data, but only ever yours: an invite code cannot reach another device
   from here. The crew screen says so rather than implying otherwise. */

export async function listCrews() {
  const d = load();
  return d.crews.map((c) => ({ ...c, members: [...c.members] }));
}

export async function createCrew(name) {
  const d = load();
  const crew = {
    id: `c-${Date.now().toString(36)}`,
    name: String(name).slice(0, 24),
    // Ambiguous characters left out so a code can be read aloud on a platform.
    code: Array.from({ length: 6 }, () =>
      'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join(''),
    owner: d.user.id,
    members: [{ userId: d.user.id, handle: d.user.handle ?? 'ANON', xp: d.user.xp }],
    messages: [],
    createdAt: Date.now(),
  };
  d.crews.push(crew);
  save();
  return crew;
}

export async function joinCrew() {
  return { ok: false, reason: 'INVITE CODES NEED A SHARED BACKEND — SEE PROFILE' };
}

export async function leaveCrew(crewId) {
  const d = load();
  d.crews = d.crews.filter((c) => c.id !== crewId);
  save();
}

export async function listCrewMessages(crewId) {
  const crew = load().crews.find((c) => c.id === crewId);
  return crew ? crew.messages.map((m) => ({ ...m })) : [];
}

export async function sendCrewMessage(crewId, body) {
  const d = load();
  const crew = d.crews.find((c) => c.id === crewId);
  if (!crew) return null;
  const msg = {
    id: `cm-${Date.now().toString(36)}`,
    userId: d.user.id,
    handle: d.user.handle ?? 'ANON',
    body: String(body).slice(0, 300),
    at: Date.now(),
  };
  crew.messages.push(msg);
  crew.messages = crew.messages.slice(-200);
  save();
  return msg;
}

/* --- Cosmetics ------------------------------------------------------------- */

export async function listCosmetics() {
  return COSMETICS.map((c) => ({ ...c }));
}

export async function ownedCosmetics() {
  return [...load().user.cosmetics];
}

/**
 * Cosmetics are unlocks, not purchases: XP is never deducted. Spending
 * reputation on a hat would demote a user for participating, and rank is meant
 * to represent standing rather than a wallet.
 */
export async function buyCosmetic(id) {
  const d = load();
  const item = COSMETICS.find((c) => c.id === id);
  if (!item) return { ok: false, reason: 'NO SUCH ITEM' };
  if (d.user.xp < item.costXp) return { ok: false, reason: 'NOT ENOUGH XP' };
  if (!d.user.cosmetics.includes(id)) d.user.cosmetics.push(id);
  save();
  return { ok: true };
}

export async function setAvatar(avatar) {
  const d = load();
  d.user.avatar = { ...avatar };
  save();
  return { ...d.user, rank: rankFor(d.user.xp) };
}

/** Mirrors the seed rows in supabase/schema.sql. */
export const COSMETICS = [
  { id: 'jacket-rail', name: 'Rail jacket', slot: 'jacket', costXp: 0, rarity: 'common' },
  { id: 'jacket-hivis', name: 'Hi-vis', slot: 'jacket', costXp: 100, rarity: 'common' },
  { id: 'jacket-leather', name: 'Leather', slot: 'jacket', costXp: 750, rarity: 'rare' },
  { id: 'hat-beanie', name: 'Beanie', slot: 'hat', costXp: 100, rarity: 'common' },
  { id: 'hat-cap', name: 'Conductor cap', slot: 'hat', costXp: 300, rarity: 'uncommon' },
  { id: 'hat-hood', name: 'Hood up', slot: 'hat', costXp: 0, rarity: 'common' },
  { id: 'glasses-dark', name: 'Dark glasses', slot: 'face', costXp: 300, rarity: 'uncommon' },
  { id: 'patch-jaeren', name: 'Jæren patch', slot: 'patch', costXp: 750, rarity: 'uncommon' },
  { id: 'patch-nightowl', name: 'Night owl', slot: 'patch', costXp: 1500, rarity: 'rare' },
  { id: 'patch-legend', name: 'End of the line', slot: 'patch', costXp: 6000, rarity: 'legendary' },
];

/** Wipe local state. Offered on PROFILE so a demo can be reset cleanly. */
export async function reset() {
  db = blank();
  seed();
  db.seeded = true;
  save();
  return db.user;
}

export const MODE = 'local';
