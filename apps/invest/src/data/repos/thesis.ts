import 'server-only'
import type { TransactionSql } from 'postgres'
import { type Decimal, dec } from '@/domain/money'

export type ThesisConditionKind =
  | 'PRICE_LEVEL'
  | 'METRIC'
  | 'DATE'
  | 'DRAWDOWN'
  | 'WEIGHT'
  | 'MANUAL'

export type ThesisCondition = {
  readonly id: string
  readonly kind: ThesisConditionKind
  readonly subject: string
  readonly operator: string
  readonly threshold: Decimal | null
  readonly unit: string | null
  readonly note: string | null
  readonly status: 'HOLDING' | 'BREACHED' | 'UNKNOWN'
  readonly lastObserved: Decimal | null
}

export type Thesis = {
  readonly id: string
  readonly instrumentId: string | null
  readonly title: string
  readonly status: 'DRAFT' | 'ACTIVE' | 'INVALIDATED' | 'CLOSED'
  readonly version: number
  readonly whyIOwnIt: string
  readonly whatIExpect: string | null
  readonly mainRisks: string | null
  readonly horizonMonths: number | null
  readonly whatWouldChangeMyMind: string | null
  readonly conviction: number | null
  readonly createdAt: string
  readonly conditions: readonly ThesisCondition[]
}

export async function getThesis(sql: TransactionSql, instrumentId: string): Promise<Thesis | null> {
  const rows = await sql<
    Array<{
      id: string
      instrument_id: string | null
      title: string
      status: string
      version: number
      why_i_own_it: string
      what_i_expect: string | null
      main_risks: string | null
      horizon_months: number | null
      what_would_change_my_mind: string | null
      conviction: number | null
      created_at: string
    }>
  >`
    select t.id, t.instrument_id, t.title, t.status::text, v.version,
           v.why_i_own_it, v.what_i_expect, v.main_risks, v.horizon_months,
           v.what_would_change_my_mind, v.conviction, v.created_at::text
    from theses t
    join thesis_versions v on v.thesis_id = t.id and v.version = t.current_version
    where t.instrument_id = ${instrumentId}
    limit 1
  `

  const row = rows[0]
  if (!row) return null

  const conditionRows = await sql<
    Array<{
      id: string
      kind: string
      subject: string
      operator: string
      threshold: string | null
      unit: string | null
      note: string | null
      status: string
      last_observed: string | null
    }>
  >`
    select id, kind::text, subject, operator, threshold::text, unit, note,
           status::text, last_observed::text
    from thesis_conditions
    where thesis_id = ${row.id} and version = ${row.version}
    order by id
  `

  return {
    id: row.id,
    instrumentId: row.instrument_id,
    title: row.title,
    status: row.status as Thesis['status'],
    version: row.version,
    whyIOwnIt: row.why_i_own_it,
    whatIExpect: row.what_i_expect,
    mainRisks: row.main_risks,
    horizonMonths: row.horizon_months,
    whatWouldChangeMyMind: row.what_would_change_my_mind,
    conviction: row.conviction,
    createdAt: row.created_at,
    conditions: conditionRows.map((c) => ({
      id: c.id,
      kind: c.kind as ThesisConditionKind,
      subject: c.subject,
      operator: c.operator,
      threshold: c.threshold === null ? null : dec(c.threshold),
      unit: c.unit,
      note: c.note,
      status: c.status as ThesisCondition['status'],
      lastObserved: c.last_observed === null ? null : dec(c.last_observed),
    })),
  }
}

export type SaveThesisInput = {
  readonly userId: string
  readonly instrumentId: string
  readonly title: string
  readonly whyIOwnIt: string
  readonly whatIExpect: string | null
  readonly mainRisks: string | null
  readonly horizonMonths: number | null
  readonly whatWouldChangeMyMind: string | null
  readonly conviction: number | null
}

/**
 * Saves a thesis as a NEW VERSION rather than an edit.
 *
 * The whole point of writing a thesis down is being able to read, later,
 * exactly what you believed at the time. An UPDATE would destroy that, so
 * every save appends and `current_version` moves forward.
 */
export async function saveThesis(sql: TransactionSql, input: SaveThesisInput): Promise<string> {
  const existing = await sql<Array<{ id: string; current_version: number }>>`
    select id, current_version from theses where instrument_id = ${input.instrumentId} limit 1
  `

  const current = existing[0]
  let thesisId: string
  let nextVersion: number

  if (current) {
    thesisId = current.id
    nextVersion = current.current_version + 1
    await sql`
      update thesis_versions set superseded_at = now()
      where thesis_id = ${thesisId} and version = ${current.current_version}
    `
    await sql`
      update theses
      set current_version = ${nextVersion}, title = ${input.title}, updated_at = now()
      where id = ${thesisId}
    `
  } else {
    const created = await sql<Array<{ id: string }>>`
      insert into theses (user_id, instrument_id, title, status, current_version)
      values (${input.userId}, ${input.instrumentId}, ${input.title}, 'ACTIVE', 1)
      returning id
    `
    const row = created[0]
    if (!row) throw new Error('Kunne ikke opprette investeringstese')
    thesisId = row.id
    nextVersion = 1
  }

  await sql`
    insert into thesis_versions
      (thesis_id, version, user_id, why_i_own_it, what_i_expect, main_risks,
       horizon_months, what_would_change_my_mind, conviction)
    values
      (${thesisId}, ${nextVersion}, ${input.userId}, ${input.whyIOwnIt}, ${input.whatIExpect},
       ${input.mainRisks}, ${input.horizonMonths}, ${input.whatWouldChangeMyMind},
       ${input.conviction})
  `

  return thesisId
}

export type ConditionInput = {
  readonly kind: ThesisConditionKind
  readonly subject: string
  readonly operator: string
  readonly threshold: string | null
  readonly unit: string | null
  readonly note: string | null
}

export async function replaceConditions(
  sql: TransactionSql,
  userId: string,
  thesisId: string,
  version: number,
  conditions: readonly ConditionInput[],
): Promise<void> {
  await sql`delete from thesis_conditions where thesis_id = ${thesisId} and version = ${version}`

  for (const c of conditions) {
    await sql`
      insert into thesis_conditions
        (user_id, thesis_id, version, kind, subject, operator, threshold, unit, note, evaluation)
      values
        (${userId}, ${thesisId}, ${version}, ${c.kind}, ${c.subject}, ${c.operator},
         ${c.threshold}, ${c.unit}, ${c.note}, ${c.kind === 'MANUAL' ? 'MANUAL' : 'AUTO'})
    `
  }
}

export async function currentThesisVersion(sql: TransactionSql, thesisId: string): Promise<number> {
  const rows = await sql<Array<{ current_version: number }>>`
    select current_version from theses where id = ${thesisId}
  `
  return rows[0]?.current_version ?? 1
}
