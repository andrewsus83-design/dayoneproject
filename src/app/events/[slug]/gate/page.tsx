'use client';

import React, { useState, useRef, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { formatGuestNumber, useEventConfigBySlug } from '@/lib/eventStore';
import { RegisterDeskLock } from '@/components/events/RegisterDeskLock';
import { QrScanner } from '@/components/events/QrScanner';
import { useDesk, type DeskGuest, type ScanResult } from './useDesk';
import {
  QrCode,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Clock,
  UserPlus,
  X,
  Lock,
  WifiOff,
  Loader2,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';

type GateTab = 'scan' | 'guests';

// ─── Main Component ───────────────────────────────────────────────────────────
function GateRegisterContent({ slug, onLock }: { slug: string; onLock: () => void }) {
  const { eventId, event, config } = useEventConfigBySlug(slug);
  const isWedding = event.event_type === 'wedding';

  const [activeTab, setActiveTab] = useState<GateTab>('scan');
  // Saved events check in on the server, so every desk at the door sees the same list and counts.
  const desk = useDesk(eventId, activeTab === 'guests');
  const digits = Math.max(3, String(Math.max(desk.total, config.info.capacity || 0, 1)).length);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<{ query: string; guests: DeskGuest[] | null } | null>(null);

  // Scan state
  const [tokenInput, setTokenInput] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanFlash, setScanFlash] = useState<'idle' | 'success' | 'error'>('idle');
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  // Manual add guest
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualTable, setManualTable] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualCategory, setManualCategory] = useState<'VIP' | 'Regular' | 'Press'>('Regular');
  const [manualError, setManualError] = useState<string | null>(null);

  // Focus the scan input when on scan tab
  useEffect(() => {
    if (activeTab !== 'scan') return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(t);
  }, [activeTab]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  // Server search (names, guest numbers, phone digits, emails) as the desk types.
  const query = searchQuery.trim();
  const { sample: isSampleDesk, search } = desk;
  useEffect(() => {
    if (isSampleDesk || !query) return;
    let alive = true;
    const t = window.setTimeout(() => {
      search(query).then((guests) => alive && setSearchHits({ query, guests }));
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [isSampleDesk, search, query]);

  const showResult = (result: ScanResult) => {
    setScanResult(result);
    setRecentScans((prev) => [result, ...prev.slice(0, 9)]);
    const ok = result.status === 'success' || result.status === 'queued';
    setScanFlash(ok ? 'success' : 'error');
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => {
      setScanFlash('idle');
      inputRef.current?.focus();
    }, ok ? 1400 : 2200);
  };

  const handleScan = async (rawToken: string) => {
    const token = rawToken.trim();
    if (!token || busy) return;
    setBusy(true);
    setTokenInput('');
    try {
      showResult(await desk.checkInToken(token));
    } finally {
      setBusy(false);
    }
  };

  const handleAdmit = async (guest: DeskGuest) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await desk.checkInById(guest.id);
      showResult(result);
      if (result.status !== 'invalid') setActiveTab('scan');
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async (guest: DeskGuest) => {
    if (!confirm(`Undo the check-in of ${guest.name}?`)) return;
    const problem = await desk.undo(guest.id);
    setNotice(problem ?? `${guest.name} is no longer checked in.`);
    setRecentScans((prev) => prev.filter((s) => s.guest?.id !== guest.id));
    if (scanResult?.guest?.id === guest.id) setScanFlash('idle');
    if (searchHits?.guests) {
      setSearchHits({ ...searchHits, guests: searchHits.guests.map((g) => (g.id === guest.id ? { ...g, checkedInAt: null } : g)) });
    }
  };

  const handleManualAddGuest = async () => {
    if (!manualName.trim() || busy) return;
    setBusy(true);
    setManualError(null);
    try {
      const result = await desk.walkIn({ name: manualName, table: manualTable, phone: manualPhone, category: manualCategory });
      if (result.status === 'invalid') {
        setManualError(result.message);
        return;
      }
      showResult(result);
      setShowManualAdd(false);
      setManualName('');
      setManualTable('');
      setManualPhone('');
      setManualCategory('Regular');
      setActiveTab('scan');
    } finally {
      setBusy(false);
    }
  };

  const matchesLocal = (g: DeskGuest) => {
    const q = query.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      formatGuestNumber(g.number, digits).includes(q) ||
      (g.table || '').toLowerCase().includes(q) ||
      (g.token || '').toLowerCase().includes(q)
    );
  };
  const serverHits = searchHits && searchHits.query === query ? searchHits.guests : undefined;
  const filteredGuests = !query
    ? desk.guests
    : desk.sample
    ? desk.guests.filter(matchesLocal)
    : serverHits ?? desk.guests.filter(matchesLocal);
  const searching = !desk.sample && !!query && serverHits === undefined;

  const sortedGuests = [...filteredGuests].sort((a, b) => {
    // Checked-in last
    if (!!a.checkedInAt !== !!b.checkedInAt) return a.checkedInAt ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  const checkedInCount = desk.checkedIn;
  const totalCount = desk.total;

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
              href={`/dashboard/events/${event.id}?tab=live`}
              className="w-8 h-8 rounded-full bg-premium-charcoal border border-premium-borderDark flex items-center justify-center text-zinc-400 hover:text-white scale-on-click"
              aria-label="Back to the event"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <p className="text-[9px] font-mono font-bold text-premium-gold uppercase tracking-[0.2em] leading-none mb-0.5 flex items-center gap-1.5">
                Gate Register
                {desk.connection === 'offline' && (
                  <span className="inline-flex items-center gap-1 text-premium-danger normal-case tracking-normal">
                    <WifiOff className="w-3 h-3" /> offline
                  </span>
                )}
                {desk.pending > 0 && (
                  <span className="inline-flex items-center gap-1 text-premium-gold normal-case tracking-normal">· {desk.pending} to sync</span>
                )}
              </p>
              <h3 className="font-display font-bold text-[15px] text-white leading-tight truncate max-w-[180px]">
                {event.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live gate counter (all desks) */}
            <div className="text-right">
              <div className="text-xl font-display font-bold text-premium-success leading-none">
                {checkedInCount}
              </div>
              <div className="text-[9px] font-mono text-zinc-500 leading-tight">
                / {totalCount} in
              </div>
            </div>
            <button
              type="button"
              onClick={onLock}
              title="Lock the register desk"
              aria-label="Lock the register desk"
              className="w-8 h-8 rounded-full bg-premium-charcoal border border-premium-borderDark flex items-center justify-center text-zinc-400 hover:text-premium-gold scale-on-click"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Progress bar */}
        <div className="h-0.5 bg-premium-surfaceDark flex-shrink-0">
          <div
            className="h-full bg-premium-success transition-all duration-500"
            style={{ width: `${totalCount ? (checkedInCount / totalCount) * 100 : 0}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar pb-24">

          {notice && (
            <div className="mx-5 mt-4 p-3 rounded-2xl bg-premium-charcoal border border-premium-gold/40 text-[12px] text-white flex items-center justify-between gap-3">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice(null)} className="text-zinc-500 hover:text-white scale-on-click" aria-label="Dismiss">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── TAB: SCAN ─────────────────────────────────────── */}
          {activeTab === 'scan' && (
            <div className="px-5 py-5 space-y-4">

              {/* Manual add button row */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-zinc-600 uppercase tracking-wider">QR Scanner</span>
                <button
                  type="button"
                  onClick={() => { setManualError(null); setShowManualAdd(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-premium-charcoal border border-premium-borderDark text-[11px] font-bold text-zinc-400 hover:text-white hover:border-premium-gold scale-on-click transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Guest Manually
                </button>
              </div>

              {/* Camera viewfinder */}
              <QrScanner
                onScan={(text) => void handleScan(text)}
                paused={busy || scanFlash !== 'idle' || showManualAdd}
                className={`aspect-square rounded-[2rem] border-2 transition-all duration-300 ${
                  scanFlash === 'success'
                    ? 'border-premium-success bg-premium-success/10'
                    : scanFlash === 'error'
                    ? 'border-premium-danger bg-premium-danger/10'
                    : 'border-zinc-700 bg-premium-charcoal'
                }`}
                overlay={
                  scanFlash === 'success' && scanResult?.status === 'queued' ? (
                    <div className="flex flex-col items-center gap-3 p-6 text-center">
                      <WifiOff className="w-14 h-14 text-premium-gold" />
                      <div>
                        <div className="text-base font-display font-bold text-white">Saved offline</div>
                        <div className="text-[11px] text-zinc-400 mt-1 max-w-[240px]">{scanResult.message}</div>
                      </div>
                    </div>
                  ) : scanFlash === 'success' && scanResult?.guest ? (
                    <div className="flex flex-col items-center gap-3 p-6 text-center">
                      <CheckCircle2 className="w-16 h-16 text-premium-success" />
                      <div>
                        <div className="text-xl font-display font-bold text-white">{scanResult.guest.name}</div>
                        <div className="text-[13px] text-premium-success font-mono mt-1">
                          {scanResult.guest.number ? `No. ${formatGuestNumber(scanResult.guest.number, digits)} · ` : ''}Table {scanResult.guest.table || '—'}
                        </div>
                        {scanResult.guest.tags.length > 0 && (
                          <div className="text-[11px] text-premium-gold font-bold mt-1">{scanResult.guest.tags.join(' · ')}</div>
                        )}
                        <div className="text-[11px] font-bold text-premium-success uppercase tracking-wider mt-2">Admitted ✓</div>
                        <div className="text-[10px] text-zinc-400 mt-1">{scanResult.message}</div>
                      </div>
                    </div>
                  ) : scanFlash === 'error' ? (
                    <div className="flex flex-col items-center gap-3 p-6 text-center">
                      {scanResult?.status === 'duplicate' ? (
                        <>
                          <AlertCircle className="w-14 h-14 text-premium-gold" />
                          <div>
                            <div className="text-base font-display font-bold text-white">{scanResult.guest?.name}</div>
                            <div className="text-[12px] text-premium-gold font-bold mt-1">Already Checked In</div>
                            <div className="text-[11px] text-zinc-400 mt-1">{scanResult.message}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-14 h-14 text-premium-danger" />
                          <div>
                            <div className="text-base font-display font-bold text-premium-danger">Invalid Pass</div>
                            <div className="text-[11px] text-zinc-400 mt-1">{scanResult?.message ?? 'Token not found in roster'}</div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : busy ? (
                    <Loader2 className="w-10 h-10 text-premium-gold animate-spin" />
                  ) : undefined
                }
              />

              {/* Manual token input (USB wedge / paste) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleScan(tokenInput);
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
                  disabled={!tokenInput.trim() || busy}
                  className="px-5 py-3 rounded-2xl bg-premium-gold text-black font-bold text-[12px] shadow-gold scale-on-click disabled:opacity-40"
                >
                  Check
                </button>
              </form>

              {/* Quick test tokens (sample events only) */}
              {desk.sample && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-wider">Demo tokens</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { token: 'QR-D1-SITI-3309', label: 'Siti', type: 'new' },
                      { token: 'QR-D1-BUDI-9812', label: 'Budi', type: 'dup' },
                      { token: 'INVALID-TOKEN', label: 'Invalid', type: 'err' },
                    ].map(({ token, label, type }) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => void handleScan(token)}
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
              )}

              {/* Offline check-ins: waiting for the internet, then what the server said */}
              {desk.pending > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-premium-gold/10 border border-premium-gold/30 text-[12px]">
                  <WifiOff className="w-4 h-4 text-premium-gold flex-shrink-0" />
                  <span className="flex-1 text-zinc-200">
                    <strong className="text-white">{desk.pending}</strong> check-in{desk.pending === 1 ? '' : 's'} saved on this device. They sync by themselves when the internet is back.
                  </span>
                  <button
                    type="button"
                    onClick={() => void desk.syncNow()}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-premium-charcoal border border-premium-borderDark text-[11px] font-bold text-zinc-300 hover:text-white scale-on-click"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Sync now
                  </button>
                </div>
              )}
              {desk.synced.some((r) => r.status !== 'success') && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono font-bold text-premium-danger uppercase tracking-wider">Offline scans to check</div>
                  {desk.synced.filter((r) => r.status !== 'success').map((r, i) => (
                    <div key={`${r.timestamp}-${i}`} className="flex items-start gap-2 p-3 rounded-2xl border bg-premium-danger/5 border-premium-danger/20 text-[12px]">
                      <AlertCircle className="w-4 h-4 text-premium-danger flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-200">{r.guest?.name ? <strong className="text-white">{r.guest.name}: </strong> : null}{r.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent scan log (this desk) */}
              {recentScans.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-wider">
                    Recent Scans
                  </div>
                  <div className="space-y-1.5">
                    {recentScans.map((scan, i) => (
                      <div
                        key={`${scan.timestamp}-${i}`}
                        className={`flex items-center gap-3 p-3 rounded-2xl border text-[12px] ${
                          scan.status === 'success'
                            ? 'bg-premium-success/5 border-premium-success/20'
                            : scan.status === 'duplicate' || scan.status === 'queued'
                            ? 'bg-premium-gold/5 border-premium-gold/20'
                            : 'bg-premium-danger/5 border-premium-danger/20'
                        }`}
                      >
                        {scan.status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-premium-success flex-shrink-0" />
                        ) : scan.status === 'queued' ? (
                          <WifiOff className="w-4 h-4 text-premium-gold flex-shrink-0" />
                        ) : scan.status === 'duplicate' ? (
                          <AlertCircle className="w-4 h-4 text-premium-gold flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-premium-danger flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-white truncate">
                            {scan.guest?.name || scan.message}
                          </span>
                          {scan.guest?.table && (
                            <span className="text-zinc-500 ml-2">· Table {scan.guest.table}</span>
                          )}
                        </div>
                        {scan.status === 'success' && scan.guest && (
                          <button
                            type="button"
                            onClick={() => void handleUndo(scan.guest!)}
                            title="Undo this check-in"
                            aria-label={`Undo the check-in of ${scan.guest.name}`}
                            className="text-zinc-600 hover:text-premium-danger scale-on-click"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="text-[10px] font-mono text-zinc-600 flex-shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {scan.timestamp}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What every desk at the door checked in last (saved events) */}
              {!desk.sample && desk.recent.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-wider">Latest at all desks</div>
                  <div className="rounded-2xl border border-premium-borderDark divide-y divide-premium-borderDark/60 overflow-hidden">
                    {desk.recent.map((r) => (
                      <div key={r.guest_id} className="flex items-center gap-3 px-3 py-2 text-[12px] bg-premium-charcoal">
                        <span className="w-1.5 h-1.5 rounded-full bg-premium-success shrink-0" />
                        <span className="font-mono text-premium-gold text-[11px] shrink-0">{formatGuestNumber(r.guest_number, digits)}</span>
                        <span className="flex-1 min-w-0 truncate text-zinc-300">{r.name}</span>
                        <span className="text-[10px] font-mono text-zinc-600">
                          {new Date(r.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                  { label: 'Total', value: totalCount, color: 'text-white' },
                  { label: 'In', value: checkedInCount, color: 'text-premium-success' },
                  { label: 'Pending', value: Math.max(0, totalCount - checkedInCount), color: 'text-zinc-400' },
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
                  placeholder={desk.sample ? 'Search by name, table, or token...' : 'Search name, guest no., phone or email...'}
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-premium-charcoal border border-premium-borderDark text-[13px] text-white focus:outline-none focus:border-premium-gold placeholder-zinc-600 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white scale-on-click"
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Guest list */}
              <div className="space-y-2">
                {!desk.listLoaded || searching ? (
                  <div className="py-10 flex items-center justify-center gap-2 text-[13px] text-zinc-500">
                    <Loader2 className="w-4 h-4 animate-spin text-premium-gold" /> {searching ? 'Searching…' : 'Loading guests…'}
                  </div>
                ) : sortedGuests.length === 0 ? (
                  <div className="py-10 text-center">
                    <Users className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                    <div className="text-[13px] text-zinc-500">{query ? 'No guests match your search' : 'No guests on the list yet'}</div>
                  </div>
                ) : (
                  sortedGuests.map((guest) => {
                    const category = guest.tags[0];
                    return (
                      <div
                        key={guest.id}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                          guest.checkedInAt
                            ? 'bg-premium-success/5 border-premium-success/20'
                            : 'bg-premium-charcoal border-premium-borderDark'
                        }`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm flex-shrink-0 ${
                            guest.checkedInAt
                              ? 'bg-premium-success text-black'
                              : 'bg-premium-surfaceDark text-zinc-400 border border-premium-borderDark'
                          }`}
                        >
                          {guest.name.charAt(0)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {guest.number && (
                              <span className="text-[11px] font-mono font-bold text-premium-gold shrink-0">{formatGuestNumber(guest.number, digits)}</span>
                            )}
                            <span className={`text-[13px] font-bold truncate ${guest.checkedInAt ? 'text-white' : 'text-zinc-300'}`}>
                              {guest.name}
                            </span>
                            {guest.checkedInAt && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-premium-success flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] mt-0.5">
                            <span className="text-zinc-500">
                              {guest.table ? `Table ${guest.table}` : 'No table'}
                            </span>
                            {category && (
                              <>
                                <span className="text-zinc-700">·</span>
                                <span
                                  className={`font-bold ${
                                    isWedding
                                      ? 'text-premium-danger'
                                      : category === 'VIP'
                                      ? 'text-premium-gold'
                                      : 'text-premium-neon'
                                  }`}
                                >
                                  {category}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="flex-shrink-0">
                          {guest.checkedInAt ? (
                            <button
                              type="button"
                              onClick={() => void handleUndo(guest)}
                              title="Checked in. Tap to undo."
                              className="text-[10px] font-mono font-bold text-premium-success bg-premium-success/10 px-2.5 py-1 rounded-full border border-premium-success/20 scale-on-click"
                            >
                              IN
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleAdmit(guest)}
                              className="text-[10px] font-mono font-bold text-zinc-400 bg-premium-surfaceDark px-2.5 py-1 rounded-full border border-premium-borderDark hover:border-premium-gold hover:text-premium-gold scale-on-click transition-colors disabled:opacity-50"
                            >
                              Admit
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
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
                  aria-label="Close"
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

              {/* Table and phone */}
              <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Phone</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="0812…"
                    className="w-full px-4 py-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-[14px] text-white font-mono focus:outline-none focus:border-premium-gold placeholder-zinc-600 transition-colors"
                  />
                </div>
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

              {manualError && <p className="text-[12px] font-bold text-premium-danger">{manualError}</p>}

              {/* Admit button */}
              <button
                type="button"
                onClick={() => void handleManualAddGuest()}
                disabled={!manualName.trim() || busy}
                className="w-full py-4 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-[15px] shadow-gold scale-on-click disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
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
              { id: 'guests' as GateTab, icon: Users, label: `Guests (${totalCount})` },
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
  return <RegisterDeskLock slug={slug}>{(lock) => <GateRegisterContent slug={slug} onLock={lock} />}</RegisterDeskLock>;
}

export default function GateRegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-premium-black" />}>
      <GateRegisterWrapper params={params} />
    </Suspense>
  );
}
