-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_live_screens.
-- Live screens: an event's named outputs (main LED, side screens, foyer TVs), each with its own size and its
-- own "program": the one source it shows now. A source is one of the 7 stage modules or a custom scene
-- (a presentation as slide images, an image slideshow, or a video, with its own frame and footer).
-- Admin organizers and screen managers manage screens and scenes, preview a source, then take it live.
-- Output computers read a screen by its id (a41_screen_feed), signed in or not.

create table public.a41_screens (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.a41_events(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  width integer not null check (width between 320 and 7680),
  height integer not null check (height between 240 and 4320),
  position integer not null default 0,
  program jsonb not null default '{"source": "module:welcome", "slide": 0}'::jsonb,
  rev integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create index a41_screens_event_idx on public.a41_screens (event_id, position);
create index a41_screens_updated_by_idx on public.a41_screens (updated_by);

create table public.a41_scenes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.a41_events(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  kind text not null check (kind in ('slides', 'images', 'video')),
  -- [{ "url": "...", "path": "<event id>/...", "w": 1920, "h": 1080 }]
  media jsonb not null default '[]'::jsonb check (jsonb_typeof(media) = 'array' and jsonb_array_length(media) <= 300),
  -- images: { "seconds": 8 }; video: { "loop": true, "sound": false }; all: { "fit": "contain" | "cover" }
  options jsonb not null default '{}'::jsonb check (jsonb_typeof(options) = 'object'),
  -- A stage frame: { preset, imageUrl, imageBlend, footerOn, footerText, footerLogo, footerStyle, footerImageUrl }
  frame jsonb not null default '{}'::jsonb check (jsonb_typeof(frame) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
create index a41_scenes_event_idx on public.a41_scenes (event_id);
create index a41_scenes_created_by_idx on public.a41_scenes (created_by);

-- A program names a source that exists for this event; every change bumps rev so outputs notice it.
create or replace function a41_private.screen_before_write()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_source text := new.program->>'source';
  v_slide integer;
begin
  if tg_op = 'INSERT' or new.program is distinct from old.program then
    if v_source is null then
      raise exception 'invalid_screen_source';
    elsif v_source like 'module:%' then
      if substr(v_source, 8) <> all (array['welcome', 'photowall', 'quiz', 'raffle', 'rundown', 'menu', 'sponsors']) then
        raise exception 'invalid_screen_source';
      end if;
    elsif v_source like 'scene:%' then
      if not exists (
        select 1 from public.a41_scenes sc where sc.id::text = substr(v_source, 7) and sc.event_id = new.event_id
      ) then
        raise exception 'invalid_screen_source';
      end if;
    else
      raise exception 'invalid_screen_source';
    end if;
    begin
      v_slide := greatest(coalesce((new.program->>'slide')::integer, 0), 0);
    exception when others then
      raise exception 'invalid_screen_source';
    end;
    new.program := jsonb_build_object('source', v_source, 'slide', v_slide);
    if tg_op = 'UPDATE' then
      new.rev := old.rev + 1;
    end if;
  end if;
  if tg_op = 'UPDATE' then
    new.event_id := old.event_id;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end
$$;

create trigger a41_screens_before_write
  before insert or update on public.a41_screens
  for each row execute function a41_private.screen_before_write();

create or replace function a41_private.scene_before_write()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  else
    new.event_id := old.event_id;
    new.created_by := old.created_by;
  end if;
  new.updated_at := now();
  return new;
end
$$;

create trigger a41_scenes_before_write
  before insert or update on public.a41_scenes
  for each row execute function a41_private.scene_before_write();

-- A deleted scene leaves every screen that showed it on the welcome module.
create or replace function a41_private.scene_after_delete()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.a41_screens
  set program = '{"source": "module:welcome", "slide": 0}'::jsonb
  where event_id = old.event_id and program->>'source' = 'scene:' || old.id::text;
  return old;
end
$$;

create trigger a41_scenes_after_delete
  after delete on public.a41_scenes
  for each row execute function a41_private.scene_after_delete();

-- Admin organizers and screen managers run the screens; the register desk can look but not change.
alter table public.a41_screens enable row level security;
alter table public.a41_scenes enable row level security;
revoke all on public.a41_screens, public.a41_scenes from anon, authenticated;
grant select, insert, update, delete on public.a41_screens, public.a41_scenes to authenticated;

create policy screens_select on public.a41_screens for select to authenticated
  using ((select a41_private.is_event_member(event_id)) or (select a41_private.is_event_screen(event_id)));
create policy screens_insert on public.a41_screens for insert to authenticated
  with check ((select a41_private.is_event_screen(event_id)));
create policy screens_update on public.a41_screens for update to authenticated
  using ((select a41_private.is_event_screen(event_id)))
  with check ((select a41_private.is_event_screen(event_id)));
create policy screens_delete on public.a41_screens for delete to authenticated
  using ((select a41_private.is_event_screen(event_id)));

create policy scenes_select on public.a41_scenes for select to authenticated
  using ((select a41_private.is_event_member(event_id)) or (select a41_private.is_event_screen(event_id)));
create policy scenes_insert on public.a41_scenes for insert to authenticated
  with check ((select a41_private.is_event_screen(event_id)));
create policy scenes_update on public.a41_scenes for update to authenticated
  using ((select a41_private.is_event_screen(event_id)))
  with check ((select a41_private.is_event_screen(event_id)));
create policy scenes_delete on public.a41_scenes for delete to authenticated
  using ((select a41_private.is_event_screen(event_id)));

-- What one output shows: the screen, its program, and the scene behind it. Anyone holding the screen's id
-- (the output computer) may read it; nothing private is in it.
create or replace function public.a41_screen_feed(p_screen uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'screen', jsonb_build_object(
      'id', s.id, 'name', s.name, 'width', s.width, 'height', s.height, 'program', s.program, 'rev', s.rev
    ),
    'event', jsonb_build_object(
      'slug', e.slug,
      'name', e.name,
      'logo', case when e.site->'design'->>'logoUrl' like 'https://%' then e.site->'design'->>'logoUrl' end
    ),
    'scene', (
      select jsonb_build_object(
        'id', sc.id, 'title', sc.title, 'kind', sc.kind, 'media', sc.media, 'options', sc.options,
        'frame', sc.frame, 'updated_at', sc.updated_at
      )
      from public.a41_scenes sc
      where 'scene:' || sc.id::text = s.program->>'source'
    )
  )
  from public.a41_screens s
  join public.a41_events e on e.id = s.event_id
  where s.id = p_screen
$$;
revoke all on function public.a41_screen_feed(uuid) from public;
grant execute on function public.a41_screen_feed(uuid) to anon, authenticated;

-- Uploaded slides, images and videos: public files under <event id>/, written by the event's screen team.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('a41_screen_media', 'a41_screen_media', true, 52428800,
        array['image/webp', 'image/jpeg', 'image/png', 'video/mp4', 'video/webm'])
on conflict (id) do nothing;

create or replace function a41_private.can_edit_screen_folder(p_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.a41_events e
    where e.id::text = split_part(p_name, '/', 1)
      and a41_private.is_event_screen(e.id)
  )
$$;
revoke all on function a41_private.can_edit_screen_folder(text) from public, anon;
grant execute on function a41_private.can_edit_screen_folder(text) to authenticated;

create policy a41_screen_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'a41_screen_media' and (select a41_private.can_edit_screen_folder(name)));
create policy a41_screen_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'a41_screen_media' and (select a41_private.can_edit_screen_folder(name)));
