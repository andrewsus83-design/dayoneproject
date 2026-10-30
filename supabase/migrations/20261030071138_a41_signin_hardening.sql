-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_signin_hardening.
-- Audit fixes M5 and L11: authenticator lockout (a41-auth) and safer linking of existing accounts (a41-team).
-- Both helpers run only as service_role (never from the browser).

-- The current count for a rate-limit key inside its window (0 once the window has passed). Unlike
-- a41_svc_hit it never counts an attempt itself, so a lockout can be checked before a code is tried.
create or replace function public.a41_svc_attempts(p_key text, p_window_seconds integer)
returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select a.count from a41_private.auth_attempts a
    where a.key = p_key and a.window_start >= now() - make_interval(secs => p_window_seconds)
  ), 0)
$$;

-- Whether an account has a password. Accounts from the other products sharing this login usually do;
-- event-platform organizers sign in with emailed codes and have none.
create or replace function public.a41_svc_user_has_password(p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select u.encrypted_password is not null and u.encrypted_password <> ''
    from auth.users u where u.id = p_user
  ), false)
$$;

revoke all on function public.a41_svc_attempts(text, integer) from public, anon, authenticated;
revoke all on function public.a41_svc_user_has_password(uuid) from public, anon, authenticated;
grant execute on function public.a41_svc_attempts(text, integer) to service_role;
grant execute on function public.a41_svc_user_has_password(uuid) to service_role;
