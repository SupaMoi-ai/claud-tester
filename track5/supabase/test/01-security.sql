\set ON_ERROR_STOP 0
\set QUIET 1
\pset pager off
\pset tuples_only on
\pset format unaligned

-- Replicate Supabase's real posture: it grants table privileges to anon and
-- authenticated by default and relies entirely on RLS to constrain them. If
-- our writes are denied only because a GRANT is missing, that is not a test of
-- the security model. So grant everything, then prove RLS still says no.
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Two participants.
insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333')
on conflict do nothing;

\echo '=== profile auto-creation ==='
select 'profiles created: ' || count(*) from public.profiles;

-- ---------------------------------------------------------------------------
\echo ''
\echo '=== A files a report through the RPC ==='
set role authenticated;
set track5.test_uid = '11111111-1111-1111-1111-111111111111';

select 'report created at station ' || station_idx
from public.rpc_create_report(11::smallint, 'south', 'station');

select 'A xp after report: ' || xp from public.profiles
 where id = '11111111-1111-1111-1111-111111111111';

-- ---------------------------------------------------------------------------
\echo ''
\echo '=== direct writes must be refused (this is the whole security model) ==='

\echo '-- direct INSERT into reports:'
insert into public.reports (reporter, station_idx, direction, context)
values ('11111111-1111-1111-1111-111111111111', 5, 'north', 'station');

\echo '-- direct INSERT into xp_events (forging XP):'
insert into public.xp_events (user_id, kind, amount)
values ('11111111-1111-1111-1111-111111111111', 'CHEAT', 100000);

\echo '-- direct UPDATE of own XP balance:'
update public.profiles set xp = 999999
 where id = '11111111-1111-1111-1111-111111111111';

\echo '-- direct INSERT into confirmations (ballot stuffing):'
select 'reports available to stuff: ' || count(*) from public.reports;
insert into public.confirmations (report_id, user_id, vote, weight)
select id, '22222222-2222-2222-2222-222222222222', 1, 99 from public.reports limit 1;
select 'confirmations rows now: ' || count(*) from public.confirmations;

\echo '-- updating someone elses profile handle (RLS filters the row, so this'
\echo '   is a silent no-op rather than an error - assert the effect, not a raise):'
update public.profiles set handle = 'HIJACKED'
 where id = '22222222-2222-2222-2222-222222222222';
select 'B handle is now: ' || coalesce(handle, '(null - not hijacked)')
  from public.profiles where id = '22222222-2222-2222-2222-222222222222';

\echo '-- XP is unchanged after all of that:'
select 'A xp still: ' || xp from public.profiles
 where id = '11111111-1111-1111-1111-111111111111';

-- ---------------------------------------------------------------------------
\echo ''
\echo '=== self-confirmation must be refused ==='
select public.rpc_vote_report((select id from public.reports limit 1), 1::smallint);

-- ---------------------------------------------------------------------------
\echo ''
\echo '=== B confirms A''s report ==='
set track5.test_uid = '22222222-2222-2222-2222-222222222222';
select 'state after B confirms: ' || status
from public.rpc_vote_report((select id from public.reports limit 1), 1::smallint);

\echo '-- B votes a second time on the same report:'
select public.rpc_vote_report((select id from public.reports limit 1), 1::smallint);

\echo '-- C also confirms - two ordinary votes should reach the threshold:'
set track5.test_uid = '33333333-3333-3333-3333-333333333333';
select 'state after C confirms: ' || status
from public.rpc_vote_report((select id from public.reports limit 1), 1::smallint);

\echo '-- reporter A was paid for being right:'
select 'A xp after confirmation: ' || xp from public.profiles
 where id = '11111111-1111-1111-1111-111111111111';

set track5.test_uid = '22222222-2222-2222-2222-222222222222';
\echo '-- B XP for participating:'
select 'B xp: ' || xp from public.profiles
 where id = '22222222-2222-2222-2222-222222222222';

-- ---------------------------------------------------------------------------
\echo ''
\echo '=== XP ledger is private ==='
\echo '-- B reading own events:'
select 'B can see own events: ' || count(*) from public.xp_events
 where user_id = '22222222-2222-2222-2222-222222222222';
\echo '-- B trying to read A events:'
select 'B can see A events: ' || count(*) from public.xp_events
 where user_id = '11111111-1111-1111-1111-111111111111';

-- ---------------------------------------------------------------------------
\echo ''
\echo '=== two-slot flood limit ==='
reset role;
-- Backdate everything so the 90s cooldown does not mask the cap under test.
update public.reports set created_at = now() - interval '10 minutes';
set role authenticated;
set track5.test_uid = '11111111-1111-1111-1111-111111111111';

\echo '-- A files a second report (first is now CONFIRMED, so a slot is free):'
select 'created: ' || station_idx from public.rpc_create_report(4::smallint, 'north', 'station');

reset role;
update public.reports set created_at = now() - interval '10 minutes';
set role authenticated;
set track5.test_uid = '11111111-1111-1111-1111-111111111111';

\echo '-- A files a third:'
select 'created: ' || station_idx from public.rpc_create_report(7::smallint, 'north', 'station');

reset role;
update public.reports set created_at = now() - interval '10 minutes'
 where created_at > now() - interval '1 minute';
set role authenticated;
set track5.test_uid = '11111111-1111-1111-1111-111111111111';

\echo '-- A files a fourth, with two unconfirmed already open:'
select 'created: ' || station_idx from public.rpc_create_report(15::smallint, 'south', 'station');

\echo '-- A unconfirmed count:'
select 'A open unconfirmed: ' || count(*) from public.signals_with_status
 where reporter = '11111111-1111-1111-1111-111111111111' and status = 'UNCONFIRMED';

-- ---------------------------------------------------------------------------
\echo ''
\echo '=== expiry frees a slot and removes the signal from the map ==='
reset role;
update public.reports set created_at = now() - interval '3 hours';
set role authenticated;
set track5.test_uid = '11111111-1111-1111-1111-111111111111';

select 'active signals now: ' || count(*) from public.active_signals;
select 'A open unconfirmed now: ' || count(*) from public.signals_with_status
 where reporter = '11111111-1111-1111-1111-111111111111' and status = 'UNCONFIRMED';
\echo '-- so A can report again:'
select 'created: ' || station_idx from public.rpc_create_report(9::smallint, 'south', 'station');

-- ---------------------------------------------------------------------------
\echo ''
\echo '=== crews are private to members ==='
set track5.test_uid = '11111111-1111-1111-1111-111111111111';
select 'crew code: ' || code from public.rpc_create_crew('Night Shift');

set track5.test_uid = '22222222-2222-2222-2222-222222222222';
select 'B sees crews before joining: ' || count(*) from public.crews;
-- B cannot read the crews table, so the code reaches them the way it does in
-- real life: someone tells them. Fetched here with the role reset.
reset role;
select code as crewcode from public.crews limit 1;
\gset
set role authenticated;
set track5.test_uid = '22222222-2222-2222-2222-222222222222';
select 'B joins with the code: ' || name from public.rpc_join_crew(:'crewcode');

select 'B sees crews after joining: ' || count(*) from public.crews;
select 'B sees roster size: ' || count(*) from public.crew_members;
set track5.test_uid = '11111111-1111-1111-1111-111111111111';
select 'A sees crews: ' || count(*) from public.crews;

-- ---------------------------------------------------------------------------
\echo ''
\echo '=== chat rate limit ==='
set track5.test_uid = '22222222-2222-2222-2222-222222222222';
select 'sent: ' || (public.rpc_send_chat('one')).body;
select 'sent: ' || (public.rpc_send_chat('two')).body;
select 'sent: ' || (public.rpc_send_chat('three')).body;
select 'sent: ' || (public.rpc_send_chat('four')).body;
select 'sent: ' || (public.rpc_send_chat('five')).body;
\echo '-- sixth message within a minute:'
select public.rpc_send_chat('six');

-- ---------------------------------------------------------------------------
\echo ''
\echo '=== cosmetics cannot be granted to yourself ==='
\echo '-- direct INSERT into user_cosmetics:'
insert into public.user_cosmetics (user_id, cosmetic_id)
values ('22222222-2222-2222-2222-222222222222', 'patch-legend');
\echo '-- buying one you cannot afford:'
select public.rpc_buy_cosmetic('patch-legend');
\echo '-- buying a free one:'
select 'owns: ' || cosmetic_id from public.rpc_buy_cosmetic('hat-hood');

reset role;
\echo ''
\echo '=== done ==='
