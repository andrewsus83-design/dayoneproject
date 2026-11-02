'use client';

import React from 'react';
import { useEventConfig, type DoorPrize } from '@/lib/eventStore';
import { isServerEventId } from '@/lib/guestsApi';
import { useDoorPrizeBoard } from '@/lib/doorPrizeApi';

/**
 * ON/OFF under a door prize's draw button: whether someone who already won (another door prize) can be drawn again.
 * Off, the default, keeps one win per guest across the event. A door prize never draws the same winner twice.
 * Organizers only: on a saved event it shows once the server has loaded the organizers' board (it refuses anyone who
 * is not signed in as an owner of the event), so guests never see it.
 */
export function RepeatWinnersToggle({ eventId, drawId, disabled = false, className = '' }: { eventId: string; drawId?: string; disabled?: boolean; className?: string }) {
  const { config, update } = useEventConfig(eventId);
  const server = isServerEventId(eventId);
  const { status } = useDoorPrizeBoard(server ? eventId : null);
  const items = config.doorprizes.items;
  const draw = items.find((d) => d.id === (drawId ?? config.doorprizes.activeId)) ?? items[0];
  if (!draw || (server && status !== 'ready')) return null;

  const on = draw.repeatWinners;
  const patch = (p: Partial<DoorPrize>) => update('doorprizes', { items: items.map((d) => (d.id === draw.id ? { ...d, ...p } : d)) });

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Winner can participate again"
        disabled={disabled}
        onClick={() => patch({ repeatWinners: !on })}
        className={`w-11 h-6 rounded-full transition-colors flex items-center shrink-0 scale-on-click disabled:opacity-50 ${on ? 'bg-premium-success justify-end pr-0.5' : 'bg-zinc-700 pl-0.5'}`}
      >
        <span className="w-5 h-5 rounded-full bg-white shadow" />
      </button>
      <div className="text-left min-w-0">
        <p className="text-xs font-bold text-white flex items-center gap-2">
          Winner can participate again
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono tracking-widest ${on ? 'bg-premium-success/15 text-premium-success' : 'bg-zinc-800 text-zinc-400'}`}>{on ? 'ON' : 'OFF'}</span>
        </p>
        <p className="text-[11px] text-zinc-500">
          {on ? 'Guests who won another door prize can be drawn here too. Winners of this door prize stay out.' : 'A guest who already won a door prize is out of the draw.'}
        </p>
      </div>
    </div>
  );
}
