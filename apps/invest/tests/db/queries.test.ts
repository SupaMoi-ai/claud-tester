import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as Q from '@/data/repos/queries'
import { createTestDb, seedUser, type TestDb } from './harness'

const SEED_PATH = new URL('../../supabase/seed.sql', import.meta.url).pathname
const AS_OF = '2026-09-14'

/**
 * Executes every read query the app issues against the real migrated schema.
 *
 * TypeScript cannot check a column name and neither can a tagged template, so
 * a typo in `close` or `as_of` would otherwise surface only the first time the
 * app talks to a live database -- which, with no Supabase project in this
 * environment, would be in production. These are the exact strings the
 * repositories run, imported rather than copied.
 */
describe('read queries', () => {
  let t: TestDb
  let instrumentId: string

  beforeAll(async () => {
    t = await createTestDb()
    await seedUser(t.db, 'thomas@example.com')
    await t.db.exec(await readFile(SEED_PATH, 'utf8'))

    const rows = await t.db.query<{ id: string }>(
      "select id from instruments where symbol = 'OTOVO'",
    )
    instrumentId = rows.rows[0]?.id ?? ''
  })

  afterAll(async () => {
    await t?.close()
  })

  for (const query of Q.ALL_READ_QUERIES) {
    it(`${query.name} runs and matches the schema`, async () => {
      const result = await t.db.query(query.sql, [...query.params])
      expect(Array.isArray(result.rows)).toBe(true)
    })
  }

  it('LIST_PRICES returns the seeded prices as strings, not floats', async () => {
    const result = await t.db.query<{ instrument_id: string; close: string }>(Q.LIST_PRICES, [
      AS_OF,
    ])
    expect(result.rows).toHaveLength(4)
    const closes = result.rows.map((r) => r.close)
    for (const close of closes) {
      expect(typeof close).toBe('string')
    }
    // Full precision preserved on the way out.
    expect(closes).toContain('732625.360000000000')
  })

  it('LIST_PRICES refuses to look into the future', async () => {
    const result = await t.db.query(Q.LIST_PRICES, ['2026-09-13'])
    expect(result.rows).toHaveLength(0)
  })

  it('LIST_FX_RATES runs with a date bound', async () => {
    const result = await t.db.query(Q.LIST_FX_RATES, [AS_OF])
    expect(Array.isArray(result.rows)).toBe(true)
  })

  it('LIST_TRANSACTIONS returns quantities as exact strings', async () => {
    const result = await t.db.query<{ quantity: string | null; cost_basis_confidence: string }>(
      Q.LIST_TRANSACTIONS,
    )
    expect(result.rows).toHaveLength(4)
    const quantities = result.rows.map((r) => r.quantity)
    expect(quantities).toContain('0.010220790000000000')
    expect(result.rows.map((r) => r.cost_basis_confidence)).toContain('ESTIMATED')
  })

  it('LIST_TRANSACTIONS_FOR_INSTRUMENT filters', async () => {
    const result = await t.db.query(Q.LIST_TRANSACTIONS_FOR_INSTRUMENT, [instrumentId])
    expect(result.rows).toHaveLength(1)
  })

  it('LIST_CORPORATE_ACTIONS returns the Otovo reverse split', async () => {
    const result = await t.db.query<{ type: string; ex_date: string; ratio_den: string }>(
      Q.LIST_CORPORATE_ACTIONS,
    )
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]?.type).toBe('REVERSE_SPLIT')
    expect(result.rows[0]?.ex_date).toBe('2026-02-03')
  })

  it('LIST_EXPOSURES returns one row per instrument, dimension and tag', async () => {
    const result = await t.db.query<{ dimension: string; weight: string }>(Q.LIST_EXPOSURES)
    expect(result.rows.length).toBeGreaterThan(0)
    expect(result.rows.map((r) => r.dimension)).toContain('ASSET_CLASS')
  })

  it('GET_THESIS and its conditions query run', async () => {
    const thesis = await t.db.query(Q.GET_THESIS, [instrumentId])
    // Nothing seeded, but the query must still be valid against the schema.
    expect(thesis.rows).toHaveLength(0)

    const conditions = await t.db.query(Q.GET_THESIS_CONDITIONS, [
      '00000000-0000-0000-0000-000000000000',
      1,
    ])
    expect(conditions.rows).toHaveLength(0)
  })

  /**
   * These strings are passed to `sql.unsafe`, where "unsafe" refers to the
   * query text. They are safe only because every one is a fixed constant with
   * values supplied positionally. A future edit that interpolates a value
   * directly would be an injection vector, so it fails here first.
   */
  it('contains no interpolation, only positional parameters', () => {
    const all: Array<[string, string]> = []
    for (const [name, value] of Object.entries(Q as Record<string, unknown>)) {
      if (typeof value === 'string') all.push([name, value])
    }
    expect(all.length).toBeGreaterThan(10)

    for (const [name, sql] of all) {
      expect(sql, `${name} must not interpolate a template expression`).not.toMatch(/\$\{/)
      expect(sql, `${name} must not concatenate a value`).not.toMatch(/'\s*\+|\+\s*'/)
      // Positional placeholders are the only permitted way to pass a value.
      for (const placeholder of sql.match(/\$\d+/g) ?? []) {
        expect(placeholder).toMatch(/^\$[1-9]\d*$/)
      }
    }
  })

  it('LIST_JOURNAL queries run', async () => {
    expect((await t.db.query(Q.LIST_JOURNAL, [100])).rows).toHaveLength(0)
    expect(
      (await t.db.query(Q.LIST_JOURNAL_FOR_INSTRUMENT, [instrumentId, 100])).rows,
    ).toHaveLength(0)
  })
})
