-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_event_saved_at_stamp.
-- The server sets saved_at whenever the setup changes, so device clocks never matter.
create or replace function a41_private.stamp_saved_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.config is distinct from old.config or new.site is distinct from old.site then
    new.saved_at := now();
  end if;
  return new;
end
$$;

create trigger a41_events_stamp_saved_at
before update on public.a41_events
for each row execute function a41_private.stamp_saved_at();
