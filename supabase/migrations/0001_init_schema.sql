-- Hjemmet core schema.
-- Table order follows FK dependencies: families -> members -> custody -> captures -> events/bag/money/chores -> completions/claims.

create extension if not exists "pgcrypto";

create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families not null,
  user_id uuid references auth.users,        -- null for kids without accounts
  display_name text not null,
  role text not null check (role in ('parent','child')),
  home text check (home in ('mamma','pappa')), -- which home a PARENT is; null for kids
  color text,                                  -- avatar tile color
  pin text                                     -- optional 4-digit pin for kid mode
);

-- custody schedule (delt bosted core)
create table custody_patterns (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families not null,
  -- repeating pattern: array of home entries ('mamma'|'pappa'), covering an N-day cycle
  pattern text[] not null,
  anchor_date date not null,                  -- date pattern[0] applies to
  handover_time time not null default '16:00'
);

create table custody_overrides (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families not null,
  date date not null,
  home text not null check (home in ('mamma','pappa')),
  note text
);

-- captures (the AI inbox)
create table captures (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families not null,
  created_by uuid references members not null,
  source text check (source in ('spond','vigilo','mykid','kidplan','skole','vipps','annet')),
  raw_text text,
  image_path text,                            -- Supabase storage path
  status text not null default 'pending' check (status in ('pending','analyzed','confirmed','dismissed')),
  ai_result jsonb,                            -- structured output from Claude
  created_at timestamptz default now()
);

-- resolved actions
create table events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families not null,
  capture_id uuid references captures,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  member_ids uuid[],                          -- which kids/parents it concerns
  home text check (home in ('mamma','pappa','begge')),
  source text,
  reminder_minutes int default 60
);

create table bag_items (                       -- reisesekken
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families not null,
  capture_id uuid references captures,
  event_id uuid references events,
  name text not null,
  for_member uuid references members,
  travels_to text check (travels_to in ('mamma','pappa')),
  due_date date,
  packed boolean default false,
  recurring boolean default false             -- e.g. charger, gym clothes
);

create table money_items (                     -- Vipps deadlines & splits
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families not null,
  capture_id uuid references captures,
  title text not null,
  amount_nok int not null,
  vipps_number text,
  due_date date,
  split text not null default '50/50' check (split in ('50/50','mamma','pappa')),
  paid_mamma boolean default false,
  paid_pappa boolean default false
);

create table chores (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families not null,
  member_id uuid references members not null,  -- the kid
  title text not null,
  hint text,
  points int default 5,
  home text check (home in ('mamma','pappa','begge')) default 'begge',
  recurring_days int[],                        -- 0-6, ISO weekday
  active boolean default true
);

create table chore_completions (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid references chores not null,
  member_id uuid references members not null,
  date date not null,
  completed_at timestamptz default now(),
  unique (chore_id, date)
);

create table reward_claims (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members not null,
  date date not null,
  choice text check (choice in ('screen','play')),
  claimed_at timestamptz default now(),
  unique (member_id, date)
);

create index events_family_starts_idx on events (family_id, starts_at);
create index bag_items_family_due_idx on bag_items (family_id, due_date);
create index money_items_family_due_idx on money_items (family_id, due_date);
create index chore_completions_member_date_idx on chore_completions (member_id, date);
create index captures_family_status_idx on captures (family_id, status);
