'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/Header';
import { StageLedEditor } from '@/components/dashboard/StageLedEditor';
import { PinterestMasonryPhotoWall } from '@/components/events/PinterestMasonryPhotoWall';
import { LandingPageBuilder } from '@/components/dashboard/event/LandingPageBuilder';
import { InvitationFormBuilder } from '@/components/dashboard/event/InvitationFormBuilder';
import { GamesBuilder } from '@/components/dashboard/event/GamesBuilder';
import { PhotoWallManager } from '@/components/dashboard/event/PhotoWallManager';
import { RaffleEngine } from '@/components/dashboard/event/RaffleEngine';
import { BroadcastStudio } from '@/components/dashboard/event/BroadcastStudio';
import { EventDesignStudio } from '@/components/dashboard/event/EventDesignStudio';
import { CommentsWall } from '@/components/dashboard/event/CommentsWall';
import {
  POPVERSE_QUIZ_QUESTIONS,
  MOCK_PHOTO_WALL_UPLOADS,
  MOCK_REGISTRATIONS,
} from '@/lib/mockData';
import { Guest, PhotoWallUpload } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import {
  useEventConfig, useGuests, useHydrated, writeGuests, formatGuestNumber, numberDigits, resetEventSection, makePassToken, newId, DEFAULT_ACCESS,
  type EventInfo,
} from '@/lib/eventStore';
import { isSlugTaken } from '@/lib/events';
import { downloadBlob, toCsv } from '@/lib/image';
import * as XLSX from 'xlsx';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Radio,
  Gamepad2,
  Gift,
  Camera,
  BarChart3,
  Play,
  Settings,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Clock,
  MapPin,
  Globe,
  Sliders,
  Send,
  Plus,
  Trash2,
  Download,
  Share2,
  Lock,
  Mail,
  MessageSquare,
  Code2,
  Tv,
  QrCode,
  Shield,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Heart,
  Briefcase,
  Smartphone,
  Upload,
  RotateCcw,
  KeyRound,
  EyeOff,
} from 'lucide-react';

interface EventHubProps {
  params: Promise<{ id: string }>;
}

function EventDashboardContent({ eventId }: { eventId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabFromQuery = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<string>(tabFromQuery);
  const isJustCreated = searchParams.get('created') === 'true';
  const queryTitle = searchParams.get('title');

  // Keep activeTab in sync with query param changes
  React.useEffect(() => {
    const currentParam = searchParams.get('tab');
    if (currentParam && currentParam !== activeTab) {
      setActiveTab(currentParam);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/dashboard/events/${eventId}?tab=${tabId}`, { scroll: false });
  };

  // Every edit is persisted to the browser-backed event store, so nothing snaps back to defaults.
  const { config, event, update, savedAt } = useEventConfig(eventId);
  const hydrated = useHydrated();
  const isWedding = event.event_type === 'wedding';
  const info = config.info;

  useEffect(() => {
    if (hydrated && queryTitle && savedAt === null) update('info', { name: queryTitle });
  }, [hydrated, queryTitle, savedAt, update]);

  const [overviewSubTab, setOverviewSubTab] = useState<'info' | 'landing' | 'invitation'>('info');
  const [infoSaved, setInfoSaved] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [showPasscode, setShowPasscode] = useState(false);

  const setInfo = (patch: Partial<EventInfo>) => update('info', patch);
  const handleSlugChange = (raw: string) => {
    const slug = raw.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-/, '');
    if (!slug) {
      setSlugError('The slug cannot be empty.');
      return;
    }
    if (isSlugTaken(slug, eventId)) {
      setSlugError(`“${slug}” is already used by another event.`);
      return;
    }
    setSlugError(null);
    setInfo({ slug });
  };
  const handleSaveInfo = () => {
    update('info', { ...info, slug: info.slug.replace(/-$/, '') });
    setInfoSaved(true);
    setTimeout(() => setInfoSaved(false), 2000);
  };

  // Copied indicator
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState<string | null>(null);

  // Guests are shared with the gate desk and the full guest manager.
  const guestsList = useGuests(eventId);
  const setGuestsList = (next: Guest[]) => writeGuests(eventId, next);
  const [searchGuest, setSearchGuest] = useState('');
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [newGuest, setNewGuest] = useState({ name: '', contact: '', category: isWedding ? 'Guest' : 'VIP Delegate', table: '' });
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const csvInputRef = React.useRef<HTMLInputElement>(null);

  const makeGuest = (name: string, contact: string, category: string, table: string): Guest => {
    const now = new Date().toISOString();
    const isEmail = contact.includes('@');
    return {
      id: newId('g'),
      event_id: eventId,
      name,
      email: isEmail ? contact : null,
      phone: !isEmail && contact ? contact : null,
      category: category || 'Guest',
      table_number: table || null,
      plus_one_count: 0,
      rsvp_status: 'attending',
      rsvp_notes: null,
      custom_fields: {},
      qr_code_token: makePassToken(),
      is_checked_in: false,
      checked_in_at: null,
      checked_in_by: null,
      photos_uploaded_count: 0,
      emails_sent_count: 0,
      whatsapp_sent_count: 0,
      created_at: now,
      updated_at: now,
    };
  };

  const handleAddGuest = () => {
    if (!newGuest.name.trim()) return;
    setGuestsList([...guestsList, makeGuest(newGuest.name.trim(), newGuest.contact.trim(), newGuest.category, newGuest.table.trim())]);
    setNewGuest((g) => ({ ...g, name: '', contact: '', table: '' }));
    setShowAddGuest(false);
  };

  const handleExportGuests = () => {
    const rows = [
      ['No.', 'Name', 'Email', 'Phone', 'Category', 'Table', 'QR Token', 'Checked in'],
      ...guestsList.map((g) => [formatGuestNumber(g.guest_number, numberDigits(guestsList, info.capacity)), g.name, g.email ?? '', g.phone ?? '', g.category, g.table_number ?? '', g.qr_code_token, g.is_checked_in ? 'Yes' : 'No']),
    ];
    downloadBlob(`${info.slug}-guests.csv`, new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  };

  const handleDownloadTemplate = () => {
    const rows = [['Name', 'Phone / Email', 'Category', 'Table No.'], ['Jane Doe', 'jane@example.com', 'VIP', 'Table 05']];
    downloadBlob('dayoneproject-guest-template.csv', new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  };

  const handleImportGuests = async (file: File | undefined) => {
    if (!file) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
      const pick = (row: Record<string, string>, keys: string[]) => {
        const k = Object.keys(row).find((h) => keys.some((key) => h.toLowerCase().includes(key)));
        return k ? String(row[k]).trim() : '';
      };
      const existing = new Set(guestsList.map((g) => `${g.name.toLowerCase()}|${(g.email ?? g.phone ?? '').toLowerCase()}`));
      const added: Guest[] = [];
      let skipped = 0;
      for (const row of rows) {
        const name = pick(row, ['name']);
        if (!name) continue;
        const contact = pick(row, ['phone', 'email', 'contact', 'whatsapp']);
        const key = `${name.toLowerCase()}|${contact.toLowerCase()}`;
        if (existing.has(key)) {
          skipped++;
          continue;
        }
        existing.add(key);
        added.push(makeGuest(name, contact, pick(row, ['category', 'type']) || 'Guest', pick(row, ['table', 'seat'])));
      }
      setGuestsList([...guestsList, ...added]);
      setImportStatus(`Imported ${added.length} guest${added.length === 1 ? '' : 's'}${skipped ? ` · ${skipped} duplicate${skipped === 1 ? '' : 's'} skipped` : ''}.`);
      setGuestsSubTab('list');
    } catch {
      setImportStatus('That file could not be read. Use a .csv or .xlsx with a Name column.');
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const filteredGuests = guestsList.filter((g) =>
    `${g.guest_number ?? ''} ${g.name} ${g.email ?? ''} ${g.phone ?? ''} ${g.category} ${g.table_number ?? ''}`.toLowerCase().includes(searchGuest.toLowerCase()),
  );
  const [registrations, setRegistrations] = useState(
    MOCK_REGISTRATIONS[eventId] ?? MOCK_REGISTRATIONS['evt-techunite-2026']
  );

  // Photos & Moderation state
  const [photosList, setPhotosList] = useState<PhotoWallUpload[]>(MOCK_PHOTO_WALL_UPLOADS);
  const [captionsOn, setCaptionsOn] = useState(true);

  // Games sub-tab
  const [gamesSubTab, setGamesSubTab] = useState<'quiz' | 'scavenger' | 'link'>('quiz');

  // Guests sub-tab
  const [guestsSubTab, setGuestsSubTab] = useState<'list' | 'invitation' | 'import'>('list');

  // Module config for sidebar visibility
  const TOGGLEABLE_MODULES = [
    { tab: 'guests', label: 'Guests & Seating', icon: Users },
    { tab: 'registrations', label: 'Registrations Queue', icon: ClipboardCheck },
    { tab: 'broadcast', label: 'Broadcast', icon: Radio },
    { tab: 'games', label: 'Live Games', icon: Gamepad2 },
    { tab: 'doorprize', label: 'Door Prize', icon: Gift },
    { tab: 'photos', label: 'Photo Wall', icon: Camera },
    { tab: 'insights', label: 'Insights', icon: BarChart3 },
    { tab: 'live', label: 'LIVE Launchers', icon: Play },
  ] as const;

  const [moduleConfig, setModuleConfig] = useState<Record<string, boolean>>(() => {
    const defaults = Object.fromEntries(TOGGLEABLE_MODULES.map((m) => [m.tab, true]));
    if (typeof window === 'undefined') return defaults;
    try {
      const stored = localStorage.getItem(`all41-mods-${eventId}`);
      if (stored) {
        const arr: string[] = JSON.parse(stored);
        return Object.fromEntries(TOGGLEABLE_MODULES.map((m) => [m.tab, arr.includes(m.tab)]));
      }
    } catch {}
    return defaults;
  });

  const handleModuleToggle = (tab: string, enabled: boolean) => {
    setModuleConfig((prev) => {
      const next = { ...prev, [tab]: enabled };
      const arr = ['overview', 'setting', ...Object.entries(next).filter(([, v]) => v).map(([k]) => k)];
      try {
        localStorage.setItem(`all41-mods-${eventId}`, JSON.stringify(arr));
        window.dispatchEvent(new CustomEvent('all41-modules-changed'));
      } catch {}
      return next;
    });
  };

  // Games Question Bank State — seeded from event
  const defaultQuestions = eventId === 'evt-popverse-converge-2026'
    ? POPVERSE_QUIZ_QUESTIONS.slice(0, 10)
    : [
        { id: 'q-1', text: 'In what year was dayoneproject.xyz founded?', options: ['2023', '2024', '2025', '2026'], answer: 1, points: 1000 },
        { id: 'q-2', text: 'Which regional payment rail powers our QR check-in tokenization?', options: ['QRIS Realtime', 'Swift GPI', 'FedNow', 'SEPA'], answer: 0, points: 1200 },
        { id: 'q-3', text: 'What is the maximum allowed WebP image size for stage photowall?', options: ['500KB', '2MB', '10MB', '50MB'], answer: 1, points: 1000 },
      ];
  const [quizQuestions, setQuizQuestions] = useState(defaultQuestions);

  // Door Prize State
  const [raffleStyle, setRaffleStyle] = useState<'wheel' | 'slot' | 'claw'>('slot');
  const [prizeList, setPrizeList] = useState([
    { id: 'prz-1', name: 'Apple MacBook Pro 16" M4 Max', quantity: 1, sponsor: 'Fairmont / TechVenture' },
    { id: 'prz-2', name: 'iPhone 16 Pro Max 512GB (Titanium)', quantity: 2, sponsor: 'dayoneproject.xyz Innovation' },
    { id: 'prz-3', name: 'Fairmont Presidential Suite Staycation', quantity: 3, sponsor: 'Fairmont Jakarta' },
  ]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    if (id === 'live-link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedEmbed(id);
      setTimeout(() => setCopiedEmbed(null), 2000);
    }
  };

  const handleApproveRegistration = (regId: string) => {
    setRegistrations((prev) =>
      prev.map((r) => (r.id === regId ? { ...r, status: 'approved' } : r))
    );
  };

  const handleDeclineRegistration = (regId: string) => {
    setRegistrations((prev) =>
      prev.map((r) => (r.id === regId ? { ...r, status: 'rejected' } : r))
    );
  };

  return (
    <div className="flex-1 flex flex-col font-sans select-none bg-premium-black text-zinc-100 min-h-screen">
      {/* Slim top bar — breadcrumb + quick actions only */}
      <div className="h-14 flex items-center justify-between px-8 border-b border-premium-borderDark/60 flex-shrink-0 bg-premium-black/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard" className="text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0">
            <ArrowRight className="w-4 h-4 rotate-180" />
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-sm font-display font-semibold text-white truncate">{event.name}</span>
          {isWedding
            ? <Heart className="w-3.5 h-3.5 text-premium-danger flex-shrink-0" />
            : <Briefcase className="w-3.5 h-3.5 text-premium-neon flex-shrink-0" />
          }
        </div>
        <nav aria-label="Open event screens" className="flex items-center gap-1 overflow-x-auto shrink-0 max-w-[70%] py-1">
          <span className="hidden 2xl:inline text-[10px] font-mono uppercase tracking-widest text-zinc-600 mr-1">View</span>
          {([
            { label: 'Landing Page', href: `/events/${event.slug}`, icon: Globe },
            { label: 'Invitation', href: `/events/${event.slug}/invitation`, icon: Mail },
            { label: 'Guest', href: `/events/${event.slug}/pass`, icon: Smartphone },
            { label: 'Register', href: `/events/${event.slug}/gate`, icon: Lock, primary: true },
            { label: 'Games', href: `/events/${event.slug}/games`, icon: Gamepad2 },
            { label: 'Door Prize', href: `/events/${event.slug}/doorprize`, icon: Gift },
            { label: 'LED', href: `/events/${event.slug}/stage`, icon: Tv },
          ] as const).map((v) => {
            const Icon = v.icon;
            const primary = 'primary' in v && v.primary;
            return (
              <a
                key={v.label}
                href={v.href}
                target="_blank"
                rel="noopener noreferrer"
                title={primary ? 'Register desk — locked with username & passcode' : `Open ${v.label}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all scale-on-click ${
                  primary
                    ? 'bg-premium-gold text-black hover:bg-premium-goldHover shadow-gold'
                    : 'border border-premium-borderDark text-zinc-400 hover:text-white hover:border-premium-gold/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{v.label}</span>
              </a>
            );
          })}
        </nav>
      </div>

      <div className="px-8 py-8 max-w-5xl mx-auto w-full space-y-8">

        {/* Creation Success Banner */}
        {isJustCreated && (
          <div className="p-5 rounded-2xl bg-premium-charcoal border border-premium-gold/40 shadow-gold flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-premium-gold/15 text-premium-gold flex items-center justify-center border border-premium-gold/30 flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-white">Event live — ready to manage</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Use the sidebar to navigate between sections.</p>
              </div>
            </div>
            <Link
              href={`/events/${event.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-premium-gold text-black font-bold text-xs shadow-gold scale-on-click whitespace-nowrap"
            >
              Open Guest PWA
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* =========================================================================
            MENU 1: OVERVIEW (Event Info, Landing Page Builder, Invitation Form Builder)
           ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Sub-Tabs Selector */}
            <div className="flex items-center gap-2 bg-premium-surfaceDark p-1.5 rounded-2xl border border-premium-borderDark w-max">
              <button
                type="button"
                onClick={() => setOverviewSubTab('info')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  overviewSubTab === 'info'
                    ? 'bg-premium-gold text-black shadow-gold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Event Information
              </button>
              <button
                type="button"
                onClick={() => setOverviewSubTab('landing')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  overviewSubTab === 'landing'
                    ? 'bg-premium-gold text-black shadow-gold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Landing Page Builder
              </button>
              <button
                type="button"
                onClick={() => setOverviewSubTab('invitation')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  overviewSubTab === 'invitation'
                    ? 'bg-premium-gold text-black shadow-gold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Invitation Form Builder
              </button>
            </div>

            {/* Sub-tab 1: Event Information */}
            {overviewSubTab === 'info' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                  <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-5 shadow-xl">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xl font-display font-bold text-white">Event Parameters</h3>
                      {savedAt && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-premium-success">
                          <Check className="w-3 h-3" /> Saved {new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="text-zinc-400 font-bold block mb-1">Event Name</label>
                        <input
                          type="text"
                          value={info.name}
                          onChange={(e) => setInfo({ name: e.target.value })}
                          className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl outline-none focus:border-premium-gold"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-400 font-bold block mb-1">Subdomain Slug</label>
                        <input
                          type="text"
                          value={info.slug}
                          onChange={(e) => handleSlugChange(e.target.value)}
                          className={`w-full bg-premium-surfaceDark border text-premium-neon p-3 rounded-xl font-mono outline-none focus:border-premium-gold ${slugError ? 'border-premium-danger' : 'border-premium-borderDark'}`}
                        />
                        {slugError && <p className="text-[10px] text-premium-danger mt-1">{slugError}</p>}
                      </div>
                      <div>
                        <label className="text-zinc-400 font-bold block mb-1">Start date</label>
                        <input
                          type="date"
                          value={info.startDate}
                          onChange={(e) => setInfo({ startDate: e.target.value, ...(info.endDate < e.target.value ? { endDate: e.target.value } : {}) })}
                          className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl outline-none focus:border-premium-gold [color-scheme:dark]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-zinc-400 font-bold block mb-1">Starts</label>
                          <input
                            type="time"
                            value={info.startTime}
                            onChange={(e) => setInfo({ startTime: e.target.value })}
                            className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl outline-none focus:border-premium-gold [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label className="text-zinc-400 font-bold block mb-1">Ends</label>
                          <input
                            type="time"
                            value={info.endTime}
                            onChange={(e) => setInfo({ endTime: e.target.value })}
                            className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl outline-none focus:border-premium-gold [color-scheme:dark]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-zinc-400 font-bold block mb-1">Venue</label>
                        <input
                          type="text"
                          value={info.venue}
                          onChange={(e) => setInfo({ venue: e.target.value })}
                          className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl outline-none focus:border-premium-gold"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-400 font-bold block mb-1">City</label>
                        <input
                          type="text"
                          value={info.city}
                          onChange={(e) => setInfo({ city: e.target.value })}
                          className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl outline-none focus:border-premium-gold"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-zinc-400 font-bold block mb-1">Address</label>
                        <input
                          type="text"
                          value={info.address}
                          onChange={(e) => setInfo({ address: e.target.value })}
                          className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl outline-none focus:border-premium-gold"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-400 font-bold block mb-1">Google Maps link</label>
                        <input
                          type="url"
                          value={info.mapsUrl}
                          onChange={(e) => setInfo({ mapsUrl: e.target.value })}
                          placeholder="https://maps.google.com/?q=…"
                          className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl outline-none focus:border-premium-gold"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-400 font-bold block mb-1">Target Capacity (pax)</label>
                        <input
                          type="number"
                          min={1}
                          value={info.capacity}
                          onChange={(e) => setInfo({ capacity: Math.max(0, parseInt(e.target.value || '0', 10)) })}
                          className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl outline-none focus:border-premium-gold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-zinc-400 font-bold block mb-1 text-xs">Description & Schedule Notes</label>
                      <textarea
                        value={info.description}
                        onChange={(e) => setInfo({ description: e.target.value })}
                        rows={3}
                        className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl text-xs outline-none focus:border-premium-gold resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => { if (confirm('Reset event information to the original values?')) { resetEventSection(eventId, 'info'); setSlugError(null); } }}
                        className="px-4 py-2.5 rounded-xl border border-premium-borderDark text-zinc-400 hover:text-white font-bold text-xs scale-on-click flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveInfo}
                        className={`px-6 py-2.5 rounded-xl font-bold text-xs scale-on-click transition-all ${infoSaved ? 'bg-premium-success text-black' : 'bg-premium-gold hover:bg-premium-goldHover text-black shadow-gold'}`}
                      >
                        {infoSaved ? '✓ Saved' : 'Save Information'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                  <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
                    <span className="text-[10px] font-mono uppercase text-premium-gold font-bold">Public URL</span>
                    <div className="p-3.5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark flex items-center justify-between text-xs font-mono">
                      <span className="text-premium-neon truncate">app.dayoneproject.xyz/events/{event.slug}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(`https://app.dayoneproject.xyz/events/${event.slug}`, 'live-link')}
                        className="text-zinc-400 hover:text-white"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-premium-success" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <Link
                      href={`/events/${event.slug}`}
                      target="_blank"
                      className="w-full py-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-xs font-bold text-white flex items-center justify-center gap-2 hover:border-premium-gold scale-on-click"
                    >
                      <span>Preview Live Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 2: Landing Page Builder */}
            {overviewSubTab === 'landing' && (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4 px-1">
                  <div>
                    <h3 className="text-xl font-display font-bold text-white">Landing Page Visual Builder</h3>
                    <p className="text-xs text-zinc-400 mt-1">Drag sections, preview live, and publish your event page.</p>
                  </div>
                  <span className={`shrink-0 px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold border ${isWedding ? 'bg-pink-950/60 border-pink-800/50 text-pink-300' : 'bg-amber-950/60 border-amber-800/50 text-premium-gold'}`}>
                    {event.theme_config.landingSchema.layoutType}
                  </span>
                </div>
                <LandingPageBuilder eventId={eventId} />

              </div>
            )}

            {/* Sub-tab 3: Invitation Form Builder */}
            {overviewSubTab === 'invitation' && (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4 px-1">
                  <div>
                    <h3 className="text-xl font-display font-bold text-white">Invitation Form Builder</h3>
                    <p className="text-xs text-zinc-400 mt-1">Build your RSVP form like Typeform — cover, questions, closing page, and settings.</p>
                  </div>
                  <span className={`shrink-0 px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold border ${isWedding ? 'bg-pink-950/60 border-pink-800/50 text-pink-300' : 'bg-amber-950/60 border-amber-800/50 text-premium-gold'}`}>
                    {event.theme_config.landingSchema.layoutType}
                  </span>
                </div>
                <InvitationFormBuilder eventId={eventId} />
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            MENU 2: DESIGN STUDIO
           ========================================================================= */}
        {activeTab === 'design' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-2xl font-display font-bold text-white">Design Studio</h3>
              <p className="text-xs text-zinc-400">Customize fonts, colors, and card styles for your event page.</p>
            </div>
            <EventDesignStudio eventId={eventId} />
          </div>
        )}

        {/* =========================================================================
            MENU 3: GUESTS (Roster, Seating Table, VIP Badges, CSV)
           ========================================================================= */}
        {activeTab === 'guests' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-display font-bold text-white">Guests</h3>
                <p className="text-xs text-zinc-400">Total {guestsList.length} VIP delegates enrolled • Gate Check-in Active</p>
              </div>

              {guestsSubTab === 'list' && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExportGuests}
                    className="px-4 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-xs font-bold text-white hover:border-premium-gold scale-on-click flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddGuest((v) => !v)}
                    className="px-5 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-bold text-xs shadow-gold scale-on-click flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Attendee</span>
                  </button>
                </div>
              )}
              {guestsSubTab === 'import' && (
                <button
                  type="button"
                  onClick={() => csvInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-bold text-xs shadow-gold scale-on-click flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload CSV</span>
                </button>
              )}
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => handleImportGuests(e.target.files?.[0])}
              />
            </div>

            {importStatus && (
              <div className="p-3 rounded-xl bg-premium-surfaceDark border border-premium-gold/40 text-xs text-white flex items-center justify-between gap-3">
                <span>{importStatus}</span>
                <button type="button" onClick={() => setImportStatus(null)} className="text-zinc-500 hover:text-white scale-on-click" aria-label="Dismiss">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            {guestsSubTab === 'list' && showAddGuest && (
              <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-gold/40 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs">
                <div className="sm:col-span-2">
                  <label className="text-zinc-400 font-bold block mb-1">Full name</label>
                  <input
                    autoFocus
                    value={newGuest.name}
                    onChange={(e) => setNewGuest((g) => ({ ...g, name: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddGuest(); }}
                    className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-2.5 rounded-xl outline-none focus:border-premium-gold"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Phone or email</label>
                  <input
                    value={newGuest.contact}
                    onChange={(e) => setNewGuest((g) => ({ ...g, contact: e.target.value }))}
                    className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-2.5 rounded-xl outline-none focus:border-premium-gold"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Category · Table</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      value={newGuest.category}
                      onChange={(e) => setNewGuest((g) => ({ ...g, category: e.target.value }))}
                      className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-2.5 rounded-xl outline-none focus:border-premium-gold"
                    />
                    <input
                      value={newGuest.table}
                      placeholder="T-05"
                      onChange={(e) => setNewGuest((g) => ({ ...g, table: e.target.value }))}
                      className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-2.5 rounded-xl outline-none focus:border-premium-gold"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddGuest}
                  disabled={!newGuest.name.trim()}
                  className="py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-bold scale-on-click disabled:opacity-40"
                >
                  Add guest
                </button>
              </div>
            )}

            {guestsSubTab === 'list' && (
              <input
                value={searchGuest}
                onChange={(e) => setSearchGuest(e.target.value)}
                placeholder="Search name, contact, category or table…"
                className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl text-xs outline-none focus:border-premium-gold"
              />
            )}

            {/* Sub-tab pills */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {([
                { id: 'list', label: 'Guest Roster' },
                { id: 'invitation', label: 'Invitation Form' },
                { id: 'import', label: 'Import CSV' },
              ] as const).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setGuestsSubTab(st.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap scale-on-click transition-all ${
                    guestsSubTab === st.id
                      ? 'bg-premium-gold/15 text-white border border-premium-gold/40'
                      : 'bg-premium-surfaceDark text-zinc-400 border border-premium-borderDark hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* ── Guest Roster sub-tab ── */}
            {guestsSubTab === 'list' && (
            <div className="rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-premium-borderDark bg-premium-surfaceDark text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                    <th className="p-4 pl-6 w-16">#</th>
                    <th className="p-4">Attendee</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Table / Seat</th>
                    <th className="p-4">QR Token</th>
                    <th className="p-4 text-right">Gate Status</th>
                    <th className="p-4 pr-6 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-premium-borderDark/60">
                  {filteredGuests.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-zinc-500">No guests match “{searchGuest}”.</td>
                    </tr>
                  )}
                  {filteredGuests.map((g) => (
                    <tr key={g.id} className="hover:bg-premium-surfaceDark/40 transition-colors">
                      <td className="p-4 pl-6 font-mono text-premium-gold font-bold">{formatGuestNumber(g.guest_number, numberDigits(guestsList, info.capacity))}</td>
                      <td className="p-4 font-bold text-white">{g.name}</td>
                      <td className="p-4 text-zinc-400 font-mono text-[11px]">{g.phone || g.email}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-premium-gold/15 text-premium-gold border border-premium-gold/30 font-bold uppercase text-[10px]">
                          {g.category}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-300 font-medium">{g.table_number || 'General Seating'}</td>
                      <td className="p-4 text-zinc-500 font-mono text-[10px]">{g.qr_code_token}</td>
                      <td className="p-4 text-right">
                        {g.is_checked_in ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-premium-success/15 text-premium-success font-bold text-[10px] border border-premium-success/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Checked-in</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono text-[10px]">
                            Awaiting
                          </span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          type="button"
                          onClick={() => { if (confirm(`Remove ${g.name} from the guest list?`)) setGuestsList(guestsList.filter((x) => x.id !== g.id)); }}
                          className="text-zinc-600 hover:text-premium-danger scale-on-click"
                          aria-label={`Remove ${g.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {/* ── Invitation Form sub-tab ── */}
            {guestsSubTab === 'invitation' && (
              <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark shadow-xl flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-premium-gold/15 flex items-center justify-center">
                  <ClipboardCheck className="w-7 h-7 text-premium-gold" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-white text-base">Invitation & RSVP Form Builder</h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm">Manage your Typeform-style registration form, field toggles, and RSVP confirmation flow.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setOverviewSubTab('invitation'); handleTabChange('overview'); }}
                  className="px-5 py-2.5 rounded-xl bg-premium-gold text-black font-bold text-xs shadow-gold scale-on-click"
                >
                  Open Invitation Builder →
                </button>
              </div>
            )}

            {/* ── Import CSV sub-tab ── */}
            {guestsSubTab === 'import' && (
              <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-dashed border-premium-borderDark shadow-xl flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark flex items-center justify-center">
                  <Download className="w-7 h-7 text-zinc-400" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-white text-base">Bulk Import via CSV</h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm">Upload a CSV with columns: Name, Phone / Email, Category, Table No. Duplicate check runs automatically.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => csvInputRef.current?.click()}
                    className="px-5 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-bold text-xs shadow-gold scale-on-click flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" /> Choose CSV / Excel file
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="text-[11px] font-mono text-premium-neon hover:underline scale-on-click"
                  >
                    Download CSV template ↓
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            MENU 3: REGISTRATIONS (Public Inbound RSVP Queue & Approval)
           ========================================================================= */}
        {activeTab === 'registrations' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-2xl font-display font-bold text-white">Public RSVP Registrations</h3>
              <p className="text-xs text-zinc-400">Review inbound registrations, approve seats, and trigger automatic QR tickets.</p>
            </div>

            <div className="space-y-4">
              {registrations.map((reg) => (
                <div key={reg.id} className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-display font-bold text-white">{reg.name}</h4>
                      <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        reg.status === 'approved'
                          ? 'bg-premium-success/15 text-premium-success border border-premium-success/30'
                          : reg.status === 'rejected'
                          ? 'bg-premium-danger/15 text-premium-danger border border-premium-danger/30'
                          : 'bg-premium-gold/15 text-premium-gold border border-premium-gold/30'
                      }`}>
                        {reg.status}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 font-mono">
                      {reg.email} • {reg.phone} • Submitted {reg.submittedAt}
                    </div>
                    <div className="text-xs text-zinc-300 pt-1">
                      Organization: <strong>{reg.answers.company}</strong> • Dietary: <strong>{reg.answers.dietary}</strong>
                    </div>
                  </div>

                  {reg.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeclineRegistration(reg.id)}
                        className="px-4 py-2 rounded-xl bg-transparent border border-zinc-700 text-zinc-400 hover:text-white text-xs font-bold scale-on-click"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveRegistration(reg.id)}
                        className="px-5 py-2 rounded-xl bg-premium-gold text-black text-xs font-bold shadow-gold scale-on-click"
                      >
                        Approve & Issue Pass
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            MENU 4: BROADCAST (Email, WhatsApp Fonnte BYON, Embed Tools)
           ========================================================================= */}
        {activeTab === 'broadcast' && (
          <div className="grid grid-cols-1 2xl:grid-cols-12 gap-8 animate-in fade-in duration-200">
            {/* Left Column: message templates + one-tap sending */}
            <div className="2xl:col-span-8 space-y-6">
              <BroadcastStudio eventId={eventId} />
            </div>

            {/* Right Column: Embed Tools (Link, Button, Landing Page) */}
            <div className="2xl:col-span-4 space-y-6">
              <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-5 shadow-xl">
                <div>
                  <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-premium-neon" />
                    <span>Embed Tools</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Embed registration widgets into client websites.</p>
                </div>

                {/* Button Embed */}
                <div className="space-y-2 text-xs">
                  <span className="font-bold text-zinc-300 block">1. Button Widget Embed</span>
                  <div className="p-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark font-mono text-[10px] text-zinc-400 break-all relative">
                    &lt;a href=&quot;https://app.dayoneproject.xyz/events/{event.slug}&quot; class=&quot;dayoneproject-rsvp-btn&quot;&gt;RSVP VIP Pass&lt;/a&gt;
                    <button
                      type="button"
                      onClick={() => handleCopy(`<a href="https://app.dayoneproject.xyz/events/${event.slug}" class="dayoneproject-rsvp-btn">RSVP VIP Pass</a>`, 'embed-btn')}
                      className="absolute top-2 right-2 text-zinc-400 hover:text-white"
                    >
                      {copiedEmbed === 'embed-btn' ? <Check className="w-4 h-4 text-premium-success" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Iframe Embed */}
                <div className="space-y-2 text-xs">
                  <span className="font-bold text-zinc-300 block">2. Iframe Landing Embed</span>
                  <div className="p-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark font-mono text-[10px] text-zinc-400 break-all relative">
                    &lt;iframe src=&quot;https://app.dayoneproject.xyz/events/{event.slug}&quot; width=&quot;100%&quot; height=&quot;800&quot; frameborder=&quot;0&quot;&gt;&lt;/iframe&gt;
                    <button
                      type="button"
                      onClick={() => handleCopy(`<iframe src="https://app.dayoneproject.xyz/events/${event.slug}" width="100%" height="800" frameborder="0"></iframe>`, 'embed-iframe')}
                      className="absolute top-2 right-2 text-zinc-400 hover:text-white"
                    >
                      {copiedEmbed === 'embed-iframe' ? <Check className="w-4 h-4 text-premium-success" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MENU 5: GAMES (Setting Up Live Quiz Arena, Trivia, Buzzer)
           ========================================================================= */}
        {activeTab === 'games' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-display font-bold text-white">Games Builder</h3>
                <p className="text-xs text-zinc-400">Run multiple activities — trivia rounds and scavenger hunts — each with its own questions, frame and footer.</p>
              </div>
            </div>

            <GamesBuilder eventId={eventId} />

          </div>
        )}

        {/* =========================================================================
            MENU 6: DOOR PRIZE (Raffle Engine)
           ========================================================================= */}
        {activeTab === 'doorprize' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-display font-bold text-white">Door Prize & Raffle Engine</h3>
                <p className="text-xs text-zinc-400">Run as many door prizes as you like — each with its own machine (Slot, Wheel, Name Picker or 3D Claw), frame, footer and winners.</p>
              </div>
            </div>
            <RaffleEngine eventId={eventId} />
          </div>
        )}

        {/* =========================================================================
            MENU 7: PHOTOS (Wall Photos/Videos, Filters, Frames, Drive)
           ========================================================================= */}
        {activeTab === 'photos' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-display font-bold text-white">Photo Wall Manager</h3>
                <p className="text-xs text-zinc-400">Filter effects, frames, moderation, Google Drive backup, and live stage wall.</p>
              </div>
            </div>
            <PhotoWallManager />
          </div>
        )}

        {/* =========================================================================
            MENU 7b: COMMENTS WALL
           ========================================================================= */}
        {activeTab === 'comments' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-display font-bold text-white">Comments Wall</h3>
                <p className="text-xs text-zinc-400">Live guest messages, moderation queue, and stage display wall.</p>
              </div>
            </div>
            <CommentsWall isWedding={isWedding} />
          </div>
        )}

        {/* =========================================================================
            MENU 8: INSIGHTS (Analytics, Velocity, Turnout)
           ========================================================================= */}
        {activeTab === 'insights' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-2xl font-display font-bold text-white">Event Intelligence & Real-time Insights</h3>
              <p className="text-xs text-zinc-400">Audited telemetry on check-in velocity, crowd engagement, and photo wall activity.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-2">
                <span className="text-xs font-bold text-zinc-400 uppercase font-mono">Check-in Turnout</span>
                <div className="text-3xl font-display font-bold text-premium-success">64.3%</div>
                <div className="text-[11px] text-zinc-500">418 of 650 attendees admitted</div>
              </div>

              <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-2">
                <span className="text-xs font-bold text-zinc-400 uppercase font-mono">Scanner Velocity</span>
                <div className="text-3xl font-display font-bold text-premium-neon">0.6s</div>
                <div className="text-[11px] text-zinc-500">Average QR gate scan admission</div>
              </div>

              <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-2">
                <span className="text-xs font-bold text-zinc-400 uppercase font-mono">Photo Wall Uploads</span>
                <div className="text-3xl font-display font-bold text-premium-gold">238 Media</div>
                <div className="text-[11px] text-zinc-500">92% WebP, 8% HD 720p Video</div>
              </div>

              <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-2">
                <span className="text-xs font-bold text-zinc-400 uppercase font-mono">Game Participation</span>
                <div className="text-3xl font-display font-bold text-white">88.4%</div>
                <div className="text-[11px] text-zinc-500">Active live mobile buzzers</div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MENU 9: LIVE (Launchers for All Active Event URLs - Open New Tab)
           ========================================================================= */}
        {activeTab === 'live' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-premium-success/15 text-premium-success border border-premium-success/30 text-xs font-bold font-mono mb-2">
                <span className="w-2 h-2 rounded-full bg-premium-success animate-ping" />
                <span>All Operational Rails Active</span>
              </div>
              <h3 className="text-2xl font-display font-bold text-white">LIVE Launchers Command Board</h3>
              <p className="text-xs text-zinc-400">Click any launcher to immediately open the live screen or interface in a new window/tab.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: 'Guest Portal Mobile PWA',
                  url: `/events/${event.slug}`,
                  desc: 'Mobile-optimized attendee portal (Rundown, Table Pass, Photo Wall, Digital Angpao/Speakers).',
                  badge: 'PWA Web App',
                  color: 'text-premium-neon',
                },
                {
                  title: 'Invitation Form (RSVP)',
                  url: `/events/${event.slug}/invitation`,
                  desc: 'The Typeform-style invitation you design in Overview → Invitation Form Builder.',
                  badge: 'Invitation',
                  color: 'text-premium-gold',
                },
                {
                  title: 'Register Desk (Locked)',
                  url: `/events/${event.slug}/gate`,
                  desc: 'Door check-in with QR scan and walk-ins. Opens with the desk username and passcode from Settings.',
                  badge: 'Register',
                  color: 'text-premium-success',
                },
                {
                  title: 'Ballroom Stage LED Screen (7 Modules)',
                  url: `/events/${event.slug}/stage`,
                  desc: 'Fullscreen stage display with Welcome, Rundown, Photo Wall, Quiz, and Sponsor rotations.',
                  badge: 'Big Screen LED',
                  color: 'text-premium-gold',
                },
                {
                  title: 'Live Photo Wall Stage',
                  url: `/events/${event.slug}/photowall/live`,
                  desc: 'Live animated Pinterest-style wall showcasing guest uploads and video clips.',
                  badge: 'LED Photowall',
                  color: 'text-premium-gold',
                },
                {
                  title: '3D Door Prize Raffle Machine',
                  url: `/events/${event.slug}/doorprize`,
                  desc: 'Interactive 3D slot machine, spinning wheel, and arcade claw raffle draw.',
                  badge: 'Raffle Stage',
                  color: 'text-premium-gold',
                },
                {
                  title: 'Arena Trivia Game Stage',
                  url: `/events/${event.slug}/games`,
                  desc: 'Synchronized Kahoot-style quiz question arena with real-time leaderboard podium.',
                  badge: 'Game Arena',
                  color: 'text-premium-neon',
                },
                {
                  title: 'Gate Camera QR Scanner Desk',
                  url: `/dashboard/events/${eventId}/checkin`,
                  desc: 'High-speed attendee QR ticket scanner with 4 gold corner brackets and laser beam.',
                  badge: 'Gate Operations',
                  color: 'text-premium-success',
                },
                {
                  title: 'Live Operator Control Desk',
                  url: `/dashboard/events/${eventId}/operator`,
                  desc: 'Centralized crew cockpit for stage control, photo moderation, and trivia master.',
                  badge: 'Crew Cockpit',
                  color: 'text-premium-neon',
                },
                {
                  title: 'Registration Desk PWA',
                  url: `/events/${event.slug}/register`,
                  desc: 'Tablet kiosk for walk-in guest registration and RSVP approval queue with instant QR pass issuance.',
                  badge: 'Register Desk',
                  color: 'text-premium-gold',
                },
              ].map((launcher, idx) => (
                <div
                  key={idx}
                  onClick={() => window.open(launcher.url, '_blank')}
                  className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark hover:border-premium-gold transition-all flex flex-col justify-between shadow-xl group cursor-pointer scale-on-click"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${launcher.color}`}>
                        {launcher.badge}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-premium-success shadow-[0_0_8px_#00E676] animate-pulse" />
                    </div>
                    <h4 className="text-xl font-display font-bold text-white group-hover:text-premium-gold transition-colors flex items-center justify-between">
                      <span>{launcher.title}</span>
                      <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-premium-gold transition-colors" />
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed font-light">
                      {launcher.desc}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-premium-borderDark/60 mt-4 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-500 truncate max-w-[200px]">
                      {launcher.url}
                    </span>
                    <a
                      href={launcher.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-bold text-xs shadow-gold scale-on-click transition-all"
                    >
                      <span>Open New Window</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            MENU 10: SETTING (Domain BYOD, Email Resend, WhatsApp Fonnte, Terms, Privacy)
           ========================================================================= */}
        {activeTab === 'setting' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-2xl font-display font-bold text-white">Event Integrations & Policies</h3>
              <p className="text-xs text-zinc-400">Custom domain BYOD, WhatsApp Fonnte gateway, Resend email, and legal disclosures.</p>
            </div>

            {/* Register desk access */}
            <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-gold/30 space-y-4 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-premium-gold font-bold flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" /> Register Desk Access
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    The Register screen (door check-in) asks for this username and passcode before it opens.
                  </p>
                </div>
                <a
                  href={`/events/${event.slug}/gate`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-3.5 py-2 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-bold text-xs scale-on-click flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" /> Open Register
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-zinc-400 block mb-1 font-bold">Username</label>
                  <input
                    value={config.access.username}
                    onChange={(e) => update('access', { username: e.target.value.trim() })}
                    autoComplete="off"
                    className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl font-mono text-xs outline-none focus:border-premium-gold"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-bold">Passcode</label>
                  <div className="relative">
                    <input
                      type={showPasscode ? 'text' : 'password'}
                      value={config.access.passcode}
                      onChange={(e) => update('access', { passcode: e.target.value.trim() })}
                      autoComplete="new-password"
                      className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 pr-10 rounded-xl font-mono text-xs outline-none focus:border-premium-gold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasscode((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white scale-on-click"
                      aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                    >
                      {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {config.access.passcode.length > 0 && config.access.passcode.length < 4 && (
                    <p className="text-[10px] text-premium-danger mt-1">Use at least 4 characters.</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px] text-zinc-500">
                <span>Default login: <span className="font-mono text-zinc-300">{DEFAULT_ACCESS.username} / {DEFAULT_ACCESS.passcode}</span></span>
                <button
                  type="button"
                  onClick={() => resetEventSection(eventId, 'access')}
                  className="font-bold text-zinc-400 hover:text-white scale-on-click flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Use default
                </button>
              </div>
            </div>

            {/* Module Visibility */}
            <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-4 shadow-xl">
              <div>
                <span className="text-[10px] font-mono uppercase text-premium-gold font-bold">0. Module Visibility</span>
                <p className="text-[11px] text-zinc-500 mt-1">Choose which modules appear in your event sidebar. Overview and Setting are always shown.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TOGGLEABLE_MODULES.map((mod) => {
                  const Icon = mod.icon;
                  const enabled = moduleConfig[mod.tab] ?? true;
                  return (
                    <button
                      key={mod.tab}
                      type="button"
                      onClick={() => handleModuleToggle(mod.tab, !enabled)}
                      className={`flex items-center justify-between px-4 py-3 rounded-2xl border text-xs font-bold scale-on-click transition-all ${
                        enabled
                          ? 'border-premium-gold/30 bg-premium-gold/10 text-white'
                          : 'border-premium-borderDark bg-premium-surfaceDark text-zinc-500'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${enabled ? 'text-premium-gold' : 'text-zinc-600'}`} />
                        <span>{mod.label}</span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${enabled ? 'bg-premium-success/15 text-premium-success border-premium-success/25' : 'bg-zinc-800 text-zinc-600 border-zinc-700'}`}>
                        {enabled ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Domain BYOD */}
              <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-3 shadow-xl">
                <span className="text-[10px] font-mono uppercase text-premium-neon font-bold">1. Subdomain & Custom Domain BYOD</span>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-zinc-400 block mb-1">Subdomain Rail</label>
                    <input
                      type="text"
                      defaultValue={`app.dayoneproject.xyz/events/${event.slug}`}
                      disabled
                      className="w-full bg-premium-surfaceDark border border-premium-borderDark text-premium-neon p-3 rounded-xl font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Bring Your Own Domain (BYOD)</label>
                    <input
                      type="text"
                      value={config.policy.customDomain}
                      onChange={(e) => update('policy', { customDomain: e.target.value.trim().toLowerCase() })}
                      placeholder="rsvp.yourdomain.com"
                      className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl font-mono text-xs outline-none focus:border-premium-gold"
                    />
                  </div>
                </div>
              </div>

              {/* WhatsApp Fonnte */}
              <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-3 shadow-xl">
                <span className="text-[10px] font-mono uppercase text-premium-success font-bold">2. WhatsApp (Fonnte BYON)</span>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-zinc-400 block mb-1">Fonnte API Token</label>
                    <input
                      type="password"
                      defaultValue="fonnte_sec_live_99214488a01b"
                      className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl font-mono text-xs outline-none focus:border-premium-gold"
                    />
                  </div>
                  <div className="p-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-[11px] text-zinc-400">
                    Pacing Safety: <strong className="text-premium-success">5 - 15 Seconds delay per contact (Anti-Ban)</strong>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-3 shadow-xl">
                <span className="text-[10px] font-mono uppercase text-premium-gold font-bold">3. Terms & Conditions</span>
                <textarea
                  value={config.policy.terms}
                  onChange={(e) => update('policy', { terms: e.target.value })}
                  rows={3}
                  className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl text-xs outline-none focus:border-premium-gold resize-none"
                />
              </div>

              {/* Privacy Policy */}
              <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-3 shadow-xl">
                <span className="text-[10px] font-mono uppercase text-premium-gold font-bold">4. Privacy Policy</span>
                <textarea
                  value={config.policy.privacy}
                  onChange={(e) => update('policy', { privacy: e.target.value })}
                  rows={3}
                  className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white p-3 rounded-xl text-xs outline-none focus:border-premium-gold resize-none"
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function EventDashboardPage({ params }: EventHubProps) {
  const unwrappedParams = use(params);
  return (
    <Suspense fallback={<div className="p-8 text-xs text-zinc-500">Loading Event Suite...</div>}>
      <EventDashboardContent eventId={unwrappedParams.id} />
    </Suspense>
  );
}