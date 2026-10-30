-- Photo wall, for real: guest uploads (consent -> upload ticket -> upload -> register), the organizer's
-- moderation switch and queue, captions, and retention bookkeeping.
-- Additive: new columns have defaults, existing functions keep their signatures and old keys.
--
-- Moderation ON  = 'manual': uploads wait as 'pending' until an organizer approves them.
-- Moderation OFF = 'auto':   uploads go straight onto the wall ('approved' at once).
--
-- Guests must be checked in (a row in a41_checkins). Organizer actions need an event manager
-- (a41_private.is_event_manager); reads need any member of the event's organization.

alter table public.a41_photo_settings
  add column if not exists captions_enabled boolean not null default true;

alter table public.a41_photos
  add column if not exists caption text check (caption is null or char_length(caption) between 1 and 300),
  add column if not exists purged_at timestamptz;

comment on column public.a41_photo_settings.captions_enabled is 'Guests may add a caption (up to 300 characters) to each photo.';
comment on column public.a41_photos.purged_at is 'When the retention job deleted the stored file.';

-- Photos are kept until 30 days after the event ends.
create or replace function a41_private.set_photo_expiry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.expires_at := coalesce((select e.ends_at from public.a41_events e where e.id = new.event_id), now()) + interval '30 days';
  return new;
end
$$;

drop trigger if exists a41_photos_set_expiry on public.a41_photos;
create trigger a41_photos_set_expiry
  before insert on public.a41_photos
  for each row execute function a41_private.set_photo_expiry();

-- When the organizer moves the event's end, the photos' expiry follows.
create or replace function a41_private.follow_event_end()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.a41_photos p
  set expires_at = new.ends_at + interval '30 days'
  where p.event_id = new.id and p.purged_at is null;
  return null;
end
$$;

drop trigger if exists a41_events_photo_expiry on public.a41_events;
create trigger a41_events_photo_expiry
  after update of ends_at on public.a41_events
  for each row when (old.ends_at is distinct from new.ends_at)
  execute function a41_private.follow_event_end();

update public.a41_photos p
set expires_at = e.ends_at + interval '30 days'
from public.a41_events e
where e.id = p.event_id and p.purged_at is null;

revoke all on function a41_private.set_photo_expiry() from public, anon, authenticated;
revoke all on function a41_private.follow_event_end() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Guest side (called with the guest's pass token)
-- ---------------------------------------------------------------------------------------------

-- Everything the guest's photo page needs in one call; null when the token is unknown.
-- The wall key is only handed to checked-in guests, so their phones can watch the shared album feed.
create or replace function public.a41_photo_guest(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'guest_name', g.name,
    'event_name', e.name,
    'event_slug', e.slug,
    'ends_at', e.ends_at,
    'checked_in', ci.guest_id is not null,
    'enabled', s.enabled,
    'uploads_open', s.enabled and ci.guest_id is not null and now() < a41_private.photo_upload_deadline(g.event_id),
    'upload_deadline', a41_private.photo_upload_deadline(g.event_id),
    'moderation', s.moderation,
    'captions_enabled', s.captions_enabled,
    'consented_at', c.consented_at,
    'photos_used', (select count(*)::integer from public.a41_photos p where p.guest_id = g.id and p.status <> 'removed'),
    'photo_quota', 10,
    'wall_key', case when s.enabled and ci.guest_id is not null then s.wall_key end,
    'photos', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('id', p.id, 'status', p.status, 'storage_path', p.storage_path, 'caption', p.caption, 'created_at', p.created_at)
          order by p.created_at desc, p.id desc
        ),
        '[]'::jsonb
      )
      from public.a41_photos p
      where p.guest_id = g.id and p.status <> 'removed' and p.expires_at > now()
    )
  )
  from a41_private.guest_by_token(p_token) g
  join public.a41_events e on e.id = g.event_id
  join public.a41_photo_settings s on s.event_id = g.event_id
  left join public.a41_checkins ci on ci.guest_id = g.id
  left join public.a41_photo_consents c on c.guest_id = g.id
$$;

-- The guest agrees that their photos may be shown on the event's wall and album.
create or replace function public.a41_photo_consent(p_token text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.a41_guests;
  v_at timestamptz;
begin
  select * into g from a41_private.guest_by_token(p_token);
  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;

  insert into public.a41_photo_consents (guest_id, event_id) values (g.id, g.event_id)
  on conflict (guest_id) do nothing;

  select c.consented_at into v_at from public.a41_photo_consents c where c.guest_id = g.id;
  return v_at;
end
$$;

-- Permission to upload one file: a fresh path the storage policy accepts for 15 minutes.
-- Checked-in guest, uploads on, before the deadline, consent given, and under 10 photos
-- (open tickets count toward the 10, at most 3 open at once).
create or replace function public.a41_photo_ticket(p_token text, p_ext text default 'webp')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.a41_guests;
  s public.a41_photo_settings;
  v_used integer;
  v_open integer;
  v_path text;
  v_expires timestamptz;
begin
  if p_ext is null or p_ext not in ('webp', 'jpg') then
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
    'content_type', case p_ext when 'webp' then 'image/webp' else 'image/jpeg' end
  );
end
$$;

-- After the upload: record the photo. It goes on the wall at once when moderation is off ('auto'),
-- otherwise it waits as 'pending'. Calling it again for the same file returns the saved photo.
create or replace function public.a41_register_photo(p_token text, p_path text, p_caption text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.a41_guests;
  s public.a41_photo_settings;
  v_photo public.a41_photos;
  v_size bigint;
  v_type text;
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
    if v_size < 1 or v_size > 2097152 then
      raise exception 'file_too_large' using errcode = '22023';
    end if;
    if v_type is distinct from (case when p_path like '%.webp' then 'image/webp' else 'image/jpeg' end) then
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
$$;

-- ---------------------------------------------------------------------------------------------
-- Organizer side (signed-in organizer of the event's organization)
-- ---------------------------------------------------------------------------------------------

-- Switch uploads on/off, moderation ON ('manual') / OFF ('auto'), and captions. Null leaves a value as it is.
create or replace function public.a41_set_photo_settings(
  p_event uuid,
  p_enabled boolean default null,
  p_moderation text default null,
  p_captions_enabled boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.a41_photo_settings;
begin
  if not (select a41_private.is_event_manager(p_event)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_moderation is not null and p_moderation not in ('auto', 'manual') then
    raise exception 'invalid_moderation' using errcode = '22023';
  end if;

  insert into public.a41_photo_settings (event_id) values (p_event) on conflict do nothing;
  update public.a41_photo_settings ps set
    enabled = coalesce(p_enabled, ps.enabled),
    moderation = coalesce(p_moderation, ps.moderation),
    captions_enabled = coalesce(p_captions_enabled, ps.captions_enabled)
  where ps.event_id = p_event
  returning * into s;

  return jsonb_build_object(
    'enabled', s.enabled,
    'moderation', s.moderation,
    'captions_enabled', s.captions_enabled,
    'wall_key', s.wall_key,
    'updated_at', s.updated_at
  );
end
$$;

-- The moderation list: one status at a time, newest first, with the guest's name and table.
create or replace function public.a41_photo_queue(
  p_event uuid,
  p_status text default 'pending',
  p_limit integer default 60,
  p_before timestamptz default null,
  p_before_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select a41_private.is_event_member(p_event)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('pending', 'approved', 'rejected') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  return (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', x.id,
          'status', x.status,
          'storage_path', x.storage_path,
          'caption', x.caption,
          'bytes', x.bytes,
          'created_at', x.created_at,
          'approved_at', x.approved_at,
          'guest_name', x.guest_name,
          'table_no', x.table_no
        )
        order by x.created_at desc, x.id desc
      ),
      '[]'::jsonb
    )
    from (
      select p.id, p.status, p.storage_path, p.caption, p.bytes, p.created_at, p.approved_at,
             g.name as guest_name, g.table_no
      from public.a41_photos p
      join public.a41_guests g on g.id = p.guest_id
      where p.event_id = p_event
        and p.status = p_status
        and p.expires_at > now()
        and (p_before is null or (p.created_at, p.id) < (p_before, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
      order by p.created_at desc, p.id desc
      limit least(greatest(coalesce(p_limit, 60), 1), 200)
    ) x
  );
end
$$;

-- Approve, reject or remove photos. p_ids null means every pending photo (approve / reject only).
-- Returns how many changed and, for 'remove', the files the caller may delete right away.
create or replace function public.a41_moderate_photos(p_event uuid, p_ids uuid[], p_action text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_count integer;
  v_paths text[];
begin
  if not (select a41_private.is_event_manager(p_event)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_status := case p_action when 'approve' then 'approved' when 'reject' then 'rejected' when 'remove' then 'removed' end;
  if v_status is null then
    raise exception 'invalid_action' using errcode = '22023';
  end if;
  if p_ids is null and v_status = 'removed' then
    raise exception 'photos_required' using errcode = '22023';
  end if;
  if cardinality(p_ids) > 500 then
    raise exception 'too_many_photos' using errcode = '22023';
  end if;

  with changed as (
    update public.a41_photos p
    set status = v_status
    where p.event_id = p_event
      and p.status <> 'removed'
      and p.status <> v_status
      and (case when p_ids is null then p.status = 'pending' else p.id = any (p_ids) end)
    returning p.storage_path
  )
  select count(*)::integer, coalesce(array_agg(c.storage_path), '{}') into v_count, v_paths from changed c;

  return jsonb_build_object(
    'updated', v_count,
    'removed_paths', case when v_status = 'removed' then to_jsonb(v_paths) else '[]'::jsonb end
  );
end
$$;

-- ---------------------------------------------------------------------------------------------
-- Wall feed: same signature, now with captions (when on) and the guest's short name.
-- ---------------------------------------------------------------------------------------------
create or replace function public.a41_wall_feed(p_slug text, p_key text, p_limit integer default 48)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'event', jsonb_build_object('name', e.name, 'slug', e.slug, 'theme', e.theme, 'timezone', e.timezone),
    'enabled', s.enabled,
    'captions', s.captions_enabled,
    'total', case when s.enabled then (
      select count(*) from public.a41_photos p
      where p.event_id = e.id and p.status = 'approved' and p.expires_at > now()
    ) else 0 end,
    'photos', case when s.enabled then (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', x.id,
            'storage_path', x.storage_path,
            'approved_at', x.approved_at,
            'caption', case when s.captions_enabled then x.caption end,
            'name', a41_private.display_name(x.guest_name)
          )
          order by x.approved_at desc, x.id desc
        ),
        '[]'::jsonb
      )
      from (
        select p.id, p.storage_path, p.approved_at, p.caption, g.name as guest_name
        from public.a41_photos p
        join public.a41_guests g on g.id = p.guest_id
        where p.event_id = e.id and p.status = 'approved' and p.expires_at > now()
        order by p.approved_at desc, p.id desc
        limit least(greatest(coalesce(p_limit, 48), 1), 200)
      ) x
    ) else '[]'::jsonb end
  )
  from public.a41_events e
  join public.a41_photo_settings s on s.event_id = e.id
  where e.slug = p_slug and e.status = 'published' and s.wall_key = p_key
$$;

-- ---------------------------------------------------------------------------------------------
-- Retention (the a41-photo-cleanup edge function, service role only)
-- ---------------------------------------------------------------------------------------------

-- Same signature; files already deleted by the cleanup job are no longer listed.
create or replace function public.a41_expired_photo_paths()
returns table(storage_path text, reason text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.storage_path, case when p.status = 'removed' then 'removed' else 'expired' end
  from public.a41_photos p
  where p.purged_at is null and (p.status = 'removed' or p.expires_at <= now())
  union all
  select o.name, 'orphan'
  from storage.objects o
  where o.bucket_id = 'a41_photos'
    and o.created_at < now() - interval '1 day'
    and not exists (select 1 from public.a41_photos p where p.storage_path = o.name)
    and not exists (select 1 from public.a41_photo_tickets t where t.path = o.name and t.expires_at > now())
$$;

-- The cleanup job deleted these files: mark their photos removed (stats keep counting them) and
-- drop upload tickets that expired more than a day ago.
create or replace function public.a41_svc_photo_purged(p_paths text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.a41_photos p
  set status = 'removed', purged_at = now()
  where p.storage_path = any (p_paths) and p.purged_at is null;
  get diagnostics v_count = row_count;

  delete from public.a41_photo_tickets t where t.expires_at < now() - interval '1 day';
  return v_count;
end
$$;

-- ---------------------------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------------------------
revoke all on function public.a41_photo_guest(text) from public;
revoke all on function public.a41_photo_consent(text) from public;
revoke all on function public.a41_photo_ticket(text, text) from public;
revoke all on function public.a41_register_photo(text, text, text) from public;
grant execute on function public.a41_photo_guest(text) to anon, authenticated, service_role;
grant execute on function public.a41_photo_consent(text) to anon, authenticated, service_role;
grant execute on function public.a41_photo_ticket(text, text) to anon, authenticated, service_role;
grant execute on function public.a41_register_photo(text, text, text) to anon, authenticated, service_role;

revoke all on function public.a41_set_photo_settings(uuid, boolean, text, boolean) from public, anon;
revoke all on function public.a41_photo_queue(uuid, text, integer, timestamptz, uuid) from public, anon;
revoke all on function public.a41_moderate_photos(uuid, uuid[], text) from public, anon;
grant execute on function public.a41_set_photo_settings(uuid, boolean, text, boolean) to authenticated, service_role;
grant execute on function public.a41_photo_queue(uuid, text, integer, timestamptz, uuid) to authenticated, service_role;
grant execute on function public.a41_moderate_photos(uuid, uuid[], text) to authenticated, service_role;

revoke all on function public.a41_svc_photo_purged(text[]) from public, anon, authenticated;
grant execute on function public.a41_svc_photo_purged(text[]) to service_role;
