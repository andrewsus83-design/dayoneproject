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
    <div className="min-h-screen bg-premium-black text-zinc-100 flex flex-col font-sans select-none">
      {/* Top Header Bar */}
      <header className="h-20 px-6 sm:px-8 border-b border-premium-borderDark bg-premium-black/80 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/events/${eventId}/guests`}
            className="p-2.5 rounded-2xl bg-premium-charcoal text-zinc-400 hover:text-white border border-premium-borderDark scale-on-click"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-display font-medium text-white flex items-center gap-2">
              <span>Gate Check-In Terminal</span>
              <span className="w-2 h-2 rounded-full bg-premium-success shadow-[0_0_8px_#00E676] animate-pulse" />
            </h1>
            <p className="text-xs text-zinc-400 font-mono">{MOCK_EVENT.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-zinc-500">Total Checked In: </span>
            <strong className="text-premium-success font-display font-bold text-base">{checkedInCount}</strong>
            <span className="text-zinc-500"> / {guests.length}</span>
          </div>
        </div>
      </header>

      {/* Main Scanner Body */}
      <div className="flex-1 p-6 sm:p-8 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Scanner Viewfinder Simulator */}
        <div className="md:col-span-7 space-y-6">
          <div className="relative rounded-[2.5rem] overflow-hidden border border-premium-borderDark bg-premium-charcoal p-8 text-center shadow-2xl">
            {/* Viewfinder Target Frame matching Master UI Kit */}
            <div className="w-64 h-64 border-2 border-white/20 rounded-3xl overflow-hidden mb-6 relative mx-auto bg-premium-surfaceDark">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-premium-gold rounded-tl-2xl"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-premium-gold rounded-tr-2xl"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-premium-gold rounded-bl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-premium-gold rounded-br-2xl"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-premium-gold shadow-[0_0_15px_#C5A059] animate-scan-line"></div>
              
              <div className="w-full h-full flex flex-col items-center justify-center p-4">
                <QrCode className="w-16 h-16 text-premium-gold/30 animate-pulse" />
              </div>
            </div>

            <h3 className="text-xl font-display font-medium text-white mb-1">
              Point Attendee QR Pass Towards Camera
            </h3>
            <p className="text-xs text-zinc-500">
              High-speed sub-second optical detection active
            </p>

            {/* Quick Demo Scan Shortcuts */}
            <div className="mt-8 pt-6 border-t border-premium-borderDark">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
                Simulate Instant Test Scans:
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleProcessScan('QR-ALL41-SITI-3309')}
                  className="px-3 py-1.5 rounded-xl bg-premium-success/15 border border-premium-success/30 text-premium-success text-xs font-bold hover:bg-premium-success/25 transition-colors scale-on-click"
                >
                  Scan Pending (Siti Rahmawati)
                </button>
                <button
                  type="button"
                  onClick={() => handleProcessScan('QR-ALL41-BUDI-9812')}
                  className="px-3 py-1.5 rounded-xl bg-premium-danger/15 border border-premium-danger/30 text-premium-danger text-xs font-bold hover:bg-premium-danger/25 transition-colors scale-on-click"
                >
                  Scan Duplicate (Budi Santoso)
                </button>
                <button
                  type="button"
                  onClick={() => handleProcessScan('QR-INVALID-9999')}
                  className="px-3 py-1.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 text-xs font-bold hover:text-white transition-colors scale-on-click"
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
              className="mt-6 flex gap-3"
            >
              <input
                type="text"
                placeholder="Or manually enter token (e.g. QR-ALL41-SITI-3309)..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="flex-1 px-5 py-3.5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-premium-gold"
              />
              <button
                type="submit"
                className="px-6 py-3.5 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-bold text-xs shadow-gold scale-on-click transition-all"
              >
                Verify Pass
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Scan Result Card & Live Gate Feed */}
        <div className="md:col-span-5 space-y-6">
          {/* Dynamic Result Feedback Box */}
          {scanResult && (
            <div
              className={`p-8 rounded-[2.5rem] border shadow-2xl transition-all ${
                scanResult.status === 'success'
                  ? 'bg-premium-charcoal border-premium-success/40 text-premium-success'
                  : scanResult.status === 'already_checked_in'
                  ? 'bg-premium-charcoal border-premium-gold/40 text-premium-gold'
                  : 'bg-premium-charcoal border-premium-danger/40 text-premium-danger shadow-danger'
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                {scanResult.status === 'success' && <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />}
                {scanResult.status === 'already_checked_in' && <AlertTriangle className="w-10 h-10 stroke-[2.5]" />}
                {scanResult.status === 'not_found' && <XCircle className="w-10 h-10 stroke-[2.5]" />}

                <div>
                  <h3 className="text-xl font-display font-bold uppercase tracking-tight">
                    {scanResult.status === 'success' && 'Entry Verified'}
                    {scanResult.status === 'already_checked_in' && 'Duplicate Entry'}
                    {scanResult.status === 'not_found' && 'Invalid Pass'}
                  </h3>
                  <div className="text-xs opacity-90 font-light mt-0.5">{scanResult.message}</div>
                </div>
              </div>

              {scanResult.guest && (
                <div className="mt-4 pt-4 border-t border-current/20 space-y-2.5 text-xs">
                  <div className="flex justify-between font-bold text-white text-base font-display">
                    <span>Attendee:</span>
                    <span>{scanResult.guest.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Category:</span>
                    <span className="font-bold">{scanResult.guest.category}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Assigned Table:</span>
                    <span className="font-display font-bold text-lg text-white">
                      {scanResult.guest.table_number || 'Open Seating'}
                    </span>
                  </div>
                  {scanResult.guest.rsvp_notes && (
                    <div className="text-xs italic bg-black/40 p-3 rounded-xl mt-2 text-zinc-300">
                      Notes: {scanResult.guest.rsvp_notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Live Recent Check-in Feed */}
          <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark shadow-2xl">
            <div className="text-xs font-bold uppercase text-zinc-500 tracking-widest mb-4 flex items-center justify-between">
              <span>Recent Gate Admissions</span>
              <span className="text-xs text-premium-success flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-premium-success shadow-[0_0_8px_#00E676] animate-pulse" />
                Live Feed
              </span>
            </div>

            <div className="space-y-3">
              {recentLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    {log.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-premium-success flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-premium-gold flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-white text-sm font-display">{log.guestName}</div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        {log.table} • {log.time}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                      log.status === 'success'
                        ? 'bg-premium-success/20 text-premium-success border border-premium-success/30'
                        : 'bg-premium-gold/20 text-premium-gold border border-premium-gold/30'
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
