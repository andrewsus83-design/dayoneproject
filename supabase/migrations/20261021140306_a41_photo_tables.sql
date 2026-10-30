create table public.a41_photo_settings (
  event_id uuid primary key references public.a41_events (id) on delete cascade,
  enabled boolean not null default false,
  moderation text not null default 'manual' check (moderation in ('auto', 'manual')),
  wall_key text not null default replace(gen_random_uuid()::text, '-', '') check (char_length(wall_key) >= 32),
  updated_at timestamptz not null default now()
);

create trigger a41_photo_settings_set_updated_at before update on public.a41_photo_settings
  for each row execute function a41_private.set_updated_at();

create table public.a41_photo_consents (
  guest_id uuid primary key,
  event_id uuid not null,
  consented_at timestamptz not null default now(),
  foreign key (guest_id, event_id) references public.a41_guests (id, event_id) on delete cascade
);

create index a41_photo_consents_event_id_idx on public.a41_photo_consents (event_id);

create table public.a41_photo_tickets (
  path text primary key check (
    path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$'
  ),
  guest_id uuid not null,
  event_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes',
  foreign key (guest_id, event_id) references public.a41_guests (id, event_id) on delete cascade
);

create index a41_photo_tickets_guest_id_idx on public.a41_photo_tickets (guest_id);
create index a41_photo_tickets_event_id_idx on public.a41_photo_tickets (event_id);

create table public.a41_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  guest_id uuid not null,
  storage_path text not null unique check (
    storage_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$'
    and starts_with(storage_path, event_id::text || '/')
  ),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'removed')),
  bytes integer not null check (bytes between 1 and 2097152),
  content_type text not null check (content_type in ('image/webp', 'image/jpeg')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  expires_at timestamptz not null default now() + interval '30 days',
  foreign key (guest_id, event_id) references public.a41_guests (id, event_id) on delete cascade,
  check ((storage_path like '%.webp' and content_type = 'image/webp') or (storage_path like '%.jpg' and content_type = 'image/jpeg')),
  check ((status = 'approved') = (approved_at is not null))
);

create index a41_photos_guest_id_idx on public.a41_photos (guest_id);
create index a41_photos_event_status_idx on public.a41_photos (event_id, status, created_at desc);
create index a41_photos_visible_idx on public.a41_photos (event_id, approved_at desc, id desc) where status = 'approved';
create index a41_photos_expires_at_idx on public.a41_photos (expires_at);

create function a41_private.create_photo_settings() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.a41_photo_settings (event_id) values (new.id) on conflict do nothing;
  return new;
end
$$;

create trigger a41_events_create_photo_settings after insert on public.a41_events
  for each row execute function a41_private.create_photo_settings();

insert into public.a41_photo_settings (event_id)
select e.id from public.a41_events e
on conflict do nothing;

create function a41_private.stamp_photo_approval() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    new.approved_at = clock_timestamp();
  elsif new.status <> 'approved' then
    new.approved_at = null;
  end if;
  return new;
end
$$;

create trigger a41_photos_stamp_approval before insert or update of status on public.a41_photos
  for each row execute function a41_private.stamp_photo_approval();

revoke execute on function
  a41_private.create_photo_settings(),
  a41_private.stamp_photo_approval()
from public;

alter table public.a41_photo_settings enable row level security;
alter table public.a41_photo_consents enable row level security;
alter table public.a41_photo_tickets enable row level security;
alter table public.a41_photos enable row level security;

revoke all on public.a41_photo_settings, public.a41_photo_consents, public.a41_photo_tickets, public.a41_photos
  from anon, authenticated;

grant select on public.a41_photo_settings to authenticated;
grant update (enabled, moderation) on public.a41_photo_settings to authenticated;
create policy photo_settings_select on public.a41_photo_settings for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy photo_settings_update on public.a41_photo_settings for update to authenticated
  using ((select a41_private.is_event_owner(event_id)))
  with check ((select a41_private.is_event_owner(event_id)));

grant select on public.a41_photo_consents to authenticated;
create policy photo_consents_select on public.a41_photo_consents for select to authenticated
  using ((select a41_private.is_event_member(event_id)));

grant select on public.a41_photos to authenticated;
grant update (status) on public.a41_photos to authenticated;
grant delete on public.a41_photos to authenticated;
create policy photos_select on public.a41_photos for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy photos_update on public.a41_photos for update to authenticated
  using (status <> 'removed' and (select a41_private.is_event_owner(event_id)))
  with check (status in ('pending', 'approved', 'rejected') and (select a41_private.is_event_owner(event_id)));
create policy photos_delete on public.a41_photos for delete to authenticated
  using ((select a41_private.is_event_owner(event_id)));