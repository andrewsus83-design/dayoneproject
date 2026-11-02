'use client';

import React, { useState } from 'react';
import { StageFrameShell } from '@/components/stage/StageFrameShell';
import { StageTicker } from '@/components/stage/StageTicker';
import { BrandMark } from '@/components/BrandMark';
import { defaultTicker } from '@/lib/stageApi';
import { getClientDomain } from '@/lib/domain';
import { formatDate } from '@/lib/utils';
import { chromeFrame, type ScreenChrome } from '@/lib/screenChrome';
import type { ScreenFeed } from '@/lib/screensApi';

export type ChromeEvent = Pick<ScreenFeed['event'], 'slug' | 'name' | 'logo' | 'starts_at' | 'venue_name'>;

/** The event line along the top: logo, name, the guest address, the date and the place. */
function ScreenHeader({ event, date }: { event: ChromeEvent; date: string }) {
  const [logoOk, setLogoOk] = useState(true);
  return (
    <header className="h-20 shrink-0 px-12 flex items-center gap-4 z-20 bg-premium-surfaceDark/80 border-b border-premium-borderDark">
      {event.logo && logoOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.logo} alt="" onError={() => setLogoOk(false)} className="h-10 w-auto max-w-[12rem] object-contain shrink-0" />
      ) : (
        <BrandMark size={40} />
      )}
      <div className="min-w-0">
        <h1 className="text-xl font-display font-bold text-white truncate">{event.name}</h1>
        <p className="text-xs text-zinc-400 font-mono truncate">
          <span className="text-premium-neon font-bold">{getClientDomain(event.slug)}</span>
          {date ? ` • ${date}` : ''}
          {event.venue_name ? ` • ${event.venue_name}` : ''}
        </p>
      </div>
    </header>
  );
}

/**
 * A screen's own header, frame and footer around whatever it shows (children fill the space in between, each laid out
 * `absolute inset-0`). It is the same tree whether the look is on or off, so switching it never remounts the source
 * on air. Off, it draws nothing and the children get the whole screen.
 */
export function ScreenChromeView({ chrome, event, children }: { chrome: ScreenChrome; event: ChromeEvent | null; children: React.ReactNode }) {
  const date = event?.starts_at ? formatDate(event.starts_at) : '';
  const ticker = chrome.on && chrome.footer === 'ticker' && event
    ? chrome.footerText.trim() || defaultTicker({ name: event.name, date, venue: event.venue_name }, getClientDomain(event.slug))
    : '';
  return (
    <div className="absolute inset-0">
      <StageFrameShell frame={chromeFrame(chrome)} logoRef={event?.logo ?? undefined} className="w-full h-full">
        {chrome.on && chrome.header && event ? <ScreenHeader event={event} date={date} /> : null}
        <div className="relative flex-1 min-h-0">{children}</div>
        {ticker ? <StageTicker text={ticker} /> : null}
      </StageFrameShell>
    </div>
  );
}
