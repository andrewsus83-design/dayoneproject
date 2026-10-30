-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_guest_numbers.
-- Guest numbers, contact clean-up helpers and a capacity check that runs once per statement, so a whole guest
-- list can be imported in one INSERT.

-- Every guest keeps a permanent number in their event (1, 2, 3 …). Numbers are never handed out twice, so a pass,
-- a door-prize ticket or a printed list keeps pointing at the same person after others are removed.
alter table public.a41_guests add column if not exists guest_number integer;

create table if not exists a41_private.guest_numbers (
  event_id uuid primary key references public.a41_events(id) on delete cascade,
  last_number integer not null default 0 check (last_number >= 0)
);

with numbered as (
  select g.id, row_number() over (partition by g.event_id order by g.created_at, g.id) as n
  from public.a41_guests g
)
update public.a41_guests g set guest_number = numbered.n
from numbered
where numbered.id = g.id and g.guest_number is null;

insert into a41_private.guest_numbers (event_id, last_number)
select g.event_id, max(g.guest_number) from public.a41_guests g group by g.event_id
on conflict (event_id) do update set last_number = greatest(a41_private.guest_numbers.last_number, excluded.last_number);

alter table public.a41_guests alter column guest_number set not null;
alter table public.a41_guests add constraint a41_guests_guest_number_check check (guest_number > 0);
alter table public.a41_guests add constraint a41_guests_event_number_key unique (event_id, guest_number);

-- Gives a new guest the next number unless the caller (the bulk import) already reserved one. The event row is
-- locked first, the same order the capacity check and the import use, so concurrent inserts queue instead of
-- deadlocking.
create or replace function a41_private.assign_guest_number()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.a41_events e where e.id = new.event_id for update;
  insert into a41_private.guest_numbers as n (event_id, last_number) values (new.event_id, 1)
  on conflict (event_id) do update set last_number = n.last_number + 1
  returning n.last_number into new.guest_number;
  return new;
end
$$;
revoke all on function a41_private.assign_guest_number() from public, anon, authenticated;

drop trigger if exists a41_guests_assign_number on public.a41_guests;
create trigger a41_guests_assign_number
  before insert on public.a41_guests
  for each row when (new.guest_number is null)
  execute function a41_private.assign_guest_number();

-- Capacity is checked once per INSERT statement (after the rows are in), not once per row: importing 2,000 guests
-- counts the list once instead of 2,000 times. Each event is locked before it is counted, so two imports that run
-- at the same time cannot both squeeze past the limit.
create or replace function a41_private.enforce_guest_capacity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  ev record;
  current_count integer;
begin
  for ev in
    select e.id, p.guest_capacity + e.extra_guests as capacity
    from public.a41_events e
    join public.a41_packages p on p.tier = e.package
    where e.id in (select distinct n.event_id from new_rows n)
    order by e.id
    for update of e
  loop
    select count(*) into current_count from public.a41_guests g where g.event_id = ev.id;
    if current_count > ev.capacity then
      raise exception 'guest_capacity_exceeded'
        using errcode = 'check_violation',
              detail = format('The guest list is full: this event holds %s guests and this would make %s.', ev.capacity, current_count),
              hint = 'Remove guests, or ask the platform admin to raise the package.';
    end if;
  end loop;
  return null;
end
$$;
revoke all on function a41_private.enforce_guest_capacity() from public, anon, authenticated;

drop trigger if exists a41_guests_enforce_capacity on public.a41_guests;
create trigger a41_guests_enforce_capacity
  after insert on public.a41_guests
  referencing new table as new_rows
  for each statement
  execute function a41_private.enforce_guest_capacity();

-- Phone numbers are stored as +<country><number>. Local numbers (08…) get the event's country code, "62…"
-- gets a plus, "00…" becomes "+…". The result still has to pass the guests table check (+ and 7–15 digits).
create or replace function a41_private.normalize_phone(p_phone text, p_country text default '62')
returns text
language sql immutable set search_path = ''
as $$
  select case
    when s.d = '' then null
    when s.raw like '+%' then '+' || s.d
    when s.d like '00%' then '+' || substr(s.d, 3)
    when s.d like '0%' then '+' || s.cc || substr(s.d, 2)
    when s.d like s.cc || '%' then '+' || s.d
    when s.cc = '62' and s.d like '8%' then '+62' || s.d
    else '+' || s.d
  end
  from (
    select
      btrim(coalesce(p_phone, '')) as raw,
      regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') as d,
      coalesce(nullif(regexp_replace(coalesce(p_country, ''), '\D', '', 'g'), ''), '62') as cc
  ) s
$$;

create or replace function a41_private.is_valid_phone(p_phone text)
returns boolean
language sql immutable set search_path = ''
as $$ select coalesce(p_phone ~ '^\+[1-9][0-9]{6,14}$', false) $$;

create or replace function a41_private.normalize_email(p_email text)
returns text
language sql immutable set search_path = ''
as $$ select nullif(lower(btrim(coalesce(p_email, ''))), '') $$;

create or replace function a41_private.is_valid_email(p_email text)
returns boolean
language sql immutable set search_path = ''
as $$ select coalesce(p_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and char_length(p_email) <= 254, false) $$;

-- Tags from an import or a form: a JSON array of strings or one comma-separated string; trimmed, at most 20,
-- each at most 40 characters, duplicates dropped ignoring case (first spelling wins).
create or replace function a41_private.clean_tags(p_tags jsonb)
returns text[]
language sql immutable set search_path = ''
as $$
  select coalesce(array_agg(t.tag order by t.first), '{}')
  from (
    select (array_agg(left(btrim(x.tag), 40) order by x.ord))[1] as tag, min(x.ord) as first
    from (
      select e.value #>> '{}' as tag, e.ord
      from jsonb_array_elements(case when jsonb_typeof(p_tags) = 'array' then p_tags else '[]'::jsonb end) with ordinality e (value, ord)
      where jsonb_typeof(e.value) = 'string'
      union all
      select s.tag, s.ord
      from regexp_split_to_table(case when jsonb_typeof(p_tags) = 'string' then p_tags #>> '{}' else '' end, ',') with ordinality s (tag, ord)
    ) x
    where btrim(x.tag) <> ''
    group by lower(left(btrim(x.tag), 40))
    order by min(x.ord)
    limit 20
  ) t
$$;

-- Answers to the invitation form's own questions: a flat object of short texts (numbers and yes/no become text).
create or replace function a41_private.clean_answers(p_answers jsonb)
returns jsonb
language sql immutable set search_path = ''
as $$
  select coalesce(jsonb_object_agg(s.k, s.v), '{}'::jsonb)
  from (
    select left(e.key, 80) as k,
           to_jsonb(left(btrim(case jsonb_typeof(e.value) when 'string' then e.value #>> '{}' else e.value::text end), 2000)) as v
    from jsonb_each(case when jsonb_typeof(p_answers) = 'object' then p_answers else '{}'::jsonb end) e
    where jsonb_typeof(e.value) in ('string', 'number', 'boolean')
    limit 60
  ) s
$$;

-- The country code organizers set for WhatsApp (Broadcast settings), used for local phone numbers.
create or replace function a41_private.event_country(p_event uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce(nullif(regexp_replace(coalesce(e.config #>> '{broadcast,countryCode}', ''), '\D', '', 'g'), ''), '62')
  from public.a41_events e where e.id = p_event
$$;

revoke all on function a41_private.normalize_phone(text, text) from public, anon, authenticated;
revoke all on function a41_private.is_valid_phone(text) from public, anon, authenticated;
revoke all on function a41_private.normalize_email(text) from public, anon, authenticated;
revoke all on function a41_private.is_valid_email(text) from public, anon, authenticated;
revoke all on function a41_private.clean_tags(jsonb) from public, anon, authenticated;
revoke all on function a41_private.clean_answers(jsonb) from public, anon, authenticated;
revoke all on function a41_private.event_country(uuid) from public, anon, authenticated;
