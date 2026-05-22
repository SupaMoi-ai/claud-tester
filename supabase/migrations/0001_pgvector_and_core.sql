-- Enable pgvector for CLIP similarity search
create extension if not exists vector;
create extension if not exists pgcrypto;

-- Pins: every Pinterest pin a user has saved.
-- Enrichment columns are nullable; only populated when a pin joins a project.
create table public.pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pinterest_pin_id text not null,
  image_url text not null,
  source_url text,
  pinterest_description text,
  pinterest_board_name text,
  saved_at timestamptz,
  clip_embedding vector(512),

  -- enrichment fields (filled on project creation)
  intent_type text,
  primary_subject text,
  materials text[] default '{}',
  techniques text[] default '{}',
  dominant_colors text[] default '{}',
  mood text,
  era_or_style text,
  actionability text,
  saved_signal_strength int,
  enrichment_confidence real,
  enriched_at timestamptz,

  project_id uuid,
  position_x real,
  position_y real,
  created_at timestamptz not null default now(),

  unique (user_id, pinterest_pin_id)
);

create index pins_user_idx on public.pins(user_id);
create index pins_project_idx on public.pins(project_id);
-- ivfflat needs ANALYZE after data load to pick lists; we use a small default.
create index pins_embedding_idx on public.pins
  using ivfflat (clip_embedding vector_cosine_ops) with (lists = 50);

-- Projects: a focused cluster gathered around a seed pin.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seed_pin_id uuid not null references public.pins(id) on delete cascade,
  label text not null,
  explanation text,
  intent_type text,
  dominant_palette text[] default '{}',
  tiny_next_step text,
  energy text,
  confidence real,
  status text not null default 'active' check (status in ('active','parked','finished')),
  excluded_pin_ids uuid[] default '{}',
  position_x real,
  position_y real,
  last_touched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index projects_user_idx on public.projects(user_id);

alter table public.pins
  add constraint pins_project_fk
  foreign key (project_id) references public.projects(id) on delete set null;

-- RLS: scope every row to its owner.
alter table public.pins enable row level security;
alter table public.projects enable row level security;

create policy pins_select on public.pins for select using (auth.uid() = user_id);
create policy pins_insert on public.pins for insert with check (auth.uid() = user_id);
create policy pins_update on public.pins for update using (auth.uid() = user_id);
create policy pins_delete on public.pins for delete using (auth.uid() = user_id);

create policy projects_select on public.projects for select using (auth.uid() = user_id);
create policy projects_insert on public.projects for insert with check (auth.uid() = user_id);
create policy projects_update on public.projects for update using (auth.uid() = user_id);
create policy projects_delete on public.projects for delete using (auth.uid() = user_id);
