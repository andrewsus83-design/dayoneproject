-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_quiz_live.
-- Live trivia on guests' phones. Additive: new columns, new functions, and new keys in the JSON the quiz
-- functions already return. Nothing the live app calls today changes shape.
--
--   * Every live session gets a 6-digit join code (unique among live sessions, new for every session).
--     Guests join with a41_quiz_join_code(code, pass token); only checked-in guests get in.
--   * A Games activity (event config games.activities[]) is copied into a41_quizzes / a41_quiz_questions with
--     a41_quiz_sync_activity, keyed by the activity id. A quiz that was already played keeps its questions (and
--     its history): changed questions archive it and start a fresh quiz for the activity.
--   * Per-quiz anonymity: leaderboards, the host's lobby list and the guest's own card show "No. 007" instead
--     of the short name.
--   * 3-2-1: start and next open the question 3 seconds from now; answers before that are refused (not_open)
--     and speed points count from the moment it opens.
--   * Points follow the steps the builder shows (src/lib/eventStore.ts quizPointLadder): full points in the
--     first 3 seconds, then one step down every 3 seconds, to half points in the last step.

-- ───────────────────────── Columns ─────────────────────────

alter table public.a41_quizzes
  add column activity_id text,
  add column anonymous boolean not null default false,
  add column archived_at timestamptz,
  add constraint a41_quizzes_activity_id_check check (activity_id is null or char_length(activity_id) between 1 and 64),
  add constraint a41_quizzes_archived_check check (archived_at is null or activity_id is null);

comment on column public.a41_quizzes.activity_id is 'The Games activity (event config games.activities[].id) this quiz was copied from.';
comment on column public.a41_quizzes.anonymous is 'Players show as their guest number ("No. 007") instead of their name.';
comment on column public.a41_quizzes.archived_at is 'Set when the activity''s questions changed after this quiz was played; a fresh quiz took its place.';

create unique index a41_quizzes_activity_key on public.a41_quizzes (event_id, activity_id) where activity_id is not null;

alter table public.a41_quiz_sessions
  add column join_code text,
  add constraint a41_quiz_sessions_join_code_check check (join_code ~ '^[0-9]{6}$');

comment on column public.a41_quiz_sessions.join_code is 'The 6-digit code guests type (or scan) to join; unique among live sessions.';

create unique index a41_quiz_sessions_join_code_key on public.a41_quiz_sessions (join_code) where phase <> 'finished';

-- ───────────────────────── Join codes ─────────────────────────

create function a41_private.new_quiz_join_code() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  tries integer := 0;
begin
  loop
    new.join_code := (100000 + floor(random() * 900000))::integer::text;
    exit when not exists (
      select 1 from public.a41_quiz_sessions s where s.join_code = new.join_code and s.phase <> 'finished'
    );
    tries := tries + 1;
    if tries >= 20 then
      raise exception 'join_code_unavailable' using errcode = 'check_violation', detail = 'Could not pick a join code. Try again.';
    end if;
  end loop;
  return new;
end
$$;

create trigger a41_quiz_sessions_join_code
before insert on public.a41_quiz_sessions
for each row execute function a41_private.new_quiz_join_code();

-- There are no sessions yet, so every row has a code from here on.
alter table public.a41_quiz_sessions alter column join_code set not null;

-- ───────────────────────── Helpers ─────────────────────────

-- Speed points by 3-second steps, as the builder shows them (quizPointLadder / quizPointsAt).
create or replace function a41_private.quiz_points(p_base integer, p_elapsed_ms integer, p_limit_seconds integer)
returns integer
language sql immutable set search_path = ''
as $$
  select case
    when l.steps = 1 then p_base
    else round(p_base - p_base::numeric * least(l.steps - 1, greatest(p_elapsed_ms, 0) / 3000) / (2 * (l.steps - 1)))::integer
  end
  from (select greatest(1, ceil(p_limit_seconds / 3.0))::integer as steps) l
$$;

-- How a player shows on screens and phones.
create function a41_private.quiz_label(p_name text, p_number integer, p_anonymous boolean)
returns text
language sql immutable set search_path = ''
as $$
  select case
    when p_anonymous then 'No. ' || lpad(p_number::text, greatest(3, char_length(p_number::text)), '0')
    else a41_private.display_name(p_name)
  end
$$;

-- A whole JSON number as an integer, or null (text, fractions, out of range).
create function a41_private.json_integer(p_value jsonb)
returns integer
language sql immutable set search_path = ''
as $$
  select case when jsonb_typeof(p_value) = 'number' then (
    select case when x.v = trunc(x.v) and abs(x.v) < 2147483648 then x.v::integer end
    from (select (p_value #>> '{}')::numeric as v) x
  ) end
$$;

-- Server time in epoch milliseconds, so screens and phones can line up their countdowns.
create function a41_private.epoch_ms()
returns bigint
language sql volatile set search_path = ''
as $$ select (extract(epoch from clock_timestamp()) * 1000)::bigint $$;

-- Up to 10 live quizzes per event; archived versions (replaced after they were played) do not count.
create or replace function a41_private.guard_quiz()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.title = btrim(new.title);
  if tg_op = 'INSERT'
    and (select count(*) from public.a41_quizzes where event_id = new.event_id and archived_at is null) >= 10 then
    raise exception 'quiz_limit' using errcode = 'check_violation', detail = 'An event can have up to 10 quizzes.';
  end if;
  return new;
end
$$;

-- ───────────────────────── State ─────────────────────────

-- The public state (big screens, phones through /api/quiz/<key>). The live session wins over finished ones.
create or replace function a41_private.quiz_state(p_event uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  s public.a41_quiz_sessions;
  q public.a41_quiz_questions;
  quiz public.a41_quizzes;
  player_count integer;
  answered_count integer;
  question jsonb;
  reveal jsonb;
  board jsonb;
begin
  select * into s from public.a41_quiz_sessions
  where event_id = p_event
  order by (phase <> 'finished') desc, created_at desc
  limit 1;
  if not found then
    return jsonb_build_object('session', null);
  end if;

  select * into quiz from public.a41_quizzes where id = s.quiz_id;
  select count(*) into player_count from public.a41_quiz_players where session_id = s.id;

  if s.phase in ('question', 'reveal') then
    select * into q from public.a41_quiz_questions where quiz_id = s.quiz_id and position = s.current_position;
    question := jsonb_build_object(
      'prompt', q.prompt,
      'options', to_jsonb(q.options),
      'timeLimit', q.time_limit_seconds,
      'basePoints', q.base_points,
      'openedAt', (extract(epoch from s.question_opened_at) * 1000)::bigint,
      'closesAt', (extract(epoch from s.question_closes_at) * 1000)::bigint
    );
    select count(*) into answered_count from public.a41_quiz_answers where session_id = s.id and question_id = q.id;
  end if;

  if s.phase = 'reveal' then
    reveal := jsonb_build_object(
      'correctIndex', q.correct_index,
      'counts', (
        select jsonb_agg(coalesce(c.n, 0) order by i.i)
        from generate_series(0, cardinality(q.options) - 1) as i (i)
        left join (
          select a.choice, count(*) as n from public.a41_quiz_answers a
          where a.session_id = s.id and a.question_id = q.id group by a.choice
        ) c on c.choice = i.i
      )
    );
  end if;

  if s.phase in ('reveal', 'finished') then
    select coalesce(jsonb_agg(
      jsonb_build_object('id', r.id, 'rank', r.rank, 'name', r.name, 'score', r.score, 'correct', r.correct_count)
      order by r.ord
    ), '[]'::jsonb) into board
    from (
      select
        a41_private.standing_id(p.guest_id) as id,
        a41_private.quiz_label(g.name, g.guest_number, quiz.anonymous) as name,
        p.score,
        p.correct_count,
        rank() over (order by p.score desc) as rank,
        row_number() over (order by p.score desc, p.total_time_ms, g.name, p.guest_id) as ord
      from public.a41_quiz_players p
      join public.a41_guests g on g.id = p.guest_id
      where p.session_id = s.id
      order by ord
      limit 10
    ) r;
  end if;

  return jsonb_build_object('session', jsonb_build_object(
    'id', s.id,
    'rev', s.rev,
    'phase', s.phase,
    'quizId', quiz.id,
    'activityId', quiz.activity_id,
    'quizTitle', quiz.title,
    'anonymous', quiz.anonymous,
    'questionCount', s.question_count,
    'position', s.current_position,
    'players', player_count,
    'answered', answered_count,
    'question', question,
    'reveal', reveal,
    'leaderboard', board
  ));
end
$$;

-- What the host's big screen sees: the public state plus the join code, the latest 50 players in the lobby,
-- whether guests can reach the event (only published events let them join), and the server time.
create function a41_private.quiz_host_state(p_event uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  state jsonb := a41_private.quiz_state(p_event);
  s public.a41_quiz_sessions;
  anon boolean;
  joined jsonb;
  published boolean;
begin
  select e.status = 'published' into published from public.a41_events e where e.id = p_event;
  if state->'session' is not null and jsonb_typeof(state->'session') = 'object' then
    select * into s from public.a41_quiz_sessions where id = (state->'session'->>'id')::uuid;
    anon := coalesce((state->'session'->>'anonymous')::boolean, false);
    state := jsonb_set(state, '{session,joinCode}', case when s.phase <> 'finished' then to_jsonb(s.join_code) else 'null'::jsonb end);
    if s.phase = 'lobby' then
      select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name) order by r.joined_at desc, r.id), '[]'::jsonb)
      into joined
      from (
        select a41_private.standing_id(p.guest_id) as id, a41_private.quiz_label(g.name, g.guest_number, anon) as name, p.joined_at
        from public.a41_quiz_players p
        join public.a41_guests g on g.id = p.guest_id
        where p.session_id = s.id
        order by p.joined_at desc, p.guest_id
        limit 50
      ) r;
      state := jsonb_set(state, '{session,lobbyPlayers}', joined);
    end if;
  end if;
  return state || jsonb_build_object('now', a41_private.epoch_ms(), 'published', coalesce(published, false));
end
$$;

-- A guest's own card. The live session wins over finished ones; "name" follows the quiz's anonymity.
create or replace function a41_private.quiz_me(p_guest public.a41_guests)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  s public.a41_quiz_sessions;
  anon boolean := false;
  player public.a41_quiz_players;
  answer public.a41_quiz_answers;
  player_count integer;
  my_rank integer;
  mine jsonb;
begin
  select * into s from public.a41_quiz_sessions
  where event_id = p_guest.event_id
  order by (phase <> 'finished') desc, created_at desc
  limit 1;
  if not found then
    return jsonb_build_object(
      'id', a41_private.standing_id(p_guest.id),
      'name', a41_private.display_name(p_guest.name),
      'number', p_guest.guest_number,
      'now', a41_private.epoch_ms(),
      'session', null
    );
  end if;

  select z.anonymous into anon from public.a41_quizzes z where z.id = s.quiz_id;
  select * into player from public.a41_quiz_players where session_id = s.id and guest_id = p_guest.id;
  select count(*) into player_count from public.a41_quiz_players where session_id = s.id;

  if player.guest_id is not null then
    select count(*) + 1 into my_rank from public.a41_quiz_players where session_id = s.id and score > player.score;
  end if;

  if s.phase in ('question', 'reveal') then
    select a.* into answer
    from public.a41_quiz_answers a
    join public.a41_quiz_questions q on q.id = a.question_id
    where a.session_id = s.id and a.guest_id = p_guest.id and q.quiz_id = s.quiz_id and q.position = s.current_position;
    if answer.guest_id is not null then
      mine := jsonb_build_object('position', s.current_position, 'choice', answer.choice);
      if s.phase = 'reveal' then
        mine := mine || jsonb_build_object('correct', answer.is_correct, 'points', answer.points, 'elapsedMs', answer.elapsed_ms);
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'id', a41_private.standing_id(p_guest.id),
    'name', a41_private.quiz_label(p_guest.name, p_guest.guest_number, coalesce(anon, false)),
    'number', p_guest.guest_number,
    'anonymous', coalesce(anon, false),
    'now', a41_private.epoch_ms(),
    'session', jsonb_build_object('id', s.id, 'rev', s.rev, 'phase', s.phase, 'position', s.current_position),
    'joined', player.guest_id is not null,
    'score', coalesce(player.score, 0),
    'correct', coalesce(player.correct_count, 0),
    'rank', my_rank,
    'players', player_count,
    'answer', mine
  );
end
$$;

-- ───────────────────────── Host ─────────────────────────

create or replace function public.a41_quiz_host_state(p_event uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if not a41_private.is_event_manager(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return a41_private.quiz_host_state(p_event);
end
$$;

-- Copies a Games activity into a quiz the live game can run. Returns {quizId, changed}.
create function public.a41_quiz_sync_activity(
  p_event uuid,
  p_activity_id text,
  p_title text,
  p_anonymous boolean,
  p_questions jsonb
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_activity text := btrim(coalesce(p_activity_id, ''));
  v_title text := left(coalesce(nullif(btrim(p_title), ''), 'Trivia'), 120);
  v_anonymous boolean := coalesce(p_anonymous, false);
  quiz public.a41_quizzes;
  live public.a41_quiz_sessions;
  wanted jsonb := '[]'::jsonb;
  stored jsonb;
  item jsonb;
  n integer := 0;
  label text;
  prompt text;
  opts text[];
  correct integer;
  secs integer;
  pts integer;
begin
  if p_event is null or not a41_private.is_event_manager(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if char_length(v_activity) not between 1 and 64 then
    raise exception 'invalid_quiz' using errcode = 'check_violation', detail = 'This activity has no id. Reload the page and try again.';
  end if;
  if p_questions is null or jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) = 0 then
    raise exception 'invalid_quiz' using errcode = 'check_violation', detail = 'Add at least one question first.';
  end if;
  if jsonb_array_length(p_questions) > 50 then
    raise exception 'invalid_quiz' using errcode = 'check_violation', detail = 'A quiz can have up to 50 questions.';
  end if;

  for item in select value from jsonb_array_elements(p_questions) loop
    n := n + 1;
    label := format('Question %s', n);
    if jsonb_typeof(item) <> 'object' then
      raise exception 'invalid_quiz' using errcode = 'check_violation', detail = format('%s is not valid.', label);
    end if;

    prompt := btrim(coalesce(item->>'text', ''));
    if prompt = '' then
      raise exception 'invalid_quiz' using errcode = 'check_violation', detail = format('%s needs a question.', label);
    end if;
    if char_length(prompt) > 300 then
      raise exception 'invalid_quiz' using errcode = 'check_violation',
        detail = format('%s is %s characters long. Keep it to 300.', label, char_length(prompt));
    end if;

    if jsonb_typeof(item->'options') is distinct from 'array' or jsonb_array_length(item->'options') not between 2 and 4 then
      raise exception 'invalid_quiz' using errcode = 'check_violation', detail = format('%s needs 2 to 4 answers.', label);
    end if;
    select array_agg(btrim(coalesce(o #>> '{}', '')) order by i) into opts
    from jsonb_array_elements(item->'options') with ordinality as t (o, i);
    for i in 1 .. cardinality(opts) loop
      if opts[i] = '' then
        raise exception 'invalid_quiz' using errcode = 'check_violation', detail = format('%s: answer %s is empty.', label, chr(64 + i));
      end if;
      if char_length(opts[i]) > 120 then
        raise exception 'invalid_quiz' using errcode = 'check_violation',
          detail = format('%s: answer %s is longer than 120 characters.', label, chr(64 + i));
      end if;
    end loop;

    correct := a41_private.json_integer(item->'answer');
    if correct is null or correct < 0 or correct >= cardinality(opts) then
      raise exception 'invalid_quiz' using errcode = 'check_violation', detail = format('%s: mark the correct answer.', label);
    end if;
    secs := a41_private.json_integer(item->'seconds');
    if secs is null or secs not between 10 and 60 then
      raise exception 'invalid_quiz' using errcode = 'check_violation', detail = format('%s: the timer must be 10 to 60 seconds.', label);
    end if;
    pts := a41_private.json_integer(item->'points');
    if pts is null or pts not between 100 and 10000 then
      raise exception 'invalid_quiz' using errcode = 'check_violation', detail = format('%s: points must be 100 to 10,000.', label);
    end if;

    wanted := wanted || jsonb_build_array(jsonb_build_object(
      'prompt', prompt, 'options', to_jsonb(opts), 'correct', correct, 'seconds', secs, 'points', pts
    ));
  end loop;

  -- One sync at a time per activity.
  perform pg_advisory_xact_lock(hashtextextended('a41_quiz_sync:' || p_event::text || ':' || v_activity, 0));

  select * into quiz from public.a41_quizzes where event_id = p_event and activity_id = v_activity for update;
  if found then
    select coalesce(jsonb_agg(jsonb_build_object(
      'prompt', q.prompt, 'options', to_jsonb(q.options), 'correct', q.correct_index,
      'seconds', q.time_limit_seconds, 'points', q.base_points
    ) order by q.position), '[]'::jsonb) into stored
    from public.a41_quiz_questions q where q.quiz_id = quiz.id;

    select * into live from public.a41_quiz_sessions where quiz_id = quiz.id and phase <> 'finished';
    if found then
      if stored is distinct from wanted then
        raise exception 'quiz_live' using errcode = 'check_violation',
          detail = 'This game is open on the big screen. End it before changing its questions.';
      end if;
      -- Before the first question the name and the anonymity can still change.
      if live.phase = 'lobby' then
        update public.a41_quizzes set title = v_title, anonymous = v_anonymous
        where id = quiz.id and (title, anonymous) is distinct from (v_title, v_anonymous);
      end if;
      return jsonb_build_object('quizId', quiz.id, 'changed', false);
    end if;

    update public.a41_quizzes set title = v_title, anonymous = v_anonymous
    where id = quiz.id and (title, anonymous) is distinct from (v_title, v_anonymous);

    if stored = wanted then
      return jsonb_build_object('quizId', quiz.id, 'changed', false);
    end if;

    if exists (select 1 from public.a41_quiz_sessions where quiz_id = quiz.id) then
      -- Played before: keep that quiz (and its results) as it was and start a fresh one for the activity.
      update public.a41_quizzes set activity_id = null, archived_at = now() where id = quiz.id;
      quiz := null;
    else
      delete from public.a41_quiz_questions where quiz_id = quiz.id;
    end if;
  end if;

  if quiz.id is null then
    insert into public.a41_quizzes (event_id, title, activity_id, anonymous)
    values (p_event, v_title, v_activity, v_anonymous)
    returning * into quiz;
  end if;

  insert into public.a41_quiz_questions (quiz_id, event_id, position, prompt, options, correct_index, time_limit_seconds, base_points)
  select
    quiz.id,
    p_event,
    t.i::integer,
    t.w->>'prompt',
    array(select jsonb_array_elements_text(t.w->'options')),
    (t.w->>'correct')::smallint,
    (t.w->>'seconds')::smallint,
    (t.w->>'points')::integer
  from jsonb_array_elements(wanted) with ordinality as t (w, i);

  return jsonb_build_object('quizId', quiz.id, 'changed', true);
end
$$;

create or replace function public.a41_quiz_open_lobby(p_quiz uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  quiz public.a41_quizzes;
  questions integer;
  tries integer := 0;
  failed text;
begin
  select * into quiz from public.a41_quizzes where id = p_quiz;
  if not found or not a41_private.is_event_manager(quiz.event_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select count(*) into questions from public.a41_quiz_questions where quiz_id = quiz.id;
  if questions = 0 then
    raise exception 'quiz_has_no_questions' using errcode = 'check_violation', detail = 'Add at least one question first.';
  end if;

  loop
    begin
      insert into public.a41_quiz_sessions (event_id, quiz_id, question_count) values (quiz.event_id, quiz.id, questions);
      exit;
    exception when unique_violation then
      get stacked diagnostics failed = constraint_name;
      -- Two lobbies opened at the same moment drew the same code: draw again.
      if failed = 'a41_quiz_sessions_join_code_key' and tries < 3 then
        tries := tries + 1;
      else
        raise exception 'session_already_live' using errcode = 'check_violation', detail = 'This event already has a live quiz.';
      end if;
    end;
  end loop;

  return a41_private.quiz_host_state(quiz.event_id);
end
$$;

-- start / next open the question 3 seconds from now (the 3-2-1 on screens and phones).
create or replace function public.a41_quiz_control(p_session uuid, p_action text, p_position integer default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  s public.a41_quiz_sessions;
  q public.a41_quiz_questions;
  t timestamptz := clock_timestamp();
  opens timestamptz;
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
      return a41_private.quiz_host_state(s.event_id);
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
    return a41_private.quiz_host_state(s.event_id);

  elsif p_action = 'next' then
    if p_position is not null and p_position is distinct from s.current_position then
      raise exception 'stale_question' using errcode = 'check_violation', detail = 'The quiz has moved on.';
    end if;
    if s.phase <> 'reveal' then
      raise exception 'invalid_transition' using errcode = 'check_violation', detail = 'Reveal the answer before moving on.';
    end if;
    if s.current_position >= s.question_count then
      update public.a41_quiz_sessions set phase = 'finished', finished_at = t, rev = rev + 1 where id = s.id;
      return a41_private.quiz_host_state(s.event_id);
    end if;
    target := s.current_position + 1;

  elsif p_action = 'end' then
    if s.phase = 'finished' then
      return a41_private.quiz_host_state(s.event_id);
    end if;
    update public.a41_quiz_sessions set phase = 'finished', finished_at = t, rev = rev + 1 where id = s.id;
    return a41_private.quiz_host_state(s.event_id);

  else
    raise exception 'invalid_transition' using errcode = 'check_violation', detail = 'Unknown action.';
  end if;

  -- start and next both open question number `target`, after a 3-second countdown
  select * into q from public.a41_quiz_questions where quiz_id = s.quiz_id and position = target;
  if not found then
    -- a question was removed behind our back; do not leave the session stuck
    raise exception 'invalid_transition' using errcode = 'check_violation', detail = 'That question no longer exists.';
  end if;
  opens := t + interval '3 seconds';
  update public.a41_quiz_sessions
  set phase = 'question',
      current_position = target,
      question_opened_at = opens,
      question_closes_at = opens + make_interval(secs => q.time_limit_seconds),
      rev = rev + 1
  where id = s.id;
  return a41_private.quiz_host_state(s.event_id);
end
$$;

-- ───────────────────────── Guests ─────────────────────────

-- Joins the live game with the code on the big screen. Checked-in guests only.
-- Returns {ok: false, reason} (no_pass, not_checked_in, no_game, finished, wrong_code), or the guest's card
-- (as a41_quiz_me) with ok: true and the play key for /api/quiz/<key>.
create function public.a41_quiz_join_code(p_code text, p_token text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  g public.a41_guests;
  s public.a41_quiz_sessions;
  v_code text := regexp_replace(coalesce(p_code, ''), '\D', '', 'g');
begin
  select * into g from a41_private.checked_in_guest_by_token(p_token);
  if not found then
    if exists (select 1 from a41_private.guest_by_token(p_token)) then
      return jsonb_build_object('ok', false, 'reason', 'not_checked_in');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'no_pass');
  end if;

  select * into s from public.a41_quiz_sessions where event_id = g.event_id and phase <> 'finished';
  if not found then
    if exists (select 1 from public.a41_quiz_sessions where event_id = g.event_id) then
      return jsonb_build_object('ok', false, 'reason', 'finished');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'no_game');
  end if;
  if s.join_code is distinct from v_code then
    return jsonb_build_object('ok', false, 'reason', 'wrong_code');
  end if;

  insert into public.a41_quiz_players (session_id, guest_id, event_id) values (s.id, g.id, g.event_id)
  on conflict do nothing;
  return a41_private.quiz_me(g) || jsonb_build_object('ok', true, 'playKey', a41_private.game_key(g.event_id));
end
$$;

-- Answers are refused before the countdown ends (not_open); speed counts from the moment the question opens.
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
  if t < s.question_opened_at then
    return jsonb_build_object('ok', false, 'reason', 'not_open', 'opensAt', (extract(epoch from s.question_opened_at) * 1000)::bigint);
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

-- ───────────────────────── Grants ─────────────────────────

revoke all on function
  a41_private.new_quiz_join_code(),
  a41_private.quiz_label(text, integer, boolean),
  a41_private.json_integer(jsonb),
  a41_private.epoch_ms(),
  a41_private.quiz_host_state(uuid)
from public, anon, authenticated;

revoke execute on function public.a41_quiz_sync_activity(uuid, text, text, boolean, jsonb) from public, anon;
grant execute on function public.a41_quiz_sync_activity(uuid, text, text, boolean, jsonb) to authenticated;

revoke execute on function public.a41_quiz_join_code(text, text) from public;
grant execute on function public.a41_quiz_join_code(text, text) to anon, authenticated;
