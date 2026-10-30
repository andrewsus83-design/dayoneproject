import type { CSSProperties } from 'react';
import type { DesignConfig, ThemeMode, CardStyleId, RadiusId } from './eventStore';

export interface Swatch {
  id: string;
  label: string;
  hex: string;
}

export const DARK_BACKGROUNDS: Swatch[] = [
  { id: 'midnight', label: 'Midnight', hex: '#09090B' },
  { id: 'charcoal', label: 'Charcoal', hex: '#18181B' },
  { id: 'navy', label: 'Deep Navy', hex: '#0B1222' },
  { id: 'forest', label: 'Forest', hex: '#08140F' },
  { id: 'merlot', label: 'Merlot', hex: '#1A0A10' },
  { id: 'espresso', label: 'Espresso', hex: '#17110C' },
];

export const LIGHT_BACKGROUNDS: Swatch[] = [
  { id: 'ivory', label: 'Ivory', hex: '#FBF8F1' },
  { id: 'pearl', label: 'Pearl White', hex: '#FFFFFF' },
  { id: 'champagne', label: 'Champagne', hex: '#F4EBDD' },
  { id: 'blush', label: 'Blush', hex: '#FBEFF0' },
  { id: 'sage', label: 'Sage Mist', hex: '#EEF2EB' },
  { id: 'cloud', label: 'Cloud', hex: '#F1F3F6' },
];

export const PALETTES = [
  { id: 'gold', label: 'Midnight Gold', primary: '#C5A059', accent: '#00F0FF' },
  { id: 'rose', label: 'Rose Luxe', primary: '#E91E8C', accent: '#FFD700' },
  { id: 'sapphire', label: 'Royal Sapphire', primary: '#4A90D9', accent: '#00F0FF' },
  { id: 'emerald', label: 'Emerald Estate', primary: '#00C853', accent: '#FFD700' },
  { id: 'platinum', label: 'Platinum', primary: '#B0B8C4', accent: '#C5A059' },
  { id: 'custom', label: 'Custom', primary: '', accent: '' },
] as const;

export const HEADING_FONTS = [
  { id: 'outfit', label: 'Outfit', family: "var(--font-outfit), 'Outfit', sans-serif", google: null },
  { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif", google: 'Playfair+Display:wght@500;600;700' },
  { id: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif", google: 'Montserrat:wght@500;600;700;800' },
  { id: 'cinzel', label: 'Cinzel', family: "'Cinzel', serif", google: 'Cinzel:wght@500;600;700' },
] as const;

export const BODY_FONTS = [
  { id: 'manrope', label: 'Manrope', family: "var(--font-manrope), 'Manrope', sans-serif", google: null },
  { id: 'inter', label: 'Inter', family: "'Inter', sans-serif", google: 'Inter:wght@400;500;600;700' },
  { id: 'opensans', label: 'Open Sans', family: "'Open Sans', sans-serif", google: 'Open+Sans:wght@400;600;700' },
  { id: 'lora', label: 'Lora', family: "'Lora', serif", google: 'Lora:wght@400;500;600' },
] as const;

export const CARD_STYLES: { id: CardStyleId; label: string; desc: string }[] = [
  { id: 'minimal', label: 'Minimal', desc: 'Clean, flat — no shadow' },
  { id: 'bordered', label: 'Bordered', desc: 'Accent hairline border' },
  { id: 'elevated', label: 'Elevated', desc: 'Deep shadow lift' },
  { id: 'glass', label: 'Glass', desc: 'Frosted glass panel' },
];

export const RADIUS_OPTIONS: { id: RadiusId; label: string; px: number; desc: string }[] = [
  { id: 'sharp', label: 'Sharp', px: 8, desc: '8px' },
  { id: 'medium', label: 'Medium', px: 16, desc: '16px (default)' },
  { id: 'round', label: 'Round', px: 32, desc: '32px' },
  { id: 'pill', label: 'Pill', px: 48, desc: '48px' },
];

export const INVITATION_THEMES = [
  { name: 'Golden Field', c1: '#C5A059', c2: '#09090B', c3: '#F5F0E8' },
  { name: 'Sage Garden', c1: '#10B981', c2: '#0A100D', c3: '#D1FAE5' },
  { name: 'Mint Hero', c1: '#00F0FF', c2: '#09090B', c3: '#0E7490' },
  { name: 'Neon Launch', c1: '#00F0FF', c2: '#09090B', c3: '#FF3366' },
  { name: 'Gala Gold', c1: '#C5A059', c2: '#0F0A00', c3: '#BE123C' },
  { name: 'Parol Party', c1: '#FF3366', c2: '#1A0A00', c3: '#F59E0B' },
  { name: 'Summit', c1: '#4A90D9', c2: '#0A0A1A', c3: '#8B5CF6' },
  { name: 'Bali Blush', c1: '#E58BB4', c2: '#1A0010', c3: '#FB923C' },
  { name: 'Ivory Gold', c1: '#B08A45', c2: '#FBF8F1', c3: '#7A5C2E' },
  { name: 'Blush Light', c1: '#D9467A', c2: '#FBEFF0', c3: '#A16207' },
];

/* ───────────────────────── Color math ───────────────────────── */

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [9, 9, 11];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex([ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t]);
}

export function alpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function modeForBackground(hex: string): ThemeMode {
  return luminance(hex) > 0.4 ? 'light' : 'dark';
}

function readableOn(bg: string): string {
  const l = luminance(bg);
  const vsBlack = (l + 0.05) / 0.05;
  const vsWhite = 1.05 / (l + 0.05);
  return vsBlack >= vsWhite ? '#09090B' : '#FFFFFF';
}

/* ───────────────────────── Resolution ───────────────────────── */

export interface ResolvedTheme {
  mode: ThemeMode;
  bg: string;
  card: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  subtle: string;
  primary: string;
  primaryText: string;
  onPrimary: string;
  accent: string;
  accentText: string;
  headingFamily: string;
  bodyFamily: string;
  radius: number;
  buttonRadius: number;
  cardStyle: CSSProperties;
  vars: CSSProperties;
  fontsHref: string | null;
}

export function paletteColors(design: Pick<DesignConfig, 'palette' | 'customPrimary' | 'customAccent'>) {
  const p = PALETTES.find((x) => x.id === design.palette);
  if (!p || p.id === 'custom') return { primary: design.customPrimary || '#C5A059', accent: design.customAccent || '#00F0FF' };
  return { primary: p.primary, accent: p.accent };
}

export function googleFontsHref(headingId: string, bodyId: string): string | null {
  const families = [
    HEADING_FONTS.find((f) => f.id === headingId)?.google,
    BODY_FONTS.find((f) => f.id === bodyId)?.google,
  ].filter((f): f is NonNullable<typeof f> => !!f);
  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${[...new Set(families)].map((f) => `family=${f}`).join('&')}&display=swap`;
}

export function resolveTheme(design: DesignConfig): ResolvedTheme {
  const bg = design.background || (design.mode === 'light' ? '#FBF8F1' : '#09090B');
  const mode = design.mode;
  const dark = mode === 'dark';
  const { primary, accent } = paletteColors(design);

  const card = dark
    ? mix(bg, '#FFFFFF', 0.06)
    : luminance(bg) > 0.95
      ? mix(bg, '#000000', 0.025)
      : mix(bg, '#FFFFFF', 0.75);
  const surface = dark ? mix(bg, '#FFFFFF', 0.035) : mix(bg, '#000000', 0.04);
  const border = dark ? mix(bg, '#FFFFFF', 0.14) : mix(bg, '#000000', 0.12);
  const text = dark ? '#FAFAFA' : '#18181B';
  const muted = dark ? '#A1A1AA' : '#52525B';
  const subtle = dark ? '#71717A' : '#71717A';

  const primaryText = dark
    ? luminance(primary) < 0.12 ? mix(primary, '#FFFFFF', 0.45) : primary
    : luminance(primary) > 0.3 ? mix(primary, '#000000', 0.35) : primary;
  const accentText = dark
    ? luminance(accent) < 0.12 ? mix(accent, '#FFFFFF', 0.45) : accent
    : luminance(accent) > 0.3 ? mix(accent, '#000000', 0.5) : accent;

  const radiusPx = RADIUS_OPTIONS.find((r) => r.id === design.radius)?.px ?? 16;
  const buttonRadius = design.radius === 'pill' ? 999 : design.radius === 'sharp' ? 8 : 14;

  const base: CSSProperties = { background: card, borderRadius: radiusPx };
  const cardStyle: CSSProperties =
    design.cardStyle === 'minimal'
      ? { ...base, border: '1px solid transparent' }
      : design.cardStyle === 'bordered'
        ? { ...base, border: `1px solid ${alpha(primary, 0.4)}` }
        : design.cardStyle === 'glass'
          ? {
              ...base,
              background: alpha(card, 0.62),
              border: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)'}`,
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            }
          : {
              ...base,
              border: `1px solid ${border}`,
              boxShadow: dark ? '0 24px 60px -24px rgba(0,0,0,0.7)' : '0 18px 40px -20px rgba(24,24,27,0.22)',
            };

  const headingFamily = HEADING_FONTS.find((f) => f.id === design.headingFont)?.family ?? HEADING_FONTS[0].family;
  const bodyFamily = BODY_FONTS.find((f) => f.id === design.bodyFont)?.family ?? BODY_FONTS[0].family;

  const vars = {
    '--ev-bg': bg,
    '--ev-card': card,
    '--ev-surface': surface,
    '--ev-border': border,
    '--ev-text': text,
    '--ev-muted': muted,
    '--ev-subtle': subtle,
    '--ev-primary': primary,
    '--ev-primary-text': primaryText,
    '--ev-on-primary': readableOn(primary),
    '--ev-accent': accent,
    '--ev-accent-text': accentText,
  } as CSSProperties;

  return {
    mode,
    bg,
    card,
    surface,
    border,
    text,
    muted,
    subtle,
    primary,
    primaryText,
    onPrimary: readableOn(primary),
    accent,
    accentText,
    headingFamily,
    bodyFamily,
    radius: radiusPx,
    buttonRadius,
    cardStyle,
    vars,
    fontsHref: googleFontsHref(design.headingFont, design.bodyFont),
  };
}

export function resolveInvitationTheme(design: DesignConfig, themeName: string): ResolvedTheme {
  const preset = INVITATION_THEMES.find((t) => t.name === themeName);
  if (!preset) return resolveTheme(design);
  return resolveTheme({
    ...design,
    background: preset.c2,
    mode: modeForBackground(preset.c2),
    palette: 'custom',
    customPrimary: preset.c1,
    customAccent: preset.c3,
  });
}
