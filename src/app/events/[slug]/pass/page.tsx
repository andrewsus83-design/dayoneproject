'use client';

import { formatGuestNumber, numberDigits, useEventConfigBySlug, useSampleGuests } from '@/lib/eventStore';
import { isServerEventId, passCode, readStoredPass, storePass, useMyPass } from '@/lib/guestsApi';
import { useSearchParams } from 'next/navigation';
import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { MOCK_GUESTS } from '@/lib/mockData';
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
  XCircle,
  RefreshCw,
} from 'lucide-react';
import QRCode from 'qrcode';

/** What the pass card shows, from the server pass or a sample guest. */
interface PassView {
  name: string;
  number: string;
  table: string | null;
  token: string;
  checkedInAt: string | null;
  preview: boolean;
}

function useQr(token: string) {
  const [qr, setQr] = useState<{ token: string; url: string }>({ token: '', url: '' });
  useEffect(() => {
    if (!token) return;
    let alive = true;
    QRCode.toDataURL(token, { width: 320, margin: 1, color: { dark: '#09090B', light: '#FFFFFF' } })
      .then((url) => alive && setQr({ token, url }))
      .catch(() => alive && setQr({ token, url: '' }));
    return () => {
      alive = false;
    };
  }, [token]);
  return qr.token === token ? qr.url : '';
}

function Shell({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 flex flex-col justify-between max-w-md mx-auto border-x border-premium-borderDark selection:bg-premium-gold selection:text-premium-black font-sans">
      <header className="h-16 px-5 bg-premium-surfaceDark border-b border-premium-borderDark flex items-center justify-between sticky top-0 z-40">
        <Link
          href={`/events/${slug}`}
          className="w-10 h-10 rounded-full bg-premium-charcoal border border-premium-borderDark text-zinc-400 hover:text-white flex items-center justify-center scale-on-click"
          aria-label="Event page"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-center">
          <span className="text-xs font-bold text-premium-gold uppercase tracking-widest font-display block">Digital VIP Pass</span>
          <span className="text-[10px] font-mono text-zinc-400 block">{getClientDomain(slug)}</span>
        </div>
        <div className="w-10" />
      </header>
      <main className="p-5 space-y-6 flex-1 overflow-y-auto hide-scrollbar">{children}</main>
      <footer className="p-4 text-center text-[11px] text-zinc-500 border-t border-premium-borderDark bg-premium-surfaceDark font-mono">
        dayoneproject.xyz • Show this QR code at the entrance
      </footer>
    </div>
  );
}

function Notice({ title, children, tone = 'gold' }: { title: string; children: React.ReactNode; tone?: 'gold' | 'danger' }) {
  return (
    <div className="bg-premium-charcoal rounded-[2.5rem] border border-premium-borderDark p-8 text-center space-y-4 shadow-2xl">
      <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center border ${tone === 'danger' ? 'bg-premium-danger/10 border-premium-danger/30 text-premium-danger' : 'bg-premium-gold/10 border-premium-gold/30 text-premium-gold'}`}>
        {tone === 'danger' ? <XCircle className="w-7 h-7" /> : <Ticket className="w-7 h-7" />}
      </div>
      <h2 className="text-xl font-display font-bold text-white">{title}</h2>
      {children}
    </div>
  );
}

function PassCard({ view }: { view: PassView }) {
  const qr = useQr(view.token);
  const checkedIn = !!view.checkedInAt;
  return (
    <div className="bg-premium-charcoal rounded-[2.5rem] border border-premium-borderDark flex flex-col ticket-cutout shadow-2xl relative overflow-hidden">
      <div className="p-8 flex-1 flex flex-col items-center justify-center text-center border-b-2 border-dashed border-zinc-800">
        <div className="w-16 h-16 rounded-full bg-premium-gold/10 border border-premium-gold/30 flex items-center justify-center text-premium-gold mb-4 shadow-gold">
          <Ticket className="w-8 h-8" />
        </div>

        {checkedIn ? (
          <span className="px-4 py-1.5 bg-premium-success/15 text-premium-success rounded-full text-xs font-bold tracking-wide uppercase border border-premium-success/30 mb-3 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-premium-success animate-pulse" /> Checked in
          </span>
        ) : (
          <span className="px-4 py-1.5 bg-premium-gold/20 text-premium-gold rounded-full text-xs font-bold tracking-wide uppercase border border-premium-gold/30 mb-3">
            VIP Gate Admission
          </span>
        )}

        <h3 className="text-2xl font-display font-medium text-white mb-1">{view.name}</h3>
        <p className="text-zinc-400 text-sm font-mono">
          {view.number && <span className="text-premium-gold font-bold">No. {view.number} • </span>}
          {view.preview ? `Table ${view.table || '04'} • Seat 12` : `Table ${view.table || 'to be announced'}`}
        </p>
      </div>

      <div className="p-8 bg-premium-surfaceDark rounded-b-[2.5rem] flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-40 h-40 bg-white rounded-2xl p-2.5 shadow-2xl flex items-center justify-center">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="Gate Pass QR" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full bg-zinc-200 animate-pulse rounded-lg" />
          )}
        </div>

        <div className="font-mono text-xs text-zinc-400 bg-premium-black px-4 py-2 rounded-xl border border-premium-borderDark tracking-widest">
          {passCode(view.token)}
        </div>

        <p className="text-zinc-500 text-xs">
          {checkedIn
            ? `Welcome! Checked in at ${new Date(view.checkedInAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Games and the photo wall are open to you.`
            : 'Show QR code at venue entrance for sub-second verification'}
        </p>
      </div>
    </div>
  );
}

function GuestMobilePassContent({ slug }: { slug: string }) {
  const { event, eventId, config } = useEventConfigBySlug(slug);
  // ?t=<pass token> comes from the links in Broadcast messages; without it the pass saved on this phone shows.
  const linkToken = useSearchParams().get('t');
  const sample = !isServerEventId(eventId);
  const mine = useMyPass(slug, { token: sample ? null : linkToken, pollMs: sample ? 0 : 15_000 });
  const sampleGuests = useSampleGuests(eventId);

  // A pass link opened on this phone becomes this phone's pass (for trivia and the photo wall).
  const openedToken = !sample && linkToken && mine.status === 'ready' ? mine.pass?.token ?? null : null;
  useEffect(() => {
    if (openedToken && readStoredPass(slug) !== openedToken) storePass(slug, openedToken);
  }, [openedToken, slug]);

  let body: React.ReactNode;
  if (sample) {
    const preview: Guest = MOCK_GUESTS[0];
    const found = linkToken ? sampleGuests.find((g) => g.qr_code_token === linkToken) : undefined;
    const guest = found ?? (linkToken ? { ...preview, name: 'Your pass', table_number: null, qr_code_token: linkToken, is_checked_in: false, checked_in_at: null } : preview);
    body = (
      <PassCard
        view={{
          name: guest.name,
          number: formatGuestNumber(guest.guest_number, numberDigits(sampleGuests, config.info.capacity)),
          table: guest.table_number,
          token: guest.qr_code_token,
          checkedInAt: guest.checked_in_at,
          preview: !linkToken,
        }}
      />
    );
  } else if (mine.status === 'ready' && mine.pass) {
    const p = mine.pass;
    body = (
      <PassCard
        view={{
          name: p.guest.name,
          number: formatGuestNumber(p.guest.guest_number, Math.max(3, String(config.info.capacity || 0).length)),
          table: p.guest.table_no,
          token: p.token,
          checkedInAt: p.checked_in_at,
          preview: false,
        }}
      />
    );
  } else if (mine.status === 'none') {
    body = (
      <Notice title="No pass on this phone yet">
        <p className="text-sm text-zinc-400 leading-relaxed">Reply to the invitation to get your QR pass, or open the pass link you were sent.</p>
        <Link href={`/events/${slug}/invitation`} className="inline-flex px-5 py-3 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click">
          Open the invitation
        </Link>
      </Notice>
    );
  } else if (mine.status === 'missing') {
    body = (
      <Notice title="Pass not found" tone="danger">
        <p className="text-sm text-zinc-400 leading-relaxed">This pass is not on the guest list of {event.name}. Check the link you were sent, or reply to the invitation again.</p>
        <Link href={`/events/${slug}/invitation`} className="inline-flex px-5 py-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white font-bold text-sm scale-on-click">
          Open the invitation
        </Link>
      </Notice>
    );
  } else if (mine.status === 'error') {
    body = (
      <Notice title="We couldn't load your pass" tone="danger">
        <p className="text-sm text-zinc-400">Check your internet connection and try again.</p>
        <button type="button" onClick={() => void mine.refresh()} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click">
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      </Notice>
    );
  } else {
    body = <div className="h-[460px] rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark animate-pulse" aria-label="Loading your pass" />;
  }

  return (
    <Shell slug={slug}>
      {body}

      {/* Venue card */}
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

        {sample && (
          <div className="flex items-center justify-between text-zinc-300 pt-2 border-t border-premium-borderDark">
            <span className="flex items-center gap-2 text-zinc-400">
              <Wifi className="w-4 h-4 text-premium-success" />
              <span>Ballroom Wi-Fi:</span>
            </span>
            <span className="font-mono text-premium-success font-bold">DAYONE_GUEST / tech2026</span>
          </div>
        )}
      </div>

      {/* Quick In-Event Actions */}
      <div className="grid grid-cols-3 gap-2">
        <Link
          href={`/events/${slug}/photowall`}
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
          <span className="text-[11px] font-bold text-white">Trivia</span>
        </Link>

        <Link
          href={`/events/${slug}/doorprize`}
          className="p-3 bg-premium-charcoal rounded-2xl border border-premium-borderDark hover:border-premium-danger text-center flex flex-col items-center justify-center transition-colors scale-on-click"
        >
          <Gift className="w-5 h-5 text-premium-danger mb-1" />
          <span className="text-[11px] font-bold text-white">Raffles</span>
        </Link>
      </div>

      {!sample && mine.status === 'ready' && mine.checkedIn && (
        <p className="text-center text-[11px] text-premium-success font-bold flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> You&apos;re in. Enjoy the event!
        </p>
      )}
    </Shell>
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
