'use client';

import { formatEventDate, formatEventTime, formatGuestNumber, numberDigits, useEventConfigBySlug, useHydrated, useSampleGuests } from '@/lib/eventStore';
import { forgetPass, isServerEventId, passCode, readStoredPass, registerGuestOffline, storePass, useMyPass, type GuestTab } from '@/lib/guestsApi';
import { publicWinnerLabel, usePublicDoorPrizes, type ServerWinner } from '@/lib/doorPrizeApi';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { MOCK_GUESTS } from '@/lib/mockData';
import { Guest } from '@/lib/types';
import { getClientDomain } from '@/lib/domain';
import { GuestShot } from '@/components/events/GuestShot';
import { paletteColors } from '@/lib/eventTheme';
import {
  MapPin,
  Calendar,
  Clock,
  Camera,
  Gamepad2,
  Gift,
  QrCode,
  Settings,
  CheckCircle2,
  Ticket,
  XCircle,
  RefreshCw,
  Lock,
  ChevronRight,
  ExternalLink,
  Star,
  Smartphone,
  LogOut,
  Trophy,
  Globe,
} from 'lucide-react';
import QRCode from 'qrcode';
import { BrandMark } from '@/components/BrandMark';

/*
 * The guest app (PWA) a guest lands in after registering: Event · Activity · QR · Prize · Setting, with the QR pass
 * open first. Once the guest's QR has been scanned at the door, Activity (trivia, photo wall) and Prize open and the
 * centre QR becomes Shot, the camera for the photo wall and social media (the pass moves to Setting).
 */

const TABS: GuestTab[] = ['event', 'activity', 'qr', 'shot', 'prize', 'setting'];

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
  // The check-in time is in the phone's time zone, which the server render does not know.
  const hydrated = useHydrated();
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
        <div className="w-48 h-48 bg-white rounded-2xl p-3 shadow-2xl flex items-center justify-center">
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
            ? `Welcome! Checked in${hydrated ? ` at ${new Date(view.checkedInAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}. Activity, Prize and Shot are open to you.`
            : 'Show this QR code at the entrance. Activity and Prize open once it is scanned.'}
        </p>
      </div>
    </div>
  );
}

/** Shown on Activity and Prize until the guest's QR has been scanned at the door. */
function Locked({ title, onShowQr }: { title: string; onShowQr: () => void }) {
  return (
    <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark text-center space-y-4">
      <div className="w-14 h-14 mx-auto rounded-full bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 flex items-center justify-center">
        <Lock className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-display font-bold text-white">{title}</h2>
      <p className="text-sm text-zinc-400 leading-relaxed">Show your QR pass at the entrance. This opens here by itself as soon as you are checked in.</p>
      <button
        type="button"
        onClick={onShowQr}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click"
      >
        <QrCode className="w-4 h-4" /> Show my QR
      </button>
    </div>
  );
}

function LinkCard({ href, icon: Icon, tone, title, desc }: { href: string; icon: typeof Camera; tone: string; title: string; desc: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark hover:border-zinc-600 scale-on-click transition-colors">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border ${tone}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-white">{title}</div>
        <div className="text-[11px] text-zinc-500 mt-0.5">{desc}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
    </Link>
  );
}

function PrizeList({ slug, live, items }: { slug: string; live: boolean; items: { id: string; name: string; prize: string; quantity: number }[] }) {
  const { data } = usePublicDoorPrizes(slug, live, 5000);
  const prizes = data?.prizes.length
    ? data.prizes.map((p) => ({ id: p.config_id ?? p.name, name: p.name, prize: p.prize ?? '', quantity: p.quantity, winners: p.winners }))
    : items.map((d) => ({ id: d.id, name: d.name, prize: d.prize, quantity: d.quantity, winners: [] as ServerWinner[] }));

  if (prizes.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-center">
        <Gift className="w-8 h-8 text-premium-gold mx-auto mb-2" />
        <div className="text-[13px] font-medium text-zinc-300">Door prizes are announced on stage</div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {prizes.map((p) => (
        <div key={p.id} className="p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark space-y-2">
          <div className="flex items-start gap-3">
            <Gift className="w-5 h-5 text-premium-gold flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-premium-gold">{p.name}</div>
              <div className="text-[14px] font-bold text-white">{p.prize || p.name}</div>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 flex-shrink-0">×{p.quantity}</span>
          </div>
          {p.winners.length > 0 && (
            <div className="pt-2 border-t border-premium-borderDark space-y-1.5">
              {p.winners.map((w) => (
                <div key={w.id} className="flex items-center gap-2 text-[12px]">
                  <Trophy className="w-3.5 h-3.5 text-premium-gold flex-shrink-0" />
                  <span className="text-white font-semibold truncate">{publicWinnerLabel(w)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function GuestAppContent({ slug }: { slug: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { event, eventId, config } = useEventConfigBySlug(slug);
  const info = config.info;
  // ?t=<pass token> comes from the links in Broadcast messages; without it the pass saved on this phone shows.
  const linkToken = params.get('t');
  const sample = !isServerEventId(eventId);
  const mine = useMyPass(slug, { token: sample ? null : linkToken, pollMs: sample ? 0 : 10_000 });
  const sampleGuests = useSampleGuests(eventId);

  const requested = params.get('tab') as GuestTab | null;
  const [tab, setTabState] = useState<GuestTab>(requested && TABS.includes(requested) ? requested : 'qr');
  const [showPass, setShowPass] = useState(false);
  const setTab = (next: GuestTab) => {
    setTabState(next);
    const q = new URLSearchParams(params.toString());
    if (next === 'qr' || next === 'shot') q.delete('tab');
    else q.set('tab', next);
    const qs = q.toString();
    router.replace(qs ? `?${qs}` : `/events/${slug}/pass`, { scroll: false });
  };

  // Next time, the guest app opens even with no signal.
  useEffect(() => registerGuestOffline(), []);

  // A pass link opened on this phone becomes this phone's pass (for trivia and the photo wall).
  const openedToken = !sample && linkToken && mine.status === 'ready' ? mine.pass?.token ?? null : null;
  useEffect(() => {
    if (openedToken && readStoredPass(slug) !== openedToken) storePass(slug, openedToken);
  }, [openedToken, slug]);

  let view: PassView | null = null;
  let qrBody: React.ReactNode;
  if (sample) {
    const preview: Guest = MOCK_GUESTS[0];
    const found = linkToken ? sampleGuests.find((g) => g.qr_code_token === linkToken) : undefined;
    const guest = found ?? (linkToken ? { ...preview, name: 'Your pass', table_number: null, qr_code_token: linkToken, is_checked_in: false, checked_in_at: null } : preview);
    view = {
      name: guest.name,
      number: formatGuestNumber(guest.guest_number, numberDigits(sampleGuests, info.capacity)),
      table: guest.table_number,
      token: guest.qr_code_token,
      checkedInAt: guest.checked_in_at,
      preview: !linkToken,
    };
  } else if (mine.status === 'ready' && mine.pass) {
    const p = mine.pass;
    view = {
      name: p.guest.name,
      number: formatGuestNumber(p.guest.guest_number, Math.max(3, String(info.capacity || 0).length)),
      table: p.guest.table_no,
      token: p.token,
      checkedInAt: p.checked_in_at,
      preview: false,
    };
  } else if (mine.status === 'none') {
    qrBody = (
      <Notice title="No pass on this phone yet">
        <p className="text-sm text-zinc-400 leading-relaxed">Reply to the invitation to get your QR pass, or open the pass link you were sent.</p>
        <Link href={`/events/${slug}/invitation`} className="inline-flex px-5 py-3 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click">
          Open the invitation
        </Link>
      </Notice>
    );
  } else if (mine.status === 'missing') {
    qrBody = (
      <Notice title="Pass not found" tone="danger">
        <p className="text-sm text-zinc-400 leading-relaxed">This pass is not on the guest list of {event.name}. Check the link you were sent, or reply to the invitation again.</p>
        <Link href={`/events/${slug}/invitation`} className="inline-flex px-5 py-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white font-bold text-sm scale-on-click">
          Open the invitation
        </Link>
      </Notice>
    );
  } else if (mine.status === 'error') {
    qrBody = (
      <Notice title="We couldn't load your pass" tone="danger">
        <p className="text-sm text-zinc-400">Check your internet connection and try again.</p>
        <button type="button" onClick={() => void mine.refresh()} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click">
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      </Notice>
    );
  } else {
    qrBody = <div className="h-[460px] rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark animate-pulse" aria-label="Loading your pass" />;
  }
  if (view) qrBody = <PassCard view={view} />;

  const checkedIn = !!view?.checkedInAt;
  // The centre tab: the QR pass until the guest is checked in, then Shot.
  const center: GuestTab = checkedIn ? 'shot' : 'qr';
  const shown: GuestTab = tab === 'qr' || tab === 'shot' ? center : tab;
  const mapsUrl = info.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([info.venue, info.address, info.city].filter(Boolean).join(' '))}`;
  const time = [info.startTime && formatEventTime(info.startTime), info.endTime && formatEventTime(info.endTime)].filter(Boolean).join(' – ');

  const forget = () => {
    if (!confirm('Remove this pass from this phone? You can open it again from the link you were sent.')) return;
    forgetPass(slug);
    setTab('qr');
  };

  const NAV: { id: GuestTab; icon: typeof QrCode; label: string; central?: boolean; locked?: boolean }[] = [
    { id: 'event', icon: Calendar, label: 'Event' },
    { id: 'activity', icon: Gamepad2, label: 'Activity', locked: !checkedIn },
    { id: center, icon: checkedIn ? Camera : QrCode, label: checkedIn ? 'Shot' : 'QR', central: true },
    { id: 'prize', icon: Gift, label: 'Prize', locked: !checkedIn },
    { id: 'setting', icon: Settings, label: 'Setting' },
  ];

  return (
    <div className="guest-app min-h-screen bg-premium-black text-zinc-100 flex justify-center font-sans selection:bg-premium-gold selection:text-premium-black">
      <div className="w-full max-w-[420px] min-h-screen bg-premium-black relative flex flex-col sm:border-x sm:border-premium-borderDark">
        {/* Top app bar */}
        <header className="px-5 pt-6 pb-4 flex justify-between items-center gap-3 bg-premium-black/90 backdrop-blur border-b border-premium-borderDark sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark size={40} />
            <div className="min-w-0">
              <p className="text-premium-gold text-[9px] font-mono font-bold uppercase tracking-[0.2em] leading-none mb-1 truncate">{getClientDomain(slug)}</p>
              <h1 className="font-display font-bold text-base text-white leading-tight truncate">{info.name || event.name}</h1>
            </div>
          </div>
          {checkedIn && (
            <span className="flex-shrink-0 flex items-center gap-1.5 text-[10px] font-bold text-premium-success bg-premium-success/10 border border-premium-success/25 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-premium-success animate-pulse" /> Checked in
            </span>
          )}
        </header>

        <main className="flex-1 px-5 py-5 pb-32 space-y-5">
          {/* ── QR (until check-in) ── */}
          {shown === 'qr' && qrBody}

          {/* ── Shot (after check-in) ── */}
          {shown === 'shot' && (
            <GuestShot
              slug={slug}
              token={sample ? null : mine.token}
              eventName={info.name || event.name}
              dateLabel={info.startDate ? formatEventDate(info.startDate, 'short') : ''}
              primary={paletteColors(config.design).primary}
              logoRef={config.design.logoUrl}
              shot={config.design.shot}
              sample={sample}
            />
          )}

          {/* ── Event ── */}
          {shown === 'event' && (
            <>
              <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500">Event details</span>
                <div className="space-y-3 text-[13px]">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-premium-gold flex-shrink-0" />
                    <span className="text-zinc-200 font-medium">{info.startDate ? formatEventDate(info.startDate) : '—'}</span>
                  </div>
                  {time && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-premium-gold flex-shrink-0" />
                      <span className="text-zinc-200 font-medium">{time}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-premium-neon flex-shrink-0 mt-0.5" />
                    <span className="text-zinc-200 font-medium">{[info.venue, info.address, info.city].filter(Boolean).join(', ') || '—'}</span>
                  </div>
                </div>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl border border-zinc-700 hover:border-premium-gold text-zinc-300 hover:text-white text-[12px] font-bold transition-colors scale-on-click"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open venue in Maps
                </a>
              </div>

              {info.description && (
                <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500">About</span>
                  <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line">{info.description}</p>
                </div>
              )}

              <LinkCard href={`/events/${slug}`} icon={Globe} tone="bg-premium-gold/10 border-premium-gold/25 text-premium-gold" title="Event highlights" desc="The full event page" />
            </>
          )}

          {/* ── Activity ── */}
          {shown === 'activity' && (checkedIn ? (
            <>
              <div className="flex items-center gap-2 py-3 px-4 rounded-2xl bg-premium-success/10 border border-premium-success/25 text-premium-success text-[12px] font-bold">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> You&apos;re checked in. Games are open.
              </div>
              <LinkCard href={`/events/${slug}/play`} icon={Gamepad2} tone="bg-premium-neon/10 border-premium-neon/25 text-premium-neon" title="Live Trivia" desc="Join with the 6-digit code on the big screen" />
              <LinkCard href={`/events/${slug}/photowall`} icon={Camera} tone="bg-premium-gold/10 border-premium-gold/25 text-premium-gold" title="Photo Wall" desc="Post photos and videos to the big screen" />
            </>
          ) : (
            <Locked title="Games open after check-in" onShowQr={() => setTab('qr')} />
          ))}

          {/* ── Prize ── */}
          {shown === 'prize' && (checkedIn ? (
            <>
              <div className="flex items-center gap-2 py-3 px-4 rounded-2xl bg-premium-success/10 border border-premium-success/25 text-premium-success text-[12px] font-bold">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> You&apos;re in the door prize draw.
              </div>
              <PrizeList slug={slug} live={!sample} items={config.doorprizes.items} />
              <Link
                href={`/events/${slug}/doorprize`}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold shadow-gold scale-on-click text-[13px]"
              >
                <Trophy className="w-4 h-4" /> Watch the draw live
              </Link>
            </>
          ) : (
            <Locked title="Door prizes open after check-in" onShowQr={() => setTab('qr')} />
          ))}

          {/* ── Setting ── */}
          {shown === 'setting' && (
            <>
              {checkedIn && view && (
                showPass ? (
                  <PassCard view={view} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPass(true)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-premium-charcoal border border-premium-gold/30 hover:border-premium-gold/60 scale-on-click text-left"
                  >
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border bg-premium-gold/10 border-premium-gold/25 text-premium-gold">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold text-white">Show my QR pass</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">If the host asks to see it again</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                  </button>
                )
              )}
              {view && (
                <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500">My pass</span>
                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    <div>
                      <div className="text-zinc-500">Name</div>
                      <div className="text-white font-bold truncate">{view.name}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Guest no.</div>
                      <div className="text-premium-gold font-mono font-bold">{view.number || '—'}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Pass code</div>
                      <div className="text-white font-mono">{passCode(view.token)}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Status</div>
                      <div className={checkedIn ? 'text-premium-success font-bold' : 'text-zinc-300 font-bold'}>{checkedIn ? 'Checked in' : 'Not checked in yet'}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-2">
                <div className="flex items-center gap-2 text-[13px] font-bold text-white">
                  <Smartphone className="w-4 h-4 text-premium-neon" /> Add to home screen
                </div>
                <p className="text-[12px] text-zinc-400 leading-relaxed">
                  iPhone: tap Share, then Add to Home Screen. Android: tap the browser menu, then Install app or Add to Home screen. Your pass opens like an app.
                </p>
              </div>

              <LinkCard href={`/events/${slug}/feedback`} icon={Star} tone="bg-premium-gold/10 border-premium-gold/25 text-premium-gold" title="Give feedback" desc="Tell the host how it went" />

              {!sample && mine.token && (
                <button
                  type="button"
                  onClick={forget}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-premium-borderDark text-zinc-400 hover:text-premium-danger hover:border-premium-danger/40 text-[12px] font-bold scale-on-click transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Remove this pass from this phone
                </button>
              )}
            </>
          )}
        </main>

        {/* Bottom navigation */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-30 pb-[env(safe-area-inset-bottom)]">
          <div className="mx-4 mb-5 glass-panel rounded-[2rem] px-2 py-2 flex items-center justify-around shadow-2xl border border-zinc-700/80">
            {NAV.map(({ id, icon: Icon, label, central, locked }) => {
              const active = shown === id;
              if (central) {
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl scale-on-click transition-all ${active ? 'bg-premium-gold/20' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${active ? 'bg-premium-gold text-black shadow-gold' : 'bg-premium-charcoal text-premium-gold border border-premium-gold/30'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[9px] font-bold ${active ? 'text-premium-gold' : 'text-zinc-500'}`}>{label}</span>
                  </button>
                );
              }
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl scale-on-click transition-all"
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="relative">
                    <Icon className={`w-5 h-5 transition-colors ${active ? 'text-white' : 'text-zinc-500'}`} />
                    {locked && <Lock className="absolute -top-1 -right-2 w-3 h-3 text-zinc-500" />}
                  </span>
                  <span className={`text-[9px] font-bold transition-colors ${active ? 'text-white' : 'text-zinc-500'}`}>{label}</span>
                  {active && <span className="w-1 h-1 rounded-full bg-premium-gold" />}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

function GuestAppWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <GuestAppContent slug={slug} />;
}

export default function GuestAppPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-premium-black" />}>
      <GuestAppWrapper params={params} />
    </Suspense>
  );
}
