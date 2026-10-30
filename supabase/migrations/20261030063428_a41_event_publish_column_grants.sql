-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_event_publish_column_grants.
-- Organizers update the event column by column (package and capacity stay admin-only); saved_at is set by the server.
grant update (config, site) on public.a41_events to authenticated;
