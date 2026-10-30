// dayoneproject.xyz platform admin: manage organizer, admin and register-desk accounts.
// Accounts in this Supabase project are shared with other products, so event-platform
// access is a role in app_metadata (a41_role). Removing access never deletes the account.
// Deployed to Supabase project dayoneproject (pmuryumfyekjwqntcypo) as `a41-admin` with verify_jwt on.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = ['https://app.dayoneproject.xyz', 'http://localhost:3042', 'http://localhost:3000'];
// organizer/admin sign in with an emailed code; desk staff with email + a generated access code (their password).
const ROLES = ['organizer', 'admin', 'desk'];

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
          return json({ user: view(data.user as AnyUser), existing: true });
        }

        if (role === 'desk' && password.length < 8) return json({ error: 'The access code needs at least 8 characters.' }, 400);
        const { data, error } = await admin.auth.admin.createUser({
          email,
          // Organizers and admins never use a password: give them an unguessable one nobody sees.
          password: role === 'desk' ? password : randomSecret(),
          email_confirm: true,
          user_metadata: { name },
          app_metadata: { a41_role: role },
        });
        if (error) return json({ error: error.message }, 400);
        return json({ user: view(data.user as AnyUser), existing: false });
      }

      case 'update': {
        const id = String(body.id ?? '');
        const { data: found, error: findError } = await admin.auth.admin.getUserById(id);
        if (findError || !found.user) return json({ error: 'User not found.' }, 404);
        const u = found.user as AnyUser;
        const patch: Record<string, unknown> = {};
        if (body.role !== undefined) {
          const app = { ...(u.app_metadata ?? {}) };
          if (body.role === null) delete app.a41_role;
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
