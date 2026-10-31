export type EventType = 'corporate' | 'wedding';
export type EventStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type RsvpStatus = 'pending' | 'attending' | 'declined';
export type RaffleStyle = 'wheel' | 'claw' | 'slot';
export type GameType = 'live_quiz' | 'scavenger_hunt' | 'trivia' | 'bingo';

export type ThemeCategory = 'corporate' | 'wedding';

export interface LandingSchemaConfig {
  layoutType: 'corporate_keynote' | 'wedding_romance';
  showSpeakers?: boolean;
  showSponsors?: boolean;
  showLoveStory?: boolean;
  showDigitalAngpao?: boolean;
  showMenuBanquet?: boolean;
  showTableSeating?: boolean;
  accentBadge: string;
}

export interface ThemeConfig {
  preset: string;
  name: string;
  category: ThemeCategory;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  bannerUrl: string | null;
  logoUrl: string | null;
  landingSchema: LandingSchemaConfig;
}

export type StageModuleId =
  | 'welcome'
  | 'photowall'
  | 'quiz'
  | 'raffle'
  | 'rundown'
  | 'menu'
  | 'sponsors';

export interface StageModuleConfig {
  id: StageModuleId;
  name: string;
  description: string;
  isEnabled: boolean;
  durationSeconds: number;
}

export interface StageConfig {
  activeMode: StageModuleId | 'auto_rotate';
  autoRotateIntervalSeconds: number;
  modules: StageModuleConfig[];
  tickerText: string;
  showSubdomainQr: boolean;
}

export interface RundownItem {
  id: string;
  time: string;
  title: string;
  speakerOrHost?: string;
  location?: string;
  description?: string;
  isCurrent?: boolean;
}

export interface MenuItem {
  id: string;
  course: 'Appetizer' | 'Main Course' | 'Dessert' | 'Beverages';
  name: string;
  description: string;
  dietaryFlags?: ('Halal' | 'Vegetarian' | 'Gluten-Free' | 'Chef Specialty')[];
  pairing?: string;
}

export interface EventSettings {
  enablePhotoWall: boolean;
  enablePhotoWallCaptions: boolean;
  maxCaptionLength: number;
  enableRaffle: boolean;
  enableGames: boolean;
  enableRsvp: boolean;
  requireCheckInForPhotoWall: boolean;
  requireCheckInForGames: boolean;
  requireCheckInForRaffle: boolean;
  maxPhotosPerGuest: number;
  maxEmailsPerGuest: number;
  stageConfig?: StageConfig;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description?: string;
  cover_image_url?: string;
  visibility?: 'public' | 'private';
  ticket_price?: string;
  require_approval?: boolean;
  custom_domain: string | null;
  event_type: EventType;
  start_date: string;
  end_date: string;
  location_name: string | null;
  location_address: string | null;
  location_maps_url: string | null;
  status: EventStatus;
  guest_limit: number;
  extra_guests_purchased: number;
  is_white_label: boolean;
  theme_config: ThemeConfig;
  settings: EventSettings;
  created_at: string;
  updated_at: string;
}

/**
 * A guest as the screens use it. Saved events load it from the server (a41_guests + a41_rsvps + a41_checkins,
 * mapped in lib/guestsApi.ts): category is the first tag, table_number is table_no, qr_code_token is the pass
 * token, the RSVP fields come from the guest's reply and is_checked_in from the check-in. Phones are +62….
 */
export interface Guest {
  id: string;
  event_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  category: string;
  table_number: string | null;
  plus_one_count: number;
  rsvp_status: RsvpStatus;
  rsvp_notes: string | null;
  custom_fields: Record<string, unknown>;
  qr_code_token: string;
  guest_number?: number;
  is_checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by: string | null;
  photos_uploaded_count: number;
  emails_sent_count: number;
  whatsapp_sent_count: number;
  created_at: string;
  updated_at: string;
  /** All tags (category is the first one). */
  tags?: string[];
  /** People in the reply, including the guest (0 when there is no attending reply). */
  party_size?: number;
  /** When the guest last sent the invitation form. */
  responded_at?: string | null;
  /** The invitation form the guest belongs to ('' or missing: the first form). Each form's guests have their own passes. */
  form_id?: string;
}

export interface PhotoWallUpload {
  id: string;
  event_id: string;
  guest_id: string;
  media_type: 'image' | 'video';
  image_url: string;
  video_url?: string | null;
  thumbnail_url: string | null;
  filter_used: string | null;
  frame_used: string | null;
  caption: string | null;
  is_approved: boolean;
  aspect_ratio?: 'portrait' | 'square' | 'landscape';
  likes_count?: number;
  created_at: string;
  guest?: Pick<Guest, 'id' | 'name' | 'table_number'>;
}

export interface RaffleDraw {
  id: string;
  event_id: string;
  prize_name: string;
  prize_tier: number;
  style: RaffleStyle;
  winner_guest_id: string | null;
  drawn_at: string;
  audit_notes: string | null;
  winner?: Pick<Guest, 'id' | 'name' | 'table_number'>;
}

export interface GameSession {
  id: string;
  event_id: string;
  game_type: GameType;
  title: string;
  status: 'waiting' | 'active' | 'finished';
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GameParticipant {
  id: string;
  session_id: string;
  guest_id: string;
  score: number;
  completed_at: string | null;
  guest?: Pick<Guest, 'id' | 'name'>;
}

