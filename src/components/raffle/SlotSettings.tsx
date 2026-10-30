'use client';

import React from 'react';
import { Hash, User, RotateCcw } from 'lucide-react';
import { guestPool, numberDigits, resolveDrawTotal, useEventConfig, useGuests, type DoorPrize, type SlotMode } from '@/lib/eventStore';

/** Number/Name controls for one door prize that uses the slot machine. */
export function SlotSettings({ eventId, drawId, className = '' }: { eventId: string; drawId?: string; className?: string }) {
  const { config, update } = useEventConfig(eventId);
  const guests = useGuests(eventId);
  const items = config.doorprizes.items;
  const draw = items.find((d) => d.id === (drawId ?? config.doorprizes.activeId)) ?? items[0];
  if (!draw) return null;

  const patch = (p: Partial<DoorPrize>) => update('doorprizes', { items: items.map((d) => (d.id === draw.id ? { ...d, ...p } : d)) });
  const total = resolveDrawTotal(draw, config, guests.length);
  const byGuests = draw.numberSource !== 'range';
  const reels = byGuests ? numberDigits(guests, config.info.capacity) : String(total).length;
  const autoTotal = Math.max(guests.length, config.info.capacity, 1);
  const inDraw = guestPool(guests, draw.audience, draw.pickedGuestIds).length;

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {draw.style === 'slot' && (
        <div className="flex items-center gap-1 bg-premium-surfaceDark p-1 rounded-xl border border-premium-borderDark">
          {([
            { id: 'number', label: 'Number', icon: Hash },
            { id: 'name', label: 'Name', icon: User },
          ] as { id: SlotMode; label: string; icon: typeof Hash }[]).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => patch({ slotMode: m.id })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold scale-on-click transition-all ${
                draw.slotMode === m.id ? 'bg-premium-gold text-black shadow-gold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <m.icon className="w-3.5 h-3.5" /> Draw by {m.label}
            </button>
          ))}
        </div>
      )}

      {draw.style === 'slot' && draw.slotMode === 'number' && (
        <div className="flex items-center gap-1 bg-premium-surfaceDark p-1 rounded-xl border border-premium-borderDark">
          {([
            { id: 'guests', label: 'Guest numbers' },
            { id: 'range', label: 'Number range' },
          ] as { id: DoorPrize['numberSource']; label: string }[]).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => patch({ numberSource: m.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold scale-on-click transition-all ${
                draw.numberSource === m.id ? 'bg-premium-gold/15 text-premium-gold border border-premium-gold/40' : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {draw.style === 'slot' && draw.slotMode === 'number' && byGuests ? (
        <span className="text-xs text-zinc-400">
          <span className="font-mono text-premium-success">{inDraw}</span> checked-in guest number{inDraw === 1 ? '' : 's'} in the draw ·{' '}
          <span className="font-mono text-premium-gold">{reels} reels</span>
        </span>
      ) : draw.style === 'slot' && draw.slotMode === 'number' ? (
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="font-bold">Guest numbers 1 –</span>
          <input
            type="number"
            min={1}
            value={draw.totalNumbers > 0 ? draw.totalNumbers : ''}
            placeholder={String(autoTotal)}
            onChange={(e) => patch({ totalNumbers: Math.max(0, parseInt(e.target.value || '0', 10)) })}
            className="w-24 bg-premium-surfaceDark border border-premium-borderDark text-white px-2.5 py-1.5 rounded-lg font-mono text-xs outline-none focus:border-premium-gold"
          />
          <span className="font-mono text-premium-gold">{reels} reel{reels === 1 ? '' : 's'}</span>
        </label>
      ) : (
        <span className="text-xs text-zinc-400">
          <span className="font-mono text-premium-success">{inDraw}</span> checked-in guest{inDraw === 1 ? '' : 's'} in the draw
        </span>
      )}

      <button
        type="button"
        onClick={() => { if (confirm(`Clear the ${draw.winners.length} winner(s) of “${draw.name}”?`)) patch({ winners: [] }); }}
        disabled={draw.winners.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-premium-borderDark text-zinc-400 hover:text-white text-xs font-bold scale-on-click disabled:opacity-40"
        title="Clear this door prize's winners so they can be drawn again"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Reset winners ({draw.winners.length})
      </button>
    </div>
  );
}
