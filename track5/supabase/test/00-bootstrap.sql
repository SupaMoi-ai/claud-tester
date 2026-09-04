-- Minimal stand-ins for the parts of Supabase the schema depends on, so the
-- real schema.sql can be executed and exercised locally without changes.

create extension if not exists pgcrypto;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

-- Supabase resolves the caller from the JWT. Locally we resolve it from a GUC
-- so a test can switch identity between statements.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('track5.test_uid', true), '')::uuid;
$$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;

grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;
grant select on auth.users to anon, authenticated;
