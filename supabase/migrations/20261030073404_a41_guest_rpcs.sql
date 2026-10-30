-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_guest_rpcs.
-- The guest list, RSVPs and check-in on the server: what the dashboard, the invitation form, the guest pass and the
-- register desk call. Every function checks who is calling itself (security definer), so the guests table can stay
-- closed to desk staff (M2).
--
-- Shapes returned:
--   guest (managers):  { id, event_id, guest_number, name, email, phone, table_no, tags, status, token,
--                        created_at, updated_at, rsvp: null | { response, party_size, meal_preference, message,
--                        answers, responded_at }, checked_in_at }
--   door guest (desk): { id, guest_number, name, table_no, tags, checked_in_at, response, party_size }
--   check-in card:     { outcome, checked_in_at, guest: { id, guest_number, name, table_no, tags, party_size, response } }
--                      outcome: checked_in | already_checked_in | unknown | other_event (+ event_name)

-- ─── Shapes ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function a41_private.guest_json(g public.a41_guests, r public.a41_rsvps, c public.a41_checkins)
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'id', g.id,
    'event_id', g.event_id,
    'guest_number', g.guest_number,
    'name', g.name,
    'email', g.email,
    'phone', g.phone,
    'table_no', g.table_no,
    'tags', to_jsonb(g.tags),
    'status', g.status,
    'token', g.token,
    'created_at', g.created_at,
    'updated_at', g.updated_at,
    'rsvp', case when r.guest_id is null then null else jsonb_build_object(
      'response', r.response,
      'party_size', r.party_size,
      'meal_preference', r.meal_preference,
      'message', r.message,
      'answers', r.answers,
      'responded_at', r.responded_at
    ) end,
    'checked_in_at', c.checked_in_at
  )
$$;

-- What the register desk sees: no pass token, email or phone.
create or replace function a41_private.door_guest_json(g public.a41_guests, r public.a41_rsvps, c public.a41_checkins)
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'id', g.id,
    'guest_number', g.guest_number,
    'name', g.name,
    'table_no', g.table_no,
    'tags', to_jsonb(g.tags),
    'checked_in_at', c.checked_in_at,
    'response', r.response,
    'party_size', r.party_size
  )
$$;

create or replace function a41_private.guest_json_by_id(p_guest uuid)
returns jsonb
language sql stable set search_path = ''
as $$
  select a41_private.guest_json(g, r, c)
  from public.a41_guests g
  left join public.a41_rsvps r on r.guest_id = g.id
  left join public.a41_checkins c on c.guest_id = g.id
  where g.id = p_guest
$$;

create or replace function a41_private.checkin_card(p_event uuid, p_guest uuid, p_outcome text, p_checked_in_at timestamptz)
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'outcome', p_outcome,
    'checked_in_at', p_checked_in_at,
    'guest', jsonb_build_object(
      'id', g.id,
      'guest_number', g.guest_number,
      'name', g.name,
      'table_no', g.table_no,
      'tags', g.tags,
      'party_size', r.party_size,
      'response', r.response
    )
  )
  from public.a41_guests g
  left join public.a41_rsvps r on r.guest_id = g.id
  where g.id = p_guest and g.event_id = p_event
$$;

revoke all on function a41_private.guest_json(public.a41_guests, public.a41_rsvps, public.a41_checkins) from public, anon, authenticated;
revoke all on function a41_private.door_guest_json(public.a41_guests, public.a41_rsvps, public.a41_checkins) from public, anon, authenticated;
revoke all on function a41_private.guest_json_by_id(uuid) from public, anon, authenticated;
-- Only the security-definer RPCs below call these now.
revoke all on function a41_private.checkin_card(uuid, uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function a41_private.check_in(uuid, uuid) from public, anon, authenticated;

-- ─── Organizer: the guest list ───────────────────────────────────────────────────────────────────────────────────

-- The whole list with RSVPs and check-ins, plus the package limit to show next to it.
create or replace function public.a41_guest_list(p_event uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not a41_private.is_event_manager(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'capacity', p.guest_capacity + e.extra_guests,
      'package', e.package,
      'guests', coalesce((
        select jsonb_agg(a41_private.guest_json(g, r, c) order by g.guest_number)
        from public.a41_guests g
        left join public.a41_rsvps r on r.guest_id = g.id
        left join public.a41_checkins c on c.guest_id = g.id
        where g.event_id = e.id
      ), '[]'::jsonb)
    )
    from public.a41_events e
    join public.a41_packages p on p.tier = e.package
    where e.id = p_event
  );
end
$$;

-- Adds or updates many guests at once (a CSV/XLSX import, or one guest from the Add form).
--   p_rows: [{ name, email?, phone?, table_no?, tags? (array or "a, b") }, …] — at most 5,000.
--   Phones are stored as +62… (the event's country code for 08… numbers), emails in lower case.
--   A row whose email or phone matches a guest already on the list updates that guest (or is skipped as
--   "exists" when p_update_existing is false). Rows repeating an email, phone or guest from an earlier row
--   are skipped as "duplicate"; a row whose email and phone belong to two different guests as "conflict".
--   All or nothing: if the new guests do not fit the package, nothing is written and reason = "capacity".
-- Returns { ok, inserted, updated, skipped: [{ row, reason, name }], guest_ids, capacity, total }
--      or { ok: false, reason: "capacity" | "too_many", capacity, total, adding, skipped }.
create or replace function public.a41_import_guests(p_event uuid, p_rows jsonb, p_update_existing boolean default true)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_capacity integer;
  v_total integer;
  v_cc text;
  v_plan jsonb;
  v_inserts integer;
  v_last integer;
  v_inserted uuid[];
  v_updated uuid[];
begin
  if not a41_private.is_event_manager(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'invalid_rows' using errcode = '22023', detail = 'Send the guests as a JSON array.';
  end if;
  if jsonb_array_length(p_rows) > 5000 then
    return jsonb_build_object('ok', false, 'reason', 'too_many', 'max', 5000);
  end if;

  -- One import (or walk-in, or registration) at a time per event: the same lock the capacity check takes.
  select p.guest_capacity + e.extra_guests into v_capacity
  from public.a41_events e join public.a41_packages p on p.tier = e.package
  where e.id = p_event
  for update of e;
  v_cc := a41_private.event_country(p_event);

  with src as (
    select t.ord::integer as n, t.value as v
    from jsonb_array_elements(p_rows) with ordinality t (value, ord)
  ),
  norm as (
    select
      s.n,
      btrim(coalesce(case when jsonb_typeof(s.v) = 'object' then s.v ->> 'name' end, '')) as name,
      a41_private.normalize_email(s.v ->> 'email') as email,
      a41_private.normalize_phone(s.v ->> 'phone', v_cc) as phone,
      nullif(btrim(coalesce(s.v ->> 'table_no', '')), '') as table_no,
      a41_private.clean_tags(s.v -> 'tags') as tags,
      nullif(btrim(coalesce(s.v ->> 'email', '')), '') is not null as gave_email,
      nullif(btrim(coalesce(s.v ->> 'phone', '')), '') is not null as gave_phone
    from src s
  ),
  checked as (
    select x.*,
      case
        when x.name = '' then 'missing_name'
        when char_length(x.name) > 160 then 'name_too_long'
        when x.gave_email and not a41_private.is_valid_email(x.email) then 'invalid_email'
        when x.gave_phone and not a41_private.is_valid_phone(x.phone) then 'invalid_phone'
        when char_length(x.table_no) > 20 then 'table_too_long'
      end as problem
    from norm x
  ),
  matched as (
    select c.*,
      (select g.id from public.a41_guests g where g.event_id = p_event and g.email = c.email) as by_email,
      (select g.id from public.a41_guests g where g.event_id = p_event and g.phone = c.phone) as by_phone
    from checked c
    where c.problem is null
  ),
  keyed as (
    select m.*,
      coalesce(m.by_email, m.by_phone) as match_id,
      m.by_email is not null and m.by_phone is not null and m.by_email <> m.by_phone as conflict
    from matched m
  ),
  ranked as (
    select k.*,
      row_number() over (partition by coalesce(k.email, 'row:' || k.n) order by k.n) as email_rank,
      row_number() over (partition by coalesce(k.phone, 'row:' || k.n) order by k.n) as phone_rank,
      row_number() over (partition by coalesce(k.match_id::text, 'row:' || k.n) order by k.n) as match_rank
    from keyed k
    where not k.conflict
  ),
  plan as (
    select c.n, c.name, null::uuid as match_id, null::text as email, null::text as phone, null::text as table_no,
           '{}'::text[] as tags, 'skip' as action, c.problem as reason
    from checked c where c.problem is not null
    union all
    select k.n, k.name, null, null, null, null, '{}', 'skip', 'conflict'
    from keyed k where k.conflict
    union all
    select r.n, r.name, r.match_id, r.email, r.phone, r.table_no, r.tags,
      case
        when r.email_rank > 1 or r.phone_rank > 1 or r.match_rank > 1 then 'skip'
        when r.match_id is null then 'insert'
        when p_update_existing then 'update'
        else 'skip'
      end,
      case
        when r.email_rank > 1 or r.phone_rank > 1 or r.match_rank > 1 then 'duplicate'
        when r.match_id is not null and not p_update_existing then 'exists'
      end
    from ranked r
  )
  select coalesce(jsonb_agg(to_jsonb(plan) order by plan.n), '[]'::jsonb) into v_plan from plan;

  select count(*) into v_total from public.a41_guests g where g.event_id = p_event;
  select count(*) into v_inserts from jsonb_array_elements(v_plan) x where x.value ->> 'action' = 'insert';

  if v_total + v_inserts > v_capacity then
    return jsonb_build_object(
      'ok', false, 'reason', 'capacity', 'capacity', v_capacity, 'total', v_total, 'adding', v_inserts,
      'skipped', (
        select coalesce(jsonb_agg(jsonb_build_object('row', (x.value ->> 'n')::integer, 'reason', x.value ->> 'reason', 'name', x.value ->> 'name')), '[]'::jsonb)
        from jsonb_array_elements(v_plan) x where x.value ->> 'action' = 'skip'
      )
    );
  end if;

  with p as (
    select * from jsonb_to_recordset(v_plan) as p (n integer, name text, match_id uuid, email text, phone text, table_no text, tags text[], action text)
    where p.action = 'update'
  ),
  done as (
    update public.a41_guests g
    set name = p.name,
        email = coalesce(p.email, g.email),
        phone = coalesce(p.phone, g.phone),
        table_no = coalesce(p.table_no, g.table_no),
        tags = case when cardinality(p.tags) > 0 then p.tags else g.tags end
    from p
    where g.id = p.match_id and g.event_id = p_event
    returning g.id
  )
  select coalesce(array_agg(done.id), '{}') into v_updated from done;

  if v_inserts > 0 then
    -- Reserve the numbers in one step (file order), instead of one counter bump per row.
    insert into a41_private.guest_numbers as gn (event_id, last_number) values (p_event, v_inserts)
    on conflict (event_id) do update set last_number = gn.last_number + v_inserts
    returning gn.last_number into v_last;

    with p as (
      select * from jsonb_to_recordset(v_plan) as p (n integer, name text, email text, phone text, table_no text, tags text[], action text)
      where p.action = 'insert'
    ),
    done as (
      insert into public.a41_guests (event_id, name, email, phone, table_no, tags, guest_number)
      select p_event, p.name, p.email, p.phone, p.table_no, coalesce(p.tags, '{}'),
             v_last - v_inserts + row_number() over (order by p.n)
      from p
      order by p.n
      returning id
    )
    select coalesce(array_agg(done.id), '{}') into v_inserted from done;
  end if;

  return jsonb_build_object(
    'ok', true,
    'inserted', coalesce(cardinality(v_inserted), 0),
    'updated', coalesce(cardinality(v_updated), 0),
    'skipped', (
      select coalesce(jsonb_agg(jsonb_build_object('row', (x.value ->> 'n')::integer, 'reason', x.value ->> 'reason', 'name', x.value ->> 'name')), '[]'::jsonb)
      from jsonb_array_elements(v_plan) x where x.value ->> 'action' = 'skip'
    ),
    'guest_ids', to_jsonb(coalesce(v_inserted, '{}') || coalesce(v_updated, '{}')),
    'capacity', v_capacity,
    'total', v_total + coalesce(cardinality(v_inserted), 0)
  );
end
$$;

-- Edits one guest. p_patch may hold name, email, phone, table_no, tags, and response ('attending' | 'declined')
-- with party_size to record an RSVP for the guest. Keys left out stay as they are; "" clears email, phone or table.
-- Returns { ok: true, guest } or { ok: false, reason: invalid | taken | not_found, field }.
create or replace function public.a41_update_guest(p_guest uuid, p_patch jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  g public.a41_guests;
  v_cc text;
  v_name text;
  v_email text;
  v_phone text;
  v_table text;
  v_tags text[];
  v_party integer;
begin
  select * into g from public.a41_guests where id = p_guest;
  if not found or not a41_private.is_event_manager(g.event_id) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'patch');
  end if;
  v_cc := a41_private.event_country(g.event_id);

  v_name := case when p_patch ? 'name' then btrim(coalesce(p_patch ->> 'name', '')) else g.name end;
  if char_length(v_name) not between 1 and 160 then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'name');
  end if;

  v_email := case when p_patch ? 'email' then a41_private.normalize_email(p_patch ->> 'email') else g.email end;
  if v_email is not null and not a41_private.is_valid_email(v_email) then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'email');
  end if;
  if v_email is not null and exists (select 1 from public.a41_guests x where x.event_id = g.event_id and x.email = v_email and x.id <> g.id) then
    return jsonb_build_object('ok', false, 'reason', 'taken', 'field', 'email');
  end if;

  v_phone := case when p_patch ? 'phone' then a41_private.normalize_phone(p_patch ->> 'phone', v_cc) else g.phone end;
  if v_phone is not null and not a41_private.is_valid_phone(v_phone) then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'phone');
  end if;
  if v_phone is not null and exists (select 1 from public.a41_guests x where x.event_id = g.event_id and x.phone = v_phone and x.id <> g.id) then
    return jsonb_build_object('ok', false, 'reason', 'taken', 'field', 'phone');
  end if;

  v_table := case when p_patch ? 'table_no' then nullif(btrim(coalesce(p_patch ->> 'table_no', '')), '') else g.table_no end;
  if char_length(v_table) > 20 then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'table_no');
  end if;
  v_tags := case when p_patch ? 'tags' then a41_private.clean_tags(p_patch -> 'tags') else g.tags end;

  update public.a41_guests
  set name = v_name, email = v_email, phone = v_phone, table_no = v_table, tags = v_tags
  where id = g.id;

  if p_patch ->> 'response' in ('attending', 'declined') then
    v_party := case when p_patch ->> 'response' = 'declined' then 1
                    when coalesce(p_patch ->> 'party_size', '') ~ '^\d{1,2}$' then (p_patch ->> 'party_size')::integer
                    else coalesce((select r.party_size from public.a41_rsvps r where r.guest_id = g.id), 1) end;
    if v_party not between 1 and 10 then
      return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'party_size');
    end if;
    insert into public.a41_rsvps (guest_id, event_id, response, party_size)
    values (g.id, g.event_id, p_patch ->> 'response', v_party)
    on conflict (guest_id) do update set response = excluded.response, party_size = excluded.party_size, responded_at = now();
  end if;

  return jsonb_build_object('ok', true, 'guest', a41_private.guest_json_by_id(g.id));
end
$$;

-- Removes guests (with their RSVP, check-in, photos and game scores). Returns { ok, deleted }.
create or replace function public.a41_delete_guests(p_event uuid, p_ids uuid[])
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  if not a41_private.is_event_manager(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.a41_guests g where g.event_id = p_event and g.id = any (coalesce(p_ids, '{}'));
  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', true, 'deleted', v_count);
end
$$;

-- Guest and check-in counts for every event the caller can open (the event list cards).
-- Returns [{ event_id, guests, checked_in, attending, capacity }].
create or replace function public.a41_guest_counts()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'event_id', e.id,
    'guests', (select count(*) from public.a41_guests g where g.event_id = e.id),
    'checked_in', (select count(*) from public.a41_checkins c where c.event_id = e.id),
    'attending', (select coalesce(sum(r.party_size), 0) from public.a41_rsvps r where r.event_id = e.id and r.response = 'attending'),
    'capacity', p.guest_capacity + e.extra_guests
  )), '[]'::jsonb)
  from public.a41_events e
  join public.a41_packages p on p.tier = e.package
  where exists (
    select 1 from public.a41_memberships m where m.org_id = e.org_id and m.user_id = (select auth.uid())
  )
$$;

-- ─── Register desk (owners and desk staff) ───────────────────────────────────────────────────────────────────────

create or replace function public.a41_check_in_by_token(p_event uuid, p_token text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_guest public.a41_guests;
  v_token text := btrim(coalesce(p_token, ''));
begin
  if not a41_private.is_event_member(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if char_length(v_token) not between 8 and 200 then
    return jsonb_build_object('outcome', 'unknown');
  end if;

  select * into v_guest from public.a41_guests g where g.token in (v_token, lower(v_token)) limit 1;
  if not found then
    return jsonb_build_object('outcome', 'unknown');
  end if;

  if v_guest.event_id <> p_event then
    return jsonb_build_object(
      'outcome', 'other_event',
      'event_name', (select e.name from public.a41_events e where e.id = v_guest.event_id)
    );
  end if;

  return a41_private.check_in(p_event, v_guest.id);
end
$$;

create or replace function public.a41_check_in_guest(p_event uuid, p_guest uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if not a41_private.is_event_member(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return a41_private.check_in(p_event, p_guest);
end
$$;

-- Takes back a check-in made by mistake. Returns { ok, guest: door guest } or { ok: false, reason: not_found }.
create or replace function public.a41_undo_check_in(p_event uuid, p_guest uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if not a41_private.is_event_member(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.a41_checkins c where c.guest_id = p_guest and c.event_id = p_event;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  return jsonb_build_object('ok', true, 'guest', (
    select a41_private.door_guest_json(g, r, null::public.a41_checkins)
    from public.a41_guests g left join public.a41_rsvps r on r.guest_id = g.id
    where g.id = p_guest
  ));
end
$$;

-- Door view of the whole list (for the desk's Guests tab), by guest number.
create or replace function public.a41_desk_guests(p_event uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not a41_private.is_event_member(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(a41_private.door_guest_json(g, r, c) order by g.guest_number)
    from public.a41_guests g
    left join public.a41_rsvps r on r.guest_id = g.id
    left join public.a41_checkins c on c.guest_id = g.id
    where g.event_id = p_event
  ), '[]'::jsonb);
end
$$;

-- Finds guests by name (every word), guest number ("12", "#12", "No. 12"), full email address or at least six
-- digits of their phone. Returns up to 20 door guests; contacts are matched but never returned.
create or replace function public.a41_search_checkin_guests(p_event uuid, p_query text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_query text := lower(btrim(coalesce(p_query, '')));
  v_words text[] := array(select w from unnest(regexp_split_to_array(lower(btrim(coalesce(p_query, ''))), '\s+')) w where w <> '');
  v_number integer;
  v_phone text := ltrim(regexp_replace(coalesce(p_query, ''), '\D', '', 'g'), '0');
begin
  if not a41_private.is_event_member(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_query ~ '^(#|no\.?)?\s*\d{1,7}$' then
    v_number := regexp_replace(v_query, '\D', '', 'g')::integer;
  end if;
  if char_length(v_query) > 100 or (v_number is null and char_length(v_query) < 2) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(t.card order by t.rank, t.name, t.id)
    from (
      select
        a41_private.door_guest_json(g, r, c) as card, g.name, g.id,
        case when g.guest_number = v_number then 0 when strpos(lower(g.name), v_query) = 1 then 1 else 2 end as rank
      from public.a41_guests g
      left join public.a41_checkins c on c.guest_id = g.id
      left join public.a41_rsvps r on r.guest_id = g.id
      where g.event_id = p_event
        and (
          g.guest_number = v_number
          or (cardinality(v_words) > 0 and not exists (select 1 from unnest(v_words) w where strpos(lower(g.name), w) = 0))
          or (strpos(v_query, '@') > 0 and g.email = v_query)
          or (char_length(v_phone) >= 6 and strpos(regexp_replace(coalesce(g.phone, ''), '\D', '', 'g'), v_phone) > 0)
        )
      order by rank, g.name, g.id
      limit 20
    ) t
  ), '[]'::jsonb);
end
$$;

-- Live numbers for every desk at the door (poll this every few seconds).
create or replace function public.a41_checkin_stats(p_event uuid, p_recent integer default 8)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not a41_private.is_event_member(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total_guests', (select count(*) from public.a41_guests g where g.event_id = p_event),
    'checked_in', (select count(*) from public.a41_checkins c where c.event_id = p_event),
    'attending', (select count(*) from public.a41_rsvps r where r.event_id = p_event and r.response = 'attending'),
    'attending_checked_in', (
      select count(*) from public.a41_rsvps r
      join public.a41_checkins c on c.guest_id = r.guest_id
      where r.event_id = p_event and r.response = 'attending'
    ),
    'recent', coalesce((
      select jsonb_agg(
        jsonb_build_object('guest_id', t.guest_id, 'guest_number', t.guest_number, 'name', t.name, 'table_no', t.table_no, 'checked_in_at', t.checked_in_at)
        order by t.checked_in_at desc, t.name
      )
      from (
        select c.guest_id, g.guest_number, g.name, g.table_no, c.checked_in_at
        from public.a41_checkins c
        join public.a41_guests g on g.id = c.guest_id
        where c.event_id = p_event
        order by c.checked_in_at desc, g.name
        limit greatest(1, least(coalesce(p_recent, 8), 50))
      ) t
    ), '[]'::jsonb)
  );
end
$$;

-- A guest who is not on the list, added and checked in at the door. When the phone or email already belongs to a
-- guest, that guest is checked in instead (matched = true).
-- Returns a check-in card, or { outcome: invalid (field) | full }.
drop function if exists public.a41_add_walk_in(uuid, text, text, text, text);
create or replace function public.a41_add_walk_in(
  p_event uuid, p_name text, p_phone text default null, p_email text default null, p_table_no text default null,
  p_tags text[] default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := a41_private.normalize_email(p_email);
  v_phone text;
  v_table text := nullif(btrim(coalesce(p_table_no, '')), '');
  v_guest uuid;
begin
  if not a41_private.is_event_member(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_phone := a41_private.normalize_phone(p_phone, a41_private.event_country(p_event));

  if char_length(v_name) not between 1 and 160 then
    return jsonb_build_object('outcome', 'invalid', 'field', 'name');
  end if;
  if v_email is not null and not a41_private.is_valid_email(v_email) then
    return jsonb_build_object('outcome', 'invalid', 'field', 'email');
  end if;
  if v_phone is not null and not a41_private.is_valid_phone(v_phone) then
    return jsonb_build_object('outcome', 'invalid', 'field', 'phone');
  end if;
  if char_length(v_table) > 20 then
    return jsonb_build_object('outcome', 'invalid', 'field', 'table_no');
  end if;

  select g.id into v_guest from public.a41_guests g
  where g.event_id = p_event and ((v_email is not null and g.email = v_email) or (v_phone is not null and g.phone = v_phone))
  order by g.guest_number limit 1;
  if v_guest is not null then
    return a41_private.check_in(p_event, v_guest) || jsonb_build_object('matched', true);
  end if;

  begin
    insert into public.a41_guests (event_id, name, phone, email, table_no, tags)
    values (p_event, v_name, v_phone, v_email, v_table, a41_private.clean_tags(to_jsonb(array['walk-in'] || coalesce(p_tags, '{}'))))
    returning id into v_guest;
  exception when check_violation then
    if sqlerrm = 'guest_capacity_exceeded' then
      return jsonb_build_object('outcome', 'full');
    end if;
    raise;
  end;

  return a41_private.check_in(p_event, v_guest);
end
$$;

-- ─── Guests: invitation form and pass ────────────────────────────────────────────────────────────────────────────

-- Why the invitation form cannot take a reply right now (null when it can): not_found (not published),
-- closed (event over, or past the reply-by day), paused (organizer turned replies off), not_open (scheduled).
-- Reads the published invitation settings (a41_events.site.invitation).
create or replace function a41_private.invitation_closed(p_event public.a41_events)
returns text
language plpgsql stable set search_path = ''
as $$
declare
  inv jsonb := coalesce(p_event.site -> 'invitation', '{}'::jsonb);
  v_local timestamp := now() at time zone p_event.timezone;
begin
  if p_event.status <> 'published' then
    return 'not_found';
  end if;
  if now() >= p_event.ends_at then
    return 'closed';
  end if;
  if inv ->> 'accepting' = 'false' then
    return 'paused';
  end if;
  begin
    if coalesce(inv ->> 'replyBy', '') ~ '^\d{4}-\d{2}-\d{2}$' and v_local::date > (inv ->> 'replyBy')::date then
      return 'closed';
    end if;
    if inv ->> 'opensMode' = 'scheduled' and coalesce(inv ->> 'opensAt', '') ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}'
       and v_local < left(inv ->> 'opensAt', 16)::timestamp then
      return 'not_open';
    end if;
  exception when others then
    null; -- a malformed date in the settings does not close the form
  end;
  return null;
end
$$;

-- The form's limits for one reply: party size cap (maxPerReply, and the table's 1–10) and the seat limit
-- (guestLimit: total attending party size). Returns null when the reply fits, else 'invalid' or 'full'.
create or replace function a41_private.invitation_room(p_event public.a41_events, p_guest uuid, p_attending boolean, p_party integer)
returns text
language plpgsql stable set search_path = ''
as $$
declare
  inv jsonb := coalesce(p_event.site -> 'invitation', '{}'::jsonb);
  v_max integer := case when coalesce(inv ->> 'maxPerReply', '') ~ '^\d{1,4}$' then (inv ->> 'maxPerReply')::integer else 0 end;
  v_limit integer := case when coalesce(inv ->> 'guestLimit', '') ~ '^\d{1,6}$' then (inv ->> 'guestLimit')::integer else 0 end;
  v_seated integer;
begin
  if not p_attending then
    return null;
  end if;
  if p_party is null or p_party < 1 or p_party > 10 or (v_max > 0 and p_party > v_max) then
    return 'invalid';
  end if;
  if v_limit > 0 then
    select coalesce(sum(r.party_size), 0) into v_seated
    from public.a41_rsvps r
    where r.event_id = p_event.id and r.response = 'attending' and r.guest_id is distinct from p_guest;
    if v_seated + p_party > v_limit then
      return 'full';
    end if;
  end if;
  return null;
end
$$;

revoke all on function a41_private.invitation_closed(public.a41_events) from public, anon, authenticated;
revoke all on function a41_private.invitation_room(public.a41_events, uuid, boolean, integer) from public, anon, authenticated;

-- The pass for a token: who it belongs to and whether they are checked in. Null for unknown tokens (and for events
-- that are not published). Does not change anything.
-- Returns { token, guest: { name, guest_number, table_no, tags }, event, rsvp: null | { response, party_size,
--           responded_at }, checked_in_at }.
create or replace function public.a41_guest_pass(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  g public.a41_guests;
begin
  select * into g from a41_private.guest_by_token(btrim(coalesce(p_token, '')));
  if not found then
    return null;
  end if;
  return (
    select jsonb_build_object(
      'token', g.token,
      'guest', jsonb_build_object('name', g.name, 'guest_number', g.guest_number, 'table_no', g.table_no, 'tags', to_jsonb(g.tags)),
      'event', a41_private.public_event_json(e),
      'rsvp', case when r.guest_id is null then null else jsonb_build_object(
        'response', r.response, 'party_size', r.party_size, 'responded_at', r.responded_at
      ) end,
      'checked_in_at', c.checked_in_at
    )
    from public.a41_events e
    left join public.a41_rsvps r on r.guest_id = g.id
    left join public.a41_checkins c on c.guest_id = g.id
    where e.id = g.event_id
  );
end
$$;

-- The public invitation form (/events/<slug>/invitation): anyone with the link replies, and gets a pass.
--   The guest is found by p_token (a pass this phone already holds), else by email, else by phone; otherwise a new
--   guest is added. Sending the form again with the same email or phone updates the same guest and RSVP.
--   Follows the published invitation settings: accepting, replyBy, opensAt, maxPerReply, guestLimit, and the
--   package's guest capacity. Limited per phone/email, per network address and per event.
-- Returns { ok: true, token, guest_number, name, table_no, response, party_size, created }
--      or { ok: true, stored: false, response: 'declined' } (a decline that no longer fits the list)
--      or { ok: false, reason: not_found | closed | paused | not_open | full | invalid (field) | rate_limited }.
create or replace function public.a41_register(
  p_slug text,
  p_name text,
  p_email text default null,
  p_phone text default null,
  p_attending boolean default true,
  p_party_size integer default 1,
  p_answers jsonb default '{}'::jsonb,
  p_message text default null,
  p_token text default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  e public.a41_events;
  g public.a41_guests;
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := a41_private.normalize_email(p_email);
  v_phone text;
  v_attending boolean := coalesce(p_attending, true);
  v_party integer := case when coalesce(p_attending, true) then coalesce(p_party_size, 1) else 1 end;
  v_message text := a41_private.clean_text(p_message);
  v_reason text;
  v_created boolean := false;
  v_headers jsonb;
  v_ip text;
begin
  select * into e from public.a41_events where slug = lower(btrim(coalesce(p_slug, ''))) and status = 'published';
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  v_reason := a41_private.invitation_closed(e);
  if v_reason is not null then
    return jsonb_build_object('ok', false, 'reason', v_reason);
  end if;

  v_phone := a41_private.normalize_phone(p_phone, a41_private.event_country(e.id));
  if char_length(v_name) not between 1 and 160 then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'name');
  end if;
  if v_email is not null and not a41_private.is_valid_email(v_email) then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'email');
  end if;
  if v_phone is not null and not a41_private.is_valid_phone(v_phone) then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'phone');
  end if;
  if char_length(v_message) > 500 then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'message');
  end if;

  -- Rate limits: per person, per network address, and a ceiling for the whole event.
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_headers := null;
  end;
  v_ip := coalesce(v_headers ->> 'cf-connecting-ip', nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), ''), v_headers ->> 'x-real-ip');
  if not public.a41_svc_hit(format('reg:%s:%s', e.id, coalesce(v_email, v_phone, nullif(btrim(coalesce(p_token, '')), ''), 'name:' || lower(v_name))), 10, 600)
     or (v_ip is not null and not public.a41_svc_hit(format('reg-ip:%s:%s', e.id, v_ip), 30, 600))
     or not public.a41_svc_hit(format('reg-event:%s', e.id), 600, 600) then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  -- One reply at a time per event, so the seat limit and the package capacity hold.
  select * into e from public.a41_events x where x.id = e.id for update;

  if nullif(btrim(coalesce(p_token, '')), '') is not null then
    select * into g from public.a41_guests x where x.event_id = e.id and x.token = btrim(p_token);
  end if;
  if g.id is null and v_email is not null then
    select * into g from public.a41_guests x where x.event_id = e.id and x.email = v_email;
  end if;
  if g.id is null and v_phone is not null then
    select * into g from public.a41_guests x where x.event_id = e.id and x.phone = v_phone;
  end if;

  v_reason := a41_private.invitation_room(e, g.id, v_attending, v_party);
  if v_reason is not null then
    return jsonb_build_object('ok', false, 'reason', v_reason, 'field', case when v_reason = 'invalid' then 'party_size' end);
  end if;

  if g.id is null then
    begin
      insert into public.a41_guests (event_id, name, email, phone)
      values (e.id, v_name, v_email, v_phone)
      returning * into g;
      v_created := true;
    exception when check_violation then
      if sqlerrm <> 'guest_capacity_exceeded' then
        raise;
      end if;
      if not v_attending then
        return jsonb_build_object('ok', true, 'stored', false, 'response', 'declined');
      end if;
      return jsonb_build_object('ok', false, 'reason', 'full');
    end;
  else
    -- Fill in contacts the list does not have yet (when no other guest uses them); the name on the list stays.
    update public.a41_guests x
    set email = coalesce(x.email, case when v_email is not null and not exists (
                  select 1 from public.a41_guests y where y.event_id = e.id and y.email = v_email) then v_email end),
        phone = coalesce(x.phone, case when v_phone is not null and not exists (
                  select 1 from public.a41_guests y where y.event_id = e.id and y.phone = v_phone) then v_phone end)
    where x.id = g.id
    returning * into g;
  end if;

  insert into public.a41_rsvps (guest_id, event_id, response, party_size, message, answers)
  values (g.id, e.id, case when v_attending then 'attending' else 'declined' end, v_party, v_message, a41_private.clean_answers(p_answers))
  on conflict (guest_id) do update set
    response = excluded.response,
    party_size = excluded.party_size,
    message = excluded.message,
    answers = excluded.answers,
    responded_at = now();

  return jsonb_build_object(
    'ok', true,
    'stored', true,
    'token', g.token,
    'guest_number', g.guest_number,
    'name', g.name,
    'table_no', g.table_no,
    'response', case when v_attending then 'attending' else 'declined' end,
    'party_size', v_party,
    'created', v_created
  );
end
$$;

-- The personal invitation link (?t=<token>): now also shows the guest number and the RSVP's answers.
create or replace function public.a41_open_invitation(p_token text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_guest public.a41_guests;
  v_event public.a41_events;
  v_rsvp public.a41_rsvps;
  v_checked_in_at timestamptz;
begin
  select * into v_guest from a41_private.guest_by_token(p_token);
  if not found then
    return null;
  end if;

  update public.a41_guests set status = 'opened' where id = v_guest.id and status in ('invited', 'sent');

  select * into v_event from public.a41_events where id = v_guest.event_id;
  select * into v_rsvp from public.a41_rsvps where guest_id = v_guest.id;
  select c.checked_in_at into v_checked_in_at from public.a41_checkins c where c.guest_id = v_guest.id;

  return jsonb_build_object(
    'guest', jsonb_build_object('name', v_guest.name, 'table_no', v_guest.table_no, 'guest_number', v_guest.guest_number),
    'event', a41_private.public_event_json(v_event),
    'rsvp', case when v_rsvp.guest_id is null then null else jsonb_build_object(
      'response', v_rsvp.response,
      'party_size', v_rsvp.party_size,
      'meal_preference', v_rsvp.meal_preference,
      'message', v_rsvp.message,
      'answers', v_rsvp.answers,
      'responded_at', v_rsvp.responded_at
    ) end,
    'rsvp_open', a41_private.invitation_closed(v_event) is null,
    'checked_in_at', v_checked_in_at
  );
end
$$;

-- RSVP through the personal link. Now also stores the form's own answers (p_answers) and follows the published
-- invitation settings like the public form. Calls without p_answers keep working.
drop function if exists public.a41_submit_rsvp(text, text, integer, text, text);
create or replace function public.a41_submit_rsvp(
  p_token text, p_response text, p_party_size integer, p_meal_preference text, p_message text, p_answers jsonb default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_guest public.a41_guests;
  v_event public.a41_events;
  v_party integer;
  v_meal text := a41_private.clean_text(p_meal_preference);
  v_message text := a41_private.clean_text(p_message);
  v_reason text;
  v_rsvp public.a41_rsvps;
begin
  select * into v_guest from a41_private.guest_by_token(p_token);
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into v_event from public.a41_events where id = v_guest.event_id for update;
  v_reason := a41_private.invitation_closed(v_event);
  if v_reason is not null then
    return jsonb_build_object('ok', false, 'reason', v_reason);
  end if;

  if p_response is null or p_response not in ('attending', 'declined') then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'response');
  end if;

  v_party := case when p_response = 'declined' then 1 else coalesce(p_party_size, 1) end;
  v_reason := a41_private.invitation_room(v_event, v_guest.id, p_response = 'attending', v_party);
  if v_reason = 'invalid' then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'party_size');
  elsif v_reason is not null then
    return jsonb_build_object('ok', false, 'reason', v_reason);
  end if;
  if p_response = 'declined' then
    v_meal := null;
  end if;
  if char_length(v_meal) > 100 then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'meal_preference');
  end if;
  if char_length(v_message) > 500 then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'message');
  end if;

  insert into public.a41_rsvps as cur (guest_id, event_id, response, party_size, meal_preference, message, answers)
  values (v_guest.id, v_guest.event_id, p_response, v_party, v_meal, v_message, a41_private.clean_answers(coalesce(p_answers, '{}'::jsonb)))
  on conflict (guest_id) do update set
    response = excluded.response,
    party_size = excluded.party_size,
    meal_preference = excluded.meal_preference,
    message = excluded.message,
    answers = case when p_answers is null then cur.answers else excluded.answers end,
    responded_at = now()
  returning * into v_rsvp;

  return jsonb_build_object(
    'ok', true,
    'rsvp', jsonb_build_object(
      'response', v_rsvp.response,
      'party_size', v_rsvp.party_size,
      'meal_preference', v_rsvp.meal_preference,
      'message', v_rsvp.message,
      'answers', v_rsvp.answers,
      'responded_at', v_rsvp.responded_at
    )
  );
end
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────────────────────────────────────────

revoke all on function public.a41_guest_list(uuid) from public, anon;
revoke all on function public.a41_import_guests(uuid, jsonb, boolean) from public, anon;
revoke all on function public.a41_update_guest(uuid, jsonb) from public, anon;
revoke all on function public.a41_delete_guests(uuid, uuid[]) from public, anon;
revoke all on function public.a41_guest_counts() from public, anon;
revoke all on function public.a41_check_in_by_token(uuid, text) from public, anon;
revoke all on function public.a41_check_in_guest(uuid, uuid) from public, anon;
revoke all on function public.a41_undo_check_in(uuid, uuid) from public, anon;
revoke all on function public.a41_desk_guests(uuid) from public, anon;
revoke all on function public.a41_search_checkin_guests(uuid, text) from public, anon;
revoke all on function public.a41_checkin_stats(uuid, integer) from public, anon;
revoke all on function public.a41_add_walk_in(uuid, text, text, text, text, text[]) from public, anon;
grant execute on function public.a41_guest_list(uuid) to authenticated, service_role;
grant execute on function public.a41_import_guests(uuid, jsonb, boolean) to authenticated, service_role;
grant execute on function public.a41_update_guest(uuid, jsonb) to authenticated, service_role;
grant execute on function public.a41_delete_guests(uuid, uuid[]) to authenticated, service_role;
grant execute on function public.a41_guest_counts() to authenticated, service_role;
grant execute on function public.a41_check_in_by_token(uuid, text) to authenticated, service_role;
grant execute on function public.a41_check_in_guest(uuid, uuid) to authenticated, service_role;
grant execute on function public.a41_undo_check_in(uuid, uuid) to authenticated, service_role;
grant execute on function public.a41_desk_guests(uuid) to authenticated, service_role;
grant execute on function public.a41_search_checkin_guests(uuid, text) to authenticated, service_role;
grant execute on function public.a41_checkin_stats(uuid, integer) to authenticated, service_role;
grant execute on function public.a41_add_walk_in(uuid, text, text, text, text, text[]) to authenticated, service_role;

revoke all on function public.a41_guest_pass(text) from public;
revoke all on function public.a41_register(text, text, text, text, boolean, integer, jsonb, text, text) from public;
revoke all on function public.a41_submit_rsvp(text, text, integer, text, text, jsonb) from public;
grant execute on function public.a41_guest_pass(text) to anon, authenticated, service_role;
grant execute on function public.a41_register(text, text, text, text, boolean, integer, jsonb, text, text) to anon, authenticated, service_role;
grant execute on function public.a41_submit_rsvp(text, text, integer, text, text, jsonb) to anon, authenticated, service_role;
