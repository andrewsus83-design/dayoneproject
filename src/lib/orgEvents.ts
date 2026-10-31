'use client';

import type { PostgrestError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { cacheOrgEvents, forgetOrgEvent } from '@/lib/eventStore';
import type { OrgEventRow } from '@/lib/events';

export const COLUMNS = 'id, name, slug, type, timezone, starts_at, ends_at, venue_name, venue_address, status, package, created_at';

export const EVENT_TIMEZONE = 'Asia/Jakarta';
const TIMEZONE_OFFSET = '+07:00';

/** Same rule as the database: 3–40 lowercase letters, numbers and single dashes. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RESERVED_SLUGS = new Set([
  'www', 'app', 'api', 'admin', 'auth', 'login', 'signup', 'dashboard', 'mail', 'email', 'smtp', 'support', 'help',
  'status', 'billing', 'pay', 'static', 'assets', 'cdn', 'docs', 'blog', 'info', 'staging', 'preview',
]);

export function slugProblem(slug: string): string | null {
  if (slug.length < 3 || slug.length > 40) return 'The event link needs 3 to 40 characters.';
  if (!SLUG_PATTERN.test(slug)) return 'Use lowercase letters, numbers and single dashes in the event link.';
  if (RESERVED_SLUGS.has(slug)) return 'That event link is reserved. Try another one.';
  return null;
}

export function readable(error: PostgrestError): string {
  if (error.code === '23505') return 'That event link is already taken. Try another one.';
  if (error.message.includes('free_event_limit')) {
    return 'Your account includes one active free event. Ask your dayoneproject.xyz admin to upgrade it before you add another.';
  }
  if (error.message.includes('a41_events_check')) return 'The event must end after it starts.';
  if (error.message.includes('a41_events_name_check')) return 'Give the event a name (up to 160 characters).';
  if (error.code === '42501') return 'Your account cannot create events. Ask your account owner to add you as an admin organizer.';
  return error.details || error.message;
}

/** Events of the organizations you belong to (the database only returns those). */
export async function listOrgEvents(): Promise<OrgEventRow[]> {
  const { data, error } = await createClient().from('a41_events').select(COLUMNS).neq('status', 'archived').order('starts_at');
  if (error) throw new Error(readable(error));
  const rows = (data ?? []) as OrgEventRow[];
  cacheOrgEvents(rows);
  return rows;
}

export interface NewEventInput {
  name: string;
  slug: string;
  type: 'corporate' | 'wedding';
  /** Wall-clock at the venue: YYYY-MM-DD and HH:mm. */
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  venueName: string;
  venueAddress: string;
}

export async function createOrgEvent(input: NewEventInput): Promise<OrgEventRow> {
  const supabase = createClient();
  const { data: orgId, error: orgError } = await supabase.rpc('a41_my_org');
  if (orgError || !orgId) throw new Error('Could not find your organization. Sign in again and retry.');

  const { data, error } = await supabase
    .from('a41_events')
    .insert({
      org_id: orgId,
      name: input.name,
      slug: input.slug,
      type: input.type,
      timezone: EVENT_TIMEZONE,
      starts_at: venueTimestamp(input.startDate, input.startTime),
      ends_at: venueTimestamp(input.endDate, input.endTime),
      venue_name: input.venueName || null,
      venue_address: input.venueAddress || null,
    })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(readable(error));
  const row = data as OrgEventRow;
  cacheOrgEvents([row], true);
  return row;
}

/** Keeps the backend copy in step when the organizer edits name, link, date or venue. */
export async function updateOrgEvent(
  id: string,
  patch: Partial<Pick<NewEventInput, 'name' | 'slug' | 'venueName' | 'venueAddress'>> & { startsAt?: string; endsAt?: string },
): Promise<OrgEventRow> {
  const values: Record<string, string | null> = {};
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.slug !== undefined) values.slug = patch.slug;
  if (patch.venueName !== undefined) values.venue_name = patch.venueName || null;
  if (patch.venueAddress !== undefined) values.venue_address = patch.venueAddress || null;
  if (patch.startsAt !== undefined) values.starts_at = patch.startsAt;
  if (patch.endsAt !== undefined) values.ends_at = patch.endsAt;
  const { data, error } = await createClient().from('a41_events').update(values).eq('id', id).select(COLUMNS).single();
  if (error) throw new Error(readable(error));
  const row = data as OrgEventRow;
  cacheOrgEvents([row], true);
  return row;
}

/**
 * Publishes or unpublishes an event without touching its saved setup (saved_at stays, so nobody's next save
 * conflicts). Guests can open published events only.
 */
export async function setOrgEventStatus(id: string, status: 'draft' | 'published'): Promise<OrgEventRow> {
  const { data, error } = await createClient().from('a41_events').update({ status }).eq('id', id).select(COLUMNS);
  if (error) throw new Error(readable(error));
  const row = (data as OrgEventRow[] | null)?.[0];
  if (!row) throw new Error('Your account cannot publish this event. Ask the event owner.');
  cacheOrgEvents([row], true);
  return row;
}

/**
 * Deletes an event and everything in it (guests, replies, door prizes, games, screens, messages). The database lets
 * only the account owner delete, and only events on the Free package. Photo wall files go with the nightly cleanup.
 */
export async function deleteOrgEvent(id: string): Promise<void> {
  const ownerOnly = 'Only the account owner can delete this event, and only while it is on the Free package.';
  const { data, error } = await createClient().from('a41_events').delete().eq('id', id).select('id');
  if (error) throw new Error(error.code === '42501' ? ownerOnly : readable(error));
  if (!data?.length) throw new Error(ownerOnly);
  forgetOrgEvent(id);
}

/** Wall-clock date + time at the venue as a timestamp the database understands. */
export function venueTimestamp(date: string, time: string): string {
  return `${date}T${time || '00:00'}:00${TIMEZONE_OFFSET}`;
}
