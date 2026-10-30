'use client';

import React, { useSyncExternalStore } from 'react';
import { Check, Mail, MessageSquare } from 'lucide-react';
import { numberDigits, useEventConfig, useGuests, type BroadcastKind } from '@/lib/eventStore';
import { emailBody, emailHref, markSent, renderBroadcast, whatsappHref } from '@/lib/broadcast';
import type { Guest } from '@/lib/types';

const noop = () => () => {};
export function useOrigin() {
  return useSyncExternalStore(noop, () => window.location.origin, () => 'https://www.all41.app');
}

/** One-tap WhatsApp / email send of a broadcast template to one guest. Marks the guest as sent. */
export function SendButtons({ eventId, kind, guest, prize, size = 'md' }: { eventId: string; kind: BroadcastKind; guest: Guest; prize?: string; size?: 'sm' | 'md' }) {
  const { config, update } = useEventConfig(eventId);
  const guests = useGuests(eventId);
  const origin = useOrigin();
  const bc = config.broadcast;
  const msg = renderBroadcast(kind, bc.templates[kind], config, guest, { origin, digits: numberDigits(guests, config.info.capacity), prize });
  const sent = (bc.sent[kind] ?? []).includes(guest.id);
  const mark = () => update('broadcast', markSent(bc, kind, guest.id));
  const btn = size === 'sm'
    ? 'px-2 py-1 rounded-lg text-[10px]'
    : 'px-3 py-1.5 rounded-xl text-[11px]';

  return (
    <span className="flex items-center gap-1.5 shrink-0">
      {sent && <span className="text-[10px] font-bold text-premium-success flex items-center gap-0.5" title="Already sent"><Check className="w-3 h-3" /> Sent</span>}
      <a
        href={whatsappHref(guest.phone, msg.whatsapp, bc.countryCode)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={mark}
        title={guest.phone ? `WhatsApp ${guest.phone}` : 'No phone saved: WhatsApp will ask you to pick a contact'}
        className={`${btn} font-bold flex items-center gap-1 scale-on-click border ${guest.phone ? 'border-premium-success/40 text-premium-success hover:bg-premium-success/10' : 'border-premium-borderDark text-zinc-500 hover:text-white'}`}
      >
        <MessageSquare className="w-3 h-3" /> WhatsApp
      </a>
      {guest.email ? (
        <a
          href={emailHref(guest.email, msg.subject, emailBody(msg))}
          onClick={mark}
          title={`Email ${guest.email}`}
          className={`${btn} font-bold flex items-center gap-1 scale-on-click border border-premium-gold/40 text-premium-gold hover:bg-premium-gold/10`}
        >
          <Mail className="w-3 h-3" /> Email
        </a>
      ) : (
        <span className={`${btn} font-bold flex items-center gap-1 border border-premium-borderDark text-zinc-600 cursor-not-allowed`} title="No email saved for this guest">
          <Mail className="w-3 h-3" /> Email
        </span>
      )}
    </span>
  );
}
