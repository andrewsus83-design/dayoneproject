-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) as a41_register_owner_only.
-- Knowing a guest's email or phone number is no longer enough to get their pass or change their reply.
-- A guest already on the list (matched by email or phone) is only updated from a phone that holds their pass
-- (their personal link or an earlier reply). Anyone else gets "already registered" and the pass goes to that
-- guest's own email (at most 3 times a day), sent by the a41-email runner, which adds the pass link and QR code.
create or replace function public.a41_register(p_slug text, p_name text, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_attending boolean DEFAULT true, p_party_size integer DEFAULT 1, p_answers jsonb DEFAULT '{}'::jsonb, p_message text DEFAULT NULL::text, p_token text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e public.a41_events;
  g public.a41_guests;
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := a41_private.normalize_email(p_email);
  v_phone text;
  v_attending boolean := coalesce(p_attending, true);
  v_party integer := case when coalesce(p_attending, true) then coalesce(p_party_size, 1) else 1 end;
  v_message text := a41_private.clean_text(p_message);
  v_token text := nullif(btrim(coalesce(p_token, '')), '');
  v_reason text;
  v_created boolean := false;
  v_headers jsonb;
  v_ip text;
  v_event_html text;
begin
  select * into e from public.a41_events where slug = lower(btrim(coalesce(p_slug, ''))) and status = 'published';
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  v_reason := a41_private.invitation_closed(e);
  if v_reason is not null then
    return jsonb_build_object('ok', false, 'reason', v_reason);
  end if;

  v_phone := a41_private.normalize_phone(p_phone, a41_private.event_country(e.id));
  if char_length(v_name) not between 1 and 160 then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'name');
  end if;
  if v_email is not null and not a41_private.is_valid_email(v_email) then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'email');
  end if;
  if v_phone is not null and not a41_private.is_valid_phone(v_phone) then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'phone');
  end if;
  if char_length(v_message) > 500 then
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'field', 'message');
  end if;

  -- Rate limits: per person, per network address, and a ceiling for the whole event.
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_headers := null;
  end;
  v_ip := coalesce(v_headers ->> 'cf-connecting-ip', nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), ''), v_headers ->> 'x-real-ip');
  if not public.a41_svc_hit(format('reg:%s:%s', e.id, coalesce(v_email, v_phone, v_token, 'name:' || lower(v_name))), 10, 600)
     or (v_ip is not null and not public.a41_svc_hit(format('reg-ip:%s:%s', e.id, v_ip), 30, 600))
     or not public.a41_svc_hit(format('reg-event:%s', e.id), 600, 600) then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  -- One reply at a time per event, so the seat limit and the package capacity hold.
  select * into e from public.a41_events x where x.id = e.id for update;

  -- Email first, then phone. The pass this phone holds only counts for the same name, so a second person
  -- replying on a shared phone gets their own guest instead of replacing the first one.
  if v_email is not null then
    select * into g from public.a41_guests x where x.event_id = e.id and x.email = v_email;
  end if;
  if g.id is null and v_phone is not null then
    select * into g from public.a41_guests x where x.event_id = e.id and x.phone = v_phone;
  end if;
  if g.id is null and v_token is not null then
    select * into g from public.a41_guests x
    where x.event_id = e.id and x.token = v_token and lower(btrim(x.name)) = lower(v_name);
  end if;

  -- Someone already on the list, but this phone doesn't hold their pass: don't reveal or change anything here.
  if g.id is not null and g.token is distinct from v_token then
    if g.email is not null and public.a41_svc_hit(format('pass-mail:%s', g.id), 3, 86400) then
      v_event_html := replace(replace(replace(e.name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
      insert into public.a41_email_messages (org_id, event_id, guest_id, batch_id, label, kind, to_name, to_email, subject, html, text, with_ics)
      values (
        e.org_id, e.id, g.id, gen_random_uuid(), 'Pass sent from the RSVP form', 'pass', g.name, g.email,
        format('Your pass for %s', e.name),
        format(
          '<!doctype html><html><body style="margin:0;background:#09090B;font-family:Arial,sans-serif;color:#FAFAFA">'
          '<div style="max-width:440px;margin:0 auto;padding:32px 24px;text-align:center">'
          '<h1 style="font-size:20px;margin:0 0 12px">%s</h1>'
          '<p style="color:#A1A1AA;font-size:14px;line-height:1.6;margin:0">Someone asked for your pass on the RSVP form. If that was you, here it is. If not, you can ignore this email.</p>'
          '<!--a41:pass--></div></body></html>',
          v_event_html),
        format('Your pass for %s. Someone asked for it on the RSVP form; if that was not you, you can ignore this email.', e.name),
        true
      );
      return jsonb_build_object('ok', true, 'stored', false, 'reason', 'already_registered', 'sent', 'email');
    end if;
    return jsonb_build_object('ok', true, 'stored', false, 'reason', 'already_registered', 'sent', 'none');
  end if;

  v_reason := a41_private.invitation_room(e, g.id, v_attending, v_party);
  if v_reason is not null then
    return jsonb_build_object('ok', false, 'reason', v_reason, 'field', case when v_reason = 'invalid' then 'party_size' end);
  end if;

  if g.id is null then
    begin
      insert into public.a41_guests (event_id, name, email, phone)
      values (e.id, v_name, v_email, v_phone)
      returning * into g;
      v_created := true;
    exception when check_violation then
      if sqlerrm <> 'guest_capacity_exceeded' then
        raise;
      end if;
      if not v_attending then
        return jsonb_build_object('ok', true, 'stored', false, 'response', 'declined');
      end if;
      return jsonb_build_object('ok', false, 'reason', 'full');
    end;
  else
    -- Fill in contacts the list does not have yet (when no other guest uses them); the name on the list stays.
    update public.a41_guests x
    set email = coalesce(x.email, case when v_email is not null and not exists (
                  select 1 from public.a41_guests y where y.event_id = e.id and y.email = v_email) then v_email end),
        phone = coalesce(x.phone, case when v_phone is not null and not exists (
                  select 1 from public.a41_guests y where y.event_id = e.id and y.phone = v_phone) then v_phone end)
    where x.id = g.id
    returning * into g;
  end if;

  insert into public.a41_rsvps (guest_id, event_id, response, party_size, message, answers)
  values (g.id, e.id, case when v_attending then 'attending' else 'declined' end, v_party, v_message, a41_private.clean_answers(p_answers))
  on conflict (guest_id) do update set
    response = excluded.response,
    party_size = excluded.party_size,
    message = excluded.message,
    answers = excluded.answers,
    responded_at = now();

  return jsonb_build_object(
    'ok', true,
    'stored', true,
    'token', g.token,
    'guest_number', g.guest_number,
    'name', g.name,
    'table_no', g.table_no,
    'response', case when v_attending then 'attending' else 'declined' end,
    'party_size', v_party,
    'created', v_created
  );
end
$function$;
