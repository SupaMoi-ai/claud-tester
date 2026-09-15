-- 0005_imports_ai: import staging and AI conversation/usage tracking.
--
-- The staging tables are the contract that keeps AI-extracted financial data
-- out of the ledger. There is no code path from extraction to `transactions`
-- that skips `import_candidates`.

create type import_source  as enum ('SCREENSHOT', 'CSV', 'API', 'MANUAL');
create type import_status  as enum ('EXTRACTING', 'REVIEW', 'COMMITTED', 'ABANDONED', 'FAILED');
create type candidate_status as enum ('PENDING', 'CONFIRMED', 'EDITED', 'IGNORED', 'DUPLICATE');

create table import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  account_id uuid references accounts on delete set null,
  source import_source not null,
  status import_status not null default 'EXTRACTING',
  -- Private Supabase Storage object. The server reads the bytes; the image is
  -- never exposed through a public URL.
  storage_path text,
  model text,
  prompt_version text,
  raw_extraction jsonb,
  input_tokens int,
  output_tokens int,
  cost_usd numeric(10,6),
  error text,
  created_at timestamptz not null default now(),
  committed_at timestamptz
);
create index import_batches_recent on import_batches (user_id, created_at desc);

create table import_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  batch_id uuid not null references import_batches on delete cascade,
  row_index int not null,
  candidate_type text not null,
  -- Verbatim model output for this row, kept so a bad extraction is auditable.
  extracted jsonb not null,
  -- Parsed by parseNbNumber() in code, never by the model.
  normalized jsonb,
  matched_instrument_id uuid references instruments on delete set null,
  -- Derived from which rung of the match ladder hit (ISIN > ticker+MIC >
  -- ticker > name similarity), not from the model's self-report.
  match_confidence numeric(4,3),
  field_confidence jsonb,
  -- quantity x price ~= stated market value, within 1%. A row that fails this
  -- goes to manual review regardless of what the model claimed.
  reconciliation_ok boolean,
  status candidate_status not null default 'PENDING',
  resulting_transaction_id uuid references transactions on delete set null,
  error text,
  unique (batch_id, row_index),
  constraint candidate_type_valid check (candidate_type in ('POSITION', 'TRANSACTION')),
  constraint match_confidence_range check (
    match_confidence is null or (match_confidence >= 0 and match_confidence <= 1)
  )
);
create index candidates_pending on import_candidates (user_id, batch_id, row_index)
  where status = 'PENDING';

create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  archived boolean not null default false
);

create table ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  conversation_id uuid not null references ai_conversations on delete cascade,
  role text not null,
  -- Full content-block array, verbatim, including tool calls and results, so
  -- any answer can be traced back to the data it actually saw.
  content jsonb not null,
  model text,
  stop_reason text,
  input_tokens int,
  output_tokens int,
  cache_read_tokens int,
  cache_creation_tokens int,
  cost_usd numeric(10,6),
  latency_ms int,
  -- Hash of the PortfolioContext this turn was given.
  context_fingerprint text,
  created_at timestamptz not null default now(),
  constraint role_valid check (role in ('user', 'assistant', 'system'))
);
create index ai_msg_thread on ai_messages (conversation_id, created_at);

create table ai_usage_daily (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  requests int not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cost_usd numeric(12,6) not null default 0,
  primary key (user_id, day)
);

alter table transactions
  add constraint transactions_import_batch_fk
  foreign key (import_batch_id) references import_batches (id) on delete set null;
