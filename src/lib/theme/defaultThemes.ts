import { ThemeConfig } from '../types';

export const THEME_PRESETS: Record<string, ThemeConfig> = {
  neon_dark_gold: {
    preset: 'neon_dark_gold',
    primaryColor: '#00f0ff', // Electric Cyan
    secondaryColor: '#dfb76c', // Dark Gold
    accentColor: '#ff007f', // Neon Pink
    backgroundColor: '#0b0d13', // Deep Void
    textColor: '#f8fafc',
    fontFamily: 'Inter',
    bannerUrl: null,
    logoUrl: null,
  },
  elegant_wedding_gold: {
    preset: 'elegant_wedding_gold',
    primaryColor: '#c5a059', // Classic Warm Gold
    secondaryColor: '#e5d3b3', // Champagne Cream
    accentColor: '#8a6d3b', // Deep Amber
    backgroundColor: '#faf7f2', // Soft Ivory
    textColor: '#292524', // Warm Charcoal
    fontFamily: 'Playfair Display',
    bannerUrl: null,
    logoUrl: null,
  },
  corporate_midnight: {
    preset: 'corporate_midnight',
    primaryColor: '#3b82f6', // Sapphire Blue
    secondaryColor: '#6366f1', // Indigo
    accentColor: '#10b981', // Emerald
    backgroundColor: '#0f172a', // Midnight Slate
    textColor: '#f1f5f9',
    fontFamily: 'Inter',
    bannerUrl: null,
    logoUrl: null,
  },
  romantic_blush: {
    preset: 'romantic_blush',
    primaryColor: '#f43f5e', // Rose
    secondaryColor: '#fecdd3', // Blush Pink
    accentColor: '#e11d48', // Ruby
    backgroundColor: '#fff1f2', // Soft Rose Light
    textColor: '#4c0519',
    fontFamily: 'Cinzel',
    bannerUrl: null,
    logoUrl: null,
  },
};
