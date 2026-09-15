-- 0003_marketdata: prices, quotes, FX, provider call log, snapshots.
--
-- Every row carries `source` and a date. Without provenance you cannot tell
-- "stale" from "wrong", and the promise never to fabricate a number collapses.

create table prices (
  instrument_id uuid not null references instruments on delete cascade,
  as_of date not null,
  close numeric(28,12) not null,
  open numeric(28,12),
  high numeric(28,12),
  low numeric(28,12),
  volume numeric(28,4),
  currency char(3) not null,
  source text not null,
  is_split_adjusted boolean not null default false,
  fetched_at timestamptz not null default now(),
  primary key (instrument_id, as_of, source),
  constraint close_non_negative check (close >= 0)
);
create index prices_latest on prices (instrument_id, as_of desc);

-- Last known intraday mark, overwritten in place. History lives in `prices`.
create table quotes (
  instrument_id uuid primary key references instruments on delete cascade,
  price numeric(28,12) not null,
  currency char(3) not null,
  quoted_at timestamptz not null,
  source text not null,
  fetched_at timestamptz not null default now()
);

-- Stored in one direction only: 1 unit of `base` = `rate` NOK. The inverse is
-- derived in TypeScript, never in SQL, so there is one source of truth.
--
-- Norges Bank publishes SEK and DKK *per 100 units*; the provider applies
-- UNIT_MULT before writing here, so every row in this table is per 1 unit.
create table fx_rates (
  base char(3) not null,
  quote char(3) not null default 'NOK',
  as_of date not null,
  rate numeric(20,10) not null,
  source text not null,
  fetched_at timestamptz not null default now(),
  primary key (base, quote, as_of, source),
  constraint rate_positive check (rate > 0),
  constraint quote_is_nok check (quote = 'NOK')
);
create index fx_latest on fx_rates (base, quote, as_of desc);

-- Rate-limit and incident forensics. A nightly detector flags providers whose
-- error rate crosses a threshold.
create table provider_calls (
  id bigserial primary key,
  provider text not null,
  endpoint text not null,
  http_status int,
  ok boolean not null,
  items int,
  latency_ms int,
  error text,
  called_at timestamptz not null default now()
);
create index provider_calls_recent on provider_calls (provider, called_at desc);

-- Daily portfolio value. Recomputing history from partial price data is both
-- expensive and dishonest; a snapshot records what was actually known that day,
-- including how much of the portfolio could be priced at all.
create table portfolio_snapshots (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  as_of date not null,
  total_value_nok numeric(28,10) not null,
  cash_nok numeric(28,10) not null default 0,
  cost_basis_nok numeric(28,10),
  unrealized_nok numeric(28,10),
  realized_ytd_nok numeric(28,10),
  -- External flows that day, so time-weighted return can be chained correctly.
  net_flow_nok numeric(28,10) not null default 0,
  twr_index numeric(20,10),
  priced_positions int not null,
  total_positions int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, as_of),
  constraint coverage_sane check (priced_positions >= 0 and priced_positions <= total_positions)
);

create table position_snapshots (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  as_of date not null,
  account_id uuid not null references accounts on delete cascade,
  instrument_id uuid not null references instruments on delete cascade,
  quantity numeric(38,18) not null,
  price numeric(28,12),
  price_currency char(3),
  price_as_of date,
  price_source text,
  fx_to_nok numeric(20,10),
  value_nok numeric(28,10),
  cost_nok numeric(28,10),
  primary key (user_id, as_of, account_id, instrument_id)
);
