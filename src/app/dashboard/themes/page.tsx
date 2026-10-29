'use client';

import React, { useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { CORPORATE_THEMES, WEDDING_THEMES } from '@/lib/theme/defaultThemes';
import { ThemeCategory } from '@/lib/types';
import {
  Palette,
  Check,
  Sparkles,
  ExternalLink,
  Briefcase,
  Heart,
  Users,
  UtensilsCrossed,
  Gift,
  Tv,
} from 'lucide-react';

export default function ThemePresetsCatalogPage() {
  const [activeCategory, setActiveCategory] = useState<ThemeCategory>('corporate');

  const themes = activeCategory === 'corporate' ? CORPORATE_THEMES : WEDDING_THEMES;

  return (
    <div className="flex-1 flex flex-col font-sans select-none bg-premium-black text-zinc-100">
      <Header
        title="Visual Theme Presets & Landing Schemas"
        subtitle="Differentiated theme engines for high-impact Corporate Summits and luxury Wedding Celebrations"
        actionText="Back to Dashboard"
        actionHref="/dashboard"
      />

      <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Category Filter Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark shadow-xl">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-premium-gold font-bold">
              Theme Engine Architecture
            </span>
            <h2 className="text-xl font-display font-bold text-white mt-0.5">
              Select Theme Collection
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Corporate and Wedding events utilize fundamentally different landing schemas, typography hierarchies, and interactive modules.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-premium-surfaceDark p-1.5 rounded-2xl border border-premium-borderDark">
            <button
              type="button"
              onClick={() => setActiveCategory('corporate')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all scale-on-click ${
                activeCategory === 'corporate'
                  ? 'bg-premium-gold text-black shadow-gold font-display'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Corporate Themes ({Object.keys(CORPORATE_THEMES).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('wedding')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all scale-on-click ${
                activeCategory === 'wedding'
                  ? 'bg-premium-gold text-black shadow-gold font-display'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>Wedding Themes ({Object.keys(WEDDING_THEMES).length})</span>
            </button>
          </div>
        </div>

        {/* Theme Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {Object.entries(themes).map(([key, theme]) => (
            <div
              key={key}
              className="rounded-[2.5rem] border border-premium-borderDark bg-premium-charcoal overflow-hidden shadow-2xl flex flex-col justify-between hover:border-premium-gold/50 transition-colors"
            >
              {/* Theme Header with Color Swatches */}
              <div className="p-8 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider bg-premium-surfaceDark border border-premium-borderDark text-premium-gold">
                        {theme.landingSchema.accentBadge}
                      </span>
                      <span className="text-xs font-mono text-zinc-500">
                        {theme.fontFamily}
                      </span>
                    </div>
                    <h3 className="text-2xl font-display font-bold text-white">
                      {theme.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      {theme.description}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <div
                      className="w-8 h-8 rounded-full border border-black/30 shadow-md"
                      style={{ backgroundColor: theme.primaryColor }}
                      title="Primary Color"
                    />
                    <div
                      className="w-8 h-8 rounded-full border border-black/30 shadow-md"
                      style={{ backgroundColor: theme.secondaryColor }}
                      title="Secondary Color"
                    />
                    <div
                      className="w-8 h-8 rounded-full border border-black/30 shadow-md"
                      style={{ backgroundColor: theme.accentColor }}
                      title="Accent Color"
                    />
                  </div>
                </div>

                {/* Schema Specifications Breakdown */}
                <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark space-y-2 text-xs">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 flex items-center justify-between">
                    <span>Landing Page Schema Features</span>
                    <span className="text-premium-neon font-mono">{theme.landingSchema.layoutType}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-zinc-300 text-[11px] pt-1">
                    {activeCategory === 'corporate' ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-premium-success" />
                          <span>Keynote Speakers</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-premium-success" />
                          <span>Tiered Sponsor Logos</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-premium-success" />
                          <span>Multi-Track Agenda</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-premium-success" />
                          <span>VIP Delegate QR Pass</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-premium-success" />
                          <span>Couple Love Story</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-premium-success" />
                          <span>4-Course Banquet Menu</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-premium-success" />
                          <span>Digital Angpao QRIS</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-premium-success" />
                          <span>Table Seating Table</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Mock Live UI Card in this Theme */}
                <div
                  className="rounded-2xl p-6 border shadow-inner space-y-3"
                  style={{
                    backgroundColor: theme.backgroundColor,
                    color: theme.textColor,
                    borderColor: theme.secondaryColor,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full"
                      style={{
                        backgroundColor: theme.primaryColor,
                        color: theme.backgroundColor === '#09090B' || theme.backgroundColor.startsWith('#0') ? '#000000' : '#FFFFFF',
                      }}
                    >
                      {activeCategory === 'corporate' ? 'Keynote Track' : 'Ceremony Vows'}
                    </span>
                    <span className="text-xs opacity-75 font-mono">
                      {activeCategory === 'corporate' ? 'Delegate Pass • Seat A12' : 'Table 08 • Diamond'}
                    </span>
                  </div>

                  <h4
                    className="text-2xl font-display font-medium"
                    style={{
                      fontFamily: theme.fontFamily,
                      color: theme.textColor,
                    }}
                  >
                    {activeCategory === 'corporate' ? 'TechUnite APAC Summit 2026' : 'Aria & Daniel: The Grand Celebration'}
                  </h4>

                  <p className="text-xs opacity-80 leading-relaxed font-light">
                    {activeCategory === 'corporate'
                      ? 'Executive keynotes, live stage LED photowall, and cross-border networking rails.'
                      : 'An intimate sunset wedding ceremony with candlelight dining, champagne sommelier, and digital wishes.'}
                  </p>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      className="px-5 py-2.5 rounded-xl text-xs font-bold shadow-md scale-on-click"
                      style={{
                        backgroundColor: theme.accentColor,
                        color: '#000000',
                      }}
                    >
                      {activeCategory === 'corporate' ? 'Scan Delegate QR' : 'Send Wedding Wishes'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-6 bg-premium-surfaceDark border-t border-premium-borderDark flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-mono">
                  Schema: <strong className="text-white">{theme.preset}</strong>
                </span>
                <span className="text-xs font-bold text-premium-gold flex items-center gap-1">
                  <span>Included in All41 Suite</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}