import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { serverEnv } from '@/lib/env'

/**
 * Supabase client for server components, server actions and route handlers.
 *
 * Used for authentication, sessions and Storage only -- never for reading
 * money. Financial reads go through postgres.js (see src/data/db.ts), because
 * PostgREST serialises `numeric` as a float and loses precision.
 */
export async function createClient() {
  const cookieStore = await cookies()
  const env = serverEnv()

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  })
}

export type SessionUser = {
  readonly id: string
  readonly email: string
  readonly accessToken: string
}

/**
 * The signed-in user, or null.
 *
 * Uses `getUser()` rather than `getSession()`: the former revalidates the token
 * with Supabase, while the latter trusts a cookie that a client could have
 * tampered with.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const supabase = await createClient()
  const [{ data: userData }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ])

  const user = userData.user
  const accessToken = sessionData.session?.access_token
  if (!user?.email || !accessToken) return null

  return { id: user.id, email: user.email, accessToken }
}

/** The signed-in user, or a thrown error. For routes already behind middleware. */
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser()
  if (!user) throw new Error('Not authenticated')
  return user
}
