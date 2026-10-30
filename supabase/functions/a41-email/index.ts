// dayoneproject.xyz email broadcasts through Resend. Deployed to Supabase project dayoneproject (pmuryumfyekjwqntcypo)
// as `a41-email` with verify_jwt off: every action checks its own caller.
//
// - enqueue / cancel (the event's managers): queue one email per guest from the template the organizer edited, or
//   stop what has not gone out yet. Both run as the signed-in organizer through a41_email_enqueue / a41_email_cancel,
//   which take each address from a41_guests and keep the organization inside its daily limit.
// - stats (the event's team): progress, the same shape as WhatsApp's.
// - run (the one-minute timer, or anyone): sends waiting emails about 2 a second, one runner at a time, for up to
//   100 s. Each email gets the guest's pass link (and QR code), and invitation / pass / reminder emails an .ics file.
//   Resend idempotency keys (one per queued email) mean a retried send never arrives twice.
// The Resend key lives in Supabase Vault as a41_RESEND_API_KEY; the sender is a41_RESEND_FROM, or
// "dayoneproject.xyz <events@dayoneproject.xyz>". Replies go to the event's contact email when it has one.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import QRCode from 'npm:qrcode@1.5.4';

const APP = 'https://app.dayoneproject.xyz';
const ALLOWED_ORIGINS = ['https://app.dayoneproject.xyz', 'http://localhost:3042', 'http://localhost:3000'];
const PREVIEW_ORIGIN = /^https:\/\/all41-u356-[a-z0-9-]+\.vercel\.app$/;
const RESEND = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'dayoneproject.xyz <events@dayoneproject.xyz>';
const GAP_MS = 550; // about 2 a second, inside Resend's default rate limit for the whole account
const SLOW_DOWN_MS = 1_500; // after Resend asks to slow down
const BUDGET_MS = 100_000; // stop starting new emails after this, so a run ends well inside the platform limit
const LEASE_SECONDS = 150;
const PAUSE_SECONDS = 600; // the key or the sender domain was refused
const QUOTA_PAUSE_SECONDS = 3_600; // the account's daily or monthly quota is used up
const MAX_PER_CALL = 500;
/** Emails that show the guest's QR code (the thank-you only links to the pass). */
const QR_KINDS = new Set(['invitation', 'pass', 'reminder', 'winner']);

const RPC_ERRORS: Record<string, [number, string]> = {
  not_signed_in: [401, 'Sign in again to continue.'],
  event_not_found: [404, 'Save this event to your organization first.'],
  forbidden: [403, 'Only the organizers who manage this event can send its emails.'],
  rate_limited: [429, 'Too many broadcasts in the last hour. Try again later.'],
  too_many_messages: [400, `Send at most ${MAX_PER_CALL} emails per request.`],
  message_too_large: [400, 'This email is too long to send. Shorten the message or remove the image.'],
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
const errText = (e: unknown) => String(e instanceof Error ? e.message : e).slice(0, 200);
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function base64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/* ── Calendar file (RFC 5545) ── */

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsTime = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Folds a content line at 75 octets without splitting a character. */
function fold(line: string): string {
  const enc = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (size + n > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function buildIcs(row: Claimed, passLink: string | null): string {
  const start = Date.parse(row.starts_at);
  const end = Date.parse(row.ends_at) > start ? row.ends_at : new Date(start + 2 * 3_600_000).toISOString();
  const location = [row.venue_name, row.venue_address].filter(Boolean).join(', ');
  const eventUrl = `${APP}/events/${row.event_slug}`;
  const description = passLink ? `Your guest pass: ${passLink}` : eventUrl;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//dayoneproject.xyz//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${row.event_id}@dayoneproject.xyz`,
    // From the queued email, not the clock, so a retried send is byte-for-byte the same request.
    `DTSTAMP:${icsTime(row.created_at)}`,
    `DTSTART:${icsTime(row.starts_at)}`,
    `DTEND:${icsTime(end)}`,
    `SUMMARY:${icsText(row.event_name)}`,
    ...(location ? [`LOCATION:${icsText(location)}`] : []),
    `DESCRIPTION:${icsText(description)}`,
    `URL:${eventUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/* ── The email ── */

type Claimed = {
  id: number;
  kind: string;
  to_email: string;
  to_name: string;
  reply_to: string | null;
  subject: string;
  html: string;
  text: string;
  with_ics: boolean;
  created_at: string;
  guest_token: string | null;
  event_id: string;
  event_name: string;
  event_slug: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  venue_name: string | null;
  venue_address: string | null;
};

type Attachment = { filename: string; content: string; content_id?: string };

/** The event's name in front of the platform's sending address. */
function sender(from: string, eventName: string): string {
  const address = from.match(/<([^>]+)>/)?.[1]?.trim() ?? from.trim();
  // Letters, digits and plain punctuation only, so no event name can make the sender invalid.
  const name = eventName.replace(/[^\p{L}\p{N} &'.,\-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 70).trim();
  return name ? `"${name}" <${address}>` : from;
}

/** Puts the pass block where the template marks it, else at the end of the body. */
function placeBlock(html: string, block: string): string {
  if (html.includes('<!--a41:pass-->')) return html.replace('<!--a41:pass-->', block);
  const at = html.toLowerCase().lastIndexOf('</body>');
  return at >= 0 ? html.slice(0, at) + block + html.slice(at) : html + block;
}

async function buildEmail(row: Claimed, from: string) {
  let html = row.html;
  let text = row.text;
  const attachments: Attachment[] = [];
  const passLink = row.guest_token ? `${APP}/events/${row.event_slug}/pass?t=${encodeURIComponent(row.guest_token)}` : null;

  if (passLink && row.guest_token) {
    let qr = '';
    if (QR_KINDS.has(row.kind)) {
      try {
        const dataUrl: string = await QRCode.toDataURL(row.guest_token, { width: 320, margin: 1, color: { dark: '#09090B', light: '#FFFFFF' } });
        attachments.push({ filename: 'guest-pass.png', content: dataUrl.slice(dataUrl.indexOf(',') + 1), content_id: 'a41-pass-qr' });
        qr = '<img src="cid:a41-pass-qr" width="160" height="160" alt="Your QR pass" style="display:block;margin:12px auto 4px;width:160px;height:160px;border:0">';
      } catch {
        // The link below still opens the pass.
      }
    }
    const block =
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0"><tr><td align="center">' +
      '<div style="max-width:420px;margin:0 auto;padding:20px;background:#FFFFFF;border:1px solid #E4E4E7;border-radius:16px;text-align:center;font-family:Arial,Helvetica,sans-serif;color:#18181B">' +
      '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#71717A">Your guest pass</div>' +
      qr +
      `<a href="${escapeHtml(passLink)}" style="display:inline-block;margin-top:10px;font-size:14px;font-weight:bold;color:#8A6A2F;text-decoration:underline">Open your pass</a>` +
      (qr ? '<div style="font-size:11px;color:#71717A;margin-top:6px">Show this QR code at the entrance.</div>' : '') +
      '</div></td></tr></table>';
    html = placeBlock(html, block);
    text = `${text}\n\nYour guest pass: ${passLink}`.trim();
  }

  if (row.with_ics && row.starts_at) {
    const ics = buildIcs(row, passLink);
    attachments.push({ filename: `${row.event_slug || 'event'}.ics`, content: base64(new TextEncoder().encode(ics)) });
  }

  return {
    from: sender(from, row.event_name),
    to: [row.to_email],
    subject: row.subject,
    html,
    text,
    ...(row.reply_to ? { reply_to: row.reply_to } : {}),
    ...(attachments.length ? { attachments } : {}),
  };
}

type Outcome =
  | { kind: 'sent'; id: string }
  | { kind: 'fail'; note: string }
  | { kind: 'retry'; note: string }
  | { kind: 'slow'; note: string }
  | { kind: 'halt'; note: string; pause: number };

async function resendSend(key: string, payload: unknown, idempotencyKey: string): Promise<Outcome> {
  let res: Response;
  try {
    res = await fetch(RESEND, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return { kind: 'retry', note: `network: ${errText(e)}` };
  }
  const data = await res.json().catch(() => null);
  if (res.ok) return { kind: 'sent', id: String(data?.id ?? '') };
  const name = String(data?.name ?? '');
  const note = String(data?.message ?? `HTTP ${res.status}`).slice(0, 200);
  if (res.status === 429) {
    if (name.includes('quota')) return { kind: 'halt', note: `${name}: ${note}`, pause: QUOTA_PAUSE_SECONDS };
    return { kind: 'slow', note };
  }
  if (res.status === 409) {
    // The same key was already used for a send that went through (the body changed since): do not send again.
    if (name === 'invalid_idempotent_request') return { kind: 'sent', id: '' };
    return { kind: 'slow', note };
  }
  if (res.status >= 500) return { kind: 'retry', note: `email service busy (${res.status})` };
  // A bad key, an unverified sender domain or a refused sender affects every email: stop and keep them waiting.
  if (res.status === 401 || res.status === 403 || /\bfrom\b/i.test(note)) {
    return { kind: 'halt', note: `${name || res.status}: ${note}`, pause: PAUSE_SECONDS };
  }
  return { kind: 'fail', note };
}

type Secret = (name: string) => Promise<string | null>;

/** Emails the platform admins that sending has paused (at most once every 6 hours). Never throws. */
async function tellAdmins(admin: SupabaseClient, secret: Secret, reason: string) {
  try {
    const { data: first } = await admin.rpc('a41_svc_hit', { p_key: 'notice:email-paused', p_max: 1, p_window_seconds: 21_600 });
    if (first !== true) return;
    const key = (await secret('a41_RESEND_API_KEY'))?.trim();
    const { data: admins } = await admin.from('a41_platform_admins').select('email');
    const to = (admins ?? []).map((a: { email: string }) => a.email).filter(Boolean);
    if (!key || !to.length) return;
    const from = (await secret('a41_RESEND_FROM'))?.trim() || DEFAULT_FROM;
    await fetch(RESEND, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        subject: 'Email sending is paused',
        text: `Organizers' emails are paused because the email service refused them:\n\n${reason}\n\n` +
          'Waiting emails are kept and go out once this is fixed. Check Admin > WhatsApp & email: ' +
          `${APP}/admin/whatsapp`,
      }),
    });
  } catch {
    // The admin page shows the pause either way.
  }
}

async function run(admin: SupabaseClient, secret: Secret) {
  const out = { busy: false, sent: 0, failed: 0, retrying: 0, halted: '' };
  const { data: begin } = await admin.rpc('a41_svc_email_begin', { p_seconds: LEASE_SECONDS });
  if (!begin?.ok) return { ...out, busy: true };

  let pause = 0;
  try {
    const key = (await secret('a41_RESEND_API_KEY'))?.trim();
    if (!key) {
      out.halted = 'not_configured';
      return out;
    }
    const from = (await secret('a41_RESEND_FROM'))?.trim() || DEFAULT_FROM;
    let last = begin.last_sent_at ? Date.parse(begin.last_sent_at) : 0;
    const t0 = Date.now();
    while (Date.now() - t0 < BUDGET_MS) {
      const { data: rows, error } = await admin.rpc('a41_svc_email_claim', { p_limit: 1 });
      if (error) throw new Error(error.message);
      const row = (rows as Claimed[] | null)?.[0];
      if (!row) break;
      const finish = (outcome: string, note: string | null = null, providerId: string | null = null) =>
        admin.rpc('a41_svc_email_finish', { p_id: row.id, p_outcome: outcome, p_note: note, p_provider_id: providerId });

      let payload: Awaited<ReturnType<typeof buildEmail>>;
      try {
        payload = await buildEmail(row, from);
      } catch (e) {
        out.failed++;
        await finish('failed', `could not build the email: ${errText(e)}`);
        continue;
      }

      const wait = last + GAP_MS - Date.now();
      if (wait > 0) await sleep(wait);
      const r = await resendSend(key, payload, `a41-email-${row.id}`);
      last = Date.now();

      if (r.kind === 'sent') {
        out.sent++;
        await finish('sent', null, r.id || null);
      } else if (r.kind === 'fail') {
        out.failed++;
        await finish('failed', r.note);
      } else if (r.kind === 'retry') {
        out.retrying++;
        await finish('retry', r.note);
      } else if (r.kind === 'slow') {
        await finish('release');
        await sleep(SLOW_DOWN_MS);
      } else {
        out.halted = r.note;
        await finish('hold', r.note);
        pause = r.pause;
        break;
      }
    }
    return out;
  } finally {
    await admin.rpc('a41_svc_email_end', { p_pause_seconds: pause, p_note: pause ? out.halted : null });
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
    if (!auth.user) return json({ error: 'Sign in again to continue.' }, 401);
    const refused = (message: string) => {
      const [status, text] = RPC_ERRORS[message] ?? [400, 'Could not send. Try again.'];
      return json({ error: text }, status);
    };
    const eventId = String(body.eventId ?? '');

    switch (body.action) {
      case 'enqueue': {
        if (!(await secret('a41_RESEND_API_KEY'))?.trim()) {
          return json({ error: 'Email sending is not switched on yet. Ask your dayoneproject.xyz admin.' }, 503);
        }
        const input: unknown[] = Array.isArray(body.messages) ? body.messages : [];
        if (input.length > MAX_PER_CALL) return refused('too_many_messages');
        const messages = input.map((m) => {
          const item = (m ?? {}) as Record<string, unknown>;
          return {
            guestId: String(item.guestId ?? ''),
            subject: String(item.subject ?? ''),
            html: String(item.html ?? ''),
            text: String(item.text ?? ''),
          };
        });
        const batch = typeof body.batchId === 'string' && /^[0-9a-f-]{36}$/i.test(body.batchId) ? body.batchId : null;
        const total = Number.isFinite(Number(body.total)) ? Math.max(0, Math.floor(Number(body.total))) : null;
        const { data, error } = await asCaller.rpc('a41_email_enqueue', {
          p_event: eventId,
          p_label: String(body.label ?? '').trim().slice(0, 80),
          p_kind: String(body.kind ?? 'custom'),
          p_messages: messages,
          p_batch: batch,
          p_total: total,
        });
        if (error) return refused(error.message);
        if (data?.ok !== true) {
          if (data?.reason === 'daily_limit') {
            return json({
              error: data.remaining > 0
                ? `Your organization can send ${data.remaining} more email${data.remaining === 1 ? '' : 's'} today (${data.limit} a day). Send to fewer guests, or try again tomorrow.`
                : `Your organization has sent its ${data.limit} emails for today. Try again tomorrow.`,
              limit: data.limit,
              remaining: data.remaining,
            }, 429);
          }
          // Nothing usable in this part; a broadcast sent in parts carries on with the next one.
          return json({ queued: 0, skipped: data?.skipped ?? input.length, batchId: data?.batch ?? batch, minutes: 0 });
        }
        return json({ queued: data.queued, skipped: data.skipped, batchId: data.batch, minutes: data.minutes, limit: data.limit, remaining: data.remaining });
      }

      case 'cancel': {
        const { data, error } = await asCaller.rpc('a41_email_cancel', { p_event: eventId });
        if (error) return refused(error.message);
        return json(data);
      }

      case 'stats': {
        const { data, error } = await asCaller.rpc('a41_email_stats', { p_event: eventId });
        if (error) return refused(error.message);
        return json(data);
      }

      default:
        return json({ error: 'Unknown action.' }, 400);
    }
  } catch (e) {
    return json({ error: errText(e) }, 500);
  }
});
