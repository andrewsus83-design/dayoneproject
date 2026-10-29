'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import {
  MOCK_EVENT,
  MOCK_WEDDING_EVENT,
  MOCK_CORPORATE_NEXUS_EVENT,
  MOCK_WEDDING_BALI_EVENT,
  MOCK_POPVERSE_EVENT,
} from '@/lib/mockData';
import { formatDate } from '@/lib/utils';
import {
  Calendar, MapPin, Clock, Users, Heart, Building2,
  ArrowRight, ChevronDown, Star, Globe, Wifi, Check,
  QrCode, Camera, Gamepad2, Gift, Share2, Copy, CheckCircle2,
  Sparkles, Play,
} from 'lucide-react';
import confetti from 'canvas-confetti';

function EventLandingContent({ slug }: { slug: string }) {
  const event =
    slug === 'aria-daniel' ? MOCK_WEDDING_EVENT
    : slug === 'sophia-marco' ? MOCK_WEDDING_BALI_EVENT
    : slug === 'nexus' ? MOCK_CORPORATE_NEXUS_EVENT
    : slug === 'popverse' ? MOCK_POPVERSE_EVENT
    : MOCK_EVENT;

  const isWedding = event.event_type === 'wedding';
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  // Countdown timer
  useEffect(() => {
    const tick = () => {
      const diff = new Date(event.start_date).getTime() - Date.now();
      if (diff <= 0) return;
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [event.start_date]);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRsvp = () => {
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
  };

  const heroBg = isWedding
    ? (slug === 'sophia-marco'
        ? 'https://cdn.openart.ai/openart-ai/production/2026-10/create-image/gyygId5ZYPaN2nz17abs/image_1793297915026_6dcfc6d9_1793297915179_e4e54b49.png'
        : event.cover_image_url)
    : event.cover_image_url;

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 font-sans">

      {/* ── HERO ── */}
      <section className="relative min-h-[92vh] flex flex-col">
        {/* Full-bleed background */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroBg || ''}
            alt={event.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-premium-black" />
        </div>

        {/* Top nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 pt-6">
          <div className="w-10 h-10 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-lg shadow-gold">
            41
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/events/${slug}/register`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-bold hover:bg-white/20 transition-all scale-on-click"
            >
              Invitation Form
            </Link>
            <Link
              href={`/events/${slug}/gate`}
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-bold hover:bg-white/20 transition-all scale-on-click"
            >
              <QrCode className="w-3 h-3" /> Gate
            </Link>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black text-xs font-bold shadow-gold transition-all scale-on-click"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col justify-end px-6 sm:px-10 pb-16 max-w-3xl">
          <div className="space-y-5">
            {isWedding
              ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-premium-danger/20 border border-premium-danger/30 text-premium-danger text-xs font-bold backdrop-blur">
                  <Heart className="w-3 h-3 fill-current" /> Wedding Celebration
                </span>
              : <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-premium-neon/20 border border-premium-neon/30 text-premium-neon text-xs font-bold backdrop-blur">
                  <Building2 className="w-3 h-3" /> Corporate Summit
                </span>
            }

            <h1 className="text-4xl sm:text-6xl font-display font-bold text-white leading-tight tracking-tight">
              {event.name}
            </h1>

            <p className="text-base text-zinc-300 leading-relaxed max-w-xl">
              {event.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-300">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-premium-gold" /> {formatDate(event.start_date)}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-premium-gold" /> {new Date(event.start_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-premium-gold" /> {event.location_name}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href={`/events/${slug}/register`}
                onClick={handleRsvp}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-base shadow-gold scale-on-click transition-all"
              >
                <Sparkles className="w-5 h-5" />
                {isWedding ? 'RSVP to Attend' : 'Register Now'}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={`#about`}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-white/20 text-white font-bold text-sm hover:bg-white/10 transition-all scale-on-click backdrop-blur"
              >
                Learn More <ChevronDown className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── COUNTDOWN ── */}
      <section className="bg-premium-charcoal border-y border-premium-borderDark py-8">
        <div className="max-w-2xl mx-auto px-6 flex flex-col items-center gap-4">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Event starts in</p>
          <div className="flex items-center gap-4 sm:gap-8">
            {[
              { val: timeLeft.d, label: 'Days' },
              { val: timeLeft.h, label: 'Hours' },
              { val: timeLeft.m, label: 'Min' },
              { val: timeLeft.s, label: 'Sec' },
            ].map(({ val, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="text-4xl sm:text-5xl font-display font-bold text-premium-gold tabular-nums">
                  {String(val).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT / DETAILS ── */}
      <section id="about" className="max-w-4xl mx-auto px-6 py-20 space-y-16">

        {/* Key details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Calendar, label: 'Date', val: formatDate(event.start_date) },
            { icon: MapPin, label: 'Venue', val: event.location_name?.split(',')[0] ?? '' },
            { icon: Users, label: 'Capacity', val: `${event.guest_limit} Guests` },
            { icon: Globe, label: 'Subdomain', val: `${slug}.all41.app` },
          ].map(({ icon: Icon, label, val }) => (
            <div key={label} className="p-5 rounded-2xl bg-premium-charcoal border border-premium-borderDark flex flex-col gap-2">
              <Icon className="w-5 h-5 text-premium-gold" />
              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">{label}</div>
              <div className="text-sm font-display font-semibold text-white leading-snug">{val}</div>
            </div>
          ))}
        </div>

        {/* Wedding: love story / Corporate: highlights */}
        {isWedding ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              <Heart className="w-5 h-5 text-premium-danger fill-current" />
              Our Story
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { year: '2021', title: 'First Met', desc: 'A chance encounter at a design conference in Singapore turned into something beautiful.' },
                { year: '2024', title: 'Got Engaged', desc: 'A sunrise proposal at Uluwatu cliffs, with the Indian Ocean as witness.' },
                { year: '2026', title: 'Forever in Bali', desc: 'A clifftop ceremony at GWK, surrounded by 250 guests from 18 countries.' },
              ].map((m) => (
                <div key={m.year} className="p-6 rounded-2xl bg-premium-charcoal border border-premium-borderDark space-y-2">
                  <span className="text-xs font-mono text-premium-gold font-bold">{m.year}</span>
                  <h3 className="font-display font-bold text-white">{m.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-2xl font-display font-bold text-white">Why Attend</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Star, title: '40+ World-Class Speakers', desc: 'CEOs, founders and investors from APAC\'s fastest-growing companies.' },
                { icon: Users, title: '1,200 Attendees', desc: 'Network with decision-makers from tech, finance, and deep-tech verticals.' },
                { icon: Globe, title: '12 Countries', desc: 'Truly pan-APAC representation with live translations in 4 languages.' },
                { icon: Sparkles, title: 'AI-Powered Matchmaking', desc: 'Smart session recommendations and 1:1 meeting scheduler powered by GPT.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="p-6 rounded-2xl bg-premium-charcoal border border-premium-borderDark flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-premium-gold/15 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-premium-gold" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white text-sm">{title}</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What's included — interactive features */}
        <div className="space-y-4">
          <h2 className="text-2xl font-display font-bold text-white">What's Included</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: QrCode, label: 'Digital QR Pass', desc: 'Cryptographic gate entry' },
              { icon: Camera, label: 'AI Photo Wall', desc: 'Upload & share memories' },
              { icon: Gamepad2, label: 'Live Trivia', desc: 'Kahoot-style real-time quiz' },
              { icon: Gift, label: 'Door Prize Raffle', desc: '3D animated prize draws' },
              { icon: Play, label: 'Stage Display', desc: 'LED room module controller' },
              { icon: Wifi, label: 'Live Broadcast', desc: 'WA & email reminders' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-premium-gold/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-premium-gold" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{label}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dress code (wedding) / Agenda teaser (corporate) */}
        {isWedding && (
          <div className="p-8 rounded-[2rem] bg-premium-charcoal border border-premium-gold/20 shadow-gold space-y-4">
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-premium-danger" /> Dress Code & Details
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: 'Dress Code', val: 'Black Tie — Tropical Formal' },
                { label: 'Color Palette', val: 'Ivory · Blush · Gold' },
                { label: 'Ceremony Language', val: 'English & Italian' },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-1">{label}</div>
                  <div className="text-sm font-display font-semibold text-white">{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA block */}
        <div className="text-center space-y-6 py-8">
          <h2 className="text-3xl font-display font-bold text-white">
            {isWedding ? 'Join Us on Our Special Day' : 'Secure Your Seat Today'}
          </h2>
          <p className="text-zinc-400 max-w-md mx-auto">
            {isWedding
              ? 'RSVP by 1 November 2026 so we can ensure your seat and a personalised place card.'
              : 'Early-bird seats are limited. Register now and receive your digital QR pass instantly.'}
          </p>
          <Link
            href={`/events/${slug}/register`}
            className="inline-flex items-center gap-2 px-10 py-5 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-lg shadow-gold scale-on-click transition-all"
          >
            <Sparkles className="w-5 h-5" />
            {isWedding ? 'RSVP Now' : 'Register Free'}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-xs text-zinc-600">Instant confirmation · Digital QR pass sent by email & WhatsApp</p>
        </div>
      </section>

      {/* ── POPVERSE BRANDED FOOTER BANNER ── */}
      {slug === 'popverse' && (
        <div className="w-full overflow-hidden border-t border-premium-borderDark">
          <img
            src="https://cdn.openart.ai/openart-ai/production/2026-10/create-image/gyygId5ZYPaN2nz17abs/image_1793300679578_05258890_1793300680180_9c4dea1c.png"
            alt="POPVERSE 2026 — Different Tunes. One Beat. | November 13, 2026 · SPACE at One Ayala"
            className="w-full h-auto object-cover max-h-32 sm:max-h-40"
          />
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="border-t border-premium-borderDark py-8 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-sm shadow-gold">41</div>
          <span className="text-xs text-zinc-600">Powered by all41.app · Luxury Event Platform</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-600">
          <Link href="/events/sophia-marco/gate" className="hover:text-zinc-400 transition-colors">Gate Scanner</Link>
          <Link href="/events/sophia-marco/stage" className="hover:text-zinc-400 transition-colors">Stage Display</Link>
          <Link href="/dashboard" className="hover:text-zinc-400 transition-colors">Organizer Login</Link>
        </div>
      </footer>
    </div>
  );
}

function EventLandingWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <EventLandingContent slug={slug} />;
}

export default function EventLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-premium-black flex items-center justify-center text-zinc-500 text-sm">Loading event...</div>}>
      <EventLandingWrapper params={params} />
    </Suspense>
  );
}
