create table public.a41_raffle_prizes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.a41_events (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  quantity integer not null default 1 check (quantity between 1 and 500),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, event_id)
);

create index a41_raffle_prizes_event_idx on public.a41_raffle_prizes (event_id, sort_order, created_at);

create table public.a41_raffle_draws (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.a41_events (id) on delete cascade,
  prize_id uuid not null,
  guest_id uuid references public.a41_guests (id) on delete set null,
  guest_name text not null,
  guest_table_no text,
  status text not null default 'won' check (status in ('won', 'forfeited')),
  drawn_at timestamptz not null default now(),
  drawn_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  foreign key (prize_id, event_id) references public.a41_raffle_prizes (id, event_id),
  check ((status = 'forfeited') = (resolved_at is not null))
);

create unique index a41_raffle_draws_event_guest_key on public.a41_raffle_draws (event_id, guest_id)
  where guest_id is not null;
create index a41_raffle_draws_prize_idx on public.a41_raffle_draws (prize_id, event_id);
create index a41_raffle_draws_event_time_idx on public.a41_raffle_draws (event_id, drawn_at desc);

create function a41_private.guard_raffle_prize() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.a41_raffle_prizes p where p.event_id = new.event_id) >= 100 then
      raise exception 'raffle_prize_limit'
        using errcode = 'check_violation', detail = 'An event can have up to 100 prizes.';
    end if;
  elsif new.quantity < (
    select count(*) from public.a41_raffle_draws d where d.prize_id = new.id and d.status = 'won'
  ) then
    raise exception 'prize_quantity_below_awarded'
      using errcode = 'check_violation', detail = 'A prize cannot have fewer winners than it has already given out.';
  end if;
  return new;
end
$$;

create trigger a41_raffle_prizes_guard before insert or update of quantity on public.a41_raffle_prizes
  for each row execute function a41_private.guard_raffle_prize();

alter table public.a41_raffle_prizes enable row level security;
alter table public.a41_raffle_draws enable row level security;

revoke all on public.a41_raffle_prizes, public.a41_raffle_draws from anon, authenticated;

grant select on public.a41_raffle_prizes to authenticated;
grant insert (event_id, name, quantity, sort_order) on public.a41_raffle_prizes to authenticated;
grant update (name, quantity, sort_order) on public.a41_raffle_prizes to authenticated;
grant delete on public.a41_raffle_prizes to authenticated;
create policy raffle_prizes_select on public.a41_raffle_prizes for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
create policy raffle_prizes_insert on public.a41_raffle_prizes for insert to authenticated
  with check ((select a41_private.is_event_owner(event_id)));
create policy raffle_prizes_update on public.a41_raffle_prizes for update to authenticated
  using ((select a41_private.is_event_owner(event_id)))
  with check ((select a41_private.is_event_owner(event_id)));
create policy raffle_prizes_delete on public.a41_raffle_prizes for delete to authenticated
  using ((select a41_private.is_event_owner(event_id)));

grant select on public.a41_raffle_draws to authenticated;
create policy raffle_draws_select on public.a41_raffle_draws for select to authenticated
  using ((select a41_private.is_event_member(event_id)));
revoke insert, update, delete, truncate on public.a41_raffle_draws from service_role;