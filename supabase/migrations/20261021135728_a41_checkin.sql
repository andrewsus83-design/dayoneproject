alter table public.a41_checkins
  add column previous_status text check (previous_status in ('invited', 'sent', 'opened', 'rsvp'));

create index a41_checkins_event_time_idx on public.a41_checkins (event_id, checked_in_at desc);

create function a41_private.remember_guest_status() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  select nullif(g.status, 'checked_in') into new.previous_status
  from public.a41_guests g where g.id = new.guest_id;
  return new;
end
$$;

create trigger a41_checkins_remember_status before insert on public.a41_checkins
  for each row execute function a41_private.remember_guest_status();

create function a41_private.restore_guest_status() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.a41_guests g
  set status = case
    when exists (select 1 from public.a41_rsvps r where r.guest_id = g.id) then 'rsvp'
    else coalesce(old.previous_status, 'invited')
  end
  where g.id = old.guest_id and g.status = 'checked_in';
  return old;
end
$$;

create trigger a41_checkins_restore_guest after delete on public.a41_checkins
  for each row execute function a41_private.restore_guest_status();