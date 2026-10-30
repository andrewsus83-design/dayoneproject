'use client';

import { createClient } from '@/lib/supabase/client';
import type { OrgEventRow } from '@/lib/events';
import {
  cacheOrgEvents, deleteAsset, isSavedVersion, markSavedVersion, readAsset, readEventConfig, readSyncState, replaceEventConfig,
  type EventConfig, type SyncState,
} from '@/lib/eventStore';
import { COLUMNS, readable, venueTimestamp } from '@/lib/orgEvents';

const BUCKET = 'a41_event_assets';

/** What guests may see. Register desk access, game answers and broadcasts stay with the organizers. */
const PUBLIC_SECTIONS = ['info', 'landing', 'design', 'invitation', 'policy'] as const;

const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' };

/** Images added in the builder are kept on this device as "asset:<id>" until they are uploaded. */
function collectAssets(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    if (value.startsWith('asset:')) out.add(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectAssets(v, out));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => collectAssets(v, out));
  }
  return out;
}

function swapAssets<T>(value: T, urls: Map<string, string>): T {
  if (typeof value === 'string') return (urls.get(value) ?? value) as T;
  if (Array.isArray(value)) return value.map((v) => swapAssets(v, urls)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, swapAssets(v, urls)])) as T;
  }
  return value;
}

async function uploadAssets(eventId: string, refs: Set<string>): Promise<Map<string, string>> {
  const storage = createClient().storage.from(BUCKET);
  const urls = new Map<string, string>();
  for (const ref of refs) {
    const dataUrl = readAsset(ref);
    // An image this device no longer has cannot be published; leave that spot empty.
    if (!dataUrl) {
      urls.set(ref, '');
      continue;
    }
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${eventId}/${ref.slice('asset:'.length)}.${EXT[blob.type] ?? 'webp'}`;
    const { error } = await storage.upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
    if (error && !/exists/i.test(error.message)) throw new Error(`An image could not be uploaded: ${error.message}`);
    urls.set(ref, storage.getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

type ServerRow = OrgEventRow & { config?: Partial<EventConfig>; saved_at: string | null };

/** Someone saved the event after this device last loaded it, so saving now would overwrite their work. */
export class SaveConflictError extends Error {
  /** The server's saved_at of that newer version. */
  readonly savedIso: string;

  constructor(savedIso: string) {
    super('A teammate saved a newer version of this event.');
    this.name = 'SaveConflictError';
    this.savedIso = savedIso;
  }
}

/**
 * Puts the server copy on this device when it differs from what this device last saved or loaded,
 * unless this device has changes of its own that are not saved yet (discard drops them). Day-of results
 * recorded on this device (winners, draws) are kept either way.
 */
function applyServerCopy(row: OrgEventRow, config: Partial<EventConfig> | null | undefined, savedIso: string | null, discard = false) {
  cacheOrgEvents([row], true);
  if (!savedIso || !config?.info) return;
  const state = readSyncState(row.id);
  if (!discard && isSavedVersion(state, savedIso)) {
    // Older versions of the app kept only a rounded time; remember the exact one for the next save.
    if (!state.savedIso) markSavedVersion(row.id, savedIso);
    return;
  }
  if (!discard && state.unsaved) return;
  replaceEventConfig(row.id, config as Partial<EventConfig> & Pick<EventConfig, 'info'>, savedIso, true);
}

function splitRow({ config, saved_at, ...row }: ServerRow) {
  return { row: row as OrgEventRow, config, savedAt: saved_at };
}

/** Why a save matched no row: someone saved a newer version, or this account may not edit the event. */
async function whyNotSaved(eventId: string, before: SyncState, force: boolean): Promise<Error> {
  const { data } = await createClient().from('a41_events').select('saved_at').eq('id', eventId).maybeSingle();
  if (!data) return new Error('This event was not found. It may have been deleted, or your account no longer has access.');
  const savedIso = (data as { saved_at: string | null }).saved_at;
  if (!force && savedIso && !isSavedVersion(before, savedIso)) return new SaveConflictError(savedIso);
  return new Error('Your account cannot save this event. Ask the event owner for edit access.');
}

export interface SaveOptions {
  /** Publish or unpublish in the same save. Left out, the event keeps its status. */
  status?: 'draft' | 'published';
  /** Save over a newer version someone else saved (after a SaveConflictError). */
  force?: boolean;
}

/**
 * Saves everything the builder holds to the server. A published event's pages on every phone and screen update;
 * a draft stays visible to its organizers only. The save lands only on top of the version this device last saved
 * or loaded; otherwise it throws SaveConflictError, unless force is set.
 */
export async function saveEvent(eventId: string, { status, force = false }: SaveOptions = {}): Promise<OrgEventRow> {
  const before = readSyncState(eventId);
  const local = readEventConfig(eventId);
  const urls = await uploadAssets(eventId, collectAssets(local));
  const config = swapAssets(local, urls);
  const site = Object.fromEntries(PUBLIC_SECTIONS.map((k) => [k, config[k]]));
  const { info } = config;

  let query = createClient()
    .from('a41_events')
    .update({
      config,
      site,
      ...(status ? { status } : {}),
      name: info.name.trim(),
      slug: info.slug,
      venue_name: info.venue.trim() || null,
      venue_address: info.address.trim() || null,
      starts_at: venueTimestamp(info.startDate, info.startTime),
      ends_at: venueTimestamp(info.endDate || info.startDate, info.endTime || info.startTime),
    })
    .eq('id', eventId);
  if (!force) {
    if (before.savedIso) {
      query = query.eq('saved_at', before.savedIso);
    } else if (before.savedAt !== null) {
      // Loaded by an older version of the app, which rounded the time to the millisecond.
      query = query.gte('saved_at', new Date(before.savedAt).toISOString()).lt('saved_at', new Date(before.savedAt + 1).toISOString());
    } else {
      query = query.is('saved_at', null);
    }
  }
  const { data, error } = await query.select(`${COLUMNS}, saved_at`);
  if (error) throw new Error(readable(error));
  const saved = (data as ServerRow[] | null)?.[0];
  if (!saved) throw await whyNotSaved(eventId, before, force);

  const { row, savedAt: savedIso } = splitRow(saved);
  cacheOrgEvents([row], true);
  if (!savedIso) return row;
  const after = readSyncState(eventId);
  if (after.updatedAt === before.updatedAt) {
    // This device now matches the server; winners drawn while saving stay on top of it.
    replaceEventConfig(eventId, config, savedIso, after.liveAt !== before.liveAt);
    urls.forEach((url, ref) => url && deleteAsset(ref));
  } else {
    // Edits made while saving stay unsaved, on top of the version just saved.
    markSavedVersion(eventId, savedIso);
  }
  return row;
}

/**
 * Loads a teammate's newer save onto this device (organizers, by event id). Unsaved edits on this device are kept
 * (and the server copy skipped) unless discard is set. False when the event is not found.
 */
export async function pullEvent(eventId: string, { discard = false }: { discard?: boolean } = {}): Promise<boolean> {
  const { data, error } = await createClient().from('a41_events').select(`${COLUMNS}, config, saved_at`).eq('id', eventId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return false;
  const { row, config, savedAt } = splitRow(data as ServerRow);
  applyServerCopy(row, config, savedAt, discard);
  return true;
}

/**
 * Loads an event for its public pages. Signed-in organizers and register desk staff get the full setup
 * (drafts too); everyone else gets the published page. False when there is no such live event.
 */
export async function syncEventBySlug(slug: string): Promise<boolean> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getSession();
  if (auth.session) {
    const { data } = await supabase.from('a41_events').select(`${COLUMNS}, config, saved_at`).eq('slug', slug).maybeSingle();
    if (data) {
      const { row, config, savedAt } = splitRow(data as ServerRow);
      applyServerCopy(row, config, savedAt);
      return true;
    }
  }

  const { data, error } = await supabase.rpc('a41_public_event', { p_slug: slug });
  if (error) throw new Error(error.message);
  if (!data) return false;
  const pub = data as Omit<OrgEventRow, 'status' | 'package' | 'created_at'> & { site: Partial<EventConfig>; saved_at: string | null };
  applyServerCopy(
    {
      id: pub.id, name: pub.name, slug: pub.slug, type: pub.type, timezone: pub.timezone,
      starts_at: pub.starts_at, ends_at: pub.ends_at, venue_name: pub.venue_name, venue_address: pub.venue_address,
      status: 'published', package: 'free', created_at: pub.saved_at ?? pub.starts_at,
    },
    pub.site,
    pub.saved_at,
  );
  return true;
}
