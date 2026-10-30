create table public.a41_game_keys (
  event_id uuid primary key references public.a41_events (id) on delete cascade,
  play_key text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

create table public.a41_quizzes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.a41_events (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, event_id)
);

create index a41_quizzes_event_id_idx on public.a41_quizzes (event_id);

create table public.a41_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null,
  event_id uuid not null,
  position integer not null check (position between 1 and 100),
  prompt text not null check (char_length(prompt) between 1 and 300),
  options text[] not null check (array_ndims(options) = 1 and cardinality(options) between 2 and 4),
  correct_index smallint not null,
  time_limit_seconds smallint not null default 20 check (time_limit_seconds between 10 and 60),
  base_points integer not null default 1000 check (base_points between 100 and 10000),
  created_at timestamptz not null default now(),
  foreign key (quiz_id, event_id) references public.a41_quizzes (id, event_id) on delete cascade,
  constraint a41_quiz_questions_position_key unique (quiz_id, position) deferrable initially deferred,
  check (correct_index >= 0 and correct_index < cardinality(options)),
  unique (id, quiz_id)
);

create table public.a41_quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  quiz_id uuid not null,
  phase text not null default 'lobby' check (phase in ('lobby', 'question', 'reveal', 'finished')),
  question_count integer not null check (question_count > 0),
  current_position integer,
  question_opened_at timestamptz,
  question_closes_at timestamptz,
  rev integer not null default 1,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  foreign key (quiz_id, event_id) references public.a41_quizzes (id, event_id) on delete cascade,
  unique (id, event_id),
  check (
    (phase = 'lobby' and current_position is null and question_opened_at is null and question_closes_at is null)
    or (
      phase in ('question', 'reveal')
      and current_position between 1 and question_count
      and question_opened_at is not null
      and question_closes_at > question_opened_at
    )
    or (phase = 'finished' and finished_at is not null)
  )
);

create unique index a41_quiz_sessions_live_key on public.a41_quiz_sessions (event_id) where phase <> 'finished';
create index a41_quiz_sessions_event_idx on public.a41_quiz_sessions (event_id, created_at desc);
create index a41_quiz_sessions_quiz_id_idx on public.a41_quiz_sessions (quiz_id);

create table public.a41_quiz_players (
  session_id uuid not null,
  guest_id uuid not null,
  event_id uuid not null,
  score integer not null default 0 check (score >= 0),
  correct_count smallint not null default 0 check (correct_count >= 0),
  total_time_ms bigint not null default 0 check (total_time_ms >= 0),
  joined_at timestamptz not null default now(),
  primary key (session_id, guest_id),
  foreign key (session_id, event_id) references public.a41_quiz_sessions (id, event_id) on delete cascade,
  foreign key (guest_id, event_id) references public.a41_guests (id, event_id) on delete cascade
);

create index a41_quiz_players_standing_idx on public.a41_quiz_players (session_id, score desc, total_time_ms);
create index a41_quiz_players_guest_idx on public.a41_quiz_players (guest_id);

create table public.a41_quiz_answers (
  session_id uuid not null,
  question_id uuid not null references public.a41_quiz_questions (id) on delete cascade,
  guest_id uuid not null,
  event_id uuid not null,
  choice smallint not null check (choice between 0 and 3),
  answered_at timestamptz not null,
  elapsed_ms integer not null check (elapsed_ms >= 0),
  is_correct boolean not null,
  points integer not null check (points >= 0),
  primary key (session_id, question_id, guest_id),
  foreign key (session_id, event_id) references public.a41_quiz_sessions (id, event_id) on delete cascade,
  foreign key (guest_id, event_id) references public.a41_guests (id, event_id) on delete cascade
);

create index a41_quiz_answers_guest_idx on public.a41_quiz_answers (guest_id);

create table public.a41_hunt_missions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.a41_events (id) on delete cascade,
  position integer not null check (position between 1 and 100),
  title text not null check (char_length(title) between 1 and 80),
  hint text check (char_length(hint) <= 200),
  points integer not null default 100 check (points between 1 and 1000),
  code text not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
    check (code ~ '^[A-Z0-9]{6,24}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, event_id),
  constraint a41_hunt_missions_event_code_key unique (event_id, code)
);

create index a41_hunt_missions_event_idx on public.a41_hunt_missions (event_id, position);

create table public.a41_hunt_claims (
  mission_id uuid not null,
  guest_id uuid not null,
  event_id uuid not null,
  points integer not null check (points > 0),
  claimed_at timestamptz not null default now(),
  primary key (mission_id, guest_id),
  foreign key (mission_id, event_id) references public.a41_hunt_missions (id, event_id) on delete cascade,
  foreign key (guest_id, event_id) references public.a41_guests (id, event_id) on delete cascade
);

create index a41_hunt_claims_standing_idx on public.a41_hunt_claims (event_id, guest_id);

create table public.a41_hunt_attempts (
  id bigint generated always as identity primary key,
  guest_id uuid not null references public.a41_guests (id) on delete cascade,
  attempted_at timestamptz not null default clock_timestamp()
);

create index a41_hunt_attempts_guest_idx on public.a41_hunt_attempts (guest_id, attempted_at desc);

create function a41_private.quiz_points(p_base integer, p_elapsed_ms integer, p_limit_seconds integer)
returns integer
language sql immutable set search_path = ''
as $$
  select (
    (p_base::bigint * (2 * l.ms - least(greatest(p_elapsed_ms, 0), l.ms)) + l.ms) / (2 * l.ms)
  )::integer
  from (select p_limit_seconds::bigint * 1000 as ms) l
$$;

create function a41_private.display_name(p_name text) returns text
language sql immutable set search_path = ''
as $$
  select case
    when cardinality(parts) > 1 then parts[1] || ' ' || upper(left(parts[cardinality(parts)], 1)) || '.'
    else parts[1]
  end
  from (select regexp_split_to_array(btrim(p_name), '\s+') as parts) s
$$;

create function a41_private.standing_id(p_guest uuid) returns text
language sql immutable set search_path = ''
as $$ select left(md5(p_guest::text), 8) $$;

create trigger a41_quizzes_set_updated_at before update on public.a41_quizzes
  for each row execute function a41_private.set_updated_at();

create function a41_private.guard_quiz() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.title = btrim(new.title);
  if tg_op = 'INSERT' and (select count(*) from public.a41_quizzes where event_id = new.event_id) >= 10 then
    raise exception 'quiz_limit' using errcode = 'check_violation', detail = 'An event can have up to 10 quizzes.';
  end if;
  return new;
end
$$;

create trigger a41_quizzes_guard before insert or update on public.a41_quizzes
  for each row execute function a41_private.guard_quiz();

create function a41_private.guard_quiz_question() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  cleaned text[];
begin
  -- deleting the whole quiz (or its event) takes its questions along
  if tg_op = 'DELETE' and not exists (select 1 from public.a41_quizzes z where z.id = old.quiz_id) then
    return old;
  end if;

  if exists (
    select 1 from public.a41_quiz_sessions s
    where s.quiz_id = case when tg_op = 'DELETE' then old.quiz_id else new.quiz_id end
  ) then
    raise exception 'quiz_in_use' using errcode = 'check_violation', detail = 'A quiz that has been played cannot be changed.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if tg_op = 'INSERT' then
    select q.event_id into new.event_id from public.a41_quizzes q where q.id = new.quiz_id;
    if (select count(*) from public.a41_quiz_questions where quiz_id = new.quiz_id) >= 50 then
      raise exception 'quiz_too_long' using errcode = 'check_violation', detail = 'A quiz can have up to 50 questions.';
    end if;
    if new.position is null then
      select coalesce(max(q.position), 0) + 1 into new.position from public.a41_quiz_questions q where q.quiz_id = new.quiz_id;
    end if;
  end if;

  new.prompt = btrim(new.prompt);
  select array_agg(btrim(o) order by ord) into cleaned from unnest(new.options) with ordinality as t (o, ord);
  if exists (select 1 from unnest(cleaned) o where o is null or char_length(o) not between 1 and 120) then
    raise exception 'invalid_options' using errcode = 'check_violation', detail = 'Every answer needs 1 to 120 characters.';
  end if;
  new.options = cleaned;
  return new;
end
$$;

create trigger a41_quiz_questions_guard before insert or update or delete on public.a41_quiz_questions
  for each row execute function a41_private.guard_quiz_question();

create function a41_private.guard_hunt_mission() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.title = btrim(new.title);
  new.hint = nullif(btrim(new.hint), '');
  new.code = upper(regexp_replace(new.code, '[^A-Za-z0-9]', '', 'g'));
  if tg_op = 'INSERT' then
    if (select count(*) from public.a41_hunt_missions where event_id = new.event_id) >= 50 then
      raise exception 'mission_limit' using errcode = 'check_violation', detail = 'A hunt can have up to 50 missions.';
    end if;
    if new.position is null then
      select coalesce(max(m.position), 0) + 1 into new.position from public.a41_hunt_missions m where m.event_id = new.event_id;
    end if;
  end if;
  return new;
end
$$;

create trigger a41_hunt_missions_guard before insert or update on public.a41_hunt_missions
  for each row execute function a41_private.guard_hunt_mission();

alter table public.a41_game_keys enable row level security;
alter table public.a41_quizzes enable row level security;
alter table public.a41_quiz_questions enable row level security;
alter table public.a41_quiz_sessions enable row level security;
alter table public.a41_quiz_players enable row level security;
alter table public.a41_quiz_answers enable row level security;
alter table public.a41_hunt_missions enable row level security;
alter table public.a41_hunt_claims enable row level security;
alter table public.a41_hunt_attempts enable row level security;

revoke all on
  public.a41_game_keys, public.a41_quizzes, public.a41_quiz_questions, public.a41_quiz_sessions,
  public.a41_quiz_players, public.a41_quiz_answers, public.a41_hunt_missions, public.a41_hunt_claims,
  public.a41_hunt_attempts
from anon, authenticated;

grant select on public.a41_game_keys to authenticated;
create policy game_keys_select on public.a41_game_keys for select to authenticated
  using ((select a41_private.is_event_member(event_id)));

grant select on public.a41_quizzes to authenticated;
grant insert (event_id, title) on public.a41_quizzes to authenticated;
grant update (title) on public.a41_quizzes to authenticated;
grant delete on public.a41_quizzes to authenticated;
create policy quizzes_select on public.a41_quizzes for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy quizzes_insert on public.a41_quizzes for insert to authenticated
  with check ((select a41_private.is_event_owner(event_id)));
create policy quizzes_update on public.a41_quizzes for update to authenticated
  using ((select a41_private.is_event_owner(event_id)))
  with check ((select a41_private.is_event_owner(event_id)));
create policy quizzes_delete on public.a41_quizzes for delete to authenticated
  using ((select a41_private.is_event_owner(event_id)));

grant select on public.a41_quiz_questions to authenticated;
grant insert (quiz_id, position, prompt, options, correct_index, time_limit_seconds, base_points)
  on public.a41_quiz_questions to authenticated;
grant update (position, prompt, options, correct_index, time_limit_seconds, base_points)
  on public.a41_quiz_questions to authenticated;
grant delete on public.a41_quiz_questions to authenticated;
create policy quiz_questions_select on public.a41_quiz_questions for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy quiz_questions_insert on public.a41_quiz_questions for insert to authenticated
  with check ((select a41_private.is_event_owner(event_id)));
create policy quiz_questions_update on public.a41_quiz_questions for update to authenticated
  using ((select a41_private.is_event_owner(event_id)))
  with check ((select a41_private.is_event_owner(event_id)));
create policy quiz_questions_delete on public.a41_quiz_questions for delete to authenticated
  using ((select a41_private.is_event_owner(event_id)));

grant select, delete on public.a41_quiz_sessions to authenticated;
create policy quiz_sessions_select on public.a41_quiz_sessions for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy quiz_sessions_delete on public.a41_quiz_sessions for delete to authenticated
  using ((select a41_private.is_event_owner(event_id)));

grant select on public.a41_quiz_players, public.a41_quiz_answers to authenticated;
create policy quiz_players_select on public.a41_quiz_players for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy quiz_answers_select on public.a41_quiz_answers for select to authenticated
  using ((select a41_private.is_event_member(event_id)));

grant select on public.a41_hunt_missions to authenticated;
grant insert (event_id, position, title, hint, points, code, active) on public.a41_hunt_missions to authenticated;
grant update (position, title, hint, points, code, active) on public.a41_hunt_missions to authenticated;
grant delete on public.a41_hunt_missions to authenticated;
create policy hunt_missions_select on public.a41_hunt_missions for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy hunt_missions_insert on public.a41_hunt_missions for insert to authenticated
  with check ((select a41_private.is_event_owner(event_id)));
create policy hunt_missions_update on public.a41_hunt_missions for update to authenticated
  using ((select a41_private.is_event_owner(event_id)))
  with check ((select a41_private.is_event_owner(event_id)));
create policy hunt_missions_delete on public.a41_hunt_missions for delete to authenticated
  using ((select a41_private.is_event_owner(event_id)));

grant select, delete on public.a41_hunt_claims to authenticated;
create policy hunt_claims_select on public.a41_hunt_claims for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy hunt_claims_delete on public.a41_hunt_claims for delete to authenticated
  using ((select a41_private.is_event_owner(event_id)));