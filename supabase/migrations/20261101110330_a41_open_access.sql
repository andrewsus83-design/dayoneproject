-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-11-01 as a41_open_access.
-- Open access until pricing launches: no organizer is on the Free package. New events start on Scale (the top package,
-- 2,500 guests), every existing event moves up to Scale, and owners can delete any of their events (deleting used to be
-- for Free events only). The package rules themselves stay, so the platform admin can still set a package by hand.
alter table public.a41_events alter column package set default 'scale';

update public.a41_events set package = 'scale' where package <> 'scale' and extra_guests = 0;

drop policy events_delete on public.a41_events;
create policy events_delete on public.a41_events
  for delete to authenticated
  using ((select a41_private.is_org_owner(org_id)));
