'use client';

import React, { useMemo, useState } from 'react';
import { Type, Palette, Layers, Check, Moon, Sun, Paintbrush, ExternalLink, RotateCcw, Calendar, MapPin } from 'lucide-react';
import { resetEventSection, useEventConfig, type DesignConfig, type ThemeMode } from '@/lib/eventStore';
import {
  BODY_FONTS, CARD_STYLES, DARK_BACKGROUNDS, HEADING_FONTS, LIGHT_BACKGROUNDS, PALETTES, RADIUS_OPTIONS,
  modeForBackground, resolveTheme,
} from '@/lib/eventTheme';
import { EventFonts } from '@/components/events/EventFonts';

type DesignSubTab = 'mode' | 'fonts' | 'colors' | 'style';

function SubNav({ active, onChange }: { active: DesignSubTab; onChange: (t: DesignSubTab) => void }) {
  const tabs: { id: DesignSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'mode', label: 'Light / Dark & Background', icon: Paintbrush },
    { id: 'fonts', label: 'Fonts', icon: Type },
    { id: 'colors', label: 'Accent Palette', icon: Palette },
    { id: 'style', label: 'Style', icon: Layers },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold scale-on-click transition-all ${
            active === t.id
              ? 'bg-premium-gold/15 text-premium-gold border border-premium-gold/40'
              : 'bg-premium-surfaceDark text-zinc-400 border border-premium-borderDark hover:text-white'
          }`}
        >
          <t.icon className="w-3.5 h-3.5" />
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function EventDesignStudio({ eventId }: { eventId: string }) {
  const { config, event, update, savedAt } = useEventConfig(eventId);
  const design = config.design;
  const isWedding = event.event_type === 'wedding';
  const theme = useMemo(() => resolveTheme(design), [design]);
  const [subTab, setSubTab] = useState<DesignSubTab>('mode');
  const [applied, setApplied] = useState(false);

  const setDesign = (patch: Partial<DesignConfig>) => update('design', patch);
  const backgrounds = design.mode === 'light' ? LIGHT_BACKGROUNDS : DARK_BACKGROUNDS;
  const isPresetBg = [...DARK_BACKGROUNDS, ...LIGHT_BACKGROUNDS].some((b) => b.hex.toLowerCase() === design.background.toLowerCase());

  const chooseMode = (mode: ThemeMode) => {
    if (mode === design.mode) return;
    const list = mode === 'light' ? LIGHT_BACKGROUNDS : DARK_BACKGROUNDS;
    const keep = list.some((b) => b.hex.toLowerCase() === design.background.toLowerCase());
    setDesign({ mode, background: keep ? design.background : list[0].hex });
  };

  return (
    <div className="space-y-5">
      <EventFonts href={theme.fontsHref} />
      <SubNav active={subTab} onChange={setSubTab} />

      {subTab === 'mode' && (
        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-6">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Page Mode</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: 'dark', label: 'Dark Mode', desc: 'Light text on a dark background', icon: Moon, swatch: '#09090B', ink: '#FAFAFA' },
                { id: 'light', label: 'Light Mode', desc: 'Dark text on a light background', icon: Sun, swatch: '#FBF8F1', ink: '#18181B' },
              ] as const).map((m) => {
                const active = design.mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => chooseMode(m.id)}
                    className={`p-4 rounded-2xl border text-left transition-all scale-on-click ${active ? 'border-premium-gold shadow-gold bg-premium-surfaceDark' : 'border-premium-borderDark bg-premium-black/60 hover:border-zinc-600'}`}
                  >
                    <div className="h-16 rounded-xl mb-3 flex items-center justify-center gap-2 border border-white/10" style={{ background: m.swatch, color: m.ink }}>
                      <m.icon className="w-5 h-5" />
                      <span className="text-sm font-display font-bold">Aa</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{m.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-premium-gold" />}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">
              Background color · {design.mode === 'light' ? 'light' : 'dark'} choices
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {backgrounds.map((b) => {
                const active = design.background.toLowerCase() === b.hex.toLowerCase();
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setDesign({ background: b.hex })}
                    className={`p-2 rounded-2xl border text-left transition-all scale-on-click ${active ? 'border-premium-gold shadow-gold' : 'border-premium-borderDark hover:border-zinc-600'}`}
                  >
                    <div className="h-12 rounded-xl border border-white/10 relative" style={{ background: b.hex }}>
                      {active && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-premium-gold flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-black" />
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-white mt-1.5 px-0.5">{b.label}</div>
                    <div className="text-[9px] font-mono text-zinc-500 px-0.5">{b.hex}</div>
                  </button>
                );
              })}
              <label
                className={`p-2 rounded-2xl border text-left transition-all cursor-pointer scale-on-click ${!isPresetBg ? 'border-premium-gold shadow-gold' : 'border-premium-borderDark hover:border-zinc-600'}`}
              >
                <div className="h-12 rounded-xl border border-dashed border-white/20 relative overflow-hidden" style={{ background: !isPresetBg ? design.background : 'transparent' }}>
                  {isPresetBg && <span className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-500 font-bold">Pick…</span>}
                  <input
                    type="color"
                    value={design.background}
                    onChange={(e) => setDesign({ background: e.target.value.toUpperCase(), mode: modeForBackground(e.target.value) })}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    aria-label="Custom background color"
                  />
                </div>
                <div className="text-[11px] font-bold text-white mt-1.5 px-0.5">Custom</div>
                <div className="text-[9px] font-mono text-zinc-500 px-0.5">{!isPresetBg ? design.background : 'Any color'}</div>
              </label>
            </div>
            <p className="text-[10px] text-zinc-600 mt-2">A custom color switches light/dark automatically so text stays readable.</p>
          </div>
        </div>
      )}

      {subTab === 'fonts' && (
        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Heading / Display Font</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {HEADING_FONTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDesign({ headingFont: f.id })}
                  className={`p-4 rounded-2xl border text-center transition-all scale-on-click ${design.headingFont === f.id ? 'border-premium-gold bg-premium-surfaceDark shadow-gold' : 'border-premium-borderDark bg-premium-black/60 hover:border-zinc-600'}`}
                >
                  <EventFonts href={f.google ? `https://fonts.googleapis.com/css2?family=${f.google}&display=swap` : null} />
                  <div className="text-3xl font-bold text-white mb-1" style={{ fontFamily: f.family }}>Aa</div>
                  <div className="text-[10px] text-zinc-400 font-mono">{f.label}</div>
                  {design.headingFont === f.id && <Check className="w-3.5 h-3.5 text-premium-gold mx-auto mt-1" />}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Body / Paragraph Font</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BODY_FONTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDesign({ bodyFont: f.id })}
                  className={`p-4 rounded-2xl border text-left transition-all scale-on-click ${design.bodyFont === f.id ? 'border-premium-gold bg-premium-surfaceDark shadow-gold' : 'border-premium-borderDark bg-premium-black/60 hover:border-zinc-600'}`}
                >
                  <EventFonts href={f.google ? `https://fonts.googleapis.com/css2?family=${f.google}&display=swap` : null} />
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">{f.label}</span>
                    {design.bodyFont === f.id && <Check className="w-3.5 h-3.5 text-premium-gold" />}
                  </div>
                  <div className="text-xs text-zinc-400" style={{ fontFamily: f.family }}>The quick brown fox jumps over the lazy dog</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'colors' && (
        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Button & accent colors</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PALETTES.map((p) => {
              const primary = p.id === 'custom' ? design.customPrimary : p.primary;
              const accent = p.id === 'custom' ? design.customAccent : p.accent;
              const active = design.palette === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDesign({ palette: p.id })}
                  className={`p-4 rounded-2xl border text-left transition-all scale-on-click ${active ? 'border-premium-gold shadow-gold' : 'border-premium-borderDark hover:border-zinc-600'}`}
                  style={{ background: theme.bg }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full border-2 border-white/20" style={{ background: primary }} />
                    <span className="w-5 h-5 rounded-full border-2 border-white/20" style={{ background: accent }} />
                    {active && <Check className="w-3.5 h-3.5 ml-auto" style={{ color: theme.primaryText }} />}
                  </div>
                  <div className="text-xs font-bold" style={{ color: theme.text }}>{p.label}</div>
                </button>
              );
            })}
          </div>
          {design.palette === 'custom' && (
            <div className="flex items-center gap-6 pt-2 flex-wrap">
              {([
                { key: 'customPrimary', label: 'Primary' },
                { key: 'customAccent', label: 'Accent' },
              ] as const).map((c) => (
                <label key={c.key} className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-zinc-400 font-mono">{c.label}</span>
                  <input
                    type="color"
                    value={design[c.key]}
                    onChange={(e) => setDesign({ [c.key]: e.target.value.toUpperCase() } as Partial<DesignConfig>)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border border-premium-borderDark"
                  />
                  <span className="text-xs font-mono text-zinc-300">{design[c.key].toUpperCase()}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === 'style' && (
        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Card Style</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CARD_STYLES.map((s) => {
                const preview = resolveTheme({ ...design, cardStyle: s.id });
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDesign({ cardStyle: s.id })}
                    className={`p-4 rounded-2xl border transition-all scale-on-click ${design.cardStyle === s.id ? 'border-premium-gold shadow-gold' : 'border-premium-borderDark hover:border-zinc-600'}`}
                    style={{ background: theme.bg }}
                  >
                    <div className="h-10 mb-3" style={{ ...preview.cardStyle, borderRadius: 12 }} />
                    <div className="text-xs font-bold" style={{ color: theme.text }}>{s.label}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: theme.subtle }}>{s.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Corner Radius</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setDesign({ radius: r.id })}
                  className={`p-4 border transition-all scale-on-click ${design.radius === r.id ? 'border-premium-gold bg-premium-surfaceDark shadow-gold' : 'border-premium-borderDark bg-premium-black/60 hover:border-zinc-600'}`}
                  style={{ borderRadius: Math.min(r.px, 28) }}
                >
                  <div className="text-xs font-bold text-white">{r.label}</div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live preview — mirrors the public landing page tokens */}
      <div className="p-6 rounded-[2rem] border border-premium-borderDark" style={{ background: theme.bg, color: theme.text, fontFamily: theme.bodyFamily }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: theme.subtle }}>
            Live Preview · {design.mode === 'light' ? 'Light' : 'Dark'} · {design.background}
          </p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${theme.primary}26`, color: theme.primaryText }}>
            {isWedding ? 'Wedding Celebration' : 'Corporate Summit'}
          </span>
        </div>
        <div className="text-2xl font-bold leading-tight" style={{ fontFamily: theme.headingFamily, letterSpacing: '-0.02em' }}>{config.info.name}</div>
        <p className="text-sm mt-2 leading-relaxed max-w-xl" style={{ color: theme.muted }}>{config.info.description}</p>
        <div className="grid grid-cols-2 gap-3 mt-4 max-w-md">
          {[
            { icon: Calendar, label: 'Date', val: config.info.startDate },
            { icon: MapPin, label: 'Venue', val: config.info.venue.split(',')[0] },
          ].map(({ icon: Icon, label, val }) => (
            <div key={label} className="p-4 flex flex-col gap-1.5" style={theme.cardStyle}>
              <Icon className="w-4 h-4" style={{ color: theme.primaryText }} />
              <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: theme.subtle }}>{label}</div>
              <div className="text-xs font-semibold truncate">{val}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-5 flex-wrap">
          <span className="px-5 py-2.5 text-sm font-bold" style={{ background: theme.primary, color: theme.onPrimary, borderRadius: theme.buttonRadius }}>
            {config.landing.ctaLabel}
          </span>
          <span className="text-xs font-mono" style={{ color: theme.accentText }}>{config.info.slug}.all41.app</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <a
            href={`/events/${config.info.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-300 text-xs font-bold scale-on-click hover:border-premium-gold/50"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open landing page
          </a>
          <button
            type="button"
            onClick={() => { if (confirm('Reset the design to the default dark gold look?')) resetEventSection(eventId, 'design'); }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-zinc-500 hover:text-white text-xs font-bold scale-on-click"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && (
            <span className="text-[11px] font-mono text-premium-success flex items-center gap-1">
              <Check className="w-3 h-3" /> Auto-saved {new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setApplied(true);
              setTimeout(() => setApplied(false), 1800);
            }}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm scale-on-click transition-all ${applied ? 'bg-premium-success text-black' : 'bg-premium-gold hover:bg-premium-goldHover text-black shadow-gold'}`}
          >
            {applied ? '✓ Applied' : 'Apply Design'}
          </button>
        </div>
      </div>
    </div>
  );
}
