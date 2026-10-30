import type { Event } from './types';
import type { Testimony } from './eventStore';

// 'register' is kept so pages saved before the invitation form replaced registration still load;
// it opens the invitation form like 'invitation'.
export type CtaTarget = 'invitation' | 'register' | 'custom';
export type TitleStyle = 'solid' | 'gradient' | 'prism';

export interface LandingListItem {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  color: string;
}

export interface LandingPair {
  id: string;
  label: string;
  value: string;
  color: string;
}

interface Base {
  id: string;
  hidden?: boolean;
}

export interface HeroBlock extends Base {
  type: 'hero';
  layout: 'left' | 'center';
  imageUrl: string;
  overlay: boolean;
  decoration: 'none' | 'prism';
  showLogo: boolean;
  badge: string;
  eyebrow: string;
  title: string;
  titleStyle: TitleStyle;
  tagline: string;
  showDescription: boolean;
  meta: 'inline' | 'pills' | 'none';
  showCountdown: boolean;
  ctaLabel: string;
  ctaTarget: CtaTarget;
  ctaUrl: string;
  secondaryLabel: string;
  note: string;
}

export interface CountdownBlock extends Base { type: 'countdown'; label: string }
export interface DetailsBlock extends Base { type: 'details'; showDate: boolean; showVenue: boolean; showCapacity: boolean; showLink: boolean }
export interface TextBlock extends Base { type: 'text'; label: string; heading: string; body: string; align: 'left' | 'center'; card: boolean }
export interface FeaturesBlock extends Base { type: 'features'; label: string; heading: string; layout: 'grid' | 'list'; items: LandingListItem[] }
export interface GalleryBlock extends Base { type: 'gallery'; label: string; heading: string; images: { id: string; url: string }[] }
export interface TestimonialsBlock extends Base { type: 'testimonials'; label: string; heading: string; items: Testimony[] }
export interface QuoteBlock extends Base { type: 'quote'; text: string; author: string }
export interface FactsBlock extends Base { type: 'facts'; label: string; heading: string; items: LandingPair[] }
export interface StatsBlock extends Base { type: 'stats'; label: string; heading: string; subheading: string; items: LandingPair[]; note: string; noteValue: string }
export interface VenueBlock extends Base { type: 'venue'; label: string; heading: string; body: string; tips: LandingPair[]; showDirections: boolean }
export interface ImageBlock extends Base { type: 'image'; url: string; caption: string; fullWidth: boolean }
export interface CtaBlock extends Base { type: 'cta'; label: string; heading: string; body: string; ctaLabel: string; ctaTarget: CtaTarget; ctaUrl: string; note: string }

export type LandingBlock =
  | HeroBlock | CountdownBlock | DetailsBlock | TextBlock | FeaturesBlock | GalleryBlock | TestimonialsBlock
  | QuoteBlock | FactsBlock | StatsBlock | VenueBlock | ImageBlock | CtaBlock;

export type BlockType = LandingBlock['type'];

export const BLOCK_CATALOG: { type: BlockType; label: string; desc: string }[] = [
  { type: 'hero', label: 'Hero', desc: 'Big cover image, title and main button' },
  { type: 'countdown', label: 'Countdown', desc: 'Days, hours, minutes to the event' },
  { type: 'details', label: 'Key Details', desc: 'Date, venue, capacity, link' },
  { type: 'text', label: 'Text', desc: 'Label, heading and paragraph' },
  { type: 'features', label: 'Highlights', desc: 'List or grid of points' },
  { type: 'gallery', label: 'Gallery', desc: 'Photo grid' },
  { type: 'testimonials', label: 'Testimonials', desc: 'Quotes from people' },
  { type: 'quote', label: 'Quote / Verse', desc: 'One highlighted quote' },
  { type: 'facts', label: 'Facts', desc: 'Label & value pairs (dress code…)' },
  { type: 'stats', label: 'Stats', desc: 'Big numbers' },
  { type: 'venue', label: 'Venue', desc: 'Venue story, tips and directions' },
  { type: 'image', label: 'Image', desc: 'A single picture with caption' },
  { type: 'cta', label: 'Call to Action', desc: 'Closing message with a button' },
];

let seq = 0;
export function blockId(prefix = 'b') {
  return `${prefix}-${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export function createBlock(type: BlockType, isWedding = false): LandingBlock {
  const id = blockId();
  switch (type) {
    case 'hero':
      return {
        id, type, layout: 'left', imageUrl: '', overlay: true, decoration: 'none', showLogo: true,
        badge: isWedding ? 'Wedding Celebration' : 'Corporate Summit', eyebrow: '', title: '', titleStyle: 'solid', tagline: '',
        showDescription: true, meta: 'inline', showCountdown: false,
        ctaLabel: isWedding ? 'RSVP to Attend' : 'Register Now', ctaTarget: 'invitation', ctaUrl: '', secondaryLabel: 'Learn More', note: '',
      };
    case 'countdown':
      return { id, type, label: 'Event starts in' };
    case 'details':
      return { id, type, showDate: true, showVenue: true, showCapacity: true, showLink: true };
    case 'text':
      return { id, type, label: 'About', heading: 'A few words', body: 'Tell your guests what to expect.', align: 'left', card: true };
    case 'features':
      return {
        id, type, label: 'Highlights', heading: 'Why you should come', layout: 'grid',
        items: [
          { id: blockId('i'), title: 'First highlight', subtitle: '', body: 'Describe it in a sentence.', color: '' },
          { id: blockId('i'), title: 'Second highlight', subtitle: '', body: 'Describe it in a sentence.', color: '' },
        ],
      };
    case 'gallery':
      return { id, type, label: 'Gallery', heading: 'Moments', images: [] };
    case 'testimonials':
      return {
        id, type, label: 'Kind words', heading: isWedding ? 'Kind Words' : 'What People Say',
        items: [{ id: blockId('t'), name: 'Sarah Kim', role: isWedding ? 'Bridesmaid' : 'CEO, TechCorp', text: 'Absolutely outstanding — every detail was perfect.', rating: 5 }],
      };
    case 'quote':
      return {
        id, type,
        text: isWedding
          ? 'And now these three remain: faith, hope and love. But the greatest of these is love.'
          : 'The best way to predict the future is to create it.',
        author: isWedding ? '1 Corinthians 13:13' : 'Peter Drucker',
      };
    case 'facts':
      return {
        id, type, label: 'Good to know', heading: isWedding ? 'Dress Code & Details' : 'Event Details',
        items: [
          { id: blockId('f'), label: 'Dress Code', value: isWedding ? 'Black Tie — Tropical Formal' : 'Business Attire', color: '' },
        ],
      };
    case 'stats':
      return {
        id, type, label: 'The Guests', heading: '500 Participants', subheading: 'By invitation only',
        items: [{ id: blockId('s'), label: 'Guests', value: '500', color: '' }], note: '', noteValue: '',
      };
    case 'venue':
      return { id, type, label: 'The Venue', heading: 'Getting there', body: 'Tell guests about the venue.', tips: [], showDirections: true };
    case 'image':
      return { id, type, url: '', caption: '', fullWidth: false };
    case 'cta':
      return {
        id, type, label: '', heading: isWedding ? 'Join Us on Our Special Day' : 'Secure Your Seat Today',
        body: isWedding
          ? 'RSVP so we can ensure your seat and a personalised place card.'
          : 'Seats are limited. Register now and receive your digital QR pass instantly.',
        ctaLabel: isWedding ? 'RSVP Now' : 'Register Free', ctaTarget: 'invitation', ctaUrl: '',
        note: 'Instant confirmation · Digital QR pass sent by email & WhatsApp',
      };
  }
}

const POPVERSE = {
  hero: 'https://cdn.openart.ai/openart-ai/production/2026-10/create-image/gyygId5ZYPaN2nz17abs/image_1793299266486_f11f928f_1793299266529_107e55ae.png',
  fuchsia: '#CC0066',
  cobalt: '#0099DD',
  lime: '#39FF14',
  citrine: '#FFD700',
};

function popverseBlocks(): LandingBlock[] {
  return [
    {
      id: 'pv-hero', type: 'hero', layout: 'center', imageUrl: POPVERSE.hero, overlay: true, decoration: 'prism', showLogo: true,
      badge: '', eyebrow: 'Year-End Party 2026', title: 'P★PVERSE', titleStyle: 'prism', tagline: 'Different Tunes. One Beat.',
      showDescription: false, meta: 'pills', showCountdown: true,
      ctaLabel: '✦ Confirm Attendance', ctaTarget: 'invitation', ctaUrl: '', secondaryLabel: 'Learn More', note: 'Confirm by October 9, 2026',
    },
    {
      id: 'pv-story', type: 'text', label: 'Our Why', heading: 'The Story Behind POPVERSE', align: 'left', card: true,
      body: 'Converge has continuously evolved — expanding its reach, innovating its technology, and transforming how people stay connected. Much like a multi-verse, we are made up of different dimensions, operate across diverse communities, and implore the wealth of technologies. Converge acts as the central axis connecting all these distinct "realities" into one powerful network. "POPVERSE" honors this journey of growth, acknowledging that while the company has changed over time, its core mission to connect people remains constant.',
    },
    {
      id: 'pv-messages', type: 'features', label: 'Key Brand Message', heading: '', layout: 'list',
      items: [
        { id: 'pv-m1', title: 'Vibrancy & Energy', subtitle: 'The "Pop"', color: POPVERSE.fuchsia, body: "By grounding the year-end event in the vibrant world of pop culture, the theme creates an inclusive space for employees to showcase talent, express individuality, and bring maximum energy to celebrate the year's milestones." },
        { id: 'pv-m2', title: 'Evolution & Connection', subtitle: 'The "Verse"', color: POPVERSE.cobalt, body: "Honors Converge's continuous transformation over the years. Like a multi-verse of distinct realities, Converge links different departments, regions, and lives into one seamless network." },
        { id: 'pv-m3', title: 'Unity in Diversity', subtitle: '"Different Tune, One Beat"', color: POPVERSE.lime, body: 'Acknowledges that while each department operates with its own unique skill set and rhythm ("different tune"), the entire company moves in sync toward shared organizational goals ("one beat").' },
      ],
    },
    {
      id: 'pv-venue', type: 'venue', label: 'Event Details', heading: 'Everything You Need to Know', showDirections: true,
      body: 'Located on the 5th floor of the One Ayala complex at the corner of Ayala Avenue and EDSA — SPACE at One Ayala is a premier 2,700 sqm event hub right at the heart of Makati CBD. Surrounded by hotels, retail, and transport hubs — ideal for both local and international guests. Capacity: up to 1,600 guests.',
      tips: [
        { id: 'pv-t1', label: '🚗', value: '25-min drive from Reliance, mall parking available', color: POPVERSE.fuchsia },
        { id: 'pv-t2', label: '🚇', value: '24/7 public transport · Direct MRT terminal access', color: POPVERSE.fuchsia },
      ],
    },
    {
      id: 'pv-guests', type: 'stats', label: 'The Guests', heading: '1,550 Participants', subheading: 'Manila Audience — By Invitation Only',
      items: [
        { id: 'pv-s1', label: 'Converge', value: '1,509', color: POPVERSE.fuchsia },
        { id: 'pv-s2', label: 'Metroworks', value: '41', color: POPVERSE.cobalt },
      ],
      note: 'Confirm attendance by:', noteValue: 'October 9, 2026',
    },
    {
      id: 'pv-cta', type: 'cta', label: 'Join the Celebration', heading: 'Ready to be part of POPVERSE?',
      body: "Confirm your attendance and join 1,550 colleagues for Converge's biggest year-end celebration.",
      ctaLabel: '✦ Confirm My Attendance', ctaTarget: 'invitation', ctaUrl: '', note: '',
    },
  ];
}

export function buildDefaultBlocks(base: Event): LandingBlock[] {
  if (base.id === 'evt-popverse-converge-2026') return popverseBlocks();
  const isWedding = base.event_type === 'wedding';
  const hero = createBlock('hero', isWedding) as HeroBlock;
  const story: FeaturesBlock = isWedding
    ? {
        id: 'story', type: 'features', label: 'Our Story', heading: 'Our Story', layout: 'grid',
        items: [
          { id: 's1', subtitle: '2021', title: 'First Met', body: 'A chance encounter at a design conference in Singapore turned into something beautiful.', color: '' },
          { id: 's2', subtitle: '2024', title: 'Got Engaged', body: 'A sunrise proposal at Uluwatu cliffs, with the Indian Ocean as witness.', color: '' },
          { id: 's3', subtitle: '2026', title: 'Forever in Bali', body: 'A clifftop ceremony at GWK, surrounded by 250 guests from 18 countries.', color: '' },
        ],
      }
    : {
        id: 'why', type: 'features', label: 'Why Attend', heading: 'Why Attend', layout: 'grid',
        items: [
          { id: 'w1', title: '40+ World-Class Speakers', subtitle: '', body: "CEOs, founders and investors from APAC's fastest-growing companies.", color: '' },
          { id: 'w2', title: '1,200 Attendees', subtitle: '', body: 'Network with decision-makers from tech, finance, and deep-tech verticals.', color: '' },
          { id: 'w3', title: '12 Countries', subtitle: '', body: 'Truly pan-APAC representation with live translations in 4 languages.', color: '' },
          { id: 'w4', title: 'AI-Powered Matchmaking', subtitle: '', body: 'Smart session recommendations and 1:1 meeting scheduler.', color: '' },
        ],
      };
  const included: FeaturesBlock = {
    id: 'included', type: 'features', label: '', heading: "What's Included", layout: 'grid',
    items: [
      { id: 'n1', title: 'Digital QR Pass', subtitle: '', body: 'Cryptographic gate entry', color: '' },
      { id: 'n2', title: 'AI Photo Wall', subtitle: '', body: 'Upload & share memories', color: '' },
      { id: 'n3', title: 'Live Trivia', subtitle: '', body: 'Kahoot-style real-time quiz', color: '' },
      { id: 'n4', title: 'Door Prize Raffle', subtitle: '', body: '3D animated prize draws', color: '' },
      { id: 'n5', title: 'Stage Display', subtitle: '', body: 'LED room module controller', color: '' },
      { id: 'n6', title: 'Live Broadcast', subtitle: '', body: 'WA & email reminders', color: '' },
    ],
  };
  const blocks: LandingBlock[] = [
    { ...hero, id: 'hero' },
    { id: 'countdown', type: 'countdown', label: 'Event starts in' },
    { id: 'details', type: 'details', showDate: true, showVenue: true, showCapacity: true, showLink: true },
    story,
    included,
  ];
  if (isWedding) {
    blocks.push({
      id: 'dress', type: 'facts', label: '', heading: 'Dress Code & Details',
      items: [
        { id: 'd1', label: 'Dress Code', value: 'Black Tie — Tropical Formal', color: '' },
        { id: 'd2', label: 'Color Palette', value: 'Ivory · Blush · Gold', color: '' },
        { id: 'd3', label: 'Ceremony Language', value: 'English & Italian', color: '' },
      ],
    });
  }
  blocks.push({ ...(createBlock('cta', isWedding) as CtaBlock), id: 'cta' });
  return blocks;
}

// Earlier versions stored a fixed set of landing fields; fold them into the default blocks.
export function legacyToBlocks(defaults: LandingBlock[], legacy: Record<string, unknown>): LandingBlock[] {
  const str = (k: string) => (typeof legacy[k] === 'string' ? (legacy[k] as string) : undefined);
  const bool = (k: string) => (typeof legacy[k] === 'boolean' ? (legacy[k] as boolean) : undefined);
  const blocks = defaults.map((b) => {
    if (b.type === 'hero') {
      return {
        ...b,
        imageUrl: str('heroUrl') ?? b.imageUrl,
        overlay: bool('heroOverlay') ?? b.overlay,
        badge: str('badge') ?? b.badge,
        eyebrow: str('subtitle') ?? b.eyebrow,
        ctaLabel: str('ctaLabel') ?? b.ctaLabel,
      };
    }
    if (b.type === 'cta') return { ...b, note: str('ctaSub') ?? b.note };
    if (b.type === 'facts' && str('dressCode')) {
      return { ...b, items: b.items.map((it, i) => (i === 0 ? { ...it, value: str('dressCode') as string } : it)) };
    }
    return b;
  });
  const extra: LandingBlock[] = [];
  if (bool('notesOn') && str('notesText')) extra.push({ id: blockId(), type: 'quote', text: str('notesText') as string, author: '' });
  const gallery = Array.isArray(legacy.gallery) ? (legacy.gallery as { id: string; url: string }[]) : [];
  if (bool('galleryOn') && gallery.length) extra.push({ id: blockId(), type: 'gallery', label: 'Gallery', heading: 'Moments', images: gallery });
  const testimonies = Array.isArray(legacy.testimonies) ? (legacy.testimonies as Testimony[]) : [];
  if (bool('testimoniesOn') && testimonies.length) extra.push({ id: blockId(), type: 'testimonials', label: '', heading: 'What People Say', items: testimonies });
  const ctaIndex = blocks.findIndex((b) => b.type === 'cta');
  if (extra.length) blocks.splice(ctaIndex >= 0 ? ctaIndex : blocks.length, 0, ...extra);
  return blocks;
}

export function blockTitle(b: LandingBlock): string {
  const meta = BLOCK_CATALOG.find((c) => c.type === b.type)?.label ?? b.type;
  const named =
    'heading' in b && b.heading ? b.heading
    : b.type === 'hero' ? b.title || b.eyebrow || ''
    : b.type === 'quote' ? b.text
    : b.type === 'image' ? b.caption
    : b.type === 'countdown' ? b.label
    : '';
  return named ? `${meta} · ${named}` : meta;
}
