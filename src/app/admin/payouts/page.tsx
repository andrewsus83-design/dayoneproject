'use client';

import React, { useState } from 'react';
import { formatIDR, formatDate } from '@/lib/utils';
import {
  Wallet,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  FileCheck,
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  X,
} from 'lucide-react';

interface PayoutRequest {
  id: string;
  partnerName: string;
  partnerCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  eventName: string;
  eventCompletedDate: string;
  guestCount: number;
  qualifyingSpend: number;
  cashbackRate: number;
  payoutAmount: number;
  status: 'pending' | 'paid' | 'flagged';
  transferRef?: string;
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([
    {
      id: 'pay-001',
      partnerName: 'Karya Digital Nusantara EO',
      partnerCode: 'EO-JKT-VVIP',
      bankName: 'BCA (Bank Central Asia)',
      accountNumber: '8820-192-881',
      accountHolder: 'PT Karya Digital Nusantara',
      eventName: 'Indonesia Cloud & AI Expo 2026',
      eventCompletedDate: '2026-10-18',
      guestCount: 1700,
      qualifyingSpend: 3400000,
      cashbackRate: 0.15, // 15% (1000+ pax)
      payoutAmount: 510000,
      status: 'pending',
    },
    {
      id: 'pay-002',
      partnerName: 'Starlight Wedding Planners',
      partnerCode: 'WO-BALI-GOLD',
      bankName: 'Bank Mandiri',
      accountNumber: '142-00-9988112-1',
      accountHolder: 'Starlight Kreasi Bali',
      eventName: 'The Royal Balinese Wedding',
      eventCompletedDate: '2026-10-12',
      guestCount: 520,
      qualifyingSpend: 1350000,
      cashbackRate: 0.12, // 12% (500+ pax)
      payoutAmount: 162000,
      status: 'pending',
    },
    {
      id: 'pay-003',
      partnerName: 'Nexus SEA Event Organizers',
      partnerCode: 'EO-VIP-SUMMIT',
      bankName: 'BCA (Bank Central Asia)',
      accountNumber: '527-118-2990',
      accountHolder: 'Nexus Event Management',
      eventName: 'SEA Fintech Forum 2025',
      eventCompletedDate: '2025-08-10',
      guestCount: 1100,
      qualifyingSpend: 3000000,
      cashbackRate: 0.15,
      payoutAmount: 450000,
      status: 'paid',
      transferRef: 'BCA-TRX-20250818-88192',
    },
  ]);

  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [transferRefInput, setTransferRefInput] = useState('');

  const handleApprove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayout) return;

    setPayouts((prev) =>
      prev.map((p) =>
        p.id === selectedPayout.id
          ? {
              ...p,
              status: 'paid',
              transferRef: transferRefInput || `BCA-TRX-${Date.now()}`,
            }
          : p
      )
    );

    setSelectedPayout(null);
    setTransferRefInput('');
  };

  const handleFlag = (id: string) => {
    setPayouts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'flagged' } : p))
    );
  };

  const pendingTotal = payouts
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.payoutAmount, 0);

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-10 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#241a38] pb-6">
        <div>
          <h1 className="text-2xl font-black text-white">EO & WO Cashback Disbursement Queue</h1>
          <p className="text-xs text-gray-400">
            Manual transfer verification and audit ledger for partner cashback commissions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[#1a1228] border border-[#3b245e] text-right">
            <span className="text-[10px] text-purple-300 font-mono uppercase block">Pending Disbursements</span>
            <span className="text-lg font-black text-[#dfb76c]">{formatIDR(pendingTotal)}</span>
          </div>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="rounded-2xl bg-[#110e1c] border border-[#241a38] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#241a38] flex items-center justify-between">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#dfb76c]" />
            <span>Eligible Cashback Requests</span>
          </div>
          <span className="text-xs font-mono text-gray-400">Min. payout threshold: Rp 100.000</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#0c0a14] border-b border-[#241a38] text-purple-300 uppercase font-mono text-[10px]">
              <tr>
                <th className="px-6 py-3.5">Partner & Bank Details</th>
                <th className="px-6 py-3.5">Event Completed</th>
                <th className="px-6 py-3.5">Guest Count</th>
                <th className="px-6 py-3.5">Cashback Rate</th>
                <th className="px-6 py-3.5">Disbursement Amount</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d1530]">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-[#181329] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white text-sm">{p.partnerName}</div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                      {p.bankName} • <strong className="text-white">{p.accountNumber}</strong> ({p.accountHolder})
                    </div>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#201538] text-[#dfb76c] font-mono border border-[#3b2563] inline-block mt-1">
                      Code: {p.partnerCode}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-semibold text-white">{p.eventName}</div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      Completed: {formatDate(p.eventCompletedDate)}
                    </div>
                  </td>

                  <td className="px-6 py-4 font-mono font-bold text-white">
                    {p.guestCount} pax
                  </td>

                  <td className="px-6 py-4 font-mono font-bold text-[#dfb76c]">
                    {(p.cashbackRate * 100).toFixed(0)}%
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-base font-black text-[#00ff88]">
                      {formatIDR(p.payoutAmount)}
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      Base spend: {formatIDR(p.qualifyingSpend)}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right">
                    {p.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPayout(p)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#07080f] bg-gradient-to-r from-[#00ff88] to-[#dfb76c] hover:brightness-110 shadow"
                        >
                          Approve Transfer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFlag(p.id)}
                          className="p-1.5 rounded-lg bg-[#201538] text-gray-400 hover:text-red-400 border border-[#3b2563]"
                          title="Audit Flag"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {p.status === 'paid' && (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00ff88]/10 text-[#00ff88] text-[11px] font-semibold border border-[#00ff88]/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Disbursed</span>
                        </span>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                          {p.transferRef}
                        </div>
                      </div>
                    )}

                    {p.status === 'flagged' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[11px] font-semibold border border-red-500/20">
                        <span>Under Audit Flag</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Transfer Confirmation Modal */}
      {selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#120e22] border border-[#3b2563] rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setSelectedPayout(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#00ff88]/10 text-[#00ff88]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Confirm Manual Payout</h3>
                <p className="text-xs text-gray-400">Record proof of bank transfer</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#090b14] border border-[#201736] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Recipient:</span>
                <span className="font-bold text-white">{selectedPayout.partnerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Bank Destination:</span>
                <span className="font-mono text-white">{selectedPayout.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Account #:</span>
                <span className="font-mono font-bold text-[#dfb76c]">{selectedPayout.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Account Holder:</span>
                <span className="text-white">{selectedPayout.accountHolder}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#1d1530]">
                <span className="text-gray-300 font-medium">Disbursement Amount:</span>
                <span className="font-black text-[#00ff88] text-sm">{formatIDR(selectedPayout.payoutAmount)}</span>
              </div>
            </div>

            <form onSubmit={handleApprove} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Bank Transfer Reference / Receipt ID *
                </label>
                <input
                  type="text"
                  required
                  value={transferRefInput}
                  onChange={(e) => setTransferRefInput(e.target.value)}
                  placeholder="e.g. BCA-TRX-20261021-99412"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090b14] border border-[#241a38] text-xs font-mono text-white focus:outline-none focus:border-[#00ff88]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPayout(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#1b152c] text-xs font-semibold text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-[#07080f] bg-gradient-to-r from-[#00ff88] to-[#dfb76c] hover:brightness-110 shadow"
                >
                  Mark as Transferred
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
