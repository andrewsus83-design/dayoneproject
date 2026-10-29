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
    <div className="flex-1 flex flex-col font-sans select-none">
      <Header
        title="EO & WO Referral Partner Hub"
        subtitle="Track event cashback commissions, referral disbursements, and partner payout tiers"
        actionText="Back to Operations"
        actionHref="/dashboard"
      />

      <div className="p-6 sm:p-8 space-y-8 max-w-7xl">
        {/* Top Partner Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-8 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Pending Post-Event Cashback</span>
              <div className="p-2.5 rounded-2xl bg-premium-gold/15 text-premium-gold border border-premium-gold/30 shadow-gold">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-display font-bold text-premium-gold">{formatIDR(pendingCashback)}</div>
            <div className="text-xs text-zinc-400 mt-2 font-light">Disbursed automatically when active events wrap up</div>
          </div>

          <div className="p-8 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Lifetime Paid</span>
              <div className="p-2.5 rounded-2xl bg-premium-success/15 text-premium-success border border-premium-success/30">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-display font-bold text-premium-success">{formatIDR(totalEarnedLifetime)}</div>
            <div className="text-xs text-zinc-400 mt-2 font-light">Paid directly to Bank Central Asia (BCA)</div>
          </div>

          <div className="p-8 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Your Referral Code</span>
                <span className="text-xs px-3 py-1 rounded-full bg-premium-gold/20 text-premium-gold font-bold border border-premium-gold/30 uppercase tracking-wider">
                  Partner
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-mono font-bold text-white">{referralCode}</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 hover:text-white transition-colors scale-on-click"
                  title="Copy Code"
                >
                  {copied ? <Check className="w-4 h-4 text-premium-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="text-xs text-zinc-500 mt-3 font-light">
              Give this code to your clients or attach to event bookings to bind commissions.
            </div>
          </div>
        </div>

        {/* Commission Scale Reference */}
        <div className="p-8 rounded-[2rem] bg-premium-surfaceDark border border-premium-borderDark">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-display font-medium text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-premium-gold" />
                <span>Cashback Tier Scale (Min 100 pax required)</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-light">
                Calculated on base package fee + extra guest top-ups. Paid out after event status is marked completed.
              </p>
            </div>
            <div className="text-xs font-mono text-zinc-400">
              Disbursement threshold: <strong className="text-white">Min Rp 100.000</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark">
              <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">100 - 499 Guests</div>
              <div className="text-2xl font-display font-bold text-premium-gold mt-1">10%</div>
            </div>
            <div className="p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark">
              <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">500 - 999 Guests</div>
              <div className="text-2xl font-display font-bold text-premium-neon mt-1">12%</div>
            </div>
            <div className="p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark">
              <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">1,000 - 1,999 Guests</div>
              <div className="text-2xl font-display font-bold text-premium-gold mt-1">15%</div>
            </div>
            <div className="p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark">
              <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">2,000+ Guests</div>
              <div className="text-2xl font-display font-bold text-premium-danger mt-1">18%</div>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-premium-charcoal rounded-[2.5rem] border border-premium-borderDark overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-premium-borderDark flex items-center justify-between bg-premium-surfaceDark">
            <h3 className="font-display font-medium text-lg text-white">Commission Transaction Ledger</h3>
            <span className="text-xs text-zinc-500 font-mono">{ledger.length} Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-premium-black text-zinc-500 font-bold uppercase tracking-widest text-xs">
                <tr>
                  <th className="px-8 py-5">Event Name</th>
                  <th className="px-8 py-5">Guest Count</th>
                  <th className="px-8 py-5">Qualifying Spend</th>
                  <th className="px-8 py-5">Rate</th>
                  <th className="px-8 py-5">Commission</th>
                  <th className="px-8 py-5 text-right">Payout Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-premium-borderDark">
                {ledger.map((item) => (
                  <tr key={item.id} className="hover:bg-premium-surfaceDark transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-bold text-white text-base font-display">{item.eventName}</div>
                      <div className="text-xs text-zinc-500 font-mono mt-0.5">{formatDate(item.eventDate)}</div>
                    </td>

                    <td className="px-8 py-6 font-mono font-bold text-white">
                      {item.guestCount} pax
                    </td>

                    <td className="px-8 py-6">
                      <div className="font-medium text-white font-mono">{formatIDR(item.packageBase + item.extraGuestSpend)}</div>
                      <div className="text-xs text-zinc-500 font-mono mt-0.5">
                        Base: {formatIDR(item.packageBase)} + Extra: {formatIDR(item.extraGuestSpend)}
                      </div>
                    </td>

                    <td className="px-8 py-6 font-display font-bold text-premium-gold text-base">
                      {(item.cashbackRate * 100).toFixed(0)}%
                    </td>

                    <td className="px-8 py-6 font-display font-bold text-white text-lg">
                      {formatIDR(item.cashbackAmount)}
                    </td>

                    <td className="px-8 py-6 text-right">
                      {item.status === 'paid' ? (
                        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-premium-success/20 text-premium-success text-xs font-bold uppercase border border-premium-success/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Paid ({item.paidDate})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-premium-gold/20 text-premium-gold text-xs font-bold uppercase border border-premium-gold/30">
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
