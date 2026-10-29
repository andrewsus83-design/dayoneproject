'use client';

import React, { useState, useRef, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { MOCK_GUESTS, MOCK_EVENT, MOCK_WEDDING_EVENT } from '@/lib/mockData';
import { Guest } from '@/lib/types';
import {
  QrCode,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Camera,
  Flashlight,
  Wifi,
  RefreshCw,
  Clock,
  UserPlus,
  X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type GateTab = 'scan' | 'guests';
type ScanResult = {
  status: 'success' | 'duplicate' | 'invalid';
  guest?: Guest;
  message: string;
  timestamp: string;
};

// ─── Main Component ───────────────────────────────────────────────────────────
function GateRegisterContent({ slug }: { slug: string }) {
  const event = slug === 'aria-daniel' ? MOCK_WEDDING_EVENT : MOCK_EVENT;
  const isWedding = event.event_type === 'wedding';

  const [activeTab, setActiveTab] = useState<GateTab>('scan');
  const [guests, setGuests] = useState<Guest[]>(MOCK_GUESTS);
  const [searchQuery, setSearchQuery] = useState('');

  // Scan state
  const [tokenInput, setTokenInput] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanFlash, setScanFlash] = useState<'idle' | 'success' | 'error'>('idle');
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Manual add guest
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualTable, setManualTable] = useState('');
  const [manualCategory, setManualCategory] = useState<'VIP' | 'Regular' | 'Press'>('Regular');

  // Focus the scan input when on scan tab
  useEffect(() => {
    if (activeTab === 'scan') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeTab]);

  const checkedInCount = guests.filter((g) => g.is_checked_in).length;

  const handleScan = (rawToken: string) => {
    const token = rawToken.trim();
    if (!token) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const found = guests.find((g) => g.qr_code_token.toLowerCase() === token.toLowerCase());

    let result: ScanResult;

    if (!found) {
      result = { status: 'invalid', message: 'Pass not found in roster', timestamp: now };
      setScanFlash('error');
    } else if (found.is_checked_in) {
      result = {
        status: 'duplicate',
        message: `Already checked in at ${found.checked_in_at ? new Date(found.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'earlier'}`,
        guest: found,
        timestamp: now,
      };
      setScanFlash('error');
    } else {
      const updated: Guest = {
        ...found,
        is_checked_in: true,
        checked_in_at: new Date().toISOString(),
        checked_in_by: 'Gate Register PWA',
      };
      setGuests((prev) => prev.map((g) => (g.id === found.id ? updated : g)));
      result = {
        status: 'success',
        message: 'Admission verified',
        guest: updated,
        timestamp: now,
      };
      setScanFlash('success');
    }

    setScanResult(result);
    setRecentScans((prev) => [result, ...prev.slice(0, 9)]);
    setTokenInput('');

    setTimeout(() => {
      setScanFlash('idle');
      inputRef.current?.focus();
    }, 1400);
  };

  const handleManualAddGuest = () => {
    if (!manualName.trim()) return;
    const now = new Date().toISOString();
    const token = `QR-WALK-IN-${Date.now()}`;
    const newGuest: Guest = {
      id: `walk-in-${Date.now()}`,
      event_id: event.id,
      name: manualName.trim(),
      email: null,
      phone: null,
      table_number: manualTable.trim() || null,
      category: manualCategory,
      plus_one_count: 0,
      rsvp_status: 'attending',
      rsvp_notes: null,
      qr_code_token: token,
      is_checked_in: true,
      checked_in_at: now,
      checked_in_by: 'Gate Register — Manual',
      photos_uploaded_count: 0,
      emails_sent_count: 0,
      whatsapp_sent_count: 0,
      custom_fields: {},
      created_at: now,
      updated_at: now,
    };
    setGuests((prev) => [newGuest, ...prev]);
    const scanTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const result: ScanResult = {
      status: 'success',
      guest: newGuest,
      message: 'Walk-in admitted manually',
      timestamp: scanTime,
    };
    setScanResult(result);
    setRecentScans((prev) => [result, ...prev.slice(0, 9)]);
    setScanFlash('success');
    setTimeout(() => { setScanFlash('idle'); inputRef.current?.focus(); }, 1400);
    setShowManualAdd(false);
    setManualName('');
    setManualTable('');
    setManualCategory('Regular');
  };

  const filteredGuests = guests.filter((g) => {
    const q = searchQuery.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      (g.table_number || '').toLowerCase().includes(q) ||
      g.qr_code_token.toLowerCase().includes(q)
    );
  });

  const sortedGuests = [...filteredGuests].sort((a, b) => {
    // Checked-in last
    if (a.is_checked_in !== b.is_checked_in) return a.is_checked_in ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 flex justify-center font-sans">

      {/* Flash overlay for scan feedback */}
      <div
        className={`fixed inset-0 z-[100] pointer-events-none transition-opacity duration-300 ${
          scanFlash === 'success'
            ? 'bg-premium-success/25 opacity-100'
            : scanFlash === 'error'
            ? 'bg-premium-danger/20 opacity-100'
            : 'opacity-0'
        }`}
      />

      {/* Mobile Shell */}
      <div className="w-full max-w-[420px] min-h-screen sm:min-h-[860px] sm:h-[880px] bg-premium-black sm:rounded-[3.5rem] sm:border-[12px] sm:border-premium-charcoal shadow-[0_0_60px_rgba(0,0,0,0.6)] relative flex flex-col sm:ring-1 sm:ring-zinc-800 overflow-hidden">

        {/* Top Bar */}
        <header className="px-5 pt-10 sm:pt-7 pb-4 flex justify-between items-center bg-premium-black border-b border-premium-borderDark flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/events/${event.id}/operator`}
              className="w-8 h-8 rounded-full bg-premium-charcoal border border-premium-borderDark flex items-center justify-center text-zinc-400 hover:text-white scale-on-click"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <p className="text-[9px] font-mono font-bold text-premium-gold uppercase tracking-[0.2em] leading-none mb-0.5">
                Gate Register
              </p>
              <h3 className="font-display font-bold text-[15px] text-white leading-tight truncate max-w-[180px]">
                {event.name}
              </h3>
            </div>
          </div>

          {/* Live gate counter */}
          <div className="text-right">
            <div className="text-xl font-display font-bold text-premium-success leading-none">
              {checkedInCount}
            </div>
            <div className="text-[9px] font-mono text-zinc-500 leading-tight">
              / {guests.length} in
            </div>
          </div>
        </header>

        {/* Progress bar */}
        <div className="h-0.5 bg-premium-surfaceDark flex-shrink-0">
          <div
            className="h-full bg-premium-success transition-all duration-500"
            style={{ width: `${(checkedInCount / guests.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar pb-24">

          {/* ── TAB: SCAN ─────────────────────────────────────── */}
          {activeTab === 'scan' && (
            <div className="px-5 py-5 space-y-4">

              {/* Manual add button row */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-zinc-600 uppercase tracking-wider">QR Scanner</span>
                <button
                  type="button"
                  onClick={() => setShowManualAdd(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-premium-charcoal border border-premium-borderDark text-[11px] font-bold text-zinc-400 hover:text-white hover:border-premium-gold scale-on-click transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Guest Manually
                </button>
              </div>

              {/* Camera viewfinder placeholder */}
              <div
                className={`relative aspect-square rounded-[2rem] border-2 overflow-hidden flex flex-col items-center justify-center transition-all duration-300 ${
                  scanFlash === 'success'
                    ? 'border-premium-success bg-premium-success/10'
                    : scanFlash === 'error'
                    ? 'border-premium-danger bg-premium-danger/10'
                    : 'border-zinc-700 bg-premium-charcoal'
                }`}
              >
                {/* Scan line animation when idle */}
                {scanFlash === 'idle' && (
                  <>
                    {/* Corner brackets */}
                    {[
                      'top-6 left-6 border-t-2 border-l-2',
                      'top-6 right-6 border-t-2 border-r-2',
                      'bottom-6 left-6 border-b-2 border-l-2',
                      'bottom-6 right-6 border-b-2 border-r-2',
                    ].map((cls, i) => (
                      <div key={i} className={`absolute w-8 h-8 rounded-sm border-premium-gold ${cls}`} />
                    ))}

                    {/* Scanning line */}
                    <div className="absolute w-[65%] h-0.5 bg-premium-gold/70 animate-scan-line" />

                    <Camera className="w-12 h-12 text-zinc-600 mb-3" />
                    <p className="text-[12px] text-zinc-500 font-medium text-center px-8">
                      Point camera at guest QR pass
                    </p>
                    <p className="text-[10px] font-mono text-zinc-600 mt-1">
                      Or use the scanner field below
                    </p>
                  </>
                )}

                {/* Success state */}
                {scanFlash === 'success' && scanResult?.guest && (
                  <div className="flex flex-col items-center gap-3 p-6 text-center">
                    <CheckCircle2 className="w-16 h-16 text-premium-success" />
                    <div>
                      <div className="text-xl font-display font-bold text-white">
                        {scanResult.guest.name}
                      </div>
                      <div className="text-[13px] text-premium-success font-mono mt-1">
                        Table {scanResult.guest.table_number || '—'}
                      </div>
                      <div className="text-[11px] font-bold text-premium-success uppercase tracking-wider mt-2">
                        Admitted ✓
                      </div>
                    </div>
                  </div>
                )}

                {/* Error / duplicate state */}
                {scanFlash === 'error' && (
                  <div className="flex flex-col items-center gap-3 p-6 text-center">
                    {scanResult?.status === 'duplicate' ? (
                      <>
                        <AlertCircle className="w-14 h-14 text-premium-gold" />
                        <div>
                          <div className="text-base font-display font-bold text-white">
                            {scanResult.guest?.name}
                          </div>
                          <div className="text-[12px] text-premium-gold font-bold mt-1">
                            Already Checked In
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-1">
                            {scanResult.message}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-14 h-14 text-premium-danger" />
                        <div>
                          <div className="text-base font-display font-bold text-premium-danger">
                            Invalid Pass
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-1">
                            Token not found in roster
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Manual token input (USB wedge / paste) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleScan(tokenInput);
                }}
                className="flex gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Scan or paste QR token..."
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="flex-1 px-4 py-3 rounded-2xl bg-premium-charcoal border border-premium-borderDark text-[13px] font-mono text-white focus:outline-none focus:border-premium-gold placeholder-zinc-600 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!tokenInput.trim()}
                  className="px-5 py-3 rounded-2xl bg-premium-gold text-black font-bold text-[12px] shadow-gold scale-on-click disabled:opacity-40"
                >
                  Check
                </button>
              </form>

              {/* Quick test tokens */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-wider">Demo tokens</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { token: 'QR-ALL41-SITI-3309', label: 'Siti', type: 'new' },
                    { token: 'QR-ALL41-BUDI-9812', label: 'Budi', type: 'dup' },
                    { token: 'INVALID-TOKEN', label: 'Invalid', type: 'err' },
                  ].map(({ token, label, type }) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => handleScan(token)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold border scale-on-click ${
                        type === 'new'
                          ? 'bg-premium-success/10 text-premium-success border-premium-success/30'
                          : type === 'dup'
                          ? 'bg-premium-gold/10 text-premium-gold border-premium-gold/25'
                          : 'bg-premium-danger/10 text-premium-danger border-premium-danger/25'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent scan log */}
              {recentScans.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-wider">
                    Recent Scans
                  </div>
                  <div className="space-y-1.5">
                    {recentScans.map((scan, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 p-3 rounded-2xl border text-[12px] ${
                          scan.status === 'success'
                            ? 'bg-premium-success/5 border-premium-success/20'
                            : scan.status === 'duplicate'
                            ? 'bg-premium-gold/5 border-premium-gold/20'
                            : 'bg-premium-danger/5 border-premium-danger/20'
                        }`}
                      >
                        {scan.status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-premium-success flex-shrink-0" />
                        ) : scan.status === 'duplicate' ? (
                          <AlertCircle className="w-4 h-4 text-premium-gold flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-premium-danger flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-white truncate">
                            {scan.guest?.name || 'Unknown'}
                          </span>
                          {scan.guest?.table_number && (
                            <span className="text-zinc-500 ml-2">· Table {scan.guest.table_number}</span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-zinc-600 flex-shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {scan.timestamp}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: GUEST LIST ────────────────────────────────── */}
          {activeTab === 'guests' && (
            <div className="px-5 py-5 space-y-4">

              {/* Stats bar */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total', value: guests.length, color: 'text-white' },
                  { label: 'In', value: checkedInCount, color: 'text-premium-success' },
                  { label: 'Pending', value: guests.length - checkedInCount, color: 'text-zinc-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark text-center">
                    <div className={`text-2xl font-display font-bold ${color}`}>{value}</div>
                    <div className="text-[10px] font-mono text-zinc-600 uppercase mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, table, or token..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-premium-charcoal border border-premium-borderDark text-[13px] text-white focus:outline-none focus:border-premium-gold placeholder-zinc-600 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Guest list */}
              <div className="space-y-2">
                {sortedGuests.length === 0 ? (
                  <div className="py-10 text-center">
                    <Users className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                    <div className="text-[13px] text-zinc-500">No guests match your search</div>
                  </div>
                ) : (
                  sortedGuests.map((guest) => (
                    <div
                      key={guest.id}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                        guest.is_checked_in
                          ? 'bg-premium-success/5 border-premium-success/20'
                          : 'bg-premium-charcoal border-premium-borderDark'
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm flex-shrink-0 ${
                          guest.is_checked_in
                            ? 'bg-premium-success text-black'
                            : 'bg-premium-surfaceDark text-zinc-400 border border-premium-borderDark'
                        }`}
                      >
                        {guest.name.charAt(0)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[13px] font-bold truncate ${guest.is_checked_in ? 'text-white' : 'text-zinc-300'}`}>
                            {guest.name}
                          </span>
                          {guest.is_checked_in && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-premium-success flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] mt-0.5">
                          <span className="text-zinc-500">
                            {guest.table_number ? `Table ${guest.table_number}` : 'No table'}
                          </span>
                          {guest.category && (
                            <>
                              <span className="text-zinc-700">·</span>
                              <span
                                className={`font-bold ${
                                  isWedding
                                    ? 'text-premium-danger'
                                    : guest.category === 'VIP'
                                    ? 'text-premium-gold'
                                    : 'text-premium-neon'
                                }`}
                              >
                                {guest.category}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className="flex-shrink-0">
                        {guest.is_checked_in ? (
                          <span className="text-[10px] font-mono font-bold text-premium-success bg-premium-success/10 px-2.5 py-1 rounded-full border border-premium-success/20">
                            IN
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleScan(guest.qr_code_token)}
                            className="text-[10px] font-mono font-bold text-zinc-400 bg-premium-surfaceDark px-2.5 py-1 rounded-full border border-premium-borderDark hover:border-premium-gold hover:text-premium-gold scale-on-click transition-colors"
                          >
                            Admit
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Manual Add Guest Modal */}
        {showManualAdd && (
          <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-full bg-premium-charcoal rounded-t-[2.5rem] border border-premium-borderDark p-6 space-y-5 pb-10">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[17px] font-display font-bold text-white">Add Walk-in Guest</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Guest not on roster — add &amp; admit now</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualAdd(false)}
                  className="w-9 h-9 rounded-full bg-premium-surfaceDark border border-premium-borderDark flex items-center justify-center text-zinc-400 hover:text-white scale-on-click"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Name field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Full Name *</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Budi Hartono"
                  autoFocus
                  className="w-full px-4 py-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-[14px] text-white focus:outline-none focus:border-premium-gold placeholder-zinc-600 transition-colors"
                />
              </div>

              {/* Table field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Table Number</label>
                <input
                  type="text"
                  value={manualTable}
                  onChange={(e) => setManualTable(e.target.value)}
                  placeholder="e.g. A7"
                  className="w-full px-4 py-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-[14px] text-white focus:outline-none focus:border-premium-gold placeholder-zinc-600 transition-colors"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Category</label>
                <div className="flex gap-2">
                  {(['Regular', 'VIP', 'Press'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setManualCategory(cat)}
                      className={`flex-1 py-2.5 rounded-2xl text-[12px] font-bold transition-all scale-on-click border ${
                        manualCategory === cat
                          ? cat === 'VIP'
                            ? 'bg-premium-gold text-black border-premium-gold shadow-gold'
                            : cat === 'Press'
                            ? 'bg-premium-neon/20 text-premium-neon border-premium-neon/40'
                            : 'bg-premium-surfaceDark text-white border-white/20'
                          : 'text-zinc-500 border-premium-borderDark bg-transparent hover:border-zinc-500'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Admit button */}
              <button
                type="button"
                onClick={handleManualAddGuest}
                disabled={!manualName.trim()}
                className="w-full py-4 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-[15px] shadow-gold scale-on-click disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Add &amp; Admit Guest
              </button>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 left-0 right-0 z-30 flex-shrink-0">
          <div className="mx-4 mb-5 glass-panel rounded-[2rem] flex overflow-hidden border border-zinc-700/80">
            {[
              { id: 'scan' as GateTab, icon: QrCode, label: 'Scan' },
              { id: 'guests' as GateTab, icon: Users, label: `Guests (${guests.length})` },
            ].map(({ id, icon: Icon, label }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 flex items-center justify-center gap-2.5 py-4 text-[13px] font-bold transition-all scale-on-click ${
                    isActive
                      ? 'bg-premium-gold text-black'
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Next.js 16 wrapper ───────────────────────────────────────────────────────
function GateRegisterWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <GateRegisterContent slug={slug} />;
}

export default function GateRegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-premium-black" />}>
      <GateRegisterWrapper params={params} />
    </Suspense>
  );
}
