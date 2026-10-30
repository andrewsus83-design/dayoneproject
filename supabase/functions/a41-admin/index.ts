// dayoneproject.xyz platform admin: manage organizer, admin and register-desk accounts.
// Accounts in this Supabase project are shared with other products, so event-platform
// access is a role in app_metadata (a41_role). Removing access never deletes the account.
// Deployed to Supabase project dayoneproject (pmuryumfyekjwqntcypo) as `a41-admin` with verify_jwt on.
import { createClient } from 'jsr:@supabase/supabase-js@2';

// The app, local dev, and this project's own Vercel preview deployments.
const ALLOWED_ORIGINS = ['https://app.dayoneproject.xyz', 'http://localhost:3042', 'http://localhost:3000'];
const PREVIEW_ORIGIN = /^https:\/\/all41-u356-[a-z0-9-]+-andrewsus83-5642s-projects\.vercel\.app$/;
// organizer/admin sign in with an emailed code; desk staff with email + a generated access code (their password).
const ROLES = ['organizer', 'admin', 'desk'];

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

/** Tells a new organizer or admin how to sign in. Never blocks the create: false when the email could not go out. */
// deno-lint-ignore no-explicit-any
async function sendWelcome(admin: any, to: string, name: string): Promise<boolean> {
  try {
    const secret = async (key: string) => (await admin.rpc('a41_svc_secret', { p_name: key })).data as string | null;
    const resendKey = await secret('a41_RESEND_API_KEY');
    if (!resendKey) return false;
    const from = (await secret('a41_RESEND_FROM')) || 'dayoneproject.xyz <login@dayoneproject.xyz>';
    const link = `${APP_URL}/login?as=organizer&email=${encodeURIComponent(to)}`;
    const first = name.trim().split(/\s+/)[0] ?? '';
    const html = `<!doctype html><html><body style="margin:0;background:#09090B;font-family:Manrope,Arial,sans-serif;color:#FAFAFA">
<div style="max-width:440px;margin:0 auto;padding:40px 24px;text-align:center">
<div style="width:48px;height:48px;border-radius:999px;background:#C5A059;color:#09090B;font-weight:700;font-size:20px;line-height:48px;margin:0 auto">D1</div>
<h1 style="font-size:22px;margin:24px 0 8px">${first ? `Welcome, ${esc(first)}` : 'Welcome'}</h1>
<p style="color:#A1A1AA;font-size:14px;line-height:1.6;margin:0 0 24px">You now have an organizer account on dayoneproject.xyz. You can create events and add your own team.</p>
<a href="${link}" style="display:inline-block;background:#C5A059;color:#09090B;font-weight:700;font-size:14px;text-decoration:none;padding:14px 28px;border-radius:12px">Sign in</a>
<p style="color:#71717A;font-size:12px;line-height:1.6;margin:24px 0 0">Open app.dayoneproject.xyz/login, choose Organizer and enter this email address. We email you a sign-in code each time; there is no password.</p>
</div></body></html>`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: 'Your dayoneproject.xyz organizer account is ready',
        html,
        text: `You now have an organizer account on dayoneproject.xyz.\n\nSign in: ${link}\n\nChoose Organizer and enter this email address. We email you a sign-in code each time; there is no password.`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

type AnyUser = {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string | null;
  banned_until?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

function view(u: AnyUser) {
  return {
    id: u.id,
    email: u.email ?? '',
    name: (u.user_metadata?.name as string) ?? '',
    role: (u.app_metadata?.a41_role as string) ?? null,
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
    disabled: !!u.banned_until && new Date(u.banned_until).getTime() > Date.now(),
  };
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Only platform admins (a41_platform_admins) may use this function.
    const asCaller = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: me, error: meError } = await asCaller.rpc('a41_whoami');
    if (meError || !me?.isAdmin) return json({ error: 'forbidden' }, 403);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json().catch(() => ({}));

    const allUsers = async (): Promise<AnyUser[]> => {
      const out: AnyUser[] = [];
      for (let page = 1; page < 50; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        out.push(...(data.users as AnyUser[]));
        if (data.users.length < 1000) break;
      }
      return out;
    };

    switch (body.action) {
      case 'list': {
        const users = (await allUsers()).filter((u) => u.app_metadata?.a41_role || u.email === me.email);
        return json({ users: users.map(view) });
      }

      case 'create': {
        const email = String(body.email ?? '').trim().toLowerCase();
        const name = String(body.name ?? '').trim().slice(0, 120);
        const role = ROLES.includes(body.role) ? body.role : 'organizer';
        const password = String(body.password ?? '');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400);

        const existing = (await allUsers()).find((u) => u.email?.toLowerCase() === email);
        if (existing && role === 'desk') {
          // A desk access code is the account password; changing it would break their other Day One Project apps.
          return json({ error: 'This email already has a Day One Project account. Use a separate email for the register desk.' }, 409);
        }
        if (existing) {
          // Already has an account (maybe from another Day One Project app): grant access, keep their password.
          const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
            app_metadata: { ...(existing.app_metadata ?? {}), a41_role: role },
            user_metadata: name ? { ...(existing.user_metadata ?? {}), name } : existing.user_metadata,
          });
          if (error) return json({ error: error.message }, 400);
          const welcomeSent = existing.app_metadata?.a41_role ? false : await sendWelcome(admin, email, name);
          return json({ user: view(data.user as AnyUser), existing: true, welcomeSent });
        }

        if (role === 'desk' && password.length < 8) return json({ error: 'The access code needs at least 8 characters.' }, 400);
        const { data, error } = await admin.auth.admin.createUser({
          email,
          // Organizers and admins sign in with emailed codes and get no password at all
          // (a41-team only links existing accounts that have none).
          ...(role === 'desk' ? { password } : {}),
          email_confirm: true,
          user_metadata: { name },
          app_metadata: { a41_role: role },
        });
        if (error) return json({ error: error.message }, 400);
        // Organizers and admins get a welcome email with the sign-in link; desk staff get their code from you.
        const welcomeSent = role === 'desk' ? false : await sendWelcome(admin, email, name);
        return json({ user: view(data.user as AnyUser), existing: false, welcomeSent });
      }

      case 'update': {
        const id = String(body.id ?? '');
        const { data: found, error: findError } = await admin.auth.admin.getUserById(id);
        if (findError || !found.user) return json({ error: 'User not found.' }, 404);
        const u = found.user as AnyUser;
        const patch: Record<string, unknown> = {};
        if (body.role !== undefined) {
          const app: Record<string, unknown> = { ...(u.app_metadata ?? {}) };
          // Auth merges app_metadata on update, so a key is removed by sending it as null (deleting it kept the role).
          if (body.role === null) app.a41_role = null;
          else if (body.role === 'desk' && app.a41_role !== 'desk') {
            return json({ error: 'Register desk accounts are created as new accounts with their own email.' }, 400);
          } else if (ROLES.includes(body.role)) app.a41_role = body.role;
          else return json({ error: 'Unknown role.' }, 400);
          patch.app_metadata = app;
        }
        if (typeof body.name === 'string') patch.user_metadata = { ...(u.user_metadata ?? {}), name: body.name.trim().slice(0, 120) };
        if (typeof body.password === 'string') {
          // Only register-desk access codes are managed here; other accounts are shared with other apps.
          if (u.app_metadata?.a41_role !== 'desk') return json({ error: 'Only register desk accounts have an access code.' }, 400);
          if (body.password.length < 8) return json({ error: 'The access code needs at least 8 characters.' }, 400);
          patch.password = body.password;
        }
        if (typeof body.disabled === 'boolean') patch.ban_duration = body.disabled ? '876000h' : 'none';
        if (u.email === me.email && (body.disabled === true || body.role === null)) {
          return json({ error: 'You cannot disable or remove your own account.' }, 400);
        }
        const { data, error } = await admin.auth.admin.updateUserById(id, patch);
        if (error) return json({ error: error.message }, 400);
        return json({ user: view(data.user as AnyUser) });
      }

      default:
        return json({ error: 'Unknown action.' }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, 500);
  }
});
