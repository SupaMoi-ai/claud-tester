/**
 * Backend configuration.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PASTE YOUR SUPABASE PROJECT DETAILS HERE.
 *
 *   1. Create a project at https://supabase.com
 *   2. Run supabase/schema.sql in the project's SQL editor
 *   3. Enable anonymous sign-ins:
 *        Authentication -> Providers -> Anonymous sign-ins -> enable
 *   4. Copy Project URL and the anon/public key from Settings -> API into the
 *      two constants below
 *
 * The anon key is designed to be public and is safe in a static site — but ONLY
 * because every meaningful write goes through a SECURITY DEFINER function and
 * row-level security denies direct table writes. Do not paste the service_role
 * key here. It would let anyone reading this file rewrite the whole database.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Until these are filled in, Track 5 runs in LOCAL MODE: everything works, but
 * the community lives in this browser only and the interface says so.
 */

export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

/** Identifies this app to Entur. Their API is free but asks consumers to say who they are. */
export const ENTUR_CLIENT_NAME = 'supamoi-track5';

export function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Local mode is a development and first-run convenience, never a pretence.
 * When it is active the top bar reads LOCAL and the profile screen explains
 * that nothing is shared with anyone.
 */
export function backendMode() {
  return isConfigured() ? 'supabase' : 'local';
}
