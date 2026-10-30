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

export function getBaseEvent(eventId: string): Event {
  const found = BASE_EVENTS.find((e) => e.id === eventId);
  if (found) return found;
  // Events created in the studio don't exist in mock data yet; they start from the default template.
  return { ...MOCK_EVENT, id: eventId };
}

function readSlugIndex(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(SLUG_INDEX_KEY) || '{}');
  } catch {
    return {};
  }
}

export function resolveEventIdFromSlug(slug: string, useIndex = true): string {
  const custom = useIndex ? readSlugIndex()[slug] : undefined;
  if (custom) return custom;
  const base = BASE_EVENTS.find((e) => e.slug === slug);
  if (base) return base.id;
  return SLUG_ALIASES[slug] ?? MOCK_EVENT.id;
}

export function isSlugTaken(slug: string, ownEventId: string): boolean {
  if (BASE_EVENTS.some((e) => e.slug === slug && e.id !== ownEventId)) return true;
  const owner = readSlugIndex()[slug];
  return !!owner && owner !== ownEventId;
}
