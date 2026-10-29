'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Guest } from '@/lib/types';

interface SlotMachineRaffleProps {
  eligiblePool: Guest[];
  onWinner: (winner: Guest) => void;
  isSpinning: boolean;
  winner: Guest | null;
}

type SpinState = 'idle' | 'spinning' | 'stopping1' | 'stopping2' | 'stopping3' | 'done';

const REEL_ITEM_H = 80; // px per item in the reel
const VISIBLE_ITEMS = 3; // how many slots visible in window

function buildReelItems(guests: Guest[], count: number = 40): string[] {
  if (guests.length === 0) return Array(count).fill('---');
  const names = guests.map(g => g.name.toUpperCase());
  const result: string[] = [];
  while (result.length < count) {
    result.push(...names);
  }
  return result.slice(0, count);
}

function Reel({
  items,
  targetIndex,
  spinState,
  stopPhase,
  label,
}: {
  items: string[];
  targetIndex: number;
  spinState: SpinState;
  stopPhase: 1 | 2 | 3;
  label: string;
}) {
  const reelRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const posRef = useRef(0);
  const speedRef = useRef(0);

  const spinning = spinState === 'spinning'
    || (spinState === 'stopping1' && stopPhase > 1)
    || (spinState === 'stopping2' && stopPhase > 2);

  const isStopping = (spinState === 'stopping1' && stopPhase === 1)
    || (spinState === 'stopping2' && stopPhase === 2)
    || (spinState === 'stopping3' && stopPhase === 3);

  const isDone = spinState === 'done'
    || (spinState === 'stopping1' && stopPhase < 1)
    || (spinState === 'stopping2' && stopPhase < 2)
    || (spinState === 'stopping3' && stopPhase < 3);

  const targetPx = targetIndex * REEL_ITEM_H;

  useEffect(() => {
    if (spinState === 'idle' || spinState === 'done') {
      speedRef.current = 0;
      return;
    }

    const tick = () => {
      if (!reelRef.current) return;
      const totalHeight = items.length * REEL_ITEM_H;

      if (spinning) {
        speedRef.current = Math.min(speedRef.current + 8, 60);
      } else if (isStopping) {
        const dist = ((targetPx - posRef.current) % totalHeight + totalHeight) % totalHeight;
        if (dist < 2) {
          posRef.current = targetPx % totalHeight;
          speedRef.current = 0;
          reelRef.current.style.transform = `translateY(-${posRef.current}px)`;
          return;
        }
        speedRef.current = Math.max(2, dist * 0.08);
      }

      posRef.current = (posRef.current + speedRef.current) % totalHeight;
      reelRef.current.style.transform = `translateY(-${posRef.current}px)`;
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [spinState, spinning, isStopping, items.length, targetPx]);

  const displayItems = [...items, ...items.slice(0, VISIBLE_ITEMS)];

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{label}</span>
      <div
        className="relative overflow-hidden rounded-2xl border-2 border-premium-borderDark bg-premium-surfaceDark shadow-inner"
        style={{ width: 200, height: REEL_ITEM_H * VISIBLE_ITEMS }}
      >
        {/* Top fade */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-premium-surfaceDark to-transparent z-10 pointer-events-none" />
        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-premium-surfaceDark to-transparent z-10 pointer-events-none" />
        {/* Center selection indicator */}
        <div className="absolute inset-x-0 z-20 pointer-events-none" style={{ top: REEL_ITEM_H, height: REEL_ITEM_H }}>
          <div className="h-full border-y-2 border-premium-gold/60 mx-3">
            {spinState === 'done' && (
              <div className="absolute inset-0 bg-premium-gold/5" />
            )}
          </div>
        </div>
        {/* Scan line */}
        {(spinning || isStopping) && (
          <div
            className="absolute inset-x-0 h-0.5 bg-premium-gold/40 z-30 pointer-events-none animate-scan-line"
          />
        )}
        {/* Reel items */}
        <div ref={reelRef} className="flex flex-col" style={{ willChange: 'transform' }}>
          {displayItems.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-center px-4 text-center select-none"
              style={{ height: REEL_ITEM_H, minHeight: REEL_ITEM_H }}
            >
              <span className={`font-display font-bold text-sm leading-tight transition-colors ${
                isDone ? 'text-premium-gold' : 'text-zinc-300'
              }`}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Lever({ onPull, disabled }: { onPull: () => void; disabled: boolean }) {
  const [pulled, setPulled] = useState(false);

  const handlePull = () => {
    if (disabled) return;
    setPulled(true);
    onPull();
    setTimeout(() => setPulled(false), 800);
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none" style={{ marginTop: -24 }}>
      <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Pull</span>
      {/* Lever assembly */}
      <div className="relative flex flex-col items-center cursor-pointer" onClick={handlePull} style={{ height: 200 }}>
        {/* Track */}
        <div className="absolute left-1/2 -translate-x-1/2 top-6 bottom-6 w-2 rounded-full bg-premium-surfaceDark border border-premium-borderDark" />
        {/* Arm */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-3 rounded-full bg-gradient-to-b from-zinc-400 to-zinc-600 shadow-lg transition-all duration-300 ease-out"
          style={{
            top: pulled ? 120 : 8,
            height: pulled ? 72 : 130,
          }}
        />
        {/* Ball handle */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full shadow-gold transition-all duration-300 ease-out flex items-center justify-center ${
            disabled
              ? 'bg-zinc-700 border-2 border-zinc-600 cursor-not-allowed'
              : 'bg-premium-gold border-2 border-yellow-300 cursor-pointer hover:scale-110 active:scale-95'
          }`}
          style={{ top: pulled ? 150 : 0 }}
        >
          <div className="w-4 h-4 rounded-full bg-yellow-200/40" />
        </div>
        {/* Base */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark" />
      </div>
      {!disabled && (
        <span className="text-[10px] font-mono text-premium-gold animate-pulse mt-1">↓ PULL</span>
      )}
    </div>
  );
}

export default function SlotMachineRaffle({
  eligiblePool,
  onWinner,
  isSpinning: externalSpinSignal,
  winner,
}: SlotMachineRaffleProps) {
  const [spinState, setSpinState] = useState<SpinState>('idle');
  const [pendingWinner, setPendingWinner] = useState<Guest | null>(null);
  const [reelItems] = useState(() => buildReelItems(eligiblePool));

  // Target indices for each reel when winner is known
  const [targetIdx, setTargetIdx] = useState<[number, number, number]>([0, 0, 0]);

  const winnerIndex = pendingWinner
    ? reelItems.indexOf(pendingWinner.name.toUpperCase())
    : -1;

  const startSpin = useCallback(() => {
    if (spinState !== 'idle' || eligiblePool.length === 0) return;

    const w = eligiblePool[Math.floor(Math.random() * eligiblePool.length)];
    setPendingWinner(w);

    const idx = reelItems.findIndex(n => n === w.name.toUpperCase());
    const safeIdx = idx >= 0 ? idx : 0;
    // Stagger targets: reel 1 stops on table, reel 2 on category, reel 3 on name
    const tableItems = buildReelItems(eligiblePool.map(g => ({ ...g, name: g.table_number ? `TABLE ${g.table_number}` : 'TABLE —' } as Guest)));
    const catItems = buildReelItems(eligiblePool.map(g => ({ ...g, name: g.category || 'GENERAL' } as Guest)));
    const winnerTableIdx = Math.max(0, tableItems.findIndex(n => n === (w.table_number ? `TABLE ${w.table_number}` : 'TABLE —')));
    const winnerCatIdx = Math.max(0, catItems.findIndex(n => n === (w.category || 'GENERAL')));

    setTargetIdx([winnerTableIdx, winnerCatIdx, safeIdx]);
    setSpinState('spinning');

    setTimeout(() => setSpinState('stopping1'), 1800);
    setTimeout(() => setSpinState('stopping2'), 2800);
    setTimeout(() => setSpinState('stopping3'), 3600);
    setTimeout(() => {
      setSpinState('done');
      onWinner(w);
    }, 4500);
  }, [spinState, eligiblePool, reelItems, onWinner]);

  // Allow external trigger (from operator switcher)
  useEffect(() => {
    if (externalSpinSignal && spinState === 'idle') {
      startSpin();
    }
  }, [externalSpinSignal, spinState, startSpin]);

  // Reset to idle after winner displayed
  const handleReset = () => {
    setSpinState('idle');
    setPendingWinner(null);
  };

  const tableItems = buildReelItems(eligiblePool.map(g => ({ ...g, name: g.table_number ? `TABLE ${g.table_number}` : 'TABLE —' } as Guest)));
  const catItems = buildReelItems(eligiblePool.map(g => ({ ...g, name: g.category || 'GENERAL' } as Guest)));

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Machine body */}
      <div className="relative flex items-center gap-6 p-10 rounded-[3rem] bg-premium-charcoal border-4 border-premium-gold shadow-gold"
        style={{ background: 'linear-gradient(145deg, #1a1a1d 0%, #18181B 60%, #121214 100%)' }}
      >
        {/* Gold corner accents */}
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-premium-gold/60 rounded-tl-xl" />
        <div className="absolute top-4 right-16 w-6 h-6 border-t-2 border-r-2 border-premium-gold/60 rounded-tr-xl" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-premium-gold/60 rounded-bl-xl" />
        <div className="absolute bottom-4 right-16 w-6 h-6 border-b-2 border-r-2 border-premium-gold/60 rounded-br-xl" />

        {/* 3 reels */}
        <div className="flex items-start gap-4">
          <Reel items={tableItems} targetIndex={targetIdx[0]} spinState={spinState} stopPhase={1} label="Table" />
          <Reel items={catItems} targetIndex={targetIdx[1]} spinState={spinState} stopPhase={2} label="Category" />
          <Reel items={reelItems} targetIndex={targetIdx[2]} spinState={spinState} stopPhase={3} label="Winner" />
        </div>

        {/* Divider */}
        <div className="w-px h-32 bg-premium-borderDark self-center" />

        {/* Lever */}
        <Lever onPull={startSpin} disabled={spinState !== 'idle'} />
      </div>

      {/* Status / result text */}
      <div className="text-center space-y-2">
        {spinState === 'idle' && !winner && (
          <p className="text-sm text-zinc-500 font-mono">Pull the lever to draw a winner from {eligiblePool.length} eligible guests</p>
        )}
        {(spinState === 'spinning' || spinState === 'stopping1' || spinState === 'stopping2' || spinState === 'stopping3') && (
          <p className="text-sm text-premium-gold font-mono animate-pulse">
            {spinState === 'spinning' ? '🎰 Spinning…' : spinState === 'stopping1' ? '🔒 Locking Table…' : spinState === 'stopping2' ? '🔒 Locking Category…' : '🔒 Locking Winner…'}
          </p>
        )}
        {spinState === 'done' && pendingWinner && (
          <div className="space-y-2">
            <p className="text-2xl font-display font-bold text-premium-gold">🎉 {pendingWinner.name}</p>
            <p className="text-sm text-zinc-400 font-mono">Table {pendingWinner.table_number} · {pendingWinner.category}</p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-2 px-6 py-2 rounded-xl border border-premium-borderDark text-zinc-400 hover:text-white text-xs font-bold transition-all scale-on-click"
            >
              ↺ Draw Next Prize
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
