// dayoneproject.xyz sign-in helpers. Deployed to Supabase project dayoneproject (pmuryumfyekjwqntcypo)
// as `a41-auth` with verify_jwt OFF: callers are signed out, so every action checks its own rules.
//
// - email-code:   organizers/admins get a 6-digit code by email (sent with Resend, not Supabase SMTP).
// - totp-login:   platform admins sign in with email + authenticator code.
// - totp-setup / totp-confirm / totp-status: a signed-in platform admin manages their authenticator.
// - totp-bootstrap-start / -finish: first authenticator for a platform admin, proven by the one-time
//   setup code stored in Supabase Vault as `a41auth_setup_code` (only the project owner can read it).
// Sessions are minted with auth.admin.generateLink; the browser finishes with auth.verifyOtp.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = ['https://app.dayoneproject.xyz', 'http://localhost:3042', 'http://localhost:3000'];
const ISSUER = 'dayoneproject.xyz';

function corsHeaders(origin: string | null) {
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin));
  return {
    'Access-Control-Allow-Origin': allowed ? origin! : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

/* ── TOTP (RFC 6238, SHA-1, 6 digits, 30 s) ── */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(text: string): Uint8Array {
  const clean = text.replace(/=+$/, '').toUpperCase();
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

async function totpAt(secret: string, step: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', base32Decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const msg = new ArrayBuffer(8);
  new DataView(msg).setBigUint64(0, BigInt(step));
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  const offset = mac[mac.length - 1] & 15;
  const bin = ((mac[offset] & 127) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(bin % 1_000_000).padStart(6, '0');
}

/** Returns the matching time step (current ±1), or null. */
async function matchTotp(secret: string, code: string): Promise<number | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const now = Math.floor(Date.now() / 1000 / 30);
  for (const step of [now, now - 1, now + 1]) {
    if ((await totpAt(secret, step)) === code) return step;
  }
  return null;
}

function emailHtml(code: string) {
  return `<!doctype html><html><body style="margin:0;background:#09090B;font-family:Manrope,Arial,sans-serif;color:#FAFAFA">
<div style="max-width:440px;margin:0 auto;padding:40px 24px;text-align:center">
<div style="width:48px;height:48px;border-radius:999px;background:#C5A059;color:#09090B;font-weight:700;font-size:20px;line-height:48px;margin:0 auto">D1</div>
<h1 style="font-size:22px;margin:24px 0 8px">Your sign-in code</h1>
<p style="color:#A1A1AA;font-size:14px;margin:0 0 24px">Enter this code on dayoneproject.xyz to sign in.</p>
<div style="font-family:monospace;font-size:34px;letter-spacing:10px;font-weight:700;color:#C5A059;background:#18181B;border:1px solid #27272A;border-radius:16px;padding:18px 0">${code}</div>
<p style="color:#71717A;font-size:12px;margin:24px 0 0">The code expires in 1 hour. If you didn't ask for it, you can ignore this email.</p>
</div></body></html>`;
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';

  const hit = async (key: string, max: number, windowSeconds: number) => {
    const { data } = await admin.rpc('a41_svc_hit', { p_key: key, p_max: max, p_window_seconds: windowSeconds });
    return data === true;
  };
  const secret = async (name: string) => (await admin.rpc('a41_svc_secret', { p_name: name })).data as string | null;
  const findUser = async (email: string) => {
    const { data } = await admin.rpc('a41_svc_user', { p_email: email });
    return (data?.[0] ?? null) as { id: string; email: string; role: string | null; banned: boolean; is_platform_admin: boolean } | null;
  };
  /** The signed-in caller (for authenticator setup). */
  const caller = async () => {
    const asCaller = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data } = await asCaller.auth.getUser();
    if (!data.user?.email) return null;
    const u = await findUser(data.user.email);
    return u && u.is_platform_admin && !u.banned ? u : null;
  };
  const tokenHashFor = async (email: string) => {
    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    if (error || !data.properties) throw new Error('Could not start the session.');
    return data.properties;
  };

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? '').trim().toLowerCase();

    switch (body.action) {
      case 'email-code': {
        if (!(await hit(`ip:${ip}`, 30, 900)) || !(await hit(`email-code:${email}`, 5, 900))) {
          return json({ error: 'Too many codes requested. Wait 15 minutes and try again.' }, 429);
        }
        const user = await findUser(email);
        if (!user || user.banned || !(user.role === 'organizer' || user.role === 'admin' || user.is_platform_admin)) {
          return json({ error: 'No organizer account uses this email. Ask your admin to add you.' }, 404);
        }
        const resendKey = await secret('a41_RESEND_API_KEY');
        if (!resendKey) return json({ error: 'Email sign-in is not set up yet: add RESEND_API_KEY in Admin > API keys.' }, 503);
        const from = (await secret('a41_RESEND_FROM')) || 'dayoneproject.xyz <login@dayoneproject.xyz>';

        const props = await tokenHashFor(user.email);
        const code = props.email_otp;
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from,
            to: [user.email],
            subject: `${code} is your dayoneproject.xyz sign-in code`,
            html: emailHtml(code),
            text: `Your dayoneproject.xyz sign-in code is ${code}. It expires in 1 hour.`,
          }),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          return json({ error: `The email could not be sent: ${detail?.message ?? res.statusText}` }, 502);
        }
        return json({ ok: true });
      }

      case 'totp-login': {
        const code = String(body.code ?? '').trim();
        if (!(await hit(`ip:${ip}`, 30, 900)) || !(await hit(`totp:${email}`, 6, 900))) {
          return json({ error: 'Too many tries. Wait 15 minutes and try again.' }, 429);
        }
        const user = await findUser(email);
        if (!user || user.banned || !user.is_platform_admin) return json({ error: 'Wrong email or code.' }, 401);
        const key = await secret(`a41auth_totp_${user.id}`);
        if (!key) return json({ error: 'No authenticator is set up for this account yet.' }, 409);
        const step = await matchTotp(key, code);
        // Each code works once.
        if (step === null || !(await hit(`totp-used:${user.id}:${step}`, 1, 120))) return json({ error: 'Wrong email or code.' }, 401);
        const props = await tokenHashFor(user.email);
        return json({ tokenHash: props.hashed_token });
      }

      case 'totp-bootstrap-start':
      case 'totp-bootstrap-finish': {
        const setupCode = String(body.setupCode ?? '').trim().toUpperCase();
        if (!(await hit(`ip:${ip}`, 30, 900)) || !(await hit(`bootstrap:${email}`, 8, 900))) {
          return json({ error: 'Too many tries. Wait 15 minutes and try again.' }, 429);
        }
        const user = await findUser(email);
        const expected = (await secret('a41auth_setup_code'))?.trim().toUpperCase();
        if (!user || user.banned || !user.is_platform_admin || !expected || setupCode !== expected) {
          return json({ error: 'Wrong email or setup code.' }, 401);
        }
        if (await secret(`a41auth_totp_${user.id}`)) return json({ error: 'An authenticator is already set up. Sign in with it.' }, 409);

        if (body.action === 'totp-bootstrap-start') {
          const raw = new Uint8Array(20);
          crypto.getRandomValues(raw);
          const key = base32Encode(raw);
          await admin.rpc('a41_svc_set_secret', { p_name: `a41auth_totp_pending_${user.id}`, p_value: key });
          const label = encodeURIComponent(`${ISSUER}:${user.email}`);
          return json({ secret: key, uri: `otpauth://totp/${label}?secret=${key}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=30` });
        }

        const pending = await secret(`a41auth_totp_pending_${user.id}`);
        const step = pending ? await matchTotp(pending, String(body.code ?? '').trim()) : null;
        if (!pending || step === null) return json({ error: 'That code does not match. Check the time on your phone and try again.' }, 400);
        await hit(`totp-used:${user.id}:${step}`, 1, 120);
        await admin.rpc('a41_svc_set_secret', { p_name: `a41auth_totp_${user.id}`, p_value: pending });
        await admin.rpc('a41_svc_delete_secret', { p_name: `a41auth_totp_pending_${user.id}` });
        await admin.rpc('a41_svc_delete_secret', { p_name: 'a41auth_setup_code' });
        const props = await tokenHashFor(user.email);
        return json({ tokenHash: props.hashed_token });
      }

      case 'totp-status': {
        const me = await caller();
        if (!me) return json({ error: 'forbidden' }, 403);
        return json({ enabled: !!(await secret(`a41auth_totp_${me.id}`)) });
      }

      case 'totp-setup': {
        const me = await caller();
        if (!me) return json({ error: 'forbidden' }, 403);
        const raw = new Uint8Array(20);
        crypto.getRandomValues(raw);
        const key = base32Encode(raw);
        await admin.rpc('a41_svc_set_secret', { p_name: `a41auth_totp_pending_${me.id}`, p_value: key });
        const label = encodeURIComponent(`${ISSUER}:${me.email}`);
        const uri = `otpauth://totp/${label}?secret=${key}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=30`;
        return json({ secret: key, uri });
      }

      case 'totp-confirm': {
        const me = await caller();
        if (!me) return json({ error: 'forbidden' }, 403);
        if (!(await hit(`totp-confirm:${me.id}`, 10, 900))) return json({ error: 'Too many tries. Wait 15 minutes.' }, 429);
        const pending = await secret(`a41auth_totp_pending_${me.id}`);
        if (!pending) return json({ error: 'Start the setup again.' }, 409);
        if ((await matchTotp(pending, String(body.code ?? '').trim())) === null) return json({ error: 'That code does not match. Check the time on your phone and try again.' }, 400);
        await admin.rpc('a41_svc_set_secret', { p_name: `a41auth_totp_${me.id}`, p_value: pending });
        await admin.rpc('a41_svc_delete_secret', { p_name: `a41auth_totp_pending_${me.id}` });
        return json({ ok: true });
      }

      default:
        return json({ error: 'Unknown action.' }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, 500);
  }
});
