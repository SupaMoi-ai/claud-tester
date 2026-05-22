-- One linked Pinterest account per Supabase user.
create table public.pinterest_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pinterest_user_id text not null,
  -- tokens stored as plain text for now; rotate to pgsodium when keys arrive.
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  last_pin_sync_at timestamptz,
  last_passive_scan_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.pinterest_connections enable row level security;

create policy pc_select on public.pinterest_connections
  for select using (auth.uid() = user_id);
create policy pc_insert on public.pinterest_connections
  for insert with check (auth.uid() = user_id);
create policy pc_update on public.pinterest_connections
  for update using (auth.uid() = user_id);
create policy pc_delete on public.pinterest_connections
  for delete using (auth.uid() = user_id);
