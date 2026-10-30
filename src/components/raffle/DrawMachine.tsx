'use client';

import React from 'react';
import confetti from 'canvas-confetti';
import {
  drawExclusions, formatGuestNumber, guestPool, numberDigits, recordDrawWinner, resolveDrawTotal, useEventConfig, useGuests,
  type DoorPrize, type DrawStyle,
} from '@/lib/eventStore';
import type { Guest } from '@/lib/types';
import { SlotMachine, type SlotEntry, type SlotResult } from './SlotMachine';
import { WheelSpinner } from './WheelSpinner';
import { NamePicker } from './NamePicker';
import { ClawMachine3D } from './ClawMachine3D';

export const DRAW_STYLES: { id: DrawStyle; label: string; desc: string }[] = [
  { id: 'slot', label: 'Slot Machine', desc: 'Number reels or a name reel' },
  { id: 'wheel', label: 'Wheel of Spin', desc: 'Spinning prize wheel' },
  { id: 'picker', label: 'Name Picker', desc: 'Spotlight flicks through names' },
  { id: 'claw', label: 'Claw Machine 3D', desc: 'Grab a gift box, open it, reveal the name' },
];

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
  const pool = guestPool(guests, draw.audience, draw.pickedGuestIds);
  const digits = numberDigits(guests, config.info.capacity);
  const nameOf = (g: Guest) => (draw.anonymous ? `No. ${formatGuestNumber(g.guest_number, digits)}` : g.name);
  const entries: SlotEntry[] = pool.map((g) => ({ id: g.id, name: nameOf(g) }));
  const excluded = drawExclusions(config);

  // Number draws: real guest numbers from the pool, or a plain 1–N range.
  const byGuests = draw.numberSource !== 'range';
  const numberEntries: Record<number, SlotEntry> = {};
  for (const g of byGuests ? pool : guests) {
    if (g.guest_number) numberEntries[g.guest_number] = { id: g.id, name: nameOf(g) };
  }
  const excludedIds = new Set(excluded.guestIds);
  const numbers = byGuests ? pool.filter((g) => g.guest_number && !excludedIds.has(g.id)).map((g) => g.guest_number as number) : undefined;

  const handle = (r: SlotResult) => {
    if (record) recordDrawWinner(eventId, draw.id, { label: r.label, number: r.number, guestId: r.entry?.id });
    if (draw.confetti) confetti({ particleCount: size === 'lg' ? 180 : 110, spread: 90, origin: { y: 0.6 }, colors: ['#00F0FF', '#C5A059', '#FF3366', '#00E676'] });
    onResult?.(r);
  };

  const common = { entries, excludeIds: excluded.guestIds, trigger, size, showButton, onSpinStart, onResult: handle };

  if (draw.style === 'wheel') return <WheelSpinner key={draw.id} {...common} />;
  if (draw.style === 'picker') return <NamePicker key={draw.id} {...common} />;
  if (draw.style === 'claw') return <ClawMachine3D key={draw.id} {...common} />;
  return (
    <SlotMachine
      key={draw.id}
      mode={draw.slotMode}
      totalNumbers={resolveDrawTotal(draw, config, guests.length)}
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
      onSpinStart={onSpinStart}
      onResult={handle}
    />
  );
}
