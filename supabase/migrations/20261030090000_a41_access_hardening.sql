-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_access_hardening.
-- Audit fixes (H2, L1, L6, L8) and the groundwork for H1 (switched on in 20261030091000_a41_admin_authenticator_only).

-- H1 groundwork: the a41-auth edge function opens the platform admin's session itself after checking the
-- authenticator code and records the session id here; email codes and passwords never do.
create table if not exists a41_private.admin_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Records an authenticator-verified session, and forgets sessions that no longer exist.
create or replace function public.a41_svc_bind_admin_session(p_session uuid, p_user uuid)
returns void
language sql security definer set search_path = ''
as $$
  delete from a41_private.admin_sessions s where not exists (select 1 from auth.sessions x where x.id = s.session_id);
  insert into a41_private.admin_sessions (session_id, user_id) values (p_session, p_user) on conflict do nothing;
$$;
revoke all on function public.a41_svc_bind_admin_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.a41_svc_bind_admin_session(uuid, uuid) to service_role;

-- H2: only organizers (and the platform admin) create organizations and events. Register desk staff and accounts
-- that belong to the other products sharing this login get nothing, even through the API.
create or replace function a41_private.is_organizer()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'a41_role'), '') in ('organizer', 'admin')
    or a41_private.is_platform_admin()
$$;
revoke all on function a41_private.is_organizer() from public, anon;
grant execute on function a41_private.is_organizer() to authenticated;

alter policy organizations_insert on public.a41_organizations
  with check (created_by = (select auth.uid()) and (select a41_private.is_organizer()));
alter policy events_insert on public.a41_events
  with check ((select a41_private.is_org_owner(org_id)) and (select a41_private.is_organizer()));

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
  if not a41_private.is_organizer() then
    raise exception 'forbidden' using errcode = '42501';
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

-- L8: only the account owner renames the organization (matches the Team page).
alter policy organizations_update on public.a41_organizations
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

-- L1: these two tables kept Supabase's default full grants; RLS was the only barrier.
revoke all on public.a41_platform_admins from anon, authenticated;
revoke all on public.a41_wa_messages from anon, authenticated;
grant select on public.a41_wa_messages to authenticated;

-- L6: leftover test functions created outside any migration.
drop function if exists a41_private.zz_probe1();
drop function if exists a41_private.zz_probe2();
drop function if exists a41_private.zz_probe3();
drop function if exists a41_private.zz_probe4();
drop function if exists a41_private.zz_probe5();
