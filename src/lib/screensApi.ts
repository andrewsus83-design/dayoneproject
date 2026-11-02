'use client';

/**
 * Live screens (supabase/migrations/*_a41_live_screens.sql): an event's named outputs, each showing one source.
 * A source is a stage module ("module:<id>") or a custom scene ("scene:<uuid>": slides, images or a video with a
 * frame and footer). The switcher previews a source and takes it live; each output page reads its screen with
 * a41_screen_feed and changes source with a crossfade once the next one is ready.
 */
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { STAGE_MODULE_IDS, STAGE_MODULE_NAMES, STAGE_MODULES_WITHOUT_CONTENT } from '@/lib/stageApi';
import type { StageFrame } from '@/lib/eventStore';
import type { StageModuleId } from '@/lib/types';
import type { ProbeResult } from '@/lib/screenUrl';
import { layoutPaths, type SceneLayout } from '@/lib/sceneLayout';
import { chromeFiles, normalizeChrome, type ScreenChrome } from '@/lib/screenChrome';

/**
 * 'web' is a link: a web page or an embed (YouTube, Google Slides, Canva…) shown inside the screen.
 * 'module' is a stage module (options.module) opened in the screen editor: the live module with the editor's changes
 * on top (moved or zoomed, added text, pictures, logo, effects). It has no media of its own.
 */
export type SceneKind = 'slides' | 'images' | 'video' | 'web' | 'module';

export interface SceneMedia {
  url: string;
  /** The file in our bucket; empty for a link to somewhere else (nothing of ours to delete). */
  path: string;
  w?: number;
  h?: number;
}

/** A link to a file or page elsewhere, not an upload of ours. */
export const isExternalMedia = (m: Pick<SceneMedia, 'path'>) => !m.path;

export interface SceneOptions {
  /** Images: seconds per image. */
  seconds?: number;
  /** Video: play again from the start. */
  loop?: boolean;
  /** Video: play its sound (the output must be started with a click once). */
  sound?: boolean;
  fit?: 'contain' | 'cover';
  /** Links: what kind of link it is ('youtube', 'google-slides', 'page'…), and the address as the organizer pasted it. */
  provider?: string;
  page?: string;
  /** Stage modules: which module this screen shows. */
  module?: StageModuleId;
  /** What the screen editor added or changed on top of the content (lib/sceneLayout.ts). Absent = a plain screen. */
  layout?: SceneLayout;
}

export interface Scene {
  id: string;
  event_id: string;
  title: string;
  kind: SceneKind;
  media: SceneMedia[];
  options: SceneOptions;
  frame: Partial<StageFrame>;
  updated_at: string;
}

export interface Program {
  /** "module:<id>" or "scene:<uuid>". */
  source: string;
  /** Slide or image number, from 0. */
  slide: number;
}

export interface Screen {
  id: string;
  event_id: string;
  name: string;
  width: number;
  height: number;
  position: number;
  program: Program;
  rev: number;
  /** The screen's own header, frame and footer (lib/screenChrome.ts); null = drawn as before. Read it with normalizeChrome. */
  chrome?: Partial<ScreenChrome> | null;
}

export interface ScreenFeed {
  screen: Pick<Screen, 'id' | 'name' | 'width' | 'height' | 'program' | 'rev' | 'chrome'>;
  /** wall_key: lets the photo wall module read approved photos on an output that is not signed in. starts_at and venue_name fill the header. */
  event: { slug: string; name: string; logo: string | null; wall_key: string | null; starts_at?: string | null; venue_name?: string | null };
  scene: Omit<Scene, 'event_id'> | null;
}

export const SIZE_PRESETS: { label: string; width: number; height: number }[] = [
  { label: 'Full HD 1920 × 1080', width: 1920, height: 1080 },
  { label: 'HD 1280 × 720', width: 1280, height: 720 },
  { label: '4K 3840 × 2160', width: 3840, height: 2160 },
  { label: 'Wide LED 3840 × 1080', width: 3840, height: 1080 },
  { label: 'Ultra-wide LED 5760 × 1080', width: 5760, height: 1080 },
  { label: 'Portrait 1080 × 1920', width: 1080, height: 1920 },
  { label: 'Square 1080 × 1080', width: 1080, height: 1080 },
];

/** Stage modules that have something to show (the others are not built yet). */
export const SCREEN_MODULES: StageModuleId[] = STAGE_MODULE_IDS.filter((m) => !STAGE_MODULES_WITHOUT_CONTENT.includes(m));

export const SCENE_KIND_LABELS: Record<SceneKind, string> = { slides: 'Presentation', images: 'Images', video: 'Video', web: 'Link', module: 'Stage module' };

export const moduleSource = (id: StageModuleId) => `module:${id}`;
export const sceneSource = (id: string) => `scene:${id}`;

/** The stage module a 'module' scene shows, or null for any other scene (or one naming a module that does not exist). */
export function sceneModule(scene: Pick<Scene, 'kind' | 'options'> | null | undefined): StageModuleId | null {
  const id = scene?.kind === 'module' ? scene.options.module : undefined;
  return id && STAGE_MODULE_IDS.includes(id) ? id : null;
}

export function parseSource(source: string): { kind: 'module'; id: StageModuleId } | { kind: 'scene'; id: string } | null {
  if (source.startsWith('module:')) {
    const id = source.slice(7) as StageModuleId;
    return STAGE_MODULE_IDS.includes(id) ? { kind: 'module', id } : null;
  }
  if (source.startsWith('scene:')) return { kind: 'scene', id: source.slice(6) };
  return null;
}

export function sourceLabel(source: string, scenes: Pick<Scene, 'id' | 'title'>[]): string {
  const s = parseSource(source);
  if (!s) return 'Nothing';
  if (s.kind === 'module') return STAGE_MODULE_NAMES[s.id];
  return scenes.find((x) => x.id === s.id)?.title ?? 'Custom screen';
}

/** How many steps a scene has (slides or images); a video is one. */
export const sceneSteps = (scene: Pick<Scene, 'kind' | 'media'> | null | undefined) =>
  scene && (scene.kind === 'slides' || scene.kind === 'images') ? Math.max(1, scene.media.length) : 1;

/** The output page for one screen (outside /events/<slug>, so no event loading notice ever shows on air). */
export const outputPath = (screenId: string) => `/live/${screenId}`;

/**
 * The stage page showing one module only, for outputs and previews: no controls, no pointer. `bare` leaves out the
 * stage's own header and ticker, for a screen that draws its own look around it.
 */
export const moduleOutputPath = (slug: string, module: StageModuleId, wallKey?: string | null, bare = false) =>
  `/events/${slug}/stage?output=1&module=${module}${bare ? '&bare=1' : ''}${module === 'photowall' && wallKey ? `&key=${encodeURIComponent(wallKey)}` : ''}`;

/** The photo wall key for previews in the switcher (organizers and screen managers). */
export async function fetchWallKey(eventId: string): Promise<string | null> {
  const { data, error } = await createClient().rpc('a41_screen_wall_key', { p_event: eventId });
  return error ? null : ((data as string | null) ?? null);
}

/** Same-device outputs hear a take at once; other devices within a second. */
export const screenBusName = (screenId: string) => `a41_screen:${screenId}`;

function readable(message: string): string {
  if (/forbidden|permission denied|row-level security/i.test(message)) return 'Only organizers and screen managers can change the screens.';
  if (message.includes('invalid_screen_source')) return 'That source does not exist for this event any more.';
  if (message.includes('a41_scenes_kind_check')) return 'Saving this kind of screen needs a one-time database update that has not been applied yet.';
  if (message.includes('a41_scenes_web_https')) return 'A link screen needs a web address that starts with https://.';
  if (message.includes('a41_scenes_module_shape')) return 'A stage module screen must name one of the stage modules and have no pictures of its own.';
  if (/chrome/.test(message) && /column|schema cache/.test(message)) return 'Saving the screen look needs a one-time database update that has not been applied yet.';
  if (/width|height/.test(message) && /check/.test(message)) return 'Screen size must be between 320 × 240 and 7680 × 4320.';
  if (/Failed to fetch|NetworkError|network|load failed/i.test(message)) return 'No connection. Check the internet and try again.';
  return message;
}

const SCREEN_COLUMNS = 'id, event_id, name, width, height, position, program, rev, chrome';
const SCENE_COLUMNS = 'id, event_id, title, kind, media, options, frame, updated_at';

export async function listScreens(eventId: string): Promise<Screen[]> {
  const { data, error } = await createClient().from('a41_screens').select(SCREEN_COLUMNS).eq('event_id', eventId).order('position').order('name');
  if (error) throw new Error(readable(error.message));
  return (data ?? []) as Screen[];
}

export async function listScenes(eventId: string): Promise<Scene[]> {
  const { data, error } = await createClient().from('a41_scenes').select(SCENE_COLUMNS).eq('event_id', eventId).order('created_at');
  if (error) throw new Error(readable(error.message));
  return (data ?? []) as Scene[];
}

/** `chrome` is for a screen being added (its look from the start); an existing screen's look is saved with saveScreenChrome. */
export async function saveScreen(input: { id?: string; eventId: string; name: string; width: number; height: number; position?: number; chrome?: ScreenChrome | null }): Promise<Screen> {
  const values = { name: input.name.trim(), width: Math.round(input.width), height: Math.round(input.height) };
  const q = input.id
    ? createClient().from('a41_screens').update(values).eq('id', input.id)
    : createClient().from('a41_screens').insert({ ...values, event_id: input.eventId, position: input.position ?? 0, ...(input.chrome ? { chrome: input.chrome } : {}) });
  const { data, error } = await q.select(SCREEN_COLUMNS).single();
  if (error) throw new Error(readable(error.message));
  return data as Screen;
}

export async function deleteScreen(screen: Pick<Screen, 'id' | 'chrome'>): Promise<void> {
  const { error } = await createClient().from('a41_screens').delete().eq('id', screen.id);
  if (error) throw new Error(readable(error.message));
  await removeMediaFiles(chromeFiles(normalizeChrome(screen.chrome)));
}

/**
 * Saves a screen's look (its own header, frame and footer). The output pages notice it at their next poll; outputs
 * on this device hear it at once. Pictures the look no longer uses are deleted from storage.
 */
export async function saveScreenChrome(screen: Pick<Screen, 'id' | 'chrome'>, chrome: ScreenChrome): Promise<Screen> {
  const { data, error } = await createClient().from('a41_screens').update({ chrome }).eq('id', screen.id).select(SCREEN_COLUMNS).single();
  if (error) throw new Error(readable(error.message));
  const saved = data as Screen;
  try {
    const bus = new BroadcastChannel(screenBusName(screen.id));
    bus.postMessage({ program: saved.program, rev: saved.rev });
    bus.close();
  } catch {
    // Other devices pick it up from the server.
  }
  const kept = chromeFiles(chrome);
  await removeMediaFiles(chromeFiles(normalizeChrome(screen.chrome)).filter((u) => !kept.includes(u)));
  return saved;
}

/** Puts a source live on a screen; returns the screen with its new rev. */
export async function takeToScreen(screenId: string, program: Program): Promise<Screen> {
  const { data, error } = await createClient().from('a41_screens').update({ program }).eq('id', screenId).select(SCREEN_COLUMNS).single();
  if (error) throw new Error(readable(error.message));
  const screen = data as Screen;
  try {
    const bus = new BroadcastChannel(screenBusName(screenId));
    bus.postMessage({ program: screen.program, rev: screen.rev });
    bus.close();
  } catch {
    // Other devices pick it up from the server.
  }
  return screen;
}

export async function saveScene(input: { id?: string; eventId: string; title: string; kind: SceneKind; media: SceneMedia[]; options: SceneOptions; frame: Partial<StageFrame> }): Promise<Scene> {
  const values = { title: input.title.trim(), kind: input.kind, media: input.media, options: input.options, frame: input.frame };
  const q = input.id
    ? createClient().from('a41_scenes').update(values).eq('id', input.id)
    : createClient().from('a41_scenes').insert({ ...values, event_id: input.eventId });
  const { data, error } = await q.select(SCENE_COLUMNS).single();
  if (error) throw new Error(readable(error.message));
  return data as Scene;
}

/**
 * Saves a draft from the screen editor, but only if nobody changed the scene since the draft began (the scene's
 * updated_at is still the one the editor opened with). Otherwise it refuses, so two operators never overwrite each other.
 */
export async function saveSceneIfUnchanged(input: { id: string; base: string; title: string; kind: SceneKind; media: SceneMedia[]; options: SceneOptions; frame: Partial<StageFrame> }): Promise<Scene> {
  const values = { title: input.title.trim(), kind: input.kind, media: input.media, options: input.options, frame: input.frame };
  const { data, error } = await createClient().from('a41_scenes').update(values).eq('id', input.id).eq('updated_at', input.base).select(SCENE_COLUMNS).maybeSingle();
  // No row matched: someone saved it since this draft began (older clients report that as PGRST116 instead of null).
  if (error && error.code !== 'PGRST116') throw new Error(readable(error.message));
  if (error || !data) throw new Error('This screen was changed by someone else while you were editing. Close the editor and open it again to see their version.');
  return data as Scene;
}

export async function deleteScene(scene: Scene): Promise<void> {
  const { error } = await createClient().from('a41_scenes').delete().eq('id', scene.id);
  if (error) throw new Error(readable(error.message));
  await removeMediaFiles(sceneFiles(scene));
}

/** Every uploaded file a scene uses: its media, its own frame and footer images, and pictures added in the screen editor. */
export function sceneFiles(scene: Pick<Scene, 'media' | 'frame'> & { options?: SceneOptions }): string[] {
  return [...scene.media.map((m) => m.path), scene.frame.imageUrl ?? '', scene.frame.footerImageUrl ?? '', ...layoutPaths(scene.options?.layout)]
    .map((p) => (p ? mediaPathOf(p) : null))
    .filter((p): p is string => !!p);
}

/** Deletes uploaded files (paths or our public URLs); anything else is ignored. Best effort. */
export async function removeMediaFiles(urlsOrPaths: string[]): Promise<void> {
  const paths = urlsOrPaths.map(mediaPathOf).filter((p): p is string => !!p);
  if (paths.length) await createClient().storage.from(MEDIA_BUCKET).remove(paths).catch(() => undefined);
}

/* ───────────────────────── Uploads ───────────────────────── */

export const MEDIA_BUCKET = 'a41_screen_media';
/** The bucket's limit; the Supabase project may have a lower one. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'video/mp4': 'mp4', 'video/webm': 'webm' };

/** The storage path inside our bucket for a public URL we handed out, or the path itself. */
function mediaPathOf(urlOrPath: string): string | null {
  const marker = `/object/public/${MEDIA_BUCKET}/`;
  const at = urlOrPath.indexOf(marker);
  if (at >= 0) return decodeURIComponent(urlOrPath.slice(at + marker.length));
  return urlOrPath.startsWith('http') ? null : urlOrPath;
}

export async function uploadMedia(eventId: string, blob: Blob, size?: { w: number; h: number }): Promise<SceneMedia> {
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error('Files can be up to 50 MB. Shorten or compress the video and try again.');
  const ext = EXT[blob.type];
  if (!ext) throw new Error('Use a PDF, JPG, PNG, WebP, MP4 or WebM file.');
  const path = `${eventId}/${crypto.randomUUID()}.${ext}`;
  const storage = createClient().storage.from(MEDIA_BUCKET);
  const { error } = await storage.upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
  if (error) {
    if (/maximum allowed size|too large|payload/i.test(error.message)) throw new Error('That file is larger than the upload limit. Try a smaller or shorter file.');
    throw new Error(`Upload failed: ${error.message}`);
  }
  return { url: storage.getPublicUrl(path).data.publicUrl, path, ...(size ?? {}) };
}

/** Scales an image file down to fit the screen (keeps quality, keeps uploads small) as WebP. */
export async function imageForScreen(file: File, maxW = 3840, maxH = 2160): Promise<{ blob: Blob; w: number; h: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bitmap.width, maxH / bitmap.height);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read the image.'))), 'image/webp', 0.9));
  return { blob, w, h };
}

/**
 * Turns every page of a PDF into a WebP slide, so the screen shows pictures and changes slides instantly.
 * PowerPoint, Keynote and Google Slides can all save a presentation as PDF.
 */
export async function pdfToSlides(file: File, onPage?: (done: number, total: number) => void, targetW = 3840): Promise<{ blob: Blob; w: number; h: number }[]> {
  const pdfjs = await import('pdfjs-dist');
  // Served from public/ so it always matches the installed pdfjs-dist version (see package.json).
  pdfjs.GlobalWorkerOptions.workerSrc = `/vendor/pdf.worker-${pdfjs.version}.min.mjs`;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  if (doc.numPages > 300) throw new Error('Presentations can have up to 300 slides.');
  const out: { blob: Blob; w: number; h: number }[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(4, targetW / base.width) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw a slide.'))), 'image/webp', 0.9));
    out.push({ blob, w: canvas.width, h: canvas.height });
    page.cleanup();
    onPage?.(i, doc.numPages);
  }
  await doc.destroy();
  return out;
}

/* ───────────────────────── Links ───────────────────────── */

/** Asks the server whether a pasted link can go on a screen (it allows framing, exists, is a page / picture / video). */
export async function probeLink(url: string, signal?: AbortSignal): Promise<ProbeResult> {
  const res = await fetch('/api/screen-probe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal,
  });
  if (res.status === 401) throw new Error('Sign in again to check links.');
  if (!res.ok) throw new Error('The link check is not available right now. Try again.');
  return (await res.json()) as ProbeResult;
}

/* ───────────────────────── Output feed ───────────────────────── */

/** A request that does not answer within this is dropped, so one hung connection can never freeze an output. */
const FEED_TIMEOUT_MS = 6000;
/** Waits between tries while the connection is down: 2 s, 4 s, 8 s, then every 15 s. */
const FEED_BACKOFF_MAX_MS = 15_000;

export async function fetchScreenFeed(screenId: string, signal?: AbortSignal): Promise<ScreenFeed | null> {
  const q = createClient().rpc('a41_screen_feed', { p_screen: screenId });
  const { data, error } = await (signal ? q.abortSignal(signal) : q);
  if (error) throw new Error(readable(error.message));
  return (data as ScreenFeed | null) ?? null;
}

const feedCacheKey = (screenId: string) => `d1-screen-feed-${screenId}`;

/** The last feed this computer received, so a restarted output without internet still shows its last screen. */
function readCachedFeed(screenId: string): ScreenFeed | null {
  try {
    const raw = window.localStorage.getItem(feedCacheKey(screenId));
    const feed = raw ? (JSON.parse(raw) as ScreenFeed) : null;
    return feed?.screen?.id === screenId && feed.screen.program ? feed : null;
  } catch {
    return null;
  }
}

function writeCachedFeed(screenId: string, feed: ScreenFeed | null) {
  try {
    if (feed) window.localStorage.setItem(feedCacheKey(screenId), JSON.stringify(feed));
    else window.localStorage.removeItem(feedCacheKey(screenId));
  } catch {
    // Private mode or a full disk: the output just runs without its offline copy.
  }
}

export type ScreenFeedState = 'loading' | 'live' | 'offline' | 'missing';

/**
 * Follows one screen: the server every second, and takes from this device at once. It never lets the output go
 * blank or stall:
 * - every request has a time limit, so a hung connection cannot stop the polling;
 * - while the connection is down it keeps the last good feed (also across a restart, from this computer's copy)
 *   and retries with growing waits, then straight away when the network, the tab or the window comes back;
 * - nothing re-renders unless the program, the scene or the connection state really changed (a poll that finds
 *   nothing new must cost the screen nothing: a re-render every second makes a big screen stutter).
 */
export function useScreenFeed(screenId: string, intervalMs = 1000) {
  const [feed, setFeed] = useState<ScreenFeed | null>(null);
  const [state, setState] = useState<ScreenFeedState>('loading');

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    let controller: AbortController | null = null;
    // One request at a time; a wake-up that arrives during one asks for another right after.
    let inFlight = false;
    let again = false;
    let failures = 0;

    const cached = readCachedFeed(screenId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cached) setFeed(cached);

    const tick = async (): Promise<void> => {
      if (inFlight) {
        again = true;
        return;
      }
      inFlight = true;
      const request = new AbortController();
      controller = request;
      const giveUp = window.setTimeout(() => request.abort(), FEED_TIMEOUT_MS);
      try {
        const next = await fetchScreenFeed(screenId, request.signal);
        failures = 0;
        if (alive) {
          if (!next) {
            setState('missing');
            writeCachedFeed(screenId, null);
          } else {
            setState('live');
            // Same rev and same scene version: nothing changed, keep the object so nothing re-renders.
            setFeed((prev) => {
              const same =
                prev && prev.screen.rev === next.screen.rev && prev.scene?.updated_at === next.scene?.updated_at &&
                prev.screen.width === next.screen.width && prev.screen.height === next.screen.height;
              if (same) return prev;
              writeCachedFeed(screenId, next);
              return next;
            });
          }
        }
      } catch {
        failures += 1;
        if (alive) setState('offline');
      } finally {
        window.clearTimeout(giveUp);
        inFlight = false;
      }
      if (!alive) return;
      if (again) {
        again = false;
        return tick();
      }
      const wait = failures ? Math.min(FEED_BACKOFF_MAX_MS, intervalMs * 2 ** Math.min(failures, 4)) : intervalMs;
      timer = window.setTimeout(tick, wait);
    };

    /** Something suggests the news is fresh or the network is back: ask now instead of waiting out the timer. */
    const wake = (dropRequest = false) => {
      if (dropRequest) controller?.abort();
      window.clearTimeout(timer);
      tick();
    };
    const onOnline = () => wake(true);
    const onVisible = () => {
      if (document.visibilityState === 'visible') wake();
    };
    const onFocus = () => wake();
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    let bus: BroadcastChannel | null = null;
    try {
      bus = new BroadcastChannel(screenBusName(screenId));
      // A take from this browser: fetch now instead of waiting for the next second.
      bus.onmessage = () => wake();
    } catch {
      bus = null;
    }

    tick();
    return () => {
      alive = false;
      controller?.abort();
      window.clearTimeout(timer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      bus?.close();
    };
  }, [screenId, intervalMs]);

  return { feed, state };
}
