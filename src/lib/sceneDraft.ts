/**
 * The screen editor's draft: what a manager changed on a custom screen but has not pushed yet. It lives only in this
 * browser (never on the server), so the big screens cannot see it; closing the editor keeps it for the next time.
 * A draft belongs to one version of the scene: when the scene is saved by anyone, the old draft is dropped.
 */
import type { StageFrame } from '@/lib/eventStore';
import { SAFE_URL, normalizeLayout, type SceneLayout } from '@/lib/sceneLayout';
import type { Scene, SceneMedia } from '@/lib/screensApi';

export interface Draft {
  layout: SceneLayout;
  frame: Partial<StageFrame>;
  media: SceneMedia[];
}

export interface StoredDraft extends Draft {
  /** The scene's updated_at when the draft began. */
  base: string;
  /** Files uploaded for this draft; removed again if the draft is thrown away. */
  fresh: string[];
}

const storageKey = (sceneId: string) => `d1-scene-draft-${sceneId}`;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function readMedia(raw: unknown): SceneMedia[] | null {
  if (!Array.isArray(raw) || raw.length > 300) return null;
  const out: SceneMedia[] = [];
  for (const m of raw) {
    if (!isRecord(m) || typeof m.url !== 'string' || !SAFE_URL.test(m.url)) return null;
    out.push({ url: m.url, path: typeof m.path === 'string' ? m.path : '', ...(typeof m.w === 'number' ? { w: m.w } : {}), ...(typeof m.h === 'number' ? { h: m.h } : {}) });
  }
  return out;
}

/** The saved draft for this version of the scene, or null (also when the storage is unavailable). */
export function readDraft(scene: Pick<Scene, 'id' | 'updated_at'>): StoredDraft | null {
  try {
    const raw = JSON.parse(window.localStorage.getItem(storageKey(scene.id)) ?? 'null') as unknown;
    if (!isRecord(raw) || raw.base !== scene.updated_at || !isRecord(raw.frame)) return null;
    const media = readMedia(raw.media);
    if (!media) return null;
    const fresh = Array.isArray(raw.fresh) ? raw.fresh.filter((p): p is string => typeof p === 'string') : [];
    return { base: scene.updated_at, layout: normalizeLayout(raw.layout), frame: raw.frame as Partial<StageFrame>, media, fresh };
  } catch {
    return null;
  }
}

export function writeDraft(scene: Pick<Scene, 'id' | 'updated_at'>, draft: Draft, fresh: string[]) {
  try {
    window.localStorage.setItem(storageKey(scene.id), JSON.stringify({ base: scene.updated_at, layout: draft.layout, frame: draft.frame, media: draft.media, fresh }));
  } catch {
    // Private mode or a full disk: the draft just lives until the editor is closed.
  }
}

export function clearDraft(sceneId: string) {
  try {
    window.localStorage.removeItem(storageKey(sceneId));
  } catch {
    // Nothing to clear.
  }
}

export const hasDraft = (scene: Pick<Scene, 'id' | 'updated_at'>) => !!readDraft(scene);
