import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { Event, Guest } from './types';
import { getBaseEvent, resolveEventIdFromSlug, SLUG_INDEX_KEY } from './events';
import { MOCK_GUESTS } from './mockData';

/* ───────────────────────── Types ───────────────────────── */

export type QuestionType = 'text' | 'long_text' | 'yes_no' | 'multiple' | 'number' | 'email' | 'phone';
export type QuestionRole = 'name' | 'attending' | 'party' | 'email' | 'phone';

export interface FormQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  role?: QuestionRole;
}

export interface EventInfo {
  name: string;
  slug: string;
  venue: string;
  address: string;
  city: string;
  mapsUrl: string;
  capacity: number;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

export interface Testimony {
  id: string;
  name: string;
  role: string;
  text: string;
  rating: number;
}

export interface LandingConfig {
  heroUrl: string;
  heroOverlay: boolean;
  badge: string;
  subtitle: string;
  ctaLabel: string;
  ctaSub: string;
  galleryOn: boolean;
  gallery: { id: string; url: string }[];
  testimoniesOn: boolean;
  testimonies: Testimony[];
  notesOn: boolean;
  notesText: string;
  dressCode: string;
}

export type ThemeMode = 'dark' | 'light';
export type CardStyleId = 'minimal' | 'bordered' | 'elevated' | 'glass';
export type RadiusId = 'sharp' | 'medium' | 'round' | 'pill';

export interface DesignConfig {
  mode: ThemeMode;
  background: string;
  palette: string;
  customPrimary: string;
  customAccent: string;
  headingFont: string;
  bodyFont: string;
  cardStyle: CardStyleId;
  radius: RadiusId;
}

export interface ClosingCopy {
  heading: string;
  message: string;
  smallPrint: string;
}

export interface InvitationConfig {
  theme: string;
  heading: string;
  subtitle: string;
  message: string;
  startLabel: string;
  startNote: string;
  photoUrl: string;
  questions: FormQuestion[];
  confirmed: ClosingCopy;
  declined: ClosingCopy;
  closed: ClosingCopy;
  showTicket: boolean;
  showCalendar: boolean;
  showDirections: boolean;
  showContact: boolean;
  contactPhone: string;
  contactEmail: string;
  extraLabel: string;
  extraUrl: string;
  formName: string;
  accepting: boolean;
  replyBy: string;
  guestLimit: string;
  maxPerReply: string;
  askReview: boolean;
  sendLabel: string;
}

export interface AccessConfig {
  username: string;
  passcode: string;
}

export interface PolicyConfig {
  customDomain: string;
  terms: string;
  privacy: string;
}

export interface EventConfig {
  info: EventInfo;
  landing: LandingConfig;
  design: DesignConfig;
  invitation: InvitationConfig;
  access: AccessConfig;
  policy: PolicyConfig;
}

export type EventSection = keyof EventConfig;
type StoredConfig = { [K in EventSection]?: Partial<EventConfig[K]> } & { updatedAt?: number };

export interface FormResponse {
  id: string;
  submittedAt: string;
  answers: Record<string, string>;
  name: string;
  email: string;
  phone: string;
  attending: boolean;
  party: number;
  token: string;
}

/* ───────────────────────── Storage keys ───────────────────────── */

export const eventKey = (id: string) => `all41-event-${id}`;
export const responsesKey = (id: string) => `all41-responses-${id}`;
export const guestsKey = (id: string) => `all41-guests-${id}`;
const assetKey = (id: string) => `all41-asset-${id}`;

/* ───────────────────────── Defaults ───────────────────────── */

const CITY_BY_EVENT: Record<string, string> = {
  'evt-techunite-2026': 'Jakarta',
  'evt-nexus-innovation-2026': 'Singapore',
  'evt-popverse-converge-2026': 'Makati City',
  'evt-aria-daniel-2026': 'Bali',
  'evt-sophia-marco-2026': 'Bali',
};

export const ESSENTIALS_WEDDING: FormQuestion[] = [
  { id: 'q-name', type: 'text', label: 'What is your full name?', required: true, role: 'name' },
  { id: 'q-attending', type: 'yes_no', label: 'Will you be joining us?', required: true, role: 'attending' },
  { id: 'q-party', type: 'number', label: 'How many will be attending, including you?', required: true, role: 'party' },
  { id: 'q-email', type: 'email', label: 'Your email address', required: false, role: 'email' },
  { id: 'q-phone', type: 'phone', label: 'Your mobile number', required: false, role: 'phone' },
];

export const ESSENTIALS_CORPORATE: FormQuestion[] = [
  { id: 'q-name', type: 'text', label: 'Full name', required: true, role: 'name' },
  { id: 'q-company', type: 'text', label: 'Company / Organization', required: true },
  { id: 'q-title', type: 'text', label: 'Designation / Job Title', required: true },
  { id: 'q-email', type: 'email', label: 'Work email address', required: true, role: 'email' },
  { id: 'q-phone', type: 'phone', label: 'Mobile number', required: false, role: 'phone' },
];

export const DEFAULT_ACCESS: AccessConfig = { username: 'admin', passcode: '414141' };

export function buildDefaults(base: Event): EventConfig {
  const isWedding = base.event_type === 'wedding';
  return {
    info: {
      name: base.name,
      slug: base.slug,
      venue: base.location_name ?? '',
      address: base.location_address ?? '',
      city: CITY_BY_EVENT[base.id] ?? '',
      mapsUrl: base.location_maps_url ?? '',
      capacity: base.guest_limit,
      description: base.description ?? '',
      startDate: base.start_date.slice(0, 10),
      startTime: base.start_date.slice(11, 16),
      endDate: base.end_date.slice(0, 10),
      endTime: base.end_date.slice(11, 16),
    },
    landing: {
      heroUrl: '',
      heroOverlay: true,
      badge: isWedding ? 'Wedding Celebration' : 'Corporate Summit',
      subtitle: '',
      ctaLabel: isWedding ? 'RSVP to Attend' : 'Register Now',
      ctaSub: 'Instant confirmation · Digital QR pass sent by email & WhatsApp',
      galleryOn: false,
      gallery: [],
      testimoniesOn: false,
      testimonies: [
        {
          id: 't1',
          name: 'Sarah Kim',
          role: isWedding ? 'Bridesmaid' : 'CEO, TechCorp',
          text: 'Absolutely outstanding — every detail was perfect.',
          rating: 5,
        },
      ],
      notesOn: false,
      notesText: isWedding
        ? '"And now these three remain: faith, hope and love. But the greatest of these is love." — 1 Corinthians 13:13'
        : '"The best way to predict the future is to create it." — Peter Drucker',
      dressCode: isWedding ? 'Black Tie — Tropical Formal' : 'Business Attire',
    },
    design: {
      mode: 'dark',
      background: '#09090B',
      palette: 'gold',
      customPrimary: base.theme_config.primaryColor || '#C5A059',
      customAccent: base.theme_config.accentColor || '#00F0FF',
      headingFont: 'outfit',
      bodyFont: 'manrope',
      cardStyle: 'elevated',
      radius: 'medium',
    },
    invitation: {
      theme: 'event',
      heading: "You're invited",
      subtitle: isWedding ? 'are getting married' : 'Guest registration',
      message: isWedding
        ? 'We would love to celebrate with you. Please let us know if you can make it. It takes about a minute.'
        : 'Reserve your seat in about a minute. Your digital QR pass is issued right after you register.',
      startLabel: isWedding ? 'RSVP now' : 'Register now',
      startNote: 'Takes about 1 minute',
      photoUrl: '',
      questions: isWedding ? ESSENTIALS_WEDDING : ESSENTIALS_CORPORATE,
      confirmed: {
        heading: 'See you there, {name}!',
        message: 'Your seat is saved for {party}. Please show this QR code at the entrance.',
        smallPrint: 'Save this ticket or take a screenshot. We will scan it at the door.',
      },
      declined: {
        heading: 'We will miss you, {name}',
        message: 'Thank you for letting us know. If your plans change, you can send the form again.',
        smallPrint: '',
      },
      closed: {
        heading: 'Replies are closed',
        message: '{event} is no longer accepting replies. Please contact the host if you need help.',
        smallPrint: '',
      },
      showTicket: true,
      showCalendar: true,
      showDirections: true,
      showContact: false,
      contactPhone: '',
      contactEmail: '',
      extraLabel: '',
      extraUrl: '',
      formName: `${isWedding ? 'RSVP' : 'Register'} · ${base.name}`,
      accepting: true,
      replyBy: '',
      guestLimit: '',
      maxPerReply: '6',
      askReview: true,
      sendLabel: isWedding ? 'Send RSVP' : 'Register Now',
    },
    access: { ...DEFAULT_ACCESS },
    policy: {
      customDomain: base.custom_domain ?? '',
      terms:
        'Attendee agrees to single-use QR admission token. Photo and video uploads are licensed for ballroom stage display.',
      privacy:
        'Data collected is solely utilized for attendee verification, ticket pass dispatch, and table seating coordination.',
    },
  };
}

function mergeConfig(defaults: EventConfig, stored: StoredConfig | null): EventConfig {
  if (!stored) return defaults;
  return {
    info: { ...defaults.info, ...stored.info },
    landing: { ...defaults.landing, ...stored.landing },
    design: { ...defaults.design, ...stored.design },
    invitation: { ...defaults.invitation, ...stored.invitation },
    access: { ...defaults.access, ...stored.access },
    policy: { ...defaults.policy, ...stored.policy },
  };
}

export function applyConfigToEvent(base: Event, config: EventConfig): Event {
  const { info, policy } = config;
  return {
    ...base,
    name: info.name,
    slug: info.slug,
    description: info.description,
    location_name: info.venue,
    location_address: info.address,
    location_maps_url: info.mapsUrl,
    guest_limit: info.capacity,
    start_date: `${info.startDate}T${info.startTime || '00:00'}:00Z`,
    end_date: `${info.endDate || info.startDate}T${info.endTime || info.startTime || '00:00'}:00Z`,
    custom_domain: policy.customDomain || null,
  };
}

/* ───────────────────────── External store ───────────────────────── */

const listeners = new Set<() => void>();
const parseCache = new Map<string, { raw: string | null; value: unknown }>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith('all41-')) cb();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

function readJSON<T>(key: string): T | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null;
  }
  const cached = parseCache.get(key);
  if (cached && cached.raw === raw) return cached.value as T | null;
  let value: T | null = null;
  try {
    value = raw ? (JSON.parse(raw) as T) : null;
  } catch {
    value = null;
  }
  parseCache.set(key, { raw, value });
  return value;
}

export interface WriteResult {
  ok: boolean;
  error?: string;
}

function writeRaw(key: string, raw: string): WriteResult {
  try {
    localStorage.setItem(key, raw);
    emit();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Browser storage is full. Remove a few photos and try again.' };
  }
}

function writeJSON(key: string, value: unknown): WriteResult {
  return writeRaw(key, JSON.stringify(value));
}

function useStoredJSON<T>(key: string): T | null {
  return useSyncExternalStore(
    subscribe,
    () => readJSON<T>(key),
    () => null,
  );
}

const noopSubscribe = () => () => {};
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/* ───────────────────────── Event config ───────────────────────── */

function updateSlugIndex(eventId: string, slug: string) {
  const index = readJSON<Record<string, string>>(SLUG_INDEX_KEY) ?? {};
  const next: Record<string, string> = {};
  for (const [s, id] of Object.entries(index)) if (id !== eventId) next[s] = id;
  const base = getBaseEvent(eventId);
  if (slug && slug !== base.slug) next[slug] = eventId;
  writeJSON(SLUG_INDEX_KEY, next);
}

export function updateEventConfig<K extends EventSection>(
  eventId: string,
  section: K,
  patch: Partial<EventConfig[K]>,
): WriteResult {
  const current = readJSON<StoredConfig>(eventKey(eventId)) ?? {};
  const next: StoredConfig = {
    ...current,
    [section]: { ...(current[section] ?? {}), ...patch },
    updatedAt: Date.now(),
  };
  if (section === 'info' && 'slug' in patch) updateSlugIndex(eventId, String((patch as Partial<EventInfo>).slug ?? ''));
  return writeJSON(eventKey(eventId), next);
}

export function resetEventSection(eventId: string, section: EventSection): WriteResult {
  const current = readJSON<StoredConfig>(eventKey(eventId)) ?? {};
  const next: StoredConfig = { ...current, updatedAt: Date.now() };
  delete next[section];
  if (section === 'info') updateSlugIndex(eventId, '');
  return writeJSON(eventKey(eventId), next);
}

export function useEventConfig(eventId: string) {
  const base = useMemo(() => getBaseEvent(eventId), [eventId]);
  const stored = useStoredJSON<StoredConfig>(eventKey(eventId));
  const config = useMemo(() => mergeConfig(buildDefaults(base), stored), [base, stored]);
  const event = useMemo(() => applyConfigToEvent(base, config), [base, config]);
  const update = useCallback(
    <K extends EventSection>(section: K, patch: Partial<EventConfig[K]>) => updateEventConfig(eventId, section, patch),
    [eventId],
  );
  return { base, config, event, update, savedAt: stored?.updatedAt ?? null };
}

export function useEventConfigBySlug(slug: string) {
  const hydrated = useHydrated();
  // The slug index lives in localStorage, so it is only consulted after hydration.
  const eventId = resolveEventIdFromSlug(slug, hydrated);
  return { eventId, hydrated, ...useEventConfig(eventId) };
}

/* ───────────────────────── Image assets ───────────────────────── */

export function saveAsset(dataUrl: string): WriteResult & { ref?: string } {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const res = writeRaw(assetKey(id), dataUrl);
  return res.ok ? { ok: true, ref: `asset:${id}` } : res;
}

export function deleteAsset(ref: string) {
  if (!ref.startsWith('asset:')) return;
  try {
    localStorage.removeItem(assetKey(ref.slice(6)));
    emit();
  } catch {}
}

function readAsset(ref: string): string {
  if (!ref) return '';
  if (!ref.startsWith('asset:')) return ref;
  try {
    return localStorage.getItem(assetKey(ref.slice(6))) ?? '';
  } catch {
    return '';
  }
}

export function useAssetUrl(ref: string | undefined): string {
  const r = ref ?? '';
  return useSyncExternalStore(
    subscribe,
    () => readAsset(r),
    () => (r.startsWith('asset:') ? '' : r),
  );
}

/* ───────────────────────── Responses & guests ───────────────────────── */

const EMPTY_RESPONSES: FormResponse[] = [];

export function useResponses(eventId: string): FormResponse[] {
  return useStoredJSON<FormResponse[]>(responsesKey(eventId)) ?? EMPTY_RESPONSES;
}

export function addResponse(eventId: string, response: FormResponse): WriteResult {
  const current = readJSON<FormResponse[]>(responsesKey(eventId)) ?? [];
  return writeJSON(responsesKey(eventId), [response, ...current]);
}

export function deleteResponse(eventId: string, id: string): WriteResult {
  const current = readJSON<FormResponse[]>(responsesKey(eventId)) ?? [];
  return writeJSON(responsesKey(eventId), current.filter((r) => r.id !== id));
}

export function useGuests(eventId: string): Guest[] {
  return useStoredJSON<Guest[]>(guestsKey(eventId)) ?? MOCK_GUESTS;
}

export function readGuests(eventId: string): Guest[] {
  return readJSON<Guest[]>(guestsKey(eventId)) ?? MOCK_GUESTS;
}

export function writeGuests(eventId: string, guests: Guest[]): WriteResult {
  return writeJSON(guestsKey(eventId), guests);
}

/* ───────────────────────── Helpers ───────────────────────── */

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function makePassToken() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `ALL41-${s}`;
}

export function findQuestion(questions: FormQuestion[], role: QuestionRole): FormQuestion | undefined {
  const explicit = questions.find((q) => q.role === role);
  if (explicit) return explicit;
  switch (role) {
    case 'name':
      return questions.find((q) => q.type === 'text' && /name/i.test(q.label) && !/company|organi[sz]ation|\+1|family/i.test(q.label));
    case 'attending':
      return questions.find((q) => q.type === 'yes_no' && /join|attend|coming|make it/i.test(q.label));
    case 'party':
      return questions.find((q) => q.type === 'number' && /how many|guests|attending|party/i.test(q.label));
    case 'email':
      return questions.find((q) => q.type === 'email');
    case 'phone':
      return questions.find((q) => q.type === 'phone');
  }
}

export function formatEventDate(date: string, style: 'long' | 'short' = 'long'): string {
  if (!date) return '';
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: style === 'long' ? 'long' : 'short',
    month: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatEventTime(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return time;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}

export function fillVariables(
  text: string,
  vars: { name?: string; fullname?: string; party?: number; event: string; date: string; time: string; venue: string; code?: string },
): string {
  const party = vars.party ?? 1;
  return text
    .replaceAll('{name}', vars.name || 'friend')
    .replaceAll('{fullname}', vars.fullname || vars.name || 'Guest')
    .replaceAll('{party}', `${party} ${party === 1 ? 'guest' : 'guests'}`)
    .replaceAll('{guests}', String(party))
    .replaceAll('{event}', vars.event)
    .replaceAll('{date}', vars.date)
    .replaceAll('{time}', vars.time)
    .replaceAll('{venue}', vars.venue)
    .replaceAll('{code}', vars.code || 'ALL41-XXXXXXXX');
}
