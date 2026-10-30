'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  ArrowLeft, ArrowRight, Building, Heart, Globe,
  Calendar, MapPin, Camera, Gamepad2, Gift,
  MessageSquare, QrCode, FileText, Check, CheckCircle2,
  Loader2, Zap, Copy, ExternalLink, ChevronUp, Users,
  Moon, Sun, Sparkles,
} from 'lucide-react';
import { ThemeCategory } from '@/lib/types';
import { PALETTES, LIGHT_BACKGROUNDS, DARK_BACKGROUNDS } from '@/lib/eventTheme';
import { updateEventConfig, writeGuests, type ThemeMode } from '@/lib/eventStore';
import { isSlugTaken, type OrgEventRow } from '@/lib/events';
import { createOrgEvent, slugProblem } from '@/lib/orgEvents';
import { APP_HOST } from '@/lib/domain';

// ─── Types ────────────────────────────────────────────────────────────────────
type WizardStep = 1 | 2 | 3 | 4 | 5;

// ─── Constants ────────────────────────────────────────────────────────────────
/** Always part of an event. */
const CORE = [
  { icon: Globe, label: 'Landing Page' },
  { icon: FileText, label: 'Invitation Form' },
  { icon: QrCode, label: 'Guest List & QR Passes' },
];

/** Optional modules; each one is a menu in the event dashboard. */
const MODULES = [
  { tab: 'photos', icon: Camera, label: 'Photo Wall', desc: 'Guests share photos on a live wall', defaultOn: true },
  { tab: 'games', icon: Gamepad2, label: 'Games', desc: 'Live trivia and scavenger hunts', defaultOn: true },
  { tab: 'doorprize', icon: Gift, label: 'Door Prize', desc: 'Prize draws on the stage screen', defaultOn: true },
  { tab: 'broadcast', icon: MessageSquare, label: 'Broadcast', desc: 'Email and WhatsApp reminders', defaultOn: true },
] as const;

type ModuleTab = typeof MODULES[number]['tab'];

/** Menus that every event keeps in the sidebar. */
const ALWAYS_TABS = ['overview', 'design', 'guests', 'registrations', 'comments', 'insights', 'live', 'setting'];

const PRESET_PALETTES = PALETTES.filter((p) => p.id !== 'custom');

const nameToSlug = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 40).replace(/-$/, '');

// ─── Component ────────────────────────────────────────────────────────────────
export default function NewEventPage() {
  const router = useRouter();

  const [step, setStep] = useState<WizardStep>(1);
  const TOTAL_STEPS = 5;

  // Step 1: type
  const [eventType, setEventType] = useState<ThemeCategory>('corporate');

  // Step 2: basics
  const [eventName, setEventName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('17:00');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [capacity, setCapacity] = useState('100');

  // Step 3: look
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [palette, setPalette] = useState<string>('gold');

  // Step 4: modules
  const [activeModules, setActiveModules] = useState<Set<ModuleTab>>(
    new Set(MODULES.filter((m) => m.defaultOn).map((m) => m.tab)),
  );

  // Create
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<OrgEventRow | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // ── Helpers ──
  const handleNameChange = (v: string) => {
    setEventName(v);
    if (!slugEdited) setSlug(nameToSlug(v));
  };

  const handleStartDate = (v: string) => {
    setStartDate(v);
    if (!endDate || endDate < v) setEndDate(v);
  };

  const toggleModule = (tab: ModuleTab) => {
    setActiveModules((prev) => {
      const next = new Set(prev);
      if (next.has(tab)) next.delete(tab);
      else next.add(tab);
      return next;
    });
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const basicsProblem = (): string | null => {
    if (!eventName.trim()) return 'Give your event a name.';
    const linkProblem = slugProblem(slug);
    if (linkProblem) return linkProblem;
    if (isSlugTaken(slug, '')) return 'That event link is already used. Try another one.';
    if (!startDate) return 'Pick the event date.';
    if (`${endDate || startDate}T${endTime}` <= `${startDate}T${startTime}`) return 'The event must end after it starts.';
    return null;
  };

  const next = () => {
    if (step === 2) {
      const problem = basicsProblem();
      setError(problem);
      if (problem) return;
    }
    setError(null);
    if (step < 4) setStep((prev) => (prev + 1) as WizardStep);
  };
  const prev = () => {
    setError(null);
    if (step > 1) setStep((prev) => (prev - 1) as WizardStep);
  };

  const create = async () => {
    const problem = basicsProblem();
    if (problem) {
      setError(problem);
      setStep(2);
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const finalEnd = endDate || startDate;
      const row = await createOrgEvent({
        name: eventName.trim(),
        slug,
        type: eventType,
        startDate,
        startTime,
        endDate: finalEnd,
        endTime,
        venueName: locationName.trim(),
        venueAddress: locationAddress.trim(),
      });

      // This device keeps the event's pages, design and guest list.
      updateEventConfig(row.id, 'info', {
        name: row.name,
        slug: row.slug,
        venue: locationName.trim(),
        address: locationAddress.trim(),
        capacity: Math.max(0, Number(capacity) || 0),
        startDate,
        startTime,
        endDate: finalEnd,
        endTime,
      });
      updateEventConfig(row.id, 'design', {
        mode,
        background: (mode === 'light' ? LIGHT_BACKGROUNDS : DARK_BACKGROUNDS)[0].hex,
        palette,
        headingFont: eventType === 'wedding' ? 'playfair' : 'outfit',
        bodyFont: 'manrope',
      });
      writeGuests(row.id, []);
      try {
        localStorage.setItem(`all41-mods-${row.id}`, JSON.stringify([...ALWAYS_TABS, ...activeModules]));
      } catch {}

      setCreated(row);
      setStep(5);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the event. Try again.');
    } finally {
      setCreating(false);
    }
  };

  // ── Keyboard nav (Enter moves on until the last question) ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey || step > 3) return;
      if ((e.target as HTMLElement)?.tagName === 'BUTTON') return;
      e.preventDefault();
      next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const eventSlug = created?.slug || slug || 'your-event';
  const LINKS = [
    { label: 'Guest Portal', href: `/events/${eventSlug}`, icon: Globe, color: 'text-premium-neon' },
    { label: 'Register Desk', href: `/events/${eventSlug}/gate`, icon: QrCode, color: 'text-premium-success' },
    { label: 'Stage LED', href: `/events/${eventSlug}/stage`, icon: Zap, color: 'text-premium-gold' },
    { label: 'Live Photo Wall', href: `/events/${eventSlug}/photowall/live`, icon: Camera, color: 'text-premium-neon' },
    { label: 'Door Prize', href: `/events/${eventSlug}/doorprize`, icon: Gift, color: 'text-premium-danger' },
    { label: 'Games Room', href: `/events/${eventSlug}/games`, icon: Gamepad2, color: 'text-premium-gold' },
  ];

  const chosen = PRESET_PALETTES.find((p) => p.id === palette) ?? PRESET_PALETTES[0];
  const previewBg = (mode === 'light' ? LIGHT_BACKGROUNDS : DARK_BACKGROUNDS)[0].hex;

  const fieldLabel = 'text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-500 block mb-2';
  const field =
    'w-full bg-premium-surfaceDark border border-premium-borderDark text-white text-sm px-4 py-2.5 rounded-xl outline-none focus:border-premium-gold placeholder-zinc-600';
  const continueButton =
    'px-8 py-3.5 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold shadow-gold scale-on-click disabled:opacity-40 flex items-center gap-2';
  const backButton = 'flex items-center gap-2 text-sm text-zinc-500 hover:text-white scale-on-click';

  const errorBox = error && (
    <div className="p-4 rounded-2xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-sm font-bold">{error}</div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 flex flex-col font-sans select-none relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] blur-[120px] rounded-full opacity-20 transition-all duration-700 ${
            step === 5 ? 'bg-premium-gold' : eventType === 'wedding' ? 'bg-premium-danger' : 'bg-premium-neon'
          }`}
        />
      </div>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-premium-borderDark z-50">
        <div
          className="h-full bg-gradient-to-r from-premium-gold to-premium-goldHover transition-all duration-500"
          style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
        />
      </div>

      {/* Header */}
      <header className="h-20 px-6 sm:px-12 flex items-center justify-between border-b border-premium-borderDark/40 backdrop-blur-xl relative z-40 flex-shrink-0">
        {step === 5 ? (
          <div className="text-[11px] font-mono text-premium-success flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Event created
          </div>
        ) : (
          <button
            type="button"
            onClick={() => (step > 1 ? prev() : router.push('/dashboard'))}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors scale-on-click"
          >
            <ArrowLeft className="w-4 h-4" />
            {step > 1 ? 'Back' : 'Exit'}
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-premium-gold rounded-full text-black font-display font-bold text-sm flex items-center justify-center shadow-gold">D1</div>
          <span className="font-display font-bold text-sm text-white">New Event</span>
        </div>

        <span className="text-xs font-mono text-zinc-500">
          <strong className="text-premium-gold">{Math.min(step, 4)}</strong>/4
        </span>
      </header>

      {/* Main content */}
      <main className="flex-1 relative z-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 sm:px-12 py-10 sm:py-16">
          {/* ═══ STEP 1: TYPE ═══════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-premium-gold font-bold flex items-center gap-2">
                  <span>01 →</span> Event Type
                </span>
                <h1 className="text-3xl sm:text-5xl font-display font-bold text-white mt-3 leading-tight">What are you bringing to life?</h1>
                <p className="text-sm text-zinc-400 mt-2">This sets up the right pages and invitation form. You can change everything later.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
                {[
                  {
                    type: 'corporate' as ThemeCategory,
                    icon: Building,
                    title: 'Corporate Summit / Gala',
                    desc: 'Keynote stages, sponsor showcase, agenda, VIP delegate QR passes.',
                    iconBg: 'bg-premium-neon/15 text-premium-neon border-premium-neon/30',
                  },
                  {
                    type: 'wedding' as ThemeCategory,
                    icon: Heart,
                    title: 'Luxury Wedding',
                    desc: 'Love story page, dress code, digital angpao, table seating.',
                    iconBg: 'bg-premium-danger/15 text-premium-danger border-premium-danger/30',
                  },
                ].map(({ type, icon: Icon, title, desc, iconBg }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEventType(type)}
                    className={`p-7 rounded-[2.5rem] border-2 text-left transition-all scale-on-click flex flex-col justify-between h-56 ${
                      eventType === type ? 'border-premium-gold bg-premium-charcoal shadow-gold' : 'border-premium-borderDark bg-premium-surfaceDark/60 hover:border-zinc-600'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${iconBg}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-bold text-white">{title}</h3>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button type="button" onClick={next} className={continueButton}>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: BASICS ═════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-premium-gold font-bold flex items-center gap-2">
                  <span>02 →</span> Event Basics
                </span>
                <h1 className="text-3xl sm:text-5xl font-display font-bold text-white mt-3 leading-tight">Name, date &amp; venue</h1>
              </div>

              <div className="space-y-5 pt-2">
                <div>
                  <label className={fieldLabel}>Event Name *</label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    maxLength={160}
                    placeholder={eventType === 'corporate' ? 'e.g. TechUnite APAC Summit 2026' : 'e.g. Aria & Daniel: The Grand Celebration'}
                    autoFocus
                    className="w-full bg-transparent border-b-2 border-premium-gold/60 focus:border-premium-gold text-2xl sm:text-3xl font-display font-bold text-white placeholder-zinc-700 outline-none pb-3 transition-colors"
                  />
                  <div className="flex items-center gap-1 mt-3 text-[12px] font-mono">
                    <Globe className="w-3.5 h-3.5 text-premium-neon flex-shrink-0" />
                    <span className="text-zinc-500">{APP_HOST}/events/</span>
                    <input
                      value={slug}
                      onChange={(e) => {
                        setSlugEdited(true);
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 40));
                      }}
                      placeholder="your-event"
                      className="flex-1 min-w-0 bg-transparent text-premium-neon outline-none border-b border-dashed border-premium-borderDark focus:border-premium-neon"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-premium-gold">
                      <Calendar className="w-4 h-4" />
                      Schedule
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input type="date" value={startDate} onChange={(e) => handleStartDate(e.target.value)} aria-label="Start date" className={`${field} cursor-pointer`} />
                      <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} aria-label="Start time" className={`${field} cursor-pointer`} />
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">Ends</div>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} aria-label="End date" className={`${field} cursor-pointer`} />
                      <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-label="End time" className={`${field} cursor-pointer`} />
                    </div>
                    <p className="text-[10px] text-zinc-600">Times are local to the venue (WIB).</p>
                  </div>

                  <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                      <MapPin className="w-4 h-4" />
                      Venue
                    </div>
                    <input type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)} maxLength={160} placeholder="Venue name" className={field} />
                    <input type="text" value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} maxLength={400} placeholder="Address or Google Maps link" className={field} />
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 pt-1">
                      <Users className="w-4 h-4" />
                      Expected guests
                    </div>
                    <input type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={field} />
                  </div>
                </div>
              </div>

              {errorBox}

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={prev} className={backButton}>
                  <ChevronUp className="w-4 h-4" /> Back
                </button>
                <button type="button" onClick={next} disabled={!eventName.trim()} className={continueButton}>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: LOOK ═══════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-premium-gold font-bold flex items-center gap-2">
                  <span>03 →</span> Look &amp; Feel
                </span>
                <h1 className="text-3xl sm:text-5xl font-display font-bold text-white mt-3 leading-tight">Pick a starting look</h1>
                <p className="text-sm text-zinc-400 mt-2">Colors, fonts, logo and photos can all be fine-tuned later in Design Studio.</p>
              </div>

              <div className="p-1.5 bg-premium-surfaceDark rounded-2xl border border-premium-borderDark inline-flex gap-1">
                {([
                  ['dark', Moon, 'Dark'],
                  ['light', Sun, 'Light'],
                ] as const).map(([m, Icon, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all scale-on-click ${
                      mode === m ? 'bg-premium-gold text-black shadow-gold' : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PRESET_PALETTES.map((p) => {
                    const isSelected = palette === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPalette(p.id)}
                        className={`p-4 rounded-[1.5rem] border-2 text-left transition-all scale-on-click ${
                          isSelected ? 'border-premium-gold bg-premium-charcoal shadow-gold' : 'border-premium-borderDark bg-premium-surfaceDark/60 hover:border-zinc-500'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-3">
                          {[p.primary, p.secondary, p.accent].map((c) => (
                            <div key={c} className="w-5 h-5 rounded-full border border-black/30" style={{ background: c }} />
                          ))}
                        </div>
                        <div className="text-[12px] font-display font-bold text-white leading-tight">{p.label}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Preview */}
                <div className="rounded-[2rem] border border-premium-borderDark overflow-hidden" style={{ background: previewBg }}>
                  <div className="p-6 space-y-3">
                    <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: chosen.accent }}>
                      {eventType === 'wedding' ? "You're invited" : 'Guest registration'}
                    </div>
                    <div
                      className="text-2xl font-bold leading-tight"
                      style={{ color: mode === 'light' ? '#18181B' : '#FFFFFF', fontFamily: eventType === 'wedding' ? "'Playfair Display', serif" : undefined }}
                    >
                      {eventName || 'Your event'}
                    </div>
                    <div className="text-xs" style={{ color: mode === 'light' ? '#52525B' : '#A1A1AA' }}>
                      {startDate || 'Date'} · {locationName || 'Venue'}
                    </div>
                    <div className="inline-block mt-2 px-4 py-2 rounded-xl text-xs font-bold text-black" style={{ background: chosen.primary }}>
                      {eventType === 'wedding' ? 'RSVP now' : 'Register now'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={prev} className={backButton}>
                  <ChevronUp className="w-4 h-4" /> Back
                </button>
                <button type="button" onClick={next} className={continueButton}>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 4: MODULES ════════════════════════════════════════════ */}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-premium-gold font-bold flex items-center gap-2">
                  <span>04 →</span> Build Your Kit
                </span>
                <h1 className="text-3xl sm:text-5xl font-display font-bold text-white mt-3 leading-tight">What happens on the day?</h1>
                <p className="text-sm text-zinc-400 mt-2">Turn on what you need. You can switch modules on or off any time in the event&apos;s Settings.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {CORE.map(({ icon: Icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-premium-charcoal border border-premium-borderDark text-[12px] text-zinc-300">
                    <Icon className="w-3.5 h-3.5 text-premium-gold" />
                    {label}
                    <Check className="w-3 h-3 text-premium-success" />
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {MODULES.map(({ tab, icon: Icon, label, desc }) => {
                  const isOn = activeModules.has(tab);
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => toggleModule(tab)}
                      className={`p-4 rounded-[1.75rem] border-2 text-left transition-all scale-on-click relative ${
                        isOn ? 'border-premium-gold bg-premium-charcoal shadow-gold' : 'border-premium-borderDark bg-premium-surfaceDark/60 hover:border-zinc-600'
                      }`}
                    >
                      {isOn && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-premium-gold flex items-center justify-center">
                          <Check className="w-3 h-3 text-black stroke-[3]" />
                        </div>
                      )}
                      <Icon className={`w-6 h-6 mb-3 ${isOn ? 'text-premium-gold' : 'text-zinc-500'}`} />
                      <div className={`text-[13px] font-display font-bold leading-tight ${isOn ? 'text-white' : 'text-zinc-300'}`}>{label}</div>
                      <div className="text-[10px] text-zinc-500 mt-1 leading-tight">{desc}</div>
                    </button>
                  );
                })}
              </div>

              <p className="text-[12px] text-zinc-500 flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-600" />
                Your team (admin organizers and register desk) is managed in{' '}
                <Link href="/dashboard/settings" className="text-premium-gold font-bold hover:underline">
                  Settings
                </Link>
                .
              </p>

              {errorBox}

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={prev} className={backButton}>
                  <ChevronUp className="w-4 h-4" /> Back
                </button>
                <button type="button" onClick={create} disabled={creating} className={`${continueButton} text-base px-8 py-4`}>
                  {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  <span>{creating ? 'Creating…' : 'Create Event'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 5: DONE ═══════════════════════════════════════════════ */}
          {step === 5 && created && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-premium-gold/15 border border-premium-gold/30 text-premium-gold flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">{created.name} is ready 🎉</h1>
                  <p className="text-sm text-zinc-400 mt-2">
                    Saved as a draft. Next: build the landing page and invitation form, then add your guests.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500">Event links</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {LINKS.map(({ label, href, icon: Icon, color }) => {
                    const fullUrl = `${APP_HOST}${href}`;
                    const isCopied = copiedLink === fullUrl;
                    return (
                      <div key={href} className="flex items-center gap-3 p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark">
                        <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">{label}</div>
                          <div className="text-[12px] font-mono text-white truncate mt-0.5">{fullUrl}</div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => copyLink(fullUrl)}
                            className={`w-7 h-7 rounded-xl flex items-center justify-center scale-on-click transition-all ${
                              isCopied ? 'bg-premium-success/20 text-premium-success' : 'bg-premium-surfaceDark text-zinc-500 hover:text-white'
                            }`}
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <Link href={href} target="_blank" className="w-7 h-7 rounded-xl bg-premium-surfaceDark flex items-center justify-center text-zinc-500 hover:text-white scale-on-click">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <Link
                  href={`/dashboard/events/${created.id}?tab=overview`}
                  className="w-full sm:w-auto flex-1 px-8 py-4 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-base shadow-gold scale-on-click flex items-center justify-center gap-2 transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  Open Your Event
                </Link>
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto text-center px-6 py-4 rounded-2xl border border-premium-borderDark text-zinc-400 hover:text-white hover:border-zinc-600 text-[13px] font-bold scale-on-click transition-colors"
                >
                  Back to All Events
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
