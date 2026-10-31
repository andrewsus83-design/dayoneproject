-- Videos from Shot reach the photo wall. a41_photo_wall_videos opened the bucket and the upload functions to MP4/WebM,
-- but the ticket and photo tables still only accepted .webp/.jpg up to 2 MB, so every video failed at the upload ticket.
-- Photos stay WebP/JPEG up to 2 MB; videos are MP4/WebM up to 20 MB.
alter table public.a41_photo_tickets drop constraint a41_photo_tickets_path_check;
alter table public.a41_photo_tickets add constraint a41_photo_tickets_path_check check (
  path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|mp4|webm)$'
);

alter table public.a41_photos
  drop constraint a41_photos_check,
  drop constraint a41_photos_check1,
  drop constraint a41_photos_content_type_check,
  drop constraint a41_photos_bytes_check;

alter table public.a41_photos
  add constraint a41_photos_check check (
    storage_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|mp4|webm)$'
    and starts_with(storage_path, event_id::text || '/')
  ),
  add constraint a41_photos_check1 check (
    (storage_path like '%.webp' and content_type = 'image/webp')
    or (storage_path like '%.jpg' and content_type = 'image/jpeg')
    or (storage_path like '%.mp4' and content_type = 'video/mp4')
    or (storage_path like '%.webm' and content_type = 'video/webm')
  ),
  add constraint a41_photos_content_type_check check (content_type in ('image/webp', 'image/jpeg', 'video/mp4', 'video/webm')),
  add constraint a41_photos_bytes_check check (
    bytes >= 1 and bytes <= case when content_type like 'video/%' then 20971520 else 2097152 end
  );
