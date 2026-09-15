import { z } from 'zod'

/**
 * Environment validation.
 *
 * Config problems surface at module load, not as a 500 at 23:15 on a Tuesday
 * when the EOD cron fires. Anything absent is absent loudly.
 *
 * Provider and AI keys are all optional: the app is designed to run correctly
 * with none of them configured, showing "no data" rather than invented numbers.
 * `hasProvider()` is how feature code asks whether a source is available.
 */

const serverSchema = z.object({
  // --- required for anything to work -------------------------------------
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // --- required on the server only ---------------------------------------
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(16).optional(),

  // --- optional providers; absent means "this source is unavailable" -----
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  COINGECKO_DEMO_KEY: z.string().min(1).optional(),
  EODHD_API_KEY: z.string().min(1).optional(),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

export type ServerEnv = z.infer<typeof serverSchema>

/**
 * During `next build` there is no real environment, and the build must not
 * require production secrets to produce a bundle. Placeholders keep the build
 * honest without weakening runtime validation.
 */
const BUILD_PLACEHOLDERS = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-anon-key',
} as const

let cached: ServerEnv | null = null

export function serverEnv(): ServerEnv {
  if (cached) return cached

  const source = {
    ...BUILD_PLACEHOLDERS,
    ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined)),
  }

  const parsed = serverSchema.safeParse(source)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid environment configuration:\n${issues}\n\nSee SETUP.md.`)
  }

  cached = parsed.data
  return cached
}

export type ProviderKey = 'anthropic' | 'coingecko' | 'eodhd'

/**
 * Whether a given external source is configured.
 *
 * Feature code branches on this rather than reading keys directly, so an
 * unconfigured provider degrades to an explicit "no data" state instead of
 * throwing halfway through rendering a portfolio.
 */
export function hasProvider(key: ProviderKey): boolean {
  const env = serverEnv()
  switch (key) {
    case 'anthropic':
      return Boolean(env.ANTHROPIC_API_KEY)
    case 'coingecko':
      return Boolean(env.COINGECKO_DEMO_KEY)
    case 'eodhd':
      return Boolean(env.EODHD_API_KEY)
  }
}

/** True once the app has a database to talk to. */
export function isDatabaseConfigured(): boolean {
  const env = serverEnv()
  return (
    Boolean(env.DATABASE_URL) &&
    env.NEXT_PUBLIC_SUPABASE_URL !== BUILD_PLACEHOLDERS.NEXT_PUBLIC_SUPABASE_URL
  )
}
