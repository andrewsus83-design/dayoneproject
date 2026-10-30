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

export type SceneKind = 'slides' | 'images' | 'video';

export interface SceneMedia {
  url: string;
  path: string;
  w?: number;
  h?: number;
}

export interface SceneOptions {
  /** Images: seconds per image. */
  seconds?: number;
  /** Video: play again from the start. */
  loop?: boolean;
  /** Video: play its sound (the output must be started with a click once). */
  sound?: boolean;
  fit?: 'contain' | 'cover';
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
}

export interface ScreenFeed {
  screen: Pick<Screen, 'id' | 'name' | 'width' | 'height' | 'program' | 'rev'>;
  /** wall_key: lets the photo wall module read approved photos on an output that is not signed in. */
  event: { slug: string; name: string; logo: string | null; wall_key: string | null };
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

export const SCENE_KIND_LABELS: Record<SceneKind, string> = { slides: 'Presentation', images: 'Images', video: 'Video' };

export const moduleSource = (id: StageModuleId) => `module:${id}`;
export const sceneSource = (id: string) => `scene:${id}`;

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
  scene && scene.kind !== 'video' ? Math.max(1, scene.media.length) : 1;

/** The output page for one screen (outside /events/<slug>, so no event loading notice ever shows on air). */
export const outputPath = (screenId: string) => `/live/${screenId}`;

/** The stage page showing one module only, for outputs and previews: no controls, no pointer. */
export const moduleOutputPath = (slug: string, module: StageModuleId, wallKey?: string | null) =>
  `/events/${slug}/stage?output=1&module=${module}${module === 'photowall' && wallKey ? `&key=${encodeURIComponent(wallKey)}` : ''}`;

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
  if (/width|height/.test(message) && /check/.test(message)) return 'Screen size must be between 320 × 240 and 7680 × 4320.';
  if (/Failed to fetch|NetworkError|network|load failed/i.test(message)) return 'No connection. Check the internet and try again.';
  return message;
}

const SCREEN_COLUMNS = 'id, event_id, name, width, height, position, program, rev';
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

export async function saveScreen(input: { id?: string; eventId: string; name: string; width: number; height: number; position?: number }): Promise<Screen> {
  const values = { name: input.name.trim(), width: Math.round(input.width), height: Math.round(input.height) };
  const q = input.id
    ? createClient().from('a41_screens').update(values).eq('id', input.id)
    : createClient().from('a41_screens').insert({ ...values, event_id: input.eventId, position: input.position ?? 0 });
  const { data, error } = await q.select(SCREEN_COLUMNS).single();
  if (error) throw new Error(readable(error.message));
  return data as Screen;
}

export async function deleteScreen(id: string): Promise<void> {
  const { error } = await createClient().from('a41_screens').delete().eq('id', id);
  if (error) throw new Error(readable(error.message));
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

export async function deleteScene(scene: Scene): Promise<void> {
  const { error } = await createClient().from('a41_scenes').delete().eq('id', scene.id);
  if (error) throw new Error(readable(error.message));
  await removeMediaFiles(sceneFiles(scene));
}

/** Every uploaded file a scene uses: its media and its own frame and footer images. */
export function sceneFiles(scene: Pick<Scene, 'media' | 'frame'>): string[] {
  return [...scene.media.map((m) => m.path), scene.frame.imageUrl ?? '', scene.frame.footerImageUrl ?? '']
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

/* ───────────────────────── Output feed ───────────────────────── */

export async function fetchScreenFeed(screenId: string): Promise<ScreenFeed | null> {
  const { data, error } = await createClient().rpc('a41_screen_feed', { p_screen: screenId });
  if (error) throw new Error(readable(error.message));
  return (data as ScreenFeed | null) ?? null;
}

/**
 * Follows one screen: the server every second, and takes from this device at once. Keeps the last good feed while
 * the connection drops, so the output never goes blank.
 */
export function useScreenFeed(screenId: string, intervalMs = 1000) {
  const [feed, setFeed] = useState<ScreenFeed | null>(null);
  const [state, setState] = useState<'loading' | 'live' | 'offline' | 'missing'>('loading');

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    // One request at a time; a take that arrives during one asks for another right after.
    let inFlight = false;
    let again = false;
    const tick = async () => {
      if (inFlight) {
        again = true;
        return;
      }
      inFlight = true;
      try {
        const next = await fetchScreenFeed(screenId);
        if (alive && !next) setState('missing');
        if (alive && next) {
          setState('live');
          // Same rev and same scene version: nothing changed, keep the object so nothing re-renders.
          setFeed((prev) =>
            prev && prev.screen.rev === next.screen.rev && prev.scene?.updated_at === next.scene?.updated_at && prev.screen.width === next.screen.width && prev.screen.height === next.screen.height
              ? prev
              : next,
          );
        }
      } catch {
        if (alive) setState('offline');
      }
      inFlight = false;
      if (!alive) return;
      if (again) {
        again = false;
        tick();
        return;
      }
      timer = window.setTimeout(tick, intervalMs);
    };
    tick();

    let bus: BroadcastChannel | null = null;
    try {
      bus = new BroadcastChannel(screenBusName(screenId));
      // A take from this browser: fetch now instead of waiting for the next second.
      bus.onmessage = () => {
        window.clearTimeout(timer);
        tick();
      };
    } catch {
      bus = null;
    }
    return () => {
      alive = false;
      window.clearTimeout(timer);
      bus?.close();
    };
  }, [screenId, intervalMs]);

  return { feed, state };
}
