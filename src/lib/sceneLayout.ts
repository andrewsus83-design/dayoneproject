/**
 * What a screen manager adds to a custom screen in the screen editor (components/screens/ScreenEditor.tsx), kept in
 * the scene's `options.layout`. A scene without it renders exactly as before: the layout is only read, never required.
 *
 * - `main` moves, zooms and styles the scene's own picture, video or page.
 * - `items` are things added on top: text, a picture, the event logo. Sizes are in "units" of 1% of the screen's
 *   height (every screen is laid out 1080 high), so an item is the same size on a wide LED wall as on a TV; positions
 *   are percentages of the whole screen, so deleting the footer or switching frame never moves anything.
 * - Every number and word is checked again here when it is read, because this is also what the audience's screens run.
 */

export const ENTERS = ['none', 'fade', 'rise', 'slide', 'zoom'] as const;
export const LOOPS = ['none', 'float', 'pulse'] as const;
export const SHADOWS = ['none', 'soft', 'strong'] as const;
export const GLOWS = ['none', 'gold', 'neon', 'white'] as const;
export const TEXT_COLORS = ['white', 'gold', 'neon', 'black'] as const;
export const TEXT_BGS = ['none', 'dark', 'gold'] as const;

export type Enter = (typeof ENTERS)[number];
export type Loop = (typeof LOOPS)[number];
export type Shadow = (typeof SHADOWS)[number];
export type Glow = (typeof GLOWS)[number];
export type TextColor = (typeof TEXT_COLORS)[number];
export type TextBg = (typeof TEXT_BGS)[number];

/** One screen's height in design units, and what 1 unit is in pixels at that design size. */
export const UNIT_PX = 10.8;
export const MAX_ITEMS = 30;
export const MAX_TEXT = 200;

/** How an item looks and moves; the same few effects for every kind of item. */
export interface Look {
  /** Plays once when the screen appears. */
  enter: Enter;
  /** Seconds to wait before `enter` plays. */
  delay: number;
  /** Keeps moving gently while the screen is on air. */
  loop: Loop;
  shadow: Shadow;
  glow: Glow;
  /** 0.1 to 1. */
  opacity: number;
}

interface ItemBase extends Look {
  id: string;
  /** Centre of the item, % of the screen's width and height. */
  x: number;
  y: number;
  /** Text: the letters' height; picture and logo: the width. In units (see UNIT_PX). */
  size: number;
}

export interface TextItem extends ItemBase {
  type: 'text';
  text: string;
  color: TextColor;
  bg: TextBg;
}
export interface ImageItem extends ItemBase {
  type: 'image';
  /** An upload of ours (https). */
  url: string;
  path: string;
}
export interface LogoItem extends ItemBase {
  type: 'logo';
}
export type LayoutItem = TextItem | ImageItem | LogoItem;

/** The scene's own picture, video or page. */
export interface MainLayout {
  /** Offset from where it normally sits, % of the screen. */
  x: number;
  y: number;
  /** 1 = as it was. */
  scale: number;
  enter: Enter;
  delay: number;
  /** Pictures and slides drift and zoom slowly while they show. */
  kenburns: boolean;
  /** px of blur, and how much darker (0 to 0.8): to put text on top of a busy picture. */
  blur: number;
  dim: number;
}

export interface SceneLayout {
  main: MainLayout;
  items: LayoutItem[];
}

export const DEFAULT_LOOK: Look = { enter: 'fade', delay: 0, loop: 'none', shadow: 'none', glow: 'none', opacity: 1 };
export const DEFAULT_MAIN: MainLayout = { x: 0, y: 0, scale: 1, enter: 'none', delay: 0, kenburns: false, blur: 0, dim: 0 };
export const EMPTY_LAYOUT: SceneLayout = { main: DEFAULT_MAIN, items: [] };

/** Size limits (units) for each kind of item, and for zooming the main content. */
export const SIZE_RANGE = { text: { min: 1.5, max: 40 }, image: { min: 3, max: 150 }, logo: { min: 3, max: 150 } } as const;
export const SCALE_RANGE = { min: 0.2, max: 4 } as const;
/** The size a new item starts with: the editor shows sizes as a percentage of this. */
export const DEFAULT_SIZE = { text: 7, image: 24, logo: 14 } as const;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const num = (v: unknown, min: number, max: number, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, min, max) : fallback);
const pick = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => ((list as readonly string[]).includes(v as string) ? (v as T) : fallback);
const round2 = (v: number) => Math.round(v * 100) / 100;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** https, or a local server while developing. */
export const SAFE_URL = /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/)\S+$/i;

export const newItemId = () => Math.random().toString(36).slice(2, 10);

function readLook(r: Record<string, unknown>): Look {
  return {
    enter: pick(r.enter, ENTERS, DEFAULT_LOOK.enter),
    delay: num(r.delay, 0, 10, 0),
    loop: pick(r.loop, LOOPS, 'none'),
    shadow: pick(r.shadow, SHADOWS, 'none'),
    glow: pick(r.glow, GLOWS, 'none'),
    opacity: num(r.opacity, 0.1, 1, 1),
  };
}

function readMain(raw: unknown): MainLayout {
  const r = isRecord(raw) ? raw : {};
  return {
    x: num(r.x, -100, 100, 0),
    y: num(r.y, -100, 100, 0),
    scale: num(r.scale, SCALE_RANGE.min, SCALE_RANGE.max, 1),
    enter: pick(r.enter, ENTERS, 'none'),
    delay: num(r.delay, 0, 10, 0),
    kenburns: r.kenburns === true,
    blur: num(r.blur, 0, 24, 0),
    dim: num(r.dim, 0, 0.8, 0),
  };
}

function readItem(raw: unknown): LayoutItem | null {
  if (!isRecord(raw)) return null;
  const base = {
    id: typeof raw.id === 'string' && raw.id && raw.id.length <= 40 ? raw.id : newItemId(),
    x: num(raw.x, 0, 100, 50),
    y: num(raw.y, 0, 100, 50),
    ...readLook(raw),
  };
  if (raw.type === 'text') {
    const text = typeof raw.text === 'string' ? raw.text.slice(0, MAX_TEXT) : '';
    if (!text.trim()) return null;
    return { ...base, type: 'text', text, size: num(raw.size, SIZE_RANGE.text.min, SIZE_RANGE.text.max, 7), color: pick(raw.color, TEXT_COLORS, 'white'), bg: pick(raw.bg, TEXT_BGS, 'none') };
  }
  if (raw.type === 'image') {
    // Only pictures from our own storage ever get this far: https (a local test server is the one exception).
    if (typeof raw.url !== 'string' || !SAFE_URL.test(raw.url)) return null;
    return { ...base, type: 'image', url: raw.url, path: typeof raw.path === 'string' ? raw.path : '', size: num(raw.size, SIZE_RANGE.image.min, SIZE_RANGE.image.max, 20) };
  }
  if (raw.type === 'logo') return { ...base, type: 'logo', size: num(raw.size, SIZE_RANGE.logo.min, SIZE_RANGE.logo.max, 14) };
  return null;
}

/** A layout from whatever is stored: anything unexpected falls back to the plain screen. Never throws. */
export function normalizeLayout(raw: unknown): SceneLayout {
  if (!isRecord(raw)) return EMPTY_LAYOUT;
  const items = Array.isArray(raw.items) ? raw.items.slice(0, MAX_ITEMS).map(readItem).filter((i): i is LayoutItem => !!i) : [];
  const main = readMain(raw.main);
  return items.length === 0 && isDefaultMain(main) ? EMPTY_LAYOUT : { main, items };
}

export const isDefaultMain = (m: MainLayout) =>
  m.x === 0 && m.y === 0 && m.scale === 1 && m.enter === 'none' && m.delay === 0 && !m.kenburns && m.blur === 0 && m.dim === 0;

/** What goes into `options.layout`: nothing at all when the screen is plain, otherwise tidy rounded numbers. */
export function serializeLayout(layout: SceneLayout): SceneLayout | undefined {
  const clean = normalizeLayout(layout);
  if (clean.items.length === 0 && isDefaultMain(clean.main)) return undefined;
  const r = (k: Look): Look => ({ ...k, delay: round2(k.delay), opacity: round2(k.opacity) });
  return {
    main: { ...clean.main, x: round2(clean.main.x), y: round2(clean.main.y), scale: round2(clean.main.scale), delay: round2(clean.main.delay), blur: round2(clean.main.blur), dim: round2(clean.main.dim) },
    items: clean.items.map((i) => ({ ...i, ...r(i), x: round2(i.x), y: round2(i.y), size: round2(i.size) })),
  };
}

/** Options with the layout set, or removed when the screen is plain (so an unedited scene stays exactly as it was). */
export function withLayout<T extends { layout?: unknown }>(options: T, layout: SceneLayout): T {
  const next = { ...options };
  const stored = serializeLayout(layout);
  if (stored) next.layout = stored;
  else delete next.layout;
  return next;
}

/** The uploaded files a layout uses (pictures added to a screen), as storage paths. */
export function layoutPaths(raw: unknown): string[] {
  return normalizeLayout(raw).items.flatMap((i) => (i.type === 'image' && i.path ? [i.path] : []));
}

export const makeText = (text = 'Your text'): TextItem => ({ ...DEFAULT_LOOK, shadow: 'soft', id: newItemId(), type: 'text', x: 50, y: 50, size: 7, text, color: 'white', bg: 'none' });
export const makeLogo = (): LogoItem => ({ ...DEFAULT_LOOK, id: newItemId(), type: 'logo', x: 50, y: 50, size: 14 });
export const makeImage = (url: string, path: string): ImageItem => ({ ...DEFAULT_LOOK, id: newItemId(), type: 'image', x: 50, y: 50, size: 24, url, path });

export const sizeRange = (item: LayoutItem) => SIZE_RANGE[item.type];
export const clampSize = (item: LayoutItem, size: number) => clamp(size, sizeRange(item).min, sizeRange(item).max);
export const clampScale = (scale: number) => clamp(scale, SCALE_RANGE.min, SCALE_RANGE.max);
export const clampPercent = (v: number) => clamp(v, 0, 100);
