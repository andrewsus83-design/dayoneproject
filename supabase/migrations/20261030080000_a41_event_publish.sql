-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_event_publish.
-- "Save & publish" for the event builder: the whole event setup is stored on the server so every phone and
-- screen shows the same event.
--   config   everything the builder holds (private: organization members only, through RLS on a41_events)
--   site     the part guests may see (info, landing page, design, invitation form, terms), served by a41_public_event
--   saved_at when it was last saved, so screens know when to refresh
alter table public.a41_events
  add column if not exists config jsonb not null default '{}'::jsonb,
  add column if not exists site jsonb not null default '{}'::jsonb,
  add column if not exists saved_at timestamptz;
-- Organizers update the event column by column (package and capacity stay admin-only); saved_at is set by the server.
grant update (config, site) on public.a41_events to authenticated;

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
revoke all on function a41_private.can_edit_event_folder(text) from public, anon;
grant execute on function a41_private.can_edit_event_folder(text) to authenticated;

-- The server sets saved_at whenever the setup changes, so device clocks never matter (a41_event_saved_at_stamp).
create or replace function a41_private.stamp_saved_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.config is distinct from old.config or new.site is distinct from old.site then
    new.saved_at := now();
  end if;
  return new;
end
$$;

create trigger a41_events_stamp_saved_at
before update on public.a41_events
for each row execute function a41_private.stamp_saved_at();

create policy a41_event_assets_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'a41_event_assets' and (select a41_private.can_edit_event_folder(name)));
create policy a41_event_assets_delete on storage.objects for delete to authenticated
  using (bucket_id = 'a41_event_assets' and (select a41_private.can_edit_event_folder(name)));
