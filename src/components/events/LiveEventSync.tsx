'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { hasLocalEvent, isSampleSlug } from '@/lib/events';
import { readSyncState } from '@/lib/eventStore';
import { eventVersion, syncEventBySlug, type LiveCopy } from '@/lib/eventSync';

/** How often an open page checks for a newer save (a tiny request; the event downloads only when it changed). */
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
 * or screen shows the organizer's latest save) and refreshes it while the page stays open. Between full loads it only
 * asks the server for the event's save time, and downloads the event again when that changed.
 */
export function LiveEventSync({ slug, children }: { slug: string; children: React.ReactNode }) {
  const sample = isSampleSlug(slug);
  // An event this device already knows (made or opened here) shows at once and refreshes in the background.
  const known = useSyncExternalStore(noopSubscribe, () => hasLocalEvent(slug), () => false);
  const [state, setState] = useState<'checking' | 'live' | 'missing' | 'offline'>('checking');

  useEffect(() => {
    if (sample) return;
    let alive = true;
    let busy = false;
    // What the last full load brought; null until one succeeds.
    let last: LiveCopy | null = null;

    const load = async () => {
      if (busy) return;
      busy = true;
      try {
        const copy = await syncEventBySlug(slug);
        last = copy;
        if (alive) setState(copy.found ? 'live' : 'missing');
      } catch {
        if (alive) setState((s) => (s === 'live' ? s : 'offline'));
      } finally {
        busy = false;
      }
    };

    const check = async () => {
      if (busy) return;
      if (!last) return load();
      try {
        const version = await eventVersion(slug, last.source);
        if (version === last.version) return;
        // Another tab on this device may already hold that version (it just saved it).
        if (version && last.id && readSyncState(last.id).savedIso === version) {
          last = { ...last, version };
          return;
        }
        await load();
      } catch {
        // Offline for a moment: the next check tries again.
      }
    };

    load();
    const timer = setInterval(() => document.visibilityState === 'visible' && check(), REFRESH_MS);
    const onVisible = () => document.visibilityState === 'visible' && load();
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
