import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { Event, Guest } from './types';
import { getBaseEvent, resolveEventIdFromSlug, SLUG_INDEX_KEY } from './events';
import { MOCK_GUESTS, POPVERSE_QUIZ_QUESTIONS } from './mockData';
import { buildDefaultBlocks, legacyToBlocks, type LandingBlock } from './landingBlocks';
import { defaultBroadcast } from './broadcastTemplates';

/* ───────────────────────── Types ───────────────────────── */

export type QuestionType = 'text' | 'long_text' | 'yes_no' | 'multiple' | 'number' | 'email' | 'phone';
export type QuestionRole = 'name' | 'attending' | 'party' | 'email' | 'phone';

export interface FormQuestion {
  kind?: 'question';
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  role?: QuestionRole;
}

export interface FormPageBreak {
  kind: 'page_break';
  id: string;
  title: string;
  description: string;
}

export interface FormImage {
  kind: 'image';
  id: string;
  url: string;
  caption: string;
}

export interface FormFile {
  kind: 'file';
  id: string;
  url: string;
  name: string;
  size: number;
  label: string;
}

export type FormItem = FormQuestion | FormPageBreak | FormImage | FormFile;

export function isQuestion(item: FormItem): item is FormQuestion {
  return !item.kind || item.kind === 'question';
}

export function getQuestions(items: FormItem[]): FormQuestion[] {
  return items.filter(isQuestion);
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
  blocks: LandingBlock[];
  footerTitle: string;
  footerTagline: string;
  footerText: string;
}

export type ThemeMode = 'dark' | 'light';
export type CardStyleId = 'minimal' | 'bordered' | 'elevated' | 'glass';
export type RadiusId = 'sharp' | 'medium' | 'round' | 'pill';
export type SpacingId = 'tight' | 'normal' | 'spacious';

export interface DesignConfig {
  mode: ThemeMode;
  background: string;
  palette: string;
  customPrimary: string;
  customSecondary: string;
  customAccent: string;
  headingFont: string;
  bodyFont: string;
  accentFont: string;
  cardStyle: CardStyleId;
  radius: RadiusId;
  spacing: SpacingId;
  /** Per-area overrides of `spacing`; '' follows it. */
  spacingPadding: SpacingId | '';
  spacingGaps: SpacingId | '';
  spacingCards: SpacingId | '';
  spacingLetters: SpacingId | '';
  logoUrl: string;
  logoSize: 's' | 'm' | 'l';
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
  photoZoom: number;
  photoX: number;
  photoY: number;
  photoHeight: number;
  items: FormItem[];
  confirmed: ClosingCopy;
  declined: ClosingCopy;
  closed: ClosingCopy;
  upcoming: ClosingCopy;
  opensMode: 'now' | 'scheduled';
  opensAt: string;
  ticketLabel: string;
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
  guestNumbers: boolean;
  numberLabel: string;
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

export type SlotMode = 'number' | 'name';

export interface RaffleConfig {
  slotMode: SlotMode;
  // 0 = automatic: the larger of the guest list size and the event capacity.
  totalNumbers: number;
  drawnNumbers: number[];
  drawnGuestIds: string[];
}

export type FramePreset = 'none' | 'gold' | 'neon' | 'prism' | 'confetti' | 'image';

export interface StageFrame {
  preset: FramePreset;
  imageUrl: string;
  imageBlend: 'normal' | 'screen';
  footerOn: boolean;
  footerText: string;
  footerLogo: boolean;
  footerStyle: 'dark' | 'gold' | 'glass' | 'image';
  /** Your own footer banner (used when footerStyle is 'image'). */
  footerImageUrl?: string;
}

export interface QuizItem {
  id: string;
  text: string;
  options: string[];
  answer: number;
  points: number;
  seconds: number;
}

export interface ClueItem {
  id: string;
  location: string;
  hint: string;
  riddle: string;
  token: string;
}

export interface Activity {
  id: string;
  name: string;
  kind: 'quiz' | 'scavenger';
  questions: QuizItem[];
  clues: ClueItem[];
  frame: StageFrame;
  audience: Audience;
  pickedGuestIds: string[];
  anonymous: boolean;
  /** What winners of this activity get, e.g. "Bluetooth speaker". */
  prize: string;
  winners: GameWinner[];
}

export interface GameWinner {
  id: string;
  guestId: string;
  at: string;
}

export type DrawStyle = 'slot' | 'wheel' | 'picker' | 'claw';
export type Audience = 'all' | 'picked';

export interface DrawWinner {
  id: string;
  label: string;
  guestId?: string;
  number?: number;
  at: string;
}

export interface DoorPrize {
  id: string;
  name: string;
  prize: string;
  quantity: number;
  sponsor: string;
  style: DrawStyle;
  slotMode: SlotMode;
  totalNumbers: number;
  confetti: boolean;
  frame: StageFrame;
  winners: DrawWinner[];
  audience: Audience;
  pickedGuestIds: string[];
  anonymous: boolean;
  numberSource: 'guests' | 'range';
}

export interface GamesConfig {
  activities: Activity[];
  activeId: string;
}

export interface DoorPrizesConfig {
  items: DoorPrize[];
  activeId: string;
}

export type BroadcastKind = 'invitation' | 'pass' | 'reminder' | 'thankyou' | 'winner';

export interface BroadcastTemplate {
  subject: string;
  heading: string;
  /** Email body. */
  message: string;
  whatsapp: string;
  buttonLabel: string;
  imageUrl: string;
}

export interface BroadcastConfig {
  channel: 'whatsapp' | 'email';
  /** Added to local phone numbers that start with 0. */
  countryCode: string;
  templates: Record<BroadcastKind, BroadcastTemplate>;
  /** Guest ids already messaged, per template. */
  sent: Partial<Record<BroadcastKind, string[]>>;
  feedback: FeedbackConfig;
}

/** Feedback form linked from the Thank You message. */
export interface FeedbackConfig {
  on: boolean;
  title: string;
  question: string;
  askComment: boolean;
  /** Text before the link in the Thank You message, and the email button label. */
  prompt: string;
  thanks: string;
}

export interface FeedbackEntry {
  id: string;
  at: string;
  rating: number;
  comment: string;
  guestId?: string;
  name?: string;
}

export interface EventConfig {
  info: EventInfo;
  landing: LandingConfig;
  design: DesignConfig;
  invitation: InvitationConfig;
  access: AccessConfig;
  policy: PolicyConfig;
  raffle: RaffleConfig;
  games: GamesConfig;
  doorprizes: DoorPrizesConfig;
  broadcast: BroadcastConfig;
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
  number?: number;
}

/* ───────────────────────── Storage keys ───────────────────────── */

export const eventKey = (id: string) => `all41-event-${id}`;
export const responsesKey = (id: string) => `all41-responses-${id}`;
export const guestsKey = (id: string) => `all41-guests-${id}`;
export const feedbackKey = (id: string) => `all41-feedback-${id}`;
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
  const isPopverse = base.id === 'evt-popverse-converge-2026';
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
      blocks: buildDefaultBlocks(base),
      footerTitle: isPopverse ? 'POPVERSE' : '',
      footerTagline: isPopverse ? 'Different Tunes. One Beat.' : '',
      footerText: isPopverse ? '© 2026 Converge ICT Solutions Inc. · SPACE at One Ayala, Makati CBD' : '',
    },
    design: {
      mode: 'dark',
      background: isPopverse ? '#0A0608' : '#09090B',
      palette: isPopverse ? 'prism' : 'gold',
      customPrimary: base.theme_config.primaryColor || '#C5A059',
      customSecondary: '#E8D3A3',
      customAccent: base.theme_config.accentColor || '#00F0FF',
      headingFont: isPopverse ? 'montserrat' : 'outfit',
      bodyFont: isPopverse ? 'montserrat' : 'manrope',
      accentFont: 'none',
      cardStyle: isPopverse ? 'glass' : 'elevated',
      radius: 'medium',
      spacing: 'normal',
      spacingPadding: '',
      spacingGaps: '',
      spacingCards: '',
      spacingLetters: '',
      logoUrl: '',
      logoSize: 'm',
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
      photoZoom: 1,
      photoX: 50,
      photoY: 50,
      photoHeight: 240,
      items: withPageBreaks(isWedding ? ESSENTIALS_WEDDING : ESSENTIALS_CORPORATE),
      ticketLabel: "You're invited",
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
      upcoming: {
        heading: 'Registration opens soon',
        message: 'Replies for {event} open on {opens}. Come back then to reserve your seat.',
        smallPrint: '',
      },
      opensMode: 'now',
      opensAt: '',
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
      guestNumbers: true,
      numberLabel: 'Guest No.',
    },
    access: { ...DEFAULT_ACCESS },
    policy: {
      customDomain: base.custom_domain ?? '',
      terms:
        'Attendee agrees to single-use QR admission token. Photo and video uploads are licensed for ballroom stage display.',
      privacy:
        'Data collected is solely utilized for attendee verification, ticket pass dispatch, and table seating coordination.',
    },
    raffle: { slotMode: 'number', totalNumbers: 0, drawnNumbers: [], drawnGuestIds: [] },
    games: defaultGames(base),
    doorprizes: defaultDoorPrizes(base),
    broadcast: defaultBroadcast(base),
  };
}

export function drawExclusions(config: EventConfig) {
  const numbers: number[] = [];
  const guestIds: string[] = [];
  for (const d of config.doorprizes.items) {
    for (const w of d.winners) {
      if (typeof w.number === 'number') numbers.push(w.number);
      if (w.guestId) guestIds.push(w.guestId);
    }
  }
  return { numbers, guestIds };
}

export function recordDrawWinner(eventId: string, drawId: string, winner: { label: string; number?: number; guestId?: string }): WriteResult {
  const current = readJSON<StoredConfig>(eventKey(eventId)) ?? {};
  const base = getBaseEvent(eventId);
  const items = (current.doorprizes?.items as DoorPrize[] | undefined) ?? buildDefaults(base).doorprizes.items;
  const next = items.map((d) =>
    d.id === drawId
      ? { ...d, winners: [{ id: newId('w'), at: new Date().toISOString(), ...winner }, ...d.winners] }
      : d,
  );
  return updateEventConfig(eventId, 'doorprizes', { items: next });
}

export function resolveDrawTotal(draw: DoorPrize, config: EventConfig, guestCount: number): number {
  return draw.totalNumbers > 0 ? draw.totalNumbers : Math.max(guestCount, config.info.capacity, 1);
}

export function resolveRaffleTotal(config: EventConfig, guestCount: number): number {
  return config.raffle.totalNumbers > 0 ? config.raffle.totalNumbers : Math.max(guestCount, config.info.capacity, 1);
}

let breakSeq = 0;
// One question per page by default — the original Typeform-style flow.
export function withPageBreaks(questions: FormQuestion[], perPage = 1): FormItem[] {
  const out: FormItem[] = [];
  questions.forEach((q, i) => {
    if (i > 0 && perPage > 0 && i % perPage === 0) {
      out.push({ kind: 'page_break', id: `pb-${i}-${(breakSeq++).toString(36)}`, title: '', description: '' });
    }
    out.push({ ...q, kind: 'question' });
  });
  return out;
}

function normalizeLanding(defaults: LandingConfig, stored: Partial<LandingConfig> | undefined): LandingConfig {
  if (!stored) return defaults;
  const legacy = stored as Partial<LandingConfig> & Record<string, unknown>;
  const blocks = Array.isArray(legacy.blocks) ? legacy.blocks : legacyToBlocks(defaults.blocks, legacy);
  return { ...defaults, ...stored, blocks };
}

function normalizeInvitation(defaults: InvitationConfig, stored: Partial<InvitationConfig> | undefined): InvitationConfig {
  if (!stored) return defaults;
  const legacy = stored as Partial<InvitationConfig> & { questions?: FormQuestion[] };
  const items = Array.isArray(legacy.items) ? legacy.items : Array.isArray(legacy.questions) ? withPageBreaks(legacy.questions) : defaults.items;
  const { questions: _legacyQuestions, ...rest } = legacy;
  void _legacyQuestions;
  return { ...defaults, ...rest, items };
}

export function defaultFrame(base?: Event): StageFrame {
  const popverse = base?.id === 'evt-popverse-converge-2026';
  return {
    preset: popverse ? 'image' : 'gold',
    imageUrl: popverse ? POPVERSE_STAGE_FRAME : '',
    imageBlend: 'screen',
    footerOn: true,
    footerText: base ? base.name : '',
    footerLogo: true,
    footerStyle: 'dark',
  };
}

export const POPVERSE_STAGE_FRAME =
  'https://cdn.openart.ai/openart-ai/production/2026-10/create-image/gyygId5ZYPaN2nz17abs/image_1793300675118_e65da6c9_1793300675879_1fc2362a.png';

const DEFAULT_QUIZ: QuizItem[] = [
  { id: 'q-1', text: 'In what year was All41 founded?', options: ['2023', '2024', '2025', '2026'], answer: 1, points: 1000, seconds: 15 },
  { id: 'q-2', text: 'Which payment rail powers QR check-in in Indonesia?', options: ['QRIS', 'Swift GPI', 'FedNow', 'SEPA'], answer: 0, points: 1000, seconds: 15 },
  { id: 'q-3', text: 'Which protocol is best suited for live audience quiz sync?', options: ['WebSockets', 'HTTP Polling', 'SMTP', 'FTP'], answer: 0, points: 1000, seconds: 15 },
];

/** Speed scoring: full points in the first 3 seconds, then one step down every 3 seconds, to half points in the last step. */
export const QUIZ_STEP_SECONDS = 3;

export function quizPointLadder(points: number, seconds: number): number[] {
  const steps = Math.max(1, Math.ceil(seconds / QUIZ_STEP_SECONDS));
  const drop = steps > 1 ? 0.5 / (steps - 1) : 0;
  return Array.from({ length: steps }, (_, i) => Math.round(points * (1 - i * drop)));
}

export function quizPointsAt(points: number, seconds: number, elapsed: number): number {
  const ladder = quizPointLadder(points, seconds);
  return ladder[Math.min(ladder.length - 1, Math.floor(Math.max(0, elapsed) / QUIZ_STEP_SECONDS))];
}

export function newQuizItem(): QuizItem {
  return { id: newId('qz'), text: 'New question', options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 0, points: 1000, seconds: 15 };
}

export function newClue(): ClueItem {
  return { id: newId('cl'), location: '', hint: '', riddle: '', token: Math.random().toString(36).slice(2, 8).toUpperCase() };
}

export function newActivity(kind: Activity['kind'], base?: Event, index = 1): Activity {
  return {
    id: newId('act'),
    name: kind === 'quiz' ? `Trivia Round ${index}` : `Scavenger Hunt ${index}`,
    kind,
    questions: kind === 'quiz' ? DEFAULT_QUIZ.map((q) => ({ ...q, id: newId('qz') })) : [],
    clues: kind === 'scavenger' ? [newClue(), newClue(), newClue()] : [],
    frame: defaultFrame(base),
    ...ACTIVITY_EXTRAS,
  };
}

function defaultGames(base: Event): GamesConfig {
  const popverse = base.id === 'evt-popverse-converge-2026';
  const first: Activity = {
    id: 'act-main',
    name: popverse ? 'POPVERSE Pop Quiz' : 'Main Trivia',
    kind: 'quiz',
    questions: popverse
      ? POPVERSE_QUIZ_QUESTIONS.map((q) => ({ ...q, seconds: 15 }))
      : DEFAULT_QUIZ,
    clues: [],
    frame: defaultFrame(base),
    ...ACTIVITY_EXTRAS,
  };
  return { activities: [first], activeId: first.id };
}

export function newDoorPrize(base?: Event, index = 1): DoorPrize {
  return {
    id: newId('dp'),
    name: `Door Prize ${index}`,
    prize: 'Mystery Prize',
    quantity: 1,
    sponsor: '',
    style: 'slot',
    slotMode: 'number',
    totalNumbers: 0,
    confetti: true,
    frame: defaultFrame(base),
    winners: [],
    ...DRAW_EXTRAS,
  };
}

function defaultDoorPrizes(base: Event): DoorPrizesConfig {
  const items: DoorPrize[] = [
    { ...newDoorPrize(base), id: 'dp-grand', name: 'Grand Prize', prize: 'Apple MacBook Pro M4 Max (16-inch)', quantity: 1, sponsor: 'All41 Innovation' },
    { ...newDoorPrize(base), id: 'dp-second', name: 'Second Prize', prize: 'iPhone 16 Pro Max', quantity: 2, style: 'claw' },
    { ...newDoorPrize(base), id: 'dp-lucky', name: 'Lucky Draw', prize: 'Staycation Voucher', quantity: 3, style: 'picker' },
  ];
  return { items, activeId: items[0].id };
}

const ACTIVITY_EXTRAS = { audience: 'all' as Audience, pickedGuestIds: [] as string[], anonymous: false, prize: '', winners: [] as GameWinner[] };
const DRAW_EXTRAS = { audience: 'all' as Audience, pickedGuestIds: [] as string[], anonymous: false, numberSource: 'guests' as const };

function normalizeGames(defaults: GamesConfig, stored: Partial<GamesConfig> | undefined): GamesConfig {
  const merged = { ...defaults, ...stored };
  return { ...merged, activities: merged.activities.map((a) => ({ ...ACTIVITY_EXTRAS, ...a })) };
}

function normalizeBroadcast(defaults: BroadcastConfig, stored: Partial<BroadcastConfig> | undefined): BroadcastConfig {
  const templates = { ...defaults.templates };
  for (const k of Object.keys(templates) as BroadcastKind[]) templates[k] = { ...templates[k], ...stored?.templates?.[k] };
  return { ...defaults, ...stored, templates, sent: { ...stored?.sent }, feedback: { ...defaults.feedback, ...stored?.feedback } };
}

function normalizeDoorPrizes(defaults: DoorPrizesConfig, stored: Partial<DoorPrizesConfig> | undefined): DoorPrizesConfig {
  const merged = { ...defaults, ...stored };
  return { ...merged, items: merged.items.map((d) => ({ ...DRAW_EXTRAS, ...d })) };
}

function mergeConfig(defaults: EventConfig, stored: StoredConfig | null): EventConfig {
  if (!stored) return defaults;
  return {
    info: { ...defaults.info, ...stored.info },
    landing: normalizeLanding(defaults.landing, stored.landing),
    design: { ...defaults.design, ...stored.design },
    invitation: normalizeInvitation(defaults.invitation, stored.invitation),
    access: { ...defaults.access, ...stored.access },
    policy: { ...defaults.policy, ...stored.policy },
    raffle: { ...defaults.raffle, ...stored.raffle },
    games: normalizeGames(defaults.games, stored.games),
    doorprizes: normalizeDoorPrizes(defaults.doorprizes, stored.doorprizes),
    broadcast: normalizeBroadcast(defaults.broadcast, stored.broadcast),
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

const EMPTY_FEEDBACK: FeedbackEntry[] = [];
export function useFeedback(eventId: string): FeedbackEntry[] {
  return useStoredJSON<FeedbackEntry[]>(feedbackKey(eventId)) ?? EMPTY_FEEDBACK;
}

export function addFeedback(eventId: string, entry: FeedbackEntry): WriteResult {
  const current = readJSON<FeedbackEntry[]>(feedbackKey(eventId)) ?? [];
  return writeJSON(feedbackKey(eventId), [entry, ...current]);
}

export function deleteFeedback(eventId: string, id: string): WriteResult {
  const current = readJSON<FeedbackEntry[]>(feedbackKey(eventId)) ?? [];
  return writeJSON(feedbackKey(eventId), current.filter((f) => f.id !== id));
}

export function deleteResponse(eventId: string, id: string): WriteResult {
  const current = readJSON<FormResponse[]>(responsesKey(eventId)) ?? [];
  return writeJSON(responsesKey(eventId), current.filter((r) => r.id !== id));
}

// Every guest keeps a permanent number; missing ones continue after the highest number in list order.
export function numberGuests(guests: Guest[]): Guest[] {
  let max = guests.reduce((m, g) => Math.max(m, g.guest_number ?? 0), 0);
  if (guests.every((g) => g.guest_number)) return guests;
  return guests.map((g) => (g.guest_number ? g : { ...g, guest_number: ++max }));
}

const numberedCache = new WeakMap<Guest[], Guest[]>();
function numbered(list: Guest[]): Guest[] {
  let out = numberedCache.get(list);
  if (!out) {
    out = numberGuests(list);
    numberedCache.set(list, out);
  }
  return out;
}

export function useGuests(eventId: string): Guest[] {
  return numbered(useStoredJSON<Guest[]>(guestsKey(eventId)) ?? MOCK_GUESTS);
}

export function readGuests(eventId: string): Guest[] {
  return numbered(readJSON<Guest[]>(guestsKey(eventId)) ?? MOCK_GUESTS);
}

export function writeGuests(eventId: string, guests: Guest[]): WriteResult {
  return writeJSON(guestsKey(eventId), numberGuests(guests));
}

export function nextGuestNumber(guests: Guest[]): number {
  return numbered(guests).reduce((m, g) => Math.max(m, g.guest_number ?? 0), 0) + 1;
}

export function numberDigits(guests: Guest[], capacity = 0): number {
  const max = numbered(guests).reduce((m, g) => Math.max(m, g.guest_number ?? 0), 0);
  return Math.max(3, String(Math.max(max, capacity, 1)).length);
}

export function formatGuestNumber(n: number | undefined, digits = 3): string {
  return n ? String(n).padStart(digits, '0') : '';
}

export function guestPool(guests: Guest[], audience: Audience, picked: string[], checkedInOnly = true): Guest[] {
  const pickedSet = new Set(picked);
  return numbered(guests).filter((g) => (audience === 'all' || pickedSet.has(g.id)) && (!checkedInOnly || g.is_checked_in));
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

export function formatOpensAt(value: string): string {
  if (!value) return '';
  const [date, time] = value.split('T');
  return `${formatEventDate(date)}${time ? ` at ${formatEventTime(time)}` : ''}`;
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
  vars: { name?: string; fullname?: string; party?: number; event: string; date: string; time: string; venue: string; code?: string; opens?: string; number?: string },
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
    .replaceAll('{code}', vars.code || 'ALL41-XXXXXXXX')
    .replaceAll('{opens}', vars.opens || 'soon')
    .replaceAll('{number}', vars.number || '001');
}
