-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_safe_whatsapp.
-- Safe WhatsApp broadcasts (audit M1 + fair use).
-- - Messages only go to the event's own guests: the number always comes from a41_guests, never from the browser.
-- - Only the event's managers (organizer accounts that own it) can queue or stop messages.
-- - A daily limit per organization (rolling 24 hours, counted in messages), 2,000 unless the platform admin raises it.
-- - Fair turns: the sender serves the organization that has waited longest, so one big broadcast never blocks others.
-- - Every message starts with the event's name.
-- Backward compatible with the a41-whatsapp function that is live today (it inserts rows itself and calls the same
-- service functions); the new function calls a41_wa_enqueue / a41_wa_cancel as the signed-in organizer.

alter table public.a41_wa_messages
  add column if not exists guest_id uuid references public.a41_guests(id) on delete set null,
  add column if not exists claimed_at timestamptz;
-- Room for the event-name line in front of a 4,000-character message.
alter table public.a41_wa_messages drop constraint if exists a41_wa_messages_body_check;
alter table public.a41_wa_messages add constraint a41_wa_messages_body_check check (char_length(body) between 1 and 4200);

create index if not exists a41_wa_messages_guest_idx on public.a41_wa_messages (guest_id);
create index if not exists a41_wa_messages_org_waiting_idx on public.a41_wa_messages (org_id, id) where status in ('queued', 'sending');
create index if not exists a41_wa_messages_org_created_idx on public.a41_wa_messages (org_id, created_at);
drop index if exists public.a41_wa_messages_org_idx;

-- Daily limits per organization. No row means the default (2,000 a day on each channel).
create table if not exists a41_private.send_limits (
  org_id uuid primary key references public.a41_organizations(id) on delete cascade,
  whatsapp_daily integer not null default 2000 check (whatsapp_daily between 0 and 100000),
  email_daily integer not null default 2000 check (email_daily between 0 and 100000),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- When each organization last had a message picked up, per channel.
create table if not exists a41_private.send_turns (
  channel text not null check (channel in ('whatsapp', 'email')),
  org_id uuid not null references public.a41_organizations(id) on delete cascade,
  last_at timestamptz not null,
  primary key (channel, org_id)
);
create index if not exists send_turns_org_idx on a41_private.send_turns (org_id);

create or replace function a41_private.daily_limit(p_org uuid, p_channel text)
returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select case when p_channel = 'email' then l.email_daily else l.whatsapp_daily end
     from a41_private.send_limits l where l.org_id = p_org),
    2000
  )
$$;

-- Digits only; local numbers (0812…) get Indonesia's 62. Null when it cannot be a WhatsApp number.
create or replace function a41_private.wa_number(p_raw text)
returns text
language sql immutable set search_path = ''
as $$
  select case when d ~ '^[1-9][0-9]{7,14}$' then d end
  from (
    select case when x like '0%' then '62' || substr(x, 2) else x end as d
    from (select regexp_replace(coalesce(p_raw, ''), '\D', '', 'g') as x) a
  ) b
$$;

-- Who may send an event's broadcasts: organizer accounts that manage the event.
-- Uses a41_private.is_event_manager once it exists, a41_private.is_event_owner until then.
create or replace function a41_private.can_broadcast(p_event uuid)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  ok boolean;
begin
  if to_regprocedure('a41_private.is_event_manager(uuid)') is not null then
    execute 'select a41_private.is_event_manager($1)' into ok using p_event;
  else
    ok := a41_private.is_event_owner(p_event);
  end if;
  return coalesce(ok, false) and a41_private.is_organizer();
end
$$;

revoke all on table a41_private.send_limits, a41_private.send_turns from public, anon, authenticated;
revoke all on function a41_private.daily_limit(uuid, text) from public, anon, authenticated;
revoke all on function a41_private.wa_number(text) from public, anon, authenticated;
revoke all on function a41_private.can_broadcast(uuid) from public, anon, authenticated;

-- A run that starts after a pause is no longer paused.
create or replace function public.a41_svc_wa_begin(p_seconds integer)
returns json
language plpgsql security definer set search_path = ''
as $$
declare
  r a41_private.wa_runner;
begin
  update a41_private.wa_runner set lease_until = now() + make_interval(secs => p_seconds), note = null
  where id = 1 and (lease_until is null or lease_until < now())
  returning * into r;
  if not found then
    return json_build_object('ok', false);
  end if;
  return json_build_object('ok', true, 'last_sent_at', r.last_sent_at);
end
$$;

-- Claims waiting messages (and any left half-done by a run that crashed), taking turns between organizations:
-- each organization's oldest message first, starting with the organization that was served longest ago.
create or replace function public.a41_svc_wa_claim(p_limit integer)
returns setof public.a41_wa_messages
language sql security definer set search_path = ''
as $$
  with orgs as (
    select o.org_id, coalesce(t.last_at, '-infinity'::timestamptz) as last_at
    from (
      select distinct q.org_id from public.a41_wa_messages q
      where q.status = 'queued' or (q.status = 'sending' and q.lease_until < now())
    ) o
    left join a41_private.send_turns t on t.channel = 'whatsapp' and t.org_id = o.org_id
  ),
  picked as (
    select w.id
    from orgs
    cross join lateral (
      select q.id, row_number() over (order by q.id) as rn
      from public.a41_wa_messages q
      where q.org_id = orgs.org_id and (q.status = 'queued' or (q.status = 'sending' and q.lease_until < now()))
      order by q.id
      limit greatest(p_limit, 1)
    ) w
    order by w.rn, orgs.last_at, w.id
    limit greatest(p_limit, 1)
  ),
  claimed as (
    update public.a41_wa_messages m
    set status = 'sending', attempts = m.attempts + 1, lease_until = now() + interval '10 minutes', claimed_at = now()
    where m.id in (select id from picked)
      and (m.status = 'queued' or (m.status = 'sending' and m.lease_until < now()))
    returning m.*
  ),
  turns as (
    insert into a41_private.send_turns (channel, org_id, last_at)
    select 'whatsapp', d.org_id, clock_timestamp() from (select distinct c.org_id from claimed c) d
    on conflict (channel, org_id) do update set last_at = excluded.last_at
  )
  select * from claimed
$$;

-- Queues one WhatsApp message per guest of the event. Each item is {guestId, text}; items from older clients,
-- {phone, name, text}, are accepted only when the number belongs to one of the event's guests. Numbers always come
-- from the guest list, one message per number. Returns {ok:true, queued, skipped, batch, minutes, limit, remaining}
-- or {ok:false, reason: 'no_recipients' | 'daily_limit', ...}.
create or replace function public.a41_wa_enqueue(p_event uuid, p_label text, p_messages jsonb)
returns json
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  ev public.a41_events;
  total integer;
  picked jsonb;
  wanted integer;
  used integer;
  cap integer;
  mine bigint;
  ahead bigint;
  batch uuid := gen_random_uuid();
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  select * into ev from public.a41_events e where e.id = p_event;
  if not found then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
  if not a41_private.can_broadcast(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if jsonb_typeof(p_messages) is distinct from 'array' then
    raise exception 'invalid_messages' using errcode = '22023';
  end if;
  total := jsonb_array_length(p_messages);
  if total > 3000 then
    raise exception 'too_many_messages' using errcode = '22023';
  end if;
  if not public.a41_svc_hit('wa-enqueue:' || uid, 30, 3600) then
    raise exception 'rate_limited' using errcode = '53400';
  end if;

  with input as (
    select i.ord as n, i.value as m
    from jsonb_array_elements(p_messages) with ordinality as i(value, ord)
    where jsonb_typeof(i.value) = 'object'
  ),
  parsed as (
    select n,
      lower(nullif(btrim(coalesce(m ->> 'guestId', '')), '')) as guest_ref,
      a41_private.wa_number(m ->> 'phone') as phone,
      left(btrim(coalesce(m ->> 'text', '')), 4000) as txt
    from input
  ),
  guests as (
    select g.id, g.name, a41_private.wa_number(g.phone) as phone, g.created_at
    from public.a41_guests g
    where g.event_id = p_event
  ),
  by_guest as (
    select p.n, g.id as guest_id, g.name, g.phone, p.txt
    from parsed p join guests g on g.id::text = p.guest_ref
  ),
  by_phone as (
    select distinct on (p.n) p.n, g.id as guest_id, g.name, g.phone, p.txt
    from parsed p join guests g on g.phone = p.phone
    where p.guest_ref is null and p.phone is not null
    order by p.n, g.created_at, g.id
  ),
  one_each as (
    select distinct on (x.phone) x.n, x.guest_id, x.name, x.phone, x.txt
    from (select * from by_guest union all select * from by_phone) x
    where x.phone is not null and x.txt <> ''
    order by x.phone, x.n
  )
  select coalesce(jsonb_agg(to_jsonb(o) order by o.n), '[]'::jsonb) into picked from one_each o;

  wanted := jsonb_array_length(picked);
  if wanted = 0 then
    return json_build_object('ok', false, 'reason', 'no_recipients', 'skipped', total);
  end if;

  -- The limit counts messages over the last 24 hours, for the whole organization.
  perform pg_advisory_xact_lock(hashtextextended('a41-send-limit:whatsapp:' || ev.org_id::text, 0));
  cap := a41_private.daily_limit(ev.org_id, 'whatsapp');
  select count(*) into used from public.a41_wa_messages m
  where m.org_id = ev.org_id and m.created_at > now() - interval '24 hours' and m.status <> 'cancelled';
  if used + wanted > cap then
    return json_build_object('ok', false, 'reason', 'daily_limit', 'limit', cap, 'remaining', greatest(cap - used, 0), 'wanted', wanted);
  end if;

  insert into public.a41_wa_messages (org_id, event_id, guest_id, batch_id, label, to_name, to_phone, body, created_by)
  select ev.org_id, ev.id, (r ->> 'guest_id')::uuid, batch, left(btrim(coalesce(p_label, '')), 80), left(r ->> 'name', 160), r ->> 'phone',
    -- Every message starts with the event's name, so guests know who is writing.
    case when strpos(lower(r ->> 'txt'), lower(ev.name)) > 0 then r ->> 'txt'
         else '*' || ev.name || '*' || E'\n\n' || (r ->> 'txt') end,
    uid
  from jsonb_array_elements(picked) r;

  -- With fair turns, this organization's last message goes out after up to as many from every other organization.
  select count(*) into mine from public.a41_wa_messages w where w.org_id = ev.org_id and w.status in ('queued', 'sending');
  select coalesce(sum(least(o.n, mine)), 0) into ahead
  from (select count(*) as n from public.a41_wa_messages w where w.status in ('queued', 'sending') group by w.org_id) o;

  return json_build_object(
    'ok', true, 'queued', wanted, 'skipped', total - wanted, 'batch', batch,
    'minutes', greatest(1, ceil(ahead / 6.0))::integer, 'limit', cap, 'remaining', cap - used - wanted
  );
end
$$;

-- Stops the event's messages that have not gone out yet.
create or replace function public.a41_wa_cancel(p_event uuid)
returns json
language plpgsql security definer set search_path = ''
as $$
declare
  n integer;
begin
  if (select auth.uid()) is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if not exists (select 1 from public.a41_events e where e.id = p_event) then
    raise exception 'event_not_found' using errcode = 'P0002';
  end if;
  if not a41_private.can_broadcast(p_event) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  with c as (
    update public.a41_wa_messages set status = 'cancelled', lease_until = null
    where event_id = p_event and status = 'queued'
    returning 1
  )
  select count(*) into n from c;
  return json_build_object('cancelled', n);
end
$$;

-- Progress of one event's WhatsApp messages, for its team. Null when the caller is not on the event's team.
-- New: paused (sending is on hold for everyone), ahead counted with fair turns, and the organization's daily use.
create or replace function public.a41_wa_stats(p_event uuid)
returns json
language plpgsql stable security definer set search_path = ''
as $$
declare
  org uuid;
  mine bigint;
  result json;
begin
  select e.org_id into org from public.a41_events e where e.id = p_event;
  if org is null or not a41_private.is_org_member(org) then
    return null;
  end if;
  select count(*) into mine from public.a41_wa_messages w
  where w.org_id = org and w.status in ('queued', 'sending')
    and w.id <= (
      select max(x.id) from public.a41_wa_messages x
      where x.event_id = p_event and x.status in ('queued', 'sending')
    );
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
    'paused', coalesce((select r.note is not null and r.lease_until > now() from a41_private.wa_runner r where r.id = 1), false),
    'lastFailure', (
      select f.error from public.a41_wa_messages f
      where f.event_id = p_event and f.status = 'failed'
      order by f.id desc limit 1
    ),
    'ahead', case when mine = 0 then 0 else (
      select coalesce(sum(least(o.n, mine)), 0)
      from (select count(*) as n from public.a41_wa_messages w where w.status in ('queued', 'sending') group by w.org_id) o
    ) end,
    'usedToday', (
      select count(*) from public.a41_wa_messages u
      where u.org_id = org and u.created_at > now() - interval '24 hours' and u.status <> 'cancelled'
    ),
    'limit', a41_private.daily_limit(org, 'whatsapp')
  ) into result
  from public.a41_wa_messages m
  where m.event_id = p_event;
  return result;
end
$$;

-- Platform admin: change an organization's daily limits (null keeps the current value).
create or replace function public.a41_admin_set_send_limits(p_org uuid, p_whatsapp integer default null, p_email integer default null)
returns json
language plpgsql security definer set search_path = ''
as $$
begin
  if not a41_private.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.a41_organizations o where o.id = p_org) then
    raise exception 'org_not_found' using errcode = 'P0002';
  end if;
  if (p_whatsapp is not null and p_whatsapp not between 0 and 100000) or (p_email is not null and p_email not between 0 and 100000) then
    raise exception 'invalid_limit' using errcode = 'check_violation', detail = 'Use a number from 0 to 100000.';
  end if;
  insert into a41_private.send_limits as l (org_id, whatsapp_daily, email_daily, updated_at, updated_by)
  values (p_org, coalesce(p_whatsapp, 2000), coalesce(p_email, 2000), now(), (select auth.uid()))
  on conflict (org_id) do update set
    whatsapp_daily = coalesce(p_whatsapp, l.whatsapp_daily),
    email_daily = coalesce(p_email, l.email_daily),
    updated_at = now(),
    updated_by = excluded.updated_by;
  return json_build_object('whatsapp', a41_private.daily_limit(p_org, 'whatsapp'), 'email', a41_private.daily_limit(p_org, 'email'));
end
$$;

revoke all on function public.a41_svc_wa_begin(integer) from public, anon, authenticated;
revoke all on function public.a41_svc_wa_claim(integer) from public, anon, authenticated;
grant execute on function public.a41_svc_wa_begin(integer) to service_role;
grant execute on function public.a41_svc_wa_claim(integer) to service_role;
revoke all on function public.a41_wa_enqueue(uuid, text, jsonb) from public, anon;
revoke all on function public.a41_wa_cancel(uuid) from public, anon;
revoke all on function public.a41_wa_stats(uuid) from public, anon;
revoke all on function public.a41_admin_set_send_limits(uuid, integer, integer) from public, anon;
grant execute on function public.a41_wa_enqueue(uuid, text, jsonb) to authenticated;
grant execute on function public.a41_wa_cancel(uuid) to authenticated;
grant execute on function public.a41_wa_stats(uuid) to authenticated;
grant execute on function public.a41_admin_set_send_limits(uuid, integer, integer) to authenticated;
