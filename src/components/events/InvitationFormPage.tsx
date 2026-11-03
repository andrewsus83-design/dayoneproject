'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  addResponse, findForm, readGuests, todayIso, useAssetUrl, useEventConfigBySlug, useResponses, useSampleGuests, writeGuests,
  formatEventDate, nextGuestNumber, numberDigits,
  type FormResponse,
} from '@/lib/eventStore';
import {
  guestAppPath, isOfflineError, isServerEventId, queueReply, registerGuest, registerGuestOffline, sendQueuedReply, useStoredPasses,
  type RegisterInput, type RegisterResult,
} from '@/lib/guestsApi';
import { resolveFormTheme } from '@/lib/eventTheme';
import { InvitationFormView, type SubmitResult } from '@/components/events/InvitationFormView';
import { EventFonts } from '@/components/events/EventFonts';
import type { Guest } from '@/lib/types';

/** What the guest sees when the server refuses a reply. */
function refusal(res: Extract<RegisterResult, { ok: false }>, maxPerReply: number): SubmitResult {
  switch (res.reason) {
    case 'closed':
      return { ok: false, closedReason: 'Replies are closed.' };
    case 'paused':
      return { ok: false, closedReason: 'The host has paused new replies.' };
    case 'not_open':
      return { ok: false, closedReason: 'Replies are not open yet. Please come back later.' };
    case 'not_found':
      return { ok: false, closedReason: "This event isn't taking replies right now." };
    case 'full':
      return { ok: false, closedReason: 'All seats have been taken.' };
    case 'rate_limited':
      return { ok: false, error: 'Too many replies from here. Please wait a few minutes and try again.' };
    default:
      if (res.field === 'email') return { ok: false, error: 'Please check your email address.' };
      if (res.field === 'phone') return { ok: false, error: 'Please check your phone number.' };
      if (res.field === 'name') return { ok: false, error: 'Please enter your name.' };
      if (res.field === 'party_size') {
        return { ok: false, error: `Up to ${Math.min(maxPerReply || 10, 10)} guests per reply.` };
      }
      return { ok: false, error: 'Your reply could not be saved. Please check your answers.' };
  }
}

/**
 * A public invitation form: the event's first form at /events/<slug>/invitation (formId ''), or one of its other forms
 * at /events/<slug>/invitation/<formId>. Each form gives its own QR pass.
 */
export function InvitationFormPage({ slug, formId }: { slug: string; formId: string }) {
  const { eventId, hydrated, config, event } = useEventConfigBySlug(slug);
  // Saved events take replies on the server; the built-in samples keep them on this device.
  const sample = !isServerEventId(eventId);
  const allResponses = useResponses(sample ? eventId : '');
  const responses = useMemo(() => allResponses.filter((r) => (r.formId ?? '') === formId), [allResponses, formId]);
  const sampleGuests = useSampleGuests(eventId);
  // The pass this phone holds for this form, so sending the form again updates the same guest.
  const heldPass = useStoredPasses(slug)[formId] ?? null;
  // A personal link from the host (?t=<their pass>) tells the server which guest on the list is answering.
  const invite = useSearchParams().get('t')?.trim().slice(0, 80) || null;
  const router = useRouter();
  const [replyNotice, setReplyNotice] = useState<string | null>(null);
  const form = useMemo(() => findForm(config, formId), [config, formId]);
  const inv = form ?? config.invitation;
  const photo = useAssetUrl(inv.photoUrl);
  const heroBlock = config.landing.blocks.find((b) => b.type === 'hero');
  const hero = useAssetUrl(heroBlock && heroBlock.type === 'hero' ? heroBlock.imageUrl : '');
  const coverUrl = photo || hero || event.cover_image_url || '';
  const theme = useMemo(() => resolveFormTheme(config.design, inv.background), [config.design, inv.background]);
  const isWedding = event.event_type === 'wedding';
  const maxPerReply = parseInt(inv.maxPerReply || '0', 10) || 0;

  const closedReason = useMemo(() => {
    if (!hydrated) return null;
    if (!inv.accepting) return 'The host has paused new replies.';
    if (inv.replyBy && todayIso() > inv.replyBy) return `Replies closed on ${formatEventDate(inv.replyBy)}.`;
    // The server counts seats for saved events when the reply is sent.
    const limit = parseInt(inv.guestLimit || '0', 10);
    if (sample && limit > 0) {
      const seated = responses.filter((r) => r.attending).reduce((sum, r) => sum + r.party, 0);
      if (seated >= limit) return 'All seats have been taken.';
    }
    return null;
  }, [hydrated, inv.accepting, inv.replyBy, inv.guestLimit, responses, sample]);

  const notOpenUntil = useMemo(() => {
    if (!hydrated || inv.opensMode !== 'scheduled' || !inv.opensAt) return null;
    return new Date(inv.opensAt).getTime() > Date.now() ? inv.opensAt : null;
  }, [hydrated, inv.opensMode, inv.opensAt]);

  const handleSampleSubmit = (r: FormResponse): SubmitResult => {
    const current = readGuests(eventId);
    const number = r.attending ? nextGuestNumber(current) : undefined;
    const saved = addResponse(eventId, { ...r, number, formId });
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
      form_id: formId,
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

  const handleSubmit = async (r: FormResponse): Promise<SubmitResult> => {
    if (sample) return handleSampleSubmit(r);
    // registerGuest keeps the pass on this phone (d1-pass-<slug>) for the pass page, trivia and the photo wall.
    const input: RegisterInput = {
      name: r.name,
      email: r.email,
      phone: r.phone,
      attending: r.attending,
      partySize: r.party || 1,
      answers: r.answers,
      token: heldPass,
      form: formId,
      invite,
    };
    let res: RegisterResult;
    try {
      res = await registerGuest(slug, input);
    } catch (e) {
      if (!isOfflineError(e)) throw e;
      // No signal: keep the reply on this phone; the effect below sends it once the phone is back online.
      queueReply(slug, input);
      return { ok: true, queued: true };
    }
    if (!res.ok) return refusal(res, maxPerReply);
    if (!res.stored && 'reason' in res) {
      return {
        ok: false,
        error: res.sent === 'email'
          ? "You're already on the guest list. We've emailed your pass to you, so check your inbox."
          : "You're already on the guest list. Open the link the host sent you, or ask the host for your pass.",
      };
    }
    if (!res.stored) return { ok: true };
    return { ok: true, token: res.token, number: res.guest_number, name: res.name };
  };

  // The invitation (and the guest app after it) open even with no signal next time.
  useEffect(() => registerGuestOffline(), []);

  // A reply saved with no signal is sent when the phone is back online (on load, on "online", and every 10 s).
  useEffect(() => {
    if (sample) return;
    let alive = true;
    const send = async () => {
      try {
        const sent = await sendQueuedReply(slug, formId);
        if (!alive || !sent) return;
        const { result, input } = sent;
        if (!result.ok) {
          const refused = refusal(result, maxPerReply);
          setReplyNotice(refused.closedReason ?? refused.error ?? 'Your reply could not be saved. Please send it again.');
        } else if (!result.stored) {
          setReplyNotice("You're already on the guest list. Check your inbox for your pass, or open the link the host sent you.");
        } else if (input.attending) {
          router.replace(guestAppPath(slug));
        } else {
          setReplyNotice('Your reply was sent. Thank you for letting us know.');
        }
      } catch (e) {
        if (alive) setReplyNotice(e instanceof Error ? e.message : 'Your reply could not be saved. Please send it again.');
      }
    };
    void send();
    window.addEventListener('online', send);
    // Nothing is sent when no reply is saved on this phone.
    const timer = window.setInterval(() => void send(), 10_000);
    return () => {
      alive = false;
      window.removeEventListener('online', send);
      window.clearInterval(timer);
    };
  }, [sample, slug, formId, router, maxPerReply]);

  // A guest who is coming goes straight to the guest app, on their QR pass.
  const submitAndOpenApp = async (r: FormResponse): Promise<SubmitResult> => {
    const res = await handleSubmit(r);
    const token = sample ? r.token : res.ok ? res.token : undefined;
    if (res.ok && r.attending && token) router.replace(sample ? `/events/${slug}/pass?t=${encodeURIComponent(token)}` : guestAppPath(slug));
    return res;
  };

  if (!hydrated) {
    return <div className="min-h-screen bg-premium-black flex items-center justify-center text-zinc-500 text-sm">Loading invitation…</div>;
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-premium-black flex items-center justify-center px-6">
        <div className="max-w-sm w-full p-8 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark text-center space-y-4">
          <h1 className="font-display font-bold text-xl text-white">This form isn&apos;t available</h1>
          <p className="text-sm text-zinc-400">The host may have removed it. The event page lists the forms that are open.</p>
          <Link href={`/events/${slug}`} className="inline-flex px-5 py-3 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click">
            Open the event page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <EventFonts href={theme.fontsHref} />
      {replyNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md px-4 py-3 rounded-2xl text-sm font-bold shadow-2xl flex items-start gap-3" style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }} role="status">
          <span className="flex-1">{replyNotice}</span>
          <button type="button" onClick={() => setReplyNotice(null)} className="text-xs underline scale-on-click" style={{ color: theme.subtle }}>OK</button>
        </div>
      )}
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
        onSubmit={submitAndOpenApp}
        numberPad={numberDigits(sample ? sampleGuests : [], config.info.capacity)}
        backHref={`/events/${slug}`}
      />
    </>
  );
}
