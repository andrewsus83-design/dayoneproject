// dayoneproject.xyz organization team. Deployed to Supabase project dayoneproject (pmuryumfyekjwqntcypo)
// as `a41-team` with verify_jwt on.
//
// Admin organizers add three kinds of people to their organization:
// - Admin organizer: membership role 'owner' (runs the organization's events), signs in with an emailed code.
// - Screen manager:  membership role 'screen' (only switches the stage screen), email + an access code.
// - Register desk:   membership role 'staff' (check-in only), signs in with email + an access code.
// Every admin organizer can add all three and remove or re-code screen managers and the desk; only the account
// owner (a41_organizations.created_by) removes admin organizers and renames the organization.
// Logins are shared with other products, so an existing account is only linked when it is already an
// event-platform organizer, or has no role and no password; anything else gets one generic refusal.
import { createClient } from 'jsr:@supabase/supabase-js@2';

// The app, local dev, and this project's own Vercel preview deployments.
const ALLOWED_ORIGINS = ['https://app.dayoneproject.xyz', 'http://localhost:3042', 'http://localhost:3000'];
const PREVIEW_ORIGIN = /^https:\/\/all41-u356-[a-z0-9-]+-andrewsus83-5642s-projects\.vercel\.app$/;
const USE_ANOTHER_EMAIL = 'Use a different email for this person.';

function corsHeaders(origin: string | null) {
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN.test(origin));
  return {
    'Access-Control-Allow-Origin': allowed ? origin! : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

const APP_URL = 'https://app.dayoneproject.xyz';
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Tells a newly added organizer how to sign in. Never blocks the add: false when the email could not go out. */
// deno-lint-ignore no-explicit-any
async function sendWelcome(admin: any, to: string, name: string, orgName: string): Promise<boolean> {
  try {
    const secret = async (key: string) => (await admin.rpc('a41_svc_secret', { p_name: key })).data as string | null;
    const resendKey = await secret('a41_RESEND_API_KEY');
    if (!resendKey) return false;
    const from = (await secret('a41_RESEND_FROM')) || 'dayoneproject.xyz <login@dayoneproject.xyz>';
    const link = `${APP_URL}/login?as=organizer&email=${encodeURIComponent(to)}`;
    const first = name.trim().split(/\s+/)[0] ?? '';
    const team = orgName.trim() || 'Your team';
    const html = `<!doctype html><html><body style="margin:0;background:#09090B;font-family:Manrope,Arial,sans-serif;color:#FAFAFA">
<div style="max-width:440px;margin:0 auto;padding:40px 24px;text-align:center">
<div style="width:48px;height:48px;border-radius:999px;background:#C5A059;color:#09090B;font-weight:700;font-size:20px;line-height:48px;margin:0 auto">D1</div>
<h1 style="font-size:22px;margin:24px 0 8px">${first ? `Hi ${esc(first)}, you're` : "You're"} on the team</h1>
<p style="color:#A1A1AA;font-size:14px;line-height:1.6;margin:0 0 24px">${esc(team)} added you as an admin organizer on dayoneproject.xyz. You can create and run the team's events.</p>
<a href="${link}" style="display:inline-block;background:#C5A059;color:#09090B;font-weight:700;font-size:14px;text-decoration:none;padding:14px 28px;border-radius:12px">Sign in</a>
<p style="color:#71717A;font-size:12px;line-height:1.6;margin:24px 0 0">Open app.dayoneproject.xyz/login, choose Organizer and enter this email address. We email you a sign-in code each time; there is no password.</p>
</div></body></html>`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `${team} added you on dayoneproject.xyz`,
        html,
        text: `${team} added you as an admin organizer on dayoneproject.xyz.\n\nSign in: ${link}\n\nChoose Organizer and enter this email address. We email you a sign-in code each time; there is no password.`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

type Member = {
  user_id: string;
  email: string;
  name: string;
  membership_role: 'owner' | 'staff' | 'screen';
  app_role: string | null;
  last_sign_in_at: string | null;
  banned: boolean;
  is_creator: boolean;
  joined_at: string;
};

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: auth } = await asCaller.auth.getUser();
    const me = auth.user;
    if (!me) return json({ error: 'forbidden' }, 403);
    const myRole = me.app_metadata?.a41_role;
    if (myRole !== 'organizer' && myRole !== 'admin') {
      // Platform admins without an organizer role still get their own organization.
      const { data: who } = await asCaller.rpc('a41_whoami');
      if (!who?.isAdmin) return json({ error: 'forbidden' }, 403);
    }

    // The caller's organization (created on first use for brand-new owners).
    const { data: orgId, error: orgError } = await asCaller.rpc('a41_my_org');
    if (orgError || !orgId) return json({ error: 'Could not find your organization.' }, 400);
    const { data: org } = await admin.from('a41_organizations').select('id, name, created_by').eq('id', orgId).single();
    const isCreator = org?.created_by === me.id;

    const members = async () => ((await admin.rpc('a41_svc_org_members', { p_org: orgId })).data ?? []) as Member[];
    const view = (m: Member) => ({
      id: m.user_id,
      email: m.email,
      name: m.name,
      role: m.membership_role === 'staff' ? 'desk' : m.membership_role === 'screen' ? 'screen' : m.is_creator ? 'owner' : 'organizer',
      lastSignInAt: m.last_sign_in_at,
      disabled: m.banned,
    });

    const body = await req.json().catch(() => ({}));
    // Renaming the organization is the account owner's; so is removing an admin organizer (checked in "remove").
    if (body.action === 'rename' && !isCreator) {
      return json({ error: 'Only the account owner can rename the organization.' }, 403);
    }

    switch (body.action) {
      case 'list':
        return json({ org: { id: orgId, name: org?.name ?? '' }, canManage: isCreator, canManageStaff: true, members: (await members()).map(view) });

      case 'rename': {
        const name = String(body.name ?? '').trim().slice(0, 120);
        if (!name) return json({ error: 'Enter a name.' }, 400);
        await admin.from('a41_organizations').update({ name }).eq('id', orgId);
        return json({ ok: true });
      }

      case 'add': {
        const email = String(body.email ?? '').trim().toLowerCase();
        const name = String(body.name ?? '').trim().slice(0, 120);
        const role: 'organizer' | 'screen' | 'desk' = body.role === 'desk' ? 'desk' : body.role === 'screen' ? 'screen' : 'organizer';
        // Screen managers and the register desk sign in with an access code (their password).
        const desk = role !== 'organizer';
        const code = String(body.code ?? '');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400);
        if ((await members()).some((m) => m.email.toLowerCase() === email)) return json({ error: 'This person is already on your team.' }, 409);
        if (desk && code.length < 8) return json({ error: 'The access code needs at least 8 characters.' }, 400);

        const { data: found } = await admin.rpc('a41_svc_user', { p_email: email });
        const existing = found?.[0] as { id: string; role: string | null } | undefined;
        let userId: string;

        if (existing) {
          // The access code is the account password, so desk accounts must be new and only for this desk.
          if (desk) return json({ error: USE_ANOTHER_EMAIL }, 409);
          // Already an organizer here, or an account with no role and no password (nothing another app relies on).
          const organizer = existing.role === 'organizer' || existing.role === 'admin';
          const { data: hasPassword } = await admin.rpc('a41_svc_user_has_password', { p_user: existing.id });
          if (!organizer && (existing.role !== null || hasPassword !== false)) return json({ error: USE_ANOTHER_EMAIL }, 409);
          const { data: full } = await admin.auth.admin.getUserById(existing.id);
          const { error } = await admin.auth.admin.updateUserById(existing.id, {
            app_metadata: { ...(full.user?.app_metadata ?? {}), a41_role: existing.role ?? 'organizer' },
            user_metadata: name ? { ...(full.user?.user_metadata ?? {}), name } : full.user?.user_metadata,
          });
          if (error) return json({ error: USE_ANOTHER_EMAIL }, 409);
          userId = existing.id;
        } else if (desk) {
          const { data, error } = await admin.auth.admin.createUser({
            email, password: code, email_confirm: true, user_metadata: { name }, app_metadata: { a41_role: role },
          });
          if (error) return json({ error: error.message }, 400);
          userId = data.user.id;
        } else {
          // Admin organizers sign in with an emailed code, so the account gets no password at all.
          const { data, error } = await admin.auth.admin.createUser({
            email, email_confirm: true, user_metadata: { name }, app_metadata: { a41_role: 'organizer' },
          });
          if (error) return json({ error: error.message }, 400);
          userId = data.user.id;
        }

        const membership = role === 'desk' ? 'staff' : role === 'screen' ? 'screen' : 'owner';
        const { error: memberError } = await admin.from('a41_memberships').insert({ org_id: orgId, user_id: userId, role: membership });
        if (memberError) return json({ error: memberError.message }, 400);
        // Admin organizers get a welcome email with the sign-in link; code-based staff get their code from the organizer.
        const welcomeSent = desk ? false : await sendWelcome(admin, email, name, org?.name ?? '');
        // The same answer for new and linked accounts.
        return json({ ok: true, welcomeSent });
      }

      case 'remove': {
        const id = String(body.id ?? '');
        if (id === me.id) return json({ error: 'You cannot remove yourself.' }, 400);
        const target = (await members()).find((m) => m.user_id === id);
        if (!target) return json({ error: 'Not on your team.' }, 404);
        if (!isCreator && target.membership_role === 'owner') return json({ error: 'Only the account owner can remove admin organizers.' }, 403);
        await admin.from('a41_memberships').delete().eq('org_id', orgId).eq('user_id', id);
        // Desk and screen accounts exist only for this team, so switch them off too.
        if ((target.membership_role === 'staff' && target.app_role === 'desk') || (target.membership_role === 'screen' && target.app_role === 'screen')) {
          await admin.auth.admin.updateUserById(id, { ban_duration: '876000h' });
        }
        // Someone on no team any more keeps their login (it may serve another app) but loses event-platform access.
        // Platform admins keep theirs.
        const { count } = await admin.from('a41_memberships').select('org_id', { count: 'exact', head: true }).eq('user_id', id);
        const { data: found } = await admin.rpc('a41_svc_user', { p_email: target.email });
        const platformAdmin = !!(found?.[0] as { is_platform_admin?: boolean } | undefined)?.is_platform_admin;
        if (count === 0 && target.app_role && !platformAdmin) {
          const { data: full } = await admin.auth.admin.getUserById(id);
          // Auth merges app_metadata on update, so the role is removed by sending it as null.
          await admin.auth.admin.updateUserById(id, { app_metadata: { ...(full.user?.app_metadata ?? {}), a41_role: null } });
        }
        return json({ ok: true });
      }

      case 'reset-code': {
        const id = String(body.id ?? '');
        const code = String(body.code ?? '');
        const target = (await members()).find((m) => m.user_id === id);
        if (!target || (target.app_role !== 'desk' && target.app_role !== 'screen')) {
          return json({ error: 'Only screen managers and the register desk have an access code.' }, 400);
        }
        if (code.length < 8) return json({ error: 'The access code needs at least 8 characters.' }, 400);
        const { error } = await admin.auth.admin.updateUserById(id, { password: code, ban_duration: 'none' });
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      default:
        return json({ error: 'Unknown action.' }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, 500);
  }
});
