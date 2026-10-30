'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  ArrowLeft, ArrowRight, Building, Heart, Globe,
  Calendar, MapPin, Camera, Gamepad2, Gift,
  MessageSquare, QrCode, FileText, Link2, Upload,
  Check, CheckCircle2, Loader2, Image, Mail,
  Zap, Copy, ExternalLink, Music, Plus, X,
  Users, Mic, Sparkles, ChevronDown, ChevronUp,
  Clock, Hash,
} from 'lucide-react';
import { CORPORATE_THEMES, WEDDING_THEMES } from '@/lib/theme/defaultThemes';
import { ThemeCategory } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────
type WizardStep = 1 | 2 | 3 | 4 | 5;
type DesignTab = 'upload' | 'canva';
type GameType = 'scavenger' | 'quiz' | 'both';
type TeamRole = 'admin' | 'register_admin' | 'gate' | 'stage' | 'photowall';
type GenService = 'claude' | 'gemini' | 'elevenlabs';

interface TeamMember { id: string; email: string; role: TeamRole; }
interface GenItem { id: string; service: GenService; label: string; delay: number; done: boolean; }

// ─── Constants ────────────────────────────────────────────────────────────────
const MODULES = [
  { id: 'landing',   icon: Globe,        label: 'Landing Page',        desc: 'Public event page with schedule & venue', defaultOn: true },
  { id: 'rsvp',      icon: FileText,     label: 'Invitation Form',     desc: 'RSVP form with custom fields',            defaultOn: true },
  { id: 'guestlist', icon: QrCode,       label: 'Guest List & QR',     desc: 'Import roster + cryptographic passes',    defaultOn: true },
  { id: 'photowall', icon: Camera,       label: 'Photo Wall',          desc: 'Filter · Frame · Masonry gallery',        defaultOn: false },
  { id: 'games',     icon: Gamepad2,     label: 'Games',               desc: 'Scavenger hunt or live quiz',             defaultOn: false },
  { id: 'raffle',    icon: Gift,         label: 'Door Prize Raffle',   desc: '3D animated prize wheel on stage',        defaultOn: false },
  { id: 'broadcast', icon: MessageSquare,label: 'Broadcast',           desc: 'Email + WhatsApp reminder blasts',        defaultOn: true },
] as const;

type ModuleId = typeof MODULES[number]['id'];

const ROLE_LABELS: Record<TeamRole, string> = {
  admin:          'Admin — Full Access',
  register_admin: 'Register Admin',
  gate:           'Gate Operator',
  stage:          'Stage Operator',
  photowall:      'Photowall Moderator',
};

const SERVICE_META: Record<GenService, { label: string; color: string; bg: string; border: string; icon: React.FC<{ className?: string }> }> = {
  claude:      { label: 'Claude AI',    color: 'text-premium-gold',    bg: 'bg-premium-gold/10',    border: 'border-premium-gold/25',    icon: Sparkles },
  gemini:      { label: 'Gemini',       color: 'text-premium-neon',    bg: 'bg-premium-neon/10',    border: 'border-premium-neon/25',    icon: Image },
  elevenlabs:  { label: 'ElevenLabs',   color: 'text-premium-danger',  bg: 'bg-premium-danger/10',  border: 'border-premium-danger/25',  icon: Mic },
};

const BASE_GEN_ITEMS: Omit<GenItem, 'done'>[] = [
  // Claude — text
  { id: 'brand',         service: 'claude',      label: 'Brand identity extracted',        delay: 350  },
  { id: 'landing_copy',  service: 'claude',      label: 'Landing page copy',               delay: 800  },
  { id: 'rsvp_q',        service: 'claude',      label: 'RSVP form questions',             delay: 1200 },
  { id: 'email_vip',     service: 'claude',      label: 'VIP invitation email',            delay: 1600 },
  { id: 'email_24h',     service: 'claude',      label: '24h reminder email',              delay: 2000 },
  { id: 'email_ty',      service: 'claude',      label: 'Thank-you email',                 delay: 2300 },
  { id: 'wa_blast',      service: 'claude',      label: 'WhatsApp broadcast messages',     delay: 2600 },
  // Gemini — images
  { id: 'frame_pw',      service: 'gemini',      label: 'Photo wall guest frames (3 variants)', delay: 3400 },
  { id: 'pw_bigscreen',  service: 'gemini',      label: 'Big screen photo wall frames (2 variants)', delay: 3800 },
  { id: 'pw_footer',     service: 'gemini',      label: 'Photo wall footer strips (2 variants)', delay: 4100 },
  { id: 'ig_feed_frame', service: 'gemini',      label: 'IG feed post frames (2 variants)', delay: 4500 },
  { id: 'reel_frame',    service: 'gemini',      label: 'Video reel overlay frame',         delay: 4900 },
  { id: 'post_footer',   service: 'gemini',      label: 'Social post footer strip',         delay: 5200 },
  { id: 'social_story',  service: 'gemini',      label: 'Social share story overlay',       delay: 5600 },
  { id: 'email_banner',  service: 'gemini',      label: 'Email header banner',              delay: 6000 },
  { id: 'email_footer',  service: 'gemini',      label: 'Email branded footer strip',       delay: 6300 },
  { id: 'email_bg',      service: 'gemini',      label: 'Email body background pattern',    delay: 6600 },
  { id: 'hero_img',      service: 'gemini',      label: 'Landing page hero image',          delay: 7000 },
  { id: 'stage_bg',      service: 'gemini',      label: 'Stage LED ambient background',     delay: 7600 },
  // Gemini — UI / UX assets
  { id: 'icon_nav',      service: 'gemini',      label: 'Navigation icon set (8 icons)',    delay: 8100 },
  { id: 'icon_module',   service: 'gemini',      label: 'Module icon set (Photos, Games, Raffle…)', delay: 8500 },
  { id: 'icon_app',      service: 'gemini',      label: 'App icon & PWA home screen icon', delay: 8900 },
  { id: 'qr_pass_card',  service: 'gemini',      label: 'Digital QR pass card design',     delay: 9300 },
  { id: 'loading_scr',   service: 'gemini',      label: 'Custom event loading screen',     delay: 9700 },
  { id: 'badge_vip',     service: 'gemini',      label: 'VIP badge & label designs',       delay: 10000 },
  // ElevenLabs — Phase 2
];

const SCAVENGER_GEN_ITEMS: Omit<GenItem, 'done'>[] = [
  { id: 'scav_frames',   service: 'gemini',      label: 'Scavenger hunt QR station frames',delay: 10500 },
];

const GAMES_GEN_ITEMS: Omit<GenItem, 'done'>[] = [
  // Claude — games copy
  { id: 'quiz_bank',     service: 'claude',      label: 'Quiz question bank (10 Qs)',      delay: 8200 },
  { id: 'game_rules',    service: 'claude',      label: 'Game intro & rules copy',         delay: 8600 },
  // Gemini — games visuals
  { id: 'quiz_skin',     service: 'gemini',      label: 'Quiz question card skin',         delay: 8300 },
  { id: 'leaderboard',   service: 'gemini',      label: 'Leaderboard overlay frame',       delay: 8700 },
  { id: 'timer_gfx',    service: 'gemini',      label: 'Countdown timer graphic',          delay: 9100 },
  { id: 'podium_gfx',   service: 'gemini',      label: 'Winner podium graphic',            delay: 9500 },
  { id: 'correct_gfx',  service: 'gemini',      label: 'Correct / wrong answer flash',    delay: 9800 },
];

const RAFFLE_GEN_ITEMS: Omit<GenItem, 'done'>[] = [
  // Claude — raffle copy
  { id: 'raffle_script', service: 'claude',      label: 'Prize announcement script',       delay: 8400 },
  { id: 'raffle_rules',  service: 'claude',      label: 'Raffle rules & prizes copy',      delay: 8800 },
  // Gemini — raffle visuals
  { id: 'wheel_skin',    service: 'gemini',      label: '3D prize wheel skin',             delay: 8600 },
  { id: 'winner_frame',  service: 'gemini',      label: 'Winner announcement overlay',     delay: 9000 },
  { id: 'prize_card',    service: 'gemini',      label: 'Prize card template',             delay: 9400 },
  { id: 'confetti_gfx',  service: 'gemini',      label: 'Confetti burst overlay',          delay: 9700 },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function AISmartSetupPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step state ──
  const [step, setStep] = useState<WizardStep>(1);
  const TOTAL_STEPS = 5;

  // ── Step 1: Archetype ──
  const [eventType, setEventType] = useState<ThemeCategory>('corporate');

  // ── Step 2: Basics ──
  const [eventName, setEventName] = useState('');
  const [slug, setSlug] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');

  // ── Step 3: Design Studio ──
  const [designTab, setDesignTab] = useState<DesignTab>('upload');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [canvaLink, setCanvaLink] = useState('');
  const [vibeText, setVibeText] = useState('');
  const [selectedThemeKey, setSelectedThemeKey] = useState<string>('');
  const availableThemes = Object.values(
    eventType === 'corporate' ? CORPORATE_THEMES : WEDDING_THEMES
  );

  // ── Step 4: Kit + Team ──
  const [activeModules, setActiveModules] = useState<Set<ModuleId>>(
    new Set(MODULES.filter((m) => m.defaultOn).map((m) => m.id as ModuleId))
  );
  const [gameType, setGameType] = useState<GameType>('quiz');
  const [scavengerStations, setScavengerStations] = useState(6);

  // Landing page schema items (tied to eventType from Step 1)
  type LandingItem = 'speakers' | 'sponsors' | 'lovestory' | 'angpao' | 'dresscode' | 'menu' | 'seating';
  const defaultLandingItems = (): Set<LandingItem> =>
    eventType === 'wedding'
      ? new Set<LandingItem>(['lovestory', 'angpao', 'dresscode'])
      : new Set<LandingItem>(['speakers', 'sponsors']);
  const [activeLandingItems, setActiveLandingItems] = useState<Set<LandingItem>>(defaultLandingItems);
  const [accentBadge, setAccentBadge] = useState('');

  const toggleLandingItem = (id: LandingItem) => {
    setActiveLandingItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Reset landing items when eventType changes (Step 1)
  React.useEffect(() => {
    setActiveLandingItems(
      eventType === 'wedding'
        ? new Set<LandingItem>(['lovestory', 'angpao', 'dresscode'])
        : new Set<LandingItem>(['speakers', 'sponsors'])
    );
    setAccentBadge('');
  }, [eventType]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<TeamRole>('gate');

  // ── Step 5: Generation ──
  const [genItems, setGenItems] = useState<GenItem[]>([]);
  const [generationDone, setGenerationDone] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // ── Helpers ──
  const handleNameChange = (v: string) => {
    setEventName(v);
    setSlug(v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
  };

  const toggleModule = (id: ModuleId) => {
    setActiveModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addTeamMember = () => {
    if (!newEmail.trim() || !newEmail.includes('@')) return;
    setTeamMembers((prev) => [...prev, { id: `tm-${Date.now()}`, email: newEmail.trim(), role: newRole }]);
    setNewEmail('');
  };

  const removeTeamMember = (id: string) => setTeamMembers((prev) => prev.filter((m) => m.id !== id));

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const hasDesign = uploadedImage || canvaLink.trim().length > 0;

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // ── Start generation (Step 5) ──
  const startGeneration = useCallback(() => {
    const items = [
      ...BASE_GEN_ITEMS,
      ...(activeModules.has('games') ? GAMES_GEN_ITEMS : []),
      ...(activeModules.has('games') && (gameType === 'scavenger' || gameType === 'both') ? SCAVENGER_GEN_ITEMS : []),
      ...(activeModules.has('raffle') ? RAFFLE_GEN_ITEMS : []),
    ]
      .sort((a, b) => a.delay - b.delay)
      .map((item) => ({ ...item, done: false }));

    setGenItems(items);
    setGenerationDone(false);

    const timers: ReturnType<typeof setTimeout>[] = [];
    items.forEach((item) => {
      const t = setTimeout(() => {
        setGenItems((prev) =>
          prev.map((gi) => (gi.id === item.id ? { ...gi, done: true } : gi))
        );
      }, item.delay);
      timers.push(t);
    });

    const maxDelay = Math.max(...items.map((i) => i.delay));
    const doneTimer = setTimeout(() => {
      setGenerationDone(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    }, maxDelay + 400);
    timers.push(doneTimer);

    return () => timers.forEach(clearTimeout);
  }, [activeModules, gameType]);

  useEffect(() => {
    if (step === 5) return startGeneration();
  }, [step, startGeneration]);

  // ── Keyboard nav ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && step < 4) {
        e.preventDefault();
        setStep((prev) => (prev < TOTAL_STEPS ? (prev + 1) as WizardStep : prev));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  const next = () => {
    if (step < TOTAL_STEPS) setStep((prev) => (prev + 1) as WizardStep);
  };
  const prev = () => {
    if (step > 1) setStep((prev) => (prev - 1) as WizardStep);
  };

  const eventSlug = slug || 'your-event';
  const LINKS = [
    { label: 'Guest Portal',    href: `/events/${eventSlug}`,             icon: Globe,       color: 'text-premium-neon' },
    { label: 'Gate Register',   href: `/events/${eventSlug}/gate`,         icon: QrCode,      color: 'text-premium-success' },
    { label: 'Stage LED',       href: `/events/${eventSlug}/stage`,        icon: Zap,         color: 'text-premium-gold' },
    { label: 'Live Photo Wall', href: `/events/${eventSlug}/photowall/live`,icon: Camera,     color: 'text-premium-neon' },
    { label: 'Door Prize',      href: `/events/${eventSlug}/doorprize`,       icon: Gift,        color: 'text-premium-danger' },
    { label: 'Games Room',      href: `/events/${eventSlug}/games`,        icon: Gamepad2,    color: 'text-premium-gold' },
  ];

  const doneCount = genItems.filter((i) => i.done).length;
  const pct = genItems.length ? Math.round((doneCount / genItems.length) * 100) : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 flex flex-col font-sans select-none relative overflow-hidden">

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] blur-[120px] rounded-full opacity-20 transition-all duration-700 ${
          step === 5 ? 'bg-premium-gold' : eventType === 'wedding' ? 'bg-premium-danger' : 'bg-premium-neon'
        }`} />
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
        {step === 5 && generationDone ? (
          <div className="text-[11px] font-mono text-premium-success flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            All assets ready
          </div>
        ) : (
          <button
            type="button"
            onClick={() => step > 1 ? prev() : router.push('/dashboard')}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors scale-on-click"
          >
            <ArrowLeft className="w-4 h-4" />
            {step > 1 ? 'Back' : 'Exit'}
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-premium-gold rounded-full text-black font-display font-bold text-sm flex items-center justify-center shadow-gold">D1</div>
          <span className="font-display font-bold text-sm text-white">AI Smart Setup</span>
        </div>

        <div className="flex items-center gap-3">
          {step < 5 && (
            <Link
              href="/dashboard"
              className="text-[11px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors hidden sm:block"
            >
              Manual setup →
            </Link>
          )}
          <span className="text-xs font-mono text-zinc-500">
            <strong className="text-premium-gold">{step}</strong>/{TOTAL_STEPS}
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 relative z-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 sm:px-12 py-10 sm:py-16">

          {/* ═══ STEP 1: ARCHETYPE ═══════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-premium-gold font-bold flex items-center gap-2">
                  <span>01 →</span> Event Archetype
                </span>
                <h1 className="text-3xl sm:text-5xl font-display font-bold text-white mt-3 leading-tight">
                  What are you bringing to life?
                </h1>
                <p className="text-sm text-zinc-400 mt-2">
                  AI will tailor every asset — copy, frames, voice, and visuals — to your format.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
                {[
                  {
                    type: 'corporate' as ThemeCategory,
                    icon: Building,
                    title: 'Corporate Summit / Gala',
                    desc: 'Keynote stages, sponsor showcase, multi-track agenda, VIP delegate QR passes.',
                    iconBg: 'bg-premium-neon/15 text-premium-neon border-premium-neon/30',
                    tag: 'Press [1]',
                  },
                  {
                    type: 'wedding' as ThemeCategory,
                    icon: Heart,
                    title: 'Luxury Wedding',
                    desc: 'Love story page, 4-course menu, digital angpao envelope, VIP table seating.',
                    iconBg: 'bg-premium-danger/15 text-premium-danger border-premium-danger/30',
                    tag: 'Press [2]',
                  },
                ].map(({ type, icon: Icon, title, desc, iconBg, tag }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { setEventType(type); setSelectedThemeKey(''); }}
                    className={`p-7 rounded-[2.5rem] border-2 text-left transition-all scale-on-click flex flex-col justify-between h-56 ${
                      eventType === type
                        ? 'border-premium-gold bg-premium-charcoal shadow-gold'
                        : 'border-premium-borderDark bg-premium-surfaceDark/60 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${iconBg}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 text-zinc-400">{tag}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-bold text-white">{title}</h3>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button type="button" onClick={next}
                  className="px-8 py-3.5 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold shadow-gold scale-on-click flex items-center gap-2">
                  <span>Continue</span><ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: BASICS ══════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-premium-gold font-bold flex items-center gap-2">
                  <span>02 →</span> Event Basics
                </span>
                <h1 className="text-3xl sm:text-5xl font-display font-bold text-white mt-3 leading-tight">
                  Name, date &amp; venue
                </h1>
                <p className="text-sm text-zinc-400 mt-2">AI uses these to personalise every asset it generates.</p>
              </div>

              <div className="space-y-5 pt-2">
                {/* Name */}
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-zinc-500 block mb-2">Event Name *</label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder={eventType === 'corporate' ? 'e.g. TechUnite APAC Summit 2026' : 'e.g. Aria & Daniel: The Grand Celebration'}
                    autoFocus
                    className="w-full bg-transparent border-b-2 border-premium-gold/60 focus:border-premium-gold text-2xl sm:text-3xl font-display font-bold text-white placeholder-zinc-700 outline-none pb-3 transition-colors"
                  />
                  {slug && (
                    <div className="flex items-center gap-2 mt-2">
                      <Globe className="w-3.5 h-3.5 text-premium-neon" />
                      <span className="font-mono text-[12px] text-premium-neon">app.dayoneproject.xyz/events/{slug}</span>
                    </div>
                  )}
                </div>

                {/* Date + Location grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-premium-gold">
                      <Calendar className="w-4 h-4" />
                      Schedule
                    </div>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white text-sm px-4 py-2.5 rounded-xl outline-none focus:border-premium-gold cursor-pointer" />
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white text-sm px-4 py-2.5 rounded-xl outline-none focus:border-premium-gold cursor-pointer" />
                  </div>

                  <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                      <MapPin className="w-4 h-4" />
                      Venue
                    </div>
                    <input type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)}
                      placeholder="Venue name"
                      className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white text-sm px-4 py-2.5 rounded-xl outline-none focus:border-premium-gold placeholder-zinc-600" />
                    <input type="text" value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)}
                      placeholder="Address or Google Maps link"
                      className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white text-sm px-4 py-2.5 rounded-xl outline-none focus:border-premium-gold placeholder-zinc-600" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={prev} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white scale-on-click">
                  <ChevronUp className="w-4 h-4" /> Back
                </button>
                <button type="button" onClick={next} disabled={!eventName.trim()}
                  className="px-8 py-3.5 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold shadow-gold scale-on-click disabled:opacity-40 flex items-center gap-2">
                  <span>Continue</span><ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: DESIGN STUDIO ═══════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-premium-gold font-bold flex items-center gap-2">
                  <span>03 →</span> Design Studio
                </span>
                <h1 className="text-3xl sm:text-5xl font-display font-bold text-white mt-3 leading-tight">
                  Upload your design or choose a preset
                </h1>
                <p className="text-sm text-zinc-400 mt-2">
                  AI reads your brand colors, typography &amp; mood — then generates frames, banners, and audio in your style.
                </p>
              </div>

              {/* Upload tabs */}
              <div className="p-1.5 bg-premium-surfaceDark rounded-2xl border border-premium-borderDark inline-flex gap-1">
                {([['upload', Upload, 'Upload Image'], ['canva', Link2, 'Canva Link']] as const).map(([tab, Icon, label]) => (
                  <button key={tab} type="button" onClick={() => setDesignTab(tab)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all scale-on-click ${
                      designTab === tab ? 'bg-premium-gold text-black shadow-gold' : 'text-zinc-500 hover:text-white'
                    }`}>
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: upload / canva */}
                <div className="space-y-4">
                  {designTab === 'upload' ? (
                    <div>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className={`w-full relative rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-3 scale-on-click overflow-hidden ${
                          uploadedImage
                            ? 'border-premium-gold h-52'
                            : 'border-zinc-700 hover:border-premium-gold bg-premium-charcoal h-44 p-8'
                        }`}>
                        {uploadedImage ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={uploadedImage} alt="Design reference" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-2xl bg-premium-gold/10 border border-premium-gold/20 text-premium-gold flex items-center justify-center">
                              <Upload className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white">Drop your design here</div>
                              <div className="text-[11px] text-zinc-500 mt-1">PNG, JPG — mood board, invitation card, poster</div>
                            </div>
                          </>
                        )}
                      </button>
                      {uploadedImage && (
                        <button type="button" onClick={() => setUploadedImage(null)}
                          className="text-[11px] text-zinc-500 hover:text-premium-danger transition-colors mt-2">
                          Remove image
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                        <input
                          type="url"
                          value={canvaLink}
                          onChange={(e) => setCanvaLink(e.target.value)}
                          placeholder="https://www.canva.com/design/..."
                          autoFocus
                          className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-premium-charcoal border border-premium-borderDark text-[13px] text-white focus:outline-none focus:border-premium-gold placeholder-zinc-600 font-mono transition-colors"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-600 leading-relaxed">
                        Paste a Canva share link. AI reads your design palette directly — no export needed.
                      </p>
                      {canvaLink && canvaLink.includes('canva.com') && (
                        <div className="flex items-center gap-2 text-[11px] text-premium-success">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Canva link detected
                        </div>
                      )}
                    </div>
                  )}

                  {/* Vibe brief */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                      Vibe Brief <span className="text-zinc-700 normal-case tracking-normal font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={vibeText}
                      onChange={(e) => setVibeText(e.target.value)}
                      placeholder={eventType === 'corporate'
                        ? "e.g. Bold, futuristic fintech energy. Navy + electric blue. Clean and authoritative."
                        : "e.g. Romantic garden party. Dusty rose, sage green. Soft and timeless."}
                      rows={3}
                      className="w-full px-4 py-3 rounded-2xl bg-premium-charcoal border border-premium-borderDark text-[13px] text-white focus:outline-none focus:border-premium-gold placeholder-zinc-600 resize-none transition-colors leading-relaxed"
                    />
                  </div>
                </div>

                {/* Right: theme presets as fallback */}
                <div className="space-y-3">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                    Or start with a preset theme
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1 hide-scrollbar">
                    {availableThemes.map((theme) => {
                      const isSelected = selectedThemeKey === theme.preset;
                      return (
                        <button key={theme.preset} type="button"
                          onClick={() => setSelectedThemeKey(isSelected ? '' : theme.preset)}
                          className={`p-4 rounded-[1.5rem] border-2 text-left transition-all scale-on-click ${
                            isSelected
                              ? 'border-premium-gold bg-premium-charcoal shadow-gold'
                              : 'border-premium-borderDark bg-premium-surfaceDark/60 hover:border-zinc-500'
                          }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 rounded-full border border-black/30" style={{ background: theme.primaryColor }} />
                            <div className="w-5 h-5 rounded-full border border-black/30" style={{ background: theme.accentColor }} />
                          </div>
                          <div className="text-[12px] font-display font-bold text-white leading-tight">{theme.name}</div>
                          <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{theme.fontFamily}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={prev} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white scale-on-click">
                  <ChevronUp className="w-4 h-4" /> Back
                </button>
                <button type="button" onClick={next}
                  className="px-8 py-3.5 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold shadow-gold scale-on-click flex items-center gap-2">
                  {hasDesign ? (
                    <><Sparkles className="w-4 h-4" /><span>Use My Design</span></>
                  ) : (
                    <><span>Skip — Use Preset</span><ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 4: BUILD YOUR KIT ══════════════════════════════════════ */}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-premium-gold font-bold flex items-center gap-2">
                  <span>04 →</span> Build Your Kit
                </span>
                <h1 className="text-3xl sm:text-5xl font-display font-bold text-white mt-3 leading-tight">
                  Which modules do you need?
                </h1>
                <p className="text-sm text-zinc-400 mt-2">Toggle what you want. AI generates assets only for active modules.</p>
              </div>

              {/* Module grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {MODULES.map(({ id, icon: Icon, label, desc }) => {
                  const mid = id as ModuleId;
                  const isOn = activeModules.has(mid);
                  return (
                    <button key={id} type="button" onClick={() => toggleModule(mid)}
                      className={`p-4 rounded-[1.75rem] border-2 text-left transition-all scale-on-click relative ${
                        isOn
                          ? 'border-premium-gold bg-premium-charcoal shadow-gold'
                          : 'border-premium-borderDark bg-premium-surfaceDark/60 hover:border-zinc-600'
                      }`}>
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

              {/* Landing Page sub-config */}
              {activeModules.has('landing') && (
                <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-gold/30 space-y-4">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-premium-gold flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Landing Page Sections
                    <span className={`ml-auto px-2 py-0.5 rounded-lg font-mono text-[9px] border ${eventType === 'wedding' ? 'bg-pink-950/60 border-pink-800/50 text-pink-300' : 'bg-amber-950/60 border-amber-800/50 text-premium-gold'}`}>
                      {eventType === 'wedding' ? 'wedding_romance' : 'corporate_keynote'}
                    </span>
                  </div>

                  {/* Accent badge input */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-zinc-400 font-bold">{eventType === 'wedding' ? 'Couple Accent Title' : 'Event Tagline / Badge'}</div>
                    <input
                      type="text"
                      value={accentBadge}
                      onChange={(e) => setAccentBadge(e.target.value)}
                      placeholder={eventType === 'wedding' ? 'e.g. "The Ariana & Daniel Wedding"' : 'e.g. "APAC Executive Summit 2026"'}
                      className="w-full px-4 py-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-[12px] text-white focus:outline-none focus:border-premium-gold placeholder-zinc-600 transition-colors font-mono"
                    />
                  </div>

                  {/* Schema-specific section picks */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-zinc-400 font-bold">Choose sections to display</div>
                    <div className="grid grid-cols-2 gap-2">
                      {(eventType === 'wedding' ? [
                        { id: 'lovestory' as LandingItem,  label: 'Love Story Timeline',   desc: 'Couple milestones reel' },
                        { id: 'angpao'    as LandingItem,  label: 'Digital Angpao',         desc: 'QRIS + bank transfer' },
                        { id: 'dresscode' as LandingItem,  label: 'Dress Code Swatches',    desc: 'Colour palette guide' },
                        { id: 'menu'      as LandingItem,  label: 'Banquet Menu',           desc: 'Reception course listing' },
                        { id: 'seating'   as LandingItem,  label: 'Table Seating Map',      desc: 'Interactive floor plan' },
                      ] : [
                        { id: 'speakers' as LandingItem,   label: 'Keynote Speakers Grid',  desc: 'Speaker cards + bios' },
                        { id: 'sponsors' as LandingItem,   label: 'Tiered Sponsors',        desc: 'Gold / Silver / Bronze' },
                        { id: 'menu'     as LandingItem,   label: 'Gala Dining Menu',       desc: 'Course listing' },
                        { id: 'seating'  as LandingItem,   label: 'Table Seating Map',      desc: 'Interactive floor plan' },
                      ]).map(({ id, label, desc }) => {
                        const isOn = activeLandingItems.has(id);
                        return (
                          <button key={id} type="button" onClick={() => toggleLandingItem(id)}
                            className={`p-3 rounded-2xl border text-left transition-all scale-on-click relative ${
                              isOn ? 'border-premium-gold bg-premium-gold/10' : 'border-premium-borderDark bg-premium-surfaceDark/60 hover:border-zinc-600'
                            }`}>
                            {isOn && (
                              <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-premium-gold flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                              </div>
                            )}
                            <div className={`text-[12px] font-display font-bold leading-tight pr-5 ${isOn ? 'text-white' : 'text-zinc-300'}`}>{label}</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Games sub-config */}
              {activeModules.has('games') && (
                <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-gold/30 space-y-4">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-premium-gold flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4" /> Games Configuration
                  </div>
                  <div className="space-y-2">
                    <div className="text-[11px] text-zinc-400 font-bold">Game type</div>
                    <div className="flex gap-2">
                      {([
                        ['quiz', Zap, 'Live Quiz (Kahoot-style)'],
                        ['scavenger', Hash, 'Scavenger Hunt'],
                        ['both', Sparkles, 'Both'],
                      ] as const).map(([type, Icon, label]) => (
                        <button key={type} type="button" onClick={() => setGameType(type)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-[11px] font-bold border transition-all scale-on-click ${
                            gameType === type
                              ? 'bg-premium-gold text-black border-premium-gold shadow-gold'
                              : 'text-zinc-400 border-premium-borderDark hover:border-zinc-500'
                          }`}>
                          <Icon className="w-3.5 h-3.5" />{label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(gameType === 'scavenger' || gameType === 'both') && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400 font-bold">Scavenger stations</span>
                        <span className="font-display font-bold text-premium-gold text-lg">{scavengerStations}</span>
                      </div>
                      <input type="range" min={2} max={20} value={scavengerStations}
                        onChange={(e) => setScavengerStations(Number(e.target.value))}
                        className="w-full accent-premium-gold" />
                      <div className="flex justify-between text-[10px] font-mono text-zinc-600">
                        <span>2 stations</span><span>20 stations</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        AI generates {scavengerStations} branded QR frame PDFs + narrated clue audio for each station.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Team invites */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Invite Team <span className="text-zinc-700 normal-case tracking-normal font-normal">(optional)</span>
                  </div>
                </div>

                {/* Add form */}
                <div className="flex gap-2">
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTeamMember(); } }}
                    placeholder="teammate@company.com"
                    className="flex-1 px-4 py-3 rounded-2xl bg-premium-charcoal border border-premium-borderDark text-[13px] text-white focus:outline-none focus:border-premium-gold placeholder-zinc-600 transition-colors" />
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value as TeamRole)}
                    className="px-3 py-3 rounded-2xl bg-premium-charcoal border border-premium-borderDark text-[12px] text-white outline-none focus:border-premium-gold">
                    {(Object.keys(ROLE_LABELS) as TeamRole[]).map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                  <button type="button" onClick={addTeamMember} disabled={!newEmail.trim() || !newEmail.includes('@')}
                    className="w-11 h-11 rounded-2xl bg-premium-gold text-black flex items-center justify-center scale-on-click shadow-gold disabled:opacity-40">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {teamMembers.length > 0 && (
                  <div className="space-y-2">
                    {teamMembers.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl bg-premium-charcoal border border-premium-borderDark">
                        <div className="w-8 h-8 rounded-full bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 flex items-center justify-center text-[11px] font-bold">
                          {m.email[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-bold text-white truncate">{m.email}</div>
                          <div className="text-[10px] text-zinc-500">{ROLE_LABELS[m.role]}</div>
                        </div>
                        <button type="button" onClick={() => removeTeamMember(m.id)}
                          className="text-zinc-600 hover:text-premium-danger scale-on-click">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={prev} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white scale-on-click">
                  <ChevronUp className="w-4 h-4" /> Back
                </button>
                <button type="button" onClick={next}
                  className="px-8 py-4 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold shadow-gold scale-on-click flex items-center gap-2 text-base">
                  <Sparkles className="w-5 h-5" />
                  <span>Generate My Event Kit</span>
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 5: AI GENERATION ═══════════════════════════════════════ */}
          {step === 5 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Header */}
              <div className="text-center space-y-4">
                {generationDone ? (
                  <>
                    <div className="w-20 h-20 rounded-full bg-premium-gold/15 border border-premium-gold/30 text-premium-gold flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <div>
                      <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">
                        Your event kit is ready 🎉
                      </h1>
                      <p className="text-sm text-zinc-400 mt-2">
                        {doneCount} assets generated for <span className="text-premium-gold font-bold">{eventName || 'your event'}</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-full bg-premium-gold/10 border border-premium-gold/20 text-premium-gold flex items-center justify-center mx-auto">
                      <Loader2 className="w-10 h-10 animate-spin" />
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
                        AI Studio is crafting your kit…
                      </h1>
                      <p className="text-sm text-zinc-400 mt-2">Claude · Gemini working in parallel</p>
                    </div>
                  </>
                )}

                {/* Overall progress bar */}
                <div className="max-w-sm mx-auto">
                  <div className="h-2 bg-premium-surfaceDark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-premium-gold to-premium-neon rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[11px] font-mono text-zinc-500 mt-2">{doneCount} / {genItems.length} assets</div>
                </div>
              </div>

              {/* Service rows */}
              <div className="space-y-4">
                {(['claude', 'gemini'] as GenService[]).map((svc) => {
                  const meta = SERVICE_META[svc];
                  const ServiceIcon = meta.icon;
                  const svcItems = genItems.filter((i) => i.service === svc);
                  const svcDone = svcItems.filter((i) => i.done).length;
                  const allSvcDone = svcItems.length > 0 && svcDone === svcItems.length;

                  return (
                    <div key={svc} className={`p-5 rounded-[2rem] border transition-all ${
                      allSvcDone ? `${meta.bg} ${meta.border}` : 'bg-premium-charcoal border-premium-borderDark'
                    }`}>
                      {/* Service header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl ${meta.bg} border ${meta.border} flex items-center justify-center`}>
                            <ServiceIcon className={`w-4 h-4 ${meta.color}`} />
                          </div>
                          <span className={`text-[13px] font-bold ${meta.color}`}>{meta.label}</span>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-500">
                          {svcDone}/{svcItems.length}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {svcItems.map((item) => (
                          <div key={item.id}
                            className={`flex items-center gap-2.5 text-[12px] py-1 transition-all ${
                              item.done ? 'text-white' : 'text-zinc-600'
                            }`}>
                            {item.done ? (
                              <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${meta.color}`} />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-zinc-700 flex-shrink-0" />
                            )}
                            <span className={item.done ? 'font-medium' : ''}>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* ElevenLabs — Phase 2 */}
                {(() => {
                  const meta = SERVICE_META['elevenlabs'];
                  const ServiceIcon = meta.icon;
                  return (
                    <div className="p-5 rounded-[2rem] border border-premium-borderDark/50 bg-premium-surfaceDark/40 opacity-60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl ${meta.bg} border ${meta.border} flex items-center justify-center`}>
                            <ServiceIcon className={`w-4 h-4 ${meta.color}`} />
                          </div>
                          <span className={`text-[13px] font-bold ${meta.color}`}>{meta.label}</span>
                        </div>
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500">
                          Phase 2
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-600">
                        {['Gate welcome voice chime', 'Stage announcer intro', 'Raffle drum roll callout', 'Game countdown voice'].map((label) => (
                          <div key={label} className="flex items-center gap-2.5 text-[12px] py-1">
                            <div className="w-4 h-4 rounded-full border border-zinc-800 flex-shrink-0" />
                            {label}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Links + CTA — shown after generation */}
              {generationDone && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  {/* Live URLs */}
                  <div className="space-y-3">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500">
                      Live URLs — share with your team
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {LINKS.map(({ label, href, icon: Icon, color }) => {
                        const fullUrl = `app.dayoneproject.xyz${href}`;
                        const isCopied = copiedLink === fullUrl;
                        return (
                          <div key={href}
                            className="flex items-center gap-3 p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark hover:border-premium-borderDark/80 transition-colors">
                            <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">{label}</div>
                              <div className="text-[12px] font-mono text-white truncate mt-0.5">{fullUrl}</div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button type="button" onClick={() => copyLink(fullUrl)}
                                className={`w-7 h-7 rounded-xl flex items-center justify-center scale-on-click transition-all ${
                                  isCopied ? 'bg-premium-success/20 text-premium-success' : 'bg-premium-surfaceDark text-zinc-500 hover:text-white'
                                }`}>
                                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <Link href={href} target="_blank"
                                className="w-7 h-7 rounded-xl bg-premium-surfaceDark flex items-center justify-center text-zinc-500 hover:text-white scale-on-click">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Open dashboard CTA */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                    <Link
                      href={`/dashboard/events/${eventType === 'wedding' ? 'evt-aria-daniel-2026' : 'evt-techunite-2026'}?created=true`}
                      className="w-full sm:w-auto flex-1 px-8 py-4 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-base shadow-gold scale-on-click flex items-center justify-center gap-2 transition-all"
                    >
                      <Sparkles className="w-5 h-5" />
                      Open Your Dashboard
                    </Link>
                    <Link href="/dashboard"
                      className="w-full sm:w-auto text-center px-6 py-4 rounded-2xl border border-premium-borderDark text-zinc-400 hover:text-white hover:border-zinc-600 text-[13px] font-bold scale-on-click transition-colors">
                      Back to All Events
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
