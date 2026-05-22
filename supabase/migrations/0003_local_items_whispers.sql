-- Voice notes, photos, freeform text the user captures themselves.
-- Created now, unused until v1.5.
create table public.local_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('voice','photo','text')),
  media_url text,
  transcript text,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now()
);

create index local_items_user_idx on public.local_items(user_id);

alter table public.local_items enable row level security;
create policy li_select on public.local_items for select using (auth.uid() = user_id);
create policy li_insert on public.local_items for insert with check (auth.uid() = user_id);
create policy li_update on public.local_items for update using (auth.uid() = user_id);
create policy li_delete on public.local_items for delete using (auth.uid() = user_id);

-- Whispers: a gentle suggestion surfaced at most one-at-a-time.
-- Created now, unused until Week 5.
create table public.whispers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('passive_pattern','project_followup')),
  suggested_text text not null,
  related_pin_ids uuid[] default '{}',
  suggested_at timestamptz not null default now(),
  resolved_at timestamptz,
  response text check (response in ('yes','later','not_this_one'))
);

create index whispers_user_idx on public.whispers(user_id);

alter table public.whispers enable row level security;
create policy w_select on public.whispers for select using (auth.uid() = user_id);
create policy w_insert on public.whispers for insert with check (auth.uid() = user_id);
create policy w_update on public.whispers for update using (auth.uid() = user_id);
create policy w_delete on public.whispers for delete using (auth.uid() = user_id);
