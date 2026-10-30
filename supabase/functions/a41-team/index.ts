// dayoneproject.xyz organization team. Deployed to Supabase project dayoneproject (pmuryumfyekjwqntcypo)
// as `a41-team` with verify_jwt on.
//
// The organization's owner (a41_organizations.created_by) adds people to their organization:
// - Admin organizer: membership role 'owner' (runs the organization's events), signs in with an emailed code.
// - Register desk:   membership role 'staff' (check-in only), signs in with email + an access code.
// Every owner-member can see the team; only the creator can change it.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = ['https://app.dayoneproject.xyz', 'http://localhost:3042', 'http://localhost:3000'];

function corsHeaders(origin: string | null) {
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin));
  return {
    'Access-Control-Allow-Origin': allowed ? origin! : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function randomSecret() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

type Member = {
  user_id: string;
  email: string;
  name: string;
  membership_role: 'owner' | 'staff';
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
      role: m.membership_role === 'staff' ? 'desk' : m.is_creator ? 'owner' : 'organizer',
      lastSignInAt: m.last_sign_in_at,
      disabled: m.banned,
    });

    const body = await req.json().catch(() => ({}));
    if (body.action !== 'list' && !isCreator) return json({ error: 'Only the account owner can change the team.' }, 403);

    switch (body.action) {
      case 'list':
        return json({ org: { id: orgId, name: org?.name ?? '' }, canManage: isCreator, members: (await members()).map(view) });

      case 'rename': {
        const name = String(body.name ?? '').trim().slice(0, 120);
        if (!name) return json({ error: 'Enter a name.' }, 400);
        await admin.from('a41_organizations').update({ name }).eq('id', orgId);
        return json({ ok: true });
      }

      case 'add': {
        const email = String(body.email ?? '').trim().toLowerCase();
        const name = String(body.name ?? '').trim().slice(0, 120);
        const desk = body.role === 'desk';
        const code = String(body.code ?? '');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400);
        if ((await members()).some((m) => m.email.toLowerCase() === email)) return json({ error: 'This person is already on your team.' }, 409);

        const { data: found } = await admin.rpc('a41_svc_user', { p_email: email });
        const existing = found?.[0] as { id: string; role: string | null } | undefined;
        let userId: string;

        if (desk) {
          // The access code is the account password, so desk accounts must be new and only for this desk.
          if (existing) return json({ error: 'This email already has an account. Use a separate email for the register desk.' }, 409);
          if (code.length < 8) return json({ error: 'The access code needs at least 8 characters.' }, 400);
          const { data, error } = await admin.auth.admin.createUser({
            email, password: code, email_confirm: true, user_metadata: { name }, app_metadata: { a41_role: 'desk' },
          });
          if (error) return json({ error: error.message }, 400);
          userId = data.user.id;
        } else if (existing) {
          if (existing.role === 'desk') return json({ error: 'This email is a register desk account. Use another email.' }, 409);
          const { data: full } = await admin.auth.admin.getUserById(existing.id);
          await admin.auth.admin.updateUserById(existing.id, {
            app_metadata: { ...(full.user?.app_metadata ?? {}), a41_role: existing.role ?? 'organizer' },
            user_metadata: name ? { ...(full.user?.user_metadata ?? {}), name } : full.user?.user_metadata,
          });
          userId = existing.id;
        } else {
          // Admin organizers sign in with an emailed code; the password is random and never shown.
          const { data, error } = await admin.auth.admin.createUser({
            email, password: randomSecret(), email_confirm: true, user_metadata: { name }, app_metadata: { a41_role: 'organizer' },
          });
          if (error) return json({ error: error.message }, 400);
          userId = data.user.id;
        }

        const { error: memberError } = await admin.from('a41_memberships').insert({ org_id: orgId, user_id: userId, role: desk ? 'staff' : 'owner' });
        if (memberError) return json({ error: memberError.message }, 400);
        return json({ ok: true });
      }

      case 'remove': {
        const id = String(body.id ?? '');
        if (id === me.id) return json({ error: 'You cannot remove yourself.' }, 400);
        const target = (await members()).find((m) => m.user_id === id);
        if (!target) return json({ error: 'Not on your team.' }, 404);
        await admin.from('a41_memberships').delete().eq('org_id', orgId).eq('user_id', id);
        // Desk accounts exist only for this team, so switch them off too.
        if (target.membership_role === 'staff' && target.app_role === 'desk') {
          await admin.auth.admin.updateUserById(id, { ban_duration: '876000h' });
        }
        return json({ ok: true });
      }

      case 'reset-code': {
        const id = String(body.id ?? '');
        const code = String(body.code ?? '');
        const target = (await members()).find((m) => m.user_id === id);
        if (!target || target.app_role !== 'desk') return json({ error: 'Only register desk accounts have an access code.' }, 400);
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
