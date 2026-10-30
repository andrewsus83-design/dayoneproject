'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Type, Palette, Layers, Check, Moon, Sun, Paintbrush, ExternalLink, RotateCcw, Calendar, MapPin, Image as ImageIcon,
  MoveVertical, Upload, Trash2,
} from 'lucide-react';
import { deleteAsset, resetEventSection, saveAsset, useAssetUrl, useEventConfig, type DesignConfig, type ThemeMode } from '@/lib/eventStore';
import {
  ACCENT_FONTS, BODY_FONTS, CARD_STYLES, DARK_BACKGROUNDS, HEADING_FONTS, LIGHT_BACKGROUNDS, PALETTES, RADIUS_OPTIONS,
  PAGE_WIDTH_OPTIONS, SPACING_OPTIONS, gradientText, modeForBackground, paletteColors, resolveTheme,
} from '@/lib/eventTheme';
import { compressImage } from '@/lib/image';
import { EventFonts } from '@/components/events/EventFonts';

type DesignSubTab = 'mode' | 'colors' | 'fonts' | 'spacing' | 'style' | 'logo';

function SubNav({ active, onChange }: { active: DesignSubTab; onChange: (t: DesignSubTab) => void }) {
  const tabs: { id: DesignSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'mode', label: 'Light / Dark & Background', icon: Paintbrush },
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'fonts', label: 'Fonts', icon: Type },
    { id: 'spacing', label: 'Spacing', icon: MoveVertical },
    { id: 'style', label: 'Cards & Corners', icon: Layers },
    { id: 'logo', label: 'Logo', icon: ImageIcon },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold scale-on-click transition-all ${
            active === t.id ? 'bg-premium-gold/15 text-premium-gold border border-premium-gold/40' : 'bg-premium-surfaceDark text-zinc-400 border border-premium-borderDark hover:text-white'
          }`}
        >
          <t.icon className="w-3.5 h-3.5" />
          {t.label}
        </button>
      ))}
    </div>
  );
}

function FontCard({ selected, onClick, family, label, sample, big }: { selected: boolean; onClick: () => void; family: string; label: string; sample: string; big?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 rounded-2xl border text-left transition-all scale-on-click ${selected ? 'border-premium-gold bg-premium-surfaceDark shadow-gold' : 'border-premium-borderDark bg-premium-black/60 hover:border-zinc-600'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-zinc-400 font-mono">{label}</span>
        {selected && <Check className="w-3.5 h-3.5 text-premium-gold" />}
      </div>
      <div className={`text-white ${big ? 'text-2xl font-bold' : 'text-sm'} truncate`} style={{ fontFamily: family || undefined }}>
        {sample}
      </div>
    </button>
  );
}

export function EventDesignStudio({ eventId }: { eventId: string }) {
  const { config, event, update, savedAt } = useEventConfig(eventId);
  const design = config.design;
  const isWedding = event.event_type === 'wedding';
  const theme = useMemo(() => resolveTheme(design), [design]);
  const logoUrl = useAssetUrl(design.logoUrl);
  const [subTab, setSubTab] = useState<DesignSubTab>('mode');
  const [applied, setApplied] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const setDesign = (patch: Partial<DesignConfig>) => {
    const r = update('design', patch);
    setError(r.ok ? null : r.error ?? 'Could not save.');
  };
  const backgrounds = design.mode === 'light' ? LIGHT_BACKGROUNDS : DARK_BACKGROUNDS;
  const current = paletteColors(design);
  const [hexDraft, setHexDraft] = useState<Partial<Record<'customPrimary' | 'customSecondary' | 'customAccent', string>>>({});

  // Editing any color switches to Custom, starting from the palette shown now.
  const pickColor = (key: 'customPrimary' | 'customSecondary' | 'customAccent', hex: string) =>
    setDesign({
      palette: 'custom',
      customPrimary: current.primary,
      customSecondary: current.secondary,
      customAccent: current.accent,
      [key]: hex.toUpperCase(),
    });
  const typeHex = (key: 'customPrimary' | 'customSecondary' | 'customAccent', raw: string) => {
    const v = raw.startsWith('#') ? raw : `#${raw}`;
    setHexDraft((d) => ({ ...d, [key]: v.toUpperCase() }));
    if (/^#[0-9a-f]{6}$/i.test(v)) pickColor(key, v);
  };
  const isPresetBg = [...DARK_BACKGROUNDS, ...LIGHT_BACKGROUNDS].some((b) => b.hex.toLowerCase() === design.background.toLowerCase());

  const chooseMode = (mode: ThemeMode) => {
    if (mode === design.mode) return;
    const list = mode === 'light' ? LIGHT_BACKGROUNDS : DARK_BACKGROUNDS;
    const keep = list.some((b) => b.hex.toLowerCase() === design.background.toLowerCase());
    setDesign({ mode, background: keep ? design.background : list[0].hex });
  };

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoBusy(true);
    try {
      // PNG keeps transparency for logos.
      const isPng = file.type === 'image/png' || file.type === 'image/svg+xml';
      const dataUrl = isPng && file.size < 400_000
        ? await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = () => rej(new Error('Could not read the logo.')); fr.readAsDataURL(file); })
        : await compressImage(file, 800, 0.9);
      const saved = saveAsset(dataUrl);
      if (!saved.ok || !saved.ref) return setError(saved.error ?? 'Could not save the logo.');
      if (design.logoUrl) deleteAsset(design.logoUrl);
      setDesign({ logoUrl: saved.ref });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setLogoBusy(false);
      if (logoRef.current) logoRef.current.value = '';
    }
  };

  const allFontsHref = useMemo(() => {
    const fam = [...HEADING_FONTS, ...BODY_FONTS, ...ACCENT_FONTS].map((f) => f.google).filter(Boolean);
    return `https://fonts.googleapis.com/css2?${[...new Set(fam)].map((f) => `family=${f}`).join('&')}&display=swap`;
  }, []);

  return (
    <div className="space-y-5">
      <EventFonts href={theme.fontsHref} />
      {subTab === 'fonts' && <EventFonts href={allFontsHref} />}
      <SubNav active={subTab} onChange={setSubTab} />

      {error && <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-xs font-bold">{error}</div>}

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
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Background color · {design.mode} choices</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {backgrounds.map((b) => {
                const active = design.background.toLowerCase() === b.hex.toLowerCase();
                return (
                  <button key={b.id} type="button" onClick={() => setDesign({ background: b.hex })} className={`p-2 rounded-2xl border text-left transition-all scale-on-click ${active ? 'border-premium-gold shadow-gold' : 'border-premium-borderDark hover:border-zinc-600'}`}>
                    <div className="h-12 rounded-xl border border-white/10 relative" style={{ background: b.hex }}>
                      {active && <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-premium-gold flex items-center justify-center"><Check className="w-2.5 h-2.5 text-black" /></span>}
                    </div>
                    <div className="text-[11px] font-bold text-white mt-1.5 px-0.5">{b.label}</div>
                    <div className="text-[9px] font-mono text-zinc-500 px-0.5">{b.hex}</div>
                  </button>
                );
              })}
              <label className={`p-2 rounded-2xl border text-left transition-all cursor-pointer scale-on-click ${!isPresetBg ? 'border-premium-gold shadow-gold' : 'border-premium-borderDark hover:border-zinc-600'}`}>
                <div className="h-12 rounded-xl border border-dashed border-white/20 relative overflow-hidden" style={{ background: !isPresetBg ? design.background : 'transparent' }}>
                  {isPresetBg && <span className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-500 font-bold">Pick…</span>}
                  <input type="color" value={design.background} onChange={(e) => setDesign({ background: e.target.value.toUpperCase(), mode: modeForBackground(e.target.value) })} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Custom background color" />
                </div>
                <div className="text-[11px] font-bold text-white mt-1.5 px-0.5">Custom</div>
                <div className="text-[9px] font-mono text-zinc-500 px-0.5">{!isPresetBg ? design.background : 'Any color'}</div>
              </label>
            </div>
          </div>
        </div>
      )}

      {subTab === 'colors' && (
        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">1st color · 2nd color · Accent</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PALETTES.map((p) => {
              const c = p.id === 'custom'
                ? [design.customPrimary, design.customSecondary, design.customAccent]
                : [p.primary, p.secondary, p.accent];
              const active = design.palette === p.id;
              return (
                <button key={p.id} type="button" onClick={() => setDesign({ palette: p.id })} className={`p-4 rounded-2xl border text-left transition-all scale-on-click ${active ? 'border-premium-gold shadow-gold' : 'border-premium-borderDark hover:border-zinc-600'}`} style={{ background: theme.bg }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    {c.map((hex, i) => <span key={i} className="w-5 h-5 rounded-full border-2 border-white/20" style={{ background: hex }} />)}
                    {active && <Check className="w-3.5 h-3.5 ml-auto" style={{ color: theme.primaryText }} />}
                  </div>
                  <div className="text-xs font-bold" style={{ color: theme.text }}>{p.label}</div>
                </button>
              );
            })}
          </div>
          <div className="pt-2 space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Pick your own · tap a color or type a hex code</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { key: 'customPrimary', role: 'primary', label: '1st color', hint: 'Buttons & main highlights' },
                { key: 'customSecondary', role: 'secondary', label: '2nd color', hint: 'Sub-titles & gradients' },
                { key: 'customAccent', role: 'accent', label: 'Accent', hint: 'Badges, numbers & details' },
              ] as const).map((c) => {
                const hex = current[c.role].toUpperCase();
                return (
                  <div key={c.key} className="flex items-center gap-3 p-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark">
                    <label className="relative w-11 h-11 rounded-xl border border-white/15 cursor-pointer shrink-0 overflow-hidden scale-on-click" style={{ background: hex }} title={`Pick the ${c.label}`}>
                      <input type="color" value={hex.length === 7 ? hex : '#000000'} onChange={(e) => pickColor(c.key, e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label={`Pick the ${c.label}`} />
                    </label>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white">{c.label}</div>
                      <input
                        value={hexDraft[c.key] ?? hex}
                        onChange={(e) => typeHex(c.key, e.target.value)}
                        onBlur={() => setHexDraft((d) => ({ ...d, [c.key]: undefined }))}
                        spellCheck={false}
                        maxLength={7}
                        className="mt-1 w-24 bg-premium-black border border-premium-borderDark text-white px-2 py-1 rounded-lg font-mono text-[11px] outline-none focus:border-premium-gold uppercase"
                        aria-label={`${c.label} hex code`}
                      />
                      <div className="text-[10px] text-zinc-500 mt-1 truncate">{c.hint}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {subTab === 'fonts' && (
        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-6">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Heading font · 6 options</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {HEADING_FONTS.map((f) => (
                <FontCard key={f.id} selected={design.headingFont === f.id} onClick={() => setDesign({ headingFont: f.id })} family={f.family} label={f.label} sample="Aa Event Title" big />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Body font · 6 options</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BODY_FONTS.map((f) => (
                <FontCard key={f.id} selected={design.bodyFont === f.id} onClick={() => setDesign({ bodyFont: f.id })} family={f.family} label={f.label} sample="The quick brown fox jumps over the lazy dog" />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Accent font · 4 options</p>
            <p className="text-[11px] text-zinc-500 mb-3">Used for small labels like “You’re invited”, section labels and quotes.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ACCENT_FONTS.map((f) => (
                <FontCard key={f.id} selected={design.accentFont === f.id} onClick={() => setDesign({ accentFont: f.id })} family={f.family} label={f.label} sample={f.id === 'none' ? 'Same as heading' : 'You’re invited'} big={f.id !== 'none'} />
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'spacing' && (
        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-6">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Landing page width</p>
            <p className="text-[11px] text-zinc-500 mb-3">How wide the sections sit on a computer screen. Phones always use the full width.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PAGE_WIDTH_OPTIONS.map((w) => {
                const active = (design.pageWidth || 'standard') === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setDesign({ pageWidth: w.id })}
                    className={`p-4 rounded-2xl border text-left transition-all scale-on-click ${active ? 'border-premium-gold bg-premium-surfaceDark shadow-gold' : 'border-premium-borderDark bg-premium-black/60 hover:border-zinc-600'}`}
                  >
                    <div className="h-8 mb-3 rounded-md border border-premium-borderDark flex items-center justify-center">
                      <span className="h-4 rounded bg-zinc-600" style={{ width: w.id === 'standard' ? '55%' : w.id === 'full' ? '100%' : `${w.id}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{w.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-premium-gold" />}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{w.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Spacing · everything</p>
            <p className="text-[11px] text-zinc-500 mb-3">Sets padding, margins, cards and letter spacing in one go. Fine-tune each one below.</p>
            <div className="grid grid-cols-3 gap-3">
              {SPACING_OPTIONS.map((s) => {
                const active = design.spacing === s.id && !design.spacingPadding && !design.spacingGaps && !design.spacingCards && !design.spacingLetters;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDesign({ spacing: s.id, spacingPadding: '', spacingGaps: '', spacingCards: '', spacingLetters: '' })}
                    className={`p-4 rounded-2xl border text-left transition-all scale-on-click ${active ? 'border-premium-gold bg-premium-surfaceDark shadow-gold' : 'border-premium-borderDark bg-premium-black/60 hover:border-zinc-600'}`}
                  >
                    <div className="flex flex-col mb-3" style={{ gap: 4 * s.scale }}>
                      {[0, 1, 2].map((i) => <span key={i} className="h-2 rounded bg-zinc-600" style={{ width: `${90 - i * 20}%` }} />)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{s.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-premium-gold" />}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{s.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Fine-tune</p>
            <div className="rounded-2xl border border-premium-borderDark divide-y divide-premium-borderDark/60">
              {([
                { key: 'spacingPadding', label: 'Padding', desc: 'Space above and below each section' },
                { key: 'spacingGaps', label: 'Margins & gaps', desc: 'Space between cards, lines and buttons' },
                { key: 'spacingCards', label: 'Cards', desc: 'Space inside cards and tickets' },
                { key: 'spacingLetters', label: 'Letter spacing', desc: 'Space between letters in headings and text' },
              ] as const).map((row) => {
                const value = design[row.key] || design.spacing;
                return (
                  <div key={row.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        {row.label}
                        {!design[row.key] && <span className="text-[9px] font-mono text-zinc-500 uppercase">same as everything</span>}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{row.desc}</div>
                    </div>
                    <div className="flex items-center gap-1 bg-premium-surfaceDark p-1 rounded-xl border border-premium-borderDark">
                      {SPACING_OPTIONS.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setDesign({ [row.key]: s.id } as Partial<DesignConfig>)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold scale-on-click transition-all ${value === s.id ? 'bg-premium-gold text-black shadow-gold' : 'text-zinc-400 hover:text-white'}`}
                          style={row.key === 'spacingLetters' ? { letterSpacing: s.id === 'tight' ? '-0.03em' : s.id === 'spacious' ? '0.08em' : undefined } : undefined}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {subTab === 'style' && (
        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-6">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Card Style</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CARD_STYLES.map((s) => {
                const preview = resolveTheme({ ...design, cardStyle: s.id });
                return (
                  <button key={s.id} type="button" onClick={() => setDesign({ cardStyle: s.id })} className={`p-4 rounded-2xl border transition-all scale-on-click ${design.cardStyle === s.id ? 'border-premium-gold shadow-gold' : 'border-premium-borderDark hover:border-zinc-600'}`} style={{ background: theme.bg }}>
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
                <button key={r.id} type="button" onClick={() => setDesign({ radius: r.id })} className={`p-4 border transition-all scale-on-click ${design.radius === r.id ? 'border-premium-gold bg-premium-surfaceDark shadow-gold' : 'border-premium-borderDark bg-premium-black/60 hover:border-zinc-600'}`} style={{ borderRadius: Math.min(r.px, 28) }}>
                  <div className="text-xs font-bold text-white">{r.label}</div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === 'logo' && (
        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Event Logo</p>
            <p className="text-[11px] text-zinc-500 mt-1">Shown on the landing page header, the invitation form and the QR ticket. PNG with a transparent background works best.</p>
          </div>
          <input ref={logoRef} type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} />
          <div className="grid grid-cols-2 gap-3">
            {[{ bg: '#09090B', label: 'On dark' }, { bg: '#FBF8F1', label: 'On light' }].map((v) => (
              <div key={v.label} className="h-32 rounded-2xl border border-premium-borderDark flex flex-col items-center justify-center gap-2" style={{ background: v.bg }}>
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo preview" style={{ height: design.logoSize === 's' ? 32 : design.logoSize === 'l' ? 64 : 44 }} className="object-contain max-w-[80%]" />
                ) : (
                  <span className="text-[11px] text-zinc-500">No logo yet</span>
                )}
                <span className="text-[9px] font-mono" style={{ color: v.bg === '#09090B' ? '#71717A' : '#52525B' }}>{v.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => logoRef.current?.click()} className="px-4 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black text-xs font-bold scale-on-click flex items-center gap-1.5 shadow-gold">
              <Upload className="w-3.5 h-3.5" /> {logoBusy ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
            </button>
            {design.logoUrl && (
              <button type="button" onClick={() => { deleteAsset(design.logoUrl); setDesign({ logoUrl: '' }); }} className="px-4 py-2.5 rounded-xl border border-premium-borderDark text-zinc-400 hover:text-white text-xs font-bold scale-on-click flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Logo size</p>
            <div className="flex gap-2">
              {(['s', 'm', 'l'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setDesign({ logoSize: s })} className={`px-4 py-2 rounded-xl text-xs font-bold border scale-on-click ${design.logoSize === s ? 'bg-premium-gold text-black border-premium-gold' : 'bg-premium-surfaceDark text-zinc-400 border-premium-borderDark hover:text-white'}`}>
                  {s === 's' ? 'Small' : s === 'm' ? 'Medium' : 'Large'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live preview */}
      <div className="rounded-[2rem] border border-premium-borderDark overflow-hidden" style={{ background: theme.bg, color: theme.text, fontFamily: theme.bodyFamily, letterSpacing: theme.space.bodyTracking, padding: theme.space.section * 0.4 }}>
        <div className="flex items-center justify-between mb-4 gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" style={{ height: design.logoSize === 's' ? 28 : design.logoSize === 'l' ? 52 : 38 }} className="object-contain" />
          ) : (
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: theme.subtle }}>Live Preview · {design.mode} · {design.spacingLetters || design.spacing} letters</p>
          )}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${theme.accent}26`, color: theme.accentText }}>
            {isWedding ? 'Wedding Celebration' : 'Corporate Summit'}
          </span>
        </div>
        <p className="text-sm mb-1" style={{ fontFamily: theme.accentFamily, color: theme.secondaryText, fontSize: design.accentFont === 'none' ? 12 : 22 }}>You’re invited</p>
        <div className="text-3xl font-bold leading-tight" style={{ fontFamily: theme.headingFamily, letterSpacing: theme.space.headingTracking, ...gradientText([theme.primary, theme.secondary, theme.accent]) }}>
          {config.info.name}
        </div>
        <p className="text-sm mt-2 leading-relaxed max-w-xl" style={{ color: theme.muted }}>{config.info.description}</p>
        <div className="grid grid-cols-2 max-w-md" style={{ gap: theme.space.gap, marginTop: theme.space.stack }}>
          {[
            { icon: Calendar, label: 'Date', val: config.info.startDate },
            { icon: MapPin, label: 'Venue', val: config.info.venue.split(',')[0] },
          ].map(({ icon: Icon, label, val }) => (
            <div key={label} className="flex flex-col gap-1.5" style={{ ...theme.cardStyle, padding: theme.space.card * 0.7 }}>
              <Icon className="w-4 h-4" style={{ color: theme.primaryText }} />
              <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: theme.subtle }}>{label}</div>
              <div className="text-xs font-semibold truncate">{val}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: theme.space.stack }}>
          <span className="px-5 py-2.5 text-sm font-bold" style={{ background: theme.primary, color: theme.onPrimary, borderRadius: theme.buttonRadius }}>Register Now</span>
          <span className="px-5 py-2.5 text-sm font-bold" style={{ border: `1px solid ${theme.secondary}`, color: theme.secondaryText, borderRadius: theme.buttonRadius }}>Learn More</span>
          <span className="text-xs font-mono" style={{ color: theme.accentText }}>app.dayoneproject.xyz/events/{config.info.slug}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <a href={`/events/${config.info.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-300 text-xs font-bold scale-on-click hover:border-premium-gold/50">
            <ExternalLink className="w-3.5 h-3.5" /> Open landing page
          </a>
          <button type="button" onClick={() => { if (confirm('Reset the design to its defaults?')) resetEventSection(eventId, 'design'); }} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-zinc-500 hover:text-white text-xs font-bold scale-on-click">
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
            onClick={() => { setApplied(true); setTimeout(() => setApplied(false), 1800); }}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm scale-on-click transition-all ${applied ? 'bg-premium-success text-black' : 'bg-premium-gold hover:bg-premium-goldHover text-black shadow-gold'}`}
          >
            {applied ? '✓ Applied' : 'Apply Design'}
          </button>
        </div>
      </div>
    </div>
  );
}
