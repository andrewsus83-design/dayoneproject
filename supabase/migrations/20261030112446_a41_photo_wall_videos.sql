-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_photo_wall_videos.
-- Guests post photos and videos from Shot in the guest app. Photos stay WebP/JPEG up to 2 MB; videos are MP4/WebM
-- (720p, recorded on the phone) up to 20 MB. Both count towards the same 10 uploads per guest.
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['image/webp', 'image/jpeg', 'video/mp4', 'video/webm']
where id = 'a41_photos';

create or replace function public.a41_photo_ticket(p_token text, p_ext text default 'webp')
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  g public.a41_guests;
  s public.a41_photo_settings;
  v_used integer;
  v_open integer;
  v_path text;
  v_expires timestamptz;
begin
  if p_ext is null or p_ext not in ('webp', 'jpg', 'mp4', 'webm') then
    raise exception 'unsupported_format' using errcode = '22023';
  end if;

  select * into g from a41_private.guest_by_token(p_token);
  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.a41_checkins c where c.guest_id = g.id) then
    raise exception 'not_checked_in' using errcode = '42501';
  end if;

  select * into s from public.a41_photo_settings ps where ps.event_id = g.event_id;
  if not found or not s.enabled then
    raise exception 'photos_disabled' using errcode = '42501';
  end if;
  if now() >= a41_private.photo_upload_deadline(g.event_id) then
    raise exception 'uploads_closed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.a41_photo_consents c where c.guest_id = g.id) then
    raise exception 'consent_required' using errcode = '42501';
  end if;

  -- One request per guest at a time, so parallel calls cannot slip past the quota together.
  perform pg_advisory_xact_lock(hashtextextended('a41_photo_quota:' || g.id::text, 0));

  delete from public.a41_photo_tickets t where t.guest_id = g.id and t.expires_at < now() - interval '1 hour';

  select count(*) into v_used from public.a41_photos p where p.guest_id = g.id and p.status <> 'removed';
  select count(*) into v_open
  from public.a41_photo_tickets t
  where t.guest_id = g.id and t.expires_at > now()
    and not exists (select 1 from public.a41_photos p where p.storage_path = t.path);

  if v_used + v_open >= 10 then
    raise exception 'quota_reached' using errcode = '42501';
  end if;
  if v_open >= 3 then
    raise exception 'too_many_uploads' using errcode = '42501';
  end if;

  v_path := g.event_id::text || '/' || gen_random_uuid()::text || '.' || p_ext;
  insert into public.a41_photo_tickets (path, guest_id, event_id)
  values (v_path, g.id, g.event_id)
  returning expires_at into v_expires;

  return jsonb_build_object(
    'path', v_path,
    'expires_at', v_expires,
    'content_type', case p_ext
      when 'webp' then 'image/webp'
      when 'jpg' then 'image/jpeg'
      when 'mp4' then 'video/mp4'
      else 'video/webm'
    end
  );
end
$function$;

create or replace function public.a41_register_photo(p_token text, p_path text, p_caption text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  g public.a41_guests;
  s public.a41_photo_settings;
  v_photo public.a41_photos;
  v_size bigint;
  v_type text;
  v_expected text;
  v_caption text;
begin
  select * into g from a41_private.guest_by_token(p_token);
  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;

  -- Same lock as the ticket: a retry racing the first call waits, then finds the saved photo.
  perform pg_advisory_xact_lock(hashtextextended('a41_photo_quota:' || g.id::text, 0));

  select * into v_photo from public.a41_photos p where p.storage_path = p_path and p.guest_id = g.id;
  if not found then
    if not exists (select 1 from public.a41_checkins c where c.guest_id = g.id) then
      raise exception 'not_checked_in' using errcode = '42501';
    end if;
    select * into s from public.a41_photo_settings ps where ps.event_id = g.event_id;
    if not found or not s.enabled then
      raise exception 'photos_disabled' using errcode = '42501';
    end if;
    if now() >= a41_private.photo_upload_deadline(g.event_id) then
      raise exception 'uploads_closed' using errcode = '42501';
    end if;
    if not exists (select 1 from public.a41_photo_tickets t where t.path = p_path and t.guest_id = g.id) then
      raise exception 'ticket_not_found' using errcode = 'P0002';
    end if;

    select (o.metadata ->> 'size')::bigint, o.metadata ->> 'mimetype'
    into v_size, v_type
    from storage.objects o
    where o.bucket_id = 'a41_photos' and o.name = p_path;
    if v_size is null then
      raise exception 'upload_not_found' using errcode = 'P0002';
    end if;

    v_expected := case
      when p_path like '%.webp' then 'image/webp'
      when p_path like '%.mp4' then 'video/mp4'
      when p_path like '%.webm' then 'video/webm'
      else 'image/jpeg'
    end;
    -- Photos up to 2 MB, videos up to 20 MB.
    if v_size < 1 or v_size > (case when v_expected like 'video/%' then 20971520 else 2097152 end) then
      raise exception 'file_too_large' using errcode = '22023';
    end if;
    if v_type is distinct from v_expected then
      raise exception 'unsupported_format' using errcode = '22023';
    end if;

    v_caption := case when s.captions_enabled then a41_private.clean_text(p_caption) end;
    if char_length(v_caption) > 300 then
      raise exception 'caption_too_long' using errcode = '22001';
    end if;

    if (select count(*) from public.a41_photos p where p.guest_id = g.id and p.status <> 'removed') >= 10 then
      raise exception 'quota_reached' using errcode = '42501';
    end if;

    insert into public.a41_photos (event_id, guest_id, storage_path, status, bytes, content_type, caption)
    values (
      g.event_id, g.id, p_path,
      case when s.moderation = 'auto' then 'approved' else 'pending' end,
      v_size, v_type, v_caption
    )
    returning * into v_photo;

    delete from public.a41_photo_tickets t where t.path = p_path;
  end if;

  return jsonb_build_object(
    'id', v_photo.id,
    'status', v_photo.status,
    'storage_path', v_photo.storage_path,
    'caption', v_photo.caption,
    'created_at', v_photo.created_at
  );
end
$function$;
