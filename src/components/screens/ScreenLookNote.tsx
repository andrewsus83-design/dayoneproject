'use client';

import React from 'react';
import Link from 'next/link';
import { Palette } from 'lucide-react';

/** Where the header, frame and footer went: they are set once on each live screen, not on every activity. */
export function ScreenLookNote({ eventId }: { eventId: string }) {
  return (
    <div className="p-5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark space-y-3">
      <div className="flex items-center gap-2 text-sm font-display font-bold text-white">
        <Palette className="w-4 h-4 text-premium-gold" /> Set on the screen, not here
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed">
        The header, frame and footer are set once on each live screen and drawn around everything it shows: stage modules, games, door prizes and custom screens.
        Open Live Screens and use the palette button on a screen&apos;s card.
      </p>
      <Link
        href={`/dashboard/events/${eventId}?tab=live`}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-xs shadow-gold scale-on-click"
      >
        Open Live Screens
      </Link>
    </div>
  );
}
