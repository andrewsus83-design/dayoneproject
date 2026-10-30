-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_stage_state.
-- The stage LED screen across devices: the operator (StageLedEditor, an event manager) sets what the big screen
-- shows, and every stage screen reads it through the cached /api/stage/<slug> route.
--
-- One row per event: the module on screen (only the 7 system modules: welcome, photowall, quiz, raffle, rundown,
-- menu, sponsors, enforced by CHECK constraints), auto-rotate, each module's on/off and slide time, the ticker text,
-- the door prize on stage, and a rev that goes up with every change. Writes go through a41_set_stage_state
-- (managers only); a41_stage_public is the read-only view for the public stage page, with the check-in count, the
-- latest revealed door prize winner and, when a trivia game is open, its join code. Additive only.

-- True for a list of at most 7 distinct system modules, each {id, enabled (boolean), seconds (5–300)}.
create function a41_private.stage_modules_ok(p_modules jsonb)
returns boolean
language plpgsql immutable set search_path = ''
as $$
declare
  m jsonb;
  seen text[] := '{}';
begin
  if jsonb_typeof(p_modules) is distinct from 'array' or jsonb_array_length(p_modules) > 7 then
    return false;
  end if;
  for m in select x.value from jsonb_array_elements(p_modules) as x loop
    if jsonb_typeof(m) is distinct from 'object'
      or not (coalesce(m->>'id', '') = any (array['welcome', 'photowall', 'quiz', 'raffle', 'rundown', 'menu', 'sponsors']))
      or (m->>'id') = any (seen)
      or jsonb_typeof(m->'enabled') is distinct from 'boolean'
      or coalesce(m->>'seconds', '') !~ '^[0-9]{1,3}$' then
      return false;
    end if;
    if (m->>'seconds')::integer not between 5 and 300 then
      return false;
    end if;
    seen := seen || (m->>'id');
  end loop;
  return true;
end
$$;

create table public.a41_stage_state (
  event_id uuid primary key references public.a41_events (id) on delete cascade,
  active_module text not null default 'welcome'
    constraint a41_stage_state_module_check
    check (active_module in ('welcome', 'photowall', 'quiz', 'raffle', 'rundown', 'menu', 'sponsors')),
  auto_rotate boolean not null default true,
  modules jsonb not null default '[]'::jsonb
    constraint a41_stage_state_modules_check check (a41_private.stage_modules_ok(modules)),
  ticker text constraint a41_stage_state_ticker_check check (ticker is null or char_length(ticker) between 1 and 300),
  doorprize_id text constraint a41_stage_state_doorprize_check check (doorprize_id is null or char_length(doorprize_id) between 1 and 80),
  rev integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.a41_stage_state enable row level security;
revoke all on public.a41_stage_state from anon, authenticated;
grant select on public.a41_stage_state to authenticated;
create policy stage_state_select on public.a41_stage_state for select to authenticated
  using ((select a41_private.is_event_member(event_id)));

create function a41_private.stage_state_json(s public.a41_stage_state)
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'active_module', s.active_module,
    'auto_rotate', s.auto_rotate,
    'modules', s.modules,
    'ticker', s.ticker,
    'doorprize_id', s.doorprize_id,
    'rev', s.rev,
    'updated_at', s.updated_at
  )
$$;

-- Changes what the stage shows (managers only). Keys left out of p_state keep their value:
-- active_module, auto_rotate, modules [{id, enabled, seconds}], ticker (empty = the event's own info),
-- doorprize_id (the door prize on stage). Returns the new state with its rev.
create function public.a41_set_stage_state(p_event uuid, p_state jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_cur public.a41_stage_state;
  v_row public.a41_stage_state;
  v_module text;
  v_auto boolean;
  v_modules jsonb;
  v_ticker text;
  v_doorprize text;
begin
  if p_event is null or not a41_private.is_event_manager(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if jsonb_typeof(p_state) is distinct from 'object' then
    raise exception 'invalid_stage_state';
  end if;

  select * into v_cur from public.a41_stage_state s where s.event_id = p_event for update;

  v_module := case when p_state ? 'active_module' then p_state->>'active_module' else coalesce(v_cur.active_module, 'welcome') end;
  if v_module is null or not (v_module = any (array['welcome', 'photowall', 'quiz', 'raffle', 'rundown', 'menu', 'sponsors'])) then
    raise exception 'invalid_stage_module';
  end if;

  if p_state ? 'auto_rotate' then
    if jsonb_typeof(p_state->'auto_rotate') is distinct from 'boolean' then
      raise exception 'invalid_stage_state';
    end if;
    v_auto := (p_state->>'auto_rotate')::boolean;
  else
    v_auto := coalesce(v_cur.auto_rotate, true);
  end if;

  if p_state ? 'modules' then
    if not a41_private.stage_modules_ok(p_state->'modules') then
      raise exception 'invalid_stage_modules';
    end if;
    select coalesce(jsonb_agg(
      jsonb_build_object('id', x.m->>'id', 'enabled', (x.m->>'enabled')::boolean, 'seconds', (x.m->>'seconds')::integer)
      order by x.o
    ), '[]'::jsonb)
    into v_modules
    from jsonb_array_elements(p_state->'modules') with ordinality as x (m, o);
  else
    v_modules := coalesce(v_cur.modules, '[]'::jsonb);
  end if;

  if p_state ? 'ticker' then
    v_ticker := nullif(btrim(coalesce(p_state->>'ticker', '')), '');
    if char_length(v_ticker) > 300 then
      raise exception 'ticker_too_long';
    end if;
  else
    v_ticker := v_cur.ticker;
  end if;

  if p_state ? 'doorprize_id' then
    v_doorprize := nullif(btrim(coalesce(p_state->>'doorprize_id', '')), '');
    if char_length(v_doorprize) > 80 then
      raise exception 'invalid_stage_state';
    end if;
  else
    v_doorprize := v_cur.doorprize_id;
  end if;

  insert into public.a41_stage_state as s (event_id, active_module, auto_rotate, modules, ticker, doorprize_id, updated_by)
  values (p_event, v_module, v_auto, v_modules, v_ticker, v_doorprize, auth.uid())
  on conflict (event_id) do update
  set active_module = excluded.active_module,
      auto_rotate = excluded.auto_rotate,
      modules = excluded.modules,
      ticker = excluded.ticker,
      doorprize_id = excluded.doorprize_id,
      rev = s.rev + 1,
      updated_at = now(),
      updated_by = excluded.updated_by
  returning * into v_row;

  return a41_private.stage_state_json(v_row);
end
$$;

-- What the public stage page shows for a published event (organizers and desk staff also get their drafts):
-- the event basics, the stage state (null until the operator sets one), the check-in count, the door prize on
-- stage, the latest revealed door prize winner (names or guest numbers only) and the open trivia game, if any.
create function public.a41_stage_public(p_slug text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  e public.a41_events;
  s public.a41_stage_state;
  v_quiz jsonb;
  v_doorprize jsonb;
begin
  select * into e from public.a41_events ev where ev.slug = p_slug;
  if not found or not (e.status = 'published' or a41_private.is_event_member(e.id)) then
    return null;
  end if;

  select * into s from public.a41_stage_state st where st.event_id = e.id;

  if s.doorprize_id is not null then
    select jsonb_build_object(
      'config_id', p.config_id, 'name', p.name, 'prize', p.prize_label, 'quantity', p.quantity,
      'awarded', (select count(*) from public.a41_raffle_draws d where d.prize_id = p.id and d.status = 'won')
    ) into v_doorprize
    from public.a41_raffle_prizes p
    where p.event_id = e.id and p.config_id = s.doorprize_id;
  end if;

  -- The trivia game belongs to the games screens; if its tables change, the stage simply shows no game.
  begin
    select jsonb_build_object(
      'phase', q.phase,
      'title', (select z.title from public.a41_quizzes z where z.id = q.quiz_id),
      'join_code', q.join_code,
      'position', q.current_position,
      'question_count', q.question_count,
      'players', (select count(*) from public.a41_quiz_players qp where qp.session_id = q.id)
    ) into v_quiz
    from public.a41_quiz_sessions q
    where q.event_id = e.id and q.phase <> 'finished'
    order by q.created_at desc
    limit 1;
  exception when others then
    v_quiz := null;
  end;

  return jsonb_build_object(
    'event', jsonb_build_object(
      'name', e.name, 'slug', e.slug, 'type', e.type, 'timezone', e.timezone,
      'starts_at', e.starts_at, 'ends_at', e.ends_at, 'venue_name', e.venue_name
    ),
    'stage', case when s.event_id is not null then a41_private.stage_state_json(s) end,
    'checked_in', (select count(*) from public.a41_checkins c where c.event_id = e.id),
    'doorprize', v_doorprize,
    'latest_winner', a41_private.door_prize_latest(e.id, true),
    'quiz', v_quiz
  );
end
$$;

revoke all on function a41_private.stage_modules_ok(jsonb) from public, anon, authenticated;
revoke all on function a41_private.stage_state_json(public.a41_stage_state) from public, anon, authenticated;
revoke all on function public.a41_set_stage_state(uuid, jsonb) from public, anon;
grant execute on function public.a41_set_stage_state(uuid, jsonb) to authenticated;
revoke all on function public.a41_stage_public(text) from public;
grant execute on function public.a41_stage_public(text) to anon, authenticated;
