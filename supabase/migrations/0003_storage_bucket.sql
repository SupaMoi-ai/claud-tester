-- Private storage bucket for capture screenshots, path-scoped per family:
-- <family_id>/<capture_id>.<ext>
insert into storage.buckets (id, name, public)
values ('captures', 'captures', false)
on conflict (id) do nothing;

create policy "family members can upload their own capture images" on storage.objects
  for insert
  with check (
    bucket_id = 'captures'
    and (storage.foldername(name))[1] = my_family_id()::text
  );

create policy "family members can read their own capture images" on storage.objects
  for select
  using (
    bucket_id = 'captures'
    and (storage.foldername(name))[1] = my_family_id()::text
  );

create policy "family members can overwrite their own capture images" on storage.objects
  for update
  using (
    bucket_id = 'captures'
    and (storage.foldername(name))[1] = my_family_id()::text
  );
