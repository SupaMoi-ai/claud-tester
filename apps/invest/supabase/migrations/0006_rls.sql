-- 0006_rls: row-level security on every table, default deny.
--
-- Two patterns only:
--   A. User-owned tables  -> visible to their owner, nobody else.
--   B. Market data        -> readable by any signed-in user, writable only by
--                            the cron (service_role, which bypasses RLS).
--
-- `(select auth.uid())` rather than bare `auth.uid()`: Postgres caches the
-- scalar subquery once per statement instead of re-evaluating it per row, which
-- matters once `prices` holds tens of thousands of rows.
--
-- A table without RLS is a leak. If you add a table, add its policy here.

-- ---------------------------------------------------------------- pattern A
do $$
declare
  t text;
  owned text[] := array[
    'user_settings', 'accounts', 'instruments', 'instrument_provider_ids',
    'instrument_exposures', 'fund_holdings', 'corporate_actions',
    'tax_lots', 'tax_lot_closures',
    'portfolio_snapshots', 'position_snapshots',
    'theses', 'thesis_versions', 'thesis_conditions',
    'journal_entries', 'watchlist', 'insights',
    'import_batches', 'import_candidates',
    'ai_conversations', 'ai_messages', 'ai_usage_daily'
  ];
begin
  foreach t in array owned loop
    execute format('alter table %I enable row level security', t);
    -- force: the policy applies to the table owner too, not just to other roles.
    execute format('alter table %I force row level security', t);

    execute format($f$
      create policy %1$I_select on %1$I for select to authenticated
        using (user_id = (select auth.uid()))
    $f$, t);

    execute format($f$
      create policy %1$I_insert on %1$I for insert to authenticated
        with check (user_id = (select auth.uid()))
    $f$, t);

    execute format($f$
      create policy %1$I_update on %1$I for update to authenticated
        using (user_id = (select auth.uid()))
        with check (user_id = (select auth.uid()))
    $f$, t);

    execute format($f$
      create policy %1$I_delete on %1$I for delete to authenticated
        using (user_id = (select auth.uid()))
    $f$, t);
  end loop;
end $$;

-- ------------------------------------------------- transactions: append-only
-- SELECT and INSERT only. There is deliberately no UPDATE or DELETE policy, so
-- even a compromised session cannot rewrite history; the trigger in 0002 is the
-- second line of defence, and service_role has to get past it too.
alter table transactions enable row level security;
alter table transactions force row level security;

create policy transactions_select on transactions for select to authenticated
  using (user_id = (select auth.uid()));

create policy transactions_insert on transactions for insert to authenticated
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- pattern B
-- Market data is not user-specific. Any signed-in user may read it; nobody may
-- write it through the user role. The EOD cron writes with service_role, which
-- bypasses RLS entirely -- which is exactly why `adminDb()` is lint-banned
-- outside src/app/api/cron/.
do $$
declare
  t text;
  shared text[] := array['prices', 'quotes', 'fx_rates', 'provider_calls'];
begin
  foreach t in array shared loop
    execute format('alter table %I enable row level security', t);
    execute format($f$
      create policy %1$I_read on %1$I for select to authenticated using (true)
    $f$, t);
  end loop;
end $$;
