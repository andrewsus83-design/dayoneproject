'use client';
import { useState } from 'react';
import { Type, Palette, Layers, Check } from 'lucide-react';

type DesignSubTab = 'fonts' | 'colors' | 'style';

const HEADING_FONTS = [
  { id: 'outfit', label: 'Outfit', class: 'font-display', preview: 'Aa' },
  { id: 'playfair', label: 'Playfair Display', class: '', style: { fontFamily: "'Playfair Display', serif" }, preview: 'Aa' },
  { id: 'montserrat', label: 'Montserrat', class: '', style: { fontFamily: 'Montserrat, sans-serif' }, preview: 'Aa' },
  { id: 'cinzel', label: 'Cinzel', class: '', style: { fontFamily: 'Cinzel, serif' }, preview: 'Aa' },
];

const BODY_FONTS = [
  { id: 'manrope', label: 'Manrope', class: 'font-sans', preview: 'The quick brown fox' },
  { id: 'inter', label: 'Inter', class: '', style: { fontFamily: 'Inter, sans-serif' }, preview: 'The quick brown fox' },
  { id: 'opensans', label: 'Open Sans', class: '', style: { fontFamily: "'Open Sans', sans-serif" }, preview: 'The quick brown fox' },
  { id: 'lora', label: 'Lora', class: '', style: { fontFamily: 'Lora, serif' }, preview: 'The quick brown fox' },
];

const COLOR_PALETTES = [
  { id: 'gold', label: 'Midnight Gold', primary: '#C5A059', bg: '#09090B', accent: '#00F0FF' },
  { id: 'rose', label: 'Rose Luxe', primary: '#E91E8C', bg: '#0D0208', accent: '#FFD700' },
  { id: 'sapphire', label: 'Royal Sapphire', primary: '#4A90D9', bg: '#030B14', accent: '#00F0FF' },
  { id: 'emerald', label: 'Emerald Estate', primary: '#00C853', bg: '#030F07', accent: '#FFD700' },
  { id: 'platinum', label: 'Platinum', primary: '#B0B8C4', bg: '#09090B', accent: '#C5A059' },
  { id: 'custom', label: 'Custom', primary: '#8B5CF6', bg: '#09090B', accent: '#F59E0B' },
];

const CARD_STYLES = [
  { id: 'minimal', label: 'Minimal', desc: 'Clean, flat — no shadow', border: 'border', shadow: '' },
  { id: 'bordered', label: 'Bordered', desc: 'Gold hairline border', border: 'border border-premium-gold/30', shadow: '' },
  { id: 'elevated', label: 'Elevated', desc: 'Deep shadow lift', border: 'border border-premium-borderDark', shadow: 'shadow-2xl' },
  { id: 'glass', label: 'Glass', desc: 'Frosted glass panel', border: 'border border-white/10', shadow: 'backdrop-blur-sm shadow-xl' },
];

const RADIUS_OPTIONS = [
  { id: 'sharp', label: 'Sharp', value: 'rounded-lg', desc: '8px' },
  { id: 'medium', label: 'Medium', value: 'rounded-2xl', desc: '16px' },
  { id: 'round', label: 'Round', value: 'rounded-[2rem]', desc: '32px (default)' },
  { id: 'pill', label: 'Pill', value: 'rounded-[3rem]', desc: '48px' },
];

function SubNav({ active, onChange }: { active: DesignSubTab; onChange: (t: DesignSubTab) => void }) {
  const tabs: { id: DesignSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'fonts', label: 'Fonts', icon: Type },
    { id: 'colors', label: 'Color Palette', icon: Palette },
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

export function EventDesignStudio({ isWedding }: { isWedding: boolean }) {
  const [subTab, setSubTab] = useState<DesignSubTab>('fonts');
  const [headingFont, setHeadingFont] = useState('outfit');
  const [bodyFont, setBodyFont] = useState('manrope');
  const [palette, setPalette] = useState('gold');
  const [customPrimary, setCustomPrimary] = useState('#8B5CF6');
  const [cardStyle, setCardStyle] = useState('elevated');
  const [radius, setRadius] = useState('round');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const activePalette = COLOR_PALETTES.find((p) => p.id === palette)!;

  return (
    <div className="space-y-5">
      <SubNav active={subTab} onChange={setSubTab} />

      {/* ── Fonts ── */}
      {subTab === 'fonts' && (
        <div className="space-y-6">
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Heading / Display Font</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {HEADING_FONTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setHeadingFont(f.id)}
                    className={`p-4 rounded-2xl border text-center transition-all scale-on-click ${
                      headingFont === f.id
                        ? 'border-premium-gold bg-premium-surfaceDark shadow-gold'
                        : 'border-premium-borderDark bg-premium-black/60 hover:border-zinc-600'
                    }`}
                  >
                    <div
                      className={`text-3xl font-bold text-white mb-1 ${f.class}`}
                      style={f.style}
                    >
                      {f.preview}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">{f.label}</div>
                    {headingFont === f.id && (
                      <div className="mt-1 flex justify-center">
                        <span className="w-4 h-4 rounded-full bg-premium-gold flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-black" />
                        </span>
                      </div>
                    )}
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
                    onClick={() => setBodyFont(f.id)}
                    className={`p-4 rounded-2xl border text-left transition-all scale-on-click ${
                      bodyFont === f.id
                        ? 'border-premium-gold bg-premium-surfaceDark shadow-gold'
                        : 'border-premium-borderDark bg-premium-black/60 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white">{f.label}</span>
                      {bodyFont === f.id && <Check className="w-3.5 h-3.5 text-premium-gold" />}
                    </div>
                    <div
                      className={`text-xs text-zinc-400 ${f.class}`}
                      style={f.style}
                    >
                      {f.preview}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="p-6 rounded-[2rem] bg-premium-surfaceDark border border-premium-borderDark">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-4">Preview</p>
            <div
              className={`text-2xl font-bold text-white mb-2 ${HEADING_FONTS.find((f) => f.id === headingFont)?.class}`}
              style={HEADING_FONTS.find((f) => f.id === headingFont)?.style}
            >
              {isWedding ? 'The Wedding of Andreas & Clara' : 'TechUnite APAC Summit 2026'}
            </div>
            <div
              className={`text-sm text-zinc-300 leading-relaxed ${BODY_FONTS.find((f) => f.id === bodyFont)?.class}`}
              style={BODY_FONTS.find((f) => f.id === bodyFont)?.style}
            >
              {isWedding
                ? 'You are warmly invited to celebrate the wedding of Andreas and Clara. Join us for a beautiful ceremony and reception filled with love and joy.'
                : 'Join 500+ technology leaders and innovators at Asia\'s premier executive summit. Two days of keynotes, workshops, and high-value networking.'}
            </div>
          </div>
        </div>
      )}

      {/* ── Color Palette ── */}
      {subTab === 'colors' && (
        <div className="space-y-6">
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Choose Palette</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {COLOR_PALETTES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPalette(p.id)}
                  className={`p-4 rounded-2xl border text-left transition-all scale-on-click ${
                    palette === p.id
                      ? 'border-premium-gold shadow-gold'
                      : 'border-premium-borderDark hover:border-zinc-600'
                  }`}
                  style={{ background: p.bg }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full border-2 border-white/20" style={{ background: p.primary }} />
                    <span className="w-5 h-5 rounded-full border-2 border-white/20" style={{ background: p.accent }} />
                    {palette === p.id && <Check className="w-3.5 h-3.5 text-premium-gold ml-auto" />}
                  </div>
                  <div className="text-xs font-bold text-white">{p.label}</div>
                </button>
              ))}
            </div>

            {palette === 'custom' && (
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-zinc-400 font-mono">Primary</label>
                  <input
                    type="color"
                    value={customPrimary}
                    onChange={(e) => setCustomPrimary(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border border-premium-borderDark"
                  />
                  <span className="text-xs font-mono text-zinc-300">{customPrimary.toUpperCase()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Color preview strip */}
          <div
            className="p-6 rounded-[2rem] border space-y-3"
            style={{ background: activePalette.bg, borderColor: activePalette.primary + '40' }}
          >
            <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: activePalette.accent }}>
              Live Preview — {activePalette.label}
            </p>
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-black scale-on-click"
              style={{ background: activePalette.primary }}
            >
              Register VIP Pass
            </button>
            <div className="text-lg font-display font-bold text-white mt-3">
              {isWedding ? 'The Wedding of Andreas & Clara' : 'TechUnite APAC Summit 2026'}
            </div>
            <div
              className="text-xs font-mono"
              style={{ color: activePalette.accent }}
            >
              {isWedding ? 'Saturday · 29 November 2026 · Grand Ballroom' : 'Oct 30–31, 2026 · Marina Bay Sands · Singapore'}
            </div>
          </div>
        </div>
      )}

      {/* ── Style ── */}
      {subTab === 'style' && (
        <div className="space-y-6">
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Card Style</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CARD_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCardStyle(s.id)}
                    className={`p-4 rounded-2xl border transition-all scale-on-click ${
                      cardStyle === s.id
                        ? 'border-premium-gold bg-premium-surfaceDark shadow-gold'
                        : 'border-premium-borderDark bg-premium-black/60 hover:border-zinc-600'
                    }`}
                  >
                    <div className={`h-10 rounded-xl mb-3 bg-premium-charcoal ${s.border} ${s.shadow}`} />
                    <div className="text-xs font-bold text-white">{s.label}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{s.desc}</div>
                    {cardStyle === s.id && <Check className="w-3.5 h-3.5 text-premium-gold mt-1" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Corner Radius</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRadius(r.id)}
                    className={`p-4 border transition-all scale-on-click ${r.value} ${
                      radius === r.id
                        ? 'border-premium-gold bg-premium-surfaceDark shadow-gold'
                        : 'border-premium-borderDark bg-premium-black/60 hover:border-zinc-600'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{r.label}</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{r.desc}</div>
                    {radius === r.id && <Check className="w-3.5 h-3.5 text-premium-gold mt-1" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm scale-on-click transition-all ${
            saved
              ? 'bg-premium-success text-black shadow-[0_0_16px_rgba(0,230,118,0.4)]'
              : 'bg-premium-gold text-black shadow-gold'
          }`}
        >
          {saved ? 'Saved!' : 'Apply Design'}
        </button>
      </div>
    </div>
  );
}
