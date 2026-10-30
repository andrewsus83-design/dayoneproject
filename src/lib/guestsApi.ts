'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Guest } from '@/lib/types';

/*
 * Guests, RSVPs and check-in on the server (Supabase RPCs, see supabase/migrations/*_a41_guest_rpcs.sql).
 *
 *   Organizers (event managers): listGuests, importGuests, addGuest, updateGuest, deleteGuests, guestCounts.
 *   Register desk (managers and desk staff): checkInByToken, checkInGuest, undoCheckIn, addWalkIn, deskGuests,
 *     searchDeskGuests, checkInStats. These never return pass tokens, emails or phones.
 *   Guests (anyone): registerGuest (the invitation form), getPass (a pass by its token).
 *
 * The pass a phone holds is kept under localStorage `d1-pass-<slug>` (the token). useMyPass(slug) loads it and
 * says whether the guest is checked in, which is what the day-of screens (trivia, photo wall) need.
 */

/* ───────────────────────── Server shapes ───────────────────────── */

export type RsvpResponse = 'attending' | 'declined';

export interface ServerRsvp {
  response: RsvpResponse;
  party_size: number;
  meal_preference: string | null;
  message: string | null;
  /** The invitation form's answers, by question id. */
  answers: Record<string, string>;
  responded_at: string;
}

export interface ServerGuest {
  id: string;
  event_id: string;
  guest_number: number;
  name: string;
  email: string | null;
  /** +<country><number>, e.g. +6281234567890. */
  phone: string | null;
  table_no: string | null;
  tags: string[];
  status: 'invited' | 'sent' | 'opened' | 'rsvp' | 'checked_in';
  /** The pass token (64 hex characters); the QR code holds exactly this. */
  token: string;
  created_at: string;
  updated_at: string;
  rsvp: ServerRsvp | null;
  checked_in_at: string | null;
}

/** What the register desk sees of a guest. */
export interface DoorGuest {
  id: string;
  guest_number: number;
  name: string;
  table_no: string | null;
  tags: string[];
  checked_in_at: string | null;
  response: RsvpResponse | null;
  party_size: number | null;
}

export type CheckInOutcome = 'checked_in' | 'already_checked_in' | 'unknown' | 'other_event' | 'invalid' | 'full';

export interface CheckInCard {
  outcome: CheckInOutcome;
  checked_in_at?: string | null;
  guest?: Omit<DoorGuest, 'checked_in_at'>;
  /** other_event: the event the pass belongs to. */
  event_name?: string;
  /** invalid: which walk-in field was refused. */
  field?: 'name' | 'email' | 'phone' | 'table_no';
  /** Walk-in whose phone or email was already on the list: that guest was checked in. */
  matched?: boolean;
}

export interface CheckInStats {
  total_guests: number;
  checked_in: number;
  attending: number;
  attending_checked_in: number;
  recent: { guest_id: string; guest_number: number; name: string; table_no: string | null; checked_in_at: string }[];
}

export interface GuestInput {
  name: string;
  email?: string | null;
  /** Any format: 0812…, 62812…, +62 812…; stored as +62…. */
  phone?: string | null;
  table_no?: string | null;
  /** An array, or one comma-separated string. */
  tags?: string[] | string;
}

export type ImportSkipReason =
  | 'missing_name' | 'name_too_long' | 'invalid_email' | 'invalid_phone' | 'table_too_long' | 'duplicate' | 'conflict' | 'exists';

export interface ImportSkip {
  /** 1-based position in the rows sent. */
  row: number;
  reason: ImportSkipReason;
  name: string;
}

export type ImportResult =
  | { ok: true; inserted: number; updated: number; skipped: ImportSkip[]; guest_ids: string[]; capacity: number; total: number }
  | { ok: false; reason: 'capacity'; capacity: number; total: number; adding: number; skipped: ImportSkip[] }
  | { ok: false; reason: 'too_many'; max: number };

export interface GuestPatch {
  name?: string;
  email?: string | null;
  phone?: string | null;
  table_no?: string | null;
  tags?: string[];
  /** Records an RSVP for the guest. */
  response?: RsvpResponse;
  party_size?: number;
}

export type UpdateResult =
  | { ok: true; guest: ServerGuest }
  | { ok: false; reason: 'invalid' | 'taken' | 'not_found'; field?: string };

/** The published event, as public pages get it (a41_private.public_event_json). */
export interface PublicEvent {
  id: string;
  slug: string;
  name: string;
  type: 'corporate' | 'wedding';
  timezone: string;
  starts_at: string;
  ends_at: string;
  venue_name: string | null;
  venue_address: string | null;
  theme: Record<string, unknown>;
  site: Record<string, unknown>;
  saved_at: string | null;
}

export interface GuestPass {
  token: string;
  guest: { name: string; guest_number: number; table_no: string | null; tags: string[] };
  event: PublicEvent;
  rsvp: { response: RsvpResponse; party_size: number; responded_at: string } | null;
  checked_in_at: string | null;
}

export interface RegisterInput {
  name: string;
  email?: string;
  phone?: string;
  attending: boolean;
  partySize: number;
  /** The form's answers, by question id. */
  answers: Record<string, string>;
  message?: string;
  /** The pass this phone already holds for the event, so a second reply updates the same guest. */
  token?: string | null;
}

export type RegisterFailure = 'not_found' | 'closed' | 'paused' | 'not_open' | 'full' | 'invalid' | 'rate_limited';

export type RegisterResult =
  | {
      ok: true;
      stored: true;
      token: string;
      guest_number: number;
      name: string;
      table_no: string | null;
      response: RsvpResponse;
      party_size: number;
      created: boolean;
    }
  /** A decline from someone new when the list is full: nothing to store, the closing screen still shows. */
  | { ok: true; stored: false; response: 'declined' }
  /**
   * The email or phone belongs to a guest already on the list, and this phone doesn't hold their pass. Nothing was
   * changed; the pass went to that guest's own email ('email') or there was no email to send it to ('none').
   */
  | { ok: true; stored: false; reason: 'already_registered'; sent: 'email' | 'none' }
  | { ok: false; reason: RegisterFailure; field?: string };

export interface GuestCounts {
  event_id: string;
  guests: number;
  checked_in: number;
  /** Attending people (party sizes added up). */
  attending: number;
  capacity: number;
}

/* ───────────────────────── Helpers ───────────────────────── */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Saved events have server ids (uuids); the built-in samples ("evt-…") keep their guests on this device. */
export function isServerEventId(eventId: string): boolean {
  return UUID.test(eventId);
}

/** A scanned or pasted pass: the bare token, or a pass link (…/pass?t=<token>). */
export function parsePassToken(raw: string): string {
  const text = raw.trim();
  const match = text.match(/[?&]t=([^&#\s]+)/);
  if (match) {
    try {
      return decodeURIComponent(match[1]).trim();
    } catch {
      return match[1].trim();
    }
  }
  return text;
}

/** Server pass tokens are 64 characters; people see (and read out) the first eight. The QR holds the whole token. */
export function passCode(token: string): string {
  return token.length > 16 ? token.slice(0, 8).toUpperCase() : token;
}

/** The "Phone or email" field of the Add form. */
export function splitContact(contact: string): { email: string | null; phone: string | null } {
  const value = contact.trim();
  if (!value) return { email: null, phone: null };
  return value.includes('@') ? { email: value, phone: null } : { email: null, phone: value };
}

/** Readable text for an import row the server refused. */
export const SKIP_REASONS: Record<ImportSkipReason, string> = {
  missing_name: 'no name',
  name_too_long: 'name longer than 160 characters',
  invalid_email: 'email not valid',
  invalid_phone: 'phone number not valid',
  table_too_long: 'table longer than 20 characters',
  duplicate: 'repeats an earlier row',
  conflict: 'email and phone belong to two different guests',
  exists: 'already on the list',
};

function readable(error: PostgrestError): string {
  if (error.message.includes('guest_capacity_exceeded')) {
    return 'The guest list is full for this package. Ask the platform admin to raise it.';
  }
  if (error.code === '42501' || /forbidden|permission denied/i.test(error.message)) {
    return "Your account can't do that for this event.";
  }
  if (/Failed to fetch|NetworkError|network/i.test(error.message)) return 'No connection. Check the internet and try again.';
  return error.details || error.message;
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await createClient().rpc(fn, args);
  if (error) throw new Error(readable(error));
  return data as T;
}

/** The server guest as the screens use it (see the Guest type). */
export function toGuest(g: ServerGuest): Guest {
  const attending = g.rsvp?.response === 'attending';
  return {
    id: g.id,
    event_id: g.event_id,
    name: g.name,
    email: g.email,
    phone: g.phone,
    category: g.tags[0] ?? '',
    tags: g.tags,
    table_number: g.table_no,
    plus_one_count: attending ? Math.max(0, g.rsvp!.party_size - 1) : 0,
    party_size: attending ? g.rsvp!.party_size : 0,
    rsvp_status: g.rsvp?.response ?? 'pending',
    rsvp_notes: g.rsvp?.message ?? null,
    responded_at: g.rsvp?.responded_at ?? null,
    custom_fields: g.rsvp?.answers ?? {},
    qr_code_token: g.token,
    guest_number: g.guest_number,
    is_checked_in: !!g.checked_in_at,
    checked_in_at: g.checked_in_at,
    checked_in_by: null,
    photos_uploaded_count: 0,
    emails_sent_count: 0,
    whatsapp_sent_count: 0,
    created_at: g.created_at,
    updated_at: g.updated_at,
  };
}

/* ───────────────────────── Organizers ───────────────────────── */

export async function listGuests(eventId: string): Promise<{ guests: Guest[]; capacity: number; packageTier: string }> {
  const data = await rpc<{ capacity: number; package: string; guests: ServerGuest[] } | null>('a41_guest_list', { p_event: eventId });
  if (!data) throw new Error('This event was not found.');
  return { guests: data.guests.map(toGuest), capacity: data.capacity, packageTier: data.package };
}

/** Adds or updates many guests in one go (CSV/XLSX import). Matching email or phone updates that guest. */
export async function importGuests(eventId: string, rows: GuestInput[], updateExisting = true): Promise<ImportResult> {
  const result = await rpc<ImportResult>('a41_import_guests', { p_event: eventId, p_rows: rows, p_update_existing: updateExisting });
  void refreshGuestList(eventId);
  return result;
}

/** Adds one guest; a guest whose email or phone is already on the list is reported as "exists". */
export function addGuest(eventId: string, guest: GuestInput): Promise<ImportResult> {
  return importGuests(eventId, [guest], false);
}

export async function updateGuest(eventId: string, guestId: string, patch: GuestPatch): Promise<UpdateResult> {
  const result = await rpc<UpdateResult>('a41_update_guest', { p_guest: guestId, p_patch: patch });
  if (result.ok) patchCachedGuest(eventId, toGuest(result.guest));
  return result;
}

export async function deleteGuests(eventId: string, ids: string[]): Promise<number> {
  const result = await rpc<{ ok: boolean; deleted: number }>('a41_delete_guests', { p_event: eventId, p_ids: ids });
  const gone = new Set(ids);
  const cur = lists.get(eventId);
  if (cur) setList(eventId, { guests: cur.guests.filter((g) => !gone.has(g.id)) });
  return result.deleted;
}

/** Guest and check-in counts for every event the signed-in user can open, by event id. */
export async function guestCounts(): Promise<Record<string, GuestCounts>> {
  const rows = await rpc<GuestCounts[]>('a41_guest_counts', {});
  return Object.fromEntries((rows ?? []).map((r) => [r.event_id, r]));
}

/* ───────────────────────── Register desk ───────────────────────── */

export function checkInByToken(eventId: string, token: string): Promise<CheckInCard> {
  return rpc<CheckInCard>('a41_check_in_by_token', { p_event: eventId, p_token: parsePassToken(token) });
}

export function checkInGuest(eventId: string, guestId: string): Promise<CheckInCard> {
  return rpc<CheckInCard>('a41_check_in_guest', { p_event: eventId, p_guest: guestId });
}

export function undoCheckIn(eventId: string, guestId: string): Promise<{ ok: true; guest: DoorGuest } | { ok: false; reason: 'not_found' }> {
  return rpc('a41_undo_check_in', { p_event: eventId, p_guest: guestId });
}

export function addWalkIn(
  eventId: string,
  walkIn: { name: string; phone?: string; email?: string; table_no?: string; tags?: string[] },
): Promise<CheckInCard> {
  return rpc<CheckInCard>('a41_add_walk_in', {
    p_event: eventId,
    p_name: walkIn.name,
    p_phone: walkIn.phone || null,
    p_email: walkIn.email || null,
    p_table_no: walkIn.table_no || null,
    p_tags: walkIn.tags?.length ? walkIn.tags : null,
  });
}

export async function deskGuests(eventId: string): Promise<DoorGuest[]> {
  return (await rpc<DoorGuest[]>('a41_desk_guests', { p_event: eventId })) ?? [];
}

/** By name, guest number ("12", "#12"), full email or 6+ digits of the phone. Up to 20. */
export async function searchDeskGuests(eventId: string, query: string): Promise<DoorGuest[]> {
  return (await rpc<DoorGuest[]>('a41_search_checkin_guests', { p_event: eventId, p_query: query })) ?? [];
}

export function checkInStats(eventId: string, recent = 8): Promise<CheckInStats> {
  return rpc<CheckInStats>('a41_checkin_stats', { p_event: eventId, p_recent: recent });
}

/* ───────────────────────── Guests ───────────────────────── */

/** Sends the public invitation form. On success the reply's pass is remembered on this phone. */
export async function registerGuest(slug: string, input: RegisterInput): Promise<RegisterResult> {
  const result = await rpc<RegisterResult>('a41_register', {
    p_slug: slug,
    p_name: input.name,
    p_email: input.email || null,
    p_phone: input.phone || null,
    p_attending: input.attending,
    p_party_size: input.attending ? input.partySize : 1,
    p_answers: input.answers,
    p_message: input.message || null,
    p_token: input.token || null,
  });
  if (result.ok && result.stored) storePass(slug, result.token);
  return result;
}

/** The pass behind a token, or null when there is no such pass (or the event is not published). */
export function getPass(token: string): Promise<GuestPass | null> {
  return rpc<GuestPass | null>('a41_guest_pass', { p_token: parsePassToken(token) });
}

/* ───────────────────────── The pass on this phone ───────────────────────── */

export const passKey = (slug: string) => `d1-pass-${slug}`;

const passListeners = new Set<() => void>();
function emitPass() {
  passListeners.forEach((l) => l());
}
function subscribePass(cb: () => void) {
  passListeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith('d1-pass-')) cb();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    passListeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

/** A tab of the guest app at /events/<slug>/pass (the QR pass opens first). */
export type GuestTab = 'event' | 'activity' | 'qr' | 'prize' | 'setting';

/** The guest app on a tab; the trivia, photo wall, door prize and feedback pages link back with this. */
export function guestAppPath(slug: string, tab: GuestTab = 'qr'): string {
  return tab === 'qr' ? `/events/${slug}/pass` : `/events/${slug}/pass?tab=${tab}`;
}

export function readStoredPass(slug: string): string | null {
  try {
    return localStorage.getItem(passKey(slug));
  } catch {
    return null;
  }
}

export function storePass(slug: string, token: string) {
  try {
    localStorage.setItem(passKey(slug), token);
  } catch {}
  emitPass();
}

export function forgetPass(slug: string) {
  try {
    localStorage.removeItem(passKey(slug));
  } catch {}
  emitPass();
}

/** The pass token saved on this phone for the event (null before hydration or when there is none). */
export function useStoredPass(slug: string): string | null {
  return useSyncExternalStore(subscribePass, () => readStoredPass(slug), () => null);
}

interface PassState {
  token: string | null;
  pass: GuestPass | null;
  /** none: no token; missing: the server does not know it; error: could not ask. */
  status: 'none' | 'loading' | 'ready' | 'missing' | 'error';
  loadedAt: number;
}

const passes = new Map<string, PassState>();
const passInflight = new Map<string, Promise<void>>();

function loadPass(token: string): Promise<void> {
  const running = passInflight.get(token);
  if (running) return running;
  const p = getPass(token)
    .then((pass) => {
      passes.set(token, { token, pass, status: pass ? 'ready' : 'missing', loadedAt: Date.now() });
    })
    .catch(() => {
      const prev = passes.get(token);
      passes.set(token, { token, pass: prev?.pass ?? null, status: prev?.pass ? 'ready' : 'error', loadedAt: Date.now() });
    })
    .finally(() => {
      passInflight.delete(token);
      emitPass();
    });
  passInflight.set(token, p);
  return p;
}

/**
 * The guest on this phone: the pass saved by the invitation form (or opened from a pass link), loaded from the
 * server. `checkedIn` is what trivia, the photo wall and the door prize gate on. Pass a token to look at that
 * pass instead of the saved one. pollMs keeps it fresh (e.g. the pass page waiting for the door).
 */
export function useMyPass(slug: string, opts: { token?: string | null; pollMs?: number } = {}) {
  const stored = useStoredPass(slug);
  const token = opts.token || stored;
  const state = useSyncExternalStore(
    subscribePass,
    () => (token ? passes.get(token) : undefined),
    () => undefined,
  );
  const pollMs = opts.pollMs ?? 0;

  useEffect(() => {
    if (!token) return;
    const cur = passes.get(token);
    if (!cur || Date.now() - cur.loadedAt > 15_000) void loadPass(token);
    if (!pollMs) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void loadPass(token);
    }, pollMs);
    return () => clearInterval(t);
  }, [token, pollMs]);

  const refresh = useCallback(() => (token ? loadPass(token) : Promise.resolve()), [token]);
  const status: PassState['status'] = !token ? 'none' : state?.status ?? 'loading';
  const pass = state?.pass ?? null;
  return { token, pass, status, checkedIn: !!pass?.checked_in_at, refresh };
}

/* ───────────────────────── The guest list, shared by every screen ───────────────────────── */

export interface GuestListState {
  guests: Guest[];
  /** Package limit (guests allowed), once loaded. */
  capacity: number | null;
  packageTier: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  loadedAt: number;
}

const IDLE: GuestListState = { guests: [], capacity: null, packageTier: null, status: 'idle', error: null, loadedAt: 0 };
const STALE_MS = 30_000;
const lists = new Map<string, GuestListState>();
const inflight = new Map<string, Promise<void>>();
const listListeners = new Set<() => void>();

function setList(eventId: string, patch: Partial<GuestListState>) {
  lists.set(eventId, { ...(lists.get(eventId) ?? IDLE), ...patch });
  listListeners.forEach((l) => l());
}

function subscribeLists(cb: () => void) {
  listListeners.add(cb);
  return () => {
    listListeners.delete(cb);
  };
}

/** Reloads an event's guest list from the server; every screen showing it updates. */
export function refreshGuestList(eventId: string): Promise<void> {
  const running = inflight.get(eventId);
  if (running) return running;
  if ((lists.get(eventId) ?? IDLE).status === 'idle') setList(eventId, { status: 'loading' });
  const p = listGuests(eventId)
    .then((r) => setList(eventId, { guests: r.guests, capacity: r.capacity, packageTier: r.packageTier, status: 'ready', error: null, loadedAt: Date.now() }))
    .catch((e) => setList(eventId, { status: 'error', error: e instanceof Error ? e.message : 'Could not load the guests.', loadedAt: Date.now() }))
    .finally(() => inflight.delete(eventId));
  inflight.set(eventId, p);
  return p;
}

/** The last loaded list (empty until a screen has loaded it). */
export function cachedGuests(eventId: string): Guest[] {
  return (lists.get(eventId) ?? IDLE).guests;
}

export function patchCachedGuest(eventId: string, guest: Guest) {
  const cur = lists.get(eventId);
  if (!cur) return;
  const found = cur.guests.some((g) => g.id === guest.id);
  setList(eventId, { guests: found ? cur.guests.map((g) => (g.id === guest.id ? guest : g)) : [...cur.guests, guest] });
}

/**
 * The server guest list of a saved event (pass null for sample events). Loads on first use, is shared by every
 * component on the page, and reloads every pollMs while the page is visible.
 */
export function useServerGuestList(eventId: string | null, pollMs = 0) {
  const state = useSyncExternalStore(
    subscribeLists,
    () => (eventId ? lists.get(eventId) ?? IDLE : IDLE),
    () => IDLE,
  );

  useEffect(() => {
    if (!eventId) return;
    const cur = lists.get(eventId);
    if (!cur || Date.now() - cur.loadedAt > STALE_MS) void refreshGuestList(eventId);
    if (!pollMs) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshGuestList(eventId);
    }, pollMs);
    return () => clearInterval(t);
  }, [eventId, pollMs]);

  const refresh = useCallback(() => (eventId ? refreshGuestList(eventId) : Promise.resolve()), [eventId]);
  return { ...state, refresh };
}
