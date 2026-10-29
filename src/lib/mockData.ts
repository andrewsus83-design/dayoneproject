import {
  Event,
  Guest,
  PhotoWallUpload,
  RaffleDraw,
  GameSession,
  StageConfig,
  RundownItem,
  MenuItem,
} from './types';
import { THEME_PRESETS } from './theme/defaultThemes';

export const DEFAULT_STAGE_CONFIG: StageConfig = {
  activeMode: 'welcome',
  autoRotateIntervalSeconds: 20,
  showSubdomainQr: true,
  tickerText:
    '★ Welcome to TechUnite APAC Summit 2026 • Wi-Fi: ALL41_GUEST / tech2026 • Post selfies to stage wall at techunite.all41.app ★',
  modules: [
    {
      id: 'welcome',
      name: 'Welcome & VIP Attendance',
      description: 'Realtime verified check-in counter and Wi-Fi access badge',
      isEnabled: true,
      durationSeconds: 20,
    },
    {
      id: 'photowall',
      name: 'Live Photo & Video Wall',
      description: 'Pinterest-style live broadcast of guest captures',
      isEnabled: true,
      durationSeconds: 25,
    },
    {
      id: 'quiz',
      name: 'Live Trivia Quiz Arena',
      description: 'Synchronized live quiz with speed podium leaderboard',
      isEnabled: true,
      durationSeconds: 30,
    },
    {
      id: 'raffle',
      name: 'Audited Door Prize Raffle',
      description: '3D grand spin machine and winner spotlight',
      isEnabled: true,
      durationSeconds: 30,
    },
    {
      id: 'rundown',
      name: 'Agenda & Speaker Timeline',
      description: 'Current session showcase and upcoming keynote schedule',
      isEnabled: true,
      durationSeconds: 20,
    },
    {
      id: 'menu',
      name: 'Banquet Dining Showcase',
      description: 'Chef course highlights and sommelier pairings',
      isEnabled: true,
      durationSeconds: 20,
    },
    {
      id: 'sponsors',
      name: 'Sponsors & VIP Partners',
      description: 'Tiered partner logo marquee and gratitude slide',
      isEnabled: true,
      durationSeconds: 15,
    },
  ],
};

export const MOCK_RUNDOWN: RundownItem[] = [];

export const MOCK_MENU: MenuItem[] = [];

export const MOCK_EVENT: Event = {
  id: 'evt-techunite-2026',
  organization_id: 'org-nexus-sea',
  name: 'TechUnite APAC Summit 2026',
  slug: 'techunite',
  description: 'The premier annual gathering of Southeast Asia founders, VC partners, and enterprise tech executives. Keynotes, VIP dining, real-time stage LED displays, and high-impact networking.',
  cover_image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
  visibility: 'public',
  ticket_price: 'Free',
  require_approval: true,
  custom_domain: null,
  event_type: 'corporate',
  start_date: '2026-11-15T09:00:00Z',
  end_date: '2026-11-15T18:00:00Z',
  location_name: 'The Grand Ballroom, Fairmont Jakarta',
  location_address: 'Jl. Asia Afrika No.8, Gelora, Kecamatan Tanah Abang, Kota Jakarta Pusat',
  location_maps_url: 'https://maps.google.com/?q=Fairmont+Jakarta',
  status: 'active',
  guest_limit: 600,
  extra_guests_purchased: 50,
  is_white_label: false,
  theme_config: THEME_PRESETS.neon_dark_gold,
  settings: {
    enablePhotoWall: true,
    enablePhotoWallCaptions: true,
    maxCaptionLength: 300,
    enableRaffle: true,
    enableGames: true,
    enableRsvp: true,
    requireCheckInForPhotoWall: true,
    requireCheckInForGames: true,
    requireCheckInForRaffle: true,
    maxPhotosPerGuest: 10,
    maxEmailsPerGuest: 3,
    stageConfig: DEFAULT_STAGE_CONFIG,
  },
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-21T00:00:00Z',
};

export const MOCK_WEDDING_EVENT: Event = {
  id: 'evt-aria-daniel-2026',
  organization_id: 'org-starlight-wo',
  name: 'Aria & Daniel: The Grand Celebration',
  slug: 'aria-daniel',
  description: 'An intimate sunset wedding ceremony followed by a black-tie gala dinner under the stars at Ayana Bali.',
  cover_image_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
  visibility: 'private',
  ticket_price: 'Invite Only',
  require_approval: true,
  custom_domain: 'wedding.ariadaniel.com',
  event_type: 'wedding',
  start_date: '2026-12-20T17:00:00Z',
  end_date: '2026-12-20T22:00:00Z',
  location_name: 'Glasshouse Pavilion, Ayana Bali',
  location_address: 'Jl. Karang Mas Sejahtera, Jimbaran, Bali',
  location_maps_url: 'https://maps.google.com/?q=Ayana+Resort+Bali',
  status: 'active',
  guest_limit: 300,
  extra_guests_purchased: 20,
  is_white_label: true,
  theme_config: THEME_PRESETS.elegant_wedding_gold,
  settings: {
    enablePhotoWall: true,
    enablePhotoWallCaptions: true,
    maxCaptionLength: 300,
    enableRaffle: true,
    enableGames: true,
    enableRsvp: true,
    requireCheckInForPhotoWall: true,
    requireCheckInForGames: true,
    requireCheckInForRaffle: true,
    maxPhotosPerGuest: 10,
    maxEmailsPerGuest: 3,
    stageConfig: DEFAULT_STAGE_CONFIG,
  },
  created_at: '2026-10-05T00:00:00Z',
  updated_at: '2026-10-21T00:00:00Z',
};

export const MOCK_GUESTS: Guest[] = [];

export const MOCK_PHOTO_WALL_UPLOADS: PhotoWallUpload[] = [];

export const MOCK_RAFFLES: RaffleDraw[] = [];

export const MOCK_GAME_SESSIONS: GameSession[] = [];
