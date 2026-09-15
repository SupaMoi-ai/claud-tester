-- 0004_research: theses, journal, watchlist, insights.
--
-- The thesis tables are what make "has my investment case changed?" answerable
-- rather than rhetorical. Prose alone cannot be checked; `thesis_conditions`
-- gives code something to evaluate.

create type thesis_status    as enum ('DRAFT', 'ACTIVE', 'INVALIDATED', 'CLOSED');
create type condition_kind   as enum ('PRICE_LEVEL', 'METRIC', 'DATE', 'DRAWDOWN', 'WEIGHT', 'MANUAL');
create type condition_status as enum ('HOLDING', 'BREACHED', 'UNKNOWN');
create type journal_kind as enum (
  'BOUGHT', 'ADDED', 'REDUCED', 'SOLD',
  -- Recording what you decided *not* to do is half the value of a journal.
  'DECIDED_NOT_TO_BUY',
  'THESIS_REVIEW', 'NOTE'
);

create table theses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  instrument_id uuid references instruments on delete cascade,
  title text not null,
  status thesis_status not null default 'ACTIVE',
  current_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index theses_by_instrument on theses (user_id, instrument_id);

-- Versioned, so "this is what you believed then" is recoverable verbatim.
create table thesis_versions (
  thesis_id uuid not null references theses on delete cascade,
  version int not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  why_i_own_it text not null,
  what_i_expect text,
  main_risks text,
  horizon_months int,
  what_would_change_my_mind text,
  conviction smallint,
  target_price numeric(28,12),
  target_currency char(3),
  change_reason text,
  created_at timestamptz not null default now(),
  superseded_at timestamptz,
  primary key (thesis_id, version),
  constraint conviction_range check (conviction is null or conviction between 1 and 5),
  constraint horizon_positive check (horizon_months is null or horizon_months > 0)
);

-- Machine-evaluable invalidation conditions. A falling price is not by itself
-- a broken thesis; this is how the app can tell the difference.
create table thesis_conditions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  thesis_id uuid not null references theses on delete cascade,
  version int not null,
  kind condition_kind not null,
  subject text not null,
  operator text not null,
  threshold numeric(28,10),
  unit text,
  deadline date,
  note text,
  evaluation text not null default 'AUTO',
  status condition_status not null default 'UNKNOWN',
  last_evaluated_at timestamptz,
  last_observed numeric(28,10),
  constraint operator_valid check (operator in ('<', '<=', '>', '>=', '=', '!=')),
  constraint evaluation_valid check (evaluation in ('AUTO', 'MANUAL'))
);
create index conditions_by_thesis on thesis_conditions (user_id, thesis_id, version);

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  occurred_at timestamptz not null default now(),
  kind journal_kind not null default 'NOTE',
  title text,
  body_md text not null,
  what_i_expected text,
  instrument_id uuid references instruments on delete set null,
  transaction_id uuid references transactions on delete set null,
  conviction smallint,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint journal_conviction_range check (conviction is null or conviction between 1 and 5)
);
create index journal_recent on journal_entries (user_id, occurred_at desc);
create index journal_by_instrument on journal_entries (user_id, instrument_id, occurred_at desc);

create table watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  instrument_id uuid not null references instruments on delete cascade,
  added_at timestamptz not null default now(),
  target_buy_price numeric(28,12),
  target_currency char(3),
  what_would_make_me_buy text,
  thesis_id uuid references theses on delete set null,
  note text,
  unique (user_id, instrument_id)
);

-- Findings are produced by deterministic detectors. `facts` holds the computed
-- payload and is the ONLY place numbers may come from; `explanation_md` is
-- LLM-written prose validated against `facts` before it is stored.
create table insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  detector_key text not null,
  severity smallint not null,
  status text not null default 'NEW',
  subject_type text,
  subject_id uuid,
  facts jsonb not null,
  explanation_md text,
  model text,
  prompt_version text,
  -- detector + subject + period bucket, so the same finding is not re-raised
  -- every time the page loads.
  fingerprint text not null,
  generated_at timestamptz not null default now(),
  expires_at timestamptz,
  dismissed_at timestamptz,
  unique (user_id, fingerprint),
  constraint severity_range check (severity between 1 and 5),
  constraint insight_status_valid check (status in ('NEW', 'SEEN', 'ACTED', 'DISMISSED', 'EXPIRED'))
);
create index insights_open on insights (user_id, severity desc, generated_at desc)
  where status in ('NEW', 'SEEN');
