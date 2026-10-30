'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { hasLocalEvent, isSampleSlug } from '@/lib/events';
import { syncEventBySlug } from '@/lib/eventSync';

/** How often an open page checks for a newer save. */
const REFRESH_MS = 30_000;
const noopSubscribe = () => () => {};

function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 font-sans flex items-center justify-center px-6">
      <div className="max-w-sm text-center space-y-4">
        <div className="w-12 h-12 mx-auto bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-xl shadow-gold">D1</div>
        <h1 className="text-xl font-display font-bold text-white">{title}</h1>
        {children}
      </div>
    </div>
  );
}

/**
 * Every page under /events/<slug> runs inside this: it loads the event's saved setup from the server (so any phone
 * or screen shows the organizer's latest Save & publish) and refreshes it while the page stays open.
 */
export function LiveEventSync({ slug, children }: { slug: string; children: React.ReactNode }) {
  const sample = isSampleSlug(slug);
  // An event this device already knows (made or opened here) shows at once and refreshes in the background.
  const known = useSyncExternalStore(noopSubscribe, () => hasLocalEvent(slug), () => false);
  const [state, setState] = useState<'checking' | 'live' | 'missing' | 'offline'>('checking');

  useEffect(() => {
    if (sample) return;
    let alive = true;
    const refresh = () =>
      syncEventBySlug(slug)
        .then((found) => alive && setState(found ? 'live' : 'missing'))
        .catch(() => alive && setState((s) => (s === 'live' ? s : 'offline')));
    refresh();
    const timer = setInterval(() => document.visibilityState === 'visible' && refresh(), REFRESH_MS);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [slug, sample]);

  if (sample || known || state === 'live') return <>{children}</>;
  if (state === 'checking') {
    return (
      <div className="min-h-screen bg-premium-black flex items-center justify-center text-zinc-500 text-sm font-sans">Loading event…</div>
    );
  }
  if (state === 'offline') {
    return (
      <Notice title="We couldn't load this event">
        <p className="text-sm text-zinc-400">Check your internet connection and try again.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click"
        >
          Try again
        </button>
      </Notice>
    );
  }
  return (
    <Notice title="This event isn't live yet">
      <p className="text-sm text-zinc-400 leading-relaxed">Check the link you were sent, or ask the host to publish the event.</p>
    </Notice>
  );
}
