'use client';

import React from 'react';
import { POPVERSE_STAGE_FRAME, useAssetUrl, type FramePreset, type StageFrame } from '@/lib/eventStore';
import { PRISM_COLORS } from '@/lib/eventTheme';

export const FRAME_PRESETS: { id: FramePreset; label: string; desc: string }[] = [
  { id: 'none', label: 'None', desc: 'Clean screen' },
  { id: 'gold', label: 'Gold Luxe', desc: 'Double gold border with ornaments' },
  { id: 'neon', label: 'Neon Glow', desc: 'Electric glowing edges' },
  { id: 'prism', label: 'Stained Glass', desc: 'Colourful glass side columns' },
  { id: 'confetti', label: 'Confetti Party', desc: 'Festive confetti border' },
  { id: 'image', label: 'Custom Image', desc: 'Your own frame artwork' },
];

export const FRAME_LIBRARY = [{ label: 'POPVERSE Cathedral', url: POPVERSE_STAGE_FRAME }];

const CONFETTI_COLORS = ['#C5A059', '#00F0FF', '#FF3366', '#00E676', '#FFD700', '#CC88FF'];
// Deterministic positions so server and client render the same pattern.
const CONFETTI = Array.from({ length: 64 }, (_, i) => {
  const side = i % 4;
  const t = ((i * 37) % 100) / 100;
  const depth = ((i * 53) % 7) + 1;
  const pos =
    side === 0 ? { left: `${t * 100}%`, top: `${depth}%` }
    : side === 1 ? { left: `${t * 100}%`, bottom: `${depth + 4}%` }
    : side === 2 ? { top: `${t * 100}%`, left: `${depth * 0.6}%` }
    : { top: `${t * 100}%`, right: `${depth * 0.6}%` };
  return { ...pos, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length], rotate: (i * 47) % 360, round: i % 3 === 0, size: 6 + (i % 4) * 3 };
});

function FooterLogo({ refId }: { refId?: string }) {
  const url = useAssetUrl(refId);
  if (!url) {
    return <span className="w-7 h-7 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-xs shadow-gold shrink-0">D1</span>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="h-7 w-auto object-contain shrink-0" />;
}

export function StageFrameShell({
  frame, logoRef, children, className = '', compact = false,
}: {
  frame: StageFrame;
  logoRef?: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const image = useAssetUrl(frame.imageUrl);
  const footerImage = useAssetUrl(frame.footerImageUrl);
  const inset = compact ? 6 : 12;

  return (
    <div className={`relative flex flex-col overflow-hidden ${className}`}>
      {frame.preset === 'gold' && (
        <div className="absolute inset-0 z-30 pointer-events-none">
          <div className="absolute border-2 border-premium-gold/80 rounded-[28px] shadow-[0_0_40px_rgba(197,160,89,0.25)]" style={{ inset }} />
          <div className="absolute border border-premium-gold/35 rounded-[22px]" style={{ inset: inset + (compact ? 4 : 8) }} />
          {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((c) => (
            <span
              key={c}
              className="absolute text-premium-gold"
              style={{
                fontSize: compact ? 12 : 22,
                [c.includes('top') ? 'top' : 'bottom']: inset - (compact ? 6 : 11),
                [c.includes('left') ? 'left' : 'right']: inset - (compact ? 4 : 8),
                textShadow: '0 0 12px rgba(197,160,89,0.8)',
              }}
            >
              ✦
            </span>
          ))}
        </div>
      )}
      {frame.preset === 'neon' && (
        <div className="absolute inset-0 z-30 pointer-events-none">
          <div className="absolute rounded-[28px]" style={{ inset, border: '2px solid #00F0FF', boxShadow: '0 0 24px rgba(0,240,255,0.7), inset 0 0 24px rgba(0,240,255,0.35)' }} />
          <div className="absolute rounded-[22px]" style={{ inset: inset + (compact ? 4 : 8), border: '1px solid rgba(255,51,102,0.7)', boxShadow: '0 0 16px rgba(255,51,102,0.5)' }} />
        </div>
      )}
      {frame.preset === 'prism' && (
        <div className="absolute inset-0 z-30 pointer-events-none">
          {(['left', 'right'] as const).map((side) => (
            <div
              key={side}
              className="absolute top-0 bottom-0"
              style={{
                [side]: 0,
                width: compact ? '7%' : 'clamp(48px, 7vw, 120px)',
                opacity: 0.75,
                background: `repeating-linear-gradient(to bottom, ${(side === 'left' ? PRISM_COLORS : [...PRISM_COLORS].reverse())
                  .map((c, i, arr) => `${c} ${((i * 100) / arr.length).toFixed(1)}%, ${c} ${(((i + 1) * 100) / arr.length).toFixed(1)}%`)
                  .join(', ')})`,
                maskImage: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, black 30%, transparent)`,
                WebkitMaskImage: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, black 30%, transparent)`,
              }}
            />
          ))}
          <div className="absolute top-0 inset-x-0 h-1.5" style={{ background: `linear-gradient(90deg, ${PRISM_COLORS.join(', ')})` }} />
        </div>
      )}
      {frame.preset === 'confetti' && (
        <div className="absolute inset-0 z-30 pointer-events-none">
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              className="absolute"
              style={{
                left: c.left, right: c.right, top: c.top, bottom: c.bottom,
                width: compact ? c.size / 2 : c.size,
                height: compact ? (c.round ? c.size / 2 : c.size / 4) : c.round ? c.size : c.size / 2,
                background: c.color,
                borderRadius: c.round ? 999 : 2,
                transform: `rotate(${c.rotate}deg)`,
                opacity: 0.9,
              }}
            />
          ))}
        </div>
      )}
      {frame.preset === 'image' && image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="absolute inset-0 w-full h-full object-fill pointer-events-none z-30"
          style={{ mixBlendMode: frame.imageBlend === 'screen' ? 'screen' : 'normal' }}
        />
      )}

      <div className="relative z-10 flex-1 flex flex-col min-h-0">{children}</div>

      {frame.footerOn && frame.footerStyle === 'image' && (
        <footer className="relative z-40 bg-premium-black flex items-center justify-center">
          {footerImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={footerImage} alt={frame.footerText || 'Footer'} className="w-full h-auto object-contain" style={{ maxHeight: compact ? 28 : '18vh' }} />
          ) : (
            <span className={`font-mono text-zinc-600 ${compact ? 'py-1.5 text-[9px]' : 'py-3 text-xs'}`}>Upload a footer image</span>
          )}
        </footer>
      )}
      {frame.footerOn && frame.footerStyle !== 'image' && (
        <footer
          className={`relative z-40 flex items-center justify-between gap-3 ${compact ? 'px-3 py-1.5 text-[9px]' : 'px-8 py-3 text-xs'} ${
            frame.footerStyle === 'gold'
              ? 'bg-premium-gold text-black'
              : frame.footerStyle === 'glass'
                ? 'bg-white/10 backdrop-blur-xl text-white border-t border-white/15'
                : 'bg-premium-black/85 text-zinc-300 border-t border-premium-gold/30'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {frame.footerLogo && <FooterLogo refId={logoRef} />}
            <span className="font-display font-bold truncate">{frame.footerText}</span>
          </div>
          <span className={`font-mono shrink-0 ${frame.footerStyle === 'gold' ? 'text-black/60' : 'text-zinc-500'}`}>Powered by dayoneproject.xyz</span>
        </footer>
      )}
    </div>
  );
}
