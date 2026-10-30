-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_auth_methods.
-- Sign-in support for dayoneproject.xyz: rate limiting, vault access and user lookup for the a41-auth edge function.
-- These helpers run only as service_role (never from the browser).
create table if not exists a41_private.auth_attempts (
  key text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now()
);

-- Counts an attempt for p_key; false once p_max attempts happened inside the window.
create or replace function public.a41_svc_hit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  r a41_private.auth_attempts;
begin
  insert into a41_private.auth_attempts (key, count, window_start) values (p_key, 1, now())
  on conflict (key) do update set
    count = case when a41_private.auth_attempts.window_start < now() - make_interval(secs => p_window_seconds)
                 then 1 else a41_private.auth_attempts.count + 1 end,
    window_start = case when a41_private.auth_attempts.window_start < now() - make_interval(secs => p_window_seconds)
                        then now() else a41_private.auth_attempts.window_start end
  returning * into r;
  return r.count <= p_max;
end
$$;

-- Vault access for auth secrets (authenticator keys use the a41auth_ prefix so they never appear in Admin > API keys).
create or replace function public.a41_svc_secret(p_name text)
returns text
language sql stable security definer set search_path = ''
as $$
  select s.decrypted_secret from vault.decrypted_secrets s where s.name = p_name limit 1
$$;

create or replace function public.a41_svc_set_secret(p_name text, p_value text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  existing uuid;
begin
  select id into existing from vault.secrets where name = p_name;
  if existing is null then
    perform vault.create_secret(p_value, p_name, 'dayoneproject.xyz sign-in');
  else
    perform vault.update_secret(existing, p_value, p_name, 'dayoneproject.xyz sign-in');
  end if;
end
$$;

create or replace function public.a41_svc_delete_secret(p_name text)
returns void
language sql security definer set search_path = ''
as $$
  delete from vault.secrets where name = p_name
$$;

-- Look up a sign-in account by email.
create or replace function public.a41_svc_user(p_email text)
returns table (id uuid, email text, role text, banned boolean, is_platform_admin boolean)
language sql stable security definer set search_path = ''
as $$
  select u.id, u.email::text, u.raw_app_meta_data ->> 'a41_role',
    coalesce(u.banned_until > now(), false),
    exists (select 1 from public.a41_platform_admins a where a.email = lower(u.email))
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1
$$;

revoke all on function public.a41_svc_hit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.a41_svc_secret(text) from public, anon, authenticated;
revoke all on function public.a41_svc_set_secret(text, text) from public, anon, authenticated;
revoke all on function public.a41_svc_delete_secret(text) from public, anon, authenticated;
revoke all on function public.a41_svc_user(text) from public, anon, authenticated;
grant execute on function public.a41_svc_hit(text, integer, integer) to service_role;
grant execute on function public.a41_svc_secret(text) to service_role;
grant execute on function public.a41_svc_set_secret(text, text) to service_role;
grant execute on function public.a41_svc_delete_secret(text) to service_role;
grant execute on function public.a41_svc_user(text) to service_role;
