-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_screen_wall_key.
-- The photo wall module on a live screen needs the event's wall key (the key that reads approved photos).
-- Output computers get it with their screen's feed; the switcher's preview gets it with a41_screen_wall_key.
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
      'logo', case when e.site->'design'->>'logoUrl' like 'https://%' then e.site->'design'->>'logoUrl' end,
      'wall_key', (select ps.wall_key from public.a41_photo_settings ps where ps.event_id = e.id)
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

create or replace function public.a41_screen_wall_key(p_event uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select ps.wall_key from public.a41_photo_settings ps
  where ps.event_id = p_event and a41_private.is_event_screen(p_event)
$$;
revoke all on function public.a41_screen_wall_key(uuid) from public, anon;
grant execute on function public.a41_screen_wall_key(uuid) to authenticated;
