-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) as a41_admin_authenticator_only, right after
-- the app that opens authenticator sessions went live (audit H1).
-- Platform-admin rights now need a session the a41-auth edge function opened after checking the authenticator code
-- (recorded in a41_private.admin_sessions). Sessions from an emailed code or a password never qualify.
create or replace function a41_private.is_platform_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.a41_platform_admins a
    where a.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  ) and exists (
    select 1 from a41_private.admin_sessions s
    where s.user_id = (select auth.uid())
      and s.session_id::text = coalesce((select auth.jwt() ->> 'session_id'), '')
  )
$$;
