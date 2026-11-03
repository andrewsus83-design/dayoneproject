import {
  fillVariables, formatEventDate, formatEventTime, formatGuestNumber, formatOpensAt,
  type BroadcastConfig, type BroadcastKind, type BroadcastTemplate, type EventConfig,
} from './eventStore';
import type { ResolvedTheme } from './eventTheme';
import type { Guest } from './types';

export interface RenderedMessage {
  subject: string;
  heading: string;
  message: string;
  whatsapp: string;
  buttonLabel: string;
  link: string;
  /** Feedback form button, only on the Thank You message when feedback is on. */
  feedback?: { label: string; link: string };
}

export function feedbackLink(slug: string, origin: string, guest?: Pick<Guest, 'qr_code_token'> | null): string {
  const base = `${origin}/events/${slug}/feedback`;
  return guest?.qr_code_token ? `${base}?t=${encodeURIComponent(guest.qr_code_token)}` : base;
}

/**
 * Where each template's button and {link} point. A guest's invitation link is personal (?t=<their pass>) and opens the
 * form they belong to, so their reply lands on their own entry on the list instead of becoming a second guest.
 */
export function broadcastLink(kind: BroadcastKind, slug: string, origin: string, guest?: Pick<Guest, 'qr_code_token' | 'form_id'> | null): string {
  const base = `${origin}/events/${slug}`;
  if (kind === 'invitation') {
    const form = guest?.form_id ? `/${encodeURIComponent(guest.form_id)}` : '';
    return `${base}/invitation${form}${guest?.qr_code_token ? `?t=${encodeURIComponent(guest.qr_code_token)}` : ''}`;
  }
  if (kind === 'thankyou') return `${base}/photowall`;
  return guest?.qr_code_token ? `${base}/pass?t=${encodeURIComponent(guest.qr_code_token)}` : `${base}/pass`;
}

export function renderBroadcast(
  kind: BroadcastKind,
  template: BroadcastTemplate,
  config: EventConfig,
  guest: Guest | null | undefined,
  opts: { origin: string; digits: number; prize?: string },
): RenderedMessage {
  const link = broadcastLink(kind, config.info.slug, opts.origin, guest);
  const fb = config.broadcast.feedback;
  const withFeedback = kind === 'thankyou' && fb.on;
  const fbLink = withFeedback ? feedbackLink(config.info.slug, opts.origin, guest) : '';
  const fill = (text: string) =>
    fillVariables(text, {
      name: guest?.name.split(' ')[0],
      fullname: guest?.name,
      party: guest ? guest.plus_one_count + 1 : 1,
      event: config.info.name,
      date: formatEventDate(config.info.startDate),
      time: formatEventTime(config.info.startTime),
      venue: [config.info.venue, config.info.city].filter(Boolean).join(', '),
      code: guest?.qr_code_token,
      opens: formatOpensAt(config.invitation.opensAt),
      number: formatGuestNumber(guest?.guest_number, opts.digits) || undefined,
    })
      .replaceAll('{link}', link)
      .replaceAll('{feedback}', fbLink)
      .replaceAll('{prize}', opts.prize || 'a prize');
  // Add the feedback link unless the text already places it with {feedback}.
  const whatsapp = withFeedback && !template.whatsapp.includes('{feedback}')
    ? `${fill(template.whatsapp)}\n\n${fb.prompt}: ${fbLink}`
    : fill(template.whatsapp);
  return {
    subject: fill(template.subject),
    heading: fill(template.heading),
    message: fill(template.message),
    whatsapp,
    buttonLabel: template.buttonLabel,
    link,
    feedback: withFeedback ? { label: fb.prompt, link: fbLink } : undefined,
  };
}

/** Digits only, with the country code added to local numbers (0812… → 62812…). */
export function waPhone(phone: string | null | undefined, countryCode: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('0') ? `${countryCode.replace(/\D/g, '') || '62'}${digits.slice(1)}` : digits;
}

export function whatsappHref(phone: string | null | undefined, text: string, countryCode: string): string {
  const to = waPhone(phone, countryCode);
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

/** Plain-text email body: message, main button link, and the feedback link if any. */
export function emailBody(msg: RenderedMessage): string {
  return [msg.message, `${msg.buttonLabel}: ${msg.link}`, msg.feedback ? `${msg.feedback.label}: ${msg.feedback.link}` : '']
    .filter(Boolean)
    .join('\n\n');
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** The event's look, as the email needs it. */
export type EmailLook = Pick<
  ResolvedTheme,
  'bg' | 'card' | 'border' | 'text' | 'muted' | 'subtle' | 'primary' | 'primaryText' | 'onPrimary' | 'headingFamily' | 'bodyFamily' | 'radius' | 'buttonRadius'
>;

/**
 * The HTML email sent from the server: the event's colors and fonts, the image (only when it is a public web
 * address), heading, message and buttons. The server puts the guest's pass at the a41:pass marker.
 */
export function emailHtml(msg: RenderedMessage, theme: EmailLook, opts: { eventName: string; imageUrl?: string }): string {
  // Colors and fonts go into style attributes: escape them like any other text.
  const look = Object.fromEntries(
    Object.entries(theme).map(([k, v]) => [k, typeof v === 'string' ? esc(v) : Number(v) || 0]),
  ) as unknown as EmailLook;
  const image = opts.imageUrl && /^https:\/\//i.test(opts.imageUrl) ? opts.imageUrl : '';
  const body = esc(msg.message).replace(/\r?\n/g, '<br>');
  const button = (href: string, label: string, primary: boolean) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 22px;font-family:${look.bodyFamily};font-size:15px;font-weight:bold;text-decoration:none;border-radius:${look.buttonRadius}px;${
      primary ? `background:${look.primary};color:${look.onPrimary};border:1px solid ${look.primary}` : `color:${look.primaryText};border:1px solid ${look.primary}`
    }">${esc(label)}</a>`;
  const buttons = [
    msg.buttonLabel ? button(msg.link, msg.buttonLabel, true) : '',
    msg.feedback ? button(msg.feedback.link, msg.feedback.label, false) : '',
  ].join('');
  return [
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${esc(msg.subject)}</title></head>`,
    `<body style="margin:0;padding:0;background:${look.bg}">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${look.bg}"><tr><td align="center" style="padding:24px 12px">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${look.card};border:1px solid ${look.border};border-radius:${look.radius}px;overflow:hidden">`,
    image ? `<tr><td><img src="${esc(image)}" width="560" alt="" style="display:block;width:100%;max-width:560px;height:auto;border:0"></td></tr>` : '',
    `<tr><td style="padding:28px 28px 8px;font-family:${look.headingFamily};font-size:24px;font-weight:bold;line-height:1.25;color:${look.text}">${esc(msg.heading)}</td></tr>`,
    `<tr><td style="padding:8px 28px 0;font-family:${look.bodyFamily};font-size:15px;line-height:1.6;color:${look.muted}">${body}</td></tr>`,
    `<tr><td style="padding:24px 28px 20px">${buttons}</td></tr>`,
    '</table>',
    '<!--a41:pass-->',
    `<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${look.subtle}">${esc(opts.eventName)} · sent with dayoneproject.xyz</p>`,
    '</td></tr></table></body></html>',
  ].join('');
}

export function emailHref(email: string | null | undefined, subject: string, body: string): string {
  return `mailto:${(email ?? '').replace(/[\s,;?&]/g, '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function markSent(broadcast: BroadcastConfig, kind: BroadcastKind, guestId: string): Partial<BroadcastConfig> {
  const list = broadcast.sent[kind] ?? [];
  if (list.includes(guestId)) return {};
  return { sent: { ...broadcast.sent, [kind]: [...list, guestId] } };
}
