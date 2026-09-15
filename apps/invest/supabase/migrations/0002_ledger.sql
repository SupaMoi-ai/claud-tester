-- 0002_ledger: the append-only transaction ledger, corporate actions, tax lots.
--
-- This file holds the schema decisions that are most expensive to change later:
-- the ledger is append-only, every row carries its own currency AND the FX rate
-- captured at trade time, and corporate actions are modelled from day one.

create type txn_type as enum (
  'OPENING_BALANCE',
  'BUY', 'SELL',
  'DEPOSIT', 'WITHDRAWAL',
  'DIVIDEND', 'INTEREST',
  'FEE', 'TAX',
  'TRANSFER_IN', 'TRANSFER_OUT',
  'STAKING_REWARD', 'AIRDROP',
  'FX_CONVERSION',
  'CORRECTION'
);

create type ca_type as enum (
  'SPLIT', 'REVERSE_SPLIT', 'DIVIDEND', 'SPINOFF', 'MERGER', 'TICKER_CHANGE', 'DELISTING'
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  account_id uuid not null references accounts on delete restrict,
  instrument_id uuid references instruments on delete restrict,
  type txn_type not null,
  -- Europe/Oslo calendar date. Everything else in the schema is timestamptz.
  trade_date date not null,
  settle_date date,
  -- Signed: positive increases the position.
  quantity numeric(38,18),
  price numeric(28,12),
  gross_amount numeric(28,10),
  fee numeric(28,10) not null default 0,
  tax numeric(28,10) not null default 0,
  currency char(3) not null,
  -- Captured at trade time. A NOK-only schema could never reconstruct the
  -- security-versus-currency split of a return, so this is not optional in
  -- spirit even where it is nullable in SQL.
  fx_rate_to_nok numeric(20,10),
  -- How much to trust `price` as a cost basis. An imported holding with no
  -- purchase history is UNKNOWN, and the engine reports that rather than zero.
  cost_basis_confidence basis_confidence not null default 'KNOWN',
  counter_instrument_id uuid references instruments on delete restrict,
  counter_quantity numeric(38,18),
  external_id text,
  import_batch_id uuid,
  source data_source_kind not null default 'MANUAL',
  -- Corrections are new rows, never an UPDATE.
  reverses_transaction_id uuid references transactions (id),
  note text,
  created_at timestamptz not null default now(),

  constraint qty_required check (
    type not in ('BUY', 'SELL', 'OPENING_BALANCE', 'TRANSFER_IN', 'TRANSFER_OUT',
                 'STAKING_REWARD', 'AIRDROP')
    or quantity is not null
  ),
  constraint instrument_required check (
    type not in ('BUY', 'SELL', 'OPENING_BALANCE', 'STAKING_REWARD', 'AIRDROP')
    or instrument_id is not null
  ),
  constraint fee_non_negative check (fee >= 0 and tax >= 0),
  constraint fx_positive check (fx_rate_to_nok is null or fx_rate_to_nok > 0),
  constraint price_non_negative check (price is null or price >= 0),
  -- An unknown cost basis must not also carry a price: the two contradict.
  constraint unknown_basis_has_no_price check (
    cost_basis_confidence <> 'UNKNOWN' or price is null
  )
);

create unique index txn_external_uq on transactions (user_id, account_id, external_id)
  where external_id is not null;
create index txn_replay on transactions (user_id, account_id, instrument_id, trade_date, created_at);
create index txn_by_date on transactions (user_id, trade_date desc);

-- Append-only, enforced so it FAILS rather than silently doing nothing.
--
-- A RULE ... DO INSTEAD NOTHING would swallow the write and return success,
-- which is how an application quietly stops recording corrections. A trigger
-- that raises makes the mistake impossible to miss.
create or replace function reject_ledger_mutation() returns trigger
  language plpgsql as $$
begin
  raise exception
    'transactions is append-only: use a CORRECTION row with reverses_transaction_id (attempted % on id %)',
    tg_op, coalesce(old.id::text, '?')
    using errcode = 'restrict_violation';
end;
$$;

create trigger transactions_append_only
  before update or delete on transactions
  for each row execute function reject_ledger_mutation();

-- Corporate actions belong to the instrument, not to any one account's ledger:
-- they apply to every holder and must retroactively adjust historical prices
-- too, which a per-account row cannot express.
--
-- Otovo ASA, 10-for-1 reverse split, ex-date 2026-02-03:
--   type = 'REVERSE_SPLIT', ratio_num = 1, ratio_den = 10
-- Every pre-ex-date quantity x 0.1, every pre-ex-date price x 10.
create table corporate_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  instrument_id uuid not null references instruments on delete cascade,
  type ca_type not null,
  ex_date date not null,
  ratio_num numeric(28,10),
  ratio_den numeric(28,10),
  cash_per_share numeric(28,10),
  cash_currency char(3),
  new_symbol text,
  new_instrument_id uuid references instruments on delete set null,
  source data_source_kind not null default 'MANUAL',
  note text,
  created_at timestamptz not null default now(),
  unique (instrument_id, type, ex_date),
  constraint ratio_pair check ((ratio_num is null) = (ratio_den is null)),
  constraint ratio_positive check (ratio_num is null or (ratio_num > 0 and ratio_den > 0)),
  constraint split_needs_ratio check (
    type not in ('SPLIT', 'REVERSE_SPLIT') or ratio_num is not null
  )
);
create index ca_lookup on corporate_actions (instrument_id, ex_date);

-- Lots are derivable from the ledger; this table is a cache for when realised
-- FIFO P&L is added. Phase 1 derives in code and leaves these empty.
create table tax_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  account_id uuid not null references accounts on delete cascade,
  instrument_id uuid not null references instruments on delete cascade,
  open_transaction_id uuid not null references transactions,
  open_date date not null,
  method cost_method not null,
  quantity_open numeric(38,18) not null,
  quantity_remaining numeric(38,18) not null,
  cost_per_unit numeric(28,12) not null,
  cost_currency char(3) not null,
  fx_at_open numeric(20,10) not null,
  cost_nok numeric(28,10) not null,
  computed_at timestamptz not null default now(),
  constraint remaining_within_open check (
    quantity_remaining >= 0 and quantity_remaining <= quantity_open
  )
);
create index lots_open on tax_lots (user_id, instrument_id, open_date)
  where quantity_remaining > 0;

create table tax_lot_closures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  lot_id uuid not null references tax_lots on delete cascade,
  close_transaction_id uuid not null references transactions,
  close_date date not null,
  quantity numeric(38,18) not null,
  proceeds_nok numeric(28,10) not null,
  cost_nok numeric(28,10) not null,
  -- Split at closure time. Cheap now; impossible to reconstruct later.
  realized_security_nok numeric(28,10) not null,
  realized_fx_nok numeric(28,10) not null
);
