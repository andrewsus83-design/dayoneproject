-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) on 2026-10-30 as a41_email_sign_in_codes.
-- Organizer sign-in codes are our own 6 digits (the project's Supabase OTP length is shared with other products
-- and is longer). a41-auth "email-code" stores a salted hash here and emails the code; "email-verify" checks it
-- and only then opens the session. A code lasts 10 minutes and allows 5 wrong tries.
create table if not exists a41_private.email_codes (
  email text primary key,
  salt text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);
revoke all on a41_private.email_codes from public, anon, authenticated;

-- A new code replaces any earlier one for the same email.
create or replace function public.a41_svc_email_code_set(p_email text, p_salt text, p_hash text, p_ttl_seconds integer)
returns void
language sql security definer set search_path = ''
as $$
  insert into a41_private.email_codes as c (email, salt, code_hash, expires_at, attempts, created_at)
  values (lower(btrim(p_email)), p_salt, p_hash, now() + make_interval(secs => p_ttl_seconds), 0, now())
  on conflict (email) do update
  set salt = excluded.salt, code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, created_at = now()
$$;

-- The salt for an email's current code (null when there is none or it expired), so the caller can hash the guess.
create or replace function public.a41_svc_email_code_salt(p_email text)
returns text
language sql stable security definer set search_path = ''
as $$
  select c.salt from a41_private.email_codes c
  where c.email = lower(btrim(p_email)) and c.expires_at > now() and c.attempts < 5
$$;

-- True once for the right code (the code is then used up); a wrong guess counts towards the 5 allowed.
create or replace function public.a41_svc_email_code_check(p_email text, p_hash text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  c a41_private.email_codes;
begin
  select * into c from a41_private.email_codes where email = lower(btrim(p_email)) for update;
  if not found or c.expires_at <= now() or c.attempts >= 5 then
    return false;
  end if;
  if c.code_hash = p_hash then
    delete from a41_private.email_codes where email = c.email;
    return true;
  end if;
  update a41_private.email_codes set attempts = attempts + 1 where email = c.email;
  return false;
end
$$;

revoke all on function public.a41_svc_email_code_set(text, text, text, integer) from public, anon, authenticated;
revoke all on function public.a41_svc_email_code_salt(text) from public, anon, authenticated;
revoke all on function public.a41_svc_email_code_check(text, text) from public, anon, authenticated;
grant execute on function public.a41_svc_email_code_set(text, text, text, integer) to service_role;
grant execute on function public.a41_svc_email_code_salt(text) to service_role;
grant execute on function public.a41_svc_email_code_check(text, text) to service_role;
