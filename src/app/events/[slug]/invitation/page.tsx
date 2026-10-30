'use client';

import React, { use, Suspense, useMemo } from 'react';
import {
  addResponse, readGuests, useAssetUrl, useEventConfigBySlug, useGuests, useResponses, writeGuests, formatEventDate,
  nextGuestNumber, numberDigits,
  type FormResponse,
} from '@/lib/eventStore';
import { resolveInvitationTheme } from '@/lib/eventTheme';
import { InvitationFormView } from '@/components/events/InvitationFormView';
import { EventFonts } from '@/components/events/EventFonts';
import type { Guest } from '@/lib/types';

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function InvitationContent({ slug }: { slug: string }) {
  const { eventId, hydrated, config, event } = useEventConfigBySlug(slug);
  const responses = useResponses(eventId);
  const guests = useGuests(eventId);
  const inv = config.invitation;
  const photo = useAssetUrl(inv.photoUrl);
  const heroBlock = config.landing.blocks.find((b) => b.type === 'hero');
  const hero = useAssetUrl(heroBlock && heroBlock.type === 'hero' ? heroBlock.imageUrl : '');
  const coverUrl = photo || hero || event.cover_image_url || '';
  const theme = useMemo(() => resolveInvitationTheme(config.design, inv.theme), [config.design, inv.theme]);
  const isWedding = event.event_type === 'wedding';

  const closedReason = useMemo(() => {
    if (!hydrated) return null;
    if (!inv.accepting) return 'The host has paused new replies.';
    if (inv.replyBy && todayIso() > inv.replyBy) return `Replies closed on ${formatEventDate(inv.replyBy)}.`;
    const limit = parseInt(inv.guestLimit || '0', 10);
    if (limit > 0) {
      const seated = responses.filter((r) => r.attending).reduce((sum, r) => sum + r.party, 0);
      if (seated >= limit) return 'All seats have been taken.';
    }
    return null;
  }, [hydrated, inv.accepting, inv.replyBy, inv.guestLimit, responses]);

  const notOpenUntil = useMemo(() => {
    if (!hydrated || inv.opensMode !== 'scheduled' || !inv.opensAt) return null;
    return new Date(inv.opensAt).getTime() > Date.now() ? inv.opensAt : null;
  }, [hydrated, inv.opensMode, inv.opensAt]);

  const handleSubmit = (r: FormResponse) => {
    const current = readGuests(eventId);
    const number = r.attending ? nextGuestNumber(current) : undefined;
    const saved = addResponse(eventId, { ...r, number });
    if (!saved.ok || !r.attending) return saved;
    const now = new Date().toISOString();
    const guest: Guest = {
      id: r.id,
      event_id: eventId,
      name: r.name,
      email: r.email || null,
      phone: r.phone || null,
      category: isWedding ? 'Guest' : 'Delegate',
      table_number: null,
      plus_one_count: Math.max(0, r.party - 1),
      rsvp_status: 'attending',
      rsvp_notes: null,
      custom_fields: r.answers,
      qr_code_token: r.token,
      guest_number: number,
      is_checked_in: false,
      checked_in_at: null,
      checked_in_by: null,
      photos_uploaded_count: 0,
      emails_sent_count: 0,
      whatsapp_sent_count: 0,
      created_at: now,
      updated_at: now,
    };
    writeGuests(eventId, [...current, guest]);
    return { ...saved, number };
  };

  if (!hydrated) {
    return <div className="min-h-screen bg-premium-black flex items-center justify-center text-zinc-500 text-sm">Loading invitation…</div>;
  }

  return (
    <>
      <EventFonts href={theme.fontsHref} />
      <InvitationFormView
        info={config.info}
        invitation={inv}
        theme={theme}
        coverUrl={coverUrl}
        isWedding={isWedding}
        logoRef={config.design.logoUrl}
        logoSize={config.design.logoSize}
        closedReason={closedReason}
        notOpenUntil={notOpenUntil}
        onSubmit={handleSubmit}
        numberPad={numberDigits(guests, config.info.capacity)}
        backHref={`/events/${slug}`}
      />
    </>
  );
}

function InvitationWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <InvitationContent slug={slug} />;
}

export default function InvitationPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-premium-black flex items-center justify-center text-zinc-500 text-sm">Loading…</div>}>
      <InvitationWrapper params={params} />
    </Suspense>
  );
}
