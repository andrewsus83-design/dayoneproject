-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_event_version.
-- Light polling for open event pages: the published event's last save time. A page compares it with the copy it
-- has and downloads the whole event only when it changed. Null when there is no such live event.
create or replace function public.a41_event_version(p_slug text)
returns timestamptz
language sql stable security definer set search_path = ''
as $$
  select e.saved_at from public.a41_events e where e.slug = p_slug and e.status = 'published'
$$;
revoke all on function public.a41_event_version(text) from public;
grant execute on function public.a41_event_version(text) to anon, authenticated, service_role;
