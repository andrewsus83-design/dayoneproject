-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) as a41_screen_chrome (version 20261102061622).
-- A screen's "look": one header, frame and footer set on the live screen itself, drawn around whatever it shows
-- (a stage module, slides, images, a video, a link), instead of every stage module and custom screen drawing its own.
--   chrome: null (the default) = the screen is drawn as before; otherwise an object
--   { on, header, frame: { preset, imageUrl, imageBlend }, footer: 'off' | 'ticker' | 'bar' | 'image',
--     footerText, footerStyle, footerLogo, footerImageUrl } (lib/screenChrome.ts normalizes it).
-- Changing it bumps rev, so output pages notice it at their next poll like a take. The feed also hands out the
-- event's date and venue, which the header shows.

alter table public.a41_screens
  add column chrome jsonb
  check (chrome is null or (jsonb_typeof(chrome) = 'object' and octet_length(chrome::text) <= 4000));

create or replace function a41_private.screen_before_write()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_source text := new.program->>'source';
  v_slide integer;
  v_changed boolean := false;
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
    v_changed := true;
  end if;
  if tg_op = 'UPDATE' then
    if v_changed or new.chrome is distinct from old.chrome then
      new.rev := old.rev + 1;
    end if;
    new.event_id := old.event_id;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end
$$;

create or replace function public.a41_screen_feed(p_screen uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'screen', jsonb_build_object(
      'id', s.id, 'name', s.name, 'width', s.width, 'height', s.height, 'program', s.program, 'rev', s.rev,
      'chrome', s.chrome
    ),
    'event', jsonb_build_object(
      'slug', e.slug,
      'name', e.name,
      'logo', case when e.site->'design'->>'logoUrl' like 'https://%' then e.site->'design'->>'logoUrl' end,
      'wall_key', (select ps.wall_key from public.a41_photo_settings ps where ps.event_id = e.id),
      'starts_at', e.starts_at,
      'venue_name', e.venue_name
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
