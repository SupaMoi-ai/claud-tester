/**
 * Supabase implementation.
 *
 * Mirrors the operation surface in local.js exactly, so backend.js can swap
 * between them without any screen noticing.
 *
 * SECURITY MODEL
 * The anon key ships in a public static file, so row-level security is the only
 * boundary that exists. Every operation that grants XP, enforces the two-report
 * flood limit, or decides a signal's confidence goes through a SECURITY DEFINER
 * function in the database. This module therefore calls RPCs, not tables, for
 * all writes — direct inserts are denied by policy and will fail if attempted.
 *
 * Reads of public data (active signals, chat, profiles) go through normal
 * selects, which RLS permits.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { rankFor } from '../domain/xp.js';

let client = null;
let currentUser = null;

/**
 * Load supabase-js from CDN on first use.
 *
 * Loaded lazily and by URL rather than bundled, matching how the rest of this
 * repository ships browser code — there is no build step here.
 */
async function getClient() {
  if (client) return client;
  const { createClient } = await import(
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
  );
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

/* --- Session --------------------------------------------------------------
   Anonymous by design: the brief requires no real identity, and an email wall
   on first open would break the rule that the app reaches LIVE immediately. */

export async function signIn() {
  const sb = await getClient();

  const { data: existing } = await sb.auth.getSession();
  if (!existing?.session) {
    const { error } = await sb.auth.signInAnonymously();
    if (error) throw new Error(`sign-in failed: ${error.message}`);
  }

  const { data: userData } = await sb.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) throw new Error('no session after sign-in');

  return getProfile(uid);
}

export async function getProfile(userId = null) {
  const sb = await getClient();
  const uid = userId ?? (await sb.auth.getUser()).data?.user?.id;
  if (!uid) throw new Error('not signed in');

  const { data, error } = await sb
    .from('profiles')
    .select('id, handle, xp, avatar, created_at')
    .eq('id', uid)
    .maybeSingle();
  if (error) throw new Error(error.message);

  currentUser = {
    id: uid,
    handle: data?.handle ?? null,
    xp: data?.xp ?? 0,
    avatar: data?.avatar ?? {},
    rank: rankFor(data?.xp ?? 0),
  };
  return currentUser;
}

/** Handle is the only profile field a client may write. XP is server-owned. */
export async function setHandle(handle) {
  const sb = await getClient();
  const uid = (await sb.auth.getUser()).data?.user?.id;
  const { error } = await sb.from('profiles').update({ handle }).eq('id', uid);
  if (error) throw new Error(error.message);
  return getProfile(uid);
}

/* --- Signals -------------------------------------------------------------- */

/** Active signals. Expiry is computed by the database view, not the client. */
export async function listSignals() {
  const sb = await getClient();
  const { data, error } = await sb
    .from('active_signals')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

export async function myReports() {
  const sb = await getClient();
  const uid = (await sb.auth.getUser()).data?.user?.id;
  const { data, error } = await sb
    .from('active_signals')
    .select('*')
    .eq('reporter', uid);
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

/**
 * File a report.
 *
 * The two-slot limit and the cooldown are enforced inside rpc_create_report,
 * so a client that skips the local check still cannot flood the map.
 */
export async function createReport({ stationIdx, direction, context = 'station' }) {
  const sb = await getClient();
  const { data, error } = await sb.rpc('rpc_create_report', {
    p_station_idx: stationIdx,
    p_direction: direction,
    p_context: context,
  });
  if (error) return { ok: false, reason: humanise(error.message) };
  return { ok: true, report: data ? fromRow(data) : null };
}

/**
 * Confirm or reject. Self-votes and duplicate votes are refused by the
 * database, not merely hidden by the interface.
 */
export async function voteReport(reportId, vote) {
  const sb = await getClient();
  const { data, error } = await sb.rpc('rpc_vote_report', {
    p_report: reportId,
    p_vote: vote,
  });
  if (error) return { ok: false, reason: humanise(error.message) };
  return { ok: true, state: data?.status ?? null };
}

export async function hasVoted(reportId) {
  const sb = await getClient();
  const uid = (await sb.auth.getUser()).data?.user?.id;
  const { count } = await sb
    .from('confirmations')
    .select('id', { count: 'exact', head: true })
    .eq('report_id', reportId)
    .eq('user_id', uid);
  return (count ?? 0) > 0;
}

export function lastReportAt() {
  // The server owns the cooldown; the client does not need to track it.
  return null;
}

/** Realtime: repaint the map when anyone anywhere changes a signal. */
export function subscribeSignals(fn) {
  let channel = null;
  getClient().then((sb) => {
    channel = sb
      .channel('signals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, fn)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'confirmations' }, fn)
      .subscribe();
  });
  return () => {
    if (channel && client) client.removeChannel(channel);
  };
}

/* --- Progression ---------------------------------------------------------- */

export async function xpHistory() {
  const sb = await getClient();
  const uid = (await sb.auth.getUser()).data?.user?.id;
  const { data, error } = await sb
    .from('xp_events')
    .select('kind, amount, ref_id, created_at')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => ({
    kind: e.kind,
    amount: e.amount,
    refId: e.ref_id,
    at: Date.parse(e.created_at),
  }));
}

/* --- Journeys ------------------------------------------------------------- */

export async function listJourneys() {
  const sb = await getClient();
  const { data, error } = await sb.from('journeys').select('*').order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []).map((j) => ({
    id: j.id,
    label: j.label,
    fromIdx: j.from_idx,
    toIdx: j.to_idx,
    days: j.days ?? [],
    windowStart: j.window_start,
    windowEnd: j.window_end,
  }));
}

export async function saveJourney(journey) {
  const sb = await getClient();
  const uid = (await sb.auth.getUser()).data?.user?.id;
  const row = {
    id: journey.id,
    user_id: uid,
    label: journey.label,
    from_idx: journey.fromIdx,
    to_idx: journey.toIdx,
    days: journey.days,
    window_start: journey.windowStart,
    window_end: journey.windowEnd,
  };
  const { data, error } = await sb.from('journeys').upsert(row).select().single();
  if (error) throw new Error(error.message);
  return { ...journey, id: data.id };
}

export async function deleteJourney(id) {
  const sb = await getClient();
  const { error } = await sb.from('journeys').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* --- Chat ----------------------------------------------------------------- */

export async function listChat() {
  const sb = await getClient();
  const { data, error } = await sb
    .from('chat_messages')
    .select('id, user_id, handle_snapshot, body, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((m) => ({
      id: m.id,
      userId: m.user_id,
      handle: m.handle_snapshot ?? 'ANON',
      body: m.body,
      at: Date.parse(m.created_at),
    }))
    .reverse();
}

export async function sendChat(body) {
  const sb = await getClient();
  const { data, error } = await sb.rpc('rpc_send_chat', { p_body: body });
  if (error) throw new Error(humanise(error.message));
  return data;
}

/* --- Helpers -------------------------------------------------------------- */

/** Translate a database row into the shape domain/signals.js expects. */
function fromRow(row) {
  return {
    id: row.id,
    userId: row.reporter,
    stationIdx: row.station_idx,
    direction: row.direction,
    context: row.context,
    createdAtMs: Date.parse(row.created_at),
    // The database keeps the authoritative weighted score; votes are
    // reconstructed as a single synthetic entry so the pure domain functions
    // can score it identically without fetching every individual vote.
    votes: [{ vote: 1, weight: Number(row.weighted_score ?? 0) }],
    confirmCount: row.confirm_count ?? 0,
    rejectCount: row.reject_count ?? 0,
  };
}

/**
 * Database errors are raised with terminal-style messages by the RPCs
 * (see schema.sql), so most already read correctly. This strips Postgres'
 * prefix for the rest.
 */
function humanise(message = '') {
  return String(message).replace(/^.*?:\s*/, '').toUpperCase().slice(0, 120);
}

export const MODE = 'supabase';
