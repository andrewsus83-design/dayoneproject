'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BarChart3, Calendar, Clock, Loader2, MessageSquare, RefreshCw, Shield, Users } from 'lucide-react';
import { adminApi, type AdminEvent } from '@/lib/adminApi';
import { formatDate } from '@/lib/utils';

const STATUS_STYLE: Record<AdminEvent['status'], string> = {
  published: 'text-premium-success border-premium-success/30 bg-premium-success/10',
  draft: 'text-zinc-400 border-premium-borderDark bg-premium-surfaceDark',
  archived: 'text-zinc-500 border-premium-borderDark bg-premium-surfaceDark',
};

export default function AdminOverviewPage() {
  const [events, setEvents] = useState<AdminEvent[] | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // When the list was loaded; "happening now" is measured against it.
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [ev, us] = await Promise.allSettled([adminApi.listEvents(), adminApi.listUsers()]);
    setNow(Date.now());
    if (ev.status === 'fulfilled') {
      setEvents(ev.value);
      setError(null);
    } else {
      setError(ev.reason instanceof Error ? ev.reason.message : 'Could not load events.');
    }
    setUserCount(us.status === 'fulfilled' ? us.value.length : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const list = events ?? [];
  const published = list.filter((e) => e.status === 'published').length;
  const drafts = list.filter((e) => e.status === 'draft').length;
  const happeningNow = list.filter((e) => e.status === 'published' && Date.parse(e.starts_at) <= now && now <= Date.parse(e.ends_at)).length;
  const upcoming = list.filter((e) => e.status === 'published' && Date.parse(e.starts_at) > now).length;
  const guests = list.reduce((sum, e) => sum + (e.guests || 0), 0);
  const recent = [...list].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 6);
  const show = (n: number) => (events === null ? '–' : n.toLocaleString());

  const cards = [
    { label: 'Events', value: show(list.length), sub: events === null ? 'Loading…' : `${published} published · ${drafts} draft`, icon: Calendar, color: 'text-premium-gold' },
    { label: 'Happening now', value: show(happeningNow), sub: events === null ? 'Loading…' : `${upcoming} published and upcoming`, icon: Clock, color: 'text-premium-success' },
    { label: 'Guests on lists', value: show(guests), sub: 'Across every event', icon: Users, color: 'text-premium-neon' },
    { label: 'Accounts', value: userCount === null ? '–' : userCount.toLocaleString(), sub: 'Organizers, desk staff and admins', icon: Shield, color: 'text-white' },
  ];

  return (
    <div className="p-6 sm:p-10 space-y-8 max-w-6xl w-full mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-premium-gold" /> Overview
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Events and accounts on the platform, straight from the database.</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-300 hover:text-white text-xs font-bold scale-on-click flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-sm font-bold">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className={`text-3xl font-display font-bold ${color}`}>{value}</div>
            <div className="text-[11px] text-zinc-500 mt-1">{sub}</div>
          </div>
        ))}
      </div>

      <div className="rounded-[2rem] bg-premium-charcoal border border-premium-borderDark overflow-hidden">
        <div className="px-6 py-4 border-b border-premium-borderDark flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-display font-bold text-white">Newest events</h3>
            <p className="text-xs text-zinc-500">The latest events organizers created.</p>
          </div>
          <Link href="/admin/events" className="text-xs font-bold text-premium-gold hover:text-premium-goldHover flex items-center gap-1 scale-on-click">
            All events <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-premium-black text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="text-left px-6 py-3">Event</th>
                <th className="text-left px-6 py-3">Organizer</th>
                <th className="text-left px-6 py-3">Date</th>
                <th className="text-left px-6 py-3">Guests</th>
                <th className="text-left px-6 py-3">Package</th>
                <th className="text-right px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-premium-borderDark">
              {events === null && !error && (
                <tr><td colSpan={6} className="p-6 text-center text-zinc-500"><Loader2 className="w-4 h-4 animate-spin inline" /> Loading…</td></tr>
              )}
              {events !== null && recent.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-zinc-500">No events yet.</td></tr>
              )}
              {recent.map((e) => (
                <tr key={e.id}>
                  <td className="px-6 py-3.5">
                    <div className="font-bold text-white">{e.name}</div>
                    <div className="text-[11px] text-premium-neon font-mono">/events/{e.slug}</div>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="text-zinc-300">{e.org_name}</div>
                    <div className="text-[11px] text-zinc-500 font-mono">{e.owner_email ?? '—'}</div>
                  </td>
                  <td className="px-6 py-3.5 text-zinc-400 text-xs">{formatDate(e.starts_at)}</td>
                  <td className="px-6 py-3.5 text-zinc-300 font-mono">{e.guests.toLocaleString()}</td>
                  <td className="px-6 py-3.5 text-zinc-400 capitalize">{e.package}</td>
                  <td className="px-6 py-3.5 text-right">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-bold capitalize ${STATUS_STYLE[e.status]}`}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-1">
          <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">Photo retention</div>
          <div className="text-base font-display font-bold text-white">Deleted within 30 days after the event</div>
          <div className="text-xs text-zinc-500">Guest photos are stored in Supabase Storage.</div>
        </div>
        <Link href="/admin/whatsapp" className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark hover:border-premium-gold/50 transition-colors space-y-1 scale-on-click block">
          <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> WhatsApp pacing
          </div>
          <div className="text-base font-display font-bold text-white">5–15 s between messages, automatic</div>
          <div className="text-xs text-zinc-500">One shared platform number through Fonnte. Open the queue →</div>
        </Link>
      </div>
    </div>
  );
}
