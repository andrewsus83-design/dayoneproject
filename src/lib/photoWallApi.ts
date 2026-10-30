'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PhotoWallUpload } from '@/lib/types';

/**
 * The real photo wall (Supabase project dayoneproject, a41_photo* tables and the public `a41_photos` bucket).
 *
 * Guest upload: consent (first time) → upload ticket → compress to WebP ≤ 2 MB → upload to the ticket's path →
 * register. The event's moderation switch decides whether the photo goes straight onto the wall or waits for
 * the organizer. The live wall and the guests' album read approved photos through /api/photowall/<slug>,
 * which the CDN caches for a few seconds.
 */

export const PHOTO_BUCKET = 'a41_photos';
export const PHOTO_QUOTA = 10;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const MAX_CAPTION = 300;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';

export type PhotoStatus = 'pending' | 'approved' | 'rejected' | 'removed';
export type Moderation = 'auto' | 'manual';

export interface GuestPhoto {
  id: string;
  status: PhotoStatus;
  storage_path: string;
  caption: string | null;
  created_at: string;
}

export interface GuestPhotoState {
  guest_name: string;
  event_name: string;
  event_slug: string;
  ends_at: string;
  checked_in: boolean;
  enabled: boolean;
  uploads_open: boolean;
  upload_deadline: string;
  moderation: Moderation;
  captions_enabled: boolean;
  consented_at: string | null;
  photos_used: number;
  photo_quota: number;
  /** Only for checked-in guests while the wall is on: lets their phone watch the shared album feed. */
  wall_key: string | null;
  photos: GuestPhoto[];
}

export interface WallPhoto {
  id: string;
  url: string;
  caption: string | null;
  /** The guest's short name ("Budi S."). */
  name: string | null;
  approved_at: string;
}

export interface WallFeed {
  event: { name: string; slug: string };
  enabled: boolean;
  captions: boolean;
  total: number;
  photos: WallPhoto[];
}

export interface PhotoSettings {
  enabled: boolean;
  moderation: Moderation;
  captions_enabled: boolean;
  wall_key: string;
  updated_at: string;
}

export interface QueuePhoto {
  id: string;
  status: Exclude<PhotoStatus, 'removed'>;
  storage_path: string;
  caption: string | null;
  bytes: number;
  created_at: string;
  approved_at: string | null;
  guest_name: string;
  table_no: string | null;
}

export interface PhotoStats {
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  removed_count: number;
  stored_bytes: number;
  consent_count: number;
}

/** Public address of a stored photo (paths are random, so only people shown the photo can find it). */
export function photoUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

/** Where a guest's phone keeps its pass token after RSVP. */
export const passStorageKey = (slug: string) => `d1-pass-${slug}`;

export function readStoredPass(slug: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(passStorageKey(slug));
  } catch {
    return null;
  }
}

const MESSAGES: Record<string, string> = {
  invitation_not_found: "We couldn't find your pass. Open the photo wall from the pass link you received.",
  not_checked_in: 'Show your QR pass at the entrance first.',
  photos_disabled: "The photo wall isn't open for this event.",
  uploads_closed: 'Photo uploads for this event have closed.',
  consent_required: 'Please agree to share your photos first.',
  quota_reached: `You've shared ${PHOTO_QUOTA} photos, the most allowed. Remove one to add another.`,
  too_many_uploads: 'Let your current uploads finish, then try again.',
  unsupported_format: 'That photo format is not supported. Try a JPG or PNG photo.',
  file_too_large: 'That photo is still over 2 MB after compressing. Try another one.',
  caption_too_long: `Keep the caption to ${MAX_CAPTION} characters.`,
  ticket_not_found: 'The upload did not finish. Please try again.',
  upload_not_found: 'The upload did not finish. Please try again.',
  forbidden: 'Only the event owner can change the photo wall.',
  photos_required: 'Choose the photos to remove first.',
};

/** Turns a database error code into a sentence for the person on screen. */
export function photoErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e ?? '');
  const code = Object.keys(MESSAGES).find((k) => raw.includes(k));
  if (code) return MESSAGES[code];
  if (/failed to fetch|network|load failed/i.test(raw)) return 'No connection. Check your internet and try again.';
  return raw || 'Something went wrong. Please try again.';
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await createClient().rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

// ---------------------------------------------------------------------------------------------
// Compression: WebP (JPEG where the browser cannot encode WebP), longest side 1600 px, at most 2 MB.
// ---------------------------------------------------------------------------------------------

const MAX_INPUT_BYTES = 25 * 1024 * 1024;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressPhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
    throw new Error('Please choose a photo (JPG, PNG, WebP or HEIC).');
  }
  if (file.size > MAX_INPUT_BYTES) throw new Error('That photo is over 25 MB. Please choose a smaller one.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('That file could not be read as a photo.'));
      el.src = url;
    });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not process this photo.');

    for (const [maxSide, quality] of [[1600, 0.82], [1600, 0.7], [1280, 0.7], [1024, 0.65]] as const) {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let blob = await toBlob(canvas, 'image/webp', quality);
      // Some browsers (older Safari) cannot encode WebP and hand back PNG instead.
      if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality);
      if (blob && (blob.type === 'image/webp' || blob.type === 'image/jpeg') && blob.size <= MAX_PHOTO_BYTES) return blob;
    }
    throw new Error('file_too_large');
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------------------------------------------------------------------------------------------
// Guest side (identified by the pass token)
// ---------------------------------------------------------------------------------------------

export const guestPhotoApi = {
  /** Null when the token is unknown or the event isn't published. */
  state: (token: string) => rpc<GuestPhotoState | null>('a41_photo_guest', { p_token: token }),

  consent: (token: string) => rpc<string>('a41_photo_consent', { p_token: token }),

  /**
   * Runs the whole upload. `job` remembers finished steps, so calling again with the same job after a failure
   * resumes instead of uploading a second copy.
   */
  async upload(
    token: string,
    file: File,
    caption: string,
    job: UploadJob,
    onStep?: (step: 'compressing' | 'uploading' | 'saving') => void,
  ): Promise<GuestPhoto> {
    if (!job.blob) {
      onStep?.('compressing');
      job.blob = await compressPhoto(file);
    }
    if (!job.path || !job.contentType) {
      const ticket = await rpc<{ path: string; content_type: string }>('a41_photo_ticket', {
        p_token: token,
        p_ext: job.blob.type === 'image/webp' ? 'webp' : 'jpg',
      });
      job.path = ticket.path;
      job.contentType = ticket.content_type;
    }
    if (!job.uploaded) {
      onStep?.('uploading');
      const { error } = await createClient()
        .storage.from(PHOTO_BUCKET)
        .upload(job.path, job.blob, { contentType: job.contentType, upsert: false, cacheControl: '86400' });
      // "Already exists" means an earlier attempt got the file there.
      if (error && !/exist|duplicate/i.test(error.message)) throw new Error(error.message);
      job.uploaded = true;
    }
    onStep?.('saving');
    return rpc<GuestPhoto>('a41_register_photo', { p_token: token, p_path: job.path, p_caption: caption.trim() || null });
  },

  async remove(token: string, photoId: string): Promise<void> {
    const path = await rpc<string | null>('a41_remove_my_photo', { p_token: token, p_photo_id: photoId });
    // Delete the file now; the daily cleanup catches anything this misses.
    if (path) await createClient().storage.from(PHOTO_BUCKET).remove([path]).catch(() => undefined);
  },
};

export interface UploadJob {
  blob?: Blob;
  path?: string;
  contentType?: string;
  uploaded?: boolean;
}

// ---------------------------------------------------------------------------------------------
// Organizer side (signed in; the database checks that they manage the event)
// ---------------------------------------------------------------------------------------------

export const organizerPhotoApi = {
  /** Null when the event isn't saved to the server (or this account can't see it). */
  async settings(eventId: string): Promise<PhotoSettings | null> {
    const { data, error } = await createClient()
      .from('a41_photo_settings')
      .select('enabled, moderation, captions_enabled, wall_key, updated_at')
      .eq('event_id', eventId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as PhotoSettings | null;
  },

  update: (eventId: string, patch: { enabled?: boolean; moderation?: Moderation; captionsEnabled?: boolean }) =>
    rpc<PhotoSettings>('a41_set_photo_settings', {
      p_event: eventId,
      p_enabled: patch.enabled ?? null,
      p_moderation: patch.moderation ?? null,
      p_captions_enabled: patch.captionsEnabled ?? null,
    }),

  async stats(eventId: string): Promise<PhotoStats | null> {
    const rows = await rpc<PhotoStats[] | null>('a41_photo_stats', { p_event_id: eventId });
    return rows?.[0] ?? null;
  },

  queue: (eventId: string, status: Exclude<PhotoStatus, 'removed'>, before?: QueuePhoto) =>
    rpc<QueuePhoto[]>('a41_photo_queue', {
      p_event: eventId,
      p_status: status,
      p_limit: 60,
      p_before: before?.created_at ?? null,
      p_before_id: before?.id ?? null,
    }),

  /** `ids` null applies to every pending photo (approve / reject only). */
  async moderate(eventId: string, ids: string[] | null, action: 'approve' | 'reject' | 'remove'): Promise<number> {
    const res = await rpc<{ updated: number; removed_paths: string[] }>('a41_moderate_photos', {
      p_event: eventId,
      p_ids: ids,
      p_action: action,
    });
    if (res.removed_paths.length) {
      await createClient().storage.from(PHOTO_BUCKET).remove(res.removed_paths).catch(() => undefined);
    }
    return res.updated;
  },

  newWallKey: (eventId: string) => rpc<string>('a41_regenerate_wall_key', { p_event_id: eventId }),
};

// ---------------------------------------------------------------------------------------------
// Live wall / album feed (cached route handler shared by every screen and phone)
// ---------------------------------------------------------------------------------------------

export function wallFeedPath(slug: string, key: string): string {
  return `/api/photowall/${encodeURIComponent(slug)}/${encodeURIComponent(key)}`;
}

export async function fetchWallFeed(slug: string, key: string, signal?: AbortSignal): Promise<WallFeed | null> {
  const res = await fetch(wallFeedPath(slug, key), { signal });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`feed ${res.status}`);
  return (await res.json()) as WallFeed;
}

export type FeedState = 'loading' | 'ready' | 'missing' | 'offline';

/** Polls the wall feed while the page is visible. `key` null keeps it idle. */
export function useWallFeed(slug: string, key: string | null, intervalMs = 5000) {
  const [feed, setFeed] = useState<WallFeed | null>(null);
  const [state, setState] = useState<FeedState>('loading');

  useEffect(() => {
    if (!key) return;
    let alive = true;
    let controller: AbortController | null = null;
    const load = () => {
      if (document.visibilityState !== 'visible') return;
      controller?.abort();
      controller = new AbortController();
      fetchWallFeed(slug, key, controller.signal)
        .then((data) => {
          if (!alive) return;
          setFeed(data);
          setState(data ? 'ready' : 'missing');
        })
        .catch((e: unknown) => {
          if (!alive || (e instanceof DOMException && e.name === 'AbortError')) return;
          setState((s) => (s === 'ready' ? s : 'offline'));
        });
    };
    load();
    const timer = window.setInterval(load, intervalMs);
    document.addEventListener('visibilitychange', load);
    return () => {
      alive = false;
      controller?.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [slug, key, intervalMs]);

  return { feed, state: key ? state : ('missing' as FeedState) };
}

/** Feed photos in the shape the Pinterest masonry wall draws. */
export function feedToUploads(photos: WallPhoto[], eventId = ''): PhotoWallUpload[] {
  return photos.map((p) => ({
    id: p.id,
    event_id: eventId,
    guest_id: '',
    media_type: 'image',
    image_url: p.url,
    video_url: null,
    thumbnail_url: null,
    filter_used: null,
    frame_used: null,
    caption: p.caption,
    is_approved: true,
    created_at: p.approved_at,
    guest: p.name ? { id: '', name: p.name, table_number: null } : undefined,
  }));
}
