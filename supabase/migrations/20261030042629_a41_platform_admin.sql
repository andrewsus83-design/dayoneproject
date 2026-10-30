-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30.
-- Platform admins (dayoneproject.xyz /admin). Only reachable through security definer functions.
create table if not exists public.a41_platform_admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.a41_platform_admins enable row level security;
insert into public.a41_platform_admins (email) values ('andrewsus83@gmail.com') on conflict do nothing;

create or replace function a41_private.is_platform_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.a41_platform_admins a
    where a.email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
$$;

-- Who am I: email, platform-admin flag, and my organizations.
create or replace function public.a41_whoami()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    return null;
  end if;
  return jsonb_build_object(
    'id', uid,
    'email', (select auth.jwt() ->> 'email'),
    'isAdmin', a41_private.is_platform_admin(),
    'orgs', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'role', m.role) order by m.created_at)
      from public.a41_memberships m join public.a41_organizations o on o.id = m.org_id
      where m.user_id = uid
    ), '[]'::jsonb)
  );
end
$$;

-- The caller's own organization; created on first use (the owner membership comes from a41_organizations_add_owner).
create or replace function public.a41_my_org(p_name text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  org uuid;
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  select m.org_id into org from public.a41_memberships m
  where m.user_id = uid and m.role = 'owner' order by m.created_at limit 1;
  if org is null then
    insert into public.a41_organizations (name, created_by)
    values (left(coalesce(nullif(trim(p_name), ''), split_part((select auth.jwt() ->> 'email'), '@', 1), 'My events'), 120), uid)
    returning id into org;
  end if;
  return org;
end
$$;

-- Admin: every event with its organization, owner and guest count.
create or replace function public.a41_admin_events()
returns table (
  id uuid, name text, slug text, type text, status text, package text,
  starts_at timestamptz, ends_at timestamptz, org_name text, owner_email text, guests bigint, created_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not a41_private.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select e.id, e.name, e.slug, e.type, e.status, e.package, e.starts_at, e.ends_at, o.name,
    (select u.email::text from public.a41_memberships m join auth.users u on u.id = m.user_id
      where m.org_id = e.org_id and m.role = 'owner' order by m.created_at limit 1),
    (select count(*) from public.a41_guests g where g.event_id = e.id),
    e.created_at
  from public.a41_events e join public.a41_organizations o on o.id = e.org_id
  order by e.created_at desc;
end
$$;

-- Admin: change an event's package or status.
create or replace function public.a41_admin_update_event(p_event uuid, p_package text default null, p_status text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not a41_private.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.a41_events
  set package = coalesce(p_package, package), status = coalesce(p_status, status)
  where id = p_event;
end
$$;

-- Admin: API keys live in Supabase Vault under the name prefix a41_. Values never leave the database except as a 4-character hint.
create or replace function public.a41_admin_list_keys()
returns table (name text, hint text, description text, updated_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not a41_private.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select substr(s.name, 5), '••••' || right(s.decrypted_secret, 4), s.description, s.updated_at
  from vault.decrypted_secrets s
  where s.name like 'a41\_%'
  order by s.name;
end
$$;

create or replace function public.a41_admin_set_key(p_name text, p_value text, p_description text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  existing uuid;
  full_name text := 'a41_' || upper(trim(p_name));
begin
  if not a41_private.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if upper(trim(p_name)) !~ '^[A-Z][A-Z0-9_]{2,63}$' then
    raise exception 'invalid_key_name' using errcode = 'check_violation', detail = 'Use letters, numbers and underscores, e.g. RESEND_API_KEY.';
  end if;
  if coalesce(length(p_value), 0) < 4 then
    raise exception 'invalid_key_value' using errcode = 'check_violation', detail = 'The key looks too short.';
  end if;
  select id into existing from vault.secrets where name = full_name;
  if existing is null then
    perform vault.create_secret(p_value, full_name, coalesce(p_description, ''));
  else
    perform vault.update_secret(existing, p_value, full_name, coalesce(p_description, ''));
  end if;
end
$$;

create or replace function public.a41_admin_delete_key(p_name text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not a41_private.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from vault.secrets where name = 'a41_' || upper(trim(p_name));
end
$$;

-- Signed-in users only.
revoke all on function public.a41_whoami() from public, anon;
revoke all on function public.a41_my_org(text) from public, anon;
revoke all on function public.a41_admin_events() from public, anon;
revoke all on function public.a41_admin_update_event(uuid, text, text) from public, anon;
revoke all on function public.a41_admin_list_keys() from public, anon;
revoke all on function public.a41_admin_set_key(text, text, text) from public, anon;
revoke all on function public.a41_admin_delete_key(text) from public, anon;
grant execute on function public.a41_whoami() to authenticated;
grant execute on function public.a41_my_org(text) to authenticated;
grant execute on function public.a41_admin_events() to authenticated;
grant execute on function public.a41_admin_update_event(uuid, text, text) to authenticated;
grant execute on function public.a41_admin_list_keys() to authenticated;
grant execute on function public.a41_admin_set_key(text, text, text) to authenticated;
grant execute on function public.a41_admin_delete_key(text) to authenticated;
revoke all on function a41_private.is_platform_admin() from public, anon;
grant execute on function a41_private.is_platform_admin() to authenticated, service_role;
