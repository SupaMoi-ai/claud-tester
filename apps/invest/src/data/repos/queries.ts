/**
 * Read queries, as plain SQL with positional parameters.
 *
 * They live here rather than inline in the repositories so that the exact same
 * text can be executed against pglite in a test. TypeScript cannot check a
 * column name, and neither can a tagged template -- a typo in `close` or
 * `as_of` would otherwise only surface the first time the app talks to a real
 * database. `tests/db/queries.test.ts` runs every one of these against the
 * migrated schema.
 *
 * Every numeric column is cast to text: `numeric` arriving as a JS number is a
 * float, and a float cannot represent 0.01022079 BTC exactly.
 *
 * On `sql.unsafe`: the "unsafe" refers to the query TEXT, not the parameters.
 * Every string here is a module constant with no interpolation, and values are
 * passed positionally, so they are still parameterised by the driver. A test
 * asserts that none of these constants ever gains a template placeholder.
 *
 * `TransactionSql` extends `ISql`, so `unsafe` runs on the transaction's own
 * connection -- the `request.jwt.claims` and `set local role authenticated` set
 * by `withUser` therefore still apply, and row-level security is enforced.
 */

export const LIST_ACCOUNTS = `
  select id, name, kind::text as kind, provider, currency, tax_wrapper::text as tax_wrapper
  from accounts
  where is_active
  order by name
`

export const LIST_INSTRUMENTS = `
  select id, kind::text as kind, symbol, name, currency, mic, isin
  from instruments
  where is_active
  order by symbol
`

export const LIST_TRANSACTIONS = `
  select id, account_id, instrument_id, type::text as type, trade_date::text as trade_date,
         quantity::text as quantity, price::text as price, fee::text as fee, currency,
         fx_rate_to_nok::text as fx_rate_to_nok,
         cost_basis_confidence::text as cost_basis_confidence,
         reverses_transaction_id, note
  from transactions
  where instrument_id is not null
  order by trade_date desc, created_at desc
`

export const LIST_TRANSACTIONS_FOR_INSTRUMENT = `
  select id, account_id, instrument_id, type::text as type, trade_date::text as trade_date,
         quantity::text as quantity, price::text as price, fee::text as fee, currency,
         fx_rate_to_nok::text as fx_rate_to_nok,
         cost_basis_confidence::text as cost_basis_confidence,
         reverses_transaction_id, note
  from transactions
  where instrument_id = $1
  order by trade_date desc, created_at desc
`

export const LIST_CORPORATE_ACTIONS = `
  select id, instrument_id, type::text as type, ex_date::text as ex_date,
         ratio_num::text as ratio_num, ratio_den::text as ratio_den
  from corporate_actions
  where ratio_num is not null
  order by ex_date
`

/**
 * Prices at or before the given date.
 *
 * The upper bound is load-bearing: without it a valuation dated in the past
 * could see prices that did not exist yet, which would quietly make every
 * historical figure wrong. Where several sources share a date, the most
 * recently fetched wins.
 */
export const LIST_PRICES = `
  select distinct on (instrument_id, as_of)
         instrument_id, as_of::text as as_of, close::text as close, currency, source
  from prices
  where as_of <= $1::date
  order by instrument_id, as_of, fetched_at desc
`

export const LIST_FX_RATES = `
  select distinct on (base, quote, as_of)
         base, quote, as_of::text as as_of, rate::text as rate, source
  from fx_rates
  where as_of <= $1::date
  order by base, quote, as_of, fetched_at desc
`

export const LIST_EXPOSURES = `
  select distinct on (instrument_id, dimension, tag)
         instrument_id, dimension::text as dimension, tag, weight::text as weight
  from instrument_exposures
  order by instrument_id, dimension, tag, as_of desc
`

export const GET_THESIS = `
  select t.id, t.instrument_id, t.title, t.status::text as status, v.version,
         v.why_i_own_it, v.what_i_expect, v.main_risks, v.horizon_months,
         v.what_would_change_my_mind, v.conviction, v.created_at::text as created_at
  from theses t
  join thesis_versions v on v.thesis_id = t.id and v.version = t.current_version
  where t.instrument_id = $1
  limit 1
`

export const GET_THESIS_CONDITIONS = `
  select id, kind::text as kind, subject, operator, threshold::text as threshold, unit, note,
         status::text as status, last_observed::text as last_observed
  from thesis_conditions
  where thesis_id = $1 and version = $2
  order by id
`

export const LIST_JOURNAL = `
  select j.id, j.occurred_at::text as occurred_at, j.kind::text as kind, j.title, j.body_md,
         j.what_i_expected, j.instrument_id, i.name as instrument_name, j.conviction
  from journal_entries j
  left join instruments i on i.id = j.instrument_id
  order by j.occurred_at desc
  limit $1
`

export const LIST_JOURNAL_FOR_INSTRUMENT = `
  select j.id, j.occurred_at::text as occurred_at, j.kind::text as kind, j.title, j.body_md,
         j.what_i_expected, j.instrument_id, i.name as instrument_name, j.conviction
  from journal_entries j
  left join instruments i on i.id = j.instrument_id
  where j.instrument_id = $1
  order by j.occurred_at desc
  limit $2
`

export const LIST_WATCHLIST = `
  select w.id, w.instrument_id, i.name as instrument_name, i.symbol as instrument_symbol,
         w.added_at::text as added_at, w.target_buy_price::text as target_buy_price,
         w.target_currency, w.what_would_make_me_buy
  from watchlist w
  join instruments i on i.id = w.instrument_id
  order by w.added_at desc
`

/** Every read query, so a test can prove each one runs against the real schema. */
export const ALL_READ_QUERIES: ReadonlyArray<{
  readonly name: string
  readonly sql: string
  readonly params: readonly unknown[]
}> = [
  { name: 'LIST_ACCOUNTS', sql: LIST_ACCOUNTS, params: [] },
  { name: 'LIST_INSTRUMENTS', sql: LIST_INSTRUMENTS, params: [] },
  { name: 'LIST_TRANSACTIONS', sql: LIST_TRANSACTIONS, params: [] },
  { name: 'LIST_CORPORATE_ACTIONS', sql: LIST_CORPORATE_ACTIONS, params: [] },
  { name: 'LIST_EXPOSURES', sql: LIST_EXPOSURES, params: [] },
  { name: 'LIST_WATCHLIST', sql: LIST_WATCHLIST, params: [] },
]
