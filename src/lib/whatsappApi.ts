'use client';

import { createClient } from '@/lib/supabase/client';

/** Progress of one event's WhatsApp broadcasts (all batches together). */
export interface WaStats {
  waiting: number;
  sent: number;
  failed: number;
  cancelled: number;
  lastSentAt: string | null;
  /** Why sending is paused (number offline, no quota…), when it is. */
  held: string | null;
  lastFailure: string | null;
  /** Messages from every organization that go out before this event's last one. */
  ahead: number | null;
}

export interface WaDevice {
  ok: boolean;
  number?: string;
  name?: string;
  connected?: boolean;
  quota?: number | string | null;
  package?: string;
  expires?: string;
  reason?: string;
}

export interface WaRecent {
  id: number;
  event: string;
  label: string;
  to_name: string;
  phone_end: string;
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled';
  error: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface WaOverview {
  waiting: number;
  sentToday: number;
  failedToday: number;
  pausedUntil: string | null;
  note: string | null;
  lastSentAt: string | null;
  recent: WaRecent[];
}

/** Messages go out one at a time, 5–15 s apart: about 6 a minute. */
export const WA_PER_MINUTE = 6;

/** Calls the a41-whatsapp edge function as the signed-in user. */
async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await createClient().functions.invoke('a41-whatsapp', { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const detail = ctx ? await ctx.json().catch(() => null) : null;
    throw new Error(detail?.error ?? error.message);
  }
  return data as T;
}

export const whatsappApi = {
  /** Queues one message per guest; the server sends them in the background. */
  enqueue: (eventId: string, label: string, messages: { phone: string; name: string; text: string }[]) =>
    call<{ queued: number; skipped: number; minutes: number }>({ action: 'enqueue', eventId, label, messages }),
  cancel: (eventId: string) => call<{ cancelled: number }>({ action: 'cancel', eventId }),
  stats: async (eventId: string): Promise<WaStats | null> => {
    const { data, error } = await createClient().rpc('a41_wa_stats', { p_event: eventId });
    if (error) throw new Error(error.message);
    return data as WaStats | null;
  },
  /** Platform admin only. */
  device: () => call<{ configured: boolean; device: WaDevice | null; overview: WaOverview }>({ action: 'device' }),
  test: (phone: string) => call<{ ok: true }>({ action: 'test', phone }),
  runNow: () => call<{ busy: boolean; sent: number; failed: number; retrying: number; halted: string }>({ action: 'run' }),
};
