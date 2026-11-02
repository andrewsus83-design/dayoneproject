'use client';

import React from 'react';
import confetti from 'canvas-confetti';
import {
  drawExclusions, formatGuestNumber, guestPool, numberDigits, recordDrawWinner, resolveDrawTotal, useEventConfig, useGuests,
  type DoorPrize, type DrawStyle,
} from '@/lib/eventStore';
import { isServerEventId } from '@/lib/guestsApi';
import { boardExclusions, drawDoorNumber, drawDoorPrize, refreshDoorPrizeBoard, useDoorPrizeBoard } from '@/lib/doorPrizeApi';
import type { Guest } from '@/lib/types';
import { SlotMachine, type PickResolver, type SlotEntry, type SlotResult } from './SlotMachine';
import { WheelSpinner } from './WheelSpinner';
import { NamePicker } from './NamePicker';
import { ClawMachine3D } from './ClawMachine3D';

export const DRAW_STYLES: { id: DrawStyle; label: string; desc: string }[] = [
  { id: 'slot', label: 'Slot Machine', desc: 'Number reels or a name reel' },
  { id: 'wheel', label: 'Wheel of Spin', desc: 'Spinning prize wheel' },
  { id: 'picker', label: 'Name Picker', desc: 'Spotlight flicks through names' },
  { id: 'claw', label: 'Claw Machine 3D', desc: 'Grab a gift box, open it, reveal the name' },
];

/** How long each machine animates before the winner shows (other screens hold the winner back until then). */
function revealMs(draw: DoorPrize, reels: number): number {
  if (draw.style === 'wheel') return 5500;
  if (draw.style === 'picker') return 5800;
  if (draw.style === 'claw') return 8000;
  return draw.slotMode === 'number' ? 2500 + Math.max(0, reels - 1) * 850 : 5100;
}

/**
 * One door prize's draw machine. Saved events (with `record`) draw on the server: it picks a checked-in guest who
 * has not won yet (or a number), the machine animates onto that pick, and every screen gets the winner from the
 * server once it lands. Sample events, and practice spins (`record` off), pick on this device.
 */
export function DrawMachine({
  eventId, draw, size = 'md', trigger, showButton = true, record = true, onSpinStart, onResult,
}: {
  eventId: string;
  draw: DoorPrize;
  size?: 'md' | 'lg';
  trigger?: number;
  showButton?: boolean;
  record?: boolean;
  onSpinStart?: () => void;
  onResult?: (r: SlotResult) => void;
}) {
  const { config } = useEventConfig(eventId);
  const guests = useGuests(eventId);
  const server = isServerEventId(eventId);
  const { board } = useDoorPrizeBoard(server ? eventId : null);
  const pool = guestPool(guests, draw.audience, draw.pickedGuestIds);
  const digits = numberDigits(guests, config.info.capacity);
  const nameOf = (g: Pick<Guest, 'name' | 'guest_number'>) => (draw.anonymous ? `No. ${formatGuestNumber(g.guest_number, digits)}` : g.name);
  const entries: SlotEntry[] = pool.map((g) => ({ id: g.id, name: nameOf(g) }));
  // Saved events: whoever the server already drew (won or forfeited) is out; it never draws them again. A door prize
  // that lets winners participate again only leaves out its own winners and forfeited guests.
  const excluded = server ? boardExclusions(board, draw) : drawExclusions(config, draw);

  // Number draws: real guest numbers from the pool, or a plain 1–N range.
  const byGuests = draw.numberSource !== 'range';
  const numberEntries: Record<number, SlotEntry> = {};
  for (const g of byGuests ? pool : guests) {
    if (g.guest_number) numberEntries[g.guest_number] = { id: g.id, name: nameOf(g) };
  }
  const excludedIds = new Set(excluded.guestIds);
  const numbers = byGuests ? pool.filter((g) => g.guest_number && !excludedIds.has(g.id)).map((g) => g.guest_number as number) : undefined;
  const total = resolveDrawTotal(draw, config, guests.length);
  const reels = byGuests ? digits : String(Math.max(1, Math.floor(total))).length;

  const onServer = server && record;
  const rangeDraw = draw.style === 'slot' && draw.slotMode === 'number' && !byGuests;
  const resolve: PickResolver | undefined = onServer
    ? async () => {
        if (rangeDraw) {
          const r = await drawDoorNumber(eventId, draw, total, revealMs(draw, reels));
          return { number: r.number };
        }
        const { guest } = await drawDoorPrize(eventId, draw, revealMs(draw, reels));
        return { entry: { id: guest.id, name: nameOf(guest) }, number: guest.guest_number };
      }
    : undefined;

  const handle = (r: SlotResult) => {
    if (onServer) void refreshDoorPrizeBoard(eventId);
    else if (record) recordDrawWinner(eventId, draw.id, { label: r.label, number: r.number, guestId: r.entry?.id });
    if (draw.confetti) confetti({ particleCount: size === 'lg' ? 180 : 110, spread: 90, origin: { y: 0.6 }, colors: ['#00F0FF', '#C5A059', '#FF3366', '#00E676'] });
    onResult?.(r);
  };

  const common = { entries, excludeIds: excluded.guestIds, trigger, size, showButton, resolve, onSpinStart, onResult: handle };

  if (draw.style === 'wheel') return <WheelSpinner key={draw.id} {...common} />;
  if (draw.style === 'picker') return <NamePicker key={draw.id} {...common} />;
  if (draw.style === 'claw') return <ClawMachine3D key={draw.id} {...common} />;
  return (
    <SlotMachine
      key={draw.id}
      mode={draw.slotMode}
      totalNumbers={total}
      numbers={numbers}
      numberEntries={numberEntries}
      digits={byGuests ? digits : undefined}
      revealName={!draw.anonymous}
      excludeNumbers={excluded.numbers}
      entries={entries}
      excludeIds={excluded.guestIds}
      size={size}
      trigger={trigger}
      showLever={showButton}
      showResult
      resolve={resolve}
      onSpinStart={onSpinStart}
      onResult={handle}
    />
  );
}
