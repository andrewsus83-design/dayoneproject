/**
 * A screen's look (a41_screens.chrome): one header, frame and footer set on the live screen itself and drawn around
 * whatever it shows. While `on` is false the screen is drawn as before: each stage module with its own header and
 * ticker, each custom screen with its own frame and footer.
 */
import type { FramePreset, StageFrame } from '@/lib/eventStore';

/** What runs along the bottom: nothing, the scrolling line, a plain bar with text, or the organizer's own banner. */
export type ChromeFooter = 'off' | 'ticker' | 'bar' | 'image';

export interface ScreenChrome {
  on: boolean;
  /** The event's logo, name, address, date and place along the top. */
  header: boolean;
  frame: Pick<StageFrame, 'preset' | 'imageUrl' | 'imageBlend'>;
  footer: ChromeFooter;
  /** The scrolling line, or the text on the bar. Empty scrolling line = the event's own line (welcome, date, place, photo wall address). */
  footerText: string;
  /** The bar's look. */
  footerStyle: 'dark' | 'gold' | 'glass';
  footerLogo: boolean;
  footerImageUrl: string;
}

export const DEFAULT_CHROME: ScreenChrome = {
  on: false,
  header: true,
  frame: { preset: 'none', imageUrl: '', imageBlend: 'normal' },
  footer: 'ticker',
  footerText: '',
  footerStyle: 'dark',
  footerLogo: true,
  footerImageUrl: '',
};

const PRESETS: FramePreset[] = ['none', 'gold', 'neon', 'prism', 'confetti', 'image'];
const FOOTERS: ChromeFooter[] = ['off', 'ticker', 'bar', 'image'];
const STYLES: ScreenChrome['footerStyle'][] = ['dark', 'gold', 'glass'];

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
/** Pictures come from our own storage or a link; nothing else may end up in an image tag. */
const url = (v: unknown) => (typeof v === 'string' && /^https:\/\//i.test(v) ? v.slice(0, 600) : '');

/** Whatever the database holds (null, an older shape, a hand-edited row) becomes a complete, safe look. */
export function normalizeChrome(raw: unknown): ScreenChrome {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const f = r.frame && typeof r.frame === 'object' ? (r.frame as Record<string, unknown>) : {};
  const preset = PRESETS.includes(f.preset as FramePreset) ? (f.preset as FramePreset) : 'none';
  const imageUrl = url(f.imageUrl);
  return {
    on: r.on === true,
    header: r.header !== false,
    frame: { preset: preset === 'image' && !imageUrl ? 'none' : preset, imageUrl, imageBlend: f.imageBlend === 'screen' ? 'screen' : 'normal' },
    footer: FOOTERS.includes(r.footer as ChromeFooter) ? (r.footer as ChromeFooter) : DEFAULT_CHROME.footer,
    footerText: text(r.footerText, 200),
    footerStyle: STYLES.includes(r.footerStyle as ScreenChrome['footerStyle']) ? (r.footerStyle as ScreenChrome['footerStyle']) : 'dark',
    footerLogo: r.footerLogo !== false,
    footerImageUrl: url(r.footerImageUrl),
  };
}

/** The stage frame the shared frame-and-footer drawing needs (the scrolling line is drawn separately). */
export function chromeFrame(chrome: ScreenChrome): StageFrame {
  const bar = chrome.on && (chrome.footer === 'bar' || (chrome.footer === 'image' && !!chrome.footerImageUrl));
  return {
    preset: chrome.on ? chrome.frame.preset : 'none',
    imageUrl: chrome.on ? chrome.frame.imageUrl : '',
    imageBlend: chrome.frame.imageBlend,
    footerOn: bar,
    footerText: chrome.footerText,
    footerLogo: chrome.footerLogo,
    footerStyle: chrome.footer === 'image' ? 'image' : chrome.footerStyle,
    footerImageUrl: chrome.footerImageUrl,
  };
}

/** The pictures a look uploaded (to delete them with the screen or when they are replaced). */
export const chromeFiles = (chrome: ScreenChrome | null | undefined): string[] =>
  chrome ? [chrome.frame.imageUrl, chrome.footerImageUrl].filter(Boolean) : [];
