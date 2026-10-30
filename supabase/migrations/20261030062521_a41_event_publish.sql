-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_event_publish.
-- "Save & publish" for the event builder: the whole event setup is stored on the server so every phone and
-- screen shows the same event.
--   config   everything the builder holds (private: organization members only, through RLS on a41_events)
--   site     the part guests may see (info, landing page, design, invitation form, terms), served by a41_public_event
--   saved_at when it was last saved, so screens know when to refresh
-- The grants, the saved_at trigger and the column grant follow in the next three migrations
-- (a41_event_publish_grants, a41_event_saved_at_stamp, a41_event_publish_column_grants).
alter table public.a41_events
  add column if not exists config jsonb not null default '{}'::jsonb,
  add column if not exists site jsonb not null default '{}'::jsonb,
  add column if not exists saved_at timestamptz;

create or replace function a41_private.public_event_json(p_event public.a41_events)
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_event.id,
    'slug', p_event.slug,
    'name', p_event.name,
    'type', p_event.type,
    'timezone', p_event.timezone,
    'starts_at', p_event.starts_at,
    'ends_at', p_event.ends_at,
    'venue_name', p_event.venue_name,
    'venue_address', p_event.venue_address,
    'theme', p_event.theme,
    'site', p_event.site,
    'saved_at', p_event.saved_at
  )
$$;

-- Builder images (logo, hero, invitation photo, frames...). Public to read; only the event's organizers upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('a41_event_assets', 'a41_event_assets', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/gif'])
on conflict (id) do nothing;

-- Files live under <event id>/...; true when the caller runs that event's organization.
create or replace function a41_private.can_edit_event_folder(p_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.a41_events e
    where e.id::text = split_part(p_name, '/', 1)
      and a41_private.is_org_owner(e.org_id)
  )
$$;

create policy a41_event_assets_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'a41_event_assets' and (select a41_private.can_edit_event_folder(name)));
create policy a41_event_assets_delete on storage.objects for delete to authenticated
  using (bucket_id = 'a41_event_assets' and (select a41_private.can_edit_event_folder(name)));
