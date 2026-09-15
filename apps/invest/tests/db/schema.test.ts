import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestDb, seedUser, type TestDb } from './harness'

/**
 * These tests execute the real migration SQL against Postgres compiled to
 * WebAssembly. Docker is unavailable in the build sandbox, so this is how the
 * DDL, its constraints, its append-only trigger and its RLS policies get
 * actually run rather than merely written.
 */
describe('migrations', () => {
  let t: TestDb
  let alice: string
  let bob: string

  beforeAll(async () => {
    t = await createTestDb()
    alice = await seedUser(t.db, 'alice@example.com')
    bob = await seedUser(t.db, 'bob@example.com')
  })

  afterAll(async () => {
    await t?.close()
  })

  it('applies cleanly', async () => {
    const result = await t.db.query<{ count: number }>(
      "select count(*)::int as count from information_schema.tables where table_schema = 'public'",
    )
    expect(result.rows[0]?.count).toBeGreaterThan(20)
  })

  it('enables row level security on every public table', async () => {
    const result = await t.db.query<{ tablename: string }>(`
      select c.relname as tablename
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false
    `)
    expect(result.rows.map((r) => r.tablename)).toEqual([])
  })

  it('gives every user-owned table a policy', async () => {
    const result = await t.db.query<{ tablename: string }>(`
      select c.relname as tablename
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
    `)
    expect(result.rows.map((r) => r.tablename)).toEqual([])
  })

  describe('numeric precision', () => {
    it('stores crypto quantities at 18 decimal places without drift', async () => {
      const result = await t.db.query<{ scale: number; precision: number }>(`
        select numeric_scale as scale, numeric_precision as precision
        from information_schema.columns
        where table_name = 'transactions' and column_name = 'quantity'
      `)
      expect(result.rows[0]).toEqual({ precision: 38, scale: 18 })
    })

    it('round-trips 0.01022079 BTC exactly', async () => {
      await t.db.exec('create temp table qty_probe (q numeric(38,18))')
      await t.db.query('insert into qty_probe values ($1)', ['0.01022079'])
      const result = await t.db.query<{ q: string }>('select q::text as q from qty_probe')
      expect(result.rows[0]?.q).toBe('0.010220790000000000')
      await t.db.exec('drop table qty_probe')
    })
  })

  describe('the ledger is append-only', () => {
    let accountId: string
    let instrumentId: string
    let txnId: string

    beforeAll(async () => {
      const acct = await t.db.query<{ id: string }>(
        `insert into accounts (user_id, name, kind, currency)
         values ($1, 'Nordnet', 'BROKERAGE', 'NOK') returning id`,
        [alice],
      )
      accountId = acct.rows[0]?.id ?? ''

      const inst = await t.db.query<{ id: string }>(
        `insert into instruments (user_id, kind, symbol, mic, name, currency)
         values ($1, 'EQUITY', 'OTOVO', 'XOSL', 'Otovo ASA', 'NOK') returning id`,
        [alice],
      )
      instrumentId = inst.rows[0]?.id ?? ''

      const txn = await t.db.query<{ id: string }>(
        `insert into transactions
           (user_id, account_id, instrument_id, type, trade_date, quantity, price, currency)
         values ($1, $2, $3, 'OPENING_BALANCE', '2021-06-01', 80, 14.406, 'NOK')
         returning id`,
        [alice, accountId, instrumentId],
      )
      txnId = txn.rows[0]?.id ?? ''
    })

    it('rejects an UPDATE loudly instead of silently ignoring it', async () => {
      // A RULE ... DO INSTEAD NOTHING would return success and change nothing,
      // which is how an app quietly stops recording corrections.
      await expect(
        t.db.query('update transactions set quantity = 999 where id = $1', [txnId]),
      ).rejects.toThrow(/append-only/)
    })

    it('rejects a DELETE loudly', async () => {
      await expect(t.db.query('delete from transactions where id = $1', [txnId])).rejects.toThrow(
        /append-only/,
      )
    })

    it('leaves the row untouched after a rejected mutation', async () => {
      const result = await t.db.query<{ quantity: string }>(
        'select quantity::text as quantity from transactions where id = $1',
        [txnId],
      )
      expect(result.rows[0]?.quantity).toBe('80.000000000000000000')
    })

    it('accepts a CORRECTION row that points at the original', async () => {
      const result = await t.db.query<{ id: string }>(
        `insert into transactions
           (user_id, account_id, instrument_id, type, trade_date, currency, reverses_transaction_id)
         values ($1, $2, $3, 'CORRECTION', '2026-09-14', 'NOK', $4)
         returning id`,
        [alice, accountId, instrumentId, txnId],
      )
      expect(result.rows[0]?.id).toBeTruthy()
    })

    it('records the Otovo reverse split as a corporate action', async () => {
      const result = await t.db.query<{ ratio: string }>(
        `insert into corporate_actions
           (user_id, instrument_id, type, ex_date, ratio_num, ratio_den)
         values ($1, $2, 'REVERSE_SPLIT', '2026-02-03', 1, 10)
         returning (ratio_num / ratio_den)::text as ratio`,
        [alice, instrumentId],
      )
      expect(Number(result.rows[0]?.ratio)).toBeCloseTo(0.1, 10)
    })

    it('refuses a split with no ratio', async () => {
      await expect(
        t.db.query(
          `insert into corporate_actions (user_id, instrument_id, type, ex_date)
           values ($1, $2, 'SPLIT', '2027-01-01')`,
          [alice, instrumentId],
        ),
      ).rejects.toThrow(/split_needs_ratio/)
    })

    it('refuses a transaction claiming both UNKNOWN cost basis and a price', async () => {
      await expect(
        t.db.query(
          `insert into transactions
             (user_id, account_id, instrument_id, type, trade_date, quantity, price,
              currency, cost_basis_confidence)
           values ($1, $2, $3, 'OPENING_BALANCE', '2026-09-14', 1, 100, 'NOK', 'UNKNOWN')`,
          [alice, accountId, instrumentId],
        ),
      ).rejects.toThrow(/unknown_basis_has_no_price/)
    })

    it('refuses a BUY with no quantity', async () => {
      await expect(
        t.db.query(
          `insert into transactions (user_id, account_id, instrument_id, type, trade_date, currency)
           values ($1, $2, $3, 'BUY', '2026-09-14', 'NOK')`,
          [alice, accountId, instrumentId],
        ),
      ).rejects.toThrow(/qty_required/)
    })
  })

  describe('FX rates', () => {
    it('refuses a non-NOK quote currency, keeping one direction of truth', async () => {
      await expect(
        t.db.query(
          `insert into fx_rates (base, quote, as_of, rate, source)
           values ('NOK', 'USD', '2026-09-14', 0.096, 'test')`,
        ),
      ).rejects.toThrow(/quote_is_nok/)
    })

    it('refuses a zero or negative rate', async () => {
      await expect(
        t.db.query(
          `insert into fx_rates (base, quote, as_of, rate, source)
           values ('USD', 'NOK', '2026-09-14', 0, 'test')`,
        ),
      ).rejects.toThrow(/rate_positive/)
    })
  })

  describe('row level security', () => {
    it("hides one user's accounts from another", async () => {
      await t.asUser(bob, async (db) => {
        const result = await db.query('select id from accounts')
        expect(result.rows).toEqual([])
      })
    })

    it('shows a user their own accounts', async () => {
      await t.asUser(alice, async (db) => {
        const result = await db.query('select id from accounts')
        expect(result.rows.length).toBeGreaterThan(0)
      })
    })

    it('stops a user inserting rows owned by someone else', async () => {
      await expect(
        t.asUser(bob, async (db) => {
          await db.query(
            `insert into accounts (user_id, name, kind, currency)
             values ($1, 'Stolen', 'BROKERAGE', 'NOK')`,
            [alice],
          )
        }),
      ).rejects.toThrow(/row-level security/)
    })

    it('gives a user no UPDATE or DELETE path into the ledger at all', async () => {
      const result = await t.db.query<{ cmd: string }>(`
        select polcmd::text as cmd from pg_policy
        where polrelid = 'transactions'::regclass
      `)
      const commands = result.rows.map((r) => r.cmd).sort()
      // 'r' = SELECT, 'a' = INSERT. No 'w' (UPDATE) and no 'd' (DELETE).
      expect(commands).toEqual(['a', 'r'])
    })

    it('lets any signed-in user read shared market data', async () => {
      await t.db.query(
        `insert into fx_rates (base, quote, as_of, rate, source)
         values ('USD', 'NOK', '2026-09-12', 10.42, 'norgesbank')`,
      )
      await t.asUser(bob, async (db) => {
        const result = await db.query('select rate from fx_rates')
        expect(result.rows.length).toBe(1)
      })
    })

    it('gives no user-role write path to market data', async () => {
      await expect(
        t.asUser(bob, async (db) => {
          await db.query(
            `insert into fx_rates (base, quote, as_of, rate, source)
             values ('EUR', 'NOK', '2026-09-12', 11.68, 'forged')`,
          )
        }),
      ).rejects.toThrow(/row-level security/)
    })
  })
})
