-- ============================================================================
-- TRACK 5 — database schema
--
-- Run this once in the Supabase SQL editor, then enable anonymous sign-ins
-- under Authentication -> Providers -> Anonymous sign-ins.
--
-- SECURITY MODEL — read this before changing anything.
--
-- Track 5 is a static site. The anon key is published in js/data/config.js and
-- anyone can read it, extract it, and call this database directly with a
-- handwritten script. Row-level security is therefore not a convenience layer;
-- it is the ONLY boundary that exists.
--
-- The rule this schema follows: a client may READ public things and WRITE only
-- its own preferences. Everything that grants XP, decides a signal's
-- confidence, or enforces the anti-flood limit happens inside a
-- SECURITY DEFINER function. Those tables have no INSERT or UPDATE policy at
-- all, so a direct write fails no matter how the request is constructed.
--
-- Consequences worth stating plainly:
--   * XP cannot be forged, because no client can write xp_events or profiles.xp
--   * the two-report limit cannot be bypassed, because it is counted in SQL
--   * a user cannot confirm their own report, because the function refuses
--   * a user cannot vote twice, because of a unique constraint
--
-- What this schema CANNOT do is verify where someone physically is. GPS is
-- self-reported and a determined client will lie about it. Proximity therefore
-- only ever reduces a vote's weight here, never increases it, and the full-
-- weight path is based on saved journeys, which the server can actually see.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tuning. These mirror js/domain/xp.js and js/domain/signals.js exactly.
-- If you change one, change the other, or the interface will disagree with the
-- database about what just happened.
-- ---------------------------------------------------------------------------

-- gen_random_bytes(), used for crew invite codes.
create extension if not exists pgcrypto;

create schema if not exists track5;

create or replace function track5.const(key text)
returns numeric language sql immutable as $$
  select case key
    when 'THRESHOLD_CONFIRMED'        then 2
    when 'THRESHOLD_HIGH_CONFIDENCE'  then 4
    when 'THRESHOLD_DISMISSED'        then -2
    when 'TTL_STATION_MIN'            then 40
    when 'TTL_TRAIN_MIN'              then 25
    when 'TTL_PER_CONFIRM_MIN'        then 8
    when 'TTL_MAX_BONUS_MIN'          then 40
    when 'MAX_UNCONFIRMED'            then 2
    when 'REPORT_COOLDOWN_SEC'        then 90
    when 'XP_REPORT_SUBMITTED'        then 2
    when 'XP_REPORT_CONFIRMED'        then 15
    when 'XP_REPORT_HIGH_CONFIDENCE'  then 15
    when 'XP_REPORT_DISMISSED'        then -10
    when 'XP_VOTE_CAST'               then 3
    when 'XP_VOTE_ACCURATE'           then 5
    when 'XP_DAILY_FIRST_ACTION'      then 5
    when 'CHAT_RATE_PER_MIN'          then 5
    when 'CHAT_MAX_LEN'               then 300
  end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Profiles. Handle and avatar belong to the user; XP belongs to the server.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  handle      text unique,
  xp          integer not null default 0,
  avatar      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  constraint handle_shape check (
    handle is null or (char_length(handle) between 2 and 20
                       and handle ~ '^[A-Za-z0-9_\-]+$')
  )
);

-- Inspection reports.
create table if not exists public.reports (
  id             uuid primary key default gen_random_uuid(),
  reporter       uuid not null references auth.users(id) on delete cascade,
  station_idx    smallint not null check (station_idx between 1 and 19),
  direction      text check (direction in ('north','south')),
  context        text not null default 'station' check (context in ('station','train')),
  created_at     timestamptz not null default now(),
  confirm_count  integer not null default 0,
  reject_count   integer not null default 0,
  weighted_score numeric(6,2) not null default 0
);

create index if not exists reports_created_idx on public.reports (created_at desc);
create index if not exists reports_station_idx on public.reports (station_idx);
create index if not exists reports_reporter_idx on public.reports (reporter);

-- One vote per person per report. The unique constraint is the real defence
-- against ballot stuffing; the interface hiding the button is only a courtesy.
create table if not exists public.confirmations (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.reports(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  vote        smallint not null check (vote in (-1, 1)),
  weight      numeric(4,2) not null default 1,
  created_at  timestamptz not null default now(),
  unique (report_id, user_id)
);

create index if not exists confirmations_report_idx on public.confirmations (report_id);

-- Append-only XP ledger. profiles.xp is derived from this by trigger, so the
-- balance and its explanation can never disagree.
create table if not exists public.xp_events (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null,
  amount      integer not null,
  ref_id      uuid,
  created_at  timestamptz not null default now()
);

create index if not exists xp_events_user_idx on public.xp_events (user_id, created_at desc);

-- Public route chat.
create table if not exists public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  handle_snapshot text,
  body            text not null,
  hidden          boolean not null default false,
  created_at      timestamptz not null default now(),
  constraint body_len check (char_length(body) between 1 and 300)
);

create index if not exists chat_created_idx on public.chat_messages (created_at desc);

-- Crews.
create table if not exists public.crews (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 24),
  code        text not null unique,
  owner       uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.crew_members (
  crew_id   uuid not null references public.crews(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

create table if not exists public.crew_messages (
  id         uuid primary key default gen_random_uuid(),
  crew_id    uuid not null references public.crews(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists crew_messages_idx on public.crew_messages (crew_id, created_at desc);

-- Cosmetics. Catalogue is public; ownership is private; purchase is a function.
create table if not exists public.cosmetics (
  id       text primary key,
  name     text not null,
  slot     text not null,
  cost_xp  integer not null default 0,
  rarity   text not null default 'common'
);

create table if not exists public.user_cosmetics (
  user_id     uuid not null references auth.users(id) on delete cascade,
  cosmetic_id text not null references public.cosmetics(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (user_id, cosmetic_id)
);

-- Saved journeys and notification preferences — ordinary private user data.
create table if not exists public.journeys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  label        text not null default 'Journey',
  from_idx     smallint not null check (from_idx between 1 and 19),
  to_idx       smallint not null check (to_idx between 1 and 19),
  days         smallint[] not null default '{0,1,2,3,4}',
  window_start time not null default '07:00',
  window_end   time not null default '09:00',
  created_at   timestamptz not null default now()
);

create index if not exists journeys_user_idx on public.journeys (user_id);

create table if not exists public.notification_prefs (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  departures  boolean not null default true,
  delays      boolean not null default true,
  disruptions boolean not null default true,
  signals     boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Derived state
--
-- Expiry and confidence are COMPUTED, never stored as a status column that a
-- background job has to keep fresh. A signal that has run out of time is
-- expired the instant it runs out, with no cron and nothing to fall behind.
-- ---------------------------------------------------------------------------

create or replace function public.report_expires_at(
  p_created timestamptz, p_context text, p_confirms integer, p_rejects integer
) returns timestamptz language sql immutable as $$
  select p_created
       + make_interval(mins =>
           (case when p_context = 'train'
                 then track5.const('TTL_TRAIN_MIN')
                 else track5.const('TTL_STATION_MIN') end
            + least(
                greatest(p_confirms - p_rejects, 0) * track5.const('TTL_PER_CONFIRM_MIN'),
                track5.const('TTL_MAX_BONUS_MIN')
              ))::integer);
$$;

create or replace function public.report_status(
  p_score numeric, p_expires timestamptz
) returns text language sql stable as $$
  select case
    when p_score <= track5.const('THRESHOLD_DISMISSED')       then 'DISMISSED'
    when now() >= p_expires                                    then 'EXPIRED'
    when p_score >= track5.const('THRESHOLD_HIGH_CONFIDENCE')  then 'HIGH_CONFIDENCE'
    when p_score >= track5.const('THRESHOLD_CONFIRMED')        then 'CONFIRMED'
    else 'UNCONFIRMED'
  end;
$$;

create or replace view public.signals_with_status as
  select r.*,
         public.report_expires_at(r.created_at, r.context, r.confirm_count, r.reject_count)
           as expires_at,
         public.report_status(
           r.weighted_score,
           public.report_expires_at(r.created_at, r.context, r.confirm_count, r.reject_count)
         ) as status
  from public.reports r;

-- What the map reads. Dead intel is simply absent.
create or replace view public.active_signals as
  select * from public.signals_with_status
  where status in ('UNCONFIRMED','CONFIRMED','HIGH_CONFIDENCE');

-- ---------------------------------------------------------------------------
-- XP ledger -> balance
-- ---------------------------------------------------------------------------

create or replace function public.sync_profile_xp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Open the gate for exactly one statement. guard_profile_xp() below rejects
  -- any change to profiles.xp that does not come through here, so without this
  -- the ledger cannot pay anyone — which would silently break every RPC that
  -- awards XP, reporting included.
  perform set_config('track5.ledger', 'on', true);

  update public.profiles
     set xp = greatest(0, xp + new.amount)
   where id = new.user_id;

  -- Close it again immediately. Leaving it open for the rest of the
  -- transaction would let a client chain its own UPDATE after an RPC call.
  perform set_config('track5.ledger', 'off', true);

  return new;
end;
$$;

drop trigger if exists xp_events_sync on public.xp_events;
create trigger xp_events_sync
  after insert on public.xp_events
  for each row execute function public.sync_profile_xp();

-- A profile is created the moment an anonymous user signs in, so the client
-- never has to insert one and therefore never needs write access to the table.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.notification_prefs (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Belt and braces: even though no policy lets a client update xp, reject any
-- attempt to change it outside the ledger.
create or replace function public.guard_profile_xp()
returns trigger language plpgsql as $$
begin
  if new.xp is distinct from old.xp
     and current_setting('track5.ledger', true) is distinct from 'on' then
    raise exception 'XP IS AWARDED BY THE SYSTEM, NOT SET DIRECTLY';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Vote weighting
--
-- Rank buys influence, capped so no single account can force a state on its
-- own. Proximity can only ever REDUCE weight: the server cannot verify GPS, so
-- a client claiming to be somewhere is not evidence. The full-weight path is a
-- saved journey covering the station, which the server can actually see.
-- ---------------------------------------------------------------------------

create or replace function public.rank_bonus(p_xp integer)
returns numeric language sql immutable as $$
  select case
    when p_xp >= 6000 then 1.0
    when p_xp >= 3000 then 0.7
    when p_xp >= 1500 then 0.5
    when p_xp >= 750  then 0.3
    when p_xp >= 300  then 0.2
    when p_xp >= 100  then 0.1
    else 0.0
  end;
$$;

create or replace function public.vote_weight_for(p_user uuid, p_station smallint)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare
  v_xp integer;
  v_on_route boolean;
begin
  select xp into v_xp from public.profiles where id = p_user;

  select exists (
    select 1 from public.journeys j
     where j.user_id = p_user
       and p_station between least(j.from_idx, j.to_idx) and greatest(j.from_idx, j.to_idx)
  ) into v_on_route;

  -- Proximity is an UPLIFT, never a penalty.
  --
  -- An earlier version discounted anyone without a saved journey to 0.6, which
  -- meant four separate strangers were needed to confirm a single report — an
  -- impossible bar on a network that is just starting, and out of step with the
  -- client, which treats an ordinary vote as weight 1. Two ordinary people
  -- agreeing is the intended threshold, so an ordinary vote must be worth 1.
  --
  -- Being demonstrably on the route is worth a little more, because the server
  -- can actually verify it from saved journeys.
  return (1 + coalesce(public.rank_bonus(coalesce(v_xp, 0)), 0))
         * (case when v_on_route then 1.25 else 1.0 end);
end;
$$;

-- ---------------------------------------------------------------------------
-- rpc_create_report — the only way a report is ever created
-- ---------------------------------------------------------------------------

create or replace function public.rpc_create_report(
  p_station_idx smallint,
  p_direction   text,
  p_context     text default 'station'
) returns public.reports
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_open integer;
  v_last timestamptz;
  v_row  public.reports;
begin
  if v_user is null then
    raise exception 'NOT SIGNED IN';
  end if;

  if p_station_idx is null or p_station_idx < 1 or p_station_idx > 19 then
    raise exception 'UNKNOWN STATION';
  end if;

  -- Anti-flood, counted in SQL rather than trusted from the client.
  select count(*) into v_open
    from public.signals_with_status s
   where s.reporter = v_user and s.status = 'UNCONFIRMED';

  if v_open >= track5.const('MAX_UNCONFIRMED') then
    raise exception 'BOTH SIGNAL SLOTS IN USE — WAIT FOR CONFIRMATION OR EXPIRY';
  end if;

  select max(created_at) into v_last from public.reports where reporter = v_user;
  if v_last is not null
     and now() - v_last < make_interval(secs => track5.const('REPORT_COOLDOWN_SEC')::integer) then
    raise exception 'COOLDOWN — WAIT A MOMENT BEFORE REPORTING AGAIN';
  end if;

  insert into public.reports (reporter, station_idx, direction, context)
  values (v_user, p_station_idx, p_direction, coalesce(p_context, 'station'))
  returning * into v_row;

  insert into public.xp_events (user_id, kind, amount, ref_id)
  values (v_user, 'REPORT_SUBMITTED', track5.const('XP_REPORT_SUBMITTED')::integer, v_row.id);

  perform public.award_daily_bonus(v_user);

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- rpc_vote_report — the only way a vote is ever cast
-- ---------------------------------------------------------------------------

create or replace function public.rpc_vote_report(
  p_report uuid,
  p_vote   smallint
) returns public.signals_with_status
language plpgsql security definer set search_path = public as $$
declare
  v_user     uuid := auth.uid();
  v_report   public.reports;
  v_weight   numeric;
  v_before   text;
  v_after    text;
  v_result   public.signals_with_status;
begin
  if v_user is null then raise exception 'NOT SIGNED IN'; end if;
  if p_vote not in (-1, 1) then raise exception 'INVALID VOTE'; end if;

  select * into v_report from public.reports where id = p_report for update;
  if not found then raise exception 'SIGNAL NOT FOUND'; end if;

  -- Voting for yourself would make the confidence score meaningless.
  if v_report.reporter = v_user then
    raise exception 'CANNOT CONFIRM YOUR OWN SIGNAL';
  end if;

  select status into v_before from public.signals_with_status where id = p_report;
  if v_before in ('EXPIRED','DISMISSED') then
    raise exception 'SIGNAL IS NO LONGER ACTIVE';
  end if;

  v_weight := public.vote_weight_for(v_user, v_report.station_idx);

  begin
    insert into public.confirmations (report_id, user_id, vote, weight)
    values (p_report, v_user, p_vote, v_weight);
  exception when unique_violation then
    raise exception 'ALREADY ANSWERED';
  end;

  update public.reports
     set confirm_count  = confirm_count + (case when p_vote > 0 then 1 else 0 end),
         reject_count   = reject_count  + (case when p_vote < 0 then 1 else 0 end),
         weighted_score = weighted_score + (p_vote * v_weight)
   where id = p_report;

  select status into v_after from public.signals_with_status where id = p_report;

  -- The voter is paid for participating.
  insert into public.xp_events (user_id, kind, amount, ref_id)
  values (v_user, 'VOTE_CAST', track5.const('XP_VOTE_CAST')::integer, p_report);

  -- The reporter is paid for being right, once per threshold crossed.
  if v_after is distinct from v_before then
    if v_before = 'UNCONFIRMED' and v_after in ('CONFIRMED','HIGH_CONFIDENCE') then
      insert into public.xp_events (user_id, kind, amount, ref_id)
      values (v_report.reporter, 'REPORT_CONFIRMED',
              track5.const('XP_REPORT_CONFIRMED')::integer, p_report);
    end if;
    if v_before <> 'HIGH_CONFIDENCE' and v_after = 'HIGH_CONFIDENCE' then
      insert into public.xp_events (user_id, kind, amount, ref_id)
      values (v_report.reporter, 'REPORT_HIGH_CONFIDENCE',
              track5.const('XP_REPORT_HIGH_CONFIDENCE')::integer, p_report);
    end if;
    if v_after = 'DISMISSED' then
      insert into public.xp_events (user_id, kind, amount, ref_id)
      values (v_report.reporter, 'REPORT_DISMISSED',
              track5.const('XP_REPORT_DISMISSED')::integer, p_report);
      -- Everyone who correctly called it out is paid for the accurate judgement.
      insert into public.xp_events (user_id, kind, amount, ref_id)
      select c.user_id, 'VOTE_ACCURATE', track5.const('XP_VOTE_ACCURATE')::integer, p_report
        from public.confirmations c
       where c.report_id = p_report and c.vote = -1;
    end if;
  end if;

  perform public.award_daily_bonus(v_user);

  select * into v_result from public.signals_with_status where id = p_report;
  return v_result;
end;
$$;

-- One small bonus per day for turning up, awarded at most once.
create or replace function public.award_daily_bonus(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.xp_events
     where user_id = p_user
       and kind = 'DAILY_FIRST_ACTION'
       and created_at >= date_trunc('day', now())
  ) then
    insert into public.xp_events (user_id, kind, amount)
    values (p_user, 'DAILY_FIRST_ACTION', track5.const('XP_DAILY_FIRST_ACTION')::integer);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Chat, crews, cosmetics
-- ---------------------------------------------------------------------------

create or replace function public.rpc_send_chat(p_body text)
returns public.chat_messages
language plpgsql security definer set search_path = public as $$
declare
  v_user  uuid := auth.uid();
  v_count integer;
  v_row   public.chat_messages;
begin
  if v_user is null then raise exception 'NOT SIGNED IN'; end if;
  if p_body is null or btrim(p_body) = '' then raise exception 'EMPTY MESSAGE'; end if;
  if char_length(p_body) > track5.const('CHAT_MAX_LEN') then
    raise exception 'MESSAGE TOO LONG';
  end if;

  -- Rate limit lives here, not in the client, because the client is optional.
  select count(*) into v_count from public.chat_messages
   where user_id = v_user and created_at > now() - interval '1 minute';
  if v_count >= track5.const('CHAT_RATE_PER_MIN') then
    raise exception 'SLOW DOWN';
  end if;

  insert into public.chat_messages (user_id, handle_snapshot, body)
  values (v_user, (select handle from public.profiles where id = v_user), btrim(p_body))
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.rpc_create_crew(p_name text)
returns public.crews
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_code text;
  v_row  public.crews;
begin
  if v_user is null then raise exception 'NOT SIGNED IN'; end if;
  -- Ambiguous characters left out so a code can be read aloud on a platform.
  v_code := upper(substr(translate(encode(gen_random_bytes(8), 'base64'),
                                   '+/=OI01l', 'ABCDEFGH'), 1, 6));
  insert into public.crews (name, code, owner) values (btrim(p_name), v_code, v_user)
  returning * into v_row;
  insert into public.crew_members (crew_id, user_id, role) values (v_row.id, v_user, 'owner');
  return v_row;
end;
$$;

create or replace function public.rpc_join_crew(p_code text)
returns public.crews
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_row  public.crews;
begin
  if v_user is null then raise exception 'NOT SIGNED IN'; end if;
  select * into v_row from public.crews where code = upper(btrim(p_code));
  if not found then raise exception 'NO CREW WITH THAT CODE'; end if;
  insert into public.crew_members (crew_id, user_id) values (v_row.id, v_user)
    on conflict do nothing;
  return v_row;
end;
$$;

create or replace function public.rpc_send_crew_message(p_crew uuid, p_body text)
returns public.crew_messages
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_row  public.crew_messages;
begin
  if v_user is null then raise exception 'NOT SIGNED IN'; end if;
  if not exists (select 1 from public.crew_members
                  where crew_id = p_crew and user_id = v_user) then
    raise exception 'NOT A MEMBER OF THAT CREW';
  end if;
  insert into public.crew_messages (crew_id, user_id, body)
  values (p_crew, v_user, btrim(p_body)) returning * into v_row;
  return v_row;
end;
$$;

-- Cosmetics are bought with XP the server can see, so a client cannot grant
-- itself an item by editing a request.
create or replace function public.rpc_buy_cosmetic(p_id text)
returns public.user_cosmetics
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_cost integer;
  v_xp   integer;
  v_row  public.user_cosmetics;
begin
  if v_user is null then raise exception 'NOT SIGNED IN'; end if;
  select cost_xp into v_cost from public.cosmetics where id = p_id;
  if not found then raise exception 'NO SUCH ITEM'; end if;
  select xp into v_xp from public.profiles where id = v_user;
  if v_xp < v_cost then raise exception 'NOT ENOUGH XP'; end if;

  insert into public.user_cosmetics (user_id, cosmetic_id) values (v_user, p_id)
    on conflict do nothing returning * into v_row;

  -- Cosmetics are unlocks, not purchases: spending XP would demote a user's
  -- rank for buying a hat, and rank is meant to represent reputation.
  if v_row is null then
    select * into v_row from public.user_cosmetics
     where user_id = v_user and cosmetic_id = p_id;
  end if;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
--
-- Note what is missing below: reports, confirmations and xp_events have NO
-- insert or update policy. That is deliberate and is the whole design. With
-- RLS enabled and no policy, every direct write is denied, leaving the
-- SECURITY DEFINER functions above as the only route in.
-- ---------------------------------------------------------------------------

alter table public.profiles          enable row level security;
alter table public.reports           enable row level security;
alter table public.confirmations     enable row level security;
alter table public.xp_events         enable row level security;
alter table public.chat_messages     enable row level security;
alter table public.crews             enable row level security;
alter table public.crew_members      enable row level security;
alter table public.crew_messages     enable row level security;
alter table public.cosmetics         enable row level security;
alter table public.user_cosmetics    enable row level security;
alter table public.journeys          enable row level security;
alter table public.notification_prefs enable row level security;

-- Profiles: handles and ranks are public; only your own row is editable, and
-- the xp guard trigger rejects any attempt to change the balance.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop trigger if exists profiles_guard_xp on public.profiles;
create trigger profiles_guard_xp
  before update on public.profiles
  for each row execute function public.guard_profile_xp();

-- Reports and votes: readable by everyone, writable by nobody directly.
drop policy if exists reports_read on public.reports;
create policy reports_read on public.reports for select using (true);

drop policy if exists confirmations_read on public.confirmations;
create policy confirmations_read on public.confirmations for select using (true);

-- XP ledger: your own history only. Other people's XP totals are public via
-- profiles, but the itemised reasons are not.
drop policy if exists xp_read_own on public.xp_events;
create policy xp_read_own on public.xp_events
  for select using (auth.uid() = user_id);

-- Chat: public reading, sending via rpc_send_chat. Users may delete their own
-- messages; nobody may edit one after the fact.
drop policy if exists chat_read on public.chat_messages;
create policy chat_read on public.chat_messages
  for select using (hidden = false);

drop policy if exists chat_delete_own on public.chat_messages;
create policy chat_delete_own on public.chat_messages
  for delete using (auth.uid() = user_id);

-- Crews are private to their members.
--
-- Membership is tested through a SECURITY DEFINER helper rather than inline.
-- A policy ON crew_members that SELECTs FROM crew_members re-enters its own
-- policy and Postgres aborts with "infinite recursion detected in policy".
-- The helper runs as the owner, so its lookup is not subject to the policy it
-- is being used to evaluate.
create or replace function public.is_crew_member(p_crew uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.crew_members
     where crew_id = p_crew and user_id = p_user
  );
$$;

drop policy if exists crews_read_member on public.crews;
create policy crews_read_member on public.crews
  for select using (public.is_crew_member(crews.id, auth.uid()));

-- A member may see the roster of a crew they belong to, and always their own
-- membership row (which is what makes joining visible to the joiner).
drop policy if exists crew_members_read on public.crew_members;
create policy crew_members_read on public.crew_members
  for select using (
    user_id = auth.uid()
    or public.is_crew_member(crew_members.crew_id, auth.uid())
  );

drop policy if exists crew_members_leave on public.crew_members;
create policy crew_members_leave on public.crew_members
  for delete using (auth.uid() = user_id);

drop policy if exists crew_messages_read on public.crew_messages;
create policy crew_messages_read on public.crew_messages
  for select using (
    exists (select 1 from public.crew_members m
             where m.crew_id = crew_messages.crew_id and m.user_id = auth.uid())
  );

-- Cosmetics catalogue is public; ownership is yours alone.
drop policy if exists cosmetics_read on public.cosmetics;
create policy cosmetics_read on public.cosmetics for select using (true);

drop policy if exists user_cosmetics_read_own on public.user_cosmetics;
create policy user_cosmetics_read_own on public.user_cosmetics
  for select using (auth.uid() = user_id);

-- Ordinary private user data: full control over your own rows, no visibility
-- into anyone else's.
drop policy if exists journeys_own on public.journeys;
create policy journeys_own on public.journeys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists prefs_own on public.notification_prefs;
create policy prefs_own on public.notification_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public, track5 to anon, authenticated;
grant select on public.active_signals, public.signals_with_status to anon, authenticated;

-- Defence in depth. A Supabase project grants table privileges to anon and
-- authenticated by default, and "no policy" is what actually denies these
-- writes. Revoking the privilege as well means the tables stay protected even
-- if someone later adds a permissive policy by accident.
revoke insert, update, delete on public.reports       from anon, authenticated;
revoke insert, update, delete on public.confirmations from anon, authenticated;
revoke insert, update, delete on public.xp_events     from anon, authenticated;
revoke insert, update, delete on public.cosmetics     from anon, authenticated;
revoke insert, update, delete on public.user_cosmetics from anon, authenticated;
revoke insert, update on public.chat_messages         from anon, authenticated;
revoke insert, update, delete on public.crews         from anon, authenticated;
revoke insert, update on public.crew_members          from anon, authenticated;
revoke insert, update, delete on public.crew_messages from anon, authenticated;
-- Only the handle and avatar columns are ever a client's to change.
revoke insert, delete on public.profiles from anon, authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (handle, avatar) on public.profiles to authenticated;

-- Used inside RLS policies, so the querying role must be able to call it.
grant execute on function public.is_crew_member(uuid, uuid) to anon, authenticated;

grant execute on function
  public.rpc_create_report(smallint, text, text),
  public.rpc_vote_report(uuid, smallint),
  public.rpc_send_chat(text),
  public.rpc_create_crew(text),
  public.rpc_join_crew(text),
  public.rpc_send_crew_message(uuid, text),
  public.rpc_buy_cosmetic(text)
to authenticated;

-- Internal helpers are not part of the client's surface.
revoke execute on function public.sync_profile_xp() from anon, authenticated;
revoke execute on function public.award_daily_bonus(uuid) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Starter cosmetics. Appearance only — nothing here affects the game.
-- ---------------------------------------------------------------------------

insert into public.cosmetics (id, name, slot, cost_xp, rarity) values
  ('jacket-rail',    'Rail jacket',        'jacket', 0,    'common'),
  ('jacket-hivis',   'Hi-vis',             'jacket', 100,  'common'),
  ('jacket-leather', 'Leather',            'jacket', 750,  'rare'),
  ('hat-beanie',     'Beanie',             'hat',    100,  'common'),
  ('hat-cap',        'Conductor cap',      'hat',    300,  'uncommon'),
  ('hat-hood',       'Hood up',            'hat',    0,    'common'),
  ('glasses-dark',   'Dark glasses',       'face',   300,  'uncommon'),
  ('patch-jaeren',   'Jæren patch',        'patch',  750,  'uncommon'),
  ('patch-nightowl', 'Night owl',          'patch',  1500, 'rare'),
  ('patch-legend',   'End of the line',    'patch',  6000, 'legendary')
on conflict (id) do nothing;
