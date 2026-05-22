-- Tiny in-DB job queue for embedding/enrichment work.
create table public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('embed','enrich')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','running','done','failed')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sync_jobs_pending_idx on public.sync_jobs(user_id, status, created_at);

alter table public.sync_jobs enable row level security;
create policy sj_select on public.sync_jobs for select using (auth.uid() = user_id);
create policy sj_insert on public.sync_jobs for insert with check (auth.uid() = user_id);
create policy sj_update on public.sync_jobs for update using (auth.uid() = user_id);
create policy sj_delete on public.sync_jobs for delete using (auth.uid() = user_id);
