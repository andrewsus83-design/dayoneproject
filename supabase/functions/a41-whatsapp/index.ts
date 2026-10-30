// dayoneproject.xyz WhatsApp sending through Fonnte. Deployed to Supabase project dayoneproject (pmuryumfyekjwqntcypo)
// as `a41-whatsapp` with verify_jwt off: every action checks its own caller.
//
// - enqueue / cancel (the event's managers): queue an event's broadcast, or stop what has not gone out yet.
//   Both run as the signed-in organizer through a41_wa_enqueue / a41_wa_cancel, which only message the event's own
//   guests (numbers come from a41_guests) and keep each organization inside its daily limit.
// - run (the one-minute timer, or anyone): sends waiting messages one at a time, 5–15 s apart, from the
//   platform's Fonnte number, taking turns between organizations. Only one run sends at a time.
// - device / test (platform admin): the number's status and quota, and one test message.
// The Fonnte device token lives in Supabase Vault as a41_FONNTE_TOKEN (Admin > API keys > FONNTE_TOKEN).
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = ['https://app.dayoneproject.xyz', 'http://localhost:3042', 'http://localhost:3000'];
const PREVIEW_ORIGIN = /^https:\/\/all41-u356-[a-z0-9-]+\.vercel\.app$/;
const FONNTE = 'https://api.fonnte.com';
const MIN_GAP_MS = 5_000;
const MAX_GAP_MS = 15_000;
const BUDGET_MS = 100_000; // stop starting new messages after this, so a run ends well inside the platform limit
const LEASE_SECONDS = 150;
const PAUSE_SECONDS = 600; // after an account problem (bad token, no quota, number offline), wait before trying again
const MAX_MESSAGES = 3000;
/** Fonnte reasons that concern one message only; any other refusal means the number or account needs attention. */
const MESSAGE_PROBLEMS = ['target invalid', 'input invalid'];

/** What organizers see for each refusal from a41_wa_enqueue / a41_wa_cancel. */
const RPC_ERRORS: Record<string, [number, string]> = {
  not_signed_in: [401, 'Sign in again to continue.'],
  event_not_found: [404, 'Save this event to your organization first.'],
  forbidden: [403, 'Only the organizers who manage this event can send its messages.'],
  rate_limited: [429, 'Too many broadcasts in the last hour. Try again later.'],
  too_many_messages: [400, `Send to at most ${MAX_MESSAGES} guests at a time.`],
  invalid_messages: [400, 'Nothing to send.'],
};

function corsHeaders(origin: string | null) {
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN.test(origin));
  return {
    'Access-Control-Allow-Origin': allowed ? origin! : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const gap = () => MIN_GAP_MS + Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS + 1));
const errText = (e: unknown) => String(e instanceof Error ? e.message : e).slice(0, 200);

/** Digits only, Indonesian 0-prefix to 62; null when it cannot be a WhatsApp number. */
function normalizePhone(raw: unknown): string | null {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.startsWith('0')) d = `62${d.slice(1)}`;
  return /^[1-9][0-9]{7,14}$/.test(d) ? d : null;
}

type Outcome = { kind: 'sent'; id: string } | { kind: 'fail' | 'retry' | 'halt'; note: string };

async function fonnteSend(token: string, phone: string, message: string): Promise<Outcome> {
  const form = new FormData();
  form.set('target', phone);
  form.set('message', message);
  form.set('countryCode', '62');
  let res: Response;
  try {
    res = await fetch(`${FONNTE}/send`, { method: 'POST', headers: { Authorization: token }, body: form });
  } catch (e) {
    return { kind: 'retry', note: `network: ${errText(e)}` };
  }
  if (res.status === 429 || res.status >= 500) return { kind: 'retry', note: `WhatsApp gateway busy (${res.status})` };
  const data = await res.json().catch(() => null);
  if ((data?.status ?? data?.Status) === true) return { kind: 'sent', id: String(data?.id?.[0] ?? '') };
  const reason = String(data?.reason ?? data?.detail ?? `HTTP ${res.status}`).slice(0, 200);
  if (MESSAGE_PROBLEMS.some((p) => reason.toLowerCase().includes(p))) return { kind: 'fail', note: reason };
  return { kind: 'halt', note: reason };
}

type Claimed = { id: number; to_phone: string; body: string };
type Secret = (name: string) => Promise<string | null>;

/** Emails the platform admins that sending has paused (at most once every 6 hours). Never throws. */
async function tellAdmins(admin: SupabaseClient, secret: Secret, reason: string) {
  try {
    const { data: first } = await admin.rpc('a41_svc_hit', { p_key: 'notice:wa-paused', p_max: 1, p_window_seconds: 21_600 });
    if (first !== true) return;
    const key = (await secret('a41_RESEND_API_KEY'))?.trim();
    const { data: admins } = await admin.from('a41_platform_admins').select('email');
    const to = (admins ?? []).map((a: { email: string }) => a.email).filter(Boolean);
    if (!key || !to.length) return;
    const from = (await secret('a41_RESEND_FROM'))?.trim() || 'dayoneproject.xyz <events@dayoneproject.xyz>';
    const text = `WhatsApp sending is paused for ${PAUSE_SECONDS / 60} minutes because the sending number refused a message:\n\n` +
      `${reason}\n\nWaiting messages are kept and go out once the number works again. Check Admin > WhatsApp: ` +
      'https://app.dayoneproject.xyz/admin/whatsapp';
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: 'WhatsApp sending is paused', text }),
    });
  } catch {
    // The admin page shows the pause either way.
  }
}

async function run(admin: SupabaseClient, secret: Secret) {
  const out = { busy: false, sent: 0, failed: 0, retrying: 0, halted: '' };
  const { data: begin } = await admin.rpc('a41_svc_wa_begin', { p_seconds: LEASE_SECONDS });
  if (!begin?.ok) return { ...out, busy: true };

  let pause = 0;
  try {
    const token = (await secret('a41_FONNTE_TOKEN'))?.trim();
    if (!token) {
      out.halted = 'not_configured';
      return out;
    }
    let last = begin.last_sent_at ? Date.parse(begin.last_sent_at) : 0;
    const t0 = Date.now();
    while (Date.now() - t0 < BUDGET_MS - MAX_GAP_MS) {
      const { data: rows, error } = await admin.rpc('a41_svc_wa_claim', { p_limit: 1 });
      if (error) throw new Error(error.message);
      const row = (rows as Claimed[] | null)?.[0];
      if (!row) break;

      const wait = last + gap() - Date.now();
      if (wait > 0) await sleep(wait);
      const r = await fonnteSend(token, row.to_phone, row.body);
      const finish = (outcome: string, note: string | null = null, providerId: string | null = null) =>
        admin.rpc('a41_svc_wa_finish', { p_id: row.id, p_outcome: outcome, p_note: note, p_provider_id: providerId });

      if (r.kind === 'sent') {
        out.sent++;
        last = Date.now();
        await finish('sent', null, r.id);
      } else if (r.kind === 'fail') {
        out.failed++;
        await finish('failed', r.note);
      } else if (r.kind === 'retry') {
        out.retrying++;
        await finish('retry', r.note);
      } else {
        // The number or account needs attention: keep the message waiting and pause sending.
        out.halted = r.note;
        await finish('hold', r.note);
        pause = PAUSE_SECONDS;
        break;
      }
    }
    return out;
  } finally {
    await admin.rpc('a41_svc_wa_end', { p_pause_seconds: pause, p_note: pause ? out.halted : null });
    if (pause) await tellAdmins(admin, secret, out.halted);
  }
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const secret = async (name: string) => (await admin.rpc('a41_svc_secret', { p_name: name })).data as string | null;
    const body = await req.json().catch(() => ({}));

    // The timer's call: nothing to authorize, and nothing private comes back.
    if (body.action === 'run') return json(await run(admin, secret));

    const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: auth } = await asCaller.auth.getUser();
    const me = auth.user;
    if (!me) return json({ error: 'Sign in again to continue.' }, 401);
    const { data: who } = await asCaller.rpc('a41_whoami');
    const isPlatformAdmin = who?.isAdmin === true;
    const refused = (message: string) => {
      const [status, text] = RPC_ERRORS[message] ?? [400, 'Could not send. Try again.'];
      return json({ error: text }, status);
    };

    switch (body.action) {
      case 'cancel': {
        const { data, error } = await asCaller.rpc('a41_wa_cancel', { p_event: String(body.eventId ?? '') });
        if (error) return refused(error.message);
        return json(data);
      }

      case 'enqueue': {
        if (!(await secret('a41_FONNTE_TOKEN'))?.trim()) {
          return json({ error: 'WhatsApp sending is not switched on yet. Ask your dayoneproject.xyz admin.' }, 503);
        }
        const input: unknown[] = Array.isArray(body.messages) ? body.messages : [];
        if (input.length > MAX_MESSAGES) return refused('too_many_messages');
        // New clients send {guestId, text}; older ones {phone, name, text}, which the database only accepts when the
        // number belongs to one of the event's guests. The number itself always comes from the guest list.
        const messages = input.map((m) => {
          const item = (m ?? {}) as Record<string, unknown>;
          const text = String(item.text ?? '').slice(0, 4000);
          return item.guestId ? { guestId: String(item.guestId), text } : { phone: String(item.phone ?? ''), text };
        });
        const { data, error } = await asCaller.rpc('a41_wa_enqueue', {
          p_event: String(body.eventId ?? ''),
          p_label: String(body.label ?? '').trim().slice(0, 80),
          p_messages: messages,
        });
        if (error) return refused(error.message);
        if (data?.ok !== true) {
          if (data?.reason === 'daily_limit') {
            return json({
              error: data.remaining > 0
                ? `Your organization can send ${data.remaining} more WhatsApp message${data.remaining === 1 ? '' : 's'} today (${data.limit} a day). Send to fewer guests, or try again tomorrow.`
                : `Your organization has sent its ${data.limit} WhatsApp messages for today. Try again tomorrow.`,
              limit: data.limit,
              remaining: data.remaining,
            }, 429);
          }
          return json({ error: 'None of these guests has a WhatsApp number in this event’s guest list.' }, 400);
        }
        return json({ queued: data.queued, skipped: data.skipped, minutes: data.minutes, limit: data.limit, remaining: data.remaining });
      }

      case 'device': {
        if (!isPlatformAdmin) return json({ error: 'forbidden' }, 403);
        const { data: overview } = await admin.rpc('a41_svc_wa_overview');
        const token = (await secret('a41_FONNTE_TOKEN'))?.trim();
        if (!token) return json({ configured: false, device: null, overview });
        let device: Record<string, unknown> | null = null;
        try {
          const res = await fetch(`${FONNTE}/device`, { method: 'POST', headers: { Authorization: token } });
          const d = await res.json().catch(() => null);
          device = d?.status === true
            ? { ok: true, number: d.device ?? '', name: d.name ?? '', connected: d.device_status === 'connect', quota: d.quota ?? null, package: d.package ?? '', expires: d.expired ?? '' }
            : { ok: false, reason: String(d?.reason ?? `HTTP ${res.status}`) };
        } catch (e) {
          device = { ok: false, reason: `network: ${errText(e)}` };
        }
        return json({ configured: true, device, overview });
      }

      case 'test': {
        if (!isPlatformAdmin) return json({ error: 'forbidden' }, 403);
        const phone = normalizePhone(body.phone);
        if (!phone) return json({ error: 'Enter a WhatsApp number, for example 0812 3456 7890.' }, 400);
        const token = (await secret('a41_FONNTE_TOKEN'))?.trim();
        if (!token) return json({ error: 'Add FONNTE_TOKEN in Admin → API keys first.' }, 400);
        const r = await fonnteSend(token, phone, 'Test message from dayoneproject.xyz. WhatsApp sending works.');
        return r.kind === 'sent' ? json({ ok: true }) : json({ error: `Not sent: ${r.note}` }, 502);
      }

      default:
        return json({ error: 'Unknown action.' }, 400);
    }
  } catch (e) {
    return json({ error: errText(e) }, 500);
  }
});
