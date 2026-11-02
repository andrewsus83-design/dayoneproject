'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { askForPick, type PickResolver, type SlotEntry, type SlotResult } from './SlotMachine';
import { Lever, MachineCabinet, MachineHint, type MachineSize } from './MachineCabinet';

const COLORS = ['#C5A059', '#00F0FF', '#FF3366', '#00E676', '#CC88FF', '#FF8C00', '#7B1D5A', '#0099DD', '#FFD700', '#1B3FA0'];
const MAX_SLICES = 24;

/**
 * Canvas resolution per size. On a big screen the wheel takes the window's height minus what the page needs around it
 * (header, title, one status line), so it is as large as it can be without scrolling. A page with more around the
 * machine sets --wheel-reserve (the stage page does).
 */
const WHEEL = {
  md: { px: 340, shown: 'min(340px, max(180px, calc(100vw - 190px)))', pointer: [15, 30], winner: 'text-xl' },
  lg: { px: 640, shown: 'min(640px, max(320px, calc(100dvh - var(--wheel-reserve, 410px))))', pointer: [22, 44], winner: 'text-3xl' },
  xl: { px: 900, shown: 'min(900px, max(360px, calc(100dvh - var(--wheel-reserve, 410px))))', pointer: [28, 56], winner: 'text-4xl' },
};

export interface MachineProps {
  entries: SlotEntry[];
  excludeIds?: string[];
  trigger?: number;
  size?: MachineSize;
  /** Show the lever that starts the draw. Off when something else (a button, a remote trigger) starts it. */
  showButton?: boolean;
  /** Set when no more draws are allowed (e.g. every winner is drawn): the lever locks and this says why. */
  lockedNote?: string;
  /** Saved events: the server picks the winner, the machine lands on it. */
  resolve?: PickResolver;
  onSpinStart?: () => void;
  onResult?: (r: SlotResult) => void;
}

/**
 * The winner of one spin: the server's pick when the machine has a resolver, else a random entry not yet excluded.
 * Null when there is none (setError says why).
 */
export async function chooseWinner(
  entries: SlotEntry[], excludeIds: string[], resolve: PickResolver | undefined, setError: (message: string | null) => void,
): Promise<SlotEntry | null> {
  setError(null);
  const forced = await askForPick(resolve, setError);
  if (forced === null) return null;
  if (forced) {
    if (!forced.entry) setError('The draw did not return a guest. Try again.');
    return forced.entry ?? null;
  }
  const pool = entries.filter((e) => !excludeIds.includes(e.id));
  if (!pool.length) {
    setError(entries.length ? 'Everyone in the pool has already won.' : 'No guests to draw from yet.');
    return null;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function WheelSpinner({ entries, excludeIds = [], trigger, size = 'md', showButton = true, lockedNote, resolve, onSpinStart, onResult }: MachineProps) {
  const wheel = WHEEL[size];
  const px = wheel.px;
  // Everything drawn on the canvas scales with the wheel (the md wheel is 300px).
  const k = px / 300;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef(0);
  const animRef = useRef(0);
  const askingRef = useRef(false);
  const [asking, setAsking] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<SlotEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const draw = useCallback((rot: number, list: SlotEntry[]) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const cx = canvas.width / 2;
    const r = cx - 12 * k;
    const count = Math.max(list.length, 1);
    const arc = (2 * Math.PI) / count;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(cx, cx, r + 6 * k, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(197,160,89,0.55)';
    ctx.lineWidth = 8 * k;
    ctx.stroke();
    for (let i = 0; i < count; i++) {
      const a0 = rot + i * arc;
      ctx.beginPath();
      ctx.moveTo(cx, cx);
      ctx.arc(cx, cx, r, a0, a0 + arc);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#09090B';
      ctx.lineWidth = 2 * k;
      ctx.stroke();
      ctx.save();
      ctx.translate(cx, cx);
      ctx.rotate(a0 + arc / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4 * k;
      ctx.font = `bold ${Math.max(9 * k, Math.min(13 * k, (170 * k) / count))}px Outfit, sans-serif`;
      ctx.fillText((list[i]?.name ?? '—').slice(0, k > 1 ? 20 : 16), r - 14 * k, 0);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(cx, cx, 24 * k, 0, 2 * Math.PI);
    ctx.fillStyle = '#09090B';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cx, 18 * k, 0, 2 * Math.PI);
    ctx.fillStyle = '#C5A059';
    ctx.fill();
    ctx.fillStyle = '#09090B';
    ctx.font = `bold ${11 * k}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('41', cx, cx);
  }, [k]);

  useEffect(() => {
    if (!spinning) {
      const next = entries.slice(0, MAX_SLICES);
      draw(rotRef.current, next);
    }
  }, [entries, spinning, draw]);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const spin = async () => {
    if (spinning || askingRef.current) return;
    askingRef.current = true;
    if (resolve) setAsking(true);
    const win = await chooseWinner(entries, excludeIds, resolve, setError);
    askingRef.current = false;
    if (resolve) setAsking(false);
    if (!win) return;
    const others = shuffle(entries.filter((e) => e.id !== win.id)).slice(0, MAX_SLICES - 1);
    const list = shuffle([...others, win]);
    const w = list.findIndex((e) => e.id === win.id);
    const arc = (2 * Math.PI) / list.length;
    const jitter = (Math.random() - 0.5) * arc * 0.6;
    // The pointer sits on the right (angle 0): bring the winner's slice centre there.
    const targetMod = ((-(w + 0.5) * arc + jitter) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const start = rotRef.current;
    const delta = (targetMod - (start % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const end = start + 7 * 2 * Math.PI + delta;
    const duration = 5200;
    const t0 = performance.now();
    setWinner(null);
    setSpinning(true);
    onSpinStart?.();
    const step = (now: number) => {
      const t = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      rotRef.current = start + (end - start) * ease;
      draw(rotRef.current, list);
      if (t < 1) animRef.current = requestAnimationFrame(step);
      else {
        setSpinning(false);
        setWinner(win);
        onResult?.({ mode: 'name', label: win.name, entry: win });
      }
    };
    animRef.current = requestAnimationFrame(step);
  };

  const spinRef = useRef(spin);
  useLayoutEffect(() => {
    spinRef.current = spin;
  });
  const lastTrigger = useRef(trigger);
  useEffect(() => {
    if (trigger === undefined || trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;
    void spinRef.current();
  }, [trigger]);

  const left = entries.filter((e) => !excludeIds.includes(e.id)).length;
  const idleHint = entries.length ? `Pull the lever · ${left} guest${left === 1 ? '' : 's'} in the draw` : 'Check guests in to fill the wheel.';
  const busy = spinning || asking;
  const [pointerH, pointerLen] = wheel.pointer;

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <MachineCabinet
        size={size}
        tight
        lever={showButton ? <Lever size={size} compact onPull={() => void spin()} disabled={busy || !!lockedNote} busy={busy} title={lockedNote} /> : undefined}
      >
        <div className="relative" style={{ width: wheel.shown, aspectRatio: '1 / 1' }}>
          <canvas ref={canvasRef} width={px} height={px} className="w-full h-full drop-shadow-2xl" />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0 h-0 border-t-transparent border-b-transparent border-r-premium-danger drop-shadow-[0_0_10px_rgba(255,51,102,0.8)]"
            style={{ right: -pointerLen * 0.3, borderTopWidth: pointerH, borderBottomWidth: pointerH, borderRightWidth: pointerLen }}
          />
        </div>
      </MachineCabinet>
      {/* Big screens: one status line, the winner's big card is the one beside the machine. */}
      <div className={`text-center ${size === 'md' ? 'min-h-[3.5rem]' : 'min-h-10 flex items-center justify-center'}`}>
        {winner && !spinning && !asking && !error ? (
          size === 'md' ? (
            <div className="px-6 py-3 rounded-2xl border border-premium-gold/50 bg-premium-gold/10 text-center">
              <div className="text-[10px] font-mono uppercase text-premium-gold tracking-widest">Lucky guest</div>
              <div className={`font-display font-bold text-white ${wheel.winner}`}>{winner.name}</div>
            </div>
          ) : (
            <p className={`font-display font-bold text-white leading-tight ${wheel.winner}`}>
              <span className="mr-3 align-middle text-xs font-mono uppercase tracking-widest text-premium-gold">Lucky guest</span>
              {winner.name}
            </p>
          )
        ) : (
          <MachineHint size={size} error={error} asking={asking} spinning={spinning} lockedNote={lockedNote} idle={idleHint} />
        )}
      </div>
    </div>
  );
}
