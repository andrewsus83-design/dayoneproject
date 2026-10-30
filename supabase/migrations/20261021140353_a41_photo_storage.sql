insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('a41_photos', 'a41_photos', true, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy a41_photos_upload_with_ticket on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'a41_photos' and (select a41_private.has_photo_ticket(name)));

create policy a41_photos_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'a41_photos' and (select a41_private.owns_photo_object(name)));
create policy a41_photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'a41_photos' and (select a41_private.owns_photo_object(name)));

create policy a41_photos_removed_select on storage.objects for select to anon, authenticated
  using (bucket_id = 'a41_photos' and (select a41_private.is_removed_photo_object(name)));
create policy a41_photos_removed_delete on storage.objects for delete to anon, authenticated
  using (bucket_id = 'a41_photos' and (select a41_private.is_removed_photo_object(name)));