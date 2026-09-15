-- 0001_core: enums, settings, accounts, instruments, exposures.
--
-- Numeric precision is fixed here and is the one decision in this schema that
-- cannot be walked back cheaply:
--   quantity numeric(38,18)  -- 0.01022079 BTC today; ERC-20s need 18 dp
--   price    numeric(28,12)  -- sub-øre crypto prices
--   money    numeric(28,10)  -- may hold NOK or BTC on a crypto-crypto trade
--   fx       numeric(20,10)
-- Never float8 in the ledger. Values cross the wire as strings.

-- No pgcrypto needed: gen_random_uuid() is core Postgres since 13.

create type account_kind    as enum ('BROKERAGE', 'EXCHANGE', 'BANK', 'PENSION', 'OTHER');
-- Norwegian account wrappers. Modelled because they change how a return should
-- be read; the app makes no tax calculations or claims.
create type tax_wrapper     as enum ('ORDINARY', 'ASK', 'IPS', 'FONDSKONTO', 'NONE');
create type instrument_kind as enum ('EQUITY', 'ETF', 'FUND', 'BOND', 'CRYPTO', 'CASH', 'COMMODITY', 'OTHER');
create type exposure_dim    as enum ('ASSET_CLASS', 'SECTOR', 'GEOGRAPHY', 'THEME', 'FACTOR', 'CURRENCY');
create type data_source_kind as enum ('MANUAL', 'PROVIDER', 'BROKER_IMPORT', 'DERIVED', 'LLM_SUGGESTED');
create type cost_method     as enum ('FIFO', 'AVERAGE');

-- Confidence in a cost basis is a first-class fact. An imported holding whose
-- purchase history is unknown must be representable as such, never as zero.
create type basis_confidence as enum ('KNOWN', 'ESTIMATED', 'UNKNOWN');

create table user_settings (
  user_id uuid primary key references auth.users on delete cascade,
  base_currency char(3) not null default 'NOK',
  locale text not null default 'nb-NO',
  timezone text not null default 'Europe/Oslo',
  default_cost_method cost_method not null default 'FIFO',
  benchmark_instrument_id uuid,
  ai_daily_budget_usd numeric(10,4) not null default 1.0,
  price_staleness_days int not null default 1,
  price_very_stale_days int not null default 4,
  -- Drives "what changed since I last checked". Architectural, not cosmetic:
  -- without it that question can never be answered truthfully.
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  kind account_kind not null,
  provider text,
  external_id text,
  currency char(3) not null default 'NOK',
  tax_wrapper tax_wrapper not null default 'ORDINARY',
  is_active boolean not null default true,
  opened_on date,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table instruments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind instrument_kind not null,
  symbol text not null,
  mic text,
  isin char(12),
  name text not null,
  currency char(3) not null,
  country char(2),
  is_active boolean not null default true,
  price_precision smallint not null default 4,
  qty_precision smallint not null default 8,
  notes text,
  created_at timestamptz not null default now(),
  constraint isin_format check (isin is null or isin ~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$')
);
-- A null MIC (crypto, cash) must still be unique per symbol, which a plain
-- UNIQUE cannot express because NULL never equals NULL.
create unique index instruments_symbol_uq
  on instruments (user_id, kind, symbol, coalesce(mic, ''));
create unique index instruments_isin_uq
  on instruments (user_id, isin) where isin is not null;

-- Lets a provider be swapped without touching the ledger.
create table instrument_provider_ids (
  instrument_id uuid not null references instruments on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  provider text not null,
  provider_symbol text not null,
  is_primary boolean not null default false,
  primary key (instrument_id, provider)
);

-- Multi-dimensional, weighted, overlapping tags. Overlap analysis is then a
-- weighted set intersection, and a fund can be 60% US / 40% Europe.
create table instrument_exposures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  instrument_id uuid not null references instruments on delete cascade,
  dimension exposure_dim not null,
  tag text not null,
  weight numeric(9,6) not null default 1,
  source data_source_kind not null default 'MANUAL',
  confidence numeric(4,3),
  as_of date not null default current_date,
  unique (instrument_id, dimension, tag, as_of),
  constraint weight_range check (weight > 0 and weight <= 1),
  constraint confidence_range check (confidence is null or (confidence >= 0 and confidence <= 1))
);
create index exposures_lookup on instrument_exposures (user_id, dimension, instrument_id);

-- Fund look-through (phase 3). The underlying name is kept even when it cannot
-- be resolved to an instrument, so partial data is still usable.
create table fund_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  fund_instrument_id uuid not null references instruments on delete cascade,
  underlying_instrument_id uuid references instruments on delete set null,
  underlying_name text not null,
  weight numeric(9,6) not null,
  as_of date not null,
  source data_source_kind not null default 'MANUAL',
  unique (fund_instrument_id, underlying_name, as_of),
  constraint fund_weight_range check (weight > 0 and weight <= 1)
);
