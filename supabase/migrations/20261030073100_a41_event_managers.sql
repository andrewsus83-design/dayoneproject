-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_event_managers.
-- Audit M2: register desk staff (membership role 'staff') run the door, nothing else. Guest edits, guest contact
-- details and pass tokens, raffle draws, quiz hosting, hunt codes and WhatsApp history belong to the event's
-- managers (owner memberships). Staff keep the check-in RPCs, which only return what the door needs.

-- Can manage the event: an owner of the organization that runs it. Desk staff are members but not managers.
create or replace function a41_private.is_event_manager(p_event uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.a41_events e
    join public.a41_memberships m on m.org_id = e.org_id
    where e.id = p_event and m.user_id = (select auth.uid()) and m.role = 'owner'
  )
$$;
revoke all on function a41_private.is_event_manager(uuid) from public, anon;
grant execute on function a41_private.is_event_manager(uuid) to authenticated;

-- Guests (names, contacts, pass tokens) and their RSVPs: managers only. The door reads them through the
-- check-in RPCs instead.
alter policy guests_select on public.a41_guests using ((select a41_private.is_event_manager(event_id)));
alter policy guests_insert on public.a41_guests with check ((select a41_private.is_event_manager(event_id)));
alter policy guests_update on public.a41_guests
  using ((select a41_private.is_event_manager(event_id)))
  with check ((select a41_private.is_event_manager(event_id)));
alter policy guests_delete on public.a41_guests using ((select a41_private.is_event_manager(event_id)));
alter policy rsvps_select on public.a41_rsvps using ((select a41_private.is_event_manager(event_id)));

-- Quiz answers and hunt codes would let staff win the games.
alter policy quiz_questions_select on public.a41_quiz_questions using ((select a41_private.is_event_manager(event_id)));
alter policy hunt_missions_select on public.a41_hunt_missions using ((select a41_private.is_event_manager(event_id)));

-- WhatsApp history holds every guest's phone number and message.
alter policy wa_messages_select on public.a41_wa_messages using ((select a41_private.is_org_owner(org_id)));

create or replace function public.a41_wa_stats(p_event uuid)
returns json
language sql stable security definer set search_path = ''
as $$
  select case
    when not exists (
      select 1 from public.a41_events e where e.id = p_event and (select a41_private.is_org_owner(e.org_id))
    ) then null
    else (
      select json_build_object(
        'waiting', count(*) filter (where m.status in ('queued', 'sending')),
        'sent', count(*) filter (where m.status = 'sent'),
        'failed', count(*) filter (where m.status = 'failed'),
        'cancelled', count(*) filter (where m.status = 'cancelled'),
        'lastSentAt', max(m.sent_at),
        'held', (
          select h.error from public.a41_wa_messages h
          where h.event_id = p_event and h.status = 'queued' and h.error like 'held:%'
          order by h.id desc limit 1
        ),
        'lastFailure', (
          select f.error from public.a41_wa_messages f
          where f.event_id = p_event and f.status = 'failed'
          order by f.id desc limit 1
        ),
        -- Everything waiting up to this event's last message, from every organization, goes out first.
        'ahead', (
          select count(*) from public.a41_wa_messages w
          where w.status in ('queued', 'sending')
            and w.id <= (
              select max(x.id) from public.a41_wa_messages x
              where x.event_id = p_event and x.status in ('queued', 'sending')
            )
        )
      )
      from public.a41_wa_messages m
      where m.event_id = p_event
    )
  end
$$;

-- Door prize draws: managers only (same body as before, is_event_member → is_event_manager).
create or replace function public.a41_draw_raffle_winner(p_prize uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_event uuid;
  v_prize public.a41_raffle_prizes;
  v_guest uuid;
  v_name text;
  v_table text;
  v_tags text[];
  v_draw public.a41_raffle_draws;
begin
  select p.event_id into v_event from public.a41_raffle_prizes p where p.id = p_prize;
  -- a prize of someone else's event is reported like one that does not exist
  if v_event is null or not a41_private.is_event_manager(v_event) then
    raise exception 'prize_not_found';
  end if;

  perform a41_private.lock_raffle(v_event);

  -- Lock the prize while its count is checked, so an owner who lowers the quantity
  -- at the same moment waits for the draw (and is then refused if it would go below
  -- the winners), or the draw waits and sees the new quantity.
  select * into v_prize from public.a41_raffle_prizes p where p.id = p_prize for no key update;
  if not found then
    raise exception 'prize_not_found';
  end if;

  if (select count(*) from public.a41_raffle_draws d where d.prize_id = p_prize and d.status = 'won') >= v_prize.quantity then
    raise exception 'prize_fully_awarded';
  end if;

  v_guest := a41_private.pick_raffle_guest(v_event);
  if v_guest is null then
    raise exception 'no_eligible_guests';
  end if;

  select g.name, g.table_no, g.tags into v_name, v_table, v_tags from public.a41_guests g where g.id = v_guest;

  insert into public.a41_raffle_draws (event_id, prize_id, guest_id, guest_name, guest_table_no, drawn_by)
  values (v_event, p_prize, v_guest, v_name, v_table, auth.uid())
  returning * into v_draw;

  return jsonb_build_object(
    'draw', jsonb_build_object('id', v_draw.id, 'status', v_draw.status, 'drawn_at', v_draw.drawn_at),
    'guest', jsonb_build_object('name', v_name, 'table_no', v_table, 'tags', to_jsonb(v_tags)),
    'prize', a41_private.raffle_prize_json(p_prize),
    'remaining', (select count(*) from a41_private.raffle_pool(v_event)),
    'decoys', coalesce((
      select jsonb_agg(t.name)
      from (
        select p.name from a41_private.raffle_pool(v_event) p order by random() limit 40
      ) t
    ), '[]'::jsonb)
  );
end
$$;

create or replace function public.a41_forfeit_raffle_draw(p_draw uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_event uuid;
  v_draw public.a41_raffle_draws;
begin
  select d.event_id into v_event from public.a41_raffle_draws d where d.id = p_draw;
  if v_event is null or not a41_private.is_event_manager(v_event) then
    raise exception 'draw_not_found';
  end if;

  perform a41_private.lock_raffle(v_event);

  select * into v_draw from public.a41_raffle_draws d where d.id = p_draw;
  if v_draw.status <> 'won' then
    raise exception 'draw_not_open';
  end if;

  update public.a41_raffle_draws
  set status = 'forfeited', resolved_at = now(), resolved_by = auth.uid()
  where id = p_draw;

  return jsonb_build_object(
    'draw_id', p_draw,
    'prize', a41_private.raffle_prize_json(v_draw.prize_id),
    'remaining', (select count(*) from a41_private.raffle_pool(v_event))
  );
end
$$;

-- Quiz hosting: managers only.
create or replace function public.a41_quiz_host_state(p_event uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if not a41_private.is_event_manager(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return a41_private.quiz_state(p_event);
end
$$;

create or replace function public.a41_quiz_open_lobby(p_quiz uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  quiz public.a41_quizzes;
  questions integer;
begin
  select * into quiz from public.a41_quizzes where id = p_quiz;
  if not found or not a41_private.is_event_manager(quiz.event_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select count(*) into questions from public.a41_quiz_questions where quiz_id = quiz.id;
  if questions = 0 then
    raise exception 'quiz_has_no_questions' using errcode = 'check_violation', detail = 'Add at least one question first.';
  end if;

  begin
    insert into public.a41_quiz_sessions (event_id, quiz_id, question_count) values (quiz.event_id, quiz.id, questions);
  exception when unique_violation then
    raise exception 'session_already_live' using errcode = 'check_violation', detail = 'This event already has a live quiz.';
  end;

  return a41_private.quiz_state(quiz.event_id);
end
$$;

create or replace function public.a41_quiz_control(p_session uuid, p_action text, p_position integer default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  s public.a41_quiz_sessions;
  q public.a41_quiz_questions;
  t timestamptz := clock_timestamp();
  target integer;
begin
  select * into s from public.a41_quiz_sessions where id = p_session for update;
  if not found or not a41_private.is_event_manager(s.event_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_action = 'start' then
    if s.phase <> 'lobby' then
      raise exception 'invalid_transition' using errcode = 'check_violation', detail = 'The quiz has already started.';
    end if;
    target := 1;

  elsif p_action = 'reveal' then
    if p_position is not null and p_position is distinct from s.current_position then
      raise exception 'stale_question' using errcode = 'check_violation', detail = 'The quiz has moved on.';
    end if;
    if s.phase = 'reveal' then
      return a41_private.quiz_state(s.event_id);
    end if;
    if s.phase <> 'question' then
      raise exception 'invalid_transition' using errcode = 'check_violation', detail = 'There is no open question to reveal.';
    end if;

    select * into q from public.a41_quiz_questions where quiz_id = s.quiz_id and position = s.current_position;
    update public.a41_quiz_players p
    set score = p.score + a.points,
        correct_count = p.correct_count + (case when a.is_correct then 1 else 0 end),
        total_time_ms = p.total_time_ms + (case when a.is_correct then a.elapsed_ms else 0 end)
    from public.a41_quiz_answers a
    where p.session_id = s.id and a.session_id = s.id and a.question_id = q.id and a.guest_id = p.guest_id;
    update public.a41_quiz_sessions set phase = 'reveal', rev = rev + 1 where id = s.id;
    return a41_private.quiz_state(s.event_id);

  elsif p_action = 'next' then
    if p_position is not null and p_position is distinct from s.current_position then
      raise exception 'stale_question' using errcode = 'check_violation', detail = 'The quiz has moved on.';
    end if;
    if s.phase <> 'reveal' then
      raise exception 'invalid_transition' using errcode = 'check_violation', detail = 'Reveal the answer before moving on.';
    end if;
    if s.current_position >= s.question_count then
      update public.a41_quiz_sessions set phase = 'finished', finished_at = t, rev = rev + 1 where id = s.id;
      return a41_private.quiz_state(s.event_id);
    end if;
    target := s.current_position + 1;

  elsif p_action = 'end' then
    if s.phase = 'finished' then
      return a41_private.quiz_state(s.event_id);
    end if;
    update public.a41_quiz_sessions set phase = 'finished', finished_at = t, rev = rev + 1 where id = s.id;
    return a41_private.quiz_state(s.event_id);

  else
    raise exception 'invalid_transition' using errcode = 'check_violation', detail = 'Unknown action.';
  end if;

  -- start and next both open question number `target`
  select * into q from public.a41_quiz_questions where quiz_id = s.quiz_id and position = target;
  if not found then
    -- a question was removed behind our back; do not leave the session stuck
    raise exception 'invalid_transition' using errcode = 'check_violation', detail = 'That question no longer exists.';
  end if;
  update public.a41_quiz_sessions
  set phase = 'question',
      current_position = target,
      question_opened_at = t,
      question_closes_at = t + make_interval(secs => q.time_limit_seconds),
      rev = rev + 1
  where id = s.id;
  return a41_private.quiz_state(s.event_id);
end
$$;

-- The hunt host board shows every mission code: managers only.
create or replace function public.a41_hunt_host_board(p_event uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if not a41_private.is_event_manager(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'missions', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', m.id, 'title', m.title, 'hint', m.hint, 'points', m.points, 'code', m.code,
          'active', m.active, 'found', (select count(*) from public.a41_hunt_claims c where c.mission_id = m.id)
        ) order by m.position, m.created_at
      ), '[]'::jsonb)
      from public.a41_hunt_missions m where m.event_id = p_event
    ),
    'players', (select count(distinct c.guest_id) from public.a41_hunt_claims c where c.event_id = p_event),
    'leaderboard', a41_private.hunt_leaderboard(p_event, 20, true)
  );
end
$$;
