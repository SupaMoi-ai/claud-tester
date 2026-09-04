/**
 * Backend selector.
 *
 * Every screen talks to this module and never to a specific backend. Today it
 * resolves to either the Supabase client or the LOCAL MODE store depending on
 * whether config.js has been filled in; both expose the same operations with
 * the same shapes, so switching is a configuration change rather than a
 * rewrite.
 *
 * The operation surface is deliberately small and verb-shaped — createReport,
 * voteReport, listSignals — rather than table-shaped. That is what lets the
 * Supabase implementation route writes through SECURITY DEFINER functions
 * instead of exposing tables to the client.
 */

import { backendMode } from './config.js';
import * as local from './local.js';
import * as remote from './supabase.js';

const impl = backendMode() === 'supabase' ? remote : local;

export const MODE = impl.MODE;

/* Session */
export const signIn = (...a) => impl.signIn(...a);
export const setHandle = (...a) => impl.setHandle(...a);
export const getProfile = (...a) => impl.getProfile(...a);

/* Community signals */
export const listSignals = (...a) => impl.listSignals(...a);
export const myReports = (...a) => impl.myReports(...a);
export const createReport = (...a) => impl.createReport(...a);
export const voteReport = (...a) => impl.voteReport(...a);
export const hasVoted = (...a) => impl.hasVoted(...a);
export const lastReportAt = (...a) => impl.lastReportAt(...a);

/* Progression */
export const xpHistory = (...a) => impl.xpHistory(...a);

/* Personal */
export const listJourneys = (...a) => impl.listJourneys(...a);
export const saveJourney = (...a) => impl.saveJourney(...a);
export const deleteJourney = (...a) => impl.deleteJourney(...a);

/* Social */
export const listChat = (...a) => impl.listChat(...a);
export const sendChat = (...a) => impl.sendChat(...a);

/* Development */
export const reset = (...a) => (impl.reset ? impl.reset(...a) : Promise.resolve());

/**
 * Subscribe to live changes. The Supabase implementation wires this to
 * realtime; LOCAL MODE has no other participants, so it is a no-op that
 * returns an unsubscribe function for call-site symmetry.
 */
export const subscribeSignals = (fn) =>
  impl.subscribeSignals ? impl.subscribeSignals(fn) : () => {};
