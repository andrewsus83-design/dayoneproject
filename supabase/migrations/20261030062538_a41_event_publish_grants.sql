-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_event_publish_grants.
-- Only signed-in users may call the folder check used by the a41_event_assets storage policies.
revoke all on function a41_private.can_edit_event_folder(text) from public, anon;
grant execute on function a41_private.can_edit_event_folder(text) to authenticated;
