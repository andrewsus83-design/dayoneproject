'use client';

import React, { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import type { MachineProps } from './WheelSpinner';
import type { SlotEntry } from './SlotMachine';

/*
 * Layout is authored at a fixed 440px-wide size and scaled for the big screen.
 * Chamber (glass box) coordinates are in px relative to the chamber.
 */
const W = 440;
const CH = { left: 24, top: 70, width: 392, height: 290 };
const H = CH.top + CH.height + 120;
const BOX = 50;
const CHUTE_X = 46;
const CARRIAGE_H = 14;
const HEAD_H = 44;
const IDLE_CABLE = 24;
const GIFT_COLORS = ['#C5A059', '#FF3366', '#00F0FF', '#00E676', '#CC88FF', '#FF8C00', '#1B3FA0', '#7B1D5A'];

type Phase = 'idle' | 'shuffle' | 'move' | 'down' | 'grab' | 'up' | 'carry' | 'drop' | 'open' | 'done';

interface Box {
  id: string;
  name: string;
  x: number;
  y: number;
  rot: number;
  color: string;
}

function randomSpot() {
  return {
    x: 110 + Math.random() * (CH.width - 110 - BOX - 18),
    y: CH.height - BOX - 14 - Math.random() * 90,
    rot: Math.round((Math.random() - 0.5) * 40),
  };
}

function firstName(name: string) {
  return name.split(' ')[0].slice(0, 9);
}

function GiftCube({ size, color, label, style }: { size: number; color: string; label: string; style?: CSSProperties }) {
  const half = size / 2;
  const face: CSSProperties = { position: 'absolute', width: size, height: size, backfaceVisibility: 'hidden' };
  const ribbon = `linear-gradient(90deg, transparent 42%, rgba(255,255,255,0.85) 42%, rgba(255,255,255,0.85) 58%, transparent 58%)`;
  return (
    <div style={{ width: size, height: size, position: 'relative', transformStyle: 'preserve-3d', ...style }}>
      <div style={{ ...face, transform: `translateZ(${half}px)`, background: `${ribbon}, ${color}`, boxShadow: 'inset 0 0 12px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <span style={{ marginBottom: 3, padding: '1px 4px', borderRadius: 4, background: 'rgba(9,9,11,0.82)', color: '#fff', fontSize: Math.max(7, size / 6.5), fontWeight: 800, lineHeight: 1.1, maxWidth: size - 6, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {label}
        </span>
      </div>
      <div style={{ ...face, transform: `rotateY(180deg) translateZ(${half}px)`, background: color }} />
      <div style={{ ...face, transform: `rotateY(90deg) translateZ(${half}px)`, background: `${ribbon}, ${color}`, filter: 'brightness(0.72)' }} />
      <div style={{ ...face, transform: `rotateY(-90deg) translateZ(${half}px)`, background: color, filter: 'brightness(0.72)' }} />
      <div style={{ ...face, transform: `rotateX(90deg) translateZ(${half}px)`, background: `${ribbon}, linear-gradient(0deg, transparent 42%, rgba(255,255,255,0.85) 42%, rgba(255,255,255,0.85) 58%, transparent 58%), ${color}`, filter: 'brightness(1.15)' }} />
      <div style={{ ...face, transform: `rotateX(-90deg) translateZ(${half}px)`, background: color, filter: 'brightness(0.5)' }} />
    </div>
  );
}

export function ClawMachine3D({ entries, excludeIds = [], trigger, size = 'md', showButton = true, onSpinStart, onResult }: MachineProps) {
  const scale = size === 'lg' ? 1.55 : 1;
  const maxBoxes = 12;
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [clawX, setClawX] = useState(CH.width / 2);
  const [cable, setCable] = useState(IDLE_CABLE);
  const [open, setOpen] = useState(true);
  const [carried, setCarried] = useState<Box | null>(null);
  const [dropped, setDropped] = useState<Box | null>(null);
  const [winner, setWinner] = useState<SlotEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const layout = (list: SlotEntry[]) =>
    list.slice(0, maxBoxes).map((e, i) => ({ id: e.id, name: e.name, color: GIFT_COLORS[i % GIFT_COLORS.length], ...randomSpot() }));

  useEffect(() => {
    if (phase === 'idle' || phase === 'done') setBoxes(layout(entries));
    // Re-lay boxes only when the guest pool changes while idle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  const start = () => {
    if (phase !== 'idle' && phase !== 'done') return;
    const pool = entries.filter((e) => !excludeIds.includes(e.id));
    if (!pool.length) {
      setError(entries.length ? 'Everyone in the pool has already won.' : 'No guests to draw from yet.');
      return;
    }
    setError(null);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const win = pool[Math.floor(Math.random() * pool.length)];
    const others = entries.filter((e) => e.id !== win.id).sort(() => Math.random() - 0.5).slice(0, maxBoxes - 1);
    const fresh = layout([win, ...others].sort(() => Math.random() - 0.5));
    setBoxes(fresh);
    setWinner(null);
    setCarried(null);
    setDropped(null);
    setOpen(true);
    setCable(IDLE_CABLE);
    setClawX(CH.width / 2);
    setPhase('shuffle');
    onSpinStart?.();

    // 1. Shake the boxes around ("dikocok")
    let latest = fresh;
    for (let r = 1; r <= 6; r++) {
      at(r * 250, () => {
        latest = latest.map((b) => ({ ...b, ...randomSpot() }));
        setBoxes(latest);
      });
    }
    // 2. Move over the winning box
    at(1700, () => {
      const target = latest.find((b) => b.id === win.id) ?? latest[0];
      setPhase('move');
      setClawX(target.x + BOX / 2);
    });
    // 3. Lower the claw
    at(2700, () => {
      const target = latest.find((b) => b.id === win.id) ?? latest[0];
      setPhase('down');
      setCable(Math.max(IDLE_CABLE, target.y + 8 - HEAD_H - CARRIAGE_H));
    });
    // 4. Close the prongs and pick the box up
    at(3600, () => {
      setPhase('grab');
      setOpen(false);
    });
    at(4000, () => {
      const target = latest.find((b) => b.id === win.id) ?? latest[0];
      setCarried(target);
      setBoxes((prev) => prev.filter((b) => b.id !== target.id));
      setPhase('up');
      setCable(IDLE_CABLE);
    });
    // 5. Carry it to the prize chute
    at(4900, () => {
      setPhase('carry');
      setClawX(CHUTE_X);
    });
    // 6. Release — the box drops into the chute
    at(5900, () => {
      setPhase('drop');
      setOpen(true);
      setCarried((c) => {
        if (c) setDropped(c);
        return null;
      });
    });
    // 7. The box opens and the name appears
    at(6600, () => setPhase('open'));
    at(7700, () => {
      setPhase('done');
      setWinner(win);
      onResult?.({ mode: 'name', label: win.name, entry: win });
    });
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

  const busy = phase !== 'idle' && phase !== 'done';
  const prong = (side: -1 | 1): CSSProperties => ({
    position: 'absolute',
    top: 22,
    left: '50%',
    width: 5,
    height: 30,
    marginLeft: side === -1 ? -14 : 9,
    borderRadius: 4,
    background: 'linear-gradient(180deg, #E4E4E7, #71717A)',
    transformOrigin: 'top center',
    transform: `rotate(${side * (open ? 28 : 6)}deg)`,
    transition: 'transform 0.3s ease',
  });

  return (
    <div className="flex flex-col items-center gap-5">
      <div style={{ width: W * scale, height: H * scale }}>
        <div className="relative select-none" style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {/* Cabinet */}
          <div className="absolute inset-0 rounded-[28px] border-4 border-premium-gold shadow-gold" style={{ background: 'linear-gradient(160deg, #26262B 0%, #18181B 45%, #0D0D10 100%)' }} />
          {/* Marquee */}
          <div className="absolute left-6 right-6 top-3 h-12 rounded-2xl flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(90deg, #7B1D5A, #C5A059, #7B1D5A)' }}>
            <span className="font-display font-black text-black tracking-[0.25em] text-sm">★ CLAW OF FORTUNE ★</span>
            <div className="absolute inset-x-0 bottom-0 flex justify-around">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full ${busy && i % 2 === (phase === 'shuffle' ? 0 : 1) ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          </div>

          {/* Glass chamber */}
          <div
            className="absolute overflow-hidden rounded-xl"
            style={{ left: CH.left, top: CH.top, width: CH.width, height: CH.height, perspective: 900, background: 'linear-gradient(180deg, #121214 0%, #1D1A24 60%, #2A2233 100%)', boxShadow: 'inset 0 0 30px rgba(0,0,0,0.9)' }}
          >
            {/* Back wall lights */}
            <div className="absolute inset-x-0 top-0 h-full opacity-30" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(197,160,89,0.5), transparent 40%), radial-gradient(circle at 75% 35%, rgba(0,240,255,0.35), transparent 40%)' }} />
            {/* Floor */}
            <div className="absolute inset-x-0 bottom-0 h-24" style={{ background: 'linear-gradient(180deg, transparent, rgba(197,160,89,0.18))' }} />
            {/* Prize chute */}
            <div className="absolute bottom-0 rounded-t-lg border-2 border-premium-gold/60 border-b-0" style={{ left: CHUTE_X - 34, width: 68, height: 62, background: 'rgba(0,0,0,0.65)' }}>
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-widest text-premium-gold">PRIZE</span>
            </div>
            {/* Rail */}
            <div className="absolute inset-x-2 top-0 h-2 rounded-full" style={{ background: 'linear-gradient(90deg, #71717A, #E4E4E7, #71717A)' }} />

            {/* Gift boxes */}
            {boxes
              .slice()
              .sort((a, b) => a.y - b.y)
              .map((b) => (
                <div
                  key={b.id}
                  className="absolute"
                  style={{ left: b.x, top: b.y, transition: 'left 0.24s ease, top 0.24s ease, transform 0.24s ease', transform: `rotateZ(${b.rot / 6}deg)`, zIndex: Math.round(b.y) }}
                >
                  <GiftCube size={BOX} color={b.color} label={firstName(b.name)} style={{ transform: `rotateX(-14deg) rotateY(${30 + b.rot}deg)` }} />
                </div>
              ))}

            {/* Falling box in the chute */}
            {dropped && (
              <div
                className="absolute"
                style={{
                  left: CHUTE_X - BOX / 2,
                  top: phase === 'drop' ? CH.height - BOX - 10 : CH.height + 40,
                  transition: 'top 0.5s cubic-bezier(0.5, 0, 1, 1)',
                  zIndex: 500,
                  opacity: phase === 'open' || phase === 'done' ? 0 : 1,
                }}
              >
                <GiftCube size={BOX} color={dropped.color} label={firstName(dropped.name)} style={{ transform: 'rotateX(-14deg) rotateY(30deg)' }} />
              </div>
            )}

            {/* Claw */}
            <div className="absolute top-0" style={{ left: clawX, transform: 'translateX(-50%)', transition: 'left 0.9s ease-in-out', zIndex: 600, width: 60 }}>
              <div className="mx-auto rounded-md" style={{ width: 36, height: CARRIAGE_H, background: 'linear-gradient(180deg, #E4E4E7, #52525B)' }} />
              <div className="mx-auto" style={{ width: 3, height: cable, background: '#A1A1AA', transition: 'height 0.8s ease-in-out' }} />
              <div className="relative mx-auto" style={{ width: 60, height: HEAD_H }}>
                <div className="absolute left-1/2 -translate-x-1/2 top-0 rounded-full border-2 border-premium-gold" style={{ width: 28, height: 24, background: 'radial-gradient(circle at 35% 30%, #F4E3B5, #C5A059 60%, #7A5C2E)' }} />
                <span style={prong(-1)} />
                <span style={prong(1)} />
                {carried && (
                  <div className="absolute left-1/2" style={{ top: 26, marginLeft: -BOX / 2 }}>
                    <GiftCube size={BOX} color={carried.color} label={firstName(carried.name)} style={{ transform: 'rotateX(-14deg) rotateY(30deg)' }} />
                  </div>
                )}
              </div>
            </div>

            {/* Glass reflection */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 30%, transparent 31%, transparent 62%, rgba(255,255,255,0.06) 63%, transparent 72%)', zIndex: 700 }} />
          </div>

          {/* Control panel */}
          <div className="absolute left-6 right-6 rounded-2xl border border-premium-borderDark flex items-center justify-between px-6" style={{ top: CH.top + CH.height + 16, height: 84, background: 'linear-gradient(180deg, #1F1F23, #121214)' }}>
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full bg-premium-black border border-premium-borderDark flex items-center justify-center">
                <span className="w-3 h-8 rounded-full bg-zinc-400 origin-bottom" style={{ transform: `rotate(${phase === 'move' ? 25 : phase === 'carry' ? -25 : 0}deg)`, transition: 'transform 0.3s' }} />
                <span className="absolute top-1 w-5 h-5 rounded-full bg-premium-danger" style={{ transform: `translateX(${phase === 'move' ? 8 : phase === 'carry' ? -8 : 0}px)`, transition: 'transform 0.3s' }} />
              </div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                {phase === 'idle' ? 'Ready' : phase === 'shuffle' ? 'Shuffling gifts…' : phase === 'done' ? 'Winner!' : phase === 'open' ? 'Opening…' : 'Grabbing…'}
              </span>
            </div>
            <button
              type="button"
              onClick={start}
              disabled={busy}
              className={`w-16 h-16 rounded-full border-4 font-display font-black text-[11px] scale-on-click ${busy ? 'bg-zinc-700 border-zinc-600 text-zinc-400' : 'bg-premium-danger border-[#ff8fab] text-white shadow-[0_0_24px_rgba(255,51,102,0.6)]'}`}
              aria-label="Grab a gift"
            >
              GRAB
            </button>
          </div>

          {/* Reveal: the gift opens and the name appears */}
          {(phase === 'open' || phase === 'done') && dropped && (
            <div className="absolute inset-0 z-[900] flex flex-col items-center justify-center rounded-[28px]" style={{ background: 'radial-gradient(circle at center, rgba(9,9,11,0.6), rgba(9,9,11,0.92))' }}>
              <div className="relative" style={{ width: 150, height: 170 }}>
                <div className="absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap" style={{ top: 0, animation: 'claw-name-rise 0.9s ease-out forwards' }}>
                  <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-premium-gold">Lucky guest</div>
                  <div className="font-display font-black text-white text-3xl drop-shadow-[0_0_18px_rgba(197,160,89,0.9)]">{dropped.name}</div>
                </div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: 120, height: 86 }}>
                  <div className="absolute inset-0 rounded-b-lg" style={{ background: `linear-gradient(90deg, transparent 43%, rgba(255,255,255,0.85) 43%, rgba(255,255,255,0.85) 57%, transparent 57%), ${dropped.color}`, boxShadow: 'inset 0 0 18px rgba(0,0,0,0.35)' }} />
                  <div className="absolute -top-4 -left-2 -right-2 h-6 rounded-md" style={{ background: `linear-gradient(90deg, transparent 43%, rgba(255,255,255,0.9) 43%, rgba(255,255,255,0.9) 57%, transparent 57%), ${dropped.color}`, filter: 'brightness(1.15)', animation: 'claw-lid-pop 0.6s ease-out forwards' }} />
                </div>
                <Sparkles className="absolute -left-6 top-10 w-6 h-6 text-premium-gold animate-pulse" />
                <Sparkles className="absolute -right-6 top-16 w-5 h-5 text-premium-neon animate-pulse" />
              </div>
            </div>
          )}
        </div>
      </div>
      {error && <p className="text-sm font-bold text-premium-danger">{error}</p>}
      {winner && phase === 'done' && (
        <div className="px-6 py-3 rounded-2xl border border-premium-gold/50 bg-premium-gold/10 text-center">
          <div className="text-[10px] font-mono uppercase text-premium-gold tracking-widest">Lucky guest</div>
          <div className={`font-display font-bold text-white ${size === 'lg' ? 'text-4xl' : 'text-xl'}`}>{winner.name}</div>
        </div>
      )}
      {showButton && (
        <button type="button" onClick={start} disabled={busy} className={`px-8 py-3 rounded-2xl font-display font-bold text-sm scale-on-click flex items-center gap-2 ${busy ? 'bg-zinc-700 text-zinc-400' : 'bg-premium-gold hover:bg-premium-goldHover text-black shadow-gold'}`}>
          <Gift className="w-4 h-4" /> {busy ? 'Grabbing…' : phase === 'done' ? 'Grab another gift' : 'Grab a gift'}
        </button>
      )}
    </div>
  );
}
