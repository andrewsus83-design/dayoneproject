'use client';

import React from 'react';
import { Header } from '@/components/dashboard/Header';
import { THEME_PRESETS } from '@/lib/theme/defaultThemes';
import { Palette, Check, Sparkles, ExternalLink } from 'lucide-react';

export default function ThemePresetsCatalogPage() {
  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Visual Theme Presets"
        subtitle="Curated color palettes and typography styles for corporate galas and luxury weddings"
      />

      <div className="p-6 sm:p-8 space-y-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(THEME_PRESETS).map(([key, theme]) => (
            <div
              key={key}
              className="rounded-3xl border border-[#20283c] bg-[#121624] overflow-hidden shadow-xl flex flex-col justify-between"
            >
              {/* Theme Header with Color Swatches */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white capitalize">
                      {key.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-xs text-gray-400 font-mono">
                      Font Family: {theme.fontFamily}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div
                      className="w-7 h-7 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: theme.primaryColor }}
                      title="Primary Color"
                    />
                    <div
                      className="w-7 h-7 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: theme.secondaryColor }}
                      title="Secondary Color"
                    />
                    <div
                      className="w-7 h-7 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: theme.accentColor }}
                      title="Accent Color"
                    />
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
                      className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: theme.primaryColor,
                        color: theme.backgroundColor,
                      }}
                    >
                      Live Preview
                    </span>
                    <span className="text-xs opacity-75">Table 01 • VIP</span>
                  </div>

                  <h4
                    className="text-xl font-extrabold"
                    style={{
                      fontFamily: theme.fontFamily,
                      color: theme.textColor,
                    }}
                  >
                    Tech & Grand Celebrations
                  </h4>

                  <p className="text-xs opacity-80 leading-relaxed">
                    Personalized digital invitations, QR check-in badges, and interactive live photo walls render seamlessly in this aesthetic.
                  </p>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg text-xs font-bold shadow"
                      style={{
                        backgroundColor: theme.accentColor,
                        color: '#ffffff',
                      }}
                    >
                      RSVP Invitation
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg text-xs font-semibold border"
                      style={{
                        borderColor: theme.secondaryColor,
                        color: theme.textColor,
                      }}
                    >
                      Live Wall
                    </button>
                  </div>
                </div>
              </div>

              {/* Hex Values Bar */}
              <div className="px-6 py-3 bg-[#0d101a] border-t border-[#1c2438] flex items-center justify-between text-xs font-mono text-gray-400">
                <span>Pri: {theme.primaryColor}</span>
                <span>Sec: {theme.secondaryColor}</span>
                <span>Acc: {theme.accentColor}</span>
                <span>Bg: {theme.backgroundColor}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
