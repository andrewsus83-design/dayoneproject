'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  RotateCcw, Plus, Trash2, Play, Pause, Shuffle, Sparkles, Trophy,
  Hash, AlignLeft, Upload, Download, Settings2, Volume2, VolumeX,
  ChevronDown, Check, X, Users, Ticket, Star, Zap,
} from 'lucide-react';

/* ─── Shared entry pool ──────────────────────────────────── */

interface EntryPool {
  useGuests: boolean;
  customEntries: string[];
  useNumbers: boolean;
  numberFrom: number;
  numberTo: number;
}

/* ─── Wheel of Fortune ───────────────────────────────────── */

const WHEEL_COLORS = [
  '#C5A059', '#00F0FF', '#FF3366', '#10B981', '#3B82F6',
  '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16',
];

function WheelOfFortune({ entries }: { entries: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const animRef = useRef<number>(0);
  const startTime = useRef<number>(0);
  const targetRotation = useRef<number>(0);
  const baseRotation = useRef<number>(0);

  const drawWheel = useCallback((rot: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx - 8;
    const count = entries.length || 6;
    const arc = (2 * Math.PI) / count;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw shadow ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(197,160,89,0.3)';
    ctx.lineWidth = 6;
    ctx.stroke();

    for (let i = 0; i < count; i++) {
      const startA = rot + i * arc;
      const endA = startA + arc;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startA, endA);
      ctx.closePath();
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#09090B';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startA + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.min(11, 130 / count)}px Outfit, sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      const label = (entries[i] || `Prize ${i + 1}`).substring(0, 14);
      ctx.fillText(label, r - 12, 4);
      ctx.restore();
    }

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = '#09090B';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, 2 * Math.PI);
    ctx.fillStyle = '#C5A059';
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('41', cx, cy);

    // Pointer
    ctx.beginPath();
    ctx.moveTo(cx + r - 10, cy - 12);
    ctx.lineTo(cx + r + 10, cy);
    ctx.lineTo(cx + r - 10, cy + 12);
    ctx.closePath();
    ctx.fillStyle = '#C5A059';
    ctx.fill();
    ctx.shadowColor = 'rgba(197,160,89,0.8)';
    ctx.shadowBlur = 8;
    ctx.fill();
  }, [entries]);

  useEffect(() => {
    drawWheel(rotation);
  }, [rotation, entries, drawWheel]);

  const spin = () => {
    if (spinning) return;
    setWinner(null);
    setSpinning(true);
    const extra = 8 + Math.random() * 8; // 8–16 full spins
    targetRotation.current = baseRotation.current + extra * 2 * Math.PI;
    startTime.current = performance.now();
    const duration = 4000 + Math.random() * 2000;

    const animate = (now: number) => {
      const t = Math.min((now - startTime.current) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      const current = baseRotation.current + (targetRotation.current - baseRotation.current) * ease;
      setRotation(current);
      drawWheel(current);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        baseRotation.current = targetRotation.current % (2 * Math.PI);
        setSpinning(false);
        // Determine winner: the slice at the pointer (right side = angle 0)
        const count = entries.length || 6;
        const arc = (2 * Math.PI) / count;
        const normalized = ((-(baseRotation.current) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const winIdx = Math.floor(normalized / arc) % count;
        setWinner(entries[winIdx] || `Prize ${winIdx + 1}`);
      }
    };
    animRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <canvas ref={canvasRef} width={280} height={280} className="drop-shadow-2xl" />
      </div>

      {winner && (
        <div className="w-full p-4 rounded-2xl border border-premium-gold/50 bg-premium-gold/10 text-center">
          <div className="text-[10px] font-mono uppercase text-premium-gold tracking-widest mb-1">🎉 Winner!</div>
          <div className="text-xl font-display font-bold text-white">{winner}</div>
        </div>
      )}

      <button
        type="button"
        onClick={spin}
        disabled={spinning}
        className={`px-8 py-3.5 rounded-2xl font-display font-bold text-sm scale-on-click shadow-gold flex items-center gap-2 ${
          spinning
            ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed shadow-none'
            : 'bg-premium-gold text-black hover:bg-premium-goldHover'
        }`}
      >
        {spinning ? (
          <><RotateCcw className="w-4 h-4 animate-spin" /> Spinning…</>
        ) : (
          <><Sparkles className="w-4 h-4" /> SPIN the Wheel</>
        )}
      </button>
    </div>
  );
}

/* ─── Slot Machine ───────────────────────────────────────── */

const SLOT_SYMBOLS = ['⭐', '💎', '🎯', '🏆', '🎲', '✨', '🔥', '💫'];

function SlotMachine({ entries }: { entries: string[] }) {
  const [reels, setReels] = useState(['?', '?', '?']);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [spinningReels, setSpinningReels] = useState([false, false, false]);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setWinner(null);

    const pool = entries.length > 0 ? entries : SLOT_SYMBOLS;
    const finalResult = pool[Math.floor(Math.random() * pool.length)];

    // Animate each reel sequentially with a tick effect
    [0, 1, 2].forEach((i) => {
      setSpinningReels((prev) => { const n = [...prev]; n[i] = true; return n; });

      const interval = setInterval(() => {
        setReels((prev) => {
          const n = [...prev];
          n[i] = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
          return n;
        });
      }, 80);

      setTimeout(() => {
        clearInterval(interval);
        setReels((prev) => {
          const n = [...prev];
          n[i] = i === 1 ? finalResult : pool[Math.floor(Math.random() * pool.length)];
          return n;
        });
        setSpinningReels((prev) => { const n = [...prev]; n[i] = false; return n; });
        if (i === 2) {
          setTimeout(() => {
            setSpinning(false);
            setWinner(finalResult);
          }, 200);
        }
      }, 600 + i * 400);
    });
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Machine body */}
      <div className="p-5 rounded-[2rem] bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700 shadow-2xl w-full max-w-xs">
        {/* Title screen */}
        <div className="text-center mb-4">
          <div className="text-[10px] font-mono text-premium-neon uppercase tracking-widest">Lucky Draw</div>
          <div className="text-lg font-display font-bold text-premium-gold">all41</div>
        </div>

        {/* Reels */}
        <div className="flex gap-2 justify-center mb-5">
          {reels.map((symbol, i) => (
            <div
              key={i}
              className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center text-4xl transition-all ${
                spinningReels[i]
                  ? 'border-premium-neon bg-premium-neon/10 shadow-[0_0_20px_rgba(0,240,255,0.3)] animate-pulse'
                  : 'border-zinc-600 bg-premium-black'
              }`}
            >
              {symbol}
            </div>
          ))}
        </div>

        {/* Pull lever / spin button */}
        <button
          type="button"
          onClick={spin}
          disabled={spinning}
          className={`w-full py-3 rounded-2xl font-display font-bold text-sm scale-on-click flex items-center justify-center gap-2 ${
            spinning
              ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-premium-gold to-premium-goldHover text-black shadow-gold hover:opacity-90'
          }`}
        >
          {spinning ? <><Zap className="w-4 h-4 animate-pulse" /> Spinning…</> : <><Play className="w-4 h-4" /> PULL!</>}
        </button>
      </div>

      {winner && (
        <div className="w-full max-w-xs p-4 rounded-2xl border border-premium-gold/50 bg-premium-gold/10 text-center">
          <div className="text-[10px] font-mono uppercase text-premium-gold tracking-widest mb-1">🎰 Lucky Winner!</div>
          <div className="text-xl font-display font-bold text-white">{winner}</div>
        </div>
      )}
    </div>
  );
}

/* ─── Lucky Draw / Spotlight ─────────────────────────────── */

function LuckyDraw({ entries }: { entries: string[] }) {
  const [current, setCurrent] = useState(0);
  const [running, setRunning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const pool = entries.length > 0 ? entries : ['Guest 1', 'Guest 2', 'Guest 3', 'Guest 4', 'Guest 5'];

  const start = () => {
    setWinner(null);
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % pool.length);
    }, 100);

    setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRunning(false);
      const idx = Math.floor(Math.random() * pool.length);
      setCurrent(idx);
      setWinner(pool[idx]);
    }, 3000 + Math.random() * 2000);
  };

  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setWinner(pool[current]);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Spotlight display */}
      <div className="w-full aspect-video max-w-sm rounded-[2rem] bg-premium-black border border-premium-borderDark overflow-hidden relative flex items-center justify-center">
        {/* Conic gradient spotlight */}
        <div
          className={`absolute inset-0 bg-gradient-radial from-premium-gold/20 via-transparent to-transparent transition-opacity ${
            running ? 'opacity-100 animate-pulse' : 'opacity-50'
          }`}
          style={{ background: `radial-gradient(circle at center, rgba(197,160,89,0.3) 0%, transparent 70%)` }}
        />

        {/* Beam lines */}
        {running && (
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute top-0 left-1/2 w-px bg-gradient-to-b from-premium-gold/30 to-transparent origin-top"
                style={{
                  height: '120%',
                  transform: `rotate(${-30 + i * 12}deg)`,
                  animation: `spin ${0.5 + i * 0.1}s linear infinite`,
                }}
              />
            ))}
          </div>
        )}

        <div className="relative z-10 text-center px-8">
          {winner && !running ? (
            <>
              <Trophy className="w-12 h-12 text-premium-gold mx-auto mb-2" />
              <div className="text-2xl font-display font-bold text-premium-gold">{winner}</div>
              <div className="text-[11px] text-zinc-400 mt-1">is the winner!</div>
            </>
          ) : (
            <div className={`text-2xl font-display font-bold transition-all ${running ? 'text-white scale-110' : 'text-zinc-500'}`}>
              {pool[current] || '—'}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        {!running ? (
          <button
            type="button"
            onClick={start}
            className="px-8 py-3 rounded-2xl bg-premium-gold text-black font-display font-bold text-sm scale-on-click shadow-gold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Draw Now!
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="px-8 py-3 rounded-2xl bg-premium-danger text-white font-display font-bold text-sm scale-on-click flex items-center gap-2"
          >
            <Pause className="w-4 h-4" />
            Stop & Reveal
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Main RaffleEngine ──────────────────────────────────── */

type RaffleMode = 'wheel' | 'slot' | 'draw';

interface RaffleEngineProps {
  raffleStyle: 'wheel' | 'slot' | 'claw';
  setRaffleStyle: (s: 'wheel' | 'slot' | 'claw') => void;
}

export function RaffleEngine({ raffleStyle, setRaffleStyle }: RaffleEngineProps) {
  const [prizes, setPrizes] = useState([
    { id: 'pr1', name: 'Apple AirPods Pro', qty: 1, color: '#C5A059' },
    { id: 'pr2', name: 'Grab Voucher $50', qty: 3, color: '#00F0FF' },
    { id: 'pr3', name: 'Conference Hoodie', qty: 5, color: '#FF3366' },
  ]);
  const [entryMode, setEntryMode] = useState<'guests' | 'numbers' | 'manual'>('guests');
  const [manualEntries, setManualEntries] = useState('');
  const [numberFrom, setNumberFrom] = useState('1');
  const [numberTo, setNumberTo] = useState('200');
  const [soundOn, setSoundOn] = useState(true);
  const [mode, setMode] = useState<RaffleMode>(raffleStyle === 'claw' ? 'draw' : raffleStyle as RaffleMode);

  const getEntries = (): string[] => {
    if (entryMode === 'numbers') {
      const from = Number(numberFrom);
      const to = Number(numberTo);
      return Array.from({ length: Math.min(to - from + 1, 500) }, (_, i) => String(from + i));
    }
    if (entryMode === 'manual' && manualEntries.trim()) {
      return manualEntries.split('\n').map((l) => l.trim()).filter(Boolean);
    }
    return ['Alicia Santos', 'Marcus Tan', 'Priya Sharma', 'Rafael Cruz', 'Hana Kim', 'Jordan Reyes', 'Sofia Lim', 'Ethan Wu'];
  };

  const entries = getEntries();

  const MODES: { id: RaffleMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'wheel', label: 'Wheel', icon: RotateCcw },
    { id: 'slot', label: 'Slot', icon: Zap },
    { id: 'draw', label: 'Spotlight', icon: Sparkles },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Left: config */}
      <div className="xl:col-span-5 space-y-4">
        {/* Mode selector */}
        <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
          <h4 className="text-xs font-bold text-white flex items-center gap-2">
            <Settings2 className="w-3.5 h-3.5 text-premium-gold" />
            Raffle Style
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => { setMode(id); setRaffleStyle(id === 'draw' ? 'claw' : id as 'wheel' | 'slot'); }}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all scale-on-click ${
                  mode === id
                    ? 'border-premium-gold bg-premium-gold/10 text-premium-gold'
                    : 'border-premium-borderDark bg-premium-surfaceDark text-zinc-400 hover:border-zinc-600 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-bold">{label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-zinc-400">Sound effects</span>
            <button
              type="button"
              onClick={() => setSoundOn(!soundOn)}
              className={`w-11 h-6 rounded-full ${soundOn ? 'bg-premium-success' : 'bg-zinc-700'} flex items-center ${soundOn ? 'justify-end pr-0.5' : 'pl-0.5'}`}
            >
              <div className="w-5 h-5 rounded-full bg-white" />
            </button>
          </div>
        </div>

        {/* Prizes */}
        <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-premium-gold" />
              Prize List
            </h4>
            <button
              type="button"
              onClick={() => setPrizes((prev) => [...prev, { id: `pr${Date.now()}`, name: '', qty: 1, color: '#C5A059' }])}
              className="text-zinc-400 hover:text-premium-gold"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {prizes.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-2 bg-premium-surfaceDark border border-premium-borderDark rounded-xl p-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <input
                  value={p.name}
                  onChange={(e) => setPrizes((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, name: e.target.value } : pr))}
                  placeholder="Prize name"
                  className="flex-1 bg-transparent text-white text-xs outline-none"
                />
                <input
                  type="number"
                  value={p.qty}
                  onChange={(e) => setPrizes((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, qty: Number(e.target.value) } : pr))}
                  className="w-10 bg-transparent text-zinc-400 text-xs text-center outline-none"
                />
                <button type="button" onClick={() => setPrizes((prev) => prev.filter((pr) => pr.id !== p.id))} className="text-zinc-600 hover:text-premium-danger">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Entry pool */}
        <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
          <h4 className="text-xs font-bold text-white flex items-center gap-2">
            <Ticket className="w-3.5 h-3.5 text-premium-gold" />
            Entry Pool <span className="font-mono text-premium-gold">{entries.length}</span>
          </h4>
          <div className="flex gap-2">
            {[
              { id: 'guests' as const, label: 'Checked-in guests', icon: Users },
              { id: 'numbers' as const, label: 'Numbers', icon: Hash },
              { id: 'manual' as const, label: 'Manual', icon: AlignLeft },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setEntryMode(id)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                  entryMode === id ? 'border-premium-gold bg-premium-gold/10 text-premium-gold' : 'border-premium-borderDark text-zinc-500 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {entryMode === 'numbers' && (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-zinc-500 block mb-1">From</label>
                <input type="number" value={numberFrom} onChange={(e) => setNumberFrom(e.target.value)} className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold" />
              </div>
              <div className="text-zinc-600 mt-5">–</div>
              <div className="flex-1">
                <label className="text-[10px] text-zinc-500 block mb-1">To</label>
                <input type="number" value={numberTo} onChange={(e) => setNumberTo(e.target.value)} className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold" />
              </div>
            </div>
          )}

          {entryMode === 'manual' && (
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1.5">One entry per line</label>
              <textarea
                value={manualEntries}
                onChange={(e) => setManualEntries(e.target.value)}
                placeholder={`Entry 1\nEntry 2\nEntry 3`}
                rows={5}
                className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold resize-none font-mono"
              />
            </div>
          )}

          {entryMode === 'guests' && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark">
              <Users className="w-4 h-4 text-premium-success flex-shrink-0" />
              <span className="text-xs text-zinc-300">{entries.length} checked-in guests eligible</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: live raffle display */}
      <div className="xl:col-span-7 p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            {mode === 'wheel' ? 'Spin the Wheel' : mode === 'slot' ? 'Slot Machine' : 'Spotlight Draw'}
          </div>
          <div className="flex items-center gap-1.5">
            {soundOn
              ? <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
              : <VolumeX className="w-3.5 h-3.5 text-zinc-600" />
            }
            <span className="text-[10px] text-zinc-600">SFX</span>
          </div>
        </div>

        {mode === 'wheel' && <WheelOfFortune entries={entries} />}
        {mode === 'slot' && <SlotMachine entries={entries} />}
        {mode === 'draw' && <LuckyDraw entries={entries} />}
      </div>
    </div>
  );
}
