'use client';

import React, { useState, use, Suspense } from 'react';
import {
  UserPlus,
  ClipboardList,
  CheckCircle2,
  XCircle,
  QrCode,
  Send,
  Phone,
  Mail,
  User,
  Hash,
  ChevronDown,
  Search,
  Clock,
  Users,
  TrendingUp,
  ArrowLeft,
} from 'lucide-react';

// ─── Mock Data ─────────────────────────────────────────────────────────────
const PENDING_RSVPS = [
  { id: 'r1', name: 'Alina Zhang', email: 'alina.zhang@sequoia.sg', phone: '+6591238841', company: 'Sequoia APAC', dietary: 'Vegetarian', tickets: 1, submittedAt: '12 mins ago' },
  { id: 'r2', name: 'Reza Pratama', email: 'reza@techinnovate.id', phone: '+62811987654', company: 'TechInnovate ID', dietary: 'Halal', tickets: 2, submittedAt: '28 mins ago' },
  { id: 'r3', name: 'Vanessa Lim', email: 'v.lim@gcapital.sg', phone: '+6598761234', company: 'G Capital', dietary: 'None', tickets: 1, submittedAt: '45 mins ago' },
  { id: 'r4', name: 'Ahmad Farhan', email: 'ahmad.farhan@telkom.co.id', phone: '+62812345678', company: 'Telkom Indonesia', dietary: 'Halal', tickets: 1, submittedAt: '1 hr ago' },
];

const TABLE_OPTIONS = [
  'Diamond 01', 'Diamond 02', 'Diamond 03',
  'Platinum 01', 'Platinum 02', 'Platinum 03', 'Platinum 04',
  'Gold 01', 'Gold 02', 'Gold 03', 'Gold 04', 'Gold 05',
  'Press Hub', 'VIP Lounge', 'General 01', 'General 02',
];

const CATEGORY_OPTIONS = ['VIP', 'Diamond', 'Platinum', 'Gold', 'Media / Press', 'Sponsor', 'Speaker', 'Regular'];

// ─── Types ─────────────────────────────────────────────────────────────────
type Mode = 'walkin' | 'queue';
type RsvpItem = typeof PENDING_RSVPS[number];

interface RegisteredGuest {
  id: string;
  name: string;
  phone: string;
  email: string;
  category: string;
  table: string;
  qrToken: string;
  registeredAt: string;
}

// ─── Main Content ───────────────────────────────────────────────────────────
function RegisterPWAContent({ slug }: { slug: string }) {
  const [mode, setMode] = useState<Mode>('walkin');
  const [pendingRsvps, setPendingRsvps] = useState<RsvpItem[]>(PENDING_RSVPS);
  const [registered, setRegistered] = useState<RegisteredGuest[]>([]);

  // Walk-in form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('Regular');
  const [table, setTable] = useState('General 01');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastRegistered, setLastRegistered] = useState<RegisteredGuest | null>(null);
  const [approvedId, setApprovedId] = useState<string | null>(null);

  const generateToken = (n: string) =>
    `QR-${n.replace(/\s+/g, '').toUpperCase().slice(0, 4)}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const handleWalkInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      const guest: RegisteredGuest = {
        id: `wk-${Date.now()}`,
        name: name.trim(),
        phone,
        email,
        category,
        table,
        qrToken: generateToken(name.trim()),
        registeredAt: 'Just now',
      };
      setRegistered((prev) => [guest, ...prev]);
      setLastRegistered(guest);
      setName(''); setPhone(''); setEmail('');
      setCategory('Regular'); setTable('General 01');
      setIsSubmitting(false);
    }, 800);
  };

  const handleApprove = (rsvp: RsvpItem) => {
    setApprovedId(rsvp.id);
    setTimeout(() => {
      const guest: RegisteredGuest = {
        id: `ap-${rsvp.id}`,
        name: rsvp.name,
        phone: rsvp.phone,
        email: rsvp.email,
        category: 'VIP',
        table: 'Diamond 01',
        qrToken: generateToken(rsvp.name),
        registeredAt: 'Just now',
      };
      setRegistered((prev) => [guest, ...prev]);
      setPendingRsvps((prev) => prev.filter((r) => r.id !== rsvp.id));
      setApprovedId(null);
    }, 700);
  };

  const handleDecline = (id: string) => {
    setPendingRsvps((prev) => prev.filter((r) => r.id !== id));
  };

  const filteredQueue = pendingRsvps.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-premium-black font-sans text-white select-none">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-premium-black/90 backdrop-blur border-b border-premium-borderDark px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href={`/events/${slug}`} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div className="w-8 h-8 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-sm shadow-gold flex-shrink-0">
            41
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-premium-gold font-bold leading-none">Registration Desk</p>
            <h1 className="text-sm font-display font-bold text-white leading-none mt-0.5 capitalize">{slug.replace(/-/g, ' ')}</h1>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-premium-surfaceDark p-1 rounded-2xl border border-premium-borderDark">
          <button
            type="button"
            onClick={() => setMode('walkin')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all scale-on-click ${
              mode === 'walkin' ? 'bg-premium-gold text-black shadow-gold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Walk-in
          </button>
          <button
            type="button"
            onClick={() => setMode('queue')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all scale-on-click relative ${
              mode === 'queue' ? 'bg-premium-gold text-black shadow-gold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            RSVP Queue
            {pendingRsvps.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-md bg-premium-danger text-white text-[9px] font-mono font-bold">
                {pendingRsvps.length}
              </span>
            )}
          </button>
        </div>

        {/* Stats strip */}
        <div className="hidden sm:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-premium-success">
            <Users className="w-3.5 h-3.5" />
            <span className="font-bold">{registered.length + 3}</span>
            <span className="text-zinc-500">registered today</span>
          </div>
          <div className="flex items-center gap-1.5 text-premium-gold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="font-bold">{pendingRsvps.length}</span>
            <span className="text-zinc-500">pending</span>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── LEFT: Form / Queue ── */}
          <div className="lg:col-span-3">

            {/* Walk-in Registration Form */}
            {mode === 'walkin' && (
              <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark shadow-2xl">
                <div className="flex items-center gap-3 border-b border-premium-borderDark pb-4 mb-5">
                  <div className="w-10 h-10 rounded-2xl bg-premium-gold/15 border border-premium-gold/30 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-premium-gold" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-premium-gold font-bold block">Walk-in Registration</span>
                    <h2 className="text-lg font-display font-bold text-white leading-none mt-0.5">Register New Guest</h2>
                  </div>
                </div>

                <form onSubmit={handleWalkInSubmit} className="space-y-4">
                  {/* Name — required */}
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block mb-1.5">
                      Full Name <span className="text-premium-danger">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Guest full name"
                        className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white pl-9 pr-4 py-3 rounded-xl text-sm outline-none focus:border-premium-gold transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Phone */}
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block mb-1.5">Phone (WhatsApp)</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+62 811 xxx xxxx"
                          className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white pl-9 pr-4 py-3 rounded-xl text-sm outline-none focus:border-premium-gold transition-colors"
                        />
                      </div>
                    </div>
                    {/* Email */}
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block mb-1.5">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="email@domain.com"
                          className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white pl-9 pr-4 py-3 rounded-xl text-sm outline-none focus:border-premium-gold transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Category */}
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block mb-1.5">Category</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white pl-9 pr-8 py-3 rounded-xl text-sm outline-none focus:border-premium-gold appearance-none transition-colors"
                        >
                          {CATEGORY_OPTIONS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>
                    {/* Table */}
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block mb-1.5">Table / Seat</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <select
                          value={table}
                          onChange={(e) => setTable(e.target.value)}
                          className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white pl-9 pr-8 py-3 rounded-xl text-sm outline-none focus:border-premium-gold appearance-none transition-colors"
                        >
                          {TABLE_OPTIONS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!name.trim() || isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-premium-gold text-black font-display font-bold text-sm shadow-gold scale-on-click disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
                  >
                    {isSubmitting ? (
                      <span className="animate-spin w-4 h-4 border-2 border-black/30 border-t-black rounded-full" />
                    ) : (
                      <QrCode className="w-4 h-4" />
                    )}
                    {isSubmitting ? 'Generating QR Pass…' : 'Register & Generate QR Pass'}
                  </button>
                </form>

                {/* Success Flash */}
                {lastRegistered && (
                  <div className="mt-4 p-4 rounded-2xl bg-premium-success/10 border border-premium-success/30 flex items-start gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
                    <CheckCircle2 className="w-5 h-5 text-premium-success flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-premium-success">{lastRegistered.name} registered!</p>
                      <p className="text-xs text-zinc-400 mt-0.5">Table: <span className="text-white font-bold">{lastRegistered.table}</span></p>
                      <p className="font-mono text-xs text-premium-neon mt-1 truncate">{lastRegistered.qrToken}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLastRegistered(null)}
                      className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* RSVP Queue */}
            {mode === 'queue' && (
              <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-premium-borderDark pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-premium-danger/15 border border-premium-danger/30 flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-premium-danger" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-premium-danger font-bold block">Pending Approval</span>
                      <h2 className="text-lg font-display font-bold text-white leading-none mt-0.5">RSVP Queue</h2>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-premium-danger/20 text-premium-danger text-xs font-mono font-bold border border-premium-danger/30">
                    {pendingRsvps.length} pending
                  </span>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name or company…"
                    className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none focus:border-premium-gold transition-colors"
                  />
                </div>

                {/* Queue Items */}
                <div className="space-y-3">
                  {filteredQueue.length === 0 && (
                    <div className="text-center py-8 text-zinc-500 text-sm">
                      {pendingRsvps.length === 0 ? 'All RSVPs approved ✓' : 'No matching results'}
                    </div>
                  )}
                  {filteredQueue.map((rsvp) => (
                    <div
                      key={rsvp.id}
                      className={`p-4 rounded-2xl bg-premium-surfaceDark border transition-all ${
                        approvedId === rsvp.id
                          ? 'border-premium-success/50 bg-premium-success/5'
                          : 'border-premium-borderDark hover:border-premium-gold/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-white truncate">{rsvp.name}</p>
                            {rsvp.tickets > 1 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-premium-gold/20 text-premium-gold font-mono font-bold flex-shrink-0">
                                +{rsvp.tickets - 1} guest
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5 truncate">{rsvp.company}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-500 font-mono">
                            <span>{rsvp.phone}</span>
                            {rsvp.dietary !== 'None' && (
                              <span className="text-premium-neon">{rsvp.dietary}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {rsvp.submittedAt}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDecline(rsvp.id)}
                            className="p-2 rounded-xl bg-premium-danger/15 text-premium-danger border border-premium-danger/30 hover:bg-premium-danger/25 transition-all scale-on-click"
                            title="Decline"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(rsvp)}
                            disabled={approvedId === rsvp.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-premium-success/15 text-premium-success border border-premium-success/30 hover:bg-premium-success/25 transition-all scale-on-click text-xs font-bold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve & Send QR
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Live Log ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark text-center">
                <p className="text-2xl font-display font-bold text-premium-success">{registered.length + 3}</p>
                <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mt-1">Registered Today</p>
              </div>
              <div className="p-4 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark text-center">
                <p className="text-2xl font-display font-bold text-premium-danger">{pendingRsvps.length}</p>
                <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mt-1">Pending RSVP</p>
              </div>
            </div>

            {/* Recent Registrations Log */}
            <div className="p-5 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-premium-gold font-bold">Recent Registrations</span>
                <span className="w-2 h-2 rounded-full bg-premium-success animate-ping" />
              </div>
              <div className="space-y-2.5 max-h-[calc(100vh-22rem)] overflow-y-auto hide-scrollbar">
                {[...registered].concat([
                  { id: 'seed-1', name: 'Dr. Michael Chen', phone: '+6588219002', email: 'm.chen@nus.edu.sg', category: 'VIP', table: 'Diamond 01', qrToken: 'QR-DRMI-X8K2P', registeredAt: '1h ago' },
                  { id: 'seed-2', name: 'Clarissa Tan Wei Ling', phone: '+6591223340', email: 'clarissa@fairmont.sg', category: 'Platinum', table: 'Platinum 03', qrToken: 'QR-CLAR-M3N9T', registeredAt: '1h 8m ago' },
                  { id: 'seed-3', name: 'Budi Santoso', phone: '+628123456789', email: 'budi@techhub.id', category: 'Gold', table: 'Gold 02', qrToken: 'QR-BUDI-P5Q1W', registeredAt: '1h 22m ago' },
                ]).map((g, i) => (
                  <div key={g.id} className="flex items-center gap-3 p-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark">
                    <div className="w-8 h-8 rounded-xl bg-premium-gold/10 border border-premium-gold/20 flex items-center justify-center text-premium-gold font-display font-bold text-xs flex-shrink-0">
                      {g.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{g.name}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">{g.table} • {g.registeredAt}</p>
                    </div>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg bg-premium-neon/10 text-premium-neon border border-premium-neon/20 hover:bg-premium-neon/20 transition-all scale-on-click flex-shrink-0"
                      title="Resend QR Pass"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold block mb-3">Quick Actions</span>
              <a
                href={`/dashboard/events/techunite-apac-2026/checkin`}
                target="_blank"
                className="flex items-center gap-2.5 w-full px-4 py-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-white text-xs font-bold hover:border-premium-gold/40 hover:text-premium-gold transition-all scale-on-click"
              >
                <QrCode className="w-4 h-4 text-premium-neon" />
                Open QR Scanner (Gate)
              </a>
              <button
                type="button"
                className="flex items-center gap-2.5 w-full px-4 py-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 text-xs font-bold hover:border-premium-gold/40 hover:text-white transition-all scale-on-click"
              >
                <Send className="w-4 h-4 text-premium-gold" />
                Broadcast QR to Pending List
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Page Shell ─────────────────────────────────────────────────────────────
interface RegisterPageProps {
  params: Promise<{ slug: string }>;
}

function RegisterPageInner({ params }: RegisterPageProps) {
  const { slug } = use(params);
  return <RegisterPWAContent slug={slug} />;
}

export default function RegisterPage(props: RegisterPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-premium-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-xl shadow-gold animate-pulse">41</div>
          <p className="text-zinc-500 text-sm font-mono">Loading Registration Desk…</p>
        </div>
      </div>
    }>
      <RegisterPageInner {...props} />
    </Suspense>
  );
}
