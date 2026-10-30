import type { CSSProperties } from 'react';
import type { DesignConfig, ThemeMode, CardStyleId, RadiusId, SpacingId } from './eventStore';

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
  { id: 'gold', label: 'Midnight Gold', primary: '#C5A059', secondary: '#E8D3A3', accent: '#00F0FF' },
  { id: 'rose', label: 'Rose Luxe', primary: '#E91E8C', secondary: '#F7C6D9', accent: '#FFD700' },
  { id: 'sapphire', label: 'Royal Sapphire', primary: '#4A90D9', secondary: '#A9C8F0', accent: '#00F0FF' },
  { id: 'emerald', label: 'Emerald Estate', primary: '#00C853', secondary: '#A7E8C4', accent: '#FFD700' },
  { id: 'platinum', label: 'Platinum', primary: '#B0B8C4', secondary: '#E4E4E7', accent: '#C5A059' },
  { id: 'prism', label: 'Prism Pop', primary: '#C5A059', secondary: '#CC0066', accent: '#FFD700' },
  { id: 'custom', label: 'Custom', primary: '', secondary: '', accent: '' },
] as const;

export const HEADING_FONTS = [
  { id: 'outfit', label: 'Outfit', family: "var(--font-outfit), 'Outfit', sans-serif", google: null },
  { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif", google: 'Playfair+Display:wght@500;600;700;800' },
  { id: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif", google: 'Montserrat:wght@500;600;700;800;900' },
  { id: 'cinzel', label: 'Cinzel', family: "'Cinzel', serif", google: 'Cinzel:wght@500;600;700' },
  { id: 'cormorant', label: 'Cormorant Garamond', family: "'Cormorant Garamond', serif", google: 'Cormorant+Garamond:wght@500;600;700' },
  { id: 'spacegrotesk', label: 'Space Grotesk', family: "'Space Grotesk', sans-serif", google: 'Space+Grotesk:wght@500;600;700' },
] as const;

export const BODY_FONTS = [
  { id: 'manrope', label: 'Manrope', family: "var(--font-manrope), 'Manrope', sans-serif", google: null },
  { id: 'inter', label: 'Inter', family: "'Inter', sans-serif", google: 'Inter:wght@400;500;600;700' },
  { id: 'opensans', label: 'Open Sans', family: "'Open Sans', sans-serif", google: 'Open+Sans:wght@400;600;700' },
  { id: 'lora', label: 'Lora', family: "'Lora', serif", google: 'Lora:wght@400;500;600' },
  { id: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif", google: 'Poppins:wght@400;500;600;700' },
  { id: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif", google: 'Montserrat:wght@400;500;600;700' },
] as const;

export const ACCENT_FONTS = [
  { id: 'none', label: 'Off — use heading font', family: '', google: null },
  { id: 'greatvibes', label: 'Great Vibes', family: "'Great Vibes', cursive", google: 'Great+Vibes' },
  { id: 'dancing', label: 'Dancing Script', family: "'Dancing Script', cursive", google: 'Dancing+Script:wght@500;700' },
  { id: 'caveat', label: 'Caveat', family: "'Caveat', cursive", google: 'Caveat:wght@500;700' },
  { id: 'cinzeldeco', label: 'Cinzel Decorative', family: "'Cinzel Decorative', serif", google: 'Cinzel+Decorative:wght@400;700' },
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

export const SPACING_OPTIONS: { id: SpacingId; label: string; desc: string; scale: number }[] = [
  { id: 'tight', label: 'Tight', desc: 'Compact — less padding and gaps', scale: 0.7 },
  { id: 'normal', label: 'Normal', desc: 'Balanced default spacing', scale: 1 },
  { id: 'spacious', label: 'Spacious', desc: 'Airy — more room to breathe', scale: 1.4 },
];

export const PRISM_COLORS = ['#FFD700', '#FF8C00', '#CC0066', '#7B1D5A', '#1B3FA0', '#0099DD', '#00A36C', '#CC88FF', '#FFD700'];

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

function legibleOn(color: string, dark: boolean, darkenBy: number) {
  return dark
    ? luminance(color) < 0.12 ? mix(color, '#FFFFFF', 0.45) : color
    : luminance(color) > 0.3 ? mix(color, '#000000', darkenBy) : color;
}

/* ───────────────────────── Resolution ───────────────────────── */

export interface ResolvedSpace {
  section: number;
  card: number;
  gap: number;
  stack: number;
  /** Letter spacing for headings and body text. */
  headingTracking: string;
  bodyTracking: string;
}

const TRACKING: Record<SpacingId, { heading: string; body: string }> = {
  tight: { heading: '-0.045em', body: '-0.015em' },
  normal: { heading: '-0.02em', body: '0em' },
  spacious: { heading: '0.02em', body: '0.03em' },
};

export function resolveSpace(design: Pick<DesignConfig, 'spacing' | 'spacingPadding' | 'spacingGaps' | 'spacingCards' | 'spacingLetters'>): ResolvedSpace {
  const scaleOf = (id?: SpacingId | '') => SPACING_OPTIONS.find((s) => s.id === (id || design.spacing))?.scale ?? 1;
  const letters = (design.spacingLetters || design.spacing || 'normal') as SpacingId;
  return {
    section: Math.round(80 * scaleOf(design.spacingPadding)),
    card: Math.round(24 * scaleOf(design.spacingCards)),
    gap: Math.round(16 * scaleOf(design.spacingGaps)),
    stack: Math.round(20 * scaleOf(design.spacingGaps)),
    headingTracking: TRACKING[letters]?.heading ?? TRACKING.normal.heading,
    bodyTracking: TRACKING[letters]?.body ?? TRACKING.normal.body,
  };
}

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
  secondary: string;
  secondaryText: string;
  accent: string;
  accentText: string;
  headingFamily: string;
  bodyFamily: string;
  accentFamily: string;
  radius: number;
  buttonRadius: number;
  space: ResolvedSpace;
  cardStyle: CSSProperties;
  vars: CSSProperties;
  fontsHref: string | null;
}

export function paletteColors(design: Pick<DesignConfig, 'palette' | 'customPrimary' | 'customSecondary' | 'customAccent'>) {
  const p = PALETTES.find((x) => x.id === design.palette);
  if (!p || p.id === 'custom') {
    return {
      primary: design.customPrimary || '#C5A059',
      secondary: design.customSecondary || '#E8D3A3',
      accent: design.customAccent || '#00F0FF',
    };
  }
  return { primary: p.primary as string, secondary: p.secondary as string, accent: p.accent as string };
}

export function fontsHref(ids: { heading?: string; body?: string; accent?: string }): string | null {
  const families = [
    HEADING_FONTS.find((f) => f.id === ids.heading)?.google,
    BODY_FONTS.find((f) => f.id === ids.body)?.google,
    ACCENT_FONTS.find((f) => f.id === ids.accent)?.google,
  ].filter((f): f is NonNullable<typeof f> => !!f);
  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${[...new Set(families)].map((f) => `family=${f}`).join('&')}&display=swap`;
}

export function resolveTheme(design: DesignConfig): ResolvedTheme {
  const bg = design.background || (design.mode === 'light' ? '#FBF8F1' : '#09090B');
  const mode = design.mode;
  const dark = mode === 'dark';
  const { primary, secondary, accent } = paletteColors(design);

  const card = dark
    ? mix(bg, '#FFFFFF', 0.06)
    : luminance(bg) > 0.95
      ? mix(bg, '#000000', 0.025)
      : mix(bg, '#FFFFFF', 0.75);
  const surface = dark ? mix(bg, '#FFFFFF', 0.035) : mix(bg, '#000000', 0.04);
  const border = dark ? mix(bg, '#FFFFFF', 0.14) : mix(bg, '#000000', 0.12);
  const text = dark ? '#FAFAFA' : '#18181B';
  const muted = dark ? '#A1A1AA' : '#52525B';
  const subtle = '#71717A';

  const primaryText = legibleOn(primary, dark, 0.35);
  const secondaryText = legibleOn(secondary, dark, 0.45);
  const accentText = legibleOn(accent, dark, 0.5);

  const radiusPx = RADIUS_OPTIONS.find((r) => r.id === design.radius)?.px ?? 16;
  const buttonRadius = design.radius === 'pill' ? 999 : design.radius === 'sharp' ? 8 : 14;
  const space = resolveSpace(design);

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
  const accentFamily = ACCENT_FONTS.find((f) => f.id === design.accentFont)?.family || headingFamily;

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
    '--ev-secondary': secondary,
    '--ev-accent': accent,
    '--ev-accent-text': accentText,
    '--ev-tracking-heading': space.headingTracking,
    '--ev-tracking-body': space.bodyTracking,
    letterSpacing: space.bodyTracking,
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
    secondary,
    secondaryText,
    accent,
    accentText,
    headingFamily,
    bodyFamily,
    accentFamily,
    radius: radiusPx,
    buttonRadius,
    space,
    cardStyle,
    vars,
    fontsHref: fontsHref({ heading: design.headingFont, body: design.bodyFont, accent: design.accentFont }),
  };
}

export function gradientText(colors: string[], animate = false): CSSProperties {
  return {
    backgroundImage: `linear-gradient(135deg, ${colors.join(', ')})`,
    backgroundSize: animate ? '300% 300%' : '100% 100%',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
    animation: animate ? 'ev-prism 9s ease infinite' : undefined,
  };
}
