'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { adminApi, type AdminEvent } from '@/lib/adminApi';

const PACKAGES = ['free', 'starter', 'plus', 'pro', 'business', 'scale'];
const STATUSES = ['draft', 'published', 'archived'];

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEvents(await adminApi.listEvents());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load events.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const update = async (id: string, patch: { package?: string; status?: string }) => {
    setBusyId(id);
    setError(null);
    try {
      await adminApi.updateEvent(id, patch);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the event.');
    } finally {
      setBusyId(null);
    }
  };

  const select = 'bg-premium-surfaceDark border border-premium-borderDark text-white px-2 py-1.5 rounded-lg text-xs outline-none capitalize';

  return (
    <div className="p-6 sm:p-10 space-y-8 max-w-6xl w-full mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3"><Calendar className="w-7 h-7 text-premium-gold" /> Events</h1>
          <p className="text-sm text-zinc-400 mt-1">Every event created by organizers. Change a package or publish status here.</p>
        </div>
        <button type="button" onClick={load} className="px-4 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-300 hover:text-white text-xs font-bold scale-on-click flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-sm font-bold">{error}</div>}

      <div className="rounded-[2rem] bg-premium-charcoal border border-premium-borderDark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-premium-black text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="text-left p-4 pl-6">Event</th>
                <th className="text-left p-4">Owner</th>
                <th className="text-left p-4">Date</th>
                <th className="text-left p-4">Guests</th>
                <th className="text-left p-4">Package</th>
                <th className="text-left p-4 pr-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-premium-borderDark/60">
              {events === null && !error && <tr><td colSpan={6} className="p-6 text-center text-zinc-500"><Loader2 className="w-4 h-4 animate-spin inline" /> Loading…</td></tr>}
              {events?.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-zinc-500">No events yet. They appear here when organizers create them.</td></tr>}
              {events?.map((e) => (
                <tr key={e.id} className="hover:bg-white/[0.02]">
                  <td className="p-4 pl-6">
                    <div className="font-bold text-white flex items-center gap-2">
                      {e.name}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${e.type === 'wedding' ? 'text-premium-danger border-premium-danger/30' : 'text-premium-neon border-premium-neon/30'}`}>{e.type}</span>
                    </div>
                    <a href={`/events/${e.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-premium-neon hover:underline inline-flex items-center gap-1">/events/{e.slug} <ExternalLink className="w-3 h-3" /></a>
                  </td>
                  <td className="p-4 text-xs">
                    <div className="text-zinc-300">{e.owner_email ?? '—'}</div>
                    <div className="text-zinc-600">{e.org_name}</div>
                  </td>
                  <td className="p-4 text-xs text-zinc-400">{new Date(e.starts_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="p-4 text-xs font-mono text-zinc-300">{e.guests}</td>
                  <td className="p-4">
                    <select value={e.package} disabled={busyId === e.id} onChange={(ev) => update(e.id, { package: ev.target.value })} className={select}>
                      {PACKAGES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className="p-4 pr-6">
                    <div className="flex items-center gap-2">
                      <select value={e.status} disabled={busyId === e.id} onChange={(ev) => update(e.id, { status: ev.target.value })} className={select}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {busyId === e.id && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
