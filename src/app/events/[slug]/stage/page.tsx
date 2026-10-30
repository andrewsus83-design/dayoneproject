'use client';

import React, { useState, useEffect, useRef, use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { Maximize2, Minimize2, Camera, Gamepad2, Gift, Sparkles, RotateCcw, Trophy, WifiOff } from 'lucide-react';
import { useEventConfigBySlug, useSampleGuests } from '@/lib/eventStore';
import { isSampleSlug } from '@/lib/events';
import { isServerEventId } from '@/lib/guestsApi';
import { createClient } from '@/lib/supabase/client';
import { feedToUploads, organizerPhotoApi, useWallFeed } from '@/lib/photoWallApi';
import { publicWinnerLabel } from '@/lib/doorPrizeApi';
import {
  STAGE_MODULE_NAMES, defaultTicker, newerStage, normalizeStageState, showableModules, useLocalStage, useStageFeed,
} from '@/lib/stageApi';
import { MOCK_PHOTO_WALL_UPLOADS } from '@/lib/mockData';
import type { StageModuleId } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { getClientDomain } from '@/lib/domain';
import { type SlotResult } from '@/components/raffle/SlotMachine';
import { DrawMachine, DRAW_STYLES } from '@/components/raffle/DrawMachine';
import { PinterestMasonryPhotoWall } from '@/components/events/PinterestMasonryPhotoWall';

const SAMPLE_PHOTOS = MOCK_PHOTO_WALL_UPLOADS.filter((p) => p.is_approved);
const KEY_MODULES: Record<string, StageModuleId> = { '1': 'welcome', '2': 'photowall', '3': 'quiz', '4': 'raffle' };
const LIVE_QUIZ_PHASES = ['lobby', 'question', 'reveal'];

/** The photo wall key: from ?key= (the dashboard's links), else read with the organizer's own session. */
function useWallKey(eventId: string, enabled: boolean, keyParam: string | null) {
  const [memberKey, setMemberKey] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || keyParam || !isServerEventId(eventId)) return;
    let alive = true;
    (async () => {
      const { data } = await createClient().auth.getSession();
      if (!data.session) return;
      const settings = await organizerPhotoApi.settings(eventId);
      if (alive) setMemberKey(settings?.wall_key ?? null);
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [eventId, enabled, keyParam]);
  return enabled ? keyParam || memberKey : null;
}

/**
 * The big LED stage screen at /events/[slug]/stage. Public and read-only: on a saved event it shows what the
 * operator set in the dashboard (StageLedEditor → the server), polled from the cached /api/stage/<slug> route, and
 * follows the operator on this device at once. Sample events follow this device only. Technicians can still flip
 * modules with the keys (1–4, space for auto-rotate) until the operator's next change.
 */
function StageBigScreenContent({ slug }: { slug: string }) {
  const { eventId, event, config } = useEventConfigBySlug(slug);
  const sample = isSampleSlug(slug);
  const clientDomain = getClientDomain(slug);
  const keyParam = useSearchParams().get('key');

  // What the operator set: the server's copy, or this device's newer one (sample events: this device only).
  const { feed, state: feedState } = useStageFeed(slug, !sample, 2000);
  const local = useLocalStage(eventId);
  const remote = normalizeStageState(sample ? local : newerStage(feed?.stage ? normalizeStageState(feed.stage) : null, local));
  const showable = showableModules(remote);

  // A technician's key press holds until the operator changes something.
  const [override, setOverride] = useState<{ module: StageModuleId | 'auto'; rev: number } | null>(null);
  const held = override && override.rev === remote.rev ? override.module : null;
  const isAutoRotating = held ? held === 'auto' : remote.auto_rotate;
  const [rotIndex, setRotIndex] = useState(0);
  const rotating = showable[rotIndex % showable.length];
  const fixed = held && held !== 'auto' ? held : remote.active_module;
  const stageMode: StageModuleId = isAutoRotating
    ? rotating.id
    : held && held !== 'auto'
      ? fixed
      : showable.some((m) => m.id === fixed) ? fixed : 'welcome';

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hudVisible, setHudVisible] = useState(false);
  const [qrUploadUrl, setQrUploadUrl] = useState('');

  // Sample events: guests and the door prize draw on this device.
  const sampleGuests = useSampleGuests(eventId);
  const checkedInCount = sample ? sampleGuests.filter((g) => g.is_checked_in).length : feed?.checked_in ?? 0;
  const stageDraw = config.doorprizes.items.find((d) => d.id === config.doorprizes.activeId) ?? config.doorprizes.items[0];
  const activity = config.games.activities.find((a) => a.id === config.games.activeId) ?? config.games.activities[0];
  const [slotTrigger, setSlotTrigger] = useState(0);
  const [slotResult, setSlotResult] = useState<SlotResult | null>(null);
  const [isRaffleSpinning, setIsRaffleSpinning] = useState(false);

  // The real photo wall (approved photos) for saved events.
  const wallKey = useWallKey(eventId, !sample, keyParam);
  const { feed: wall } = useWallFeed(slug, wallKey, 6000);
  const photos = sample ? SAMPLE_PHOTOS : feedToUploads(wall?.photos ?? []);
  const captionsEnabled = sample ? event.settings?.enablePhotoWallCaptions ?? true : wall?.captions ?? true;

  const latest = feed?.latest_winner ?? null;
  const quiz = feed?.quiz && LIVE_QUIZ_PHASES.includes(feed.quiz.phase) ? feed.quiz : null;
  const tickerText = remote.ticker || defaultTicker(
    { name: event.name, date: event.start_date ? formatDate(event.start_date) : undefined, venue: event.location_name },
    clientDomain,
  );

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // What the key handler needs to know about the screen right now.
  const nowRef = useRef({ rev: remote.rev, auto: isAutoRotating, mode: stageMode });
  useEffect(() => {
    nowRef.current = { rev: remote.rev, auto: isAutoRotating, mode: stageMode };
  }, [remote.rev, isAutoRotating, stageMode]);

  useEffect(() => {
    QRCode.toDataURL(`https://${clientDomain}/photowall`, {
      width: 240,
      margin: 1,
      color: { dark: '#09090B', light: '#ffffff' },
    }).then(setQrUploadUrl);

    // Keyboard shortcuts for ballroom technicians
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 'h' || e.key === 'H') setHudVisible((v) => !v);
      if (e.key === ' ') {
        e.preventDefault();
        // Pause on the module showing now, or start rotating again.
        const now = nowRef.current;
        setOverride({ module: now.auto ? now.mode : 'auto', rev: now.rev });
      }
      const target = KEY_MODULES[e.key];
      if (target) setOverride({ module: target, rev: nowRef.current.rev });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clientDomain]);

  // Auto-rotation between the enabled modules, each for its own slide time
  useEffect(() => {
    if (!isAutoRotating || showable.length <= 1) return;
    const timer = setTimeout(() => setRotIndex((i) => (i + 1) % showable.length), (rotating?.seconds || 20) * 1000);
    return () => clearTimeout(timer);
  }, [isAutoRotating, rotIndex, showable.length, rotating?.seconds]);

  // Celebrate each new door prize winner while the draw is on screen (not the ones already drawn when it opened).
  const latestId = latest?.id ?? null;
  const feedLoaded = !!feed;
  const seenLatest = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!feedLoaded) return;
    if (seenLatest.current !== undefined && latestId && latestId !== seenLatest.current && stageMode === 'raffle') {
      confetti({ particleCount: 180, spread: 100, origin: { y: 0.6 }, colors: ['#00F0FF', '#C5A059', '#FF3366', '#00E676'] });
    }
    seenLatest.current = latestId;
  }, [feedLoaded, latestId, stageMode]);

  const handleStageSpin = () => {
    if (isRaffleSpinning) return;
    setSlotResult(null);
    // Wait a beat so the machine is mounted when the stage just switched to the raffle module.
    window.setTimeout(() => setSlotTrigger((t) => t + 1), 150);
  };

  const pick = (m: StageModuleId) => setOverride({ module: m, rev: remote.rev });

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 flex flex-col justify-between overflow-x-hidden relative select-none font-sans">
      {/* Background Stage Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-premium-neon/10 blur-[180px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-premium-gold/10 blur-[180px] pointer-events-none rounded-full" />

      {/* POPVERSE LED Stage Frame — decorative cathedral border overlay for the big screen */}
      {slug === 'popverse' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="https://cdn.openart.ai/openart-ai/production/2026-10/create-image/gyygId5ZYPaN2nz17abs/image_1793300675118_e65da6c9_1793300675879_1fc2362a.png"
          alt="POPVERSE stage frame"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none z-30"
          style={{ mixBlendMode: 'screen' }}
        />
      )}

      {/* Top Ballroom Stage Header */}
      <header className="h-20 px-8 sm:px-12 flex items-center justify-between z-20 backdrop-blur-md bg-premium-surfaceDark/80 border-b border-premium-borderDark">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-xl shadow-gold flex-shrink-0">
            D1
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <span className="truncate">{event.name}</span>
              {isAutoRotating && showable.length > 1 && (
                <span className="px-2.5 py-0.5 rounded-full bg-premium-neon/15 text-premium-neon border border-premium-neon/30 font-mono text-[10px] flex items-center gap-1 shrink-0">
                  <RotateCcw className="w-2.5 h-2.5 animate-spin" />
                  <span>Auto-Rotate</span>
                </span>
              )}
            </h1>
            <p className="text-xs text-zinc-400 font-mono truncate">
              <span className="text-premium-neon font-bold">{clientDomain}</span> • {formatDate(event.start_date)}
              {event.location_name ? ` • ${event.location_name}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {!sample && feedState === 'offline' && (
            <span className="hidden md:flex items-center gap-1.5 text-xs font-mono text-premium-danger">
              <WifiOff className="w-4 h-4" /> Reconnecting…
            </span>
          )}
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-mono uppercase text-zinc-400 block">Checked in</span>
            <div className="text-lg font-display font-bold text-premium-success flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-premium-success animate-pulse" />
              <span>{checkedInCount.toLocaleString()} guests</span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-2xl bg-premium-charcoal border border-premium-borderDark text-zinc-300 hover:text-white transition-colors scale-on-click"
            title="Toggle Stage Fullscreen (Key: F)"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* MODULE 1: Welcome & attendance */}
      {stageMode === 'welcome' && (
        <main className="flex-1 p-10 sm:p-14 flex flex-col justify-center items-center text-center max-w-5xl mx-auto z-10 animate-fadeIn">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-premium-gold/20 border border-premium-gold/30 text-xs font-bold text-premium-gold uppercase tracking-widest mb-6">
            <Sparkles className="w-4 h-4 text-premium-gold" />
            <span>Welcome</span>
          </div>

          <h2 className="text-4xl sm:text-7xl font-display font-medium text-white tracking-tight leading-tight mb-6">
            {event.name}
          </h2>

          <p className="text-base sm:text-xl text-zinc-300 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            Please take your seats. The program begins shortly.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
            <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark shadow-xl">
              <span className="text-xs font-mono uppercase text-zinc-400">Checked in</span>
              <div className="text-4xl font-display font-bold text-premium-success mt-2">{checkedInCount.toLocaleString()}</div>
              <span className="text-xs text-zinc-500 mt-1 block">Guests scanned at the door</span>
            </div>

            <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark shadow-xl">
              <span className="text-xs font-mono uppercase text-zinc-400">Guest page</span>
              <div className="text-lg font-mono font-bold text-premium-neon mt-2 truncate">{clientDomain}</div>
              <span className="text-xs text-zinc-400 mt-1 block">Photo wall and games</span>
            </div>
          </div>
        </main>
      )}

      {/* MODULE 2: Pinterest-style photo wall (approved guest photos) */}
      {stageMode === 'photowall' && (
        <main className="flex-1 p-8 sm:p-12 max-w-7xl mx-auto w-full z-10 animate-fadeIn">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-premium-borderDark">
            <div className="flex items-center gap-3">
              <Camera className="w-6 h-6 text-premium-neon" />
              <h3 className="text-2xl font-display font-bold text-white">Photo Wall</h3>
              {photos.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-premium-success/20 text-premium-success text-xs font-mono font-bold">
                  {(sample ? photos.length : wall?.total ?? photos.length).toLocaleString()} PHOTOS
                </span>
              )}
            </div>

            <div className="text-right font-mono text-xs text-premium-gold">
              Scan QR or visit: <strong className="text-white">{clientDomain}/photowall</strong>
            </div>
          </div>

          {photos.length > 0 ? (
            <PinterestMasonryPhotoWall
              photos={photos}
              showCaptions={captionsEnabled}
              canLike={false}
              frameOverlayUrl={slug === 'popverse' ? 'https://cdn.openart.ai/openart-ai/production/2026-10/create-image/gyygId5ZYPaN2nz17abs/image_1793300673142_6e56e2a4_1793300673564_d0c29a20.png' : undefined}
            />
          ) : (
            <div className="py-16 flex flex-col items-center text-center gap-6">
              {qrUploadUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrUploadUrl} alt="QR code for the photo wall" className="w-48 h-48 rounded-3xl bg-white p-3" />
              )}
              <div className="space-y-2">
                <h4 className="text-3xl font-display font-bold text-white">Share your photos</h4>
                <p className="text-zinc-400 font-mono">{clientDomain}/photowall</p>
              </div>
            </div>
          )}
        </main>
      )}

      {/* MODULE 3: Games — how to join */}
      {stageMode === 'quiz' && (
        <main className="flex-1 p-10 flex flex-col justify-center items-center max-w-4xl mx-auto w-full z-10 animate-fadeIn text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-premium-gold/20 border border-premium-gold/30 text-xs font-bold text-premium-gold uppercase tracking-widest">
            <Gamepad2 className="w-4 h-4" />
            <span>{quiz ? 'Trivia is live' : sample && activity?.kind === 'scavenger' ? 'Scavenger Hunt' : 'Live Trivia'}</span>
          </div>
          <h2 className="text-4xl sm:text-6xl font-display font-medium text-white tracking-tight">
            {quiz?.title || (sample ? activity?.name : '') || 'Get ready to play'}
          </h2>
          {quiz ? (
            <p className="text-lg text-zinc-400 font-light">
              {quiz.players.toLocaleString()} {quiz.players === 1 ? 'player' : 'players'} in
              {quiz.position ? ` · question ${quiz.position} of ${quiz.question_count}` : ` · ${quiz.question_count} ${quiz.question_count === 1 ? 'question' : 'questions'}`}
            </p>
          ) : sample && activity ? (
            <p className="text-lg text-zinc-400 font-light">
              {activity.kind === 'scavenger'
                ? `${activity.clues.length} ${activity.clues.length === 1 ? 'clue' : 'clues'} to find`
                : `${activity.questions.length} ${activity.questions.length === 1 ? 'question' : 'questions'}`}
            </p>
          ) : null}
          <div className="flex flex-col sm:flex-row items-stretch gap-4">
            <div className="px-8 py-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark">
              <span className="text-xs font-mono uppercase text-zinc-400 block mb-1">Join on your phone</span>
              <span className="text-2xl font-mono font-bold text-premium-neon">{clientDomain}/play</span>
            </div>
            {quiz?.join_code && (
              <div className="px-8 py-5 rounded-[2rem] bg-premium-charcoal border border-premium-gold/50 shadow-gold">
                <span className="text-xs font-mono uppercase text-zinc-400 block mb-1">Game code</span>
                <span className="text-4xl font-mono font-bold text-premium-gold tracking-[0.3em]">{quiz.join_code}</span>
              </div>
            )}
          </div>
          {quiz && <p className="text-xs text-zinc-500">Checked-in guests only: open your pass, then enter the code.</p>}
        </main>
      )}

      {/* MODULE 4 (saved events): the latest door prize winner, drawn on the door prize screen */}
      {stageMode === 'raffle' && !sample && (
        <main className="flex-1 p-10 flex flex-col justify-center items-center max-w-5xl mx-auto w-full z-10 animate-fadeIn text-center space-y-6">
          <div>
            <span className="text-xs font-mono uppercase text-premium-gold font-bold tracking-widest">
              ★ {(feed?.doorprize?.name ?? latest?.prize_name ?? 'Door Prize').toUpperCase()} ★
            </span>
            {(feed?.doorprize?.prize ?? latest?.prize) && (
              <h2 className="text-4xl font-display font-bold text-white mt-1">{feed?.doorprize?.prize ?? latest?.prize}</h2>
            )}
          </div>

          {latest ? (
            <div key={latest.id} className="px-12 py-10 rounded-[2.5rem] bg-premium-charcoal border-2 border-premium-gold shadow-gold text-center space-y-2 animate-fadeIn">
              <Trophy className="w-12 h-12 text-premium-gold mx-auto" />
              <span className="block text-xs font-mono uppercase text-premium-success tracking-widest font-bold">
                🎉 {latest.name ? 'LUCKY GUEST' : 'LUCKY NUMBER'} · {latest.prize_name} 🎉
              </span>
              <h3 className={`font-bold text-premium-gold ${latest.name ? 'text-6xl font-display' : 'text-7xl font-mono tracking-[0.2em]'}`}>
                {publicWinnerLabel(latest)}
              </h3>
              {latest.table_no && <p className="text-xl text-zinc-300">Table {latest.table_no}</p>}
            </div>
          ) : (
            <div className="px-12 py-10 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark text-center space-y-3">
              <Gift className="w-12 h-12 text-premium-gold mx-auto" />
              <p className="text-2xl font-display text-white">The draw is about to begin</p>
              <p className="text-sm text-zinc-400">Winners appear here the moment they are drawn.</p>
            </div>
          )}

          {feed?.doorprize && (
            <p className="text-sm font-mono text-zinc-400">
              {feed.doorprize.name}: <span className="text-premium-gold font-bold">{feed.doorprize.awarded}/{feed.doorprize.quantity}</span> drawn
            </p>
          )}
        </main>
      )}

      {/* MODULE 4 (sample events): the door prize marked "on stage" in the dashboard, drawn on this device */}
      {stageMode === 'raffle' && sample && stageDraw && (
        <main className="flex-1 p-10 flex flex-col justify-center items-center max-w-5xl mx-auto w-full z-10 animate-fadeIn text-center space-y-6">
          <div>
            <span className="text-xs font-mono uppercase text-premium-gold font-bold tracking-widest">
              ★ {stageDraw.name.toUpperCase()} • {(DRAW_STYLES.find((d) => d.id === stageDraw.style)?.label ?? '').toUpperCase()} ★
            </span>
            <h2 className="text-4xl font-display font-bold text-white mt-1">{stageDraw.prize}</h2>
          </div>

          <div className="my-2 w-full flex justify-center">
            <DrawMachine
              key={stageDraw.id}
              eventId={eventId}
              draw={stageDraw}
              size="lg"
              trigger={slotTrigger}
              showButton={false}
              onSpinStart={() => setIsRaffleSpinning(true)}
              onResult={(r) => { setIsRaffleSpinning(false); setSlotResult(r); }}
            />
          </div>

          {slotResult && (
            <div className="px-10 py-6 rounded-3xl bg-premium-charcoal border-2 border-premium-gold shadow-gold text-center space-y-1">
              <span className="text-xs font-mono uppercase text-premium-success tracking-widest font-bold">
                🎉 {slotResult.mode === 'number' ? 'LUCKY NUMBER' : 'LUCKY GUEST'} 🎉
              </span>
              <h3 className={`font-bold text-premium-gold ${slotResult.mode === 'number' ? 'text-7xl font-mono tracking-[0.2em]' : 'text-5xl font-display'}`}>
                {slotResult.label}
              </h3>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              disabled={isRaffleSpinning}
              onClick={handleStageSpin}
              className={`px-10 py-4 rounded-2xl font-display font-bold text-sm uppercase tracking-wider text-black shadow-gold transition-all scale-on-click ${
                isRaffleSpinning ? 'bg-premium-borderDark text-zinc-400 cursor-not-allowed' : 'bg-premium-gold hover:bg-premium-goldHover'
              }`}
            >
              {isRaffleSpinning ? 'DRAWING LIVE ON STAGE...' : 'TRIGGER STAGE DRAW'}
            </button>
          </div>
        </main>
      )}

      {stageMode === 'raffle' && sample && !stageDraw && (
        <main className="flex-1 p-10 flex flex-col justify-center items-center text-center z-10 animate-fadeIn">
          <h2 className="text-4xl font-display font-medium text-white">Door prize draw</h2>
          <p className="text-zinc-400 mt-3">Set up a door prize in the dashboard to draw it here.</p>
        </main>
      )}

      {/* Scrolling Stage Bottom Ticker Text */}
      <div className="h-10 bg-premium-surfaceDark border-t border-premium-borderDark overflow-hidden flex items-center z-20">
        <div className="whitespace-nowrap animate-marquee font-mono text-xs text-premium-gold flex items-center gap-8">
          <span>{tickerText}</span>
          <span>•</span>
          <span>{tickerText}</span>
        </div>
      </div>

      {/* Stage Tech HUD Controller Bar (Hidden with key H) */}
      {hudVisible && (
        <footer className="h-14 px-8 bg-premium-surfaceDark/90 border-t border-premium-borderDark flex items-center justify-between z-30 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">HUD [Key: H to toggle]:</span>
            <button
              type="button"
              onClick={() => setOverride({ module: isAutoRotating ? stageMode : 'auto', rev: remote.rev })}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 scale-on-click ${
                isAutoRotating
                  ? 'bg-premium-neon text-black shadow-neon'
                  : 'bg-premium-charcoal text-zinc-300 hover:text-white border border-premium-borderDark'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Auto-Rotate: {isAutoRotating ? 'ON' : 'PAUSED'}</span>
            </button>
          </div>

          {/* Module Switcher Buttons (the 7 system modules only) */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {showable.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onClick={() => pick(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all scale-on-click ${
                  stageMode === m.id
                    ? 'bg-premium-gold text-black shadow-gold'
                    : 'bg-premium-charcoal text-zinc-400 hover:text-white border border-premium-borderDark'
                }`}
              >
                {idx + 1}. {STAGE_MODULE_NAMES[m.id]}
              </button>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
}

function StageBigScreenWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  return <StageBigScreenContent slug={unwrappedParams.slug} />;
}

export default function StageBigScreenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-zinc-400">Loading stage screen...</div>}>
      <StageBigScreenWrapper params={params} />
    </Suspense>
  );
}
