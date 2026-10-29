'use client';

import React, { useState, useEffect, useCallback, use, Suspense } from 'react';
import Link from 'next/link';
import { MOCK_EVENT, MOCK_CORPORATE_NEXUS_EVENT, MOCK_WEDDING_BALI_EVENT, MOCK_POPVERSE_EVENT, MOCK_WEDDING_EVENT, MOCK_GUESTS, MOCK_RAFFLES } from '@/lib/mockData';
import { RaffleDraw, Guest } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import {
  Gift,
  Trophy,
  Sparkles,
  ArrowLeft,
  Volume2,
  RefreshCw,
  CheckCircle2,
  Maximize2,
  Play,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import SlotMachineRaffle from '@/components/stage/SlotMachineRaffle';

function RaffleStageContent({ slug }: { slug: string }) {
  const event =
    slug === 'aria-daniel' ? MOCK_WEDDING_EVENT :
    slug === 'sophia-marco' ? MOCK_WEDDING_BALI_EVENT :
    slug === 'nexus' ? MOCK_CORPORATE_NEXUS_EVENT :
    slug === 'popverse' ? MOCK_POPVERSE_EVENT :
    MOCK_EVENT;
  const [mode, setMode] = useState<'wheel' | 'claw' | 'slot'>('wheel');
  const [selectedPrize, setSelectedPrize] = useState<string>('Apple MacBook Pro M4 Max (16-inch)');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [winner, setWinner] = useState<Guest | null>(null);
  const [pastDraws, setPastDraws] = useState<RaffleDraw[]>(MOCK_RAFFLES);

  // Eligible pool: strictly checked-in guests only
  const eligiblePool = MOCK_GUESTS.filter((g) => g.is_checked_in);

  const handleStartDraw = useCallback(() => {
    if (isSpinning || eligiblePool.length === 0) return;

    setIsSpinning(true);
    setWinner(null);

    // Random winner from eligible pool
    const randomWinnerIndex = Math.floor(Math.random() * eligiblePool.length);
    const chosenWinner = eligiblePool[randomWinnerIndex];

    // Compute extra rotation (at least 5 full 360-degree spins + offset)
    setRotationAngle((prev) => prev + 1800 + Math.floor(Math.random() * 360));

    setTimeout(() => {
      setIsSpinning(false);
      setWinner(chosenWinner);

      // Trigger grand fireworks
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00F0FF', '#C5A059', '#FF3366', '#00E676'],
      });

      // Append to past draws
      const newDraw: RaffleDraw = {
        id: `raf-${Date.now()}`,
        event_id: event.id,
        prize_name: selectedPrize,
        prize_tier: 1,
        style: mode,
        winner_guest_id: chosenWinner.id,
        drawn_at: new Date().toISOString(),
        audit_notes: `Drawn live in ${mode} mode. Verified check-in at gate.`,
        winner: { id: chosenWinner.id, name: chosenWinner.name, table_number: chosenWinner.table_number },
      };

      setPastDraws((prev) => [newDraw, ...prev]);
    }, 4500);
  }, [isSpinning, eligiblePool, selectedPrize, mode]);

  // Listen for remote prize/mode changes and spin triggers from Operator Switcher
  useEffect(() => {
    try {
      const saved = localStorage.getItem('all41_live_stage_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.rafflePrize) setSelectedPrize(parsed.rafflePrize);
        if (parsed.raffleStyle) setMode(parsed.raffleStyle);
      }
    } catch {
      // Ignore storage error
    }

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('all41_stage_bus');
      channel.onmessage = (ev) => {
        const data = ev.data;
        if (!data) return;
        if (data.type === 'STAGE_PUSH_LIVE') {
          if (data.rafflePrize) setSelectedPrize(data.rafflePrize);
          if (data.raffleStyle) setMode(data.raffleStyle);
        } else if (data.type === 'TRIGGER_RAFFLE_SPIN') {
          if (data.rafflePrize) setSelectedPrize(data.rafflePrize);
          if (data.raffleStyle) setMode(data.raffleStyle);
          handleStartDraw();
        }
      };
      return () => channel.close();
    }
  }, [handleStartDraw]);

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 flex flex-col justify-between select-none relative overflow-hidden font-sans">
      {/* Ambient Lighting */}
      <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-premium-gold/10 blur-[160px] pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-premium-neon/10 blur-[160px] pointer-events-none rounded-full" />

      {/* Header */}
      <header className="h-20 px-8 flex items-center justify-between z-20 backdrop-blur-xl bg-premium-black/80 border-b border-premium-borderDark">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard`}
            className="p-2.5 rounded-2xl bg-premium-charcoal border border-premium-borderDark text-zinc-400 hover:text-white scale-on-click"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-display font-medium text-white flex items-center gap-3">
              <span>{event.name} • Door Prize Arena</span>
              <span className="text-xs px-3 py-1 rounded-full bg-premium-gold/20 text-premium-gold font-bold border border-premium-gold/30 uppercase tracking-wider">
                Audited Pool
              </span>
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              <span className="text-premium-neon">{slug}.all41.app</span> • Eligible Checked-In Attendees: <strong className="text-premium-success">{eligiblePool.length} Pax</strong>
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2 bg-premium-surfaceDark p-1.5 rounded-2xl border border-premium-borderDark">
          <button
            type="button"
            onClick={() => setMode('wheel')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all scale-on-click ${
              mode === 'wheel'
                ? 'bg-premium-gold text-black shadow-gold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Wheel of Spin
          </button>
          <button
            type="button"
            onClick={() => setMode('claw')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all scale-on-click ${
              mode === 'claw'
                ? 'bg-premium-gold text-black shadow-gold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Arcade Claw
          </button>
          <button
            type="button"
            onClick={() => setMode('slot')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all scale-on-click ${
              mode === 'slot'
                ? 'bg-premium-gold text-black shadow-gold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Slot Machine
          </button>
        </div>
      </header>

      {/* Main Stage Arena */}
      <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-7xl mx-auto w-full z-10">
        {/* Left Column: Raffle Animation Mechanism */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark shadow-2xl relative">
          {/* Current Prize Banner */}
          <div className="mb-6 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-premium-gold block">
              ★ Grand Prize Draw ★
            </span>
            <h2 className="text-3xl font-display font-medium text-white mt-1">
              {selectedPrize}
            </h2>
          </div>

          {/* Wheel Visual Mode */}
          {mode === 'wheel' && (
            <div className="relative my-4 flex items-center justify-center">
              {/* Top Pointer Indicator */}
              <div className="absolute -top-4 z-30 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[32px] border-t-premium-danger drop-shadow-[0_4px_12px_rgba(255,51,102,0.8)]" />

              {/* The Spinning Wheel */}
              <div
                className="w-72 sm:w-96 h-72 sm:h-96 rounded-full border-8 border-premium-gold shadow-gold relative overflow-hidden transition-all duration-[4500ms] ease-out flex items-center justify-center"
                style={{
                  transform: `rotate(${rotationAngle}deg)`,
                  background: 'conic-gradient(#18181B 0deg 45deg, #121214 45deg 90deg, #18181B 90deg 135deg, #121214 135deg 180deg, #18181B 180deg 225deg, #121214 225deg 270deg, #18181B 270deg 315deg, #121214 315deg 360deg)',
                }}
              >
                {/* Wheel Segment Labels */}
                {eligiblePool.slice(0, 8).map((g, idx) => {
                  const deg = idx * 45;
                  return (
                    <div
                      key={g.id}
                      className="absolute w-full text-center text-xs font-bold text-zinc-300 font-display"
                      style={{
                        transform: `rotate(${deg}deg) translateY(-120px)`,
                      }}
                    >
                      {g.name.split(' ')[0]}
                    </div>
                  );
                })}

                {/* Center Hub Logo */}
                <div className="w-20 h-20 rounded-full bg-premium-black border-4 border-premium-neon shadow-neon flex items-center justify-center font-display font-bold text-base text-premium-gold z-20">
                  41
                </div>
              </div>
            </div>
          )}

          {/* Claw Machine Mode */}
          {mode === 'claw' && (
            <div className="w-80 h-80 rounded-[2rem] border-4 border-premium-borderDark bg-premium-surfaceDark relative flex flex-col items-center justify-between p-6 overflow-hidden">
              <div className="w-16 h-8 rounded-b-xl bg-premium-neon shadow-neon animate-pulse" />
              <div className="text-center">
                <Gift className="w-20 h-20 text-premium-gold mx-auto animate-bounce" />
                <span className="text-xs font-mono text-zinc-400 mt-2 block">Arcade Grabber Arm Armed</span>
              </div>
              <div className="w-full h-4 bg-zinc-800 rounded" />
            </div>
          )}

          {/* Slot Machine Mode — real casino lever + spinning reels */}
          {mode === 'slot' && (
            <SlotMachineRaffle
              eligiblePool={eligiblePool}
              onWinner={(w) => {
                setWinner(w);
                confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#00F0FF', '#C5A059', '#FF3366', '#00E676'] });
                const newDraw: RaffleDraw = {
                  id: `raf-${Date.now()}`,
                  event_id: event.id,
                  prize_name: selectedPrize,
                  prize_tier: 1,
                  style: 'slot',
                  winner_guest_id: w.id,
                  drawn_at: new Date().toISOString(),
                  audit_notes: 'Drawn live via slot machine. Verified check-in at gate.',
                  winner: { id: w.id, name: w.name, table_number: w.table_number },
                };
                setPastDraws(prev => [newDraw, ...prev]);
              }}
              isSpinning={isSpinning}
              winner={winner}
            />
          )}

          {/* Spin Trigger Button */}
          <div className="mt-8">
            <button
              type="button"
              disabled={isSpinning}
              onClick={handleStartDraw}
              className={`px-12 py-4 rounded-2xl font-bold text-base text-black uppercase tracking-wider transition-all shadow-gold scale-on-click flex items-center gap-3 ${
                isSpinning
                  ? 'bg-zinc-600 cursor-not-allowed'
                  : 'bg-premium-gold hover:bg-premium-goldHover'
              }`}
            >
              {isSpinning ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Drawing Lucky Winner...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Spin for Winner!</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Winner Announcement & Past Draw Audit Log */}
        <div className="lg:col-span-4 space-y-6">
          {/* Winner Revealed Card */}
          {winner && (
            <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border-2 border-premium-gold shadow-gold text-center">
              <div className="w-16 h-16 rounded-full bg-premium-gold/15 text-premium-gold mx-auto flex items-center justify-center mb-4 shadow-gold">
                <Trophy className="w-8 h-8" />
              </div>
              <span className="text-xs font-mono uppercase text-premium-success font-bold">
                🎉 Official Winner Verified
              </span>
              <h3 className="text-2xl font-display font-medium text-white mt-2">{winner.name}</h3>
              <p className="text-sm text-zinc-400 mt-1 font-light">
                Table: {winner.table_number || 'General Area'} • {winner.category}
              </p>
              <div className="mt-4 pt-3 border-t border-premium-borderDark text-[11px] font-mono text-zinc-400">
                Token: {winner.qr_code_token}
              </div>
            </div>
          )}

          {/* Past Winners Audit Ledger */}
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark">
            <div className="text-xs font-mono uppercase text-zinc-400 tracking-wider mb-4 flex items-center justify-between">
              <span>Audited Winners Ledger</span>
              <span className="text-premium-gold font-bold">{pastDraws.length} Claimed</span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {pastDraws.map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-xs space-y-1"
                >
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>{d.prize_name}</span>
                    <span className="text-[10px] font-mono text-premium-success uppercase">{d.style}</span>
                  </div>
                  <div className="text-zinc-400 flex items-center justify-between text-[11px]">
                    <span>Winner: <strong className="text-premium-neon">{d.winner?.name || 'Pending'}</strong></span>
                    <span>{d.winner?.table_number || ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function RaffleStageWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  return <RaffleStageContent slug={unwrappedParams.slug} />;
}

export default function RaffleStagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-gray-400">Loading stage...</div>}>
      <RaffleStageWrapper params={params} />
    </Suspense>
  );
}
