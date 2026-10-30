-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_team_members.
-- Team list for the a41-team edge function: the organization's members with their sign-in details.
-- Runs only as service_role (never from the browser).
create or replace function public.a41_svc_org_members(p_org uuid)
returns table (user_id uuid, email text, name text, membership_role text, app_role text,
  last_sign_in_at timestamptz, banned boolean, is_creator boolean, joined_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select u.id, u.email::text, coalesce(u.raw_user_meta_data ->> 'name', ''), m.role, u.raw_app_meta_data ->> 'a41_role',
    u.last_sign_in_at, coalesce(u.banned_until > now(), false), o.created_by = u.id, m.created_at
  from public.a41_memberships m
  join auth.users u on u.id = m.user_id
  join public.a41_organizations o on o.id = m.org_id
  where m.org_id = p_org
  order by (o.created_by = u.id) desc, m.created_at
$$;

revoke all on function public.a41_svc_org_members(uuid) from public, anon, authenticated;
grant execute on function public.a41_svc_org_members(uuid) to service_role;
