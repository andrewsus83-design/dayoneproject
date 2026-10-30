'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { ArrowLeft, EyeOff, Gift, Trophy, WifiOff } from 'lucide-react';
import { guestAppPath } from '@/lib/guestsApi';
import { publicWinnerLabel, usePublicDoorPrizes, type ServerWinner } from '@/lib/doorPrizeApi';

const REVEAL_MS = 12_000;

function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="guest-app min-h-screen bg-premium-black text-zinc-100 font-sans flex items-center justify-center px-6">
      <div className="max-w-sm text-center space-y-4">
        <div className="w-12 h-12 mx-auto bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-xl shadow-gold">D1</div>
        <h1 className="text-xl font-display font-bold text-white">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function WinnerLine({ w }: { w: ServerWinner }) {
  return (
    <div className="p-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-sm flex items-center justify-between gap-3">
      <span className="min-w-0 truncate">
        <span className={`font-bold text-white ${w.name ? 'font-display' : 'font-mono'}`}>{publicWinnerLabel(w)}</span>
        {w.table_no && <span className="text-zinc-500 text-xs ml-2">Table {w.table_no}</span>}
      </span>
      <span className="font-mono text-xs text-zinc-500 shrink-0">{new Date(w.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  );
}

/**
 * The read-only door prize board for everyone who is not running the draw (guests on their phones, a screen nobody
 * is signed in on). It polls the cached /api/doorprize/<slug> route and celebrates each winner as they are revealed.
 */
export function DoorPrizeViewer({ slug, initialId }: { slug: string; initialId?: string | null }) {
  const router = useRouter();
  const { data, state, fresh, dismissFresh } = usePublicDoorPrizes(slug, true, 3000);
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null);
  const prizes = data?.prizes ?? [];
  // Follow the prize of the newest winner unless the viewer picked one.
  const prize = prizes.find((p) => p.config_id === selectedId)
    ?? prizes.find((p) => p.config_id === data?.latest?.config_id)
    ?? prizes[0];

  useEffect(() => {
    if (!fresh) return;
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.5 }, colors: ['#00F0FF', '#C5A059', '#FF3366', '#00E676'] });
    const t = window.setTimeout(dismissFresh, REVEAL_MS);
    return () => window.clearTimeout(t);
  }, [fresh, dismissFresh]);

  const select = (id: string | null) => {
    if (!id) return;
    setSelectedId(id);
    router.replace(`/events/${slug}/doorprize/${id}`, { scroll: false });
  };

  if (!data && state === 'loading') {
    return <div className="min-h-screen bg-premium-black flex items-center justify-center text-zinc-500 text-sm">Loading the draw…</div>;
  }
  if (!data && state === 'offline') {
    return (
      <Notice title="We couldn't reach the draw">
        <p className="text-sm text-zinc-400">Check your internet connection. This page tries again every few seconds.</p>
      </Notice>
    );
  }
  if (!data) {
    return (
      <Notice title="The door prize draw isn't live yet">
        <p className="text-sm text-zinc-400">Check the link you were sent, or ask the host to publish the event.</p>
      </Notice>
    );
  }

  const spotlight = fresh ?? (prize && prize.winners[0] ? { prize, winner: prize.winners[0] } : null);

  return (
    <div className="guest-app min-h-screen bg-premium-black text-zinc-100 font-sans relative overflow-hidden">
      <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-premium-gold/10 blur-[160px] pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-premium-neon/10 blur-[160px] pointer-events-none rounded-full" />

      <header className="relative z-20 px-4 sm:px-8 pt-6 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={guestAppPath(slug, 'prize')} className="p-2 rounded-xl bg-premium-charcoal border border-premium-borderDark text-zinc-400 hover:text-white scale-on-click shrink-0" aria-label="Back to the guest app">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-xl shadow-gold shrink-0">D1</div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-display font-medium text-white truncate">{data.event.name}</h1>
            <p className="text-xs text-zinc-400 font-mono flex items-center gap-2">
              <span>Door Prize</span>
              {state === 'offline' && <span className="inline-flex items-center gap-1 text-premium-danger"><WifiOff className="w-3 h-3" /> Reconnecting…</span>}
            </p>
          </div>
        </div>
        {prizes.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
            {prizes.map((p) => (
              <button
                key={p.config_id ?? p.name}
                type="button"
                onClick={() => select(p.config_id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all scale-on-click ${p === prize ? 'bg-premium-gold text-black shadow-gold' : 'bg-premium-charcoal border border-premium-borderDark text-zinc-400 hover:text-white'}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="relative z-20 px-4 sm:px-8 pb-10 max-w-3xl mx-auto w-full space-y-6">
        {!prize ? (
          <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark text-center space-y-3">
            <Gift className="w-10 h-10 text-premium-gold mx-auto" />
            <h2 className="text-2xl font-display font-bold text-white">The draw starts soon</h2>
            <p className="text-sm text-zinc-400">Winners appear here the moment they are drawn on stage.</p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-premium-gold">★ {prize.name} ★</span>
              {prize.prize && <h2 className="text-3xl sm:text-4xl font-display font-medium text-white mt-1">{prize.prize}</h2>}
              {prize.anonymous && (
                <p className="text-xs text-premium-gold mt-2 inline-flex items-center gap-1"><EyeOff className="w-3 h-3" /> Winners are shown by guest number</p>
              )}
            </div>

            {spotlight ? (
              <div className={`p-8 rounded-[2.5rem] bg-premium-charcoal text-center border-2 ${fresh ? 'border-premium-gold shadow-gold animate-fadeIn' : 'border-premium-borderDark'}`}>
                <Trophy className="w-10 h-10 text-premium-gold mx-auto mb-3" />
                <span className="text-xs font-mono uppercase text-premium-success font-bold">{fresh ? 'Just drawn' : 'Latest winner'} · {spotlight.prize.name}</span>
                <h3 className={`text-premium-gold font-bold mt-2 ${spotlight.winner.name ? 'text-4xl font-display' : 'text-5xl font-mono tracking-[0.15em]'}`}>
                  {publicWinnerLabel(spotlight.winner)}
                </h3>
                {spotlight.winner.table_no && <p className="text-sm text-zinc-400 mt-2">Table {spotlight.winner.table_no}</p>}
                {spotlight.prize.prize && <p className="text-xs text-zinc-500 mt-3">{spotlight.prize.prize}</p>}
              </div>
            ) : (
              <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark text-center">
                <p className="text-sm text-zinc-400">No winners yet. Keep this page open: winners appear the moment they are drawn.</p>
              </div>
            )}

            <div className="p-6 rounded-[2rem] bg-premium-charcoal/90 border border-premium-borderDark">
              <div className="text-xs font-mono uppercase text-zinc-400 tracking-wider mb-4 flex items-center justify-between">
                <span>{prize.name} winners</span>
                <span className="text-premium-gold font-bold">{prize.winners.length}/{prize.quantity}</span>
              </div>
              <div className="space-y-2">
                {prize.winners.length === 0 && <p className="text-xs text-zinc-500">No winners yet.</p>}
                {prize.winners.map((w) => <WinnerLine key={w.id} w={w} />)}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
