'use client';

import React, { useState, use, Suspense } from 'react';
import Link from 'next/link';
import { MOCK_EVENT, MOCK_GUESTS } from '@/lib/mockData';
import { Guest } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Volume2,
  RefreshCw,
  Users,
  Search,
  Sparkles,
} from 'lucide-react';

function CheckinScannerContent({ eventId }: { eventId: string }) {
  const [guests, setGuests] = useState<Guest[]>(MOCK_GUESTS);
  const [tokenInput, setTokenInput] = useState('');
  const [scanResult, setScanResult] = useState<{
    status: 'success' | 'already_checked_in' | 'not_found';
    guest?: Guest;
    message: string;
  } | null>(null);

  const [recentLogs, setRecentLogs] = useState<{
    guestName: string;
    table: string;
    time: string;
    status: 'success' | 'duplicate';
  }[]>([
    { guestName: 'Clarissa Tan', table: 'Platinum 03', time: '08:52 AM', status: 'success' },
    { guestName: 'Budi Santoso', table: 'Diamond 01', time: '08:45 AM', status: 'success' },
    { guestName: 'David Kevin Pratama', table: 'Press Hub', time: '08:30 AM', status: 'success' },
  ]);

  const handleProcessScan = (tokenToScan: string) => {
    const trimmed = tokenToScan.trim();
    if (!trimmed) return;

    const found = guests.find((g) => g.qr_code_token.toLowerCase() === trimmed.toLowerCase());

    if (!found) {
      setScanResult({
        status: 'not_found',
        message: `Token "${trimmed}" is not recognized for this event.`,
      });
      return;
    }

    if (found.is_checked_in) {
      setScanResult({
        status: 'already_checked_in',
        guest: found,
        message: `Already checked in at ${found.checked_in_at ? formatDateTime(found.checked_in_at) : 'earlier today'} by ${found.checked_in_by || 'Gate Crew'}.`,
      });
      setRecentLogs((prev) => [
        { guestName: found.name, table: found.table_number || 'N/A', time: 'Just now', status: 'duplicate' },
        ...prev.slice(0, 7),
      ]);
      return;
    }

    // Mark as checked in
    const updated = guests.map((g) =>
      g.id === found.id
        ? {
            ...g,
            is_checked_in: true,
            checked_in_at: new Date().toISOString(),
            checked_in_by: 'Main Gate Terminal Alpha',
          }
        : g
    );

    setGuests(updated);
    setScanResult({
      status: 'success',
      guest: { ...found, is_checked_in: true },
      message: `Verified! Welcome to ${MOCK_EVENT.name}.`,
    });

    setRecentLogs((prev) => [
      { guestName: found.name, table: found.table_number || 'N/A', time: 'Just now', status: 'success' },
      ...prev.slice(0, 7),
    ]);
    setTokenInput('');
  };

  const checkedInCount = guests.filter((g) => g.is_checked_in).length;

  return (
    <div className="min-h-screen bg-[#080a10] text-[#f8fafc] flex flex-col">
      {/* Top Header Bar */}
      <header className="h-16 px-6 border-b border-[#1b2234] bg-[#0c101a] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/events/${eventId}/guests`}
            className="p-2 rounded-lg bg-[#141a29] text-gray-400 hover:text-white border border-[#232d44]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Gate Check-In Terminal</span>
              <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            </h1>
            <p className="text-[10px] text-gray-400 font-mono">{MOCK_EVENT.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-gray-400">Total Checked In: </span>
            <strong className="text-[#00ff88] text-sm">{checkedInCount}</strong>
            <span className="text-gray-400"> / {guests.length}</span>
          </div>
        </div>
      </header>

      {/* Main Scanner Body */}
      <div className="flex-1 p-6 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Scanner Viewfinder Simulator */}
        <div className="md:col-span-7 space-y-6">
          <div className="relative rounded-3xl overflow-hidden border-2 border-[#1f283d] bg-[#0e121e] p-6 text-center shadow-2xl">
            {/* Viewfinder Target Frame */}
            <div className="relative w-full aspect-square max-w-sm mx-auto rounded-2xl border-2 border-dashed border-[#00f0ff]/50 bg-[#121827] flex flex-col items-center justify-center p-6 overflow-hidden">
              {/* Animated Laser Scanning Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent shadow-[0_0_15px_#00f0ff] animate-bounce" />

              <div className="p-4 rounded-2xl bg-[#00f0ff]/10 text-[#00f0ff] mb-4">
                <QrCode className="w-16 h-16 animate-pulse" />
              </div>
              <p className="text-xs text-gray-300 font-semibold">
                Point Attendee QR Pass Towards Camera
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                High-speed sub-second optical detection active
              </p>
            </div>

            {/* Quick Demo Scan Shortcuts */}
            <div className="mt-6 pt-4 border-t border-[#1a2133]">
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">
                Simulate Instant Test Scans:
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleProcessScan('QR-ALL41-SITI-3309')}
                  className="px-2.5 py-1.5 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] text-xs font-medium hover:bg-[#00ff88]/20 transition-colors"
                >
                  Scan Pending (Siti Rahmawati)
                </button>
                <button
                  type="button"
                  onClick={() => handleProcessScan('QR-ALL41-BUDI-9812')}
                  className="px-2.5 py-1.5 rounded-lg bg-[#ff007f]/10 border border-[#ff007f]/30 text-[#ff007f] text-xs font-medium hover:bg-[#ff007f]/20 transition-colors"
                >
                  Scan Duplicate (Budi Santoso)
                </button>
                <button
                  type="button"
                  onClick={() => handleProcessScan('QR-INVALID-9999')}
                  className="px-2.5 py-1.5 rounded-lg bg-[#192237] border border-[#27375a] text-gray-400 text-xs font-medium hover:text-white transition-colors"
                >
                  Scan Invalid
                </button>
              </div>
            </div>

            {/* Manual Token Entry Fallback */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessScan(tokenInput);
              }}
              className="mt-4 flex gap-2"
            >
              <input
                type="text"
                placeholder="Or manually enter token (e.g. QR-ALL41-SITI-3309)..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#090b12] border border-[#1e263d] text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-[#00f0ff]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#00f0ff] text-[#0b0d13] font-bold text-xs hover:brightness-110 transition-all"
              >
                Verify
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Scan Result Card & Live Gate Feed */}
        <div className="md:col-span-5 space-y-6">
          {/* Dynamic Result Feedback Box */}
          {scanResult && (
            <div
              className={`p-6 rounded-3xl border shadow-2xl transition-all animate-fadeIn ${
                scanResult.status === 'success'
                  ? 'bg-[#0b1f17] border-[#00ff88] text-[#00ff88]'
                  : scanResult.status === 'already_checked_in'
                  ? 'bg-[#29131c] border-[#ff007f] text-[#ff007f]'
                  : 'bg-[#241315] border-red-500 text-red-400'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                {scanResult.status === 'success' && <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />}
                {scanResult.status === 'already_checked_in' && <AlertTriangle className="w-8 h-8 stroke-[2.5]" />}
                {scanResult.status === 'not_found' && <XCircle className="w-8 h-8 stroke-[2.5]" />}

                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">
                    {scanResult.status === 'success' && 'Entry Verified'}
                    {scanResult.status === 'already_checked_in' && 'Duplicate Entry'}
                    {scanResult.status === 'not_found' && 'Invalid Pass'}
                  </h3>
                  <div className="text-xs opacity-90">{scanResult.message}</div>
                </div>
              </div>

              {scanResult.guest && (
                <div className="mt-4 pt-4 border-t border-current/20 space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-white text-sm">
                    <span>Attendee:</span>
                    <span>{scanResult.guest.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Category:</span>
                    <span className="font-semibold">{scanResult.guest.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Assigned Table:</span>
                    <span className="font-extrabold text-base text-[#dfb76c]">
                      {scanResult.guest.table_number || 'Open Seating'}
                    </span>
                  </div>
                  {scanResult.guest.rsvp_notes && (
                    <div className="text-[11px] italic bg-black/30 p-2 rounded-lg mt-2">
                      Notes: {scanResult.guest.rsvp_notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Live Recent Check-in Feed */}
          <div className="p-5 rounded-2xl bg-[#0f1320] border border-[#1b2234]">
            <div className="text-xs font-mono uppercase text-gray-400 tracking-wider mb-3 flex items-center justify-between">
              <span>Recent Gate Admissions</span>
              <span className="text-[10px] text-[#00ff88]">Live Feed</span>
            </div>

            <div className="space-y-2.5">
              {recentLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#14192a] border border-[#1f283d] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {log.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-[#00ff88] flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#ff007f] flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-white">{log.guestName}</div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {log.table} • {log.time}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      log.status === 'success'
                        ? 'bg-[#00ff88]/10 text-[#00ff88]'
                        : 'bg-[#ff007f]/10 text-[#ff007f]'
                    }`}
                  >
                    {log.status === 'success' ? 'Admitted' : 'Duplicate'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckinScannerWrapper({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  return <CheckinScannerContent eventId={unwrappedParams.id} />;
}

export default function CheckinScannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-gray-400">Loading scanner...</div>}>
      <CheckinScannerWrapper params={params} />
    </Suspense>
  );
}
