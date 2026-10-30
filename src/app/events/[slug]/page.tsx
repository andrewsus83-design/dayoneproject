'use client';

import React, { useState, useEffect, use, Suspense, useMemo, type CSSProperties } from 'react';
import Link from 'next/link';
import {
  Calendar, MapPin, Clock, Users, Heart, Building2,
  ArrowRight, ChevronDown, Star, Globe, Wifi,
  QrCode, Camera, Gamepad2, Gift, Copy, CheckCircle2,
  Sparkles, Play, Quote, Shirt,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatEventTime, useAssetUrl, useEventConfigBySlug } from '@/lib/eventStore';
import { resolveTheme } from '@/lib/eventTheme';
import { EventFonts } from '@/components/events/EventFonts';

function shortDate(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
}

function GalleryImage({ refId }: { refId: string }) {
  const url = useAssetUrl(refId);
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="w-full rounded-2xl mb-3 break-inside-avoid object-cover" loading="lazy" />;
}

function EventLandingContent({ slug }: { slug: string }) {
  const { hydrated, config, event } = useEventConfigBySlug(slug);
  const { info, landing } = config;
  const theme = useMemo(() => resolveTheme(config.design), [config.design]);
  const heroAsset = useAssetUrl(landing.heroUrl);
  const heroBg = heroAsset || event.cover_image_url || '';

  const isWedding = event.event_type === 'wedding';
  const light = theme.mode === 'light';
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const target = new Date(`${info.startDate}T${info.startTime || '00:00'}:00`).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (Number.isNaN(diff) || diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
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
  }, [info.startDate, info.startTime]);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRsvp = () => {
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
  };

  if (!hydrated) {
    return <div className="min-h-screen bg-premium-black flex items-center justify-center text-zinc-500 text-sm">Loading event...</div>;
  }

  const heading: CSSProperties = { fontFamily: theme.headingFamily, letterSpacing: '-0.02em' };
  const primaryBtn: CSSProperties = { background: theme.primary, color: theme.onPrimary, borderRadius: theme.buttonRadius };
  const eventTime = formatEventTime(info.startTime);
  const venueShort = info.venue.split(',')[0] ?? '';
  const showAttire = isWedding || (landing.dressCode && landing.dressCode !== 'Business Attire');

  return (
    <div className="min-h-screen" style={{ ...theme.vars, background: theme.bg, color: theme.text, fontFamily: theme.bodyFamily }}>
      <EventFonts href={theme.fontsHref} />

      {/* ── HERO ── */}
      <section className="relative min-h-[92vh] flex flex-col">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {heroBg && <img src={heroBg} alt={info.name} className="w-full h-full object-cover" />}
          {landing.heroOverlay && (
            <div className="absolute inset-0" style={{ background: light ? 'linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.7))' : `linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.3) 50%, ${theme.bg})` }} />
          )}
          {!landing.heroOverlay && !light && (
            <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: `linear-gradient(180deg, transparent, ${theme.bg})` }} />
          )}
        </div>

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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold transition-all scale-on-click"
              style={primaryBtn}
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>
        </nav>

        <div className="relative z-10 flex-1 flex flex-col justify-end px-6 sm:px-10 pb-16 max-w-3xl">
          <div className="space-y-5">
            {landing.badge && (
              isWedding
                ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-premium-danger/20 border border-premium-danger/30 text-premium-danger text-xs font-bold backdrop-blur">
                    <Heart className="w-3 h-3 fill-current" /> {landing.badge}
                  </span>
                : <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-premium-neon/20 border border-premium-neon/30 text-premium-neon text-xs font-bold backdrop-blur">
                    <Building2 className="w-3 h-3" /> {landing.badge}
                  </span>
            )}

            <div>
              {landing.subtitle && (
                <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] mb-2" style={{ color: theme.primary }}>{landing.subtitle}</p>
              )}
              <h1 className="text-4xl sm:text-6xl font-bold text-white leading-tight" style={heading}>
                {info.name}
              </h1>
            </div>

            {info.description && <p className="text-base text-zinc-300 leading-relaxed max-w-xl">{info.description}</p>}

            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-300">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" style={{ color: theme.primary }} /> {shortDate(info.startDate)}</span>
              {eventTime && <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" style={{ color: theme.primary }} /> {eventTime}</span>}
              {info.venue && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" style={{ color: theme.primary }} /> {info.venue}</span>}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href={`/events/${slug}/register`}
                onClick={handleRsvp}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 font-bold text-base scale-on-click transition-all"
                style={{ ...primaryBtn, ...heading, boxShadow: `0 0 20px ${theme.primary}33` }}
              >
                <Sparkles className="w-5 h-5" />
                {landing.ctaLabel || (isWedding ? 'RSVP to Attend' : 'Register Now')}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#about"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 border border-white/20 text-white font-bold text-sm hover:bg-white/10 transition-all scale-on-click backdrop-blur"
                style={{ borderRadius: theme.buttonRadius }}
              >
                Learn More <ChevronDown className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── COUNTDOWN ── */}
      <section className="py-8" style={{ background: theme.card, borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}` }}>
        <div className="max-w-2xl mx-auto px-6 flex flex-col items-center gap-4">
          <p className="text-xs font-mono uppercase tracking-widest" style={{ color: theme.subtle }}>Event starts in</p>
          <div className="flex items-center gap-4 sm:gap-8">
            {[
              { val: timeLeft.d, label: 'Days' },
              { val: timeLeft.h, label: 'Hours' },
              { val: timeLeft.m, label: 'Min' },
              { val: timeLeft.s, label: 'Sec' },
            ].map(({ val, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="text-4xl sm:text-5xl font-bold tabular-nums" style={{ ...heading, color: theme.primaryText }}>
                  {String(val).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: theme.subtle }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT / DETAILS ── */}
      <section id="about" className="max-w-4xl mx-auto px-6 py-20 space-y-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Calendar, label: 'Date', val: shortDate(info.startDate) },
            { icon: MapPin, label: 'Venue', val: venueShort },
            { icon: Users, label: 'Capacity', val: `${info.capacity} Guests` },
            { icon: Globe, label: 'Subdomain', val: `${info.slug}.all41.app` },
          ].map(({ icon: Icon, label, val }) => (
            <div key={label} className="p-5 flex flex-col gap-2 min-w-0" style={theme.cardStyle}>
              <Icon className="w-5 h-5" style={{ color: theme.primaryText }} />
              <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: theme.subtle }}>{label}</div>
              <div className="text-sm font-semibold leading-snug break-words" style={heading}>{val}</div>
            </div>
          ))}
        </div>

        {landing.notesOn && landing.notesText && (
          <blockquote className="p-8 flex gap-4 items-start" style={theme.cardStyle}>
            <Quote className="w-6 h-6 shrink-0" style={{ color: theme.primaryText }} />
            <p className="text-lg italic leading-relaxed" style={{ ...heading, color: theme.text }}>{landing.notesText}</p>
          </blockquote>
        )}

        {isWedding ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-3" style={heading}>
              <Heart className="w-5 h-5 text-premium-danger fill-current" />
              Our Story
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { year: '2021', title: 'First Met', desc: 'A chance encounter at a design conference in Singapore turned into something beautiful.' },
                { year: '2024', title: 'Got Engaged', desc: 'A sunrise proposal at Uluwatu cliffs, with the Indian Ocean as witness.' },
                { year: '2026', title: 'Forever in Bali', desc: 'A clifftop ceremony at GWK, surrounded by 250 guests from 18 countries.' },
              ].map((m) => (
                <div key={m.year} className="p-6 space-y-2" style={theme.cardStyle}>
                  <span className="text-xs font-mono font-bold" style={{ color: theme.primaryText }}>{m.year}</span>
                  <h3 className="font-bold" style={heading}>{m.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: theme.muted }}>{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold" style={heading}>Why Attend</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Star, title: '40+ World-Class Speakers', desc: 'CEOs, founders and investors from APAC\'s fastest-growing companies.' },
                { icon: Users, title: '1,200 Attendees', desc: 'Network with decision-makers from tech, finance, and deep-tech verticals.' },
                { icon: Globe, title: '12 Countries', desc: 'Truly pan-APAC representation with live translations in 4 languages.' },
                { icon: Sparkles, title: 'AI-Powered Matchmaking', desc: 'Smart session recommendations and 1:1 meeting scheduler powered by GPT.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="p-6 flex gap-4" style={theme.cardStyle}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${theme.primary}26` }}>
                    <Icon className="w-5 h-5" style={{ color: theme.primaryText }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm" style={heading}>{title}</h3>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: theme.muted }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {landing.galleryOn && landing.gallery.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-3" style={heading}>
              <Camera className="w-5 h-5" style={{ color: theme.primaryText }} /> Gallery
            </h2>
            <div className="columns-2 sm:columns-3 gap-3">
              {landing.gallery.map((p) => <GalleryImage key={p.id} refId={p.url} />)}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-2xl font-bold" style={heading}>What&apos;s Included</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: QrCode, label: 'Digital QR Pass', desc: 'Cryptographic gate entry' },
              { icon: Camera, label: 'AI Photo Wall', desc: 'Upload & share memories' },
              { icon: Gamepad2, label: 'Live Trivia', desc: 'Kahoot-style real-time quiz' },
              { icon: Gift, label: 'Door Prize Raffle', desc: '3D animated prize draws' },
              { icon: Play, label: 'Stage Display', desc: 'LED room module controller' },
              { icon: Wifi, label: 'Live Broadcast', desc: 'WA & email reminders' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="p-4 flex items-start gap-3" style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radius }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${theme.primary}1A` }}>
                  <Icon className="w-4 h-4" style={{ color: theme.primaryText }} />
                </div>
                <div>
                  <div className="text-xs font-bold">{label}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: theme.subtle }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {landing.testimoniesOn && landing.testimonies.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold" style={heading}>{isWedding ? 'Kind Words' : 'What People Say'}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {landing.testimonies.map((t) => (
                <div key={t.id} className="p-6 space-y-3" style={theme.cardStyle}>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4" style={{ color: theme.primary, fill: theme.primary }} />
                    ))}
                  </div>
                  <p className="text-sm italic leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                  <p className="text-xs font-bold" style={{ color: theme.subtle }}>{t.name}{t.role ? ` · ${t.role}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {showAttire && (
          isWedding ? (
            <div className="p-8 space-y-4" style={{ ...theme.cardStyle, border: `1px solid ${theme.primary}33`, boxShadow: `0 0 20px ${theme.primary}26` }}>
              <h2 className="text-xl font-bold flex items-center gap-2" style={heading}>
                <Heart className="w-4 h-4 text-premium-danger" /> Dress Code & Details
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: 'Dress Code', val: landing.dressCode || 'Black Tie — Tropical Formal' },
                  { label: 'Color Palette', val: 'Ivory · Blush · Gold' },
                  { label: 'Ceremony Language', val: 'English & Italian' },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: theme.subtle }}>{label}</div>
                    <div className="text-sm font-semibold" style={heading}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 flex items-center gap-4" style={theme.cardStyle}>
              <Shirt className="w-5 h-5" style={{ color: theme.primaryText }} />
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: theme.subtle }}>Attire</div>
                <div className="text-sm font-semibold" style={heading}>{landing.dressCode}</div>
              </div>
            </div>
          )
        )}

        <div className="text-center space-y-6 py-8">
          <h2 className="text-3xl font-bold" style={heading}>
            {isWedding ? 'Join Us on Our Special Day' : 'Secure Your Seat Today'}
          </h2>
          <p className="max-w-md mx-auto" style={{ color: theme.muted }}>
            {isWedding
              ? 'RSVP by 1 November 2026 so we can ensure your seat and a personalised place card.'
              : 'Early-bird seats are limited. Register now and receive your digital QR pass instantly.'}
          </p>
          <Link
            href={`/events/${slug}/register`}
            className="inline-flex items-center gap-2 px-10 py-5 font-bold text-lg scale-on-click transition-all"
            style={{ ...primaryBtn, ...heading, boxShadow: `0 0 20px ${theme.primary}33` }}
          >
            <Sparkles className="w-5 h-5" />
            {landing.ctaLabel || (isWedding ? 'RSVP Now' : 'Register Free')}
            <ArrowRight className="w-5 h-5" />
          </Link>
          {landing.ctaSub && <p className="text-xs" style={{ color: theme.subtle }}>{landing.ctaSub}</p>}
        </div>
      </section>

      {slug === 'popverse' && (
        <div className="w-full overflow-hidden" style={{ borderTop: `1px solid ${theme.border}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://cdn.openart.ai/openart-ai/production/2026-10/create-image/gyygId5ZYPaN2nz17abs/image_1793300679578_05258890_1793300680180_9c4dea1c.png"
            alt="POPVERSE 2026 — Different Tunes. One Beat."
            className="w-full h-auto object-cover max-h-32 sm:max-h-40"
          />
        </div>
      )}

      <footer className="py-8 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto" style={{ borderTop: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-sm shadow-gold">41</div>
          <span className="text-xs" style={{ color: theme.subtle }}>Powered by all41.app · Luxury Event Platform</span>
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color: theme.subtle }}>
          <Link href={`/events/${slug}/gate`} className="hover:underline">Gate Scanner</Link>
          <Link href={`/events/${slug}/stage`} className="hover:underline">Stage Display</Link>
          <Link href="/dashboard" className="hover:underline">Organizer Login</Link>
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
