'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import { chooseWinner, type MachineProps } from './WheelSpinner';
import type { SlotEntry } from './SlotMachine';
import { Lever, MachineCabinet, MachineHint } from './MachineCabinet';

const PICKER = {
  md: { cabinet: 'w-full max-w-md', ratio: 'aspect-[4/3]', name: 'text-2xl', trophy: 'w-10 h-10', sub: 'text-xs', maxH: undefined },
  lg: { cabinet: 'w-full max-w-4xl', ratio: 'aspect-video', name: 'text-6xl', trophy: 'w-16 h-16', sub: 'text-lg', maxH: 'max(260px, calc(100dvh - 440px))' },
  xl: { cabinet: 'w-full max-w-6xl', ratio: 'aspect-video', name: 'text-7xl', trophy: 'w-20 h-20', sub: 'text-2xl', maxH: 'max(300px, calc(100dvh - 480px))' },
};

export function NamePicker({ entries, excludeIds = [], trigger, size = 'md', showButton = true, lockedNote, resolve, onSpinStart, onResult }: MachineProps) {
  const p = PICKER[size];
  const [current, setCurrent] = useState<string>(entries[0]?.name ?? '—');
  const [running, setRunning] = useState(false);
  const [winner, setWinner] = useState<SlotEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const timers = useRef<number[]>([]);
  const askingRef = useRef(false);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const start = async () => {
    if (running || askingRef.current) return;
    askingRef.current = true;
    if (resolve) setAsking(true);
    const win = await chooseWinner(entries, excludeIds, resolve, setError);
    askingRef.current = false;
    if (resolve) setAsking(false);
    if (!win) return;
    setWinner(null);
    setRunning(true);
    onSpinStart?.();
    const names = entries.length ? entries : [win];
    // Fast flicker that slows down, ending on the pre-picked winner.
    const steps = 34;
    let at = 0;
    for (let i = 0; i < steps; i++) {
      at += 50 + Math.pow(i / steps, 3) * 420;
      const last = i === steps - 1;
      const name = last ? win.name : names[Math.floor(Math.random() * names.length)].name;
      timers.current.push(window.setTimeout(() => {
        setCurrent(name);
        if (last) {
          setRunning(false);
          setWinner(win);
          onResult?.({ mode: 'name', label: win.name, entry: win });
        }
      }, at));
    }
  };

  const startRef = useRef(start);
  useLayoutEffect(() => {
    startRef.current = start;
  });
  const lastTrigger = useRef(trigger);
  useEffect(() => {
    if (trigger === undefined || trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;
    void startRef.current();
  }, [trigger]);

  const left = entries.filter((e) => !excludeIds.includes(e.id)).length;
  const idleHint = entries.length ? `Pull the lever · ${left} guest${left === 1 ? '' : 's'} in the draw` : 'Check guests in to fill the picker.';
  const busy = running || asking;

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <MachineCabinet
        size={size}
        className={p.cabinet}
        lever={showButton ? <Lever size={size} onPull={() => void start()} disabled={busy || !!lockedNote} busy={busy} title={lockedNote} /> : undefined}
      >
        <div
          className={`flex-1 min-w-0 ${p.ratio} rounded-[2rem] bg-premium-black border border-premium-borderDark overflow-hidden relative flex items-center justify-center`}
          style={{ maxHeight: p.maxH }}
        >
          <div className={`absolute inset-0 transition-opacity ${running ? 'opacity-100 animate-pulse' : 'opacity-60'}`} style={{ background: 'radial-gradient(circle at center, rgba(197,160,89,0.35) 0%, transparent 70%)' }} />
          {running && (
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="absolute top-0 left-1/2 w-px bg-gradient-to-b from-premium-gold/40 to-transparent origin-top" style={{ height: '120%', transform: `rotate(${-30 + i * 12}deg)` }} />
              ))}
            </div>
          )}
          <div className="relative z-10 text-center px-4">
            {winner && !running ? (
              <>
                <Trophy className={`${p.trophy} text-premium-gold mx-auto mb-2`} />
                <div className={`font-display font-bold leading-tight text-premium-gold ${p.name}`}>{winner.name}</div>
                <div className={`${p.sub} text-zinc-400 mt-1`}>is the winner!</div>
              </>
            ) : (
              <div className={`font-display font-bold leading-tight transition-all ${running ? 'text-white scale-110' : 'text-zinc-500'} ${p.name}`}>{current}</div>
            )}
          </div>
        </div>
      </MachineCabinet>
      <div className="text-center min-h-[3.5rem]">
        {(error || asking || running || lockedNote || !winner) && (
          <MachineHint size={size} error={error} asking={asking} spinning={running} lockedNote={lockedNote} idle={idleHint} />
        )}
      </div>
    </div>
  );
}
