'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ActionState } from '@/app/(app)/beholdning/actions'
import { withUser } from '@/data/db'
import { parseNbNumber } from '@/lib/format-nb'
import { requireUser } from '@/lib/supabase/server'

export type { ActionState }

const journalSchema = z.object({
  kind: z.enum([
    'BOUGHT',
    'ADDED',
    'REDUCED',
    'SOLD',
    'DECIDED_NOT_TO_BUY',
    'THESIS_REVIEW',
    'NOTE',
  ]),
  title: z.string().max(200).optional(),
  body: z.string().min(1, 'Skriv hva du bestemte deg for.').max(10_000),
  whatIExpected: z.string().max(5000).optional(),
  instrumentId: z.string().uuid().optional().or(z.literal('')),
  conviction: z.coerce.number().int().min(1).max(5).optional(),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ugyldig dato.'),
})

/**
 * Records a decision.
 *
 * `DECIDED_NOT_TO_BUY` is a first-class kind, not an afterthought: the choices
 * you didn't make are the ones you misremember most confidently a year later,
 * and they carry as much information as the ones you did.
 */
export async function addJournalEntry(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser()

  const parsed = journalSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Ugyldige felter.' }
  }
  const input = parsed.data
  const instrumentId = input.instrumentId === '' ? null : (input.instrumentId ?? null)

  try {
    await withUser({ userId: user.id, accessToken: user.accessToken }, async (sql) => {
      await sql`
        insert into journal_entries
          (user_id, occurred_at, kind, title, body_md, what_i_expected, instrument_id, conviction)
        values
          (${user.id}, ${input.occurredAt}::timestamptz, ${input.kind},
           ${input.title ?? null}, ${input.body}, ${input.whatIExpected ?? null},
           ${instrumentId}, ${input.conviction ?? null})
      `
    })
  } catch (error) {
    return { status: 'error', message: describe(error) }
  }

  revalidatePath('/journal')
  return { status: 'saved', message: 'Beslutningen er notert.' }
}

const watchlistSchema = z.object({
  instrumentId: z.string().uuid('Velg en investering.'),
  targetBuyPrice: z.string().optional(),
  whatWouldMakeMeBuy: z.string().max(2000).optional(),
})

export async function addToWatchlist(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser()

  const parsed = watchlistSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Ugyldige felter.' }
  }
  const input = parsed.data

  let target: string | null = null
  if (input.targetBuyPrice && input.targetBuyPrice.trim() !== '') {
    const result = parseNbNumber(input.targetBuyPrice)
    if (!result.ok) return { status: 'error', message: 'Målkursen er ikke et gyldig tall.' }
    target = result.value.toString()
  }

  try {
    await withUser({ userId: user.id, accessToken: user.accessToken }, async (sql) => {
      await sql`
        insert into watchlist
          (user_id, instrument_id, target_buy_price, target_currency, what_would_make_me_buy)
        values
          (${user.id}, ${input.instrumentId}, ${target},
           (select currency from instruments where id = ${input.instrumentId}),
           ${input.whatWouldMakeMeBuy ?? null})
        on conflict (user_id, instrument_id) do update
          set target_buy_price = excluded.target_buy_price,
              what_would_make_me_buy = excluded.what_would_make_me_buy
      `
    })
  } catch (error) {
    return { status: 'error', message: describe(error) }
  }

  revalidatePath('/analyse')
  return { status: 'saved', message: 'Lagt til på vurderingslisten.' }
}

export async function removeFromWatchlist(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser()
  const id = z.string().uuid().safeParse(formData.get('id'))
  if (!id.success) return { status: 'error', message: 'Ugyldig oppføring.' }

  try {
    await withUser({ userId: user.id, accessToken: user.accessToken }, async (sql) => {
      await sql`delete from watchlist where id = ${id.data}`
    })
  } catch (error) {
    return { status: 'error', message: describe(error) }
  }

  revalidatePath('/analyse')
  return { status: 'saved', message: 'Fjernet.' }
}

function describe(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('DATABASE_URL')) {
    return 'Databasen er ikke koblet til ennå. Se SETUP.md.'
  }
  return `Kunne ikke lagre: ${message}`
}
