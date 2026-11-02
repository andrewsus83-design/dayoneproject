'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * md: dashboard preview · lg: stage display · xl: a full-HD ballroom screen. Every draw machine takes one, so the
 * slot machine, the wheel and the name picker come out the same size on the same screen.
 */
export type MachineSize = 'md' | 'lg' | 'xl';

const LEVER: Record<MachineSize, { unit: number; height: number }> = {
  md: { unit: 1, height: 240 },
  lg: { unit: 1.3, height: 340 },
  xl: { unit: 1.7, height: 440 },
};

/** A slimmer lever, for a machine that needs the room for itself (the wheel). */
const LEVER_COMPACT: Record<MachineSize, { unit: number; height: number }> = {
  md: { unit: 0.8, height: 190 },
  lg: { unit: 0.95, height: 250 },
  xl: { unit: 1.1, height: 300 },
};

function subscribeResize(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

function screenSize(): MachineSize {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w >= 1600 && h >= 960) return 'xl';
  if (w >= 1024 && h >= 800) return 'lg';
  return 'md';
}

/** The machine size for a big-screen page: as large as the window allows, so a TV gets the big machines and a laptop still fits. */
export function useScreenMachineSize(): MachineSize {
  return useSyncExternalStore(subscribeResize, screenSize, () => 'lg');
}

/**
 * The pull-the-lever control every draw machine shares. It also pulls by itself when a draw starts from somewhere
 * else (another tab, the server), so the audience always sees the lever go down.
 */
export function Lever({
  onPull, disabled, busy = false, size = 'md', compact = false, title,
}: { onPull: () => void; disabled: boolean; busy?: boolean; size?: MachineSize; compact?: boolean; title?: string }) {
  const { unit: u, height } = (compact ? LEVER_COMPACT : LEVER)[size];
  const travel = height - 70 * u;
  const [pulled, setPulled] = useState(false);
  const [wasBusy, setWasBusy] = useState(busy);
  if (busy !== wasBusy) {
    setWasBusy(busy);
    if (busy) setPulled(true);
  }
  useEffect(() => {
    if (!pulled) return;
    const t = window.setTimeout(() => setPulled(false), 700);
    return () => window.clearTimeout(t);
  }, [pulled]);

  const pull = () => {
    if (disabled) return;
    setPulled(true);
    onPull();
  };

  return (
    <button
      type="button"
      onClick={pull}
      disabled={disabled}
      aria-label="Pull the lever"
      title={title}
      className="relative flex flex-col items-center select-none shrink-0 disabled:cursor-not-allowed scale-on-click"
      style={{ height, width: 56 * u }}
    >
      <span
        className="absolute left-1/2 -translate-x-1/2 rounded-full bg-premium-surfaceDark border border-premium-borderDark"
        style={{ top: 24 * u, bottom: 24 * u, width: 8 * u }}
      />
      <span
        className="absolute left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-b from-zinc-300 to-zinc-600 shadow-lg transition-all duration-300 ease-out"
        style={{ width: 12 * u, top: pulled ? travel * 0.6 + 20 * u : 20 * u, height: pulled ? travel * 0.4 : travel }}
      />
      <span
        className={`absolute left-1/2 -translate-x-1/2 rounded-full border-2 transition-all duration-300 ease-out flex items-center justify-center ${
          disabled ? 'bg-zinc-700 border-zinc-600' : 'bg-premium-gold border-premium-goldHover shadow-gold'
        }`}
        style={{ width: 44 * u, height: 44 * u, top: pulled ? travel : 0 }}
      >
        <span className="rounded-full bg-white/30" style={{ width: 16 * u, height: 16 * u }} />
      </span>
      <span
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark"
        style={{ width: 44 * u, height: 20 * u }}
      />
    </button>
  );
}

const CABINET_PAD: Record<MachineSize, string> = { md: 'p-6 gap-6', lg: 'p-10 gap-6', xl: 'p-12 gap-8' };
/** Less frame around a round machine (the wheel), whose corners are empty anyway: more of the screen goes to the wheel. */
const CABINET_TIGHT: Record<MachineSize, string> = { md: 'p-4 gap-4', lg: 'p-5 gap-5', xl: 'p-6 gap-6' };

/** The gold machine cabinet: the machine on the left, the lever on the right. The same frame for every draw style. */
export function MachineCabinet({
  size = 'md', tight = false, lever, className = '', children,
}: { size?: MachineSize; tight?: boolean; lever?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`relative flex items-center rounded-[2.5rem] border-4 border-premium-gold shadow-gold max-w-full ${(tight ? CABINET_TIGHT : CABINET_PAD)[size]} ${className}`}
      style={{ background: 'linear-gradient(145deg, #1D1D20 0%, #18181B 55%, #121214 100%)' }}
    >
      <span className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-premium-gold/60 rounded-tl-xl" />
      <span className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-premium-gold/60 rounded-tr-xl" />
      <span className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-premium-gold/60 rounded-bl-xl" />
      <span className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-premium-gold/60 rounded-br-xl" />
      {children}
      {lever && (
        <>
          <span className="w-px self-stretch bg-premium-borderDark" />
          {lever}
        </>
      )}
    </div>
  );
}

const HINT_TEXT: Record<MachineSize, string> = { md: 'text-sm', lg: 'text-lg', xl: 'text-2xl' };

/** The line under a machine while there is no winner to show: what went wrong, that it is drawing, or what to do next. */
export function MachineHint({
  size = 'md', error, asking = false, spinning = false, lockedNote, idle,
}: { size?: MachineSize; error?: string | null; asking?: boolean; spinning?: boolean; lockedNote?: string; idle: string }) {
  const text = HINT_TEXT[size];
  if (error) return <p className={`${text} font-bold text-premium-danger`}>{error}</p>;
  if (asking) return <p className={`${text} font-mono text-premium-gold animate-pulse`}>Drawing…</p>;
  if (spinning) return <p className={`${text} font-mono text-premium-gold animate-pulse`}>Spinning…</p>;
  return <p className={`${text} font-mono ${lockedNote ? 'text-premium-gold' : 'text-zinc-500'}`}>{lockedNote ?? idle}</p>;
}
