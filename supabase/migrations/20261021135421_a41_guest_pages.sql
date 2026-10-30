create function a41_private.enforce_publish_rules() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status = 'published' and old.status = 'archived' then
    raise exception 'archived_event_cannot_publish'
      using errcode = 'check_violation', detail = 'Restore the event before publishing it.';
  end if;
  return new;
end
$$;

create trigger a41_events_enforce_publish before update of status on public.a41_events
  for each row when (old.status is distinct from new.status)
  execute function a41_private.enforce_publish_rules();

create function a41_private.public_event_json(p_event public.a41_events) returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'slug', p_event.slug,
    'name', p_event.name,
    'type', p_event.type,
    'timezone', p_event.timezone,
    'starts_at', p_event.starts_at,
    'ends_at', p_event.ends_at,
    'venue_name', p_event.venue_name,
    'venue_address', p_event.venue_address,
    'theme', p_event.theme
  )
$$;

create function a41_private.clean_text(p_text text) returns text
language sql immutable set search_path = ''
as $$
  select nullif(regexp_replace(p_text, '^\s+|\s+$', '', 'g'), '')
$$;

revoke execute on function a41_private.public_event_json(public.a41_events), a41_private.clean_text(text) from public;

create function public.a41_public_event(p_slug text) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select a41_private.public_event_json(e)
  from public.a41_events e
  where e.slug = p_slug and e.status = 'published'
$$;

create function public.a41_open_invitation(p_token text) returns jsonb
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
    'guest', jsonb_build_object('name', v_guest.name, 'table_no', v_guest.table_no),
    'event', a41_private.public_event_json(v_event),
    'rsvp', case when v_rsvp.guest_id is null then null else jsonb_build_object(
      'response', v_rsvp.response,
      'party_size', v_rsvp.party_size,
      'meal_preference', v_rsvp.meal_preference,
      'message', v_rsvp.message,
      'responded_at', v_rsvp.responded_at
    ) end,
    'rsvp_open', now() < v_event.ends_at,
    'checked_in_at', v_checked_in_at
  );
end
$$;

create function public.a41_submit_rsvp(
  p_token text,
  p_response text,
  p_party_size integer,
  p_meal_preference text,
  p_message text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_guest public.a41_guests;
  v_event public.a41_events;
  v_party integer;
  v_meal text := a41_private.clean_text(p_meal_preference);
  v_message text := a41_private.clean_text(p_message);
  v_rsvp public.a41_rsvps;
begin
  select * into v_guest from a41_private.guest_by_token(p_token);
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into v_event from public.a41_events where id = v_guest.event_id;
  if now() >= v_event.ends_at then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;

  if p_response is null or p_response not in ('attending', 'declined') then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'response');
  end if;

  v_party := case when p_response = 'declined' then 1 else coalesce(p_party_size, 1) end;
  if v_party not between 1 and 10 then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'party_size');
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

  insert into public.a41_rsvps (guest_id, event_id, response, party_size, meal_preference, message)
  values (v_guest.id, v_guest.event_id, p_response, v_party, v_meal, v_message)
  on conflict (guest_id) do update set
    response = excluded.response,
    party_size = excluded.party_size,
    meal_preference = excluded.meal_preference,
    message = excluded.message,
    responded_at = now()
  returning * into v_rsvp;

  return jsonb_build_object(
    'ok', true,
    'rsvp', jsonb_build_object(
      'response', v_rsvp.response,
      'party_size', v_rsvp.party_size,
      'meal_preference', v_rsvp.meal_preference,
      'message', v_rsvp.message,
      'responded_at', v_rsvp.responded_at
    )
  );
end
$$;

revoke execute on function
  public.a41_public_event(text),
  public.a41_open_invitation(text),
  public.a41_submit_rsvp(text, text, integer, text, text)
from public;

grant execute on function
  public.a41_public_event(text),
  public.a41_open_invitation(text),
  public.a41_submit_rsvp(text, text, integer, text, text)
to anon, authenticated;
