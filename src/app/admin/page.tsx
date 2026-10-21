'use client';

import React from 'react';
import Link from 'next/link';
import { formatIDR, formatDate } from '@/lib/utils';
import {
  Shield,
  TrendingUp,
  Wallet,
  Users,
  HardDrive,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  Server,
  AlertCircle,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const stats = {
    totalGMV: 48750000,
    totalEvents: 42,
    activeEventsNow: 8,
    totalGuestsServed: 18450,
    pendingCashback: 1840000,
    storageUsedGb: 14.8,
    r2RetainedFilesCount: 4290,
  };

  const recentEvents = [
    {
      id: 'evt-1',
      name: 'TechUnite APAC Summit 2026',
      client: 'Nexus SEA Org',
      tier: 'Pro (600 pax)',
      extraGuests: 50,
      totalPaid: 1462500,
      cashbackDue: 175500,
      status: 'active',
    },
    {
      id: 'evt-2',
      name: 'Aria & Daniel: The Grand Celebration',
      client: 'Starlight Wedding Studio',
      tier: 'Plus (300 pax)',
      extraGuests: 20,
      totalPaid: 1050000,
      cashbackDue: 80000,
      status: 'active',
    },
    {
      id: 'evt-3',
      name: 'Indonesia Cloud & AI Expo 2026',
      client: 'Karya Digital Nusantara',
      tier: 'Business (1,500 pax)',
      extraGuests: 200,
      totalPaid: 3400000,
      cashbackDue: 510000,
      status: 'completed',
    },
    {
      id: 'evt-4',
      name: 'Bali Luxury Gala Dinner',
      client: 'Island Oasis WO',
      tier: 'Starter (50 pax)',
      extraGuests: 40,
      totalPaid: 270000,
      cashbackDue: 0, // under 100 pax threshold
      status: 'completed',
    },
  ];

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-10 space-y-8 max-w-7xl">
      {/* Superadmin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#241a38] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#201538] border border-[#3c2563] text-xs font-semibold text-[#dfb76c] mb-2 font-mono">
            <Shield className="w-3.5 h-3.5" />
            <span>Platform Master Root</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">System Administration</h1>
          <p className="text-xs text-gray-400">Realtime revenue telemetry, Cloudflare storage monitoring, and partner payouts</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/payouts"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#07080f] bg-gradient-to-r from-[#dfb76c] to-[#9d00ff] hover:brightness-110 shadow"
          >
            <Wallet className="w-4 h-4" />
            <span>Review Referral Payouts ({formatIDR(stats.pendingCashback)})</span>
          </Link>
        </div>
      </div>

      {/* High-level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#110e1c] border border-[#241a38]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-purple-300 uppercase">Gross Platform GMV</span>
            <div className="p-2 rounded-lg bg-[#dfb76c]/10 text-[#dfb76c]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{formatIDR(stats.totalGMV)}</div>
          <div className="text-[11px] text-[#00ff88] mt-1 font-semibold flex items-center gap-1">
            <span>+24.5% vs last month</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#110e1c] border border-[#241a38]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-purple-300 uppercase">Total Events Created</span>
            <div className="p-2 rounded-lg bg-[#9d00ff]/10 text-[#9d00ff]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.totalEvents} Events</div>
          <div className="text-[11px] text-gray-400 mt-1">
            <strong className="text-[#00ff88]">{stats.activeEventsNow} live</strong> currently in ballroom
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#110e1c] border border-[#241a38]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-purple-300 uppercase">Attendees Checked In</span>
            <div className="p-2 rounded-lg bg-[#00f0ff]/10 text-[#00f0ff]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.totalGuestsServed.toLocaleString()}</div>
          <div className="text-[11px] text-gray-400 mt-1">
            Zero paper tickets printed
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#110e1c] border border-[#241a38]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-purple-300 uppercase">Cloudflare R2 Retention</span>
            <div className="p-2 rounded-lg bg-[#00ff88]/10 text-[#00ff88]">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.storageUsedGb} GB</div>
          <div className="text-[11px] text-gray-400 mt-1">
            {stats.r2RetainedFilesCount.toLocaleString()} WebP photos • 30-day purge active
          </div>
        </div>
      </div>

      {/* Cloudflare Storage & WhatsApp Fair-Use System Health Monitor */}
      <div className="p-6 rounded-3xl bg-[#120e22] border border-[#2d1f47] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#dfb76c]/10 text-[#dfb76c]">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Infrastructure & Fair-Use Enforcement</h3>
              <p className="text-xs text-gray-400">Automated workers managing Cloudflare media purges and WhatsApp queuing delays</p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20 font-mono">
            Scheduler Running
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-[#090b14] border border-[#201736]">
            <div className="text-xs text-gray-400 font-mono uppercase">Photo Retention</div>
            <div className="text-base font-bold text-white mt-1">Auto-purge &gt; 30 days</div>
            <div className="text-[11px] text-gray-400 mt-1">Next purge cycle in 4 hours (128 expired photos)</div>
          </div>

          <div className="p-4 rounded-xl bg-[#090b14] border border-[#201736]">
            <div className="text-xs text-gray-400 font-mono uppercase">WhatsApp Rate Limiting</div>
            <div className="text-base font-bold text-white mt-1">3.5s - 7.0s Random Jitter</div>
            <div className="text-[11px] text-gray-400 mt-1">Protects BYON event numbers from carrier flagging</div>
          </div>

          <div className="p-4 rounded-xl bg-[#090b14] border border-[#201736]">
            <div className="text-xs text-gray-400 font-mono uppercase">Referral Payout Minimum</div>
            <div className="text-base font-bold text-white mt-1">Rp 100.000 Threshold</div>
            <div className="text-[11px] text-gray-400 mt-1">Strictly applies after event completion</div>
          </div>
        </div>
      </div>

      {/* Recent Client Events & Revenue Breakdown */}
      <div className="rounded-2xl bg-[#110e1c] border border-[#241a38] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#241a38] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">All Platform Event Bookings</h3>
            <p className="text-xs text-gray-400">Live feed of package tiers and partner cashback calculations</p>
          </div>
          <span className="text-xs font-mono text-gray-400">Showing 4 of {stats.totalEvents}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#0c0a14] border-b border-[#241a38] text-purple-300 uppercase font-mono text-[10px]">
              <tr>
                <th className="px-6 py-3.5">Event Name & Client</th>
                <th className="px-6 py-3.5">Package Tier</th>
                <th className="px-6 py-3.5">Extra Guests</th>
                <th className="px-6 py-3.5">Total GMV</th>
                <th className="px-6 py-3.5">Cashback Liability</th>
                <th className="px-6 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d1530]">
              {recentEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-[#181329] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white text-sm">{evt.name}</div>
                    <div className="text-[11px] text-gray-400 font-mono">{evt.client}</div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded bg-[#201538] border border-[#3b2563] text-[#dfb76c] font-medium font-mono text-[11px]">
                      {evt.tier}
                    </span>
                  </td>

                  <td className="px-6 py-4 font-mono">
                    {evt.extraGuests > 0 ? (
                      <span className="text-[#00f0ff]">+{evt.extraGuests} pax</span>
                    ) : (
                      <span className="text-gray-500">None</span>
                    )}
                  </td>

                  <td className="px-6 py-4 font-bold text-white">
                    {formatIDR(evt.totalPaid)}
                  </td>

                  <td className="px-6 py-4 font-bold text-[#dfb76c] font-mono">
                    {evt.cashbackDue > 0 ? (
                      formatIDR(evt.cashbackDue)
                    ) : (
                      <span className="text-gray-500 font-normal">&lt; 100 pax (Rp 0)</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    {evt.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00ff88]/10 text-[#00ff88] text-[11px] font-semibold border border-[#00ff88]/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-400/10 text-purple-300 text-[11px] font-semibold border border-purple-400/20">
                        <span>Completed</span>
                      </span>
                    )}
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
