'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/Header';
import { MOCK_EVENT, MOCK_WEDDING_EVENT, MOCK_GUESTS } from '@/lib/mockData';
import { PRICING_PLANS } from '@/lib/pricing';
import { formatIDR, formatDate } from '@/lib/utils';
import {
  Calendar,
  Users,
  QrCode,
  Camera,
  Gift,
  Gamepad2,
  ExternalLink,
  Plus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Building,
  Heart,
  TrendingUp,
} from 'lucide-react';

export default function DashboardPage() {
  const [filter, setFilter] = useState<'all' | 'corporate' | 'wedding'>('all');

  const events = [MOCK_EVENT, MOCK_WEDDING_EVENT];
  const filteredEvents =
    filter === 'all' ? events : events.filter((e) => e.event_type === filter);

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Event Operations"
        subtitle="Live event controls, guest check-in gates, and interactive launchers"
        actionText="New Event"
        actionHref="/dashboard/events/new"
      />

      <div className="p-6 sm:p-8 space-y-8 max-w-7xl">
        {/* Top Operational Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#121624] border border-[#1e263d]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-gray-400 uppercase">Active Events</span>
              <div className="p-2 rounded-lg bg-[#00f0ff]/10 text-[#00f0ff]">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white">2 Events</div>
            <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <span className="text-[#00ff88]">● Live</span>
              <span>1 Corporate • 1 Wedding</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#121624] border border-[#1e263d]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-gray-400 uppercase">Total Capacity</span>
              <div className="p-2 rounded-lg bg-[#dfb76c]/10 text-[#dfb76c]">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white">970 Guests</div>
            <div className="text-xs text-gray-400 mt-1">
              650 TechUnite • 320 Aria & Daniel
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#121624] border border-[#1e263d]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-gray-400 uppercase">Checked-in Today</span>
              <div className="p-2 rounded-lg bg-[#00ff88]/10 text-[#00ff88]">
                <QrCode className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white">418 Pax</div>
            <div className="text-xs text-[#00ff88] mt-1 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Realtime Gate Active (64.3%)</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#121624] border border-[#1e263d]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-gray-400 uppercase">EO/WO Cashback</span>
              <div className="p-2 rounded-lg bg-[#ff007f]/10 text-[#ff007f]">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#dfb76c]">
              {formatIDR(268500)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Pending completion payout
            </div>
          </div>
        </div>

        {/* Event List Section */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Managed Events</h2>
              <p className="text-xs text-gray-400">Select an event to manage attendees, launch screens, or configure add-ons</p>
            </div>

            <div className="flex items-center gap-2 bg-[#121624] p-1 rounded-xl border border-[#1e263d]">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-[#1a2136] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                All Events
              </button>
              <button
                type="button"
                onClick={() => setFilter('corporate')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === 'corporate'
                    ? 'bg-[#1a2136] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Corporate
              </button>
              <button
                type="button"
                onClick={() => setFilter('wedding')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === 'wedding'
                    ? 'bg-[#1a2136] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Weddings
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredEvents.map((evt) => {
              const isWedding = evt.event_type === 'wedding';
              const plan = PRICING_PLANS[evt.package_tier];
              const totalCap = evt.guest_limit + evt.extra_guests_purchased;

              return (
                <div
                  key={evt.id}
                  className="rounded-2xl bg-[#121624] border border-[#1e263d] hover:border-[#2d3a5a] transition-all p-6 flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Event Type Badge & Status */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            isWedding
                              ? 'bg-[#ff007f]/10 text-[#ff007f] border border-[#ff007f]/30'
                              : 'bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30'
                          }`}
                        >
                          {isWedding ? <Heart className="w-3.5 h-3.5" /> : <Building className="w-3.5 h-3.5" />}
                          <span className="capitalize">{evt.event_type}</span>
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-[#1e263d] text-[#dfb76c] font-mono border border-[#dfb76c]/30 uppercase">
                          {evt.package_tier} Tier
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00ff88]/10 text-[#00ff88] text-xs font-semibold border border-[#00ff88]/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                        Live Active
                      </span>
                    </div>

                    {/* Event Name & Date */}
                    <h3 className="text-xl font-bold text-white hover:text-[#00f0ff] transition-colors">
                      <Link href={`/dashboard/events/${evt.id}/guests`}>{evt.name}</Link>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(evt.start_date)} • {evt.location_name}
                    </p>

                    {/* Stats pills */}
                    <div className="grid grid-cols-3 gap-2 my-5 p-3 rounded-xl bg-[#0c0e17] border border-[#1b2234]">
                      <div>
                        <div className="text-[10px] text-gray-500 font-mono uppercase">Capacity</div>
                        <div className="text-sm font-bold text-white">{totalCap} pax</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-mono uppercase">Extra Added</div>
                        <div className="text-sm font-bold text-[#00f0ff]">+{evt.extra_guests_purchased} pax</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-mono uppercase">White Label</div>
                        <div className="text-sm font-bold text-[#dfb76c]">
                          {evt.is_white_label ? 'Enabled' : 'Standard'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="space-y-2 pt-4 border-t border-[#1b2234]">
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/dashboard/events/${evt.id}/guests`}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#192237] border border-[#263554] text-xs font-semibold text-white hover:bg-[#202c48] transition-colors"
                      >
                        <Users className="w-3.5 h-3.5 text-[#00ff88]" />
                        <span>Manage Guests</span>
                      </Link>

                      <Link
                        href={`/dashboard/events/${evt.id}/checkin`}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#192237] border border-[#263554] text-xs font-semibold text-white hover:bg-[#202c48] transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5 text-[#00f0ff]" />
                        <span>QR Gate Scanner</span>
                      </Link>
                    </div>

                    {/* Public Live Links */}
                    <div className="flex items-center justify-between text-xs pt-1 px-1">
                      <Link
                        href={`/events/${evt.slug}`}
                        target="_blank"
                        className="text-gray-400 hover:text-white flex items-center gap-1"
                      >
                        <span>Guest Portal</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                      <Link
                        href={`/events/${evt.slug}/photowall/live`}
                        target="_blank"
                        className="text-[#00f0ff] hover:underline flex items-center gap-1"
                      >
                        <span>Live Photo Wall</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                      <Link
                        href={`/events/${evt.slug}/raffle`}
                        target="_blank"
                        className="text-[#dfb76c] hover:underline flex items-center gap-1"
                      >
                        <span>Raffle Wheel</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Create New Event Card Placeholder */}
            <Link
              href="/dashboard/events/new"
              className="rounded-2xl border-2 border-dashed border-[#1e263d] hover:border-[#dfb76c] bg-[#0d101a]/50 hover:bg-[#121624] transition-all p-8 flex flex-col items-center justify-center text-center group min-h-[300px]"
            >
              <div className="w-12 h-12 rounded-xl bg-[#192237] border border-[#263554] flex items-center justify-center text-[#dfb76c] group-hover:scale-110 transition-transform mb-3">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-[#dfb76c] transition-colors">
                Create Another Event
              </h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Launch a corporate summit, wedding reception, or exhibition in under 2 minutes.
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
