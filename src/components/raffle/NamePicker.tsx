'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Sparkles, Trophy } from 'lucide-react';
import type { MachineProps } from './WheelSpinner';
import type { SlotEntry } from './SlotMachine';

export function NamePicker({ entries, excludeIds = [], trigger, size = 'md', showButton = true, onSpinStart, onResult }: MachineProps) {
  const [current, setCurrent] = useState<string>(entries[0]?.name ?? '—');
  const [running, setRunning] = useState(false);
  const [winner, setWinner] = useState<SlotEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const start = () => {
    if (running) return;
    const pool = entries.filter((e) => !excludeIds.includes(e.id));
    if (!pool.length) {
      setError(entries.length ? 'Everyone in the pool has already won.' : 'No guests to draw from yet.');
      return;
    }
    setError(null);
    setWinner(null);
    setRunning(true);
    onSpinStart?.();
    const win = pool[Math.floor(Math.random() * pool.length)];
    // Fast flicker that slows down, ending on the pre-picked winner.
    const steps = 34;
    let at = 0;
    for (let i = 0; i < steps; i++) {
      at += 50 + Math.pow(i / steps, 3) * 420;
      const last = i === steps - 1;
      const name = last ? win.name : entries[Math.floor(Math.random() * entries.length)].name;
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
    startRef.current();
  }, [trigger]);

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className={`w-full ${size === 'lg' ? 'max-w-3xl' : 'max-w-sm'} aspect-video rounded-[2rem] bg-premium-black border border-premium-borderDark overflow-hidden relative flex items-center justify-center`}>
        <div className={`absolute inset-0 transition-opacity ${running ? 'opacity-100 animate-pulse' : 'opacity-60'}`} style={{ background: 'radial-gradient(circle at center, rgba(197,160,89,0.35) 0%, transparent 70%)' }} />
        {running && (
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="absolute top-0 left-1/2 w-px bg-gradient-to-b from-premium-gold/40 to-transparent origin-top" style={{ height: '120%', transform: `rotate(${-30 + i * 12}deg)` }} />
            ))}
          </div>
        )}
        <div className="relative z-10 text-center px-8">
          {winner && !running ? (
            <>
              <Trophy className={`${size === 'lg' ? 'w-16 h-16' : 'w-10 h-10'} text-premium-gold mx-auto mb-2`} />
              <div className={`font-display font-bold text-premium-gold ${size === 'lg' ? 'text-6xl' : 'text-2xl'}`}>{winner.name}</div>
              <div className="text-xs text-zinc-400 mt-1">is the winner!</div>
            </>
          ) : (
            <div className={`font-display font-bold transition-all ${running ? 'text-white scale-110' : 'text-zinc-500'} ${size === 'lg' ? 'text-6xl' : 'text-2xl'}`}>{current}</div>
          )}
        </div>
      </div>
      {error && <p className="text-sm font-bold text-premium-danger">{error}</p>}
      {showButton && (
        <button type="button" onClick={start} disabled={running} className={`px-8 py-3 rounded-2xl font-display font-bold text-sm scale-on-click flex items-center gap-2 ${running ? 'bg-zinc-700 text-zinc-400' : 'bg-premium-gold hover:bg-premium-goldHover text-black shadow-gold'}`}>
          <Sparkles className="w-4 h-4" /> {running ? 'Picking…' : 'Pick a name'}
        </button>
      )}
    </div>
  );
}
