'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, EyeOff, Play, RefreshCw, Settings2, Trophy, UserX } from 'lucide-react';
import {
  drawExclusions, formatGuestNumber, guestPool, numberDigits, updateDrawWinners, useEventConfigBySlug, useGuestList, type DrawWinner,
} from '@/lib/eventStore';
import { isServerEventId } from '@/lib/guestsApi';
import { boardExclusions, forfeitDraw, serverPrize, toDrawWinner, useDoorPrizeBoard, useDoorPrizeSync } from '@/lib/doorPrizeApi';
import { stageBusName } from '@/lib/stageApi';
import { DrawMachine, DRAW_STYLES } from '@/components/raffle/DrawMachine';
import { SlotSettings } from '@/components/raffle/SlotSettings';
import { StageFrameShell } from '@/components/stage/StageFrameShell';
import { DoorPrizeViewer } from '@/components/events/DoorPrizeViewer';
import type { SlotResult } from '@/components/raffle/SlotMachine';

/** A winner row on the screen; forfeited draws (saved events) stay listed, struck through. */
interface WinnerRow extends DrawWinner {
  forfeited?: boolean;
}

/**
 * Big-screen door prize view at /events/[slug]/doorprize. The event's organizers draw here: on a saved event the
 * server picks a checked-in guest and every screen and phone gets the winner from it. Anyone else who opens a
 * saved event's link (guests on their phones) gets the read-only winners board. Sample events draw on this device.
 */
export function DoorPrizeScreen({ slug, initialId }: { slug: string; initialId?: string | null }) {
  const { eventId, hydrated } = useEventConfigBySlug(slug);
  const server = hydrated && isServerEventId(eventId);
  const { status } = useDoorPrizeBoard(server ? eventId : null, 3000);

  if (!hydrated || (server && (status === 'idle' || status === 'loading'))) {
    return <div className="min-h-screen bg-premium-black flex items-center justify-center text-zinc-500 text-sm">Loading stage…</div>;
  }
  if (server && status === 'forbidden') return <DoorPrizeViewer slug={slug} initialId={initialId} />;
  return <DoorPrizeArena slug={slug} initialId={initialId} />;
}

function DoorPrizeArena({ slug, initialId }: { slug: string; initialId?: string | null }) {
  const router = useRouter();
  const { eventId, event, config } = useEventConfigBySlug(slug);
  const server = isServerEventId(eventId);
  // New check-ins join the draw while the screen stays open.
  const { guests } = useGuestList(eventId, server ? 20_000 : 0);
  const { board, error: boardError } = useDoorPrizeBoard(server ? eventId : null);
  const { items, activeId } = config.doorprizes;
  useDoorPrizeSync(server ? eventId : null, items);
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null);
  const draw = items.find((d) => d.id === selectedId) ?? items.find((d) => d.id === activeId) ?? items[0];
  const [trigger, setTrigger] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SlotResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [forfeitError, setForfeitError] = useState<string | null>(null);
  const digits = numberDigits(guests, config.info.capacity);
  const guestById = (id?: string) => (id ? guests.find((g) => g.id === id) : undefined);
  const drawIdRef = useRef(draw?.id);
  useEffect(() => {
    drawIdRef.current = draw?.id;
  }, [draw?.id]);

  const prize = draw && server ? serverPrize(board, draw.id) : undefined;
  const winners: WinnerRow[] = !draw
    ? []
    : server
      ? (prize?.winners ?? []).map((w) => ({ ...toDrawWinner(prize!, w, digits), forfeited: w.status === 'forfeited' }))
      : draw.winners;
  const awarded = server ? prize?.awarded ?? 0 : draw?.winners.length ?? 0;
  // A guest wins once per event, across all door prizes.
  const excludedIds = new Set((server ? boardExclusions(board) : drawExclusions(config)).guestIds);
  const eligible = draw ? guestPool(guests, draw.audience, draw.pickedGuestIds).filter((g) => !excludedIds.has(g.id)).length : 0;
  const full = !!draw && awarded >= draw.quantity;

  const select = (id: string) => {
    setSelectedId(id);
    setResult(null);
    router.replace(`/events/${slug}/doorprize/${id}`, { scroll: false });
  };

  // The operator can start a spin from another tab on this device (per-event channel).
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel(stageBusName(eventId));
    channel.onmessage = (ev) => {
      const data = ev.data;
      if (data?.type === 'TRIGGER_RAFFLE_SPIN') {
        if (data.doorPrizeId && data.doorPrizeId !== drawIdRef.current) {
          setSelectedId(data.doorPrizeId);
          window.setTimeout(() => setTrigger((t) => t + 1), 150);
        } else {
          setTrigger((t) => t + 1);
        }
      }
    };
    return () => channel.close();
  }, [eventId]);

  const forfeit = async (w: WinnerRow) => {
    if (!confirm(`${w.number ? `No. ${w.label}` : w.label} did not come forward? They stay out of the draw and you can draw again.`)) return;
    setForfeitError(null);
    try {
      await forfeitDraw(eventId, w.id);
      setResult(null);
    } catch (e) {
      setForfeitError(e instanceof Error ? e.message : 'Could not forfeit that winner.');
    }
  };

  if (!draw) {
    return <div className="min-h-screen bg-premium-black flex items-center justify-center text-zinc-500 text-sm">Set up a door prize in the dashboard first.</div>;
  }

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 font-sans relative overflow-hidden">
      <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-premium-gold/10 blur-[160px] pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-premium-neon/10 blur-[160px] pointer-events-none rounded-full" />

      <StageFrameShell frame={draw.frame} logoRef={config.design.logoUrl} className="min-h-screen">
        <header className="relative z-20 px-8 pt-6 pb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link href={`/dashboard/events/${eventId}?tab=doorprize`} className="p-2.5 rounded-2xl bg-premium-charcoal border border-premium-borderDark text-zinc-400 hover:text-white scale-on-click" aria-label="Back to dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-display font-medium text-white truncate">{event.name} • Door Prize Arena</h1>
              <p className="text-xs text-zinc-400 font-mono mt-0.5 flex items-center gap-2">
                <span>Eligible checked-in guests: <strong className="text-premium-success">{eligible}</strong></span>
                {draw.anonymous && <span className="inline-flex items-center gap-1 text-premium-gold"><EyeOff className="w-3 h-3" /> Anonymous</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto max-w-full">
            {items.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => select(d.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all scale-on-click ${d.id === draw.id ? 'bg-premium-gold text-black shadow-gold' : 'bg-premium-charcoal border border-premium-borderDark text-zinc-400 hover:text-white'}`}
              >
                {d.name}
              </button>
            ))}
            <button type="button" onClick={() => setShowSettings((v) => !v)} className={`p-2 rounded-xl border scale-on-click ${showSettings ? 'border-premium-gold text-premium-gold' : 'border-premium-borderDark text-zinc-400 hover:text-white'}`} aria-label="Draw settings">
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="relative z-20 flex-1 px-8 pb-10 grid grid-cols-1 xl:grid-cols-12 gap-8 items-start max-w-7xl mx-auto w-full">
          <div className="xl:col-span-8 flex flex-col items-center gap-6">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-premium-gold">★ {draw.name} · {DRAW_STYLES.find((s) => s.id === draw.style)?.label} ★</span>
              <h2 className="text-4xl font-display font-medium text-white mt-1">{draw.prize}</h2>
              {draw.sponsor && <p className="text-xs text-zinc-400 mt-1">Sponsored by {draw.sponsor}</p>}
            </div>
            {showSettings && <SlotSettings eventId={eventId} drawId={draw.id} className="justify-center" />}
            <DrawMachine
              key={draw.id}
              eventId={eventId}
              draw={draw}
              size="md"
              trigger={trigger}
              showButton={false}
              onSpinStart={() => { setSpinning(true); setResult(null); }}
              onResult={(r) => { setSpinning(false); setResult(r); }}
            />
            <button
              type="button"
              disabled={spinning || full}
              onClick={() => setTrigger((t) => t + 1)}
              className={`px-12 py-4 rounded-2xl font-display font-bold text-base text-black uppercase tracking-wider transition-all shadow-gold scale-on-click flex items-center gap-3 ${spinning || full ? 'bg-zinc-600 cursor-not-allowed' : 'bg-premium-gold hover:bg-premium-goldHover'}`}
            >
              {spinning ? <><RefreshCw className="w-5 h-5 animate-spin" /> Drawing…</> : full ? 'All winners drawn' : <><Play className="w-5 h-5 fill-current" /> Draw a winner</>}
            </button>
            {server && boardError && <p className="text-xs text-premium-danger">{boardError}</p>}
          </div>

          <div className="xl:col-span-4 space-y-6">
            {result && (
              <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border-2 border-premium-gold shadow-gold text-center">
                <Trophy className="w-10 h-10 text-premium-gold mx-auto mb-3" />
                <span className="text-xs font-mono uppercase text-premium-success font-bold">{result.mode === 'number' ? 'Lucky number' : 'Lucky guest'}</span>
                <h3 className={`text-premium-gold font-bold mt-2 ${result.mode === 'number' ? 'text-5xl font-mono tracking-[0.2em]' : 'text-3xl font-display'}`}>{result.label}</h3>
                {result.mode === 'number' && result.entry && !draw.anonymous && <p className="text-xl font-display font-medium text-white mt-2">{result.entry.name}</p>}
                <p className="text-xs text-zinc-500 mt-3">{draw.prize}</p>
              </div>
            )}
            <div className="p-6 rounded-[2rem] bg-premium-charcoal/90 border border-premium-borderDark">
              <div className="text-xs font-mono uppercase text-zinc-400 tracking-wider mb-4 flex items-center justify-between">
                <span>{draw.name} winners</span>
                <span className="text-premium-gold font-bold">{awarded}/{draw.quantity}</span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {winners.length === 0 && <p className="text-xs text-zinc-500">No winners yet.</p>}
                {winners.map((w) => {
                  const guest = guestById(w.guestId);
                  return (
                    <div key={w.id} className={`p-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-xs flex items-center justify-between gap-2 ${w.forfeited ? 'opacity-50' : ''}`}>
                      <span className={`min-w-0 truncate ${w.forfeited ? 'line-through' : ''}`}>
                        <span className="font-bold text-white">{w.number ? `No. ${w.label}` : w.label}</span>
                        {w.number && !draw.anonymous && guest && <span className="text-zinc-400 ml-2">{guest.name}</span>}
                        {!w.number && guest?.guest_number && <span className="font-mono text-zinc-500 ml-2">#{formatGuestNumber(guest.guest_number, digits)}</span>}
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        {w.forfeited ? (
                          <span className="text-[10px] font-bold uppercase text-zinc-500">Forfeited</span>
                        ) : server ? (
                          <button type="button" onClick={() => void forfeit(w)} className="text-zinc-500 hover:text-premium-danger scale-on-click" aria-label="Forfeit and draw again" title="Did not come forward: forfeit, then draw again">
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                        <span className="font-mono text-zinc-500">{new Date(w.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
              {forfeitError && <p className="mt-3 text-[11px] text-premium-danger">{forfeitError}</p>}
              {!server && draw.winners.length > 0 && (
                <button
                  type="button"
                  onClick={() => { if (confirm(`Clear the winners of “${draw.name}”?`)) updateDrawWinners(eventId, draw.id, () => []); }}
                  className="mt-3 text-[11px] font-bold text-zinc-500 hover:text-white scale-on-click"
                >
                  Reset winners
                </button>
              )}
            </div>
          </div>
        </main>
      </StageFrameShell>
    </div>
  );
}
