-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_door_prize_server.
-- Door prizes on the server, so the stage laptop, the organizer's phone and every guest watching agree.
--
-- The dashboard's door prizes (config.doorprizes.items[]) map onto a41_raffle_prizes by their config id
-- (config_id), upserted by a41_sync_door_prizes and by every draw. A draw picks a checked-in guest on the server
-- (a41_private.raffle_pool, serialized per event by lock_raffle), optionally only among the picked guests, and never
-- a guest who already has a draw in the event (won or forfeited, as the a41_raffle_draws_event_guest_key index
-- already enforces). Number-range draws (paper tickets, not guests) are picked and recorded here too.
-- A draw is held back from the boards until reveal_at, so phones never show a winner before the stage machine lands.
-- Drawing, forfeiting and syncing are for event managers only; the public read shows names or guest numbers, never
-- contacts. Additive: new columns, indexes and functions; existing raffle functions are unchanged.

alter table public.a41_raffle_prizes
  add column config_id text,
  add column prize_label text,
  add column anonymous boolean not null default false;

alter table public.a41_raffle_prizes
  add constraint a41_raffle_prizes_config_id_check check (config_id is null or char_length(config_id) between 1 and 80),
  add constraint a41_raffle_prizes_prize_label_check check (prize_label is null or char_length(prize_label) <= 200);

create unique index a41_raffle_prizes_config_key on public.a41_raffle_prizes (event_id, config_id)
  where config_id is not null;

alter table public.a41_raffle_draws
  add column guest_number integer,
  add column drawn_number integer,
  add column reveal_at timestamptz;

alter table public.a41_raffle_draws
  add constraint a41_raffle_draws_drawn_number_check check (drawn_number is null or drawn_number between 1 and 100000);

-- A number is drawn at most once per event, like a guest.
create unique index a41_raffle_draws_event_number_key on public.a41_raffle_draws (event_id, drawn_number)
  where drawn_number is not null;

-- Creates or updates the prize behind one door prize item ({id, name, prize, quantity, anonymous}).
-- The quantity never drops below the winners already drawn. Callers hold lock_raffle for the event.
create function a41_private.upsert_door_prize(p_event uuid, p_item jsonb, p_sort integer default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_config text := btrim(coalesce(p_item->>'id', ''));
  v_name text := left(coalesce(nullif(btrim(p_item->>'name'), ''), 'Door Prize'), 120);
  v_label text := nullif(left(btrim(coalesce(p_item->>'prize', '')), 200), '');
  v_qty integer := case
    when coalesce(p_item->>'quantity', '') ~ '^[0-9]{1,6}$' then least(greatest((p_item->>'quantity')::integer, 1), 500)
    else 1
  end;
  v_anon boolean := coalesce(p_item->'anonymous' = 'true'::jsonb, false);
  v_id uuid;
begin
  if jsonb_typeof(p_item) is distinct from 'object' or v_config = '' or char_length(v_config) > 80 then
    raise exception 'invalid_door_prize';
  end if;

  select p.id into v_id from public.a41_raffle_prizes p where p.event_id = p_event and p.config_id = v_config;
  if v_id is null then
    insert into public.a41_raffle_prizes (event_id, config_id, name, prize_label, quantity, anonymous, sort_order)
    values (p_event, v_config, v_name, v_label, v_qty, v_anon, coalesce(p_sort, 0))
    returning id into v_id;
  else
    update public.a41_raffle_prizes p
    set name = v_name,
        prize_label = v_label,
        anonymous = v_anon,
        quantity = greatest(v_qty, (
          select count(*) from public.a41_raffle_draws d where d.prize_id = p.id and d.status = 'won'
        )::integer),
        sort_order = coalesce(p_sort, p.sort_order)
    where p.id = v_id;
  end if;
  return v_id;
end
$$;

-- One draw as a board shows it. Public boards leave out guest ids and the status, and hide the name and table
-- of an anonymous door prize's winners (they show the guest number instead).
create function a41_private.door_prize_winner_json(d public.a41_raffle_draws, p_anonymous boolean, p_public boolean)
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'id', d.id,
    'at', d.drawn_at,
    'number', d.drawn_number,
    'guest_number', case when d.drawn_number is null then coalesce(
      d.guest_number, (select g.guest_number from public.a41_guests g where g.id = d.guest_id)
    ) end,
    'name', case when d.drawn_number is null and not (p_public and p_anonymous) then d.guest_name end,
    'table_no', case when not (p_public and p_anonymous) then d.guest_table_no end
  ) || case when p_public then '{}'::jsonb else jsonb_build_object(
    'status', d.status,
    'guest_id', d.guest_id,
    'resolved_at', d.resolved_at
  ) end
$$;

-- The most recent revealed winner of the event, with its door prize.
create function a41_private.door_prize_latest(p_event uuid, p_public boolean)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select a41_private.door_prize_winner_json(d, p.anonymous, p_public)
    || jsonb_build_object('config_id', p.config_id, 'prize_name', p.name, 'prize', p.prize_label)
  from public.a41_raffle_draws d
  join public.a41_raffle_prizes p on p.id = d.prize_id
  where d.event_id = p_event and d.status = 'won' and coalesce(d.reveal_at, d.drawn_at) <= now()
  order by d.drawn_at desc, d.id desc
  limit 1
$$;

-- Every door prize of the event with its revealed winners, newest first (public: winners only, no forfeits).
create function a41_private.door_prize_board(p_event uuid, p_public boolean)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'prizes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'config_id', p.config_id,
          'name', p.name,
          'prize', p.prize_label,
          'quantity', p.quantity,
          'anonymous', p.anonymous,
          'awarded', (select count(*) from public.a41_raffle_draws d where d.prize_id = p.id and d.status = 'won'),
          'winners', coalesce((
            select jsonb_agg(a41_private.door_prize_winner_json(d, p.anonymous, p_public) order by d.drawn_at desc, d.id desc)
            from public.a41_raffle_draws d
            where d.prize_id = p.id
              and coalesce(d.reveal_at, d.drawn_at) <= now()
              and (not p_public or d.status = 'won')
          ), '[]'::jsonb)
        )
        order by p.sort_order, p.created_at, p.id
      )
      from public.a41_raffle_prizes p
      where p.event_id = p_event
    ), '[]'::jsonb),
    'latest', a41_private.door_prize_latest(p_event, p_public)
  )
$$;

-- The organizers' board: every draw (won and forfeited) with guest ids, plus how many guests can still win.
create function public.a41_door_prize_board(p_event uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_event is null or not a41_private.is_event_manager(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return a41_private.door_prize_board(p_event, false) || jsonb_build_object(
    'checked_in', (select count(*) from public.a41_checkins c where c.event_id = p_event),
    'remaining', (select count(*) from a41_private.raffle_pool(p_event))
  );
end
$$;

-- Makes the event's prizes match its door prize setup (up to 100 items, in order). Door prizes removed from the
-- setup are deleted unless they already have draws; those stay for the log.
create function public.a41_sync_door_prizes(p_event uuid, p_items jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_item jsonb;
  v_pos bigint;
  v_ids text[] := '{}';
begin
  if p_event is null or not a41_private.is_event_manager(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 100 then
    raise exception 'invalid_door_prizes';
  end if;

  perform a41_private.lock_raffle(p_event);

  for v_item, v_pos in select e.value, e.ordinality from jsonb_array_elements(p_items) with ordinality as e loop
    perform a41_private.upsert_door_prize(p_event, v_item, (v_pos - 1)::integer);
    v_ids := v_ids || btrim(v_item->>'id');
  end loop;

  delete from public.a41_raffle_prizes p
  where p.event_id = p_event
    and p.config_id is not null
    and not (p.config_id = any (v_ids))
    and not exists (select 1 from public.a41_raffle_draws d where d.prize_id = p.id);

  return public.a41_door_prize_board(p_event);
end
$$;

-- Draws the next winner of a door prize: a random checked-in guest who has no draw in this event yet, only among
-- p_picked when given (the door prize's "picked guests" audience). p_reveal_ms is how long the screen's machine
-- animates; the winner stays off the boards until then (at most 15 s).
create function public.a41_draw_door_prize(p_event uuid, p_item jsonb, p_picked uuid[] default null, p_reveal_ms integer default 0)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_prize public.a41_raffle_prizes;
  v_prize_id uuid;
  v_guest public.a41_guests;
  v_draw public.a41_raffle_draws;
begin
  if p_event is null or not a41_private.is_event_manager(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if cardinality(p_picked) > 5000 then
    raise exception 'invalid_door_prize';
  end if;

  perform a41_private.lock_raffle(p_event);

  v_prize_id := a41_private.upsert_door_prize(p_event, p_item);
  -- Hold the prize while its count is checked (see a41_raffle_hardening).
  select * into v_prize from public.a41_raffle_prizes p where p.id = v_prize_id for no key update;

  if (select count(*) from public.a41_raffle_draws d where d.prize_id = v_prize_id and d.status = 'won') >= v_prize.quantity then
    raise exception 'prize_fully_awarded';
  end if;

  select g.* into v_guest
  from a41_private.raffle_pool(p_event) g
  where p_picked is null or g.id = any (p_picked)
  order by random()
  limit 1;
  if not found then
    raise exception 'no_eligible_guests';
  end if;

  insert into public.a41_raffle_draws (event_id, prize_id, guest_id, guest_name, guest_table_no, guest_number, drawn_by, reveal_at)
  values (
    p_event, v_prize_id, v_guest.id, v_guest.name, v_guest.table_no, v_guest.guest_number, auth.uid(),
    now() + make_interval(secs => least(greatest(coalesce(p_reveal_ms, 0), 0), 15000) / 1000.0)
  )
  returning * into v_draw;

  return jsonb_build_object(
    'draw', jsonb_build_object('id', v_draw.id, 'status', v_draw.status, 'drawn_at', v_draw.drawn_at, 'reveal_at', v_draw.reveal_at),
    'guest', jsonb_build_object('id', v_guest.id, 'name', v_guest.name, 'table_no', v_guest.table_no, 'guest_number', v_guest.guest_number),
    'prize', a41_private.raffle_prize_json(v_prize_id) || jsonb_build_object('config_id', v_prize.config_id),
    'remaining', (select count(*) from a41_private.raffle_pool(p_event) g where p_picked is null or g.id = any (p_picked))
  );
end
$$;

-- Draws a number from 1 to p_total that no draw of this event has had yet (number-range door prizes, where the
-- numbers are paper tickets rather than guests).
create function public.a41_draw_door_number(p_event uuid, p_item jsonb, p_total integer, p_reveal_ms integer default 0)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_prize public.a41_raffle_prizes;
  v_prize_id uuid;
  v_number integer;
  v_draw public.a41_raffle_draws;
begin
  if p_event is null or not a41_private.is_event_manager(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_total is null or p_total < 1 or p_total > 100000 then
    raise exception 'invalid_total';
  end if;

  perform a41_private.lock_raffle(p_event);

  v_prize_id := a41_private.upsert_door_prize(p_event, p_item);
  select * into v_prize from public.a41_raffle_prizes p where p.id = v_prize_id for no key update;

  if (select count(*) from public.a41_raffle_draws d where d.prize_id = v_prize_id and d.status = 'won') >= v_prize.quantity then
    raise exception 'prize_fully_awarded';
  end if;

  select s.n into v_number
  from generate_series(1, p_total) as s (n)
  where not exists (select 1 from public.a41_raffle_draws d where d.event_id = p_event and d.drawn_number = s.n)
  order by random()
  limit 1;
  if v_number is null then
    raise exception 'no_numbers_left';
  end if;

  insert into public.a41_raffle_draws (event_id, prize_id, guest_name, drawn_number, drawn_by, reveal_at)
  values (
    p_event, v_prize_id, 'No. ' || v_number, v_number, auth.uid(),
    now() + make_interval(secs => least(greatest(coalesce(p_reveal_ms, 0), 0), 15000) / 1000.0)
  )
  returning * into v_draw;

  return jsonb_build_object(
    'draw', jsonb_build_object('id', v_draw.id, 'status', v_draw.status, 'drawn_at', v_draw.drawn_at, 'reveal_at', v_draw.reveal_at, 'number', v_number),
    'prize', a41_private.raffle_prize_json(v_prize_id) || jsonb_build_object('config_id', v_prize.config_id)
  );
end
$$;

-- What every screen and phone shows: the published event's door prizes and their revealed winners (names, or guest
-- numbers for anonymous door prizes; never contacts). Organizers and desk staff also see their drafts.
create function public.a41_door_prize_public(p_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('event', jsonb_build_object('name', e.name, 'slug', e.slug))
    || a41_private.door_prize_board(e.id, true)
  from public.a41_events e
  where e.slug = p_slug and (e.status = 'published' or (select a41_private.is_event_member(e.id)))
$$;

revoke all on function a41_private.upsert_door_prize(uuid, jsonb, integer) from public, anon, authenticated;
revoke all on function a41_private.door_prize_winner_json(public.a41_raffle_draws, boolean, boolean) from public, anon, authenticated;
revoke all on function a41_private.door_prize_latest(uuid, boolean) from public, anon, authenticated;
revoke all on function a41_private.door_prize_board(uuid, boolean) from public, anon, authenticated;

revoke all on function public.a41_door_prize_board(uuid) from public, anon;
revoke all on function public.a41_sync_door_prizes(uuid, jsonb) from public, anon;
revoke all on function public.a41_draw_door_prize(uuid, jsonb, uuid[], integer) from public, anon;
revoke all on function public.a41_draw_door_number(uuid, jsonb, integer, integer) from public, anon;
grant execute on function public.a41_door_prize_board(uuid) to authenticated;
grant execute on function public.a41_sync_door_prizes(uuid, jsonb) to authenticated;
grant execute on function public.a41_draw_door_prize(uuid, jsonb, uuid[], integer) to authenticated;
grant execute on function public.a41_draw_door_number(uuid, jsonb, integer, integer) to authenticated;

revoke all on function public.a41_door_prize_public(text) from public;
grant execute on function public.a41_door_prize_public(text) to anon, authenticated;
