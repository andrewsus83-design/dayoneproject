'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/Header';
import { Event } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { BASE_EVENTS, eventFromRow, type OrgEventRow } from '@/lib/events';
import { useGuests } from '@/lib/eventStore';
import { listOrgEvents } from '@/lib/orgEvents';
import { isPlatformAdmin } from '@/lib/auth';
import { useSessionUser } from '@/lib/useSession';
import {
  Calendar,
  CalendarClock,
  Users,
  QrCode,
  Building,
  Heart,
  Globe,
  ExternalLink,
  Plus,
  ArrowRight,
  Camera,
  Play,
  Gift,
  Loader2,
} from 'lucide-react';

type Listed = { event: Event; status: 'draft' | 'published' | 'sample' };

const STATUS_BADGE: Record<Listed['status'], { label: string; className: string; dot: string }> = {
  published: { label: 'Published', className: 'border-premium-success/30 text-premium-success', dot: 'bg-premium-success animate-pulse' },
  draft: { label: 'Draft', className: 'border-premium-gold/30 text-premium-gold', dot: 'bg-premium-gold' },
  sample: { label: 'Sample', className: 'border-zinc-600 text-zinc-400', dot: 'bg-zinc-500' },
};

function EventCard({ event: evt, status }: Listed) {
  const guests = useGuests(evt.id);
  const isWedding = evt.event_type === 'wedding';
  const checkedIn = guests.filter((g) => g.is_checked_in).length;
  const checkInPct = guests.length ? Math.round((checkedIn / guests.length) * 100) : 0;
  const badge = STATUS_BADGE[status];

  return (
    <div className="group rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark hover:border-white/[0.12] transition-all shadow-2xl overflow-hidden flex flex-col">
      {/* ── Visual Banner ── */}
      <Link href={`/dashboard/events/${evt.id}`} className="relative block h-36 overflow-hidden flex-shrink-0 scale-on-click">
        <div
          className={`absolute inset-0 ${
            isWedding
              ? 'bg-gradient-to-br from-premium-danger/20 via-premium-black to-premium-surfaceDark'
              : 'bg-gradient-to-br from-premium-neon/15 via-premium-black to-premium-surfaceDark'
          }`}
        />
        <div className={`absolute top-0 right-0 w-48 h-48 blur-[80px] rounded-full ${isWedding ? 'bg-premium-danger/20' : 'bg-premium-neon/15'}`} />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />

        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <h3 className="text-xl font-display font-bold text-white group-hover:text-premium-gold transition-colors leading-tight">{evt.name}</h3>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                isWedding ? 'bg-premium-danger/15 text-premium-danger border-premium-danger/30' : 'bg-premium-neon/15 text-premium-neon border-premium-neon/30'
              }`}
            >
              {isWedding ? <Heart className="w-3 h-3" /> : <Building className="w-3 h-3" />}
              {evt.event_type}
            </span>
          </div>
        </div>

        <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-premium-black/70 backdrop-blur-sm border text-[10px] font-bold ${badge.className}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
          {badge.label}
        </div>
      </Link>

      {/* ── Card Body ── */}
      <div className="p-6 flex-1 flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-premium-surfaceDark border border-premium-borderDark font-mono text-premium-neon">
            <Globe className="w-3 h-3" />
            app.dayoneproject.xyz/events/{evt.slug}
          </span>
          <span className="text-zinc-500">
            {formatDate(evt.start_date)}
            {evt.location_name ? ` · ${evt.location_name}` : ''}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Guests', value: `${guests.length}`, unit: 'on the list', color: 'text-white' },
            { label: 'Checked In', value: checkedIn > 0 ? `${checkedIn}` : '—', unit: checkedIn > 0 ? `${checkInPct}%` : 'not yet', color: checkedIn > 0 ? 'text-premium-success' : 'text-zinc-500' },
          ].map(({ label, value, unit, color }) => (
            <div key={label} className="p-3.5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-center">
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold mb-1">{label}</div>
              <div className={`text-base font-display font-bold ${color}`}>{value}</div>
              <div className="text-[10px] text-zinc-600 mt-0.5 font-mono">{unit}</div>
            </div>
          ))}
        </div>

        {checkedIn > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>Check-in progress</span>
              <span className="text-premium-success font-semibold">{checkInPct}%</span>
            </div>
            <div className="h-1.5 bg-premium-surfaceDark rounded-full overflow-hidden">
              <div className="h-full bg-premium-success rounded-full transition-all" style={{ width: `${checkInPct}%` }} />
            </div>
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-premium-borderDark space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/dashboard/events/${evt.id}/guests`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-premium-gold text-black text-[12px] font-bold hover:bg-premium-goldHover transition-all shadow-gold scale-on-click"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Guests</span>
            </Link>
            <Link
              href={`/dashboard/events/${evt.id}/operator`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-[12px] font-bold text-white hover:border-white/20 transition-colors scale-on-click"
            >
              <QrCode className="w-3.5 h-3.5 text-premium-neon" />
              <span>Operator</span>
            </Link>
          </div>

          <div className="flex items-center justify-between text-[11px] px-0.5">
            {[
              { href: `/events/${evt.slug}`, label: 'Portal', icon: Globe, color: 'text-zinc-400' },
              { href: `/events/${evt.slug}/stage`, label: 'Stage LED', icon: Play, color: 'text-premium-gold' },
              { href: `/events/${evt.slug}/photowall/live`, label: 'Live Wall', icon: Camera, color: 'text-premium-neon' },
              { href: `/events/${evt.slug}/doorprize`, label: 'Door Prize', icon: Gift, color: 'text-zinc-400' },
            ].map(({ href, label, icon: Icon, color }) => (
              <Link key={href} href={href} target="_blank" className={`flex items-center gap-1 font-medium ${color} hover:text-white transition-colors scale-on-click`}>
                <Icon className="w-3 h-3" />
                <span>{label}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-50" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useSessionUser();
  const [filter, setFilter] = useState<'all' | 'corporate' | 'wedding'>('all');
  const [rows, setRows] = useState<OrgEventRow[] | null>(null);
  const [upcoming, setUpcoming] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listOrgEvents()
      .then((r) => {
        if (!alive) return;
        const now = Date.now();
        setRows(r);
        setUpcoming(r.filter((row) => new Date(row.ends_at).getTime() > now).length);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Could not load your events.'));
    return () => {
      alive = false;
    };
  }, []);

  // Organizers only ever see their organization's events; the platform admin also sees the built-in samples.
  const own: Listed[] = (rows ?? []).map((r) => ({ event: eventFromRow(r), status: r.status === 'published' ? 'published' : 'draft' }));
  const samples: Listed[] = isPlatformAdmin(user) ? BASE_EVENTS.map((event) => ({ event, status: 'sample' })) : [];
  const listed = [...own, ...samples];
  const filtered = filter === 'all' ? listed : listed.filter((l) => l.event.event_type === filter);

  return (
    <div className="flex-1 flex flex-col font-sans select-none">
      <Header title="My Events" subtitle="Your organization's events, guest check-in and live screens" />

      <div className="p-8 md:p-10 xl:p-12 space-y-10 max-w-[1400px]">
        {/* ── Metrics ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            { label: 'Your Events', value: `${own.length}`, sub: rows ? 'In your organization' : 'Loading…', icon: Calendar, iconBg: 'bg-premium-neon/10 text-premium-neon border-premium-neon/20' },
            { label: 'Upcoming', value: `${upcoming}`, sub: 'Not finished yet', icon: CalendarClock, iconBg: 'bg-premium-gold/10 text-premium-gold border-premium-gold/20' },
            { label: 'Corporate', value: `${own.filter((l) => l.event.event_type === 'corporate').length}`, sub: 'Summits, galas, launches', icon: Building, iconBg: 'bg-premium-neon/10 text-premium-neon border-premium-neon/20' },
            { label: 'Weddings', value: `${own.filter((l) => l.event.event_type === 'wedding').length}`, sub: 'Ceremonies and receptions', icon: Heart, iconBg: 'bg-premium-danger/10 text-premium-danger border-premium-danger/20' },
          ].map(({ label, value, sub, icon: Icon, iconBg }) => (
            <div key={label} className="p-7 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark hover:border-white/10 transition-colors">
              <div className="flex items-start justify-between mb-5">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.18em] leading-tight">{label}</span>
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-display font-bold leading-none text-white">{value}</div>
              <div className="mt-3 text-[12px] text-zinc-500">{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Event Cards ── */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
            <div>
              <h2 className="text-2xl font-display font-medium text-white tracking-tight">Events</h2>
              <p className="text-[13px] text-zinc-500 mt-1 font-light">Open an event to build its pages, manage guests and run the day</p>
            </div>
            <div className="flex items-center gap-1.5 bg-premium-surfaceDark p-1.5 rounded-2xl border border-premium-borderDark flex-shrink-0">
              {(['all', 'corporate', 'wedding'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all scale-on-click capitalize ${
                    filter === f ? 'bg-premium-gold text-black shadow-gold' : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'corporate' ? 'Corporate' : 'Weddings'}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-sm font-bold">{error}</div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-7">
            {!rows && !error && (
              <div className="rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark min-h-[360px] flex items-center justify-center gap-3 text-sm text-zinc-400">
                <Loader2 className="w-4 h-4 animate-spin text-premium-gold" /> Loading your events…
              </div>
            )}

            {filtered.map((l) => (
              <EventCard key={l.event.id} {...l} />
            ))}

            <Link
              href="/dashboard/events/new"
              className="group rounded-[2.5rem] border-2 border-dashed border-premium-borderDark hover:border-premium-gold/50 bg-transparent hover:bg-premium-gold/[0.02] transition-all flex flex-col items-center justify-center text-center min-h-[360px] scale-on-click gap-5 p-10"
            >
              <div className="w-16 h-16 rounded-full bg-premium-charcoal border border-premium-borderDark group-hover:border-premium-gold/40 flex items-center justify-center text-zinc-500 group-hover:text-premium-gold group-hover:scale-110 transition-all shadow-lg">
                <Plus className="w-7 h-7" />
              </div>
              <div>
                <div className="text-xl font-display font-medium text-zinc-300 group-hover:text-white transition-colors">
                  {rows && own.length === 0 ? 'Create your first event' : 'Create New Event'}
                </div>
                <p className="text-[13px] text-zinc-600 mt-2 font-light leading-relaxed max-w-xs">
                  A corporate summit, gala or wedding — set up in about a minute.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 text-[12px] font-bold text-premium-gold opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Get started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
