-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_email_queue.
-- Email broadcasts sent from the server (a41-email edge function, through Resend), with the same lifecycle as
-- WhatsApp: organizers queue one email per guest (a41_email_enqueue), the "run" action sends about 2 a second
-- under a single runner lease, and a one-minute timer wakes it while anything waits.
-- Addresses always come from a41_guests; each organization has a daily limit (a41_private.send_limits.email_daily).

create table if not exists public.a41_email_messages (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.a41_organizations(id) on delete cascade,
  event_id uuid not null references public.a41_events(id) on delete cascade,
  guest_id uuid references public.a41_guests(id) on delete set null,
  batch_id uuid not null,
  label text not null default '' check (char_length(label) <= 80),
  kind text not null default 'custom' check (kind in ('invitation', 'pass', 'reminder', 'thankyou', 'winner', 'custom')),
  to_name text not null default '' check (char_length(to_name) <= 160),
  to_email text not null check (char_length(to_email) <= 254 and to_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  reply_to text check (char_length(reply_to) <= 254),
  subject text not null check (char_length(subject) between 1 and 300),
  html text not null check (char_length(html) between 1 and 100000),
  text text not null default '' check (char_length(text) <= 20000),
  -- Invitation, pass and reminder emails carry an .ics calendar file built from the event at send time.
  with_ics boolean not null default false,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0,
  error text,
  provider_id text,
  lease_until timestamptz,
  claimed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists a41_email_messages_waiting_idx on public.a41_email_messages (id) where status in ('queued', 'sending');
create index if not exists a41_email_messages_org_waiting_idx on public.a41_email_messages (org_id, id) where status in ('queued', 'sending');
create index if not exists a41_email_messages_org_created_idx on public.a41_email_messages (org_id, created_at);
create index if not exists a41_email_messages_event_idx on public.a41_email_messages (event_id, status);
create index if not exists a41_email_messages_batch_idx on public.a41_email_messages (batch_id);
create index if not exists a41_email_messages_guest_idx on public.a41_email_messages (guest_id);
create index if not exists a41_email_messages_created_by_idx on public.a41_email_messages (created_by);

-- Bodies hold guests' pass links: nobody reads this table directly. Progress comes from a41_email_stats.
alter table public.a41_email_messages enable row level security;
revoke all on public.a41_email_messages from anon, authenticated;

-- One sender at a time; last_sent_at carries the pacing from one run to the next.
create table if not exists a41_private.email_runner (
  id smallint primary key default 1 check (id = 1),
  lease_until timestamptz,
  last_sent_at timestamptz,
  note text
);
insert into a41_private.email_runner (id) values (1) on conflict do nothing;
revoke all on a41_private.email_runner from public, anon, authenticated;

create or replace function public.a41_svc_email_begin(p_seconds integer)
returns json
language plpgsql security definer set search_path = ''
as $$
declare
  r a41_private.email_runner;
begin
  update a41_private.email_runner set lease_until = now() + make_interval(secs => p_seconds), note = null
  where id = 1 and (lease_until is null or lease_until < now())
  returning * into r;
  if not found then
    return json_build_object('ok', false);
  end if;
  return json_build_object('ok', true, 'last_sent_at', r.last_sent_at);
end
$$;

-- Releases the lease, or keeps it for p_pause_seconds and records why (key, sender domain or quota problem).
create or replace function public.a41_svc_email_end(p_pause_seconds integer default 0, p_note text default null)
returns void
language sql security definer set search_path = ''
as $$
  update a41_private.email_runner
  set lease_until = case when p_pause_seconds > 0 then now() + make_interval(secs => p_pause_seconds) end,
      note = left(p_note, 300)
  where id = 1
$$;

-- Claims waiting emails with fair turns between organizations (as a41_svc_wa_claim), with what the sender needs:
-- the guest's pass code and the event's date, time and venue for the calendar file.
create or replace function public.a41_svc_email_claim(p_limit integer)
returns table (
  id bigint, kind text, to_email text, to_name text, reply_to text, subject text, html text, text text,
  with_ics boolean, created_at timestamptz, guest_token text,
  event_id uuid, event_name text, event_slug text, starts_at timestamptz, ends_at timestamptz,
  timezone text, venue_name text, venue_address text
)
language sql security definer set search_path = ''
as $$
  with orgs as (
    select o.org_id, coalesce(t.last_at, '-infinity'::timestamptz) as last_at
    from (
      select distinct q.org_id from public.a41_email_messages q
      where q.status = 'queued' or (q.status = 'sending' and q.lease_until < now())
    ) o
    left join a41_private.send_turns t on t.channel = 'email' and t.org_id = o.org_id
  ),
  picked as (
    select w.id
    from orgs
    cross join lateral (
      select q.id, row_number() over (order by q.id) as rn
      from public.a41_email_messages q
      where q.org_id = orgs.org_id and (q.status = 'queued' or (q.status = 'sending' and q.lease_until < now()))
      order by q.id
      limit greatest(p_limit, 1)
    ) w
    order by w.rn, orgs.last_at, w.id
    limit greatest(p_limit, 1)
  ),
  claimed as (
    update public.a41_email_messages m
    set status = 'sending', attempts = m.attempts + 1, lease_until = now() + interval '10 minutes', claimed_at = now()
    where m.id in (select id from picked)
      and (m.status = 'queued' or (m.status = 'sending' and m.lease_until < now()))
    returning m.*
  ),
  turns as (
    insert into a41_private.send_turns (channel, org_id, last_at)
    select 'email', d.org_id, clock_timestamp() from (select distinct c.org_id from claimed c) d
    on conflict (channel, org_id) do update set last_at = excluded.last_at
  )
  select c.id, c.kind, c.to_email, c.to_name, c.reply_to, c.subject, c.html, c.text,
    c.with_ics, c.created_at, g.token,
    e.id, e.name, e.slug, e.starts_at, e.ends_at, e.timezone, e.venue_name, e.venue_address
  from claimed c
  join public.a41_events e on e.id = c.event_id
  left join public.a41_guests g on g.id = c.guest_id
  order by c.id
$$;

create or replace function public.a41_svc_email_finish(p_id bigint, p_outcome text, p_note text default null, p_provider_id text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_outcome = 'sent' then
    update public.a41_email_messages
    set status = 'sent', sent_at = now(), provider_id = p_provider_id, error = null, lease_until = null
    where id = p_id;
    update a41_private.email_runner set last_sent_at = now() where id = 1;
  elsif p_outcome = 'failed' then
    update public.a41_email_messages set status = 'failed', error = left(p_note, 300), lease_until = null where id = p_id;
  elsif p_outcome = 'retry' then
    update public.a41_email_messages
    set status = case when attempts >= 3 then 'failed' else 'queued' end, error = left(p_note, 300), lease_until = null
    where id = p_id;
  elsif p_outcome = 'hold' then
    update public.a41_email_messages
    set status = 'queued', attempts = greatest(attempts - 1, 0), error = left('held: ' || coalesce(p_note, ''), 300), lease_until = null
    where id = p_id;
  elsif p_outcome = 'release' then
    -- Not tried (the run ran out of time, or the provider asked to slow down): back in line, no attempt used.
    update public.a41_email_messages
    set status = 'queued', attempts = greatest(attempts - 1, 0), lease_until = null
    where id = p_id;
  else
    raise exception 'unknown outcome %', p_outcome;
  end if;
end
$$;

-- Queues one email per guest of the event. Each item is {guestId, subject, html, text}: the organizer's edited
-- template, rendered for that guest. The address always comes from a41_guests, one email per address.
-- Large broadcasts arrive in parts: the first call (no p_batch) checks the whole broadcast (p_total) against the
-- daily limit and returns the batch id; later parts pass it back and do not count as new broadcasts.
-- Returns {ok:true, queued, skipped, batch, minutes, limit, remaining} or {ok:false, reason, ...}.
create or replace function public.a41_email_enqueue(
  p_event uuid, p_label text, p_kind text, p_messages jsonb, p_batch uuid default null, p_total integer default null
)
returns json
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  ev public.a41_events;
  kind text := case when p_kind in ('invitation', 'pass', 'reminder', 'thankyou', 'winner') then p_kind else 'custom' end;
  reply text;
  total integer;
  picked jsonb;
  wanted integer;
  needed integer;
  used integer;
  cap integer;
  mine bigint;
  ahead bigint;
  continuing boolean;
  batch uuid;
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
  if total > 500 then
    raise exception 'too_many_messages' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_messages) i
    where jsonb_typeof(i.value) = 'object'
      and (char_length(coalesce(i.value ->> 'html', '')) > 100000 or char_length(coalesce(i.value ->> 'text', '')) > 20000)
  ) then
    raise exception 'message_too_large' using errcode = '22023';
  end if;

  continuing := p_batch is not null and exists (
    select 1 from public.a41_email_messages b
    where b.batch_id = p_batch and b.event_id = p_event and b.created_by = uid and b.created_at > now() - interval '2 hours'
  );
  if continuing then
    batch := p_batch;
  else
    batch := gen_random_uuid();
    if not public.a41_svc_hit('email-enqueue:' || uid, 30, 3600) then
      raise exception 'rate_limited' using errcode = '53400';
    end if;
  end if;

  -- Replies go to the event's contact email when it has one.
  reply := lower(btrim(coalesce(ev.config #>> '{invitation,contactEmail}', '')));
  if reply !~ '^[^@[:space:]<>,;]+@[^@[:space:]<>,;]+\.[^@[:space:]<>,;]+$' or char_length(reply) > 254 then
    reply := null;
  end if;

  with input as (
    select i.ord as n, i.value as m
    from jsonb_array_elements(p_messages) with ordinality as i(value, ord)
    where jsonb_typeof(i.value) = 'object'
  ),
  parsed as (
    select n,
      lower(nullif(btrim(coalesce(m ->> 'guestId', '')), '')) as guest_ref,
      left(regexp_replace(btrim(coalesce(m ->> 'subject', '')), '[\r\n]+', ' ', 'g'), 300) as subject,
      coalesce(m ->> 'html', '') as html,
      coalesce(m ->> 'text', '') as txt
    from input
  ),
  matched as (
    select p.n, g.id as guest_id, g.name, lower(btrim(g.email)) as email, p.subject, p.html, p.txt
    from parsed p
    join public.a41_guests g on g.event_id = p_event and g.id::text = p.guest_ref
  ),
  one_each as (
    select distinct on (x.email) x.*
    from matched x
    where x.email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and char_length(x.email) <= 254
      and x.subject <> '' and btrim(x.html) <> ''
    order by x.email, x.n
  )
  select coalesce(jsonb_agg(to_jsonb(o) order by o.n), '[]'::jsonb) into picked from one_each o;

  wanted := jsonb_array_length(picked);
  if wanted = 0 then
    return json_build_object('ok', false, 'reason', 'no_recipients', 'skipped', total, 'batch', case when continuing then batch end);
  end if;

  -- The limit counts emails over the last 24 hours, for the whole organization; a new broadcast is checked whole.
  perform pg_advisory_xact_lock(hashtextextended('a41-send-limit:email:' || ev.org_id::text, 0));
  cap := a41_private.daily_limit(ev.org_id, 'email');
  select count(*) into used from public.a41_email_messages m
  where m.org_id = ev.org_id and m.created_at > now() - interval '24 hours' and m.status <> 'cancelled';
  needed := case when continuing then wanted else greatest(wanted, least(coalesce(p_total, 0), 100000)) end;
  if used + needed > cap then
    return json_build_object('ok', false, 'reason', 'daily_limit', 'limit', cap, 'remaining', greatest(cap - used, 0), 'wanted', needed);
  end if;

  insert into public.a41_email_messages
    (org_id, event_id, guest_id, batch_id, label, kind, to_name, to_email, reply_to, subject, html, text, with_ics, created_by)
  select ev.org_id, ev.id, (r ->> 'guest_id')::uuid, batch, left(btrim(coalesce(p_label, '')), 80), kind,
    left(r ->> 'name', 160), r ->> 'email', reply, r ->> 'subject', r ->> 'html', r ->> 'txt',
    kind in ('invitation', 'pass', 'reminder'), uid
  from jsonb_array_elements(picked) r;

  select count(*) into mine from public.a41_email_messages w where w.org_id = ev.org_id and w.status in ('queued', 'sending');
  select coalesce(sum(least(o.n, mine)), 0) into ahead
  from (select count(*) as n from public.a41_email_messages w where w.status in ('queued', 'sending') group by w.org_id) o;

  return json_build_object(
    'ok', true, 'queued', wanted, 'skipped', total - wanted, 'batch', batch,
    -- About 2 a second.
    'minutes', greatest(1, ceil(ahead / 120.0))::integer, 'limit', cap, 'remaining', cap - used - wanted
  );
end
$$;

create or replace function public.a41_email_cancel(p_event uuid)
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
    update public.a41_email_messages set status = 'cancelled', lease_until = null
    where event_id = p_event and status = 'queued'
    returning 1
  )
  select count(*) into n from c;
  return json_build_object('cancelled', n);
end
$$;

-- Progress of one event's emails, for its team (same shape as a41_wa_stats). Null when not on the event's team.
create or replace function public.a41_email_stats(p_event uuid)
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
  select count(*) into mine from public.a41_email_messages w
  where w.org_id = org and w.status in ('queued', 'sending')
    and w.id <= (
      select max(x.id) from public.a41_email_messages x
      where x.event_id = p_event and x.status in ('queued', 'sending')
    );
  select json_build_object(
    'waiting', count(*) filter (where m.status in ('queued', 'sending')),
    'sent', count(*) filter (where m.status = 'sent'),
    'failed', count(*) filter (where m.status = 'failed'),
    'cancelled', count(*) filter (where m.status = 'cancelled'),
    'lastSentAt', max(m.sent_at),
    'held', (
      select h.error from public.a41_email_messages h
      where h.event_id = p_event and h.status = 'queued' and h.error like 'held:%'
      order by h.id desc limit 1
    ),
    'paused', coalesce((select r.note is not null and r.lease_until > now() from a41_private.email_runner r where r.id = 1), false),
    'lastFailure', (
      select f.error from public.a41_email_messages f
      where f.event_id = p_event and f.status = 'failed'
      order by f.id desc limit 1
    ),
    'ahead', case when mine = 0 then 0 else (
      select coalesce(sum(least(o.n, mine)), 0)
      from (select count(*) as n from public.a41_email_messages w where w.status in ('queued', 'sending') group by w.org_id) o
    ) end,
    'usedToday', (
      select count(*) from public.a41_email_messages u
      where u.org_id = org and u.created_at > now() - interval '24 hours' and u.status <> 'cancelled'
    ),
    'limit', a41_private.daily_limit(org, 'email')
  ) into result
  from public.a41_email_messages m
  where m.event_id = p_event;
  return result;
end
$$;

-- Platform admin: every organization's use of both channels over the last 24 hours with its limits, and the email
-- sender's state and recent emails (addresses shortened).
create or replace function public.a41_admin_send_overview()
returns json
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not a41_private.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return json_build_object(
    'defaultLimit', 2000,
    'orgs', coalesce((
      select json_agg(x order by (x.wa_used + x.email_used) desc, x.name)
      from (
        select o.id, o.name,
          (select u.email::text from public.a41_memberships m join auth.users u on u.id = m.user_id
            where m.org_id = o.id and m.role = 'owner' order by m.created_at limit 1) as owner,
          wa.used as wa_used, em.used as email_used,
          json_build_object('used', wa.used, 'sent', wa.sent, 'waiting', wa.waiting, 'failed', wa.failed,
            'limit', a41_private.daily_limit(o.id, 'whatsapp')) as whatsapp,
          json_build_object('used', em.used, 'sent', em.sent, 'waiting', em.waiting, 'failed', em.failed,
            'limit', a41_private.daily_limit(o.id, 'email')) as email
        from public.a41_organizations o
        cross join lateral (
          select count(*) filter (where w.created_at > now() - interval '24 hours' and w.status <> 'cancelled') as used,
                 count(*) filter (where w.status = 'sent' and w.sent_at > now() - interval '24 hours') as sent,
                 count(*) filter (where w.status in ('queued', 'sending')) as waiting,
                 count(*) filter (where w.status = 'failed' and w.created_at > now() - interval '24 hours') as failed
          from public.a41_wa_messages w
          where w.org_id = o.id and (w.created_at > now() - interval '24 hours' or w.status in ('queued', 'sending'))
        ) wa
        cross join lateral (
          select count(*) filter (where m.created_at > now() - interval '24 hours' and m.status <> 'cancelled') as used,
                 count(*) filter (where m.status = 'sent' and m.sent_at > now() - interval '24 hours') as sent,
                 count(*) filter (where m.status in ('queued', 'sending')) as waiting,
                 count(*) filter (where m.status = 'failed' and m.created_at > now() - interval '24 hours') as failed
          from public.a41_email_messages m
          where m.org_id = o.id and (m.created_at > now() - interval '24 hours' or m.status in ('queued', 'sending'))
        ) em
        order by (wa.used + em.used) desc, o.created_at desc
        limit 200
      ) x
    ), '[]'::json),
    'email', json_build_object(
      'waiting', (select count(*) from public.a41_email_messages where status in ('queued', 'sending')),
      'sentToday', (select count(*) from public.a41_email_messages where status = 'sent' and sent_at > now() - interval '24 hours'),
      'failedToday', (select count(*) from public.a41_email_messages where status = 'failed' and created_at > now() - interval '24 hours'),
      'pausedUntil', (select case when note is not null and lease_until > now() then lease_until end from a41_private.email_runner where id = 1),
      'note', (select note from a41_private.email_runner where id = 1),
      'lastSentAt', (select last_sent_at from a41_private.email_runner where id = 1),
      'recent', coalesce((
        select json_agg(r order by r.id desc) from (
          select m.id, e.name as event, m.label, m.to_name,
                 left(m.to_email, 2) || '…@' || split_part(m.to_email, '@', 2) as email_hint,
                 m.status, m.error, m.created_at, m.sent_at
          from public.a41_email_messages m join public.a41_events e on e.id = m.event_id
          order by m.id desc limit 30
        ) r
      ), '[]'::json)
    )
  );
end
$$;

revoke all on function public.a41_svc_email_begin(integer) from public, anon, authenticated;
revoke all on function public.a41_svc_email_end(integer, text) from public, anon, authenticated;
revoke all on function public.a41_svc_email_claim(integer) from public, anon, authenticated;
revoke all on function public.a41_svc_email_finish(bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.a41_svc_email_begin(integer) to service_role;
grant execute on function public.a41_svc_email_end(integer, text) to service_role;
grant execute on function public.a41_svc_email_claim(integer) to service_role;
grant execute on function public.a41_svc_email_finish(bigint, text, text, text) to service_role;
revoke all on function public.a41_email_enqueue(uuid, text, text, jsonb, uuid, integer) from public, anon;
revoke all on function public.a41_email_cancel(uuid) from public, anon;
revoke all on function public.a41_email_stats(uuid) from public, anon;
revoke all on function public.a41_admin_send_overview() from public, anon;
grant execute on function public.a41_email_enqueue(uuid, text, text, jsonb, uuid, integer) to authenticated;
grant execute on function public.a41_email_cancel(uuid) to authenticated;
grant execute on function public.a41_email_stats(uuid) to authenticated;
grant execute on function public.a41_admin_send_overview() to authenticated;

-- Every minute, wake the email sender, but only when something is waiting.
select cron.schedule(
  'a41-email-send',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://pmuryumfyekjwqntcypo.supabase.co/functions/v1/a41-email',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"action": "run"}'::jsonb,
    timeout_milliseconds := 2000
  )
  where exists (select 1 from public.a41_email_messages where status in ('queued', 'sending'))
  $cron$
);
