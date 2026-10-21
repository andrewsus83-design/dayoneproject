'use client';

import React, { useState, use, Suspense } from 'react';
import Link from 'next/link';
import { MOCK_EVENT, MOCK_GUESTS, MOCK_RAFFLES } from '@/lib/mockData';
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

function RaffleStageContent({ slug }: { slug: string }) {
  const [mode, setMode] = useState<'wheel' | 'claw' | 'slot'>('wheel');
  const [selectedPrize, setSelectedPrize] = useState<string>('Apple MacBook Pro M4 Max (16-inch)');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [winner, setWinner] = useState<Guest | null>(null);
  const [pastDraws, setPastDraws] = useState<RaffleDraw[]>(MOCK_RAFFLES);

  // Eligible pool: strictly checked-in guests only
  const eligiblePool = MOCK_GUESTS.filter((g) => g.is_checked_in);

  const handleStartDraw = () => {
    if (isSpinning || eligiblePool.length === 0) return;

    setIsSpinning(true);
    setWinner(null);

    // Random winner from eligible pool
    const randomWinnerIndex = Math.floor(Math.random() * eligiblePool.length);
    const chosenWinner = eligiblePool[randomWinnerIndex];

    // Compute extra rotation (at least 5 full 360-degree spins + offset)
    const extraDegrees = 1800 + Math.floor(Math.random() * 360);
    const newAngle = rotationAngle + extraDegrees;
    setRotationAngle(newAngle);

    setTimeout(() => {
      setIsSpinning(false);
      setWinner(chosenWinner);

      // Trigger grand fireworks
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#dfb76c', '#ff007f', '#00ff88'],
      });

      // Append to past draws
      const newDraw: RaffleDraw = {
        id: `raf-${Date.now()}`,
        event_id: MOCK_EVENT.id,
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
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] flex flex-col justify-between select-none relative overflow-hidden">
      {/* Ambient Lighting */}
      <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-[#dfb76c]/10 blur-[160px] pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#00f0ff]/10 blur-[160px] pointer-events-none rounded-full" />

      {/* Header */}
      <header className="h-20 px-8 flex items-center justify-between z-20 backdrop-blur-md bg-[#0b0e17]/80 border-b border-[#1b2234]">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard`}
            className="p-2 rounded-xl bg-[#141926] border border-[#232c42] text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <span>{MOCK_EVENT.name} • Door Prize Arena</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#dfb76c]/20 text-[#dfb76c] font-mono border border-[#dfb76c]/30">
                AUDITED POOL
              </span>
            </h1>
            <p className="text-xs text-gray-400 font-mono">
              Eligible Checked-In Attendees: <strong className="text-[#00ff88]">{eligiblePool.length} Pax</strong>
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2 bg-[#121624] p-1.5 rounded-2xl border border-[#222b40]">
          <button
            type="button"
            onClick={() => setMode('wheel')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'wheel'
                ? 'bg-gradient-to-r from-[#dfb76c] to-[#00f0ff] text-[#0b0d13] shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Wheel of Spin
          </button>
          <button
            type="button"
            onClick={() => setMode('claw')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'claw'
                ? 'bg-gradient-to-r from-[#dfb76c] to-[#00f0ff] text-[#0b0d13] shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Arcade Claw
          </button>
          <button
            type="button"
            onClick={() => setMode('slot')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'slot'
                ? 'bg-gradient-to-r from-[#dfb76c] to-[#00f0ff] text-[#0b0d13] shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Slot Machine
          </button>
        </div>
      </header>

      {/* Main Stage Arena */}
      <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-7xl mx-auto w-full z-10">
        {/* Left Column: Raffle Animation Mechanism */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center p-8 rounded-3xl bg-[#0e121e]/80 border border-[#20293d] shadow-2xl relative">
          {/* Current Prize Banner */}
          <div className="mb-6 text-center">
            <span className="text-xs font-mono uppercase tracking-widest text-[#dfb76c] font-bold">
              ★ Grand Prize Draw ★
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              {selectedPrize}
            </h2>
          </div>

          {/* Wheel Visual Mode */}
          {mode === 'wheel' && (
            <div className="relative my-4 flex items-center justify-center">
              {/* Top Pointer Indicator */}
              <div className="absolute -top-4 z-30 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[32px] border-t-[#ff007f] drop-shadow-[0_4px_12px_rgba(255,0,127,0.8)]" />

              {/* The Spinning Wheel */}
              <div
                className="w-72 sm:w-96 h-72 sm:h-96 rounded-full border-8 border-[#dfb76c] shadow-[0_0_50px_rgba(223,183,108,0.35)] relative overflow-hidden transition-all duration-[4500ms] ease-out flex items-center justify-center"
                style={{
                  transform: `rotate(${rotationAngle}deg)`,
                  background: 'conic-gradient(#121624 0deg 45deg, #1b233a 45deg 90deg, #121624 90deg 135deg, #1b233a 135deg 180deg, #121624 180deg 225deg, #1b233a 225deg 270deg, #121624 270deg 315deg, #1b233a 315deg 360deg)',
                }}
              >
                {/* Wheel Segment Labels */}
                {eligiblePool.slice(0, 8).map((g, idx) => {
                  const deg = idx * 45;
                  return (
                    <div
                      key={g.id}
                      className="absolute w-full text-center text-xs font-bold text-gray-200"
                      style={{
                        transform: `rotate(${deg}deg) translateY(-120px)`,
                      }}
                    >
                      {g.name.split(' ')[0]}
                    </div>
                  );
                })}

                {/* Center Hub Logo */}
                <div className="w-20 h-20 rounded-full bg-[#0b0d13] border-4 border-[#00f0ff] shadow-xl flex items-center justify-center font-black text-base text-[#dfb76c] z-20">
                  ALL41
                </div>
              </div>
            </div>
          )}

          {/* Claw Machine Mode */}
          {mode === 'claw' && (
            <div className="w-80 h-80 rounded-2xl border-4 border-[#283550] bg-[#121624] relative flex flex-col items-center justify-between p-4 overflow-hidden">
              <div className="w-16 h-8 rounded-b-xl bg-[#00f0ff] shadow-[0_0_15px_#00f0ff] animate-pulse" />
              <div className="text-center">
                <Gift className="w-20 h-20 text-[#dfb76c] mx-auto animate-bounce" />
                <span className="text-xs font-mono text-gray-400 mt-2 block">Arcade Grabber Arm Armed</span>
              </div>
              <div className="w-full h-4 bg-[#1f293d] rounded" />
            </div>
          )}

          {/* Slot Machine Mode */}
          {mode === 'slot' && (
            <div className="flex gap-4 p-6 rounded-2xl bg-[#141926] border-2 border-[#dfb76c] shadow-[0_0_30px_rgba(223,183,108,0.2)]">
              {[1, 2, 3].map((slot) => (
                <div
                  key={slot}
                  className="w-24 h-32 rounded-xl bg-[#090b12] border border-[#232c42] flex items-center justify-center text-2xl font-black text-[#00f0ff]"
                >
                  {isSpinning ? '7' : '★'}
                </div>
              ))}
            </div>
          )}

          {/* Spin Trigger Button */}
          <div className="mt-8">
            <button
              type="button"
              disabled={isSpinning}
              onClick={handleStartDraw}
              className={`px-12 py-4 rounded-2xl font-black text-base text-[#0b0d13] uppercase tracking-wider transition-all shadow-[0_0_35px_rgba(223,183,108,0.4)] active:scale-95 flex items-center gap-3 ${
                isSpinning
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#dfb76c] via-[#00f0ff] to-[#ff007f] hover:brightness-110'
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
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1c29] to-[#121624] border-2 border-[#dfb76c] shadow-[0_0_30px_rgba(223,183,108,0.3)] text-center animate-fadeIn">
              <div className="w-14 h-14 rounded-full bg-[#dfb76c]/20 text-[#dfb76c] mx-auto flex items-center justify-center mb-3">
                <Trophy className="w-8 h-8" />
              </div>
              <span className="text-xs font-mono uppercase text-[#00ff88] font-bold">
                🎉 Official Winner Verified
              </span>
              <h3 className="text-2xl font-black text-white mt-1">{winner.name}</h3>
              <p className="text-xs text-gray-300 mt-0.5">
                Table: <strong className="text-[#dfb76c]">{winner.table_number || 'Main Seating'}</strong>
              </p>
              <div className="mt-4 pt-3 border-t border-[#263148] text-[11px] font-mono text-gray-400">
                Token: {winner.qr_code_token}
              </div>
            </div>
          )}

          {/* Past Winners Audit Ledger */}
          <div className="p-5 rounded-2xl bg-[#0f1320] border border-[#1b2234]">
            <div className="text-xs font-mono uppercase text-gray-400 tracking-wider mb-3 flex items-center justify-between">
              <span>Audited Winners Ledger</span>
              <span className="text-[#dfb76c] font-bold">{pastDraws.length} Claimed</span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {pastDraws.map((d) => (
                <div
                  key={d.id}
                  className="p-3 rounded-xl bg-[#14192a] border border-[#1f283d] text-xs space-y-1"
                >
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>{d.prize_name}</span>
                    <span className="text-[10px] font-mono text-[#00ff88] uppercase">{d.style}</span>
                  </div>
                  <div className="text-gray-400 flex items-center justify-between text-[11px]">
                    <span>Winner: <strong className="text-[#00f0ff]">{d.winner?.name || 'Pending'}</strong></span>
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
