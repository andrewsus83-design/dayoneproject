'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import type { SlotEntry, SlotResult } from './SlotMachine';

const COLORS = ['#C5A059', '#00F0FF', '#FF3366', '#00E676', '#CC88FF', '#FF8C00', '#7B1D5A', '#0099DD', '#FFD700', '#1B3FA0'];
const MAX_SLICES = 24;

export interface MachineProps {
  entries: SlotEntry[];
  excludeIds?: string[];
  trigger?: number;
  size?: 'md' | 'lg';
  showButton?: boolean;
  onSpinStart?: () => void;
  onResult?: (r: SlotResult) => void;
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function WheelSpinner({ entries, excludeIds = [], trigger, size = 'md', showButton = true, onSpinStart, onResult }: MachineProps) {
  const px = size === 'lg' ? 520 : 300;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef(0);
  const animRef = useRef(0);
  const [slices, setSlices] = useState<SlotEntry[]>(() => entries.slice(0, MAX_SLICES));
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<SlotEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const draw = useCallback((rot: number, list: SlotEntry[]) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const cx = canvas.width / 2;
    const r = cx - 12;
    const count = Math.max(list.length, 1);
    const arc = (2 * Math.PI) / count;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(cx, cx, r + 6, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(197,160,89,0.55)';
    ctx.lineWidth = 8;
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
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.translate(cx, cx);
      ctx.rotate(a0 + arc / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.font = `bold ${Math.max(9, Math.min(size === 'lg' ? 20 : 13, (size === 'lg' ? 300 : 170) / count))}px Outfit, sans-serif`;
      ctx.fillText((list[i]?.name ?? '—').slice(0, 16), r - 14, 0);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(cx, cx, size === 'lg' ? 40 : 24, 0, 2 * Math.PI);
    ctx.fillStyle = '#09090B';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cx, size === 'lg' ? 30 : 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#C5A059';
    ctx.fill();
    ctx.fillStyle = '#09090B';
    ctx.font = `bold ${size === 'lg' ? 18 : 11}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('41', cx, cx);
  }, [size]);

  useEffect(() => {
    if (!spinning) {
      const next = entries.slice(0, MAX_SLICES);
      setSlices(next);
      draw(rotRef.current, next);
    }
  }, [entries, spinning, draw]);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const spin = () => {
    if (spinning) return;
    const pool = entries.filter((e) => !excludeIds.includes(e.id));
    if (!pool.length) {
      setError(entries.length ? 'Everyone in the pool has already won.' : 'No guests to draw from yet.');
      return;
    }
    setError(null);
    const win = pool[Math.floor(Math.random() * pool.length)];
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
    setSlices(list);
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
    spinRef.current();
  }, [trigger]);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative" style={{ width: px, height: px }}>
        <canvas ref={canvasRef} width={px} height={px} className="drop-shadow-2xl" />
        <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-0 h-0 border-t-[14px] border-t-transparent border-b-[14px] border-b-transparent border-r-[28px] border-r-premium-danger drop-shadow-[0_0_10px_rgba(255,51,102,0.8)]" />
      </div>
      {error && <p className="text-sm font-bold text-premium-danger">{error}</p>}
      {winner && !spinning && (
        <div className="px-6 py-3 rounded-2xl border border-premium-gold/50 bg-premium-gold/10 text-center">
          <div className="text-[10px] font-mono uppercase text-premium-gold tracking-widest">Lucky guest</div>
          <div className={`font-display font-bold text-white ${size === 'lg' ? 'text-4xl' : 'text-xl'}`}>{winner.name}</div>
        </div>
      )}
      {showButton && (
        <button type="button" onClick={spin} disabled={spinning} className={`px-8 py-3.5 rounded-2xl font-display font-bold text-sm scale-on-click flex items-center gap-2 ${spinning ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' : 'bg-premium-gold hover:bg-premium-goldHover text-black shadow-gold'}`}>
          {spinning ? <><RotateCcw className="w-4 h-4 animate-spin" /> Spinning…</> : <><Sparkles className="w-4 h-4" /> Spin the wheel</>}
        </button>
      )}
      {!entries.length && <p className="text-xs text-zinc-500">{slices.length === 0 ? 'Check guests in to fill the wheel.' : ''}</p>}
    </div>
  );
}
