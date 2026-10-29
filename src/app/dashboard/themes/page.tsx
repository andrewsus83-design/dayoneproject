'use client';

import React, { useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { CORPORATE_THEMES, WEDDING_THEMES } from '@/lib/theme/defaultThemes';
import { ThemeConfig, ThemeCategory } from '@/lib/types';
import {
  Briefcase,
  Heart,
  Check,
  ExternalLink,
  Users,
  Building2,
  Mic2,
  Gift,
  QrCode,
  UtensilsCrossed,
  Camera,
  Sparkles,
  Star,
  MapPin,
  Clock,
} from 'lucide-react';

// ── Mini landing page prototype rendered inside a phone frame ──────────────────
function LandingPrototype({ theme, isCorporate }: { theme: ThemeConfig; isCorporate: boolean }) {
  const bg = theme.backgroundColor;
  const primary = theme.primaryColor;
  const secondary = theme.secondaryColor;
  const accent = theme.accentColor;
  const text = theme.textColor;
  const font = theme.fontFamily;

  // Determine if primary is light (for text on it)
  const primaryIsLight = primary === '#E4E4E7' || primary.startsWith('#F') || primary.startsWith('#E');
  const primaryTextColor = primaryIsLight ? '#09090B' : '#000000';

  return (
    <div
      className="w-full h-full overflow-hidden text-left"
      style={{ backgroundColor: bg, color: text, fontFamily: font }}
    >
      {/* ── Hero ── */}
      <div
        className="relative px-3 pt-3 pb-4"
        style={{
          background: `linear-gradient(160deg, ${secondary}ee 0%, ${bg} 100%)`,
          borderBottom: `1px solid ${secondary}`,
        }}
      >
        {/* Badge */}
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[7px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ backgroundColor: primary, color: primaryTextColor }}
          >
            {theme.landingSchema.accentBadge}
          </span>
          <span className="text-[6px] opacity-50" style={{ fontFamily: 'monospace' }}>
            {isCorporate ? 'RSVP OPEN' : '♡ We\'re Getting Married'}
          </span>
        </div>

        {/* Event title */}
        <h3
          className="text-[12px] font-bold leading-tight mb-1"
          style={{ color: text, fontFamily: font }}
        >
          {isCorporate
            ? 'TechUnite APAC Summit 2026'
            : 'Aria & Daniel'}
        </h3>
        <p className="text-[7px] opacity-60 leading-snug mb-2">
          {isCorporate
            ? 'Executive keynotes · AI labs · Networking rails'
            : 'Saturday, 15 March 2026 · Grand Ballroom, The Ritz'}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-0.5 text-[6px] opacity-60">
            <MapPin className="w-2 h-2" />
            <span>{isCorporate ? 'Marina Bay Sands' : 'The St. Regis Bali'}</span>
          </div>
          <div className="flex items-center gap-0.5 text-[6px] opacity-60">
            <Clock className="w-2 h-2" />
            <span>{isCorporate ? '09:00 – 18:00' : '16:00 – 23:00'}</span>
          </div>
        </div>

        {/* CTA button */}
        <button
          className="text-[7px] font-bold px-3 py-1 rounded-lg"
          style={{ backgroundColor: accent, color: '#000000' }}
        >
          {isCorporate ? 'Register Delegate Pass' : 'RSVP & Send Wishes'}
        </button>
      </div>

      {/* ── Body sections ── */}
      <div className="px-3 py-2 space-y-2.5">

        {/* Corporate: Keynote Speakers */}
        {isCorporate && theme.landingSchema.showSpeakers && (
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <Mic2 className="w-2.5 h-2.5" style={{ color: primary }} />
              <span className="text-[7px] font-bold uppercase tracking-wider opacity-70">Keynote Speakers</span>
            </div>
            <div className="flex gap-1.5 overflow-hidden">
              {['Sarah Lim', 'Ravi Mehta', 'Jin Park'].map((name, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-lg p-1.5 text-center min-w-0"
                  style={{ backgroundColor: secondary, border: `1px solid ${primary}33` }}
                >
                  <div
                    className="w-5 h-5 rounded-full mx-auto mb-1 flex items-center justify-center text-[5px] font-bold"
                    style={{ backgroundColor: primary, color: primaryTextColor }}
                  >
                    {name.charAt(0)}
                  </div>
                  <div className="text-[5.5px] font-bold truncate" style={{ color: text }}>{name}</div>
                  <div className="text-[5px] opacity-40 truncate">CEO / CTO</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Corporate: Sponsors */}
        {isCorporate && theme.landingSchema.showSponsors && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Building2 className="w-2.5 h-2.5" style={{ color: accent }} />
              <span className="text-[7px] font-bold uppercase tracking-wider opacity-70">Presenting Sponsors</span>
            </div>
            <div className="flex gap-1">
              {['Platinum', 'Gold', 'Silver'].map((tier, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-md py-1 text-center text-[5.5px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: secondary,
                    color: i === 0 ? primary : i === 1 ? accent : text,
                    border: `1px solid ${i === 0 ? primary : secondary}55`,
                  }}
                >
                  {tier}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wedding: Love Story */}
        {!isCorporate && theme.landingSchema.showLoveStory && (
          <div
            className="rounded-lg p-2.5"
            style={{ backgroundColor: secondary, border: `1px solid ${primary}40` }}
          >
            <div className="flex items-center gap-1 mb-1.5">
              <Heart className="w-2.5 h-2.5" style={{ color: primary }} />
              <span className="text-[7px] font-bold uppercase tracking-wider opacity-70">Our Love Story</span>
            </div>
            <div className="space-y-1">
              {[
                { year: '2020', text: 'Met at a coffee shop in Seminyak' },
                { year: '2023', text: 'Proposed at Uluwatu cliffside' },
                { year: '2026', text: 'Forever begins today' },
              ].map((m, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span
                    className="text-[5px] font-bold px-1 py-0.5 rounded shrink-0 mt-0.5"
                    style={{ backgroundColor: primary, color: primaryTextColor }}
                  >
                    {m.year}
                  </span>
                  <span className="text-[6px] opacity-70 leading-tight">{m.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wedding: Digital Angpao */}
        {!isCorporate && theme.landingSchema.showDigitalAngpao && (
          <div
            className="rounded-lg p-2 flex items-center gap-2"
            style={{ backgroundColor: secondary, border: `1px solid ${accent}40` }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: accent + '33' }}
            >
              <Gift className="w-3.5 h-3.5" style={{ color: accent }} />
            </div>
            <div>
              <div className="text-[7px] font-bold" style={{ color: text }}>Digital Angpao / QRIS</div>
              <div className="text-[5.5px] opacity-50">Bank Transfer · GoPay · OVO · QRIS</div>
            </div>
          </div>
        )}

        {/* Shared: QR Check-in row */}
        <div
          className="rounded-lg p-2 flex items-center gap-2"
          style={{ backgroundColor: secondary, border: `1px solid ${secondary}` }}
        >
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: primary + '22' }}
          >
            <QrCode className="w-3 h-3" style={{ color: primary }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[7px] font-bold truncate" style={{ color: text }}>
              {isCorporate ? 'Delegate QR Pass — Sub-second Gate' : 'Guest E-Invitation — QR Admission'}
            </div>
            <div className="text-[5.5px] opacity-50 truncate">Cryptographic token · Offline gate reader</div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#00E676', boxShadow: `0 0 4px #00E676` }} />
        </div>

        {/* Menu / Banquet */}
        {theme.landingSchema.showMenuBanquet && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <UtensilsCrossed className="w-2.5 h-2.5" style={{ color: primary }} />
              <span className="text-[7px] font-bold uppercase tracking-wider opacity-70">
                {isCorporate ? 'Gala Dinner Menu' : 'Wedding Banquet'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {(isCorporate
                ? ['Canapé Reception', 'Entrée Course', 'Main Course', 'Dessert Station']
                : ['Amuse-Bouche', 'Soup & Salad', 'Main Entrée', 'Wedding Cake']
              ).map((item, i) => (
                <div
                  key={i}
                  className="rounded-md px-2 py-1 text-[5.5px] font-medium flex items-center gap-1"
                  style={{ backgroundColor: secondary }}
                >
                  <span style={{ color: primary }}>•</span>
                  <span style={{ color: text, opacity: 0.7 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photo Wall teaser */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Camera className="w-2.5 h-2.5" style={{ color: accent }} />
            <span className="text-[7px] font-bold uppercase tracking-wider opacity-70">Live Photo Wall</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-md"
                style={{
                  background: `linear-gradient(135deg, ${primary}33 0%, ${accent}22 100%)`,
                  border: `1px solid ${secondary}`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Phone frame wrapper ────────────────────────────────────────────────────────
function PhoneFrame({ theme, isCorporate }: { theme: ThemeConfig; isCorporate: boolean }) {
  return (
    <div className="relative mx-auto" style={{ width: '180px' }}>
      {/* Phone bezel */}
      <div
        className="relative rounded-[22px] overflow-hidden shadow-2xl"
        style={{
          border: '3px solid #3f3f46',
          backgroundColor: theme.backgroundColor,
          aspectRatio: '9/19.5',
        }}
      >
        {/* Status bar */}
        <div
          className="flex items-center justify-between px-3 py-1"
          style={{ backgroundColor: theme.backgroundColor }}
        >
          <span className="text-[5px] font-bold opacity-60" style={{ color: theme.textColor }}>9:41</span>
          <div
            className="w-8 h-1.5 rounded-full"
            style={{ backgroundColor: theme.textColor + '20' }}
          />
          <div className="flex items-center gap-0.5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-sm"
                style={{ width: '2px', height: `${5 + i * 2}px`, backgroundColor: theme.textColor, opacity: i < 3 ? 1 : 0.3 }}
              />
            ))}
          </div>
        </div>

        {/* Prototype content — scrollable area capped */}
        <div className="overflow-hidden" style={{ height: 'calc(100% - 16px)' }}>
          <LandingPrototype theme={theme} isCorporate={isCorporate} />
        </div>
      </div>

      {/* Bottom home bar */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full" style={{ backgroundColor: theme.textColor + '33' }} />
    </div>
  );
}

// ── Theme card ─────────────────────────────────────────────────────────────────
function ThemeCard({ themeKey, theme, isCorporate }: { themeKey: string; theme: ThemeConfig; isCorporate: boolean }) {
  const [hovered, setHovered] = useState(false);

  const features = isCorporate
    ? [
        { icon: Mic2, label: 'Keynote Speakers', active: theme.landingSchema.showSpeakers },
        { icon: Building2, label: 'Tiered Sponsors', active: theme.landingSchema.showSponsors },
        { icon: UtensilsCrossed, label: 'Gala Dinner Menu', active: theme.landingSchema.showMenuBanquet },
        { icon: Users, label: 'Delegate Seating', active: theme.landingSchema.showTableSeating },
        { icon: QrCode, label: 'VIP QR Pass', active: true },
        { icon: Camera, label: 'Live Photo Wall', active: true },
      ]
    : [
        { icon: Heart, label: 'Couple Love Story', active: theme.landingSchema.showLoveStory },
        { icon: Gift, label: 'Digital Angpao QRIS', active: theme.landingSchema.showDigitalAngpao },
        { icon: UtensilsCrossed, label: 'Wedding Banquet', active: theme.landingSchema.showMenuBanquet },
        { icon: Users, label: 'Table Seating', active: theme.landingSchema.showTableSeating },
        { icon: QrCode, label: 'E-Invitation QR', active: true },
        { icon: Camera, label: 'Live Photo Wall', active: true },
      ];

  return (
    <div
      className="rounded-[2.5rem] border bg-premium-charcoal overflow-hidden shadow-2xl transition-all duration-300 flex flex-col"
      style={{
        borderColor: hovered ? theme.primaryColor + '70' : '#27272A',
        boxShadow: hovered ? `0 0 40px ${theme.primaryColor}18` : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Top: phone mockup + info side by side ── */}
      <div className="flex gap-6 p-7">
        {/* Phone mockup */}
        <div className="shrink-0 flex items-start pt-1">
          <PhoneFrame theme={theme} isCorporate={isCorporate} />
        </div>

        {/* Info column */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Name + category badge */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[9px] px-2.5 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider border"
                style={{
                  backgroundColor: theme.primaryColor + '18',
                  color: theme.primaryColor,
                  borderColor: theme.primaryColor + '40',
                }}
              >
                {theme.landingSchema.accentBadge}
              </span>
            </div>
            <h3 className="text-xl font-display font-bold text-white leading-tight">{theme.name}</h3>
            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{theme.description}</p>
          </div>

          {/* Color palette */}
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 mb-2">Palette</div>
            <div className="flex items-center gap-2">
              {[
                { color: theme.primaryColor, label: 'Primary' },
                { color: theme.accentColor, label: 'Accent' },
                { color: theme.secondaryColor, label: 'Surface' },
                { color: theme.backgroundColor, label: 'Base' },
              ].map(({ color, label }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div
                    className="w-7 h-7 rounded-lg border border-black/20 shadow-sm"
                    style={{ backgroundColor: color }}
                    title={`${label}: ${color}`}
                  />
                  <span className="text-[8px] text-zinc-600">{label}</span>
                </div>
              ))}
              <div className="ml-1 flex flex-col gap-0.5">
                <span className="text-[9px] font-mono text-zinc-500">{theme.fontFamily}</span>
                <span className="text-[8px] text-zinc-600">{theme.landingSchema.layoutType}</span>
              </div>
            </div>
          </div>

          {/* Schema features grid */}
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 mb-2">Landing Page Sections</div>
            <div className="grid grid-cols-2 gap-1.5">
              {features.map(({ icon: Icon, label, active }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 text-[10px] rounded-xl px-2.5 py-1.5"
                  style={{
                    backgroundColor: active ? theme.primaryColor + '12' : '#18181B',
                    border: `1px solid ${active ? theme.primaryColor + '30' : '#27272A'}`,
                  }}
                >
                  <Icon
                    className="w-3 h-3 shrink-0"
                    style={{ color: active ? theme.primaryColor : '#3f3f46' }}
                  />
                  <span style={{ color: active ? '#e4e4e7' : '#52525b' }}>{label}</span>
                  {active && (
                    <Check
                      className="w-2.5 h-2.5 shrink-0 ml-auto"
                      style={{ color: theme.primaryColor }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom action bar ── */}
      <div className="mt-auto px-7 py-4 bg-premium-surfaceDark border-t border-premium-borderDark flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-zinc-500">
            <span className="text-zinc-400 font-bold">{themeKey}</span>
          </span>
          <span
            className="text-[9px] px-2 py-0.5 rounded-full font-mono border"
            style={{
              color: isCorporate ? '#00F0FF' : theme.primaryColor,
              borderColor: isCorporate ? '#00F0FF33' : theme.primaryColor + '40',
              backgroundColor: isCorporate ? '#00F0FF0D' : theme.primaryColor + '0D',
            }}
          >
            {isCorporate ? 'corporate_keynote' : 'wedding_romance'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-premium-charcoal border border-premium-borderDark hover:border-zinc-500 scale-on-click transition-all"
            onClick={() => window.open('/dashboard/events/new', '_blank')}
          >
            <Sparkles className="w-3 h-3" />
            <span>Use Theme</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold scale-on-click transition-all"
            style={{
              backgroundColor: theme.primaryColor,
              color: theme.primaryColor === '#E4E4E7' ? '#09090B' : '#000000',
            }}
          >
            <ExternalLink className="w-3 h-3" />
            <span>Preview Live</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ThemePresetsCatalogPage() {
  const [activeCategory, setActiveCategory] = useState<ThemeCategory>('corporate');

  const themes = activeCategory === 'corporate' ? CORPORATE_THEMES : WEDDING_THEMES;
  const isCorporate = activeCategory === 'corporate';

  return (
    <div className="flex-1 flex flex-col font-sans select-none bg-premium-black text-zinc-100">
      <Header
        title="Theme Presets"
        subtitle="Real landing page templates — choose a theme and see exactly how your event page looks"
        actionText="Back to Dashboard"
        actionHref="/dashboard"
      />

      <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Category switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark shadow-xl">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-premium-gold font-bold">
              Dual Theme Engine
            </span>
            <h2 className="text-xl font-display font-bold text-white mt-0.5">
              {isCorporate ? `${Object.keys(CORPORATE_THEMES).length} Corporate Templates` : `${Object.keys(WEDDING_THEMES).length} Wedding Templates`}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 max-w-lg">
              {isCorporate
                ? 'Corporate themes include Keynote Speakers, Tiered Sponsors, and delegate QR passes — built for summits, launches, and AGMs.'
                : 'Wedding themes include Couple Love Story, Digital Angpao QRIS, and e-invitation QR — built for 5-star ballrooms and destination ceremonies.'}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-premium-surfaceDark p-1.5 rounded-2xl border border-premium-borderDark shrink-0">
            <button
              type="button"
              onClick={() => setActiveCategory('corporate')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all scale-on-click ${
                isCorporate
                  ? 'bg-premium-gold text-black shadow-gold font-display'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Corporate</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('wedding')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all scale-on-click ${
                !isCorporate
                  ? 'bg-premium-gold text-black shadow-gold font-display'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>Wedding</span>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 px-1">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <div className="w-3 h-3 rounded-full bg-premium-gold/20 border border-premium-gold/40 flex items-center justify-center">
              <Check className="w-1.5 h-1.5 text-premium-gold" />
            </div>
            Active section in this schema
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <div className="w-3 h-3 rounded-full bg-zinc-800 border border-zinc-700" />
            Disabled for this template
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <Star className="w-3 h-3 text-premium-gold" />
            Hover card to highlight template
          </div>
        </div>

        {/* Theme cards */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {Object.entries(themes).map(([key, theme]) => (
            <ThemeCard
              key={key}
              themeKey={key}
              theme={theme}
              isCorporate={isCorporate}
            />
          ))}
        </div>

        {/* Footer note */}
        <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark text-center">
          <p className="text-xs text-zinc-400">
            More theme templates are added regularly.{' '}
            <span className="text-premium-gold font-medium">Custom brand themes</span>
            {' '}with your own color palette, logo, and typography are available in the event creation flow.
          </p>
        </div>
      </div>
    </div>
  );
}
