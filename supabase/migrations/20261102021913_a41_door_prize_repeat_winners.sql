-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) as a41_door_prize_repeat_winners.
-- Door prize setting "Winner can participate again". Until now a guest could have one draw in the whole event
-- (a41_raffle_draws_event_guest_key) and a number could come up once in the whole event. With the setting on for a
-- door prize, its draw may pick a guest (or number) that already won another door prize; the same door prize still
-- never draws the same guest or number twice, and a guest whose draw was forfeited stays out of every draw. With the
-- setting off (the default, and what every existing client sends) nothing changes: one draw per guest per event.
-- The draw functions keep the guarantee under the per-event lock; the indexes now only guard one draw per door prize.
drop index public.a41_raffle_draws_event_guest_key;
create unique index a41_raffle_draws_prize_guest_key on public.a41_raffle_draws (prize_id, guest_id) where guest_id is not null;

drop index public.a41_raffle_draws_event_number_key;
create unique index a41_raffle_draws_prize_number_key on public.a41_raffle_draws (prize_id, drawn_number) where drawn_number is not null;

create function a41_private.raffle_pool(p_event uuid, p_prize uuid, p_repeat boolean)
returns setof public.a41_guests
language sql
stable
security definer
set search_path = ''
as $$
  select g.*
  from public.a41_guests g
  join public.a41_checkins c on c.guest_id = g.id
  where g.event_id = p_event
    and not exists (
      select 1 from public.a41_raffle_draws d
      where d.guest_id = g.id
        and (not coalesce(p_repeat, false) or d.prize_id = p_prize or d.status = 'forfeited')
    )
$$;
revoke all on function a41_private.raffle_pool(uuid, uuid, boolean) from public, anon, authenticated;

drop function public.a41_draw_door_prize(uuid, jsonb, uuid[], integer);
create function public.a41_draw_door_prize(p_event uuid, p_item jsonb, p_picked uuid[] default null, p_reveal_ms integer default 0, p_repeat boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
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
  from a41_private.raffle_pool(p_event, v_prize_id, p_repeat) g
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
    'remaining', (select count(*) from a41_private.raffle_pool(p_event, v_prize_id, p_repeat) g where p_picked is null or g.id = any (p_picked))
  );
end
$$;
revoke all on function public.a41_draw_door_prize(uuid, jsonb, uuid[], integer, boolean) from public, anon;
grant execute on function public.a41_draw_door_prize(uuid, jsonb, uuid[], integer, boolean) to authenticated;

drop function public.a41_draw_door_number(uuid, jsonb, integer, integer);
create function public.a41_draw_door_number(p_event uuid, p_item jsonb, p_total integer, p_reveal_ms integer default 0, p_repeat boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
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
  where not exists (
    select 1 from public.a41_raffle_draws d
    where d.event_id = p_event and d.drawn_number = s.n
      and (not coalesce(p_repeat, false) or d.prize_id = v_prize_id or d.status = 'forfeited')
  )
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
revoke all on function public.a41_draw_door_number(uuid, jsonb, integer, integer, boolean) from public, anon;
grant execute on function public.a41_draw_door_number(uuid, jsonb, integer, integer, boolean) to authenticated;

notify pgrst, 'reload schema';
