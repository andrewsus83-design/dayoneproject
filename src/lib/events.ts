import {
  MOCK_EVENT,
  MOCK_WEDDING_EVENT,
  MOCK_CORPORATE_NEXUS_EVENT,
  MOCK_WEDDING_BALI_EVENT,
  MOCK_POPVERSE_EVENT,
} from './mockData';
import { Event } from './types';

export const BASE_EVENTS: Event[] = [
  MOCK_EVENT,
  MOCK_CORPORATE_NEXUS_EVENT,
  MOCK_POPVERSE_EVENT,
  MOCK_WEDDING_EVENT,
  MOCK_WEDDING_BALI_EVENT,
];

const SLUG_ALIASES: Record<string, string> = {
  nexus: MOCK_CORPORATE_NEXUS_EVENT.id,
};

export const SLUG_INDEX_KEY = 'all41-slug-index';

/** An event saved in the backend (a41_events), remembered on this device under ORG_EVENTS_KEY. */
export interface OrgEventRow {
  id: string;
  name: string;
  slug: string;
  type: 'corporate' | 'wedding';
  timezone: string;
  starts_at: string;
  ends_at: string;
  venue_name: string | null;
  venue_address: string | null;
  status: 'draft' | 'published' | 'archived';
  package: string;
  created_at: string;
}

export const ORG_EVENTS_KEY = 'all41-org-events';

function readStored<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

/** The app keeps wall-clock times ("09:00" at the venue), so convert the stored instant into the event's time zone. */
function wallClock(iso: string, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`;
}

/** A backend event shown with the default corporate or wedding template until the organizer edits it. */
export function eventFromRow(row: OrgEventRow): Event {
  const template = row.type === 'wedding' ? MOCK_WEDDING_EVENT : MOCK_EVENT;
  return {
    ...template,
    id: row.id,
    organization_id: '',
    name: row.name,
    slug: row.slug,
    description: '',
    event_type: row.type,
    start_date: wallClock(row.starts_at, row.timezone),
    end_date: wallClock(row.ends_at, row.timezone),
    location_name: row.venue_name ?? '',
    location_address: row.venue_address ?? '',
    location_maps_url: null,
    custom_domain: null,
    status: row.status === 'published' ? 'active' : 'draft',
    extra_guests_purchased: 0,
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

/**
 * Pass `saved` from a hook (null until hydrated) so server and client render the same thing;
 * plain callers leave it out and read this device's copy directly.
 */
export function getBaseEvent(eventId: string, saved: Record<string, OrgEventRow> | null = readStored(ORG_EVENTS_KEY)): Event {
  const found = BASE_EVENTS.find((e) => e.id === eventId);
  if (found) return found;
  const row = saved?.[eventId];
  if (row) return eventFromRow(row);
  // Unknown ids start from the default template.
  return { ...MOCK_EVENT, id: eventId };
}

function readSlugIndex(): Record<string, string> {
  return readStored<Record<string, string>>(SLUG_INDEX_KEY) ?? {};
}

function savedEventWithSlug(slug: string): OrgEventRow | undefined {
  return Object.values(readStored<Record<string, OrgEventRow>>(ORG_EVENTS_KEY) ?? {}).find((r) => r.slug === slug);
}

/** Built-in sample events (they never come from the server). */
export function isSampleSlug(slug: string): boolean {
  return BASE_EVENTS.some((e) => e.slug === slug) || slug in SLUG_ALIASES;
}

/** True once this device knows an event with this link (created here, opened before, or loaded from the server). */
export function hasLocalEvent(slug: string): boolean {
  return !!readSlugIndex()[slug] || !!savedEventWithSlug(slug);
}

export function resolveEventIdFromSlug(slug: string, useIndex = true): string {
  const custom = useIndex ? readSlugIndex()[slug] ?? savedEventWithSlug(slug)?.id : undefined;
  if (custom) return custom;
  const base = BASE_EVENTS.find((e) => e.slug === slug);
  if (base) return base.id;
  return SLUG_ALIASES[slug] ?? MOCK_EVENT.id;
}

export function isSlugTaken(slug: string, ownEventId: string): boolean {
  if (BASE_EVENTS.some((e) => e.slug === slug && e.id !== ownEventId)) return true;
  const saved = savedEventWithSlug(slug);
  if (saved && saved.id !== ownEventId) return true;
  const owner = readSlugIndex()[slug];
  return !!owner && owner !== ownEventId;
}
