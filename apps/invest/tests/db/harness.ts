import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const MIGRATIONS_DIR = new URL('../../supabase/migrations', import.meta.url).pathname

/**
 * Supabase provides `auth.users` and `auth.uid()`; pglite does not. This shim
 * reproduces just enough of that surface for the migrations to apply and for
 * RLS policies to be exercised.
 *
 * `auth.uid()` reads the same `request.jwt.claims` GUC that Supabase's real
 * implementation does, so `set_config('request.jwt.claims', ...)` in a test
 * behaves the way `withUser()` behaves in production.
 */
const AUTH_SHIM = `
  create schema if not exists auth;

  create table if not exists auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    created_at timestamptz not null default now()
  );

  create or replace function auth.uid() returns uuid
    language sql stable as $$
      select nullif(
        coalesce(
          current_setting('request.jwt.claim.sub', true),
          (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
        ),
        ''
      )::uuid
    $$;

  -- Supabase ships these roles; pglite does not.
  do $do$
  begin
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
      create role authenticated;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then
      create role service_role bypassrls;
    end if;
  end
  $do$;

  grant usage on schema public, auth to authenticated, service_role;
  alter default privileges in schema public
    grant select, insert, update, delete on tables to authenticated;
`

export type TestDb = {
  readonly db: PGlite
  /** Run as a signed-in user, with RLS enforced exactly as in production. */
  asUser<T>(userId: string, fn: (db: PGlite) => Promise<T>): Promise<T>
  /** Run with RLS bypassed, as the EOD cron does. */
  asService<T>(fn: (db: PGlite) => Promise<T>): Promise<T>
  close(): Promise<void>
}

export async function createTestDb(): Promise<TestDb> {
  const db = new PGlite()
  await db.exec(AUTH_SHIM)

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()
  for (const file of files) {
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8')
    try {
      await db.exec(sql)
    } catch (cause) {
      throw new Error(`Migration ${file} failed: ${(cause as Error).message}`, { cause })
    }
  }

  // Grants have to follow table creation.
  await db.exec(`
    grant select, insert, update, delete on all tables in schema public to authenticated;
    grant usage, select on all sequences in schema public to authenticated;
  `)

  return {
    db,
    async asUser(userId, fn) {
      await db.exec('begin')
      try {
        await db.query('select set_config($1, $2, true)', [
          'request.jwt.claims',
          JSON.stringify({ sub: userId, role: 'authenticated' }),
        ])
        await db.exec('set local role authenticated')
        const result = await fn(db)
        await db.exec('commit')
        return result
      } catch (error) {
        await db.exec('rollback')
        throw error
      }
    },
    async asService(fn) {
      return fn(db)
    },
    async close() {
      await db.close()
    },
  }
}

export async function seedUser(db: PGlite, email: string): Promise<string> {
  const result = await db.query<{ id: string }>(
    'insert into auth.users (email) values ($1) returning id',
    [email],
  )
  const row = result.rows[0]
  if (!row) throw new Error('failed to seed user')
  return row.id
}

export const MIGRATION_FILES = async (): Promise<string[]> =>
  (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()

export const migrationsDir = MIGRATIONS_DIR
