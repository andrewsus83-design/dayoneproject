'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, LogOut, Tv } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSessionUser } from '@/lib/useSession';
import { displayName } from '@/lib/auth';
import { listOrgEvents } from '@/lib/orgEvents';
import type { OrgEventRow } from '@/lib/events';
import { StageLedEditor } from '@/components/dashboard/StageLedEditor';
import { LiveScreenSwitcher } from '@/components/screens/LiveScreenSwitcher';

/** Landing page for screen managers: pick the event, then switch what its stage screen shows. Nothing else. */
export default function ScreenHome() {
  const router = useRouter();
  const { user } = useSessionUser();
  // Events of the organizations this account belongs to (the database only returns those).
  const [events, setEvents] = useState<OrgEventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listOrgEvents()
      .then((rows) => alive && setEvents(rows))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Could not load your events.'));
    return () => {
      alive = false;
    };
  }, []);

  // With a single event there is nothing to choose.
  const chosen = events?.find((e) => e.id === chosenId) ?? (events?.length === 1 ? events[0] : null);

  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 font-sans px-4 py-8 sm:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-lg shadow-gold">D1</div>
            <div>
              <h1 className="text-xl font-display font-bold text-white tracking-tight">Screen switcher</h1>
              <p className="text-xs text-zinc-500">{user ? `Signed in as ${displayName(user)}` : 'Loading…'}</p>
            </div>
          </div>
          <button type="button" onClick={signOut} className="text-xs font-bold text-zinc-500 hover:text-premium-danger flex items-center gap-1.5 scale-on-click">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>

        {error && <div className="p-4 rounded-2xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-sm font-bold">{error}</div>}

        {!events && !error && (
          <div className="p-10 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark flex items-center justify-center gap-3 text-sm text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin text-premium-gold" /> Loading your events…
          </div>
        )}

        {events && events.length === 0 && (
          <div className="p-8 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark text-sm text-zinc-400 text-center">
            Your team has no events yet. Ask your organizer to create one.
          </div>
        )}

        {events && events.length > 0 && !chosen && (
          <div className="p-4 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-2 max-w-xl">
            <p className="px-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">Choose the event</p>
            {events.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => setChosenId(ev.id)}
                className="w-full p-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark hover:border-premium-gold/50 text-left flex items-center gap-3 scale-on-click"
              >
                <Tv className="w-4 h-4 text-premium-gold shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-white truncate">{ev.name}</span>
                  <span className="block text-[11px] text-zinc-500 font-mono truncate">
                    /events/{ev.slug} · {new Date(ev.starts_at).toLocaleDateString([], { dateStyle: 'medium' })}
                  </span>
                </span>
                <ArrowRight className="w-4 h-4 text-zinc-500 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {chosen && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-display font-bold text-white">{chosen.name}</div>
              {events && events.length > 1 && (
                <button type="button" onClick={() => setChosenId(null)} className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1.5 scale-on-click">
                  <ArrowLeft className="w-3.5 h-3.5" /> Another event
                </button>
              )}
            </div>
            <LiveScreenSwitcher eventId={chosen.id} slug={chosen.slug} />
            <div className="pt-4 border-t border-premium-borderDark space-y-3">
              <h3 className="text-lg font-display font-bold text-white">Classic stage page</h3>
              <StageLedEditor eventId={chosen.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
