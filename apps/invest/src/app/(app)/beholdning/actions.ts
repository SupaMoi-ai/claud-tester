'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { withUser } from '@/data/db'
import {
  type ConditionInput,
  currentThesisVersion,
  replaceConditions,
  saveThesis,
} from '@/data/repos/thesis'
import { parseNbNumber } from '@/lib/format-nb'
import { requireUser } from '@/lib/supabase/server'

export type ActionState =
  | { status: 'idle' }
  | { status: 'saved'; message: string }
  | { status: 'error'; message: string }

/**
 * Numbers typed by a person go through the Norwegian parser, never
 * `Number(...)`. "1 234,56" with a non-breaking space is what a phone keyboard
 * and a copy-paste from Nordnet actually produce.
 */
const nbNumber = (label: string) =>
  z.string().transform((raw, ctx) => {
    const result = parseNbNumber(raw)
    if (!result.ok) {
      ctx.addIssue({ code: 'custom', message: `${label} er ikke et gyldig tall.` })
      return z.NEVER
    }
    return result.value
  })

const optionalNbNumber = (label: string) =>
  z
    .string()
    .optional()
    .transform((raw, ctx) => {
      if (!raw || raw.trim() === '') return null
      const result = parseNbNumber(raw)
      if (!result.ok) {
        ctx.addIssue({ code: 'custom', message: `${label} er ikke et gyldig tall.` })
        return z.NEVER
      }
      return result.value
    })

// ------------------------------------------------------------- transactions

const transactionSchema = z.object({
  accountId: z.string().uuid('Velg en konto.'),
  instrumentId: z.string().uuid('Velg en investering.'),
  type: z.enum([
    'OPENING_BALANCE',
    'BUY',
    'SELL',
    'TRANSFER_IN',
    'TRANSFER_OUT',
    'STAKING_REWARD',
    'AIRDROP',
    'DIVIDEND',
  ]),
  tradeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ugyldig dato.'),
  quantity: nbNumber('Antall'),
  price: optionalNbNumber('Kurs'),
  fee: optionalNbNumber('Gebyr'),
  currency: z.string().length(3),
  fxRateToNok: optionalNbNumber('Valutakurs'),
  costBasisConfidence: z.enum(['KNOWN', 'ESTIMATED', 'UNKNOWN']),
  note: z.string().max(500).optional(),
})

export async function addTransaction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser()

  const parsed = transactionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Ugyldige felter.' }
  }
  const input = parsed.data

  // The schema forbids a price alongside an UNKNOWN cost basis; the two
  // contradict, and the database would reject the row anyway.
  const price = input.costBasisConfidence === 'UNKNOWN' ? null : input.price
  const quantity =
    input.type === 'SELL' || input.type === 'TRANSFER_OUT'
      ? input.quantity.abs().negated()
      : input.quantity.abs()

  try {
    await withUser({ userId: user.id, accessToken: user.accessToken }, async (sql) => {
      await sql`
        insert into transactions
          (user_id, account_id, instrument_id, type, trade_date, quantity, price, fee,
           currency, fx_rate_to_nok, cost_basis_confidence, source, note)
        values
          (${user.id}, ${input.accountId}, ${input.instrumentId}, ${input.type},
           ${input.tradeDate}::date, ${quantity.toString()}, ${price?.toString() ?? null},
           ${(input.fee ?? null)?.toString() ?? 0}, ${input.currency},
           ${input.fxRateToNok?.toString() ?? null}, ${input.costBasisConfidence},
           'MANUAL', ${input.note ?? null})
      `
    })
  } catch (error) {
    return { status: 'error', message: describe(error) }
  }

  revalidatePath('/', 'layout')
  return { status: 'saved', message: 'Transaksjonen er lagt inn.' }
}

/**
 * Corrects an earlier transaction.
 *
 * The ledger is append-only and the database enforces it with a trigger that
 * raises, so a correction is a new row that reverses the old one plus a
 * replacement. Both stay on the record.
 */
export async function correctTransaction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser()

  const schema = transactionSchema.extend({ reversesTransactionId: z.string().uuid() })
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Ugyldige felter.' }
  }
  const input = parsed.data
  const price = input.costBasisConfidence === 'UNKNOWN' ? null : input.price
  const quantity =
    input.type === 'SELL' || input.type === 'TRANSFER_OUT'
      ? input.quantity.abs().negated()
      : input.quantity.abs()

  try {
    await withUser({ userId: user.id, accessToken: user.accessToken }, async (sql) => {
      await sql`
        insert into transactions
          (user_id, account_id, instrument_id, type, trade_date, currency,
           reverses_transaction_id, source, note)
        values
          (${user.id}, ${input.accountId}, ${input.instrumentId}, 'CORRECTION',
           ${input.tradeDate}::date, ${input.currency}, ${input.reversesTransactionId},
           'MANUAL', 'Erstattet av en korrigert oppføring.')
      `
      await sql`
        insert into transactions
          (user_id, account_id, instrument_id, type, trade_date, quantity, price, fee,
           currency, fx_rate_to_nok, cost_basis_confidence, source, note)
        values
          (${user.id}, ${input.accountId}, ${input.instrumentId}, ${input.type},
           ${input.tradeDate}::date, ${quantity.toString()}, ${price?.toString() ?? null},
           ${(input.fee ?? null)?.toString() ?? 0}, ${input.currency},
           ${input.fxRateToNok?.toString() ?? null}, ${input.costBasisConfidence},
           'MANUAL', ${input.note ?? null})
      `
    })
  } catch (error) {
    return { status: 'error', message: describe(error) }
  }

  revalidatePath('/', 'layout')
  return { status: 'saved', message: 'Beholdningen er bekreftet og oppdatert.' }
}

// --------------------------------------------------------------- manual price

const priceSchema = z.object({
  instrumentId: z.string().uuid(),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ugyldig dato.'),
  close: nbNumber('Kurs'),
  currency: z.string().length(3),
})

export async function setManualPrice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser()

  const parsed = priceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Ugyldige felter.' }
  }
  const input = parsed.data

  try {
    await withUser({ userId: user.id, accessToken: user.accessToken }, async (sql) => {
      // Source is recorded as 'manual' so the UI can mark it as hand-entered
      // and nudge for a refresh once it ages.
      await sql`
        insert into prices (instrument_id, as_of, close, currency, source)
        values (${input.instrumentId}, ${input.asOf}::date, ${input.close.toString()},
                ${input.currency}, 'manual')
        on conflict (instrument_id, as_of, source)
        do update set close = excluded.close, fetched_at = now()
      `
    })
  } catch (error) {
    return { status: 'error', message: describe(error) }
  }

  revalidatePath('/', 'layout')
  return { status: 'saved', message: 'Kursen er oppdatert.' }
}

// -------------------------------------------------------------------- thesis

const thesisSchema = z.object({
  instrumentId: z.string().uuid(),
  title: z.string().min(1, 'Gi tesen en tittel.').max(200),
  whyIOwnIt: z.string().min(1, 'Skriv hvorfor du eier den.').max(5000),
  whatIExpect: z.string().max(5000).optional(),
  mainRisks: z.string().max(5000).optional(),
  horizonMonths: z.coerce.number().int().positive().optional(),
  whatWouldChangeMyMind: z.string().max(5000).optional(),
  conviction: z.coerce.number().int().min(1).max(5).optional(),
  conditions: z.string().optional(),
})

const conditionsSchema = z.array(
  z.object({
    kind: z.enum(['PRICE_LEVEL', 'METRIC', 'DATE', 'DRAWDOWN', 'WEIGHT', 'MANUAL']),
    subject: z.string().min(1).max(200),
    operator: z.enum(['<', '<=', '>', '>=', '=', '!=']),
    threshold: z.string().nullable(),
    unit: z.string().max(40).nullable(),
    note: z.string().max(500).nullable(),
  }),
)

export async function saveThesisAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser()

  const parsed = thesisSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Ugyldige felter.' }
  }
  const input = parsed.data

  let conditions: ConditionInput[] = []
  if (input.conditions) {
    try {
      const raw = conditionsSchema.parse(JSON.parse(input.conditions))
      conditions = raw.map((c) => ({
        kind: c.kind,
        subject: c.subject,
        operator: c.operator,
        threshold: c.threshold,
        unit: c.unit,
        note: c.note,
      }))
    } catch {
      return { status: 'error', message: 'Kunne ikke lese vilkårene.' }
    }
  }

  try {
    await withUser({ userId: user.id, accessToken: user.accessToken }, async (sql) => {
      const thesisId = await saveThesis(sql, {
        userId: user.id,
        instrumentId: input.instrumentId,
        title: input.title,
        whyIOwnIt: input.whyIOwnIt,
        whatIExpect: input.whatIExpect ?? null,
        mainRisks: input.mainRisks ?? null,
        horizonMonths: input.horizonMonths ?? null,
        whatWouldChangeMyMind: input.whatWouldChangeMyMind ?? null,
        conviction: input.conviction ?? null,
      })
      const version = await currentThesisVersion(sql, thesisId)
      await replaceConditions(sql, user.id, thesisId, version, conditions)
    })
  } catch (error) {
    return { status: 'error', message: describe(error) }
  }

  revalidatePath('/', 'layout')
  return { status: 'saved', message: 'Tesen er lagret som en ny versjon.' }
}

/**
 * Turns a database error into something a person can act on.
 *
 * Constraint names leak otherwise, and "violates check constraint
 * unknown_basis_has_no_price" is not a sentence anyone should have to read.
 */
function describe(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  if (message.includes('append-only')) {
    return 'Transaksjoner kan ikke endres. Bruk «Korriger» — da beholdes historikken.'
  }
  if (message.includes('unknown_basis_has_no_price')) {
    return 'En ukjent kjøpspris kan ikke ha en kurs samtidig. Velg enten kjent eller ukjent.'
  }
  if (message.includes('qty_required')) {
    return 'Denne transaksjonstypen krever et antall.'
  }
  if (message.includes('DATABASE_URL')) {
    return 'Databasen er ikke koblet til ennå. Se SETUP.md.'
  }
  return `Kunne ikke lagre: ${message}`
}
