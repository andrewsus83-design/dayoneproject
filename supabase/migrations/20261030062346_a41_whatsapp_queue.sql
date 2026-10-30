-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_whatsapp_queue.
-- WhatsApp sending through Fonnte: a queue of messages, filled by organizers (a41-whatsapp edge function, action
-- "enqueue") and sent one at a time, 5–15 s apart, by the same function's "run" action on a one-minute timer.
create table public.a41_wa_messages (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.a41_organizations(id) on delete cascade,
  event_id uuid references public.a41_events(id) on delete cascade,
  batch_id uuid not null,
  label text not null default '' check (char_length(label) <= 80),
  to_name text not null default '' check (char_length(to_name) <= 160),
  to_phone text not null check (to_phone ~ '^[1-9][0-9]{7,14}$'),
  body text not null check (char_length(body) between 1 and 4000),
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0,
  error text,
  provider_id text,
  lease_until timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index a41_wa_messages_waiting_idx on public.a41_wa_messages (id) where status in ('queued', 'sending');
create index a41_wa_messages_event_idx on public.a41_wa_messages (event_id, status);
create index a41_wa_messages_org_idx on public.a41_wa_messages (org_id);
create index a41_wa_messages_created_by_idx on public.a41_wa_messages (created_by);

alter table public.a41_wa_messages enable row level security;
-- Organization members can read their own messages; every write goes through the edge function.
create policy wa_messages_select on public.a41_wa_messages for select to authenticated
  using ((select a41_private.is_org_member(org_id)));

-- One sender at a time keeps the 5–15 s spacing; last_sent_at carries it from one run to the next.
create table a41_private.wa_runner (
  id smallint primary key default 1 check (id = 1),
  lease_until timestamptz,
  last_sent_at timestamptz,
  note text
);
insert into a41_private.wa_runner (id) values (1);

-- Takes the sender lease; ok=false when another run holds it (or sending is paused after an account problem).
create or replace function public.a41_svc_wa_begin(p_seconds integer)
returns json
language plpgsql security definer set search_path = ''
as $$
declare
  r a41_private.wa_runner;
begin
  update a41_private.wa_runner set lease_until = now() + make_interval(secs => p_seconds)
  where id = 1 and (lease_until is null or lease_until < now())
  returning * into r;
  if not found then
    return json_build_object('ok', false);
  end if;
  return json_build_object('ok', true, 'last_sent_at', r.last_sent_at);
end
$$;

-- Releases the lease, or keeps it for p_pause_seconds and records why (token, quota or a disconnected number).
create or replace function public.a41_svc_wa_end(p_pause_seconds integer default 0, p_note text default null)
returns void
language sql security definer set search_path = ''
as $$
  update a41_private.wa_runner
  set lease_until = case when p_pause_seconds > 0 then now() + make_interval(secs => p_pause_seconds) end,
      note = left(p_note, 300)
  where id = 1
$$;

-- Claims the oldest waiting messages (and any left half-done by a run that crashed).
create or replace function public.a41_svc_wa_claim(p_limit integer)
returns setof public.a41_wa_messages
language sql security definer set search_path = ''
as $$
  update public.a41_wa_messages m
  set status = 'sending', attempts = m.attempts + 1, lease_until = now() + interval '10 minutes'
  where m.id in (
    select w.id from public.a41_wa_messages w
    where w.status = 'queued' or (w.status = 'sending' and w.lease_until < now())
    order by w.id
    limit p_limit
    for update skip locked
  )
  returning m.*
$$;

create or replace function public.a41_svc_wa_finish(p_id bigint, p_outcome text, p_note text default null, p_provider_id text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_outcome = 'sent' then
    update public.a41_wa_messages
    set status = 'sent', sent_at = now(), provider_id = p_provider_id, error = null, lease_until = null
    where id = p_id;
    update a41_private.wa_runner set last_sent_at = now() where id = 1;
  elsif p_outcome = 'failed' then
    update public.a41_wa_messages set status = 'failed', error = left(p_note, 300), lease_until = null where id = p_id;
  elsif p_outcome = 'retry' then
    update public.a41_wa_messages
    set status = case when attempts >= 3 then 'failed' else 'queued' end, error = left(p_note, 300), lease_until = null
    where id = p_id;
  elsif p_outcome = 'hold' then
    update public.a41_wa_messages
    set status = 'queued', attempts = greatest(attempts - 1, 0), error = left('held: ' || coalesce(p_note, ''), 300), lease_until = null
    where id = p_id;
  else
    raise exception 'unknown outcome %', p_outcome;
  end if;
end
$$;

-- Sender state and the whole queue, for the platform admin page (through the edge function).
create or replace function public.a41_svc_wa_overview()
returns json
language sql stable security definer set search_path = ''
as $$
  select json_build_object(
    'waiting', (select count(*) from public.a41_wa_messages where status in ('queued', 'sending')),
    'sentToday', (select count(*) from public.a41_wa_messages where status = 'sent' and sent_at > now() - interval '24 hours'),
    'failedToday', (select count(*) from public.a41_wa_messages where status = 'failed' and created_at > now() - interval '24 hours'),
    'pausedUntil', (select case when note is not null and lease_until > now() then lease_until end from a41_private.wa_runner where id = 1),
    'note', (select note from a41_private.wa_runner where id = 1),
    'lastSentAt', (select last_sent_at from a41_private.wa_runner where id = 1),
    'recent', coalesce((
      select json_agg(r order by r.id desc) from (
        select m.id, coalesce(e.name, 'Test') as event, m.label, m.to_name, right(m.to_phone, 4) as phone_end,
               m.status, m.error, m.created_at, m.sent_at
        from public.a41_wa_messages m left join public.a41_events e on e.id = m.event_id
        order by m.id desc limit 30
      ) r
    ), '[]'::json)
  )
$$;

-- Progress of one event's WhatsApp messages, for its organizers. Null when the caller is not on the event's team.
create or replace function public.a41_wa_stats(p_event uuid)
returns json
language sql stable security definer set search_path = ''
as $$
  select case
    when not exists (
      select 1 from public.a41_events e where e.id = p_event and (select a41_private.is_org_member(e.org_id))
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

revoke all on function public.a41_svc_wa_begin(integer) from public, anon, authenticated;
revoke all on function public.a41_svc_wa_end(integer, text) from public, anon, authenticated;
revoke all on function public.a41_svc_wa_claim(integer) from public, anon, authenticated;
revoke all on function public.a41_svc_wa_finish(bigint, text, text, text) from public, anon, authenticated;
revoke all on function public.a41_svc_wa_overview() from public, anon, authenticated;
grant execute on function public.a41_svc_wa_begin(integer) to service_role;
grant execute on function public.a41_svc_wa_end(integer, text) to service_role;
grant execute on function public.a41_svc_wa_claim(integer) to service_role;
grant execute on function public.a41_svc_wa_finish(bigint, text, text, text) to service_role;
grant execute on function public.a41_svc_wa_overview() to service_role;
revoke all on function public.a41_wa_stats(uuid) from public, anon;
grant execute on function public.a41_wa_stats(uuid) to authenticated;

-- Every minute, wake the sender, but only when something is waiting.
select cron.schedule(
  'a41-whatsapp-send',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://pmuryumfyekjwqntcypo.supabase.co/functions/v1/a41-whatsapp',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"action": "run"}'::jsonb,
    timeout_milliseconds := 2000
  )
  where exists (select 1 from public.a41_wa_messages where status in ('queued', 'sending'))
  $cron$
);
