import 'server-only'
import postgres from 'postgres'
import { serverEnv } from '@/lib/env'

/**
 * Database access.
 *
 * Two clients, and the distinction between them IS the security model:
 *
 *   withUser(jwt)  -- sets request.jwt.claims and `role authenticated`, so
 *                     every RLS policy applies. All user traffic goes here.
 *   adminDb()      -- service_role, RLS bypassed. Only the EOD cron, only for
 *                     prices/quotes/fx_rates. Lint-banned elsewhere.
 *
 * Why postgres.js rather than supabase-js for reads: PostgREST serialises
 * `numeric` as a JSON number, which is a float64, which silently destroys the
 * precision of an 18-decimal crypto quantity. postgres.js returns `numeric` as
 * a string, which is exactly what Decimal wants. supabase-js is still used for
 * auth, sessions and Storage -- just never for money.
 */

let pool: postgres.Sql | null = null

function connection(): postgres.Sql {
  if (pool) return pool

  const url = serverEnv().DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not configured. The app cannot read or write data until ' +
        'a Supabase project is connected -- see SETUP.md.',
    )
  }

  pool = postgres(url, {
    // Serverless: many short-lived invocations, so keep the per-instance pool small.
    max: 4,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // required when going through a transaction pooler
    types: {
      // Never let a numeric become a JS float on its way out of Postgres.
      numeric: {
        to: 1700,
        from: [1700],
        serialize: (x: string | number) => String(x),
        parse: (x: string) => x,
      },
    },
    transform: { undefined: null },
  })

  return pool
}

export type UserContext = {
  readonly userId: string
  /** The raw access token from the Supabase session. */
  readonly accessToken: string
}

/**
 * Runs `fn` inside a transaction that carries the user's JWT claims, so RLS
 * sees exactly the identity Supabase authenticated.
 *
 * The claims are set with `set_config(..., true)` -- local to the transaction --
 * so a pooled connection cannot leak one user's identity into the next request.
 */
export async function withUser<T>(
  ctx: UserContext,
  fn: (sql: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  const sql = connection()
  return sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({
      sub: ctx.userId,
      role: 'authenticated',
    })}, true)`
    await tx`set local role authenticated`
    return fn(tx)
  }) as Promise<T>
}

/**
 * RLS-bypassing client.
 *
 * Only for the EOD cron writing shared market data. Importing this anywhere
 * outside `src/app/api/cron/` is a lint error, because a mistake here is the
 * difference between "private by default" and "not private at all".
 */
export function adminDb(): postgres.Sql {
  return connection()
}

/** Closes the pool. Tests and scripts only; serverless handles its own teardown. */
export async function closeDb(): Promise<void> {
  if (!pool) return
  await pool.end({ timeout: 5 })
  pool = null
}
