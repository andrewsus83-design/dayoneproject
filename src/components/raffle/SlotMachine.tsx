'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SlotMode } from '@/lib/eventStore';

export interface SlotEntry {
  id: string;
  name: string;
}

export interface SlotResult {
  mode: SlotMode;
  label: string;
  number?: number;
  entry?: SlotEntry;
}

interface SlotMachineProps {
  mode: SlotMode;
  totalNumbers: number;
  /** Only these numbers can be drawn (e.g. real guest numbers). Omit to draw from 1–totalNumbers. */
  numbers?: number[];
  /** Guest behind each number, so a number draw can also reveal who won. */
  numberEntries?: Record<number, SlotEntry>;
  /** Reel count override, e.g. 4 reels for 1,300 guests. */
  digits?: number;
  /** Show the winner's name under the lucky number. */
  revealName?: boolean;
  excludeNumbers?: number[];
  entries?: SlotEntry[];
  excludeIds?: string[];
  size?: 'md' | 'lg';
  trigger?: number;
  showLever?: boolean;
  showResult?: boolean;
  onSpinStart?: () => void;
  onResult?: (result: SlotResult) => void;
}

const SIZES = {
  md: { cellH: 84, digitW: 72, nameW: 380, digitText: 'text-5xl', nameText: 'text-2xl', gap: 'gap-2.5', pad: 'p-6' },
  lg: { cellH: 128, digitW: 112, nameW: 680, digitText: 'text-8xl', nameText: 'text-5xl', gap: 'gap-4', pad: 'p-10' },
};

const EASE = 'cubic-bezier(0.12, 0.72, 0.16, 1)';
const NAME_IDLE = '★ LUCKY DRAW ★';

function digitCount(total: number) {
  return Math.max(1, String(Math.max(1, Math.floor(total))).length);
}

function idleStrips(mode: SlotMode, reels: number): string[][] {
  return mode === 'number' ? Array.from({ length: reels }, () => ['9', '0', '1']) : [['', NAME_IDLE, '']];
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function Reel({
  strip, stopIndex, animateId, resetKey, duration, cellH, width, textClass, isName, state, onStopped,
}: {
  strip: string[];
  stopIndex: number;
  animateId: number;
  resetKey: string;
  duration: number;
  cellH: number;
  width: string;
  textClass: string;
  isName: boolean;
  state: 'idle' | 'spinning' | 'landed';
  onStopped: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const stoppedRef = useRef(onStopped);
  useLayoutEffect(() => {
    stoppedRef.current = onStopped;
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = 'translateY(0px)';
    if (!animateId) return;
    void el.offsetHeight;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      stoppedRef.current();
    };
    const onEnd = (e: TransitionEvent) => {
      if (e.target === el && e.propertyName === 'transform') finish();
    };
    el.addEventListener('transitionend', onEnd);
    const raf = requestAnimationFrame(() => {
      el.style.transition = `transform ${duration}ms ${EASE}`;
      el.style.transform = `translateY(-${(stopIndex - 1) * cellH}px)`;
    });
    // Backup in case the browser skips transitionend (e.g. a hidden tab).
    const fallback = window.setTimeout(finish, duration + 1500);
    return () => {
      finished = true;
      el.removeEventListener('transitionend', onEnd);
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
    };
    // Only a new spin or a layout change should restart the reel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateId, resetKey]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 bg-premium-black shadow-[inset_0_8px_24px_rgba(0,0,0,0.8)] transition-colors ${
        state === 'landed' ? 'border-premium-gold' : state === 'spinning' ? 'border-premium-neon/60' : 'border-premium-borderDark'
      }`}
      style={{ width, height: cellH * 3 }}
    >
      <div className="absolute inset-x-0 top-0 z-10 pointer-events-none bg-gradient-to-b from-premium-black via-premium-black/70 to-transparent" style={{ height: cellH * 0.9 }} />
      <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none bg-gradient-to-t from-premium-black via-premium-black/70 to-transparent" style={{ height: cellH * 0.9 }} />
      <div className="absolute inset-x-0 z-20 pointer-events-none" style={{ top: cellH, height: cellH }}>
        <div className={`h-full border-y-2 ${state === 'landed' ? 'border-premium-gold bg-premium-gold/10' : 'border-premium-gold/40'}`} />
      </div>
      <div ref={ref} className="flex flex-col will-change-transform">
        {strip.map((item, i) => (
          <div key={i} className="flex items-center justify-center select-none" style={{ height: cellH, minHeight: cellH }}>
            <span
              className={`${textClass} font-bold leading-none tabular-nums ${isName ? 'font-display truncate px-6 tracking-tight' : 'font-mono'} ${
                state === 'landed' ? 'text-premium-gold' : 'text-white'
              }`}
            >
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Lever({ onPull, disabled, height }: { onPull: () => void; disabled: boolean; height: number }) {
  const [pulled, setPulled] = useState(false);
  const travel = height - 70;
  const pull = () => {
    if (disabled) return;
    setPulled(true);
    onPull();
    setTimeout(() => setPulled(false), 700);
  };
  return (
    <button
      type="button"
      onClick={pull}
      disabled={disabled}
      aria-label="Pull the lever"
      className="relative flex flex-col items-center select-none disabled:cursor-not-allowed scale-on-click"
      style={{ height, width: 56 }}
    >
      <span className="absolute left-1/2 -translate-x-1/2 top-6 bottom-6 w-2 rounded-full bg-premium-surfaceDark border border-premium-borderDark" />
      <span
        className="absolute left-1/2 -translate-x-1/2 w-3 rounded-full bg-gradient-to-b from-zinc-300 to-zinc-600 shadow-lg transition-all duration-300 ease-out"
        style={{ top: pulled ? travel * 0.6 + 20 : 20, height: pulled ? travel * 0.4 : travel }}
      />
      <span
        className={`absolute left-1/2 -translate-x-1/2 w-11 h-11 rounded-full border-2 transition-all duration-300 ease-out flex items-center justify-center ${
          disabled ? 'bg-zinc-700 border-zinc-600' : 'bg-premium-gold border-premium-goldHover shadow-gold'
        }`}
        style={{ top: pulled ? travel : 0 }}
      >
        <span className="w-4 h-4 rounded-full bg-white/30" />
      </span>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-11 h-5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark" />
    </button>
  );
}

export function SlotMachine({
  mode, totalNumbers, numbers, numberEntries, digits: digitsOverride, revealName = false, excludeNumbers = [], entries = [], excludeIds = [],
  size = 'md', trigger, showLever = true, showResult = true, onSpinStart, onResult,
}: SlotMachineProps) {
  const s = SIZES[size];
  const maxNumber = numbers ? numbers.reduce((m, n) => Math.max(m, n), 1) : totalNumbers;
  const digits = Math.max(digitsOverride ?? 1, digitCount(maxNumber));
  const reelCount = mode === 'number' ? digits : 1;
  const layoutKey = `${mode}-${reelCount}`;

  const [spin, setSpin] = useState<{ id: number; key: string; strips: string[][]; stops: number[] } | null>(null);
  const [landed, setLanded] = useState<boolean[]>([]);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'done'>('idle');
  const [result, setResult] = useState<SlotResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const restingRef = useRef<{ key: string; values: string[] }>({ key: '', values: [] });
  const pendingRef = useRef<SlotResult | null>(null);
  const stoppedRef = useRef(0);

  const active = spin && spin.key === layoutKey ? spin : null;
  const shownPhase = active ? phase : 'idle';
  const shownResult = active && result?.mode === mode ? result : null;
  const strips = active ? active.strips : idleStrips(mode, reelCount);
  const durations = Array.from({ length: reelCount }, (_, i) => (mode === 'number' ? 2200 + i * 850 : 4800));

  const start = () => {
    if (phase === 'spinning') return;
    const resting = restingRef.current.key === layoutKey
      ? restingRef.current.values
      : mode === 'number' ? Array(reelCount).fill('0') : [NAME_IDLE];

    let res: SlotResult;
    let nextStrips: string[][];

    if (mode === 'number') {
      const excluded = new Set(excludeNumbers);
      let n = 0;
      if (numbers) {
        const open = numbers.filter((c) => !excluded.has(c));
        if (open.length) n = pick(open);
      } else {
        const total = Math.max(1, Math.floor(totalNumbers));
        for (let i = 0; i < 400 && !n; i++) {
          const c = 1 + Math.floor(Math.random() * total);
          if (!excluded.has(c)) n = c;
        }
        for (let c = 1; c <= total && !n; c++) if (!excluded.has(c)) n = c;
      }
      if (!n) {
        setError(numbers && numbers.length === 0
          ? 'No checked-in guests to draw from yet.'
          : 'Every number has already been drawn. Reset the draws to start again.');
        return;
      }
      const label = String(n).padStart(digits, '0');
      res = { mode, label, number: n, entry: numberEntries?.[n] };
      nextStrips = label.split('').map((t, i) => {
        const cur = Number(resting[i] ?? 0) || 0;
        const target = Number(t);
        const steps = (3 + i) * 10 + ((target - cur + 10) % 10);
        const strip = [String((cur + 9) % 10)];
        for (let k = 0; k <= steps; k++) strip.push(String((cur + k) % 10));
        strip.push(String((target + 1) % 10));
        return strip;
      });
      restingRef.current = { key: layoutKey, values: label.split('') };
    } else {
      const pool = entries.filter((e) => !excludeIds.includes(e.id));
      if (pool.length === 0) {
        setError(entries.length ? 'Every guest in the pool has already won. Reset the draws to start again.' : 'No checked-in guests to draw from yet.');
        return;
      }
      const winner = pick(pool);
      res = { mode, label: winner.name, entry: winner };
      const names = entries.map((e) => e.name);
      const fill = Array.from({ length: 30 }, () => pick(names));
      nextStrips = [[pick(names), resting[0] ?? NAME_IDLE, ...fill, winner.name, pick(names)]];
      restingRef.current = { key: layoutKey, values: [winner.name] };
    }

    pendingRef.current = res;
    stoppedRef.current = 0;
    setError(null);
    setResult(null);
    setLanded(Array(reelCount).fill(false));
    setPhase('spinning');
    setSpin((prev) => ({ id: (prev?.id ?? 0) + 1, key: layoutKey, strips: nextStrips, stops: nextStrips.map((st) => st.length - 2) }));
    onSpinStart?.();
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

  const handleStopped = (i: number) => {
    setLanded((prev) => {
      const next = [...prev];
      next[i] = true;
      return next;
    });
    stoppedRef.current += 1;
    if (stoppedRef.current >= reelCount && pendingRef.current) {
      const r = pendingRef.current;
      pendingRef.current = null;
      setPhase('done');
      setResult(r);
      onResult?.(r);
    }
  };

  const rangeLabel = numbers
    ? `${numbers.filter((n) => !excludeNumbers.includes(n)).length} guest numbers`
    : `numbers ${'1'.padStart(digits, '0')}–${String(Math.max(1, Math.floor(totalNumbers))).padStart(digits, '0')}`;
  const reelHeight = s.cellH * 3;

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div
        className={`relative flex items-center gap-6 rounded-[2.5rem] border-4 border-premium-gold shadow-gold ${s.pad} max-w-full`}
        style={{ background: 'linear-gradient(145deg, #1D1D20 0%, #18181B 55%, #121214 100%)' }}
      >
        <span className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-premium-gold/60 rounded-tl-xl" />
        <span className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-premium-gold/60 rounded-tr-xl" />
        <span className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-premium-gold/60 rounded-bl-xl" />
        <span className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-premium-gold/60 rounded-br-xl" />

        <div className={`flex items-center ${s.gap}`}>
          {strips.map((strip, i) => (
            <Reel
              key={`${layoutKey}-${i}`}
              strip={strip}
              stopIndex={active ? active.stops[i] : 1}
              animateId={active ? active.id : 0}
              resetKey={layoutKey}
              duration={durations[i]}
              cellH={s.cellH}
              width={mode === 'number' ? `${s.digitW}px` : `min(${s.nameW}px, 70vw)`}
              textClass={mode === 'number' ? s.digitText : s.nameText}
              isName={mode === 'name'}
              state={shownPhase === 'spinning' ? (landed[i] ? 'landed' : 'spinning') : shownPhase === 'done' ? 'landed' : 'idle'}
              onStopped={() => handleStopped(i)}
            />
          ))}
        </div>

        {showLever && (
          <>
            <span className="w-px self-stretch bg-premium-borderDark" />
            <Lever onPull={start} disabled={phase === 'spinning'} height={Math.min(reelHeight, 240)} />
          </>
        )}
      </div>

      {showResult && (
        <div className="text-center space-y-1 min-h-[3.5rem]">
          {error ? (
            <p className="text-sm font-bold text-premium-danger">{error}</p>
          ) : shownPhase === 'spinning' ? (
            <p className="text-sm font-mono text-premium-gold animate-pulse">Spinning…</p>
          ) : shownPhase === 'done' && shownResult ? (
            <>
              <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-zinc-500">{shownResult.mode === 'number' ? 'Lucky number' : 'Lucky guest'}</p>
              <p className={`font-display font-bold text-premium-gold ${size === 'lg' ? 'text-5xl' : 'text-3xl'} ${shownResult.mode === 'number' ? 'font-mono tracking-[0.2em]' : ''}`}>
                {shownResult.label}
              </p>
              {revealName && shownResult.mode === 'number' && shownResult.entry && (
                <p className={`font-display font-medium text-white ${size === 'lg' ? 'text-3xl' : 'text-xl'}`}>{shownResult.entry.name}</p>
              )}
            </>
          ) : (
            <p className="text-sm font-mono text-zinc-500">
              {mode === 'number'
                ? `Pull the lever · ${rangeLabel} · ${reelCount} reel${reelCount === 1 ? '' : 's'}`
                : `Pull the lever · ${entries.length - excludeIds.filter((id) => entries.some((e) => e.id === id)).length} guest${entries.length === 1 ? '' : 's'} in the draw`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
