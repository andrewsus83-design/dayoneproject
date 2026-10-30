-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_checked_in_games.
-- Audit H9: day-of games only take guests who are checked in. A pass token alone (forwarded, or taken from a
-- phone outside) no longer joins the quiz, answers questions or opens the scavenger hunt. Signatures and return
-- shapes stay the same: a token that is unknown or not checked in returns null, as an unknown token did before.

-- The guest behind a pass token, only when the event is published and the guest has been checked in at the door.
create or replace function a41_private.checked_in_guest_by_token(p_token text)
returns setof public.a41_guests
language sql stable security definer set search_path = ''
as $$
  select g.*
  from a41_private.guest_by_token(p_token) g
  where exists (select 1 from public.a41_checkins c where c.guest_id = g.id)
$$;
revoke all on function a41_private.checked_in_guest_by_token(text) from public, anon, authenticated;

create or replace function public.a41_quiz_join(p_token text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  g public.a41_guests;
  s public.a41_quiz_sessions;
begin
  select * into g from a41_private.checked_in_guest_by_token(p_token);
  if not found then
    return null;
  end if;
  select * into s from public.a41_quiz_sessions where event_id = g.event_id and phase <> 'finished';
  if found then
    insert into public.a41_quiz_players (session_id, guest_id, event_id) values (s.id, g.id, g.event_id)
    on conflict do nothing;
  end if;
  return a41_private.quiz_me(g);
end
$$;

create or replace function public.a41_quiz_answer(p_token text, p_position integer, p_choice integer)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  g public.a41_guests;
  s public.a41_quiz_sessions;
  q public.a41_quiz_questions;
  t timestamptz := clock_timestamp();
  elapsed integer;
  right_answer boolean;
  earned integer;
  stored integer;
  earlier smallint;
begin
  select * into g from a41_private.checked_in_guest_by_token(p_token);
  if not found then
    return null;
  end if;

  -- A share lock on the session: the host's reveal waits for answers already in
  -- flight, so no answer can slip in after the question was scored.
  select * into s from public.a41_quiz_sessions where event_id = g.event_id and phase <> 'finished' for share;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_session');
  end if;
  if s.phase <> 'question' or s.current_position is distinct from p_position then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;
  if t >= s.question_closes_at then
    return jsonb_build_object('ok', false, 'reason', 'late');
  end if;

  select * into q from public.a41_quiz_questions where quiz_id = s.quiz_id and position = s.current_position;
  if p_choice is null or p_choice < 0 or p_choice >= cardinality(q.options) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_choice');
  end if;

  elapsed := greatest(0, round(extract(epoch from (t - s.question_opened_at)) * 1000))::integer;
  right_answer := p_choice = q.correct_index;
  earned := case when right_answer then a41_private.quiz_points(q.base_points, elapsed, q.time_limit_seconds) else 0 end;

  insert into public.a41_quiz_players (session_id, guest_id, event_id) values (s.id, g.id, g.event_id)
  on conflict do nothing;
  insert into public.a41_quiz_answers (session_id, question_id, guest_id, event_id, choice, answered_at, elapsed_ms, is_correct, points)
  values (s.id, q.id, g.id, g.event_id, p_choice, t, elapsed, right_answer, earned)
  on conflict do nothing;
  get diagnostics stored = row_count;

  if stored = 0 then
    select a.choice into earlier from public.a41_quiz_answers a
    where a.session_id = s.id and a.question_id = q.id and a.guest_id = g.id;
    return jsonb_build_object('ok', false, 'reason', 'already_answered', 'choice', earlier);
  end if;
  return jsonb_build_object('ok', true, 'choice', p_choice);
end
$$;

create or replace function public.a41_hunt_board(p_token text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  g public.a41_guests;
  total integer;
  claimed integer;
  better integer;
begin
  select * into g from a41_private.checked_in_guest_by_token(p_token);
  if not found then
    return null;
  end if;

  select coalesce(sum(c.points), 0), count(*) into total, claimed from public.a41_hunt_claims c where c.guest_id = g.id;
  select count(*) into better from (
    select c.guest_id from public.a41_hunt_claims c where c.event_id = g.event_id
    group by c.guest_id having sum(c.points) > total
  ) b;

  return jsonb_build_object(
    'id', a41_private.standing_id(g.id),
    'name', a41_private.display_name(g.name),
    'total', total,
    'claimed', claimed,
    'rank', case when claimed > 0 then better + 1 else null end,
    'missions', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', m.id, 'title', m.title, 'hint', m.hint, 'points', m.points,
          'done', c.guest_id is not null
        ) order by m.position, m.created_at
      ), '[]'::jsonb)
      from public.a41_hunt_missions m
      left join public.a41_hunt_claims c on c.mission_id = m.id and c.guest_id = g.id
      where m.event_id = g.event_id and m.active
    ),
    'leaderboard', a41_private.hunt_leaderboard(g.event_id, 10)
  );
end
$$;
