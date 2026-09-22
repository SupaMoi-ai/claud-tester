-- ===========================================================================
-- REDOUBT — Supabase schema for the networked backend.
--
-- redoubt.html ships local-first: everything lives in the browser's IndexedDB
-- behind a `Store` interface. This schema is the other implementation of that
-- same interface. Run it in the Supabase SQL editor, then in redoubt.html:
--
--   1. set  BACKEND = 'supabase'
--   2. fill SB_URL and SB_KEY (project URL + anon key)
--   3. add  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
--   4. implement SupabaseStore's methods against these tables
--
-- The UI calls nothing but Store, so no component changes are needed.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  handle      text not null unique check (char_length(handle) between 2 and 32),
  notice_ack  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sites. `origin` separates curated archive references from user finds so the
-- seed set can never inflate anyone's clearance.
-- ---------------------------------------------------------------------------
create table if not exists public.sites (
  id             uuid primary key default gen_random_uuid(),
  title          text not null check (char_length(title) between 1 and 160),
  category       text not null check (category in ('bunker','tunnel','fort','silo','shelter','mine')),
  era            text not null check (era in ('WWI','WWII','Cold War','Other')),
  country        text not null check (char_length(country) between 2 and 3),
  lat            double precision not null check (lat between -90 and 90),
  lng            double precision not null check (lng between -180 and 180),
  description    text not null default '',
  access         text not null default 'private'
                 check (access in ('public','permissive','private','restricted')),
  hazards        text[] not null default '{}',
  photos         uuid[] not null default '{}',
  verified       boolean not null default false,
  min_clearance  text check (min_clearance in ('VETERAN','ELITE')),
  origin         text not null default 'user' check (origin in ('seed','user')),
  discovered_by  uuid references public.profiles(id) on delete set null,
  discovered_at  timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists sites_bbox_idx     on public.sites (lat, lng);
create index if not exists sites_category_idx on public.sites (category);
create index if not exists sites_era_idx      on public.sites (era);
create index if not exists sites_origin_idx   on public.sites (origin);

-- ---------------------------------------------------------------------------
-- Visits and comments.
-- ---------------------------------------------------------------------------
create table if not exists public.visits (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  visited_at  timestamptz not null default now(),
  note        text not null default '',
  photos      uuid[] not null default '{}'
);
create index if not exists visits_site_idx on public.visits (site_id);
create index if not exists visits_user_idx on public.visits (user_id, visited_at);

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now()
);
create index if not exists comments_site_idx on public.comments (site_id, created_at);

-- ---------------------------------------------------------------------------
-- Follows. The local build has these as no-ops on the Store interface; this is
-- what makes the explorer feed work once there is more than one account.
-- ---------------------------------------------------------------------------
create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  followee_id  uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

-- ---------------------------------------------------------------------------
-- Clearance, computed server-side. Deriving it in the browser is fine while the
-- data is local, but once it gates what the API returns it has to be decided
-- where the client cannot reach it.
-- ---------------------------------------------------------------------------
create or replace function public.clearance_of(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select
      (select count(*) from visits v where v.user_id = uid)                              as visits,
      (select count(*) from sites  x where x.discovered_by = uid and x.origin = 'user')  as own_sites,
      (select coalesce(sum(cardinality(x.photos)), 0)
         from sites x where x.discovered_by = uid and x.origin = 'user')                 as photos
  )
  select case
    when s.visits >= 10 and s.own_sites >= 3 then 'ELITE'
    when s.visits >= 3  and s.photos    >= 2 then 'VETERAN'
    else 'FIELD'
  end
  from s;
$$;

create or replace function public.clearance_rank(c text)
returns int language sql immutable as $$
  select case c when 'ELITE' then 2 when 'VETERAN' then 1 else 0 end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.sites    enable row level security;
alter table public.visits   enable row level security;
alter table public.comments enable row level security;
alter table public.follows  enable row level security;

-- Profiles: world-readable (handles appear as credits), self-writable.
create policy profiles_read   on public.profiles for select using (true);
create policy profiles_insert on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update on public.profiles for update using (auth.uid() = id);

-- Sites: readable only at or above the row's required clearance. A withheld row
-- is filtered out here; the redacted placeholder the UI shows is built from the
-- separate `sites_index` view below, which exposes no coordinates.
create policy sites_read on public.sites for select using (
  min_clearance is null
  or clearance_rank(clearance_of(auth.uid())) >= clearance_rank(min_clearance)
);
create policy sites_insert on public.sites for insert with check (
  auth.uid() = discovered_by and origin = 'user'
);
create policy sites_update on public.sites for update using (
  auth.uid() = discovered_by and origin = 'user'
) with check (
  -- you cannot verify your own find, nor reclassify it into the deep archive
  verified = false and min_clearance is null
);
create policy sites_delete on public.sites for delete using (
  auth.uid() = discovered_by and origin = 'user'
);

-- What a user below the required clearance is allowed to know exists: category,
-- era and the bar to clear. No title, no coordinates.
create or replace view public.sites_index
with (security_invoker = off) as
  select id, category, era, min_clearance
  from public.sites
  where min_clearance is not null;

grant select on public.sites_index to authenticated;

-- Visits: your own only. Other people's movements are not public.
create policy visits_read   on public.visits for select using (auth.uid() = user_id);
create policy visits_insert on public.visits for insert with check (auth.uid() = user_id);
create policy visits_delete on public.visits for delete using (auth.uid() = user_id);

-- Comments: readable on any site you can read; writable as yourself.
create policy comments_read   on public.comments for select using (
  exists (select 1 from public.sites s where s.id = site_id)
);
create policy comments_insert on public.comments for insert with check (auth.uid() = user_id);
create policy comments_delete on public.comments for delete using (auth.uid() = user_id);

-- Follows.
create policy follows_read   on public.follows for select using (true);
create policy follows_insert on public.follows for insert with check (auth.uid() = follower_id);
create policy follows_delete on public.follows for delete using (auth.uid() = follower_id);

-- ---------------------------------------------------------------------------
-- Photo storage.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('site-photos', 'site-photos', true)
on conflict (id) do nothing;

create policy site_photos_read on storage.objects for select
  using (bucket_id = 'site-photos');

-- Uploads land under <uid>/<file>, so a user can only write their own prefix.
create policy site_photos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'site-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy site_photos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'site-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Keep updated_at honest.
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists sites_touch on public.sites;
create trigger sites_touch before update on public.sites
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Seeding. Load the curated archive references from the SEED array in
-- redoubt.html with origin='seed' and discovered_by=null. They are excluded
-- from clearance maths by the origin filter in clearance_of(), so importing
-- them cannot promote anyone.
-- ---------------------------------------------------------------------------
