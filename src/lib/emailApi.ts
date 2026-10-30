'use client';

import { createClient } from '@/lib/supabase/client';
import type { EnqueueResult, SendStats, WaRecent } from '@/lib/whatsappApi';

export type EmailStats = SendStats;

/** One email per guest, rendered from the template the organizer edited. The server adds the address. */
export interface EmailItem {
  guestId: string;
  subject: string;
  html: string;
  text: string;
}

export type EmailKind = 'invitation' | 'pass' | 'reminder' | 'thankyou' | 'winner' | 'custom';

/** Emails go out about 2 a second. */
export const EMAIL_PER_MINUTE = 120;
/** Emails per request: big broadcasts go up in parts. */
const PART = 200;

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await createClient().functions.invoke('a41-email', { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const detail = ctx ? await ctx.json().catch(() => null) : null;
    throw new Error(detail?.error ?? error.message);
  }
  return data as T;
}

export const emailApi = {
  /** Queues one email per guest; the server sends them in the background. */
  enqueue: async (eventId: string, label: string, kind: EmailKind, messages: EmailItem[]): Promise<EnqueueResult> => {
    let batchId: string | null = null;
    const total: EnqueueResult = { queued: 0, skipped: 0, minutes: 0 };
    for (let i = 0; i < messages.length; i += PART) {
      let r: EnqueueResult & { batchId?: string | null };
      try {
        r = await call<EnqueueResult & { batchId?: string | null }>({
          action: 'enqueue', eventId, label, kind, batchId,
          // The first part checks the whole broadcast against the daily limit.
          total: i === 0 ? messages.length : undefined,
          messages: messages.slice(i, i + PART),
        });
      } catch (e) {
        if (!total.queued) throw e;
        const reason = e instanceof Error ? e.message : 'Could not queue the rest.';
        throw new Error(`${total.queued} email${total.queued === 1 ? ' was' : 's were'} queued, then this stopped: ${reason}`);
      }
      batchId = r.batchId ?? batchId;
      total.queued += r.queued;
      total.skipped += r.skipped;
      total.minutes = Math.max(total.minutes, r.minutes);
      if (r.limit !== undefined) total.limit = r.limit;
      if (r.remaining !== undefined) total.remaining = r.remaining;
    }
    if (!total.queued) throw new Error('None of these guests has an email address in this event’s guest list.');
    return total;
  },
  cancel: (eventId: string) => call<{ cancelled: number }>({ action: 'cancel', eventId }),
  stats: async (eventId: string): Promise<EmailStats | null> => {
    const { data, error } = await createClient().rpc('a41_email_stats', { p_event: eventId });
    if (error) throw new Error(error.message);
    return data as EmailStats | null;
  },
};

/* ── Platform admin: daily limits and both queues ── */

export interface ChannelUsage {
  /** Queued in the last 24 hours (what the limit counts). */
  used: number;
  sent: number;
  waiting: number;
  failed: number;
  limit: number;
}

export interface OrgUsage {
  id: string;
  name: string;
  owner: string | null;
  whatsapp: ChannelUsage;
  email: ChannelUsage;
}

export type EmailRecent = Omit<WaRecent, 'phone_end'> & { email_hint: string };

export interface SendOverview {
  defaultLimit: number;
  orgs: OrgUsage[];
  email: {
    waiting: number;
    sentToday: number;
    failedToday: number;
    pausedUntil: string | null;
    note: string | null;
    lastSentAt: string | null;
    recent: EmailRecent[];
  };
}

export const sendAdminApi = {
  overview: async (): Promise<SendOverview> => {
    const { data, error } = await createClient().rpc('a41_admin_send_overview');
    if (error) throw new Error(error.message === 'forbidden' ? 'Only the platform admin can see this.' : error.message);
    return data as SendOverview;
  },
  /** Sets an organization's daily limits; leave one out to keep it. */
  setLimits: async (orgId: string, limits: { whatsapp?: number; email?: number }) => {
    const { data, error } = await createClient().rpc('a41_admin_set_send_limits', {
      p_org: orgId, p_whatsapp: limits.whatsapp ?? null, p_email: limits.email ?? null,
    });
    if (error) throw new Error(error.details || error.message);
    return data as { whatsapp: number; email: number };
  },
};
