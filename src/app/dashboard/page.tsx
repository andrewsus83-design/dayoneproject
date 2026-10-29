'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/Header';
import { MOCK_EVENT, MOCK_WEDDING_EVENT } from '@/lib/mockData';
import { PRICING_PLANS } from '@/lib/pricing';
import { formatIDR, formatDate } from '@/lib/utils';
import {
  Calendar,
  Users,
  QrCode,
  Sparkles,
  Building,
  Heart,
  TrendingUp,
  Globe,
  ExternalLink,
  Plus,
  ArrowRight,
  Camera,
  Play,
  Gift,
} from 'lucide-react';

export default function DashboardPage() {
  const [filter, setFilter] = useState<'all' | 'corporate' | 'wedding'>('all');

  const events = [MOCK_EVENT, MOCK_WEDDING_EVENT];
  const filteredEvents =
    filter === 'all' ? events : events.filter((e) => e.event_type === filter);

  return (
    <div className="flex-1 flex flex-col font-sans select-none">
      <Header
        title="My Events"
        subtitle="Live event controls, guest check-in gates, and interactive launchers"
        actionText="New Event"
        actionHref="/dashboard/events/new"
      />

      <div className="p-8 md:p-10 xl:p-12 space-y-10 max-w-[1400px]">

        {/* ── Operational Metrics ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            {
              label: 'Active Events',
              value: '2 Events',
              sub: '1 Corporate · 1 Wedding',
              icon: Calendar,
              iconBg: 'bg-premium-neon/10 text-premium-neon border-premium-neon/20',
              subEl: (
                <span className="inline-flex items-center gap-1.5 text-premium-success font-semibold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-premium-success shadow-[0_0_8px_#00E676]" />
                  Live
                </span>
              ),
            },
            {
              label: 'Total Capacity',
              value: '970 Guests',
              sub: '650 TechUnite · 320 Daniel & Aria',
              icon: Users,
              iconBg: 'bg-premium-gold/10 text-premium-gold border-premium-gold/20',
            },
            {
              label: 'Checked In Today',
              value: '418 Pax',
              sub: '',
              icon: QrCode,
              iconBg: 'bg-premium-success/10 text-premium-success border-premium-success/20',
              subEl: (
                <span className="inline-flex items-center gap-1 text-premium-success text-[11px] font-semibold">
                  <TrendingUp className="w-3 h-3" />
                  Gate Active (64.3%)
                </span>
              ),
            },
            {
              label: 'EO/WO Cashback',
              value: formatIDR(268500),
              valueClass: 'text-premium-gold',
              sub: '18% Partner Rebate Active',
              icon: Sparkles,
              iconBg: 'bg-premium-gold/10 text-premium-gold border-premium-gold/20',
            },
          ].map(({ label, value, valueClass, sub, subEl, icon: Icon, iconBg }) => (
            <div
              key={label}
              className="p-7 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark hover:border-white/10 transition-colors"
            >
              <div className="flex items-start justify-between mb-5">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.18em] leading-tight">
                  {label}
                </span>
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-3xl font-display font-bold leading-none ${valueClass ?? 'text-white'}`}>
                {value}
              </div>
              <div className="mt-3 text-[12px] text-zinc-500">
                {subEl ?? sub}
              </div>
            </div>
          ))}
        </div>

        {/* ── Event Cards ── */}
        <div>
          {/* Section header + filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
            <div>
              <h2 className="text-2xl font-display font-medium text-white tracking-tight">Managed Events</h2>
              <p className="text-[13px] text-zinc-500 mt-1 font-light">
                Select an event to manage guests, launch screens, or configure add-ons
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-premium-surfaceDark p-1.5 rounded-2xl border border-premium-borderDark flex-shrink-0">
              {(['all', 'corporate', 'wedding'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all scale-on-click capitalize ${
                    filter === f
                      ? 'bg-premium-gold text-black shadow-gold'
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'corporate' ? 'Corporate' : 'Weddings'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-7">
            {filteredEvents.map((evt) => {
              const isWedding = evt.event_type === 'wedding';
              const plan = PRICING_PLANS[evt.package_tier];
              const totalCap = evt.guest_limit + evt.extra_guests_purchased;
              const checkedIn = isWedding ? 0 : 418;
              const checkInPct = checkedIn > 0 ? Math.round((checkedIn / totalCap) * 100) : 0;

              return (
                <div
                  key={evt.id}
                  className="group rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark hover:border-white/[0.12] transition-all shadow-2xl overflow-hidden flex flex-col"
                >
                  {/* ── Visual Banner ── */}
                  <Link
                    href={`/dashboard/events/${evt.id}`}
                    className="relative block h-36 overflow-hidden flex-shrink-0"
                  >
                    {/* Themed gradient bg */}
                    <div
                      className={`absolute inset-0 ${
                        isWedding
                          ? 'bg-gradient-to-br from-premium-danger/20 via-premium-black to-premium-surfaceDark'
                          : 'bg-gradient-to-br from-premium-neon/15 via-premium-black to-premium-surfaceDark'
                      }`}
                    />
                    {/* Ambient glow */}
                    <div
                      className={`absolute top-0 right-0 w-48 h-48 blur-[80px] rounded-full ${
                        isWedding ? 'bg-premium-danger/20' : 'bg-premium-neon/15'
                      }`}
                    />
                    {/* Grid overlay */}
                    <div className="absolute inset-0 opacity-[0.04]"
                      style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}
                    />

                    {/* Overlaid event name */}
                    <div className="absolute inset-0 flex flex-col justify-end p-6">
                      <h3 className="text-xl font-display font-bold text-white group-hover:text-premium-gold transition-colors leading-tight">
                        {evt.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isWedding
                            ? 'bg-premium-danger/15 text-premium-danger border-premium-danger/30'
                            : 'bg-premium-neon/15 text-premium-neon border-premium-neon/30'
                        }`}>
                          {isWedding ? <Heart className="w-3 h-3" /> : <Building className="w-3 h-3" />}
                          {evt.event_type}
                        </span>
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-premium-gold/15 text-premium-gold border border-premium-gold/25 font-bold uppercase tracking-wider">
                          {evt.package_tier}
                        </span>
                      </div>
                    </div>

                    {/* Live badge */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-premium-black/70 backdrop-blur-sm border border-premium-success/30 text-[10px] font-bold text-premium-success">
                      <span className="w-1.5 h-1.5 rounded-full bg-premium-success animate-pulse" />
                      Live Active
                    </div>
                  </Link>

                  {/* ── Card Body ── */}
                  <div className="p-6 flex-1 flex flex-col gap-5">
                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-2 text-[12px]">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-premium-surfaceDark border border-premium-borderDark font-mono text-premium-neon">
                        <Globe className="w-3 h-3" />
                        {evt.slug}.all41.app
                      </span>
                      <span className="text-zinc-500">
                        {formatDate(evt.start_date)} · {evt.location_name}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Capacity', value: `${totalCap}`, unit: 'pax', color: 'text-white' },
                        { label: 'Checked In', value: checkedIn > 0 ? `${checkedIn}` : '—', unit: checkedIn > 0 ? `${checkInPct}%` : '', color: checkedIn > 0 ? 'text-premium-success' : 'text-zinc-500' },
                        { label: 'Extra Pax', value: `+${evt.extra_guests_purchased}`, unit: 'pax', color: 'text-premium-neon' },
                      ].map(({ label, value, unit, color }) => (
                        <div key={label} className="p-3.5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-center">
                          <div className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold mb-1">{label}</div>
                          <div className={`text-base font-display font-bold ${color}`}>{value}</div>
                          {unit && <div className="text-[10px] text-zinc-600 mt-0.5 font-mono">{unit}</div>}
                        </div>
                      ))}
                    </div>

                    {/* Check-in progress bar (only if has check-ins) */}
                    {checkedIn > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-zinc-500">
                          <span>Check-in progress</span>
                          <span className="text-premium-success font-semibold">{checkInPct}%</span>
                        </div>
                        <div className="h-1.5 bg-premium-surfaceDark rounded-full overflow-hidden">
                          <div
                            className="h-full bg-premium-success rounded-full transition-all"
                            style={{ width: `${checkInPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
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

                      {/* Quick launch row */}
                      <div className="flex items-center justify-between text-[11px] px-0.5">
                        {[
                          { href: `/events/${evt.slug}`, label: 'Portal', icon: Globe, color: 'text-zinc-400' },
                          { href: `/events/${evt.slug}/stage`, label: 'Stage LED', icon: Play, color: 'text-premium-gold' },
                          { href: `/events/${evt.slug}/photowall/live`, label: 'Live Wall', icon: Camera, color: 'text-premium-neon' },
                          { href: `/events/${evt.slug}/raffle`, label: 'Raffle', icon: Gift, color: 'text-zinc-400' },
                        ].map(({ href, label, icon: Icon, color }) => (
                          <Link
                            key={href}
                            href={href}
                            target="_blank"
                            className={`flex items-center gap-1 font-medium ${color} hover:text-white transition-colors`}
                          >
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
            })}

            {/* Create event card */}
            <Link
              href="/dashboard/events/new"
              className="group rounded-[2.5rem] border-2 border-dashed border-premium-borderDark hover:border-premium-gold/50 bg-transparent hover:bg-premium-gold/[0.02] transition-all flex flex-col items-center justify-center text-center min-h-[360px] scale-on-click gap-5 p-10"
            >
              <div className="w-16 h-16 rounded-full bg-premium-charcoal border border-premium-borderDark group-hover:border-premium-gold/40 flex items-center justify-center text-zinc-500 group-hover:text-premium-gold group-hover:scale-110 transition-all shadow-lg">
                <Plus className="w-7 h-7" />
              </div>
              <div>
                <div className="text-xl font-display font-medium text-zinc-300 group-hover:text-white transition-colors">
                  Create New Event
                </div>
                <p className="text-[13px] text-zinc-600 mt-2 font-light leading-relaxed max-w-xs">
                  Launch a corporate summit, luxury gala, or wedding in under 60 seconds.
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
