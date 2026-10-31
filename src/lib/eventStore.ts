import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { Event, Guest } from './types';
import { getBaseEvent, isSampleEventId, resolveEventIdFromSlug, SLUG_INDEX_KEY, ORG_EVENTS_KEY, type OrgEventRow } from './events';
import { MOCK_GUESTS, POPVERSE_QUIZ_QUESTIONS } from './mockData';
import { buildDefaultBlocks, legacyToBlocks, type LandingBlock } from './landingBlocks';
import { defaultBroadcast } from './broadcastTemplates';
import { SHOT_EFFECTS, SHOT_FILTERS, SHOT_FRAMES } from './shotLooks';
import { cachedGuests, isServerEventId, useServerGuestList } from './guestsApi';

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

/** Formatted text guests read on the form (see components/events/RichText for the marks it understands). */
export interface FormText {
  kind: 'text';
  id: string;
  text: string;
  align: 'left' | 'center';
}

export type FormItem = FormQuestion | FormPageBreak | FormImage | FormFile | FormText;

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
/** Landing page content width: 'standard' is the original centered column. */
export type PageWidthId = 'standard' | 'full' | '90' | '80';

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
  pageWidth: PageWidthId;
  logoUrl: string;
  logoSize: 's' | 'm' | 'l';
  /** What guests' Shot camera offers once they are checked in. */
  shot: ShotConfig;
}

/** A frame the organizer uploaded for the Shot camera (url is an "asset:" ref until the event is saved). */
export interface ShotFrameUpload {
  id: string;
  name: string;
  url: string;
}

/**
 * The looks guests can pick in Shot (ids from lib/shotLooks). Normal, no effect and no frame are always there;
 * uploaded frames are listed in frames as "custom:<id>". defaultFrame is the frame the camera opens with.
 */
export interface ShotConfig {
  filters: string[];
  effects: string[];
  frames: string[];
  defaultFrame: string;
  customFrames: ShotFrameUpload[];
}

export interface ClosingCopy {
  heading: string;
  message: string;
  smallPrint: string;
}

export interface InvitationConfig {
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
  /** The form page's own background colour ('' uses the event's colours from Design Studio). */
  background: string;
  /** Email the confirmation (Confirmed heading and message, with the QR pass) to guests who say they're coming. */
  sendConfirmation: boolean;
}

/** A form after the first one: its own link (/events/<slug>/invitation/<id>), questions, cover, limits and pages. */
export interface InvitationForm extends InvitationConfig {
  /** Lower-case letters, digits and dashes; fixed once the form is made, since it is the link and the guests' form. */
  id: string;
}

/**
 * An event's invitation forms. The first one is config.invitation (id '', the event's /invitation link); more forms
 * are listed here. Every reply to a form is its own guest with its own QR pass (Guest.form_id).
 */
export interface FormsConfig {
  items: InvitationForm[];
  /** The order of every form by id ('' is the first form); forms missing here follow in list order. */
  order: string[];
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
  /** Where the activity name sits at the top of the big screen. */
  nameAlign: NameAlign;
}

export type NameAlign = 'left' | 'center' | 'right';

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
  forms: FormsConfig;
  access: AccessConfig;
  policy: PolicyConfig;
  raffle: RaffleConfig;
  games: GamesConfig;
  doorprizes: DoorPrizesConfig;
  broadcast: BroadcastConfig;
}

export type EventSection = keyof EventConfig;
/** Day-of results (door prize and game winners, raffle draws) live in these sections next to the setup. */
export type LiveSection = 'doorprizes' | 'games' | 'raffle';
/**
 * updatedAt changes with every edit on this device. savedAt is when the server copy was saved (server time) and
 * savedVersion the updatedAt that copy matches, so any later edit shows up as unsaved. savedIso is that server time
 * exactly as the server sent it (microseconds), so a save only lands on top of the version this device has.
 * liveAt is set when this device records day-of results the server does not have yet; they never count as unsaved.
 */
type StoredConfig = { [K in EventSection]?: Partial<EventConfig[K]> } & {
  updatedAt?: number;
  savedAt?: number;
  savedIso?: string;
  savedVersion?: number;
  liveAt?: number;
};

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
  /** The form replied to ('' or missing: the first form). */
  formId?: string;
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
      pageWidth: 'standard',
      shot: {
        filters: SHOT_FILTERS.map((f) => f.id),
        effects: SHOT_EFFECTS.map((f) => f.id),
        frames: SHOT_FRAMES.map((f) => f.id),
        defaultFrame: 'event',
        customFrames: [],
      },
      logoUrl: '',
      logoSize: 'm',
    },
    invitation: {
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
      background: '',
      sendConfirmation: false,
    },
    forms: { items: [], order: [] },
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

/** Changes one door prize's winners as a day-of result (see updateLiveState). */
export function updateDrawWinners(eventId: string, drawId: string, change: (winners: DrawWinner[]) => DrawWinner[]): WriteResult {
  const items = readEventConfig(eventId).doorprizes.items;
  return updateLiveState(eventId, 'doorprizes', { items: items.map((d) => (d.id === drawId ? { ...d, winners: change(d.winners) } : d)) });
}

export function recordDrawWinner(eventId: string, drawId: string, winner: { label: string; number?: number; guestId?: string }): WriteResult {
  return updateDrawWinners(eventId, drawId, (winners) => [{ id: newId('w'), at: new Date().toISOString(), ...winner }, ...winners]);
}

/** Changes one game activity's winners as a day-of result (see updateLiveState). */
export function updateGameWinners(eventId: string, activityId: string, change: (winners: GameWinner[]) => GameWinner[]): WriteResult {
  const activities = readEventConfig(eventId).games.activities;
  return updateLiveState(eventId, 'games', { activities: activities.map((a) => (a.id === activityId ? { ...a, winners: change(a.winners) } : a)) });
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

/** Every form gets the settings added since it was saved, like the first form. */
function normalizeForms(invitationDefaults: InvitationConfig, stored: Partial<FormsConfig> | undefined): FormsConfig {
  const items = Array.isArray(stored?.items) ? stored.items.filter((f) => f && typeof f.id === 'string' && f.id) : [];
  return {
    items: items.map((f) => ({ ...normalizeInvitation(invitationDefaults, f), id: f.id })),
    order: Array.isArray(stored?.order) ? stored.order.filter((id) => typeof id === 'string') : [],
  };
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

/** The sample events' trivia. */
const SAMPLE_QUIZ: QuizItem[] = [
  { id: 'q-1', text: 'In what year was dayoneproject.xyz founded?', options: ['2023', '2024', '2025', '2026'], answer: 1, points: 1000, seconds: 15 },
  { id: 'q-2', text: 'Which payment rail powers QR check-in in Indonesia?', options: ['QRIS', 'Swift GPI', 'FedNow', 'SEPA'], answer: 0, points: 1000, seconds: 15 },
  { id: 'q-3', text: 'Which protocol is best suited for live audience quiz sync?', options: ['WebSockets', 'HTTP Polling', 'SMTP', 'FTP'], answer: 0, points: 1000, seconds: 15 },
];

/** A neutral starter round for real events, meant to be edited. */
const STARTER_QUIZ: QuizItem[] = [
  { id: 'q-1', text: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Mercury'], answer: 1, points: 1000, seconds: 15 },
  { id: 'q-2', text: 'How many continents are there?', options: ['5', '6', '7', '8'], answer: 2, points: 1000, seconds: 15 },
  { id: 'q-3', text: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3, points: 1000, seconds: 15 },
];

const starterQuiz = (base?: Event) => (base && isSampleEventId(base.id) ? SAMPLE_QUIZ : STARTER_QUIZ);

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
    questions: kind === 'quiz' ? starterQuiz(base).map((q) => ({ ...q, id: newId('qz') })) : [],
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
      : starterQuiz(base),
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
  // Real events start with one empty door prize; only the sample events come with sample prizes.
  if (!isSampleEventId(base.id)) {
    const only: DoorPrize = { ...newDoorPrize(base), id: 'dp-main', name: 'Door Prize', prize: '' };
    return { items: [only], activeId: only.id };
  }
  const items: DoorPrize[] = [
    { ...newDoorPrize(base), id: 'dp-grand', name: 'Grand Prize', prize: 'Apple MacBook Pro M4 Max (16-inch)', quantity: 1, sponsor: 'dayoneproject.xyz Innovation' },
    { ...newDoorPrize(base), id: 'dp-second', name: 'Second Prize', prize: 'iPhone 16 Pro Max', quantity: 2, style: 'claw' },
    { ...newDoorPrize(base), id: 'dp-lucky', name: 'Lucky Draw', prize: 'Staycation Voucher', quantity: 3, style: 'picker' },
  ];
  return { items, activeId: items[0].id };
}

const ACTIVITY_EXTRAS = { audience: 'all' as Audience, pickedGuestIds: [] as string[], anonymous: false, prize: '', winners: [] as GameWinner[], nameAlign: 'left' as NameAlign };
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
    forms: normalizeForms(defaults.invitation, stored.forms),
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

/**
 * Records day-of results (who won a door prize or game, which raffle numbers are out). They are kept on this device
 * through teammates' saves and go to the server with this device's next Save, but never mark the setup unsaved,
 * so a big screen that draws winners keeps receiving the organizer's updates.
 */
export function updateLiveState<K extends LiveSection>(eventId: string, section: K, patch: Partial<EventConfig[K]>): WriteResult {
  const current = readJSON<StoredConfig>(eventKey(eventId)) ?? {};
  return writeJSON(eventKey(eventId), { ...current, [section]: { ...(current[section] ?? {}), ...patch }, liveAt: Date.now() });
}

/** This device's day-of results laid over a copy from the server, matched by door prize and activity id. */
function withLiveState(config: Partial<EventConfig>, local: StoredConfig): Partial<EventConfig> {
  const next = { ...config };
  const draws = local.doorprizes?.items as DoorPrize[] | undefined;
  if (draws) {
    const winners = new Map(draws.map((d) => [d.id, d.winners]));
    // The public copy has no door prizes at all; then this device's own list stays.
    next.doorprizes = config.doorprizes?.items
      ? { ...config.doorprizes, items: config.doorprizes.items.map((d) => ({ ...d, winners: winners.get(d.id) ?? d.winners })) }
      : (local.doorprizes as DoorPrizesConfig);
  }
  const activities = local.games?.activities as Activity[] | undefined;
  if (activities) {
    const winners = new Map(activities.map((a) => [a.id, a.winners]));
    next.games = config.games?.activities
      ? { ...config.games, activities: config.games.activities.map((a) => ({ ...a, winners: winners.get(a.id) ?? a.winners })) }
      : (local.games as GamesConfig);
  }
  if (local.raffle) {
    const { drawnNumbers, drawnGuestIds } = local.raffle;
    next.raffle = {
      ...(config.raffle ?? local.raffle),
      ...(drawnNumbers ? { drawnNumbers } : {}),
      ...(drawnGuestIds ? { drawnGuestIds } : {}),
    } as RaffleConfig;
  }
  return next;
}

export function resetEventSection(eventId: string, section: EventSection): WriteResult {
  const current = readJSON<StoredConfig>(eventKey(eventId)) ?? {};
  const next: StoredConfig = { ...current, updatedAt: Date.now() };
  delete next[section];
  if (section === 'info') updateSlugIndex(eventId, '');
  return writeJSON(eventKey(eventId), next);
}

/** The event as this device has it: defaults merged with every change. */
export function readEventConfig(eventId: string): EventConfig {
  return mergeConfig(buildDefaults(getBaseEvent(eventId)), readJSON<StoredConfig>(eventKey(eventId)));
}

export interface SyncState {
  updatedAt: number | null;
  /** When the server copy was saved (server time), or null if never. */
  savedAt: number | null;
  /** The same server time exactly as the server sent it; null if never saved, or loaded by an older version of the app. */
  savedIso: string | null;
  /** This device has changes the server does not have yet. */
  unsaved: boolean;
  /** When this device recorded day-of results (winners, draws) the server does not have yet. */
  liveAt: number | null;
}

function syncState(stored: StoredConfig | null): SyncState {
  const updatedAt = stored?.updatedAt ?? null;
  return {
    updatedAt,
    savedAt: stored?.savedAt ?? null,
    savedIso: stored?.savedIso ?? null,
    unsaved: updatedAt !== null && updatedAt !== stored?.savedVersion,
    liveAt: stored?.liveAt ?? null,
  };
}

export function readSyncState(eventId: string): SyncState {
  return syncState(readJSON<StoredConfig>(eventKey(eventId)));
}

/** True when the server's saved_at is the version this device last saved or loaded. */
export function isSavedVersion(state: SyncState, savedIso: string | null): boolean {
  if (!savedIso) return state.savedAt === null;
  return state.savedIso ? state.savedIso === savedIso : state.savedAt === Date.parse(savedIso);
}

/**
 * Makes the server copy this device's copy (after saving, or when the server has a newer one).
 * keepLive keeps this device's day-of results that the server copy does not have yet.
 */
export function replaceEventConfig(
  eventId: string,
  config: Partial<EventConfig> & Pick<EventConfig, 'info'>,
  savedIso: string,
  keepLive = false,
): WriteResult {
  const local = readJSON<StoredConfig>(eventKey(eventId));
  const live = keepLive && local?.liveAt ? local : null;
  const version = Date.now();
  updateSlugIndex(eventId, config.info.slug);
  return writeJSON(eventKey(eventId), {
    ...(live ? withLiveState(config, live) : config),
    updatedAt: version,
    savedAt: Date.parse(savedIso),
    savedIso,
    savedVersion: version,
    ...(live ? { liveAt: live.liveAt } : {}),
  });
}

/** Notes a save that landed while this device kept editing: its later edits stay unsaved, on top of that version. */
export function markSavedVersion(eventId: string, savedIso: string): WriteResult {
  const current = readJSON<StoredConfig>(eventKey(eventId)) ?? {};
  return writeJSON(eventKey(eventId), { ...current, savedAt: Date.parse(savedIso), savedIso });
}

/** Remembers the organization's backend events on this device so every screen can open them by id or link. */
export function cacheOrgEvents(rows: OrgEventRow[], merge = false): WriteResult {
  const next: Record<string, OrgEventRow> = merge ? { ...(readJSON<Record<string, OrgEventRow>>(ORG_EVENTS_KEY) ?? {}) } : {};
  for (const row of rows) next[row.id] = row;
  return writeJSON(ORG_EVENTS_KEY, next);
}

export function useOrgEventsCache(): Record<string, OrgEventRow> | null {
  return useStoredJSON<Record<string, OrgEventRow>>(ORG_EVENTS_KEY);
}

/** Forgets a deleted event on this device: its row in the events cache, its link and its saved setup. */
export function forgetOrgEvent(eventId: string) {
  const cached = { ...(readJSON<Record<string, OrgEventRow>>(ORG_EVENTS_KEY) ?? {}) };
  delete cached[eventId];
  const index = readJSON<Record<string, string>>(SLUG_INDEX_KEY) ?? {};
  try {
    localStorage.removeItem(eventKey(eventId));
  } catch {
    // Browser storage is off; there is nothing to forget.
  }
  writeJSON(SLUG_INDEX_KEY, Object.fromEntries(Object.entries(index).filter(([, id]) => id !== eventId)));
  writeJSON(ORG_EVENTS_KEY, cached);
}

export function useEventConfig(eventId: string) {
  const saved = useOrgEventsCache();
  const base = useMemo(() => getBaseEvent(eventId, saved), [eventId, saved]);
  const stored = useStoredJSON<StoredConfig>(eventKey(eventId));
  const config = useMemo(() => mergeConfig(buildDefaults(base), stored), [base, stored]);
  const event = useMemo(() => applyConfigToEvent(base, config), [base, config]);
  const update = useCallback(
    <K extends EventSection>(section: K, patch: Partial<EventConfig[K]>) => updateEventConfig(eventId, section, patch),
    [eventId],
  );
  return { base, config, event, update, savedAt: stored?.updatedAt ?? null, sync: syncState(stored) };
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

export function readAsset(ref: string): string {
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
// Saved events keep guests, replies and check-ins on the server (lib/guestsApi.ts). Only the built-in sample events
// keep them on this device, so demos work without an account; they never fall back to each other.

const EMPTY_RESPONSES: FormResponse[] = [];

/** An invitation-form reply as the builder lists it, from a server guest who replied. */
function replyFromGuest(g: Guest): FormResponse {
  const attending = g.rsvp_status === 'attending';
  return {
    id: g.id,
    submittedAt: g.responded_at ?? g.updated_at,
    answers: Object.fromEntries(Object.entries(g.custom_fields).map(([k, v]) => [k, String(v ?? '')])),
    name: g.name,
    email: g.email ?? '',
    phone: g.phone ?? '',
    attending,
    party: attending ? g.party_size || 1 : 0,
    token: g.qr_code_token,
    number: g.guest_number,
    formId: g.form_id ?? '',
  };
}

/** Replies to the invitation form, newest first (server replies for saved events). */
export function useResponses(eventId: string): FormResponse[] {
  const server = isServerEventId(eventId);
  const local = useStoredJSON<FormResponse[]>(responsesKey(eventId));
  const { guests } = useServerGuestList(server ? eventId : null);
  return useMemo(() => {
    if (!server) return local ?? EMPTY_RESPONSES;
    return guests
      .filter((g) => g.rsvp_status !== 'pending')
      .map(replyFromGuest)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [server, local, guests]);
}

/** Sample events only: saved events store replies on the server (registerGuest). */
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

/**
 * The event's guests. Saved events: the server list (empty while it loads, or for accounts that may not read it),
 * shared by every screen and refreshed after each change. Sample events: this device's copy of the sample list.
 */
export function useGuests(eventId: string): Guest[] {
  return useGuestList(eventId).guests;
}

/** useGuests plus the load state, the package limit and refresh. pollMs reloads a saved event's list. */
export function useGuestList(eventId: string, pollMs = 0) {
  const server = isServerEventId(eventId);
  const sampleGuests = useSampleGuests(eventId);
  const remote = useServerGuestList(server ? eventId : null, pollMs);
  if (server) return { ...remote, isSample: false };
  return { ...remote, guests: sampleGuests, status: 'ready' as const, error: null, capacity: null, isSample: true };
}

/** This device's copy of a sample event's guests, without asking the server (for guest-facing pages). */
export function useSampleGuests(eventId: string): Guest[] {
  return numbered(useStoredJSON<Guest[]>(guestsKey(eventId)) ?? MOCK_GUESTS);
}

export function readGuests(eventId: string): Guest[] {
  if (isServerEventId(eventId)) return cachedGuests(eventId);
  return numbered(readJSON<Guest[]>(guestsKey(eventId)) ?? MOCK_GUESTS);
}

/** Sample events only: a saved event's guests are changed through lib/guestsApi.ts. */
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

/** A pass code for the sample events' local guests. Saved events get their pass token from the server. */
export function makePassToken() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `D1-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`;
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

/* ───────────────────────── Invitation forms ───────────────────────── */

/** The first form's id: the event's own invitation (config.invitation, /events/<slug>/invitation). */
export const MAIN_FORM_ID = '';

/** Every invitation form in the organizer's order, the first form included (id ''). Memoize the result. */
export function listForms(config: Pick<EventConfig, 'invitation' | 'forms'>): InvitationForm[] {
  const all: InvitationForm[] = [{ ...config.invitation, id: MAIN_FORM_ID }, ...config.forms.items];
  const rank = new Map(config.forms.order.map((id, i) => [id, i]));
  const at = (f: InvitationForm, i: number) => rank.get(f.id) ?? config.forms.order.length + i;
  return all.map((f, i) => ({ f, r: at(f, i) })).sort((a, b) => a.r - b.r).map((x) => x.f);
}

/** One form by id ('' is the first form), or undefined when the event has no such form. */
export function findForm(config: Pick<EventConfig, 'invitation' | 'forms'>, id: string): InvitationForm | undefined {
  return id ? config.forms.items.find((f) => f.id === id) : { ...config.invitation, id: MAIN_FORM_ID };
}

/** What organizers and guests call a form (its formName). */
export function formLabel(form: Pick<InvitationForm, 'id' | 'formName'> | undefined): string {
  if (!form) return 'Removed form';
  return form.formName.trim() || (form.id || 'Invitation');
}

export function formPath(slug: string, formId: string): string {
  return formId ? `/events/${slug}/invitation/${formId}` : `/events/${slug}/invitation`;
}

/** A link id from a form name ("Lomba Painting" → "lomba-painting"), unique among the event's forms. */
export function formIdFromName(name: string, taken: string[]): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 32)
    .replace(/^-+|-+$/g, '') || 'form';
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}

/** A new form with the default questions and pages, named by the organizer. */
export function newInvitationForm(base: Event, name: string, id: string): InvitationForm {
  return { ...buildDefaults(base).invitation, id, formName: name, subtitle: name };
}

/** Today on this device, as YYYY-MM-DD (what reply-by dates are compared with). */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The form is taking replies: not paused, not past its reply-by day (the server checks again, with seat limits). */
export function formAcceptsReplies(form: InvitationConfig): boolean {
  return form.accepting && !(form.replyBy && todayIso() > form.replyBy);
}

/** A form as a landing page button. */
export interface FormButton {
  id: string;
  name: string;
  href: string;
}

/**
 * The forms taking replies, as landing page buttons, when the event has more than one form; undefined for an event
 * with one form, whose invitation buttons stay as they are.
 */
export function landingFormButtons(config: Pick<EventConfig, 'invitation' | 'forms'>, slug: string): FormButton[] | undefined {
  const forms = listForms(config);
  if (forms.length < 2) return undefined;
  return forms.filter(formAcceptsReplies).map((f) => ({ id: f.id, name: formLabel(f), href: formPath(slug, f.id) }));
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
    .replaceAll('{code}', vars.code || 'D1-XXXXXXXX')
    .replaceAll('{opens}', vars.opens || 'soon')
    .replaceAll('{number}', vars.number || '001');
}
