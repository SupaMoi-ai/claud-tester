-- RLS: members can only read/write rows in their own family.
-- Kids (role='child') get read on everything family-scoped but write only on
-- chore_completions, reward_claims, and bag_items.packed.

-- Helper functions run as SECURITY DEFINER so they can read `members` without
-- recursing into the RLS policy being evaluated on that same table.
create or replace function my_family_id() returns uuid
language sql security definer stable
set search_path = public
as $$
  select family_id from members where user_id = auth.uid() limit 1;
$$;

create or replace function my_member_id() returns uuid
language sql security definer stable
set search_path = public
as $$
  select id from members where user_id = auth.uid() limit 1;
$$;

create or replace function my_role() returns text
language sql security definer stable
set search_path = public
as $$
  select role from members where user_id = auth.uid() limit 1;
$$;

alter table families enable row level security;
alter table members enable row level security;
alter table custody_patterns enable row level security;
alter table custody_overrides enable row level security;
alter table captures enable row level security;
alter table events enable row level security;
alter table bag_items enable row level security;
alter table money_items enable row level security;
alter table chores enable row level security;
alter table chore_completions enable row level security;
alter table reward_claims enable row level security;

-- families: readable by members of that family; no direct writes from clients
-- (family creation happens via seed/service-role scripts or a dedicated signup flow).
create policy "family members can read their family" on families
  for select using (id = my_family_id());

-- members: everyone in the family can read the roster; only parents manage members.
create policy "family members can read roster" on members
  for select using (family_id = my_family_id());

create policy "parents manage members" on members
  for insert with check (family_id = my_family_id() and my_role() = 'parent');

create policy "parents update members" on members
  for update using (family_id = my_family_id() and my_role() = 'parent');

create policy "parents delete members" on members
  for delete using (family_id = my_family_id() and my_role() = 'parent');

-- Generic family-scoped read + parent-only write, applied to:
-- custody_patterns, custody_overrides, captures, events, money_items, chores.
create policy "family read custody_patterns" on custody_patterns
  for select using (family_id = my_family_id());
create policy "parents write custody_patterns" on custody_patterns
  for insert with check (family_id = my_family_id() and my_role() = 'parent');
create policy "parents update custody_patterns" on custody_patterns
  for update using (family_id = my_family_id() and my_role() = 'parent');
create policy "parents delete custody_patterns" on custody_patterns
  for delete using (family_id = my_family_id() and my_role() = 'parent');

create policy "family read custody_overrides" on custody_overrides
  for select using (family_id = my_family_id());
create policy "parents write custody_overrides" on custody_overrides
  for insert with check (family_id = my_family_id() and my_role() = 'parent');
create policy "parents update custody_overrides" on custody_overrides
  for update using (family_id = my_family_id() and my_role() = 'parent');
create policy "parents delete custody_overrides" on custody_overrides
  for delete using (family_id = my_family_id() and my_role() = 'parent');

create policy "family read captures" on captures
  for select using (family_id = my_family_id());
create policy "parents write captures" on captures
  for insert with check (family_id = my_family_id() and my_role() = 'parent');
create policy "parents update captures" on captures
  for update using (family_id = my_family_id() and my_role() = 'parent');
create policy "parents delete captures" on captures
  for delete using (family_id = my_family_id() and my_role() = 'parent');

create policy "family read events" on events
  for select using (family_id = my_family_id());
create policy "parents write events" on events
  for insert with check (family_id = my_family_id() and my_role() = 'parent');
create policy "parents update events" on events
  for update using (family_id = my_family_id() and my_role() = 'parent');
create policy "parents delete events" on events
  for delete using (family_id = my_family_id() and my_role() = 'parent');

create policy "family read money_items" on money_items
  for select using (family_id = my_family_id());
create policy "parents write money_items" on money_items
  for insert with check (family_id = my_family_id() and my_role() = 'parent');
create policy "parents update money_items" on money_items
  for update using (family_id = my_family_id() and my_role() = 'parent');
create policy "parents delete money_items" on money_items
  for delete using (family_id = my_family_id() and my_role() = 'parent');

create policy "family read chores" on chores
  for select using (family_id = my_family_id());
create policy "parents write chores" on chores
  for insert with check (family_id = my_family_id() and my_role() = 'parent');
create policy "parents update chores" on chores
  for update using (family_id = my_family_id() and my_role() = 'parent');
create policy "parents delete chores" on chores
  for delete using (family_id = my_family_id() and my_role() = 'parent');

-- bag_items: family-scoped read; parents manage everything; children are allowed
-- to hit the UPDATE policy (family match) but a trigger below restricts them to
-- only ever changing the `packed` column.
create policy "family read bag_items" on bag_items
  for select using (family_id = my_family_id());
create policy "parents write bag_items" on bag_items
  for insert with check (family_id = my_family_id() and my_role() = 'parent');
create policy "family update bag_items" on bag_items
  for update using (family_id = my_family_id());
create policy "parents delete bag_items" on bag_items
  for delete using (family_id = my_family_id() and my_role() = 'parent');

-- Postgres RLS cannot restrict UPDATE to a single column, so enforce the
-- "children may only toggle packed" rule with a trigger instead.
create or replace function enforce_child_bag_item_update() returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if my_role() = 'child' then
    if old.id is distinct from new.id
       or old.family_id is distinct from new.family_id
       or old.capture_id is distinct from new.capture_id
       or old.event_id is distinct from new.event_id
       or old.name is distinct from new.name
       or old.for_member is distinct from new.for_member
       or old.travels_to is distinct from new.travels_to
       or old.due_date is distinct from new.due_date
       or old.recurring is distinct from new.recurring
    then
      raise exception 'Barn kan bare endre pakket-status (packed) på reisesekk-elementer';
    end if;
  end if;
  return new;
end;
$$;

create trigger bag_items_child_update_guard
  before update on bag_items
  for each row execute function enforce_child_bag_item_update();

-- chore_completions: family-scoped via the referenced member; a member (parent
-- or child) may write rows for themselves, parents may write for any kid in
-- the family.
create policy "family read chore_completions" on chore_completions
  for select using (
    exists (
      select 1 from members m
      where m.id = chore_completions.member_id and m.family_id = my_family_id()
    )
  );
create policy "self or parent write chore_completions" on chore_completions
  for insert with check (
    member_id = my_member_id()
    or (
      my_role() = 'parent'
      and exists (
        select 1 from members m
        where m.id = chore_completions.member_id and m.family_id = my_family_id()
      )
    )
  );
create policy "self or parent delete chore_completions" on chore_completions
  for delete using (
    member_id = my_member_id()
    or (
      my_role() = 'parent'
      and exists (
        select 1 from members m
        where m.id = chore_completions.member_id and m.family_id = my_family_id()
      )
    )
  );

-- reward_claims: same self-or-parent shape as chore_completions.
create policy "family read reward_claims" on reward_claims
  for select using (
    exists (
      select 1 from members m
      where m.id = reward_claims.member_id and m.family_id = my_family_id()
    )
  );
create policy "self or parent write reward_claims" on reward_claims
  for insert with check (
    member_id = my_member_id()
    or (
      my_role() = 'parent'
      and exists (
        select 1 from members m
        where m.id = reward_claims.member_id and m.family_id = my_family_id()
      )
    )
  );
