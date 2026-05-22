-- Nearest neighbour lookup by cosine distance, scoped to a single user
-- and excluding pins that already belong to a project.

create or replace function public.find_pin_neighbors(
  p_user_id uuid,
  p_seed_id uuid,
  p_seed_vec vector(512),
  p_limit int default 30
)
returns table (
  id uuid,
  pinterest_pin_id text,
  image_url text,
  pinterest_description text,
  pinterest_board_name text,
  distance real
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.pinterest_pin_id,
    p.image_url,
    p.pinterest_description,
    p.pinterest_board_name,
    (p.clip_embedding <=> p_seed_vec)::real as distance
  from public.pins p
  where p.user_id = p_user_id
    and p.id <> p_seed_id
    and p.project_id is null
    and p.clip_embedding is not null
  order by p.clip_embedding <=> p_seed_vec
  limit p_limit;
$$;

revoke all on function public.find_pin_neighbors(uuid, uuid, vector, int) from public;
grant execute on function public.find_pin_neighbors(uuid, uuid, vector, int) to authenticated, service_role;
