-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_screen_manager.
-- Screen managers: a third team role that only drives an event's stage screen (the module switcher at
-- /screen). They see their organization's event list and the stage state, and nothing about guests,
-- check-in, photos, games or door prizes.
alter table public.a41_memberships drop constraint a41_memberships_role_check;
alter table public.a41_memberships add constraint a41_memberships_role_check check (role in ('owner', 'staff', 'screen'));

-- Event members who work with guests: admin organizers and the register desk, never screen managers.
-- Every check-in, guest, photo, game and door prize rule builds on this.
create or replace function a41_private.is_event_member(p_event uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.a41_events e
    join public.a41_memberships m on m.org_id = e.org_id
    where e.id = p_event and m.user_id = (select auth.uid()) and m.role <> 'screen'
  )
$$;

-- Who may drive an event's stage screen: its admin organizers and screen managers.
create or replace function a41_private.is_event_screen(p_event uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.a41_events e
    join public.a41_memberships m on m.org_id = e.org_id
    where e.id = p_event and m.user_id = (select auth.uid()) and m.role in ('owner', 'screen')
  )
$$;
revoke all on function a41_private.is_event_screen(uuid) from public, anon;
grant execute on function a41_private.is_event_screen(uuid) to authenticated;

alter policy stage_state_select on public.a41_stage_state
  using ((select a41_private.is_event_member(event_id)) or (select a41_private.is_event_screen(event_id)));

-- Same as before, except screen managers may change the stage too.
create or replace function public.a41_set_stage_state(p_event uuid, p_state jsonb)
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
  if p_event is null or not a41_private.is_event_screen(p_event) then
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

-- Same as before, except screen managers can also follow a draft event's stage.
create or replace function public.a41_stage_public(p_slug text)
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
  if not found or not (e.status = 'published' or a41_private.is_event_member(e.id) or a41_private.is_event_screen(e.id)) then
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
