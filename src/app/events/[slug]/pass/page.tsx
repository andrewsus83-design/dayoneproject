'use client';

import { useEventConfigBySlug, useGuests } from '@/lib/eventStore';
import { useSearchParams } from 'next/navigation';
import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { MOCK_EVENT, MOCK_WEDDING_EVENT, MOCK_CORPORATE_NEXUS_EVENT, MOCK_WEDDING_BALI_EVENT, MOCK_POPVERSE_EVENT, MOCK_GUESTS } from '@/lib/mockData';
import { Guest } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { getClientDomain } from '@/lib/domain';
import {
  MapPin,
  Calendar,
  Wifi,
  Camera,
  Gamepad2,
  Gift,
  ArrowLeft,
  CheckCircle2,
  Ticket,
  Sparkles,
  Share2,
} from 'lucide-react';
import QRCode from 'qrcode';

function GuestMobilePassContent({ slug }: { slug: string }) {
  const { event, eventId } = useEventConfigBySlug(slug);
  // ?t=<pass code> comes from the links in Broadcast messages.
  const token = useSearchParams().get('t');
  const guests = useGuests(eventId);
  const [preview] = useState<Guest>(MOCK_GUESTS[0] ?? {
    id: 'guest-preview',
    event_id: event.id,
    name: 'Preview Guest',
    email: 'preview@dayoneproject.xyz',
    phone: null,
    category: 'General',
    table_number: null,
    plus_one_count: 0,
    rsvp_status: 'attending' as const,
    rsvp_notes: null,
    custom_fields: {},
    qr_code_token: 'QR-PREVIEW-0000',
    is_checked_in: false,
    checked_in_at: null,
    checked_in_by: null,
    photos_uploaded_count: 0,
    emails_sent_count: 0,
    whatsapp_sent_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const guest: Guest = token
    ? guests.find((g) => g.qr_code_token === token) ?? { ...preview, id: 'guest-token', name: 'Your pass', table_number: null, qr_code_token: token }
    : preview;
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const clientDomain = getClientDomain(slug);

  useEffect(() => {
    QRCode.toDataURL(guest.qr_code_token, {
      width: 240,
      margin: 1,
      color: {
        dark: '#09090B',
        light: '#FFFFFF',
      },
    }).then(setQrDataUrl);
  }, [guest.qr_code_token]);

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 flex flex-col justify-between max-w-md mx-auto border-x border-premium-borderDark selection:bg-premium-gold selection:text-premium-black font-sans">
      {/* Top Mobile Bar */}
      <header className="h-16 px-5 bg-premium-surfaceDark border-b border-premium-borderDark flex items-center justify-between sticky top-0 z-40">
        <Link
          href={`/events/${slug}`}
          className="w-10 h-10 rounded-full bg-premium-charcoal border border-premium-borderDark text-zinc-400 hover:text-white flex items-center justify-center scale-on-click"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-center">
          <span className="text-xs font-bold text-premium-gold uppercase tracking-widest font-display block">
            Digital VIP Pass
          </span>
          <span className="text-[10px] font-mono text-zinc-400 block">
            {clientDomain}
          </span>
        </div>
        <div className="w-10" />
      </header>

      {/* Main Digital Pass Card (Master UI Kit Ticket Cutout) */}
      <main className="p-5 space-y-6 flex-1 overflow-y-auto hide-scrollbar">
        {/* Ticket Design */}
        <div className="bg-premium-charcoal rounded-[2.5rem] border border-premium-borderDark flex flex-col ticket-cutout shadow-2xl relative overflow-hidden">
          <div className="p-8 flex-1 flex flex-col items-center justify-center text-center border-b-2 border-dashed border-zinc-800">
            <div className="w-16 h-16 rounded-full bg-premium-gold/10 border border-premium-gold/30 flex items-center justify-center text-premium-gold mb-4 shadow-gold">
              <Ticket className="w-8 h-8" />
            </div>

            <span className="px-4 py-1.5 bg-premium-gold/20 text-premium-gold rounded-full text-xs font-bold tracking-wide uppercase border border-premium-gold/30 mb-3">
              VIP Gate Admission
            </span>

            <h3 className="text-2xl font-display font-medium text-white mb-1">
              {guest.name}
            </h3>
            <p className="text-zinc-400 text-sm font-mono">
              {token ? `Table ${guest.table_number || 'to be announced'}` : `Table ${guest.table_number || '04'} • Seat 12`}
            </p>
          </div>

          <div className="p-8 bg-premium-surfaceDark rounded-b-[2.5rem] flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-40 h-40 bg-white rounded-2xl p-2.5 shadow-2xl flex items-center justify-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Gate Pass QR" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-zinc-200 animate-pulse rounded-lg" />
              )}
            </div>

            <div className="font-mono text-xs text-zinc-400 bg-premium-black px-4 py-2 rounded-xl border border-premium-borderDark">
              {guest.qr_code_token}
            </div>

            <p className="text-zinc-500 text-xs">
              Show QR code at venue entrance for sub-second verification
            </p>
          </div>
        </div>

        {/* Venue & Event Wi-Fi Card */}
        <div className="bg-premium-charcoal rounded-[2rem] border border-premium-borderDark p-5 space-y-3 text-xs shadow-lg">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="flex items-center gap-2 text-zinc-400">
              <Calendar className="w-4 h-4 text-premium-gold" />
              <span>Event Date:</span>
            </span>
            <span className="font-semibold text-white">{formatDate(event.start_date)}</span>
          </div>

          <div className="flex items-center justify-between text-zinc-300">
            <span className="flex items-center gap-2 text-zinc-400">
              <MapPin className="w-4 h-4 text-premium-neon" />
              <span>Venue:</span>
            </span>
            <span className="font-semibold text-white truncate max-w-[200px]">{event.location_name}</span>
          </div>

          <div className="flex items-center justify-between text-zinc-300 pt-2 border-t border-premium-borderDark">
            <span className="flex items-center gap-2 text-zinc-400">
              <Wifi className="w-4 h-4 text-premium-success" />
              <span>Ballroom Wi-Fi:</span>
            </span>
            <span className="font-mono text-premium-success font-bold">DAYONE_GUEST / tech2026</span>
          </div>
        </div>

        {/* Quick In-Event Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Link
            href={`/events/${slug}`}
            className="p-3 bg-premium-charcoal rounded-2xl border border-premium-borderDark hover:border-premium-neon text-center flex flex-col items-center justify-center transition-colors scale-on-click"
          >
            <Camera className="w-5 h-5 text-premium-neon mb-1" />
            <span className="text-[11px] font-bold text-white">Live Wall</span>
          </Link>

          <Link
            href={`/events/${slug}/play`}
            className="p-3 bg-premium-charcoal rounded-2xl border border-premium-borderDark hover:border-premium-gold text-center flex flex-col items-center justify-center transition-colors scale-on-click"
          >
            <Gamepad2 className="w-5 h-5 text-premium-gold mb-1" />
            <span className="text-[11px] font-bold text-white">Quiz Pad</span>
          </Link>

          <Link
            href={`/events/${slug}/doorprize`}
            className="p-3 bg-premium-charcoal rounded-2xl border border-premium-borderDark hover:border-premium-danger text-center flex flex-col items-center justify-center transition-colors scale-on-click"
          >
            <Gift className="w-5 h-5 text-premium-danger mb-1" />
            <span className="text-[11px] font-bold text-white">Raffles</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-[11px] text-zinc-500 border-t border-premium-borderDark bg-premium-surfaceDark font-mono">
        dayoneproject.xyz • Verified Cryptographic Token Gate Pass
      </footer>
    </div>
  );
}

function GuestMobilePassWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  return <GuestMobilePassContent slug={unwrappedParams.slug} />;
}

export default function GuestMobilePassPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-zinc-500">Loading VIP pass...</div>}>
      <GuestMobilePassWrapper params={params} />
    </Suspense>
  );
}
