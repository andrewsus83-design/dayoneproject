'use client';

import React, { useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { formatIDR, formatDate } from '@/lib/utils';
import {
  Percent,
  Wallet,
  ArrowUpRight,
  Sparkles,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

export default function ReferralsLedgerPage() {
  const [copied, setCopied] = useState(false);
  const referralCode = 'EO-VIP-SUMMIT';

  const [ledger, setLedger] = useState([
    {
      id: 'led-001',
      eventName: 'TechUnite APAC Summit 2026',
      eventDate: '2026-11-15',
      guestCount: 650,
      packageBase: 1350000,
      extraGuestSpend: 112500, // 50 extra * 2250
      cashbackRate: 0.12, // 12% because >= 500 pax
      cashbackAmount: 175500,
      status: 'pending', // pending event completion
    },
    {
      id: 'led-002',
      eventName: 'Aria & Daniel Wedding Gala',
      eventDate: '2026-12-20',
      guestCount: 320,
      packageBase: 750000,
      extraGuestSpend: 50000, // 20 extra * 2500
      cashbackRate: 0.10, // 10% because >= 100 pax
      cashbackAmount: 80000,
      status: 'pending',
    },
    {
      id: 'led-003',
      eventName: 'SEA Fintech Forum 2025',
      eventDate: '2025-08-10',
      guestCount: 1100,
      packageBase: 3000000,
      extraGuestSpend: 0,
      cashbackRate: 0.15, // 15% because >= 1000 pax
      cashbackAmount: 450000,
      status: 'paid',
      paidDate: '2025-08-18',
    },
  ]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalEarnedLifetime = ledger
    .filter((l) => l.status === 'paid')
    .reduce((sum, l) => sum + l.cashbackAmount, 0);

  const pendingCashback = ledger
    .filter((l) => l.status === 'pending')
    .reduce((sum, l) => sum + l.cashbackAmount, 0);

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="EO & WO Referral Partner Hub"
        subtitle="Track event cashback commissions, referral disbursements, and partner payout tiers"
      />

      <div className="p-6 sm:p-8 space-y-8 max-w-7xl">
        {/* Top Partner Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-2xl bg-[#121624] border border-[#1e263d]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-gray-400 uppercase">Pending Post-Event Cashback</span>
              <div className="p-2 rounded-lg bg-[#dfb76c]/10 text-[#dfb76c]">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#dfb76c]">{formatIDR(pendingCashback)}</div>
            <div className="text-xs text-gray-400 mt-1">Disbursed automatically when active events wrap up</div>
          </div>

          <div className="p-6 rounded-2xl bg-[#121624] border border-[#1e263d]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-gray-400 uppercase">Total Lifetime Paid</span>
              <div className="p-2 rounded-lg bg-[#00ff88]/10 text-[#00ff88]">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#00ff88]">{formatIDR(totalEarnedLifetime)}</div>
            <div className="text-xs text-gray-400 mt-1">Paid directly to Bank Central Asia (BCA)</div>
          </div>

          <div className="p-6 rounded-2xl bg-[#121624] border border-[#1e263d] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-gray-400 uppercase">Your Referral Code</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#ff007f]/15 text-[#ff007f] font-mono border border-[#ff007f]/30">
                  Verified Partner
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-mono font-black text-white">{referralCode}</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1.5 rounded-lg bg-[#182035] text-gray-400 hover:text-white transition-colors"
                  title="Copy Code"
                >
                  {copied ? <Check className="w-4 h-4 text-[#00ff88]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="text-[11px] text-gray-400 mt-3">
              Give this code to your clients or attach to event bookings to bind commissions.
            </div>
          </div>
        </div>

        {/* Commission Scale Reference */}
        <div className="p-5 rounded-2xl bg-[#151929] border border-[#232c44]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#dfb76c]" />
                <span>Cashback Tier Scale (Min 100 pax required)</span>
              </h3>
              <p className="text-xs text-gray-400">
                Calculated on base package fee + extra guest top-ups. Paid out after event status is marked completed.
              </p>
            </div>
            <div className="text-xs font-mono text-gray-400">
              Disbursement threshold: <strong className="text-white">Min Rp 100.000</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#0e121e] border border-[#1b2234]">
              <div className="text-xs text-gray-400">100 - 499 Guests</div>
              <div className="text-lg font-black text-[#dfb76c]">10%</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0e121e] border border-[#1b2234]">
              <div className="text-xs text-gray-400">500 - 999 Guests</div>
              <div className="text-lg font-black text-[#00f0ff]">12%</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0e121e] border border-[#1b2234]">
              <div className="text-xs text-gray-400">1,000 - 1,999 Guests</div>
              <div className="text-lg font-black text-[#9d00ff]">15%</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0e121e] border border-[#1b2234]">
              <div className="text-xs text-gray-400">2,000+ Guests</div>
              <div className="text-lg font-black text-[#ff007f]">18%</div>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="rounded-2xl bg-[#121624] border border-[#1e263d] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1e263d] flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Commission Transaction Ledger</h3>
            <span className="text-xs text-gray-400 font-mono">{ledger.length} Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#0e121e] border-b border-[#1e263d] text-gray-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="px-6 py-3.5">Event Name</th>
                  <th className="px-6 py-3.5">Guest Count</th>
                  <th className="px-6 py-3.5">Qualifying Spend</th>
                  <th className="px-6 py-3.5">Rate</th>
                  <th className="px-6 py-3.5">Commission</th>
                  <th className="px-6 py-3.5 text-right">Payout Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182035]">
                {ledger.map((item) => (
                  <tr key={item.id} className="hover:bg-[#151a2c] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-sm">{item.eventName}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{formatDate(item.eventDate)}</div>
                    </td>

                    <td className="px-6 py-4 font-mono font-bold text-white">
                      {item.guestCount} pax
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{formatIDR(item.packageBase + item.extraGuestSpend)}</div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        Base: {formatIDR(item.packageBase)} + Extra: {formatIDR(item.extraGuestSpend)}
                      </div>
                    </td>

                    <td className="px-6 py-4 font-bold text-[#dfb76c] font-mono">
                      {(item.cashbackRate * 100).toFixed(0)}%
                    </td>

                    <td className="px-6 py-4 font-black text-white text-sm">
                      {formatIDR(item.cashbackAmount)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {item.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#00ff88]/10 text-[#00ff88] text-[11px] font-semibold border border-[#00ff88]/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Paid ({item.paidDate})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-400 text-[11px] font-semibold border border-amber-400/30">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending Event Wrap-up</span>
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
    </div>
  );
}
