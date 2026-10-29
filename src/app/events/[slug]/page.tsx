'use client';

import React, { useState, useRef, use, Suspense } from 'react';
import Link from 'next/link';
import {
  MOCK_EVENT,
  MOCK_WEDDING_EVENT,
  MOCK_CORPORATE_NEXUS_EVENT,
  MOCK_WEDDING_BALI_EVENT,
  MOCK_POPVERSE_EVENT,
  MOCK_PHOTO_WALL_UPLOADS,
  MOCK_RUNDOWN,
  MOCK_GUESTS,
  MOCK_RAFFLES,
} from '@/lib/mockData';
import { PhotoWallUpload, Guest } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { getClientDomain } from '@/lib/domain';
import { PinterestMasonryPhotoWall } from '@/components/events/PinterestMasonryPhotoWall';
import {
  Calendar,
  MapPin,
  Wifi,
  QrCode,
  Gamepad2,
  Gift,
  MessageSquare,
  Heart,
  Clock,
  Camera,
  Send,
  Upload,
  X,
  Star,
  CheckCircle2,
  Share2,
  ExternalLink,
  ChevronRight,
  Building,
  Sparkles,
  Trophy,
  Copy,
  Check,
  Bell,
  Zap,
  Hash,
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';

// ─── Types ───────────────────────────────────────────────────────────────────
type GuestTab = 'event' | 'activity' | 'qr' | 'raffle' | 'others';
type QrMode = 'pass' | 'camera';
type UploadState = 'idle' | 'compressing' | 'queued' | 'success';

// ─── Inline visual components ─────────────────────────────────────────────────
function RundownTimeline() {
  return (
    <div className="space-y-2">
      {MOCK_RUNDOWN.map((item) => (
        <div
          key={item.id}
          className={`flex gap-4 p-4 rounded-2xl border transition-all ${
            item.isCurrent
              ? 'bg-premium-gold/10 border-premium-gold/30'
              : 'bg-premium-charcoal border-premium-borderDark'
          }`}
        >
          <div className="flex-shrink-0 text-right min-w-[52px]">
            <span className={`text-[11px] font-mono font-bold ${item.isCurrent ? 'text-premium-gold' : 'text-zinc-500'}`}>
              {item.time}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-display font-medium leading-tight ${item.isCurrent ? 'text-white' : 'text-zinc-300'}`}>
                {item.title}
              </span>
              {item.isCurrent && (
                <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-premium-success/20 text-premium-success font-mono text-[9px] font-bold border border-premium-success/30 animate-pulse">
                  NOW
                </span>
              )}
            </div>
            {item.speakerOrHost && (
              <p className="text-[11px] text-premium-neon mt-0.5">{item.speakerOrHost}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function MobileGuestPortalContent({ slug }: { slug: string }) {
  const event =
    slug === 'aria-daniel' ? MOCK_WEDDING_EVENT
    : slug === 'sophia-marco' ? MOCK_WEDDING_BALI_EVENT
    : slug === 'nexus' ? MOCK_CORPORATE_NEXUS_EVENT
    : slug === 'popverse' ? MOCK_POPVERSE_EVENT
    : MOCK_EVENT;
  const isWedding = event.event_type === 'wedding';
  const clientDomain = getClientDomain(slug);
  const captionsEnabled = event.settings?.enablePhotoWallCaptions ?? true;
  const maxCaptionLength = event.settings?.maxCaptionLength ?? 300;

  // Navigation
  const [activeTab, setActiveTab] = useState<GuestTab>('event');

  // QR tab dual-state
  const [qrMode, setQrMode] = useState<QrMode>('pass');
  const [isCheckedIn] = useState(true); // Budi Santoso is already checked in

  // Activity tab
  const [gameCode, setGameCode] = useState('');
  const [gameJoined, setGameJoined] = useState(false);

  // Others tab
  const [comment, setComment] = useState('');
  const [commentSent, setCommentSent] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Upload (QR camera mode)
  const [uploadMediaType, setUploadMediaType] = useState<'image' | 'video'>('image');
  const [previewMedia, setPreviewMedia] = useState<string | null>(
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1000&q=80'
  );
  const [captionText, setCaptionText] = useState('');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [photoWallItems, setPhotoWallItems] = useState<PhotoWallUpload[]>(MOCK_PHOTO_WALL_UPLOADS);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Guest + QR — safe fallback so page renders even with empty MOCK_GUESTS
  const [guest] = useState<Guest>(MOCK_GUESTS[0] ?? {
    id: 'guest-preview',
    event_id: event.id,
    name: 'Preview Guest',
    email: 'preview@all41.app',
    phone: null,
    category: 'General',
    table_number: null,
    plus_one_count: 0,
    rsvp_status: 'attending' as const,
    rsvp_notes: null,
    custom_fields: {},
    qr_code_token: 'QR-PREVIEW-0000',
    is_checked_in: false,
    checked_in_at: null,
    checked_in_by: null,
    photos_uploaded_count: 0,
    emails_sent_count: 0,
    whatsapp_sent_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  React.useEffect(() => {
    QRCode.toDataURL(guest.qr_code_token, {
      width: 240,
      margin: 1,
      color: { dark: '#09090B', light: '#FFFFFF' },
    }).then(setQrDataUrl);
  }, [guest]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewMedia(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSendToWall = () => {
    if (!previewMedia) return;
    setUploadState('compressing');
    setTimeout(() => {
      setUploadState('queued');
      setTimeout(() => {
        const newUpload: PhotoWallUpload = {
          id: `pw-${Date.now()}`,
          event_id: event.id,
          guest_id: guest.id,
          media_type: uploadMediaType,
          image_url: previewMedia,
          video_url: uploadMediaType === 'video' ? previewMedia : null,
          thumbnail_url: previewMedia,
          filter_used: 'cyberpunk-neon',
          frame_used: 'gold-badge-2026',
          caption: captionsEnabled ? captionText.slice(0, maxCaptionLength) : null,
          aspect_ratio: 'portrait',
          likes_count: 1,
          is_approved: true,
          created_at: new Date().toISOString(),
          guest: { id: guest.id, name: guest.name, table_number: guest.table_number },
        };
        setPhotoWallItems([newUpload, ...photoWallItems]);
        setUploadState('success');
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        showToast('🎉 Photo is live on stage!');
      }, 1200);
    }, 900);
  };

  // ── Nav items ──
  const NAV_TABS = [
    { id: 'event' as GuestTab, icon: Calendar, label: 'Event' },
    { id: 'activity' as GuestTab, icon: Gamepad2, label: 'Activity' },
    { id: 'qr' as GuestTab, icon: QrCode, label: 'QR', isCentral: true },
    { id: 'raffle' as GuestTab, icon: Gift, label: 'Raffle' },
    { id: 'others' as GuestTab, icon: MessageSquare, label: 'Others' },
  ];

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 flex justify-center font-sans">
      {/* Toast */}
      <div
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-[90] max-w-[340px] w-[90%] bg-premium-gold text-black rounded-2xl px-5 py-3.5 shadow-gold transition-transform duration-300 flex items-center gap-3 font-bold text-sm ${
          toastMessage ? 'translate-y-0' : '-translate-y-[200%]'
        }`}
      >
        <Bell className="w-4 h-4 flex-shrink-0" />
        <span>{toastMessage}</span>
      </div>

      {/* Mobile Shell */}
      <div className="w-full max-w-[420px] min-h-screen sm:min-h-[860px] sm:h-[880px] bg-premium-black sm:rounded-[3.5rem] sm:border-[12px] sm:border-premium-charcoal shadow-[0_0_60px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col sm:ring-1 sm:ring-zinc-800">

        {/* Top App Bar */}
        <header className="px-5 pt-10 sm:pt-7 pb-4 flex justify-between items-center bg-premium-black border-b border-premium-borderDark relative z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-lg shadow-gold flex-shrink-0">
              41
            </div>
            <div>
              <p className="text-premium-gold text-[9px] font-mono font-bold uppercase tracking-[0.2em] leading-none mb-0.5">
                {clientDomain}
              </p>
              <h3 className="font-display font-bold text-base text-white leading-tight truncate max-w-[180px]">
                {event.name}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCheckedIn && (
              <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-premium-success bg-premium-success/10 border border-premium-success/25 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-premium-success" />
                Checked In
              </span>
            )}
            <button
              type="button"
              onClick={() => showToast(isWedding ? 'Wi-Fi: AYANA_WEDDING · love2026' : 'Wi-Fi: ALL41_GUEST · tech2026')}
              className="w-9 h-9 rounded-full bg-premium-charcoal border border-premium-borderDark flex items-center justify-center relative scale-on-click"
            >
              <Bell className="w-4 h-4 text-zinc-400" />
              <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-premium-danger rounded-full" />
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar pb-28">

          {/* ── TAB 1: EVENT ───────────────────────────────────── */}
          {activeTab === 'event' && (
            <div className="px-5 py-5 space-y-5">

              {/* Event Info Card */}
              <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500">
                    {isWedding ? 'Wedding Details' : 'Summit Details'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-premium-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-premium-success shadow-[0_0_6px_#00E676]" />
                    Gate Active
                  </span>
                </div>
                <div className="space-y-3 text-[13px]">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-premium-gold flex-shrink-0" />
                    <span className="text-zinc-200 font-medium">{formatDate(event.start_date)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-premium-neon flex-shrink-0" />
                    <span className="text-zinc-200 font-medium truncate">{event.location_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Wifi className="w-4 h-4 text-premium-success flex-shrink-0" />
                    <span className="font-mono text-[12px] text-premium-success">
                      {isWedding ? 'AYANA_WEDDING · love2026' : 'ALL41_GUEST · tech2026'}
                    </span>
                  </div>
                </div>
                <a
                  href={event.location_maps_url || '#'}
                  target="_blank"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl border border-zinc-700 hover:border-premium-gold text-zinc-300 hover:text-white text-[12px] font-bold transition-colors scale-on-click"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Venue Maps
                </a>
              </div>

              {/* Wedding: Love Story */}
              {isWedding && (
                <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-gold/30 shadow-gold space-y-4">
                  <div className="flex items-center gap-2 text-premium-gold text-[11px] font-mono font-bold uppercase tracking-wider">
                    <Heart className="w-3.5 h-3.5 fill-current text-premium-danger" />
                    Our Love Story
                  </div>
                  <div className="aspect-video rounded-2xl overflow-hidden border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80"
                      alt="Aria & Daniel"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-[12px] text-zinc-400 leading-relaxed font-light">
                    &quot;From a chance encounter in Jimbaran to a sacred union under the stars. We are overjoyed to celebrate this joyous chapter with our dearest family and friends.&quot;
                  </p>
                  <div className="pt-3 border-t border-premium-borderDark">
                    <div className="text-[11px] text-zinc-500 mb-2">Dress Code</div>
                    <div className="flex items-center gap-2">
                      {['#E5D3B3', '#F43F5E', '#8A9A86', '#18181B'].map((c) => (
                        <div key={c} className="w-6 h-6 rounded-full border border-white/20" style={{ background: c }} />
                      ))}
                      <span className="text-[11px] text-zinc-400 ml-1">Black Tie & Pastel Flora</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Corporate: Keynote speakers */}
              {!isWedding && (
                <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500">Keynote Speakers</span>
                    <span className="text-[10px] font-mono text-premium-neon">Plenary Hall</span>
                  </div>
                  {[
                    { name: 'Clarissa Tan', role: 'MD, FintechSEA', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80', accent: 'text-premium-gold' },
                    { name: 'Hendrik Wijaya', role: 'GP, AlphaGlobal VC', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', accent: 'text-premium-neon' },
                  ].map(({ name, role, img, accent }) => (
                    <div key={name} className="flex items-center gap-3 p-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark">
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-[12px] font-bold text-white">{name}</div>
                        <div className={`text-[10px] ${accent}`}>{role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Rundown */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Clock className="w-4 h-4 text-premium-gold" />
                  <span className="text-[13px] font-display font-bold text-white">Today&apos;s Rundown</span>
                </div>
                <RundownTimeline />
              </div>

              {/* Live Photo Wall Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-premium-neon" />
                    <span className="text-[13px] font-display font-bold text-white">Live Photo Wall</span>
                  </div>
                  <Link
                    href={`/events/${slug}/photowall/live`}
                    target="_blank"
                    className="text-[11px] font-bold text-premium-neon flex items-center gap-1 scale-on-click"
                  >
                    View All
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {photoWallItems.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="relative aspect-square rounded-2xl overflow-hidden bg-premium-charcoal border border-premium-borderDark group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.thumbnail_url || item.image_url}
                        alt={item.caption || 'Photo wall'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="text-[10px] font-bold text-white truncate leading-tight">
                          {item.guest?.name || 'Guest'}
                        </div>
                      </div>
                      {item.media_type === 'video' && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                          <span className="text-[8px] text-white">▶</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Link
                  href={`/events/${slug}/photowall`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-premium-neon/30 text-premium-neon text-[12px] font-bold hover:bg-premium-neon/5 transition-colors scale-on-click"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Open Photo Wall &amp; Upload
                </Link>
              </div>
            </div>
          )}

          {/* ── TAB 2: ACTIVITY ────────────────────────────────── */}
          {activeTab === 'activity' && (
            <div className="px-5 py-5 space-y-5">
              {!gameJoined ? (
                /* Code entry */
                <div className="space-y-5">
                  <div className="text-center pt-4 pb-2">
                    <div className="w-16 h-16 rounded-2xl bg-premium-neon/10 border border-premium-neon/20 text-premium-neon flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-display font-bold text-white">Join a Game</h2>
                    <p className="text-[12px] text-zinc-500 mt-1">Enter the room code shown on stage</p>
                  </div>

                  {/* Code input */}
                  <div className="space-y-3">
                    <input
                      type="text"
                      inputMode="text"
                      autoCapitalize="characters"
                      maxLength={8}
                      value={gameCode}
                      onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE"
                      className="w-full text-center text-4xl font-mono font-bold tracking-[0.3em] py-5 px-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark focus:border-premium-neon/50 text-premium-neon outline-none placeholder-zinc-700 transition-colors"
                    />
                    <button
                      type="button"
                      disabled={gameCode.length < 4}
                      onClick={() => { setGameJoined(true); showToast(`Joined room ${gameCode}!`); }}
                      className="w-full py-4 rounded-2xl bg-premium-neon hover:bg-premium-neonHover text-black font-bold shadow-neon scale-on-click text-[14px] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Join Game
                    </button>
                  </div>

                  {/* Available activities */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-600 px-1">On Stage Now</div>
                    {[
                      { label: 'Live Trivia Blitz', code: 'QUIZ41', color: 'text-premium-neon', bg: 'bg-premium-neon/10 border-premium-neon/20' },
                      { label: 'Audience Poll', code: 'POLL88', color: 'text-premium-gold', bg: 'bg-premium-gold/10 border-premium-gold/20' },
                    ].map(({ label, code, color, bg }) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => { setGameCode(code); }}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border ${bg} scale-on-click transition-all`}
                      >
                        <div className="text-left">
                          <div className="text-[13px] font-bold text-white">{label}</div>
                          <div className={`text-[11px] font-mono mt-0.5 ${color}`}>Code: {code}</div>
                        </div>
                        <ChevronRight className={`w-4 h-4 ${color}`} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Joined state — leaderboard */
                <div className="space-y-5">
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <div className="text-[10px] font-mono text-premium-neon uppercase tracking-wider">Room: {gameCode}</div>
                      <h2 className="text-xl font-display font-bold text-white mt-0.5">Live Leaderboard</h2>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-premium-neon/15 text-premium-neon text-[10px] font-bold border border-premium-neon/25 animate-pulse">LIVE</span>
                  </div>

                  <div className="space-y-2">
                    {[
                      { rank: 1, name: 'Sarah Jenkins', pts: 9450, isMe: false },
                      { rank: 2, name: 'Budi Santoso', pts: 8920, isMe: true },
                      { rank: 3, name: 'Mei Lin', pts: 8100, isMe: false },
                      { rank: 4, name: 'Raj Patel', pts: 7650, isMe: false },
                    ].map(({ rank, name, pts, isMe }) => (
                      <div
                        key={rank}
                        className={`flex items-center gap-4 p-4 rounded-2xl border ${isMe ? 'bg-premium-neon/10 border-premium-neon/30' : 'bg-premium-charcoal border-premium-borderDark'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm flex-shrink-0 ${rank === 1 ? 'bg-premium-gold text-black' : 'bg-premium-surfaceDark text-zinc-400'}`}>
                          {rank}
                        </div>
                        <span className={`flex-1 text-[13px] font-medium ${isMe ? 'text-premium-neon' : 'text-zinc-300'}`}>
                          {name}{isMe && ' (You)'}
                        </span>
                        <span className={`font-display font-bold text-[14px] ${rank === 1 ? 'text-premium-gold' : isMe ? 'text-premium-neon' : 'text-white'}`}>
                          {pts.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={`/events/${slug}/play`}
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-premium-neon text-black font-bold shadow-neon scale-on-click text-[13px]"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    Launch Trivia Buzzer
                  </Link>

                  <button
                    type="button"
                    onClick={() => { setGameJoined(false); setGameCode(''); }}
                    className="w-full py-3 rounded-2xl border border-zinc-700 text-zinc-400 hover:text-white text-[12px] font-medium transition-colors"
                  >
                    Leave Room
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: QR (DUAL STATE) ─────────────────────────── */}
          {activeTab === 'qr' && (
            <div className="px-5 py-5">
              {qrMode === 'pass' ? (
                /* PASS VIEW */
                <div className="space-y-5">
                  {isCheckedIn && (
                    <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-premium-success/10 border border-premium-success/25 text-premium-success text-[12px] font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      Checked In — Welcome, {guest.name}!
                    </div>
                  )}

                  {/* Full QR pass card */}
                  <div className="bg-gradient-to-b from-premium-charcoal to-premium-surfaceDark rounded-[2.5rem] border border-premium-borderDark ticket-cutout overflow-hidden shadow-2xl">
                    {/* Top half */}
                    <div className="p-7 flex flex-col items-center text-center border-b-2 border-dashed border-zinc-800 space-y-5">
                      <span className="px-4 py-1.5 bg-premium-gold/15 text-premium-gold rounded-full text-[10px] font-bold uppercase tracking-widest border border-premium-gold/25">
                        VIP Gate Admission
                      </span>
                      <div className="w-48 h-48 bg-white rounded-2xl p-3 shadow-2xl flex items-center justify-center">
                        {qrDataUrl ? (
                          <img src={qrDataUrl} alt="VIP Pass" className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full bg-zinc-100 animate-pulse rounded-xl" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-2xl font-display font-medium text-white">{guest.name}</h2>
                        <p className="text-zinc-400 text-[12px] font-mono mt-1">
                          Table {guest.table_number || '04'} · Seat 12
                        </p>
                      </div>
                      <div className="font-mono text-[10px] text-zinc-600 bg-premium-black px-4 py-2 rounded-xl border border-premium-borderDark max-w-full truncate">
                        {guest.qr_code_token}
                      </div>
                    </div>
                    {/* Bottom half */}
                    <div className="px-7 py-5 bg-premium-black/40 flex items-center justify-between text-[11px] text-zinc-500">
                      <span>Show at venue entrance</span>
                      <span className="font-mono">{clientDomain}</span>
                    </div>
                  </div>

                  {/* Transform to camera CTA */}
                  {isCheckedIn && (
                    <button
                      type="button"
                      onClick={() => setQrMode('camera')}
                      className="w-full py-4 rounded-2xl bg-premium-neon/10 border border-premium-neon/25 text-premium-neon font-bold text-[13px] scale-on-click flex items-center justify-center gap-2 hover:bg-premium-neon/15 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      Post Photo to Live Wall
                    </button>
                  )}
                </div>
              ) : (
                /* CAMERA / UPLOAD VIEW */
                <div className="space-y-4">
                  {/* Back to pass */}
                  <button
                    type="button"
                    onClick={() => { setQrMode('pass'); setUploadState('idle'); }}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white text-[12px] font-medium transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    Back to Pass
                  </button>

                  {/* Preview */}
                  {previewMedia && (
                    <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden border border-premium-borderDark">
                      <img src={previewMedia} alt="Preview" className="w-full h-full object-cover" />
                      {/* Simulated filter overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-premium-neon/10 to-transparent mix-blend-screen pointer-events-none" />
                      {/* Gold frame */}
                      <div className="absolute inset-3 border-2 border-premium-gold/30 rounded-2xl pointer-events-none" />
                      {uploadState === 'success' && (
                        <div className="absolute inset-0 bg-premium-success/20 flex items-center justify-center">
                          <div className="bg-premium-success rounded-2xl p-4 text-black font-bold text-center">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-1" />
                            Live on Stage!
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Filter/frame row */}
                  <div className="overflow-x-auto hide-scrollbar -mx-5 px-5">
                    <div className="flex gap-2 pb-1 w-max">
                      {['Cyberpunk Neon', 'Vintage Gold', 'Event Frame', 'No Filter'].map((f) => (
                        <button
                          key={f}
                          type="button"
                          className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-premium-charcoal border border-premium-borderDark text-[11px] text-zinc-300 font-medium hover:border-premium-gold/40 scale-on-click transition-colors"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Media type switch */}
                  <div className="flex items-center gap-2 bg-premium-surfaceDark p-1 rounded-xl border border-premium-borderDark">
                    {(['image', 'video'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setUploadMediaType(t)}
                        className={`flex-1 py-2 rounded-lg text-[12px] font-bold capitalize transition-all scale-on-click ${uploadMediaType === t ? 'bg-premium-neon text-black shadow-neon' : 'text-zinc-500'}`}
                      >
                        {t === 'image' ? '📸 Photo' : '🎬 Video (720p)'}
                      </button>
                    ))}
                  </div>

                  {/* Caption */}
                  {captionsEnabled && (
                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-500 mb-1.5">
                        <span>Add a caption</span>
                        <span className="font-mono">{captionText.length}/{maxCaptionLength}</span>
                      </div>
                      <input
                        type="text"
                        maxLength={maxCaptionLength}
                        value={captionText}
                        onChange={(e) => setCaptionText(e.target.value)}
                        placeholder="Share a moment on stage..."
                        className="w-full bg-premium-charcoal border border-premium-borderDark rounded-xl px-4 py-2.5 text-[12px] text-white outline-none focus:border-premium-neon/40 transition-colors"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <input ref={fileInputRef} type="file" accept={uploadMediaType === 'image' ? 'image/*' : 'video/*'} onChange={handleMediaFileChange} className="hidden" />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-3.5 rounded-2xl border border-zinc-700 text-zinc-300 text-[12px] font-bold flex items-center justify-center gap-2 scale-on-click"
                    >
                      <Upload className="w-4 h-4" />
                      Choose
                    </button>
                    <button
                      type="button"
                      onClick={handleSendToWall}
                      disabled={uploadState === 'compressing' || uploadState === 'queued'}
                      className="flex-[2] py-3.5 rounded-2xl bg-premium-neon text-black text-[12px] font-bold shadow-neon scale-on-click flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {uploadState === 'compressing' ? 'Compressing...' : uploadState === 'queued' ? 'Sending...' : (
                        <><Send className="w-4 h-4" />Send to Stage</>
                      )}
                    </button>
                  </div>

                  {/* Social share row */}
                  {uploadState === 'success' && (
                    <div className="p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark space-y-3">
                      <div className="text-[11px] text-zinc-500 text-center">Share to your socials</div>
                      <div className="flex gap-3">
                        <button type="button" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#833AB4] to-[#E1306C] text-white text-[12px] font-bold flex items-center justify-center gap-2 scale-on-click">
                          <ExternalLink className="w-4 h-4" />
                          Stories
                        </button>
                        <button
                          type="button"
                          onClick={() => showToast('Link copied!')}
                          className="flex-1 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white text-[12px] font-bold flex items-center justify-center gap-2 scale-on-click"
                        >
                          <Share2 className="w-4 h-4" />
                          Copy Link
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 4: RAFFLE ──────────────────────────────────── */}
          {activeTab === 'raffle' && (
            <div className="px-5 py-5 space-y-5">
              {/* Eligibility badge */}
              {isCheckedIn ? (
                <div className="flex items-center gap-2 py-3 px-4 rounded-2xl bg-premium-success/10 border border-premium-success/25 text-premium-success text-[12px] font-bold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  You&apos;re in the draw — checked-in guests only
                </div>
              ) : (
                <div className="flex items-center gap-2 py-3 px-4 rounded-2xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-[12px] font-medium">
                  Check in at the gate to join the raffle
                </div>
              )}

              {/* Prize tiers */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-600 px-1">Prize Tiers</div>
                {[
                  { tier: 'Grand Prize', prize: 'Apple MacBook Pro M4 Max', value: 'Rp 45.000.000', icon: '🏆', gold: true },
                  { tier: 'First Prize', prize: 'iPad Pro 13" + Apple Pencil', value: 'Rp 22.000.000', icon: '🥇', gold: false },
                  { tier: 'Second Prize', prize: 'Apple AirPods Max', value: 'Rp 8.000.000', icon: '🥈', gold: false },
                  { tier: 'Third Prize', prize: 'Beats Studio Pro', value: 'Rp 5.500.000', icon: '🥉', gold: false },
                  { tier: 'Consolation ×10', prize: 'all41 Premium Voucher', value: 'Rp 500.000', icon: '🎟', gold: false },
                ].map(({ tier, prize, value, icon, gold }) => (
                  <div
                    key={tier}
                    className={`flex items-center gap-4 p-4 rounded-2xl border ${gold ? 'bg-premium-gold/10 border-premium-gold/30' : 'bg-premium-charcoal border-premium-borderDark'}`}
                  >
                    <span className="text-2xl flex-shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[10px] font-mono font-bold uppercase tracking-wider mb-0.5 ${gold ? 'text-premium-gold' : 'text-zinc-500'}`}>{tier}</div>
                      <div className="text-[13px] font-bold text-white truncate">{prize}</div>
                    </div>
                    <div className={`text-[11px] font-mono font-bold flex-shrink-0 ${gold ? 'text-premium-gold' : 'text-zinc-400'}`}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Winners (announced / pending) */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-600 px-1">Winners</div>
                {MOCK_RAFFLES.length > 0 ? (
                  MOCK_RAFFLES.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl bg-premium-charcoal border border-premium-borderDark">
                      <Trophy className="w-4 h-4 text-premium-gold flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-[12px] font-bold text-white">{r.winner?.name ?? 'TBA'}</div>
                        <div className="text-[10px] text-zinc-500">Table {r.winner?.table_number ?? '—'} · Drawn on stage</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-center">
                    <Gift className="w-8 h-8 text-premium-gold mx-auto mb-2" />
                    <div className="text-[13px] font-medium text-zinc-300">Winners announced live on stage</div>
                    <div className="text-[11px] text-zinc-600 mt-1">Stay tuned — draw begins at 20:30</div>
                  </div>
                )}
              </div>

              <Link
                href={`/events/${slug}/raffle`}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-premium-gold text-black font-bold shadow-gold scale-on-click text-[13px]"
              >
                <Gift className="w-4 h-4" />
                View 3D Raffle Stage
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* ── TAB 5: OTHERS ──────────────────────────────────── */}
          {activeTab === 'others' && (
            <div className="px-5 py-5 space-y-5">

              {/* Comment / Message */}
              <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-premium-gold" />
                  <span className="text-[13px] font-bold text-white">Leave a Message</span>
                </div>
                {!commentSent ? (
                  <>
                    <textarea
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Write your congratulations, thoughts, or wishes..."
                      className="w-full bg-premium-surfaceDark border border-premium-borderDark rounded-2xl px-4 py-3 text-[12px] text-white outline-none focus:border-premium-gold/40 resize-none transition-colors placeholder-zinc-600"
                    />
                    <button
                      type="button"
                      disabled={comment.trim().length < 3}
                      onClick={() => { setCommentSent(true); showToast('Message sent!'); confetti({ particleCount: 30, spread: 40, origin: { y: 0.7 } }); }}
                      className="w-full py-3 rounded-2xl bg-premium-gold text-black font-bold text-[12px] shadow-gold scale-on-click disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send Message
                    </button>
                  </>
                ) : (
                  <div className="text-center py-3">
                    <CheckCircle2 className="w-8 h-8 text-premium-success mx-auto mb-2" />
                    <div className="text-[13px] font-medium text-white">Message sent!</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">The organiser will see it</div>
                  </div>
                )}
              </div>

              {/* Digital Angpao / Gift (wedding) or Virtual Cheers (corporate) */}
              {isWedding ? (
                <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-gold/30 shadow-gold space-y-4">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-premium-gold" />
                    <span className="text-[13px] font-bold text-white">Digital Angpao</span>
                  </div>
                  <div className="p-4 bg-white rounded-2xl flex flex-col items-center gap-2">
                    <div className="text-[9px] font-mono text-zinc-500 font-bold">QRIS STANDAR PEMBAYARAN</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=00020101021226680016ID.CO.ALL41.APP0118936009180020987654"
                      alt="QRIS"
                      className="w-32 h-32"
                    />
                  </div>
                  <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark space-y-2">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-zinc-400 font-mono">BCA · Aria & Daniel</span>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText('8831092841'); setCopiedAccount(true); setTimeout(() => setCopiedAccount(false), 2000); }}
                        className="text-premium-gold font-bold flex items-center gap-1"
                      >
                        {copiedAccount ? <Check className="w-3.5 h-3.5 text-premium-success" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedAccount ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="font-mono text-base font-bold text-white">8831 0928 41</div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } }); showToast('Cheers sent to the stage! 🥂'); }}
                  className="w-full py-4 rounded-2xl bg-premium-charcoal border border-premium-gold/30 hover:border-premium-gold/60 text-white text-[13px] font-bold scale-on-click transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-xl">🥂</span>
                  Send Virtual Cheers to Stage
                </button>
              )}

              {/* Event hashtag + social */}
              <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-premium-neon" />
                  <span className="text-[13px] font-bold text-white">Event Hashtag</span>
                </div>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(isWedding ? '#AriaAndDaniel2026' : '#TechUnite2026'); showToast('Hashtag copied!'); }}
                  className="w-full py-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-premium-neon font-mono text-base font-bold scale-on-click flex items-center justify-center gap-3"
                >
                  {isWedding ? '#AriaAndDaniel2026' : '#TechUnite2026'}
                  <Copy className="w-4 h-4 text-zinc-500" />
                </button>
              </div>

              {/* Feedback */}
              {!feedbackSent ? (
                <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
                  <div className="text-[13px] font-bold text-white">Rate Your Experience</div>
                  <div className="flex items-center justify-center gap-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFeedbackRating(s)}
                        className={`scale-on-click transition-all ${feedbackRating >= s ? 'text-premium-gold' : 'text-zinc-700'}`}
                      >
                        <Star className={`w-8 h-8 ${feedbackRating >= s ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={feedbackRating === 0}
                    onClick={() => { setFeedbackSent(true); showToast('Thanks for your feedback!'); }}
                    className="w-full py-3 rounded-2xl bg-premium-gold text-black font-bold text-[12px] shadow-gold scale-on-click disabled:opacity-40"
                  >
                    Submit Feedback
                  </button>
                </div>
              ) : (
                <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark text-center">
                  <Star className="w-8 h-8 text-premium-gold fill-current mx-auto mb-2" />
                  <div className="text-[13px] font-medium text-white">Thank you for your {feedbackRating}-star feedback!</div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Bottom Navigation ─────────────────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 z-30 flex-shrink-0">
          <div className="mx-4 mb-5 glass-panel rounded-[2rem] px-2 py-2 flex items-center justify-around shadow-2xl border border-zinc-700/80">
            {NAV_TABS.map(({ id, icon: Icon, label, isCentral }) => {
              const isActive = activeTab === id;
              if (isCentral) {
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl scale-on-click transition-all ${isActive ? 'bg-premium-gold/20' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-premium-gold text-black shadow-gold' : 'bg-premium-charcoal text-premium-gold border border-premium-gold/30'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[9px] font-bold ${isActive ? 'text-premium-gold' : 'text-zinc-600'}`}>
                      {label}
                    </span>
                  </button>
                );
              }
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl scale-on-click transition-all"
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-zinc-600'}`} />
                  <span className={`text-[9px] font-bold transition-colors ${isActive ? 'text-white' : 'text-zinc-600'}`}>
                    {label}
                  </span>
                  {isActive && <div className="w-1 h-1 rounded-full bg-premium-gold" />}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Wrapper (Next.js 16 params unwrap) ──────────────────────────────────────
function MobileGuestPortalWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <MobileGuestPortalContent slug={slug} />;
}

export default function MobileGuestPortalPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-premium-black" />}>
      <MobileGuestPortalWrapper params={params} />
    </Suspense>
  );
}
