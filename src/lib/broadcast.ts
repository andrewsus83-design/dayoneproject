import {
  fillVariables, formatEventDate, formatEventTime, formatGuestNumber, formatOpensAt,
  type BroadcastConfig, type BroadcastKind, type BroadcastTemplate, type EventConfig,
} from './eventStore';
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

/** Where each template's button and {link} point. */
export function broadcastLink(kind: BroadcastKind, slug: string, origin: string, guest?: Pick<Guest, 'qr_code_token'> | null): string {
  const base = `${origin}/events/${slug}`;
  if (kind === 'invitation') return `${base}/invitation`;
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

export function emailHref(email: string | null | undefined, subject: string, body: string): string {
  return `mailto:${(email ?? '').replace(/[\s,;?&]/g, '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function markSent(broadcast: BroadcastConfig, kind: BroadcastKind, guestId: string): Partial<BroadcastConfig> {
  const list = broadcast.sent[kind] ?? [];
  if (list.includes(guestId)) return {};
  return { sent: { ...broadcast.sent, [kind]: [...list, guestId] } };
}
