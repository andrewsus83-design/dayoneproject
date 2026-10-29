'use client';

import React, { useState, useEffect, useCallback, use, Suspense } from 'react';
import Link from 'next/link';
import {
  MOCK_EVENT,
  MOCK_WEDDING_EVENT,
  MOCK_GUESTS,
  MOCK_PHOTO_WALL_UPLOADS,
  MOCK_RUNDOWN,
  MOCK_MENU,
  DEFAULT_STAGE_CONFIG,
} from '@/lib/mockData';
import { Guest, PhotoWallUpload, StageConfig, StageModuleId } from '@/lib/types';
import {
  QrCode,
  Camera,
  Gamepad2,
  Gift,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Check,
  X,
  ArrowLeft,
  Tv,
  Eye,
  Send,
  Layers,
  Columns,
  Monitor,
  SkipForward,
  Lock,
  Unlock,
  Plus,
  Minus,
  MousePointerClick,
  Timer,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StageLedEditor } from '@/components/dashboard/StageLedEditor';

type BigScreenTarget = 'stage' | 'photowall' | 'games' | 'raffle';
type ViewLayoutMode = 'switcher_studio' | 'split_live' | 'bigscreen_focus';
type TransitionTriggerMode = 'manual_click' | 'custom_timer';

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: 'In which year was the first startup unicorn founded in Southeast Asia?',
    options: ['A. 2009', 'B. 2012', 'C. 2014', 'D. 2016'],
    correct: 'B. 2012',
    points: 1000,
    timerSeconds: 15,
  },
  {
    id: 2,
    question: 'Which city is hosting the TechUnite APAC Executive Gala tonight?',
    options: ['A. Singapore', 'B. Jakarta', 'C. Bali', 'D. Kuala Lumpur'],
    correct: 'B. Jakarta',
    points: 1000,
    timerSeconds: 15,
  },
  {
    id: 3,
    question: 'What is the official interactive portal domain for all guests tonight?',
    options: ['A. techunite.all41.app', 'B. summit.com', 'C. event.id', 'D. gala.org'],
    correct: 'A. techunite.all41.app',
    points: 1500,
    timerSeconds: 20,
  },
];

function OperatorCommandCenterContent({ eventId }: { eventId: string }) {
  const event = eventId === 'evt-002' ? MOCK_WEDDING_EVENT : MOCK_EVENT;

  // 1. Top Surface Switcher: Operator Deck vs Split View vs Active Big Screen Focus
  const [viewLayout, setViewLayout] = useState<ViewLayoutMode>('switcher_studio');
  const [selectedBigScreenTarget, setSelectedBigScreenTarget] = useState<BigScreenTarget>('stage');
  const [activeTab, setActiveTab] = useState<'switcher' | 'photowall' | 'gate' | 'gamemaster' | 'raffle' | 'stage_editor'>('switcher');

  // 2. Preview (Staging Cue) vs Active Program (Live on Big Screen) State
  const [stageConfig, setStageConfig] = useState<StageConfig>(DEFAULT_STAGE_CONFIG);
  const [previewModule, setPreviewModule] = useState<StageModuleId>('photowall');
  const [liveActiveModule, setLiveActiveModule] = useState<StageModuleId>('welcome');
  const [cuedPhoto, setCuedPhoto] = useState<PhotoWallUpload | null>(null);

  // 3. Transition Trigger Mode: Manual Click vs Customizable Auto-Timer
  const [triggerMode, setTriggerMode] = useState<TransitionTriggerMode>('manual_click');
  const [customTimerSeconds, setCustomTimerSeconds] = useState<number>(20);
  const [countdownRemaining, setCountdownRemaining] = useState<number>(20);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isScreenLocked, setIsScreenLocked] = useState<boolean>(false);
  const [lastPushTimestamp, setLastPushTimestamp] = useState<string>('Just now');

  // 4. Gate Scanner State
  const [guests, setGuests] = useState<Guest[]>(MOCK_GUESTS);
  const [tokenInput, setTokenInput] = useState('');
  const [gateFeedback, setGateFeedback] = useState<{ status: 'success' | 'duplicate' | 'invalid'; message: string; guest?: Guest } | null>(null);

  // 5. Photo Wall Moderation & Stage Broadcast Queue State
  const [pendingPhotos, setPendingPhotos] = useState<PhotoWallUpload[]>([
    ...MOCK_PHOTO_WALL_UPLOADS,
    {
      id: 'pw-pending-1',
      event_id: eventId,
      guest_id: 'gst-004',
      media_type: 'image',
      image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80',
      thumbnail_url: null,
      filter_used: 'cyberpunk-neon',
      frame_used: 'gold-badge-2026',
      caption: 'Celebrating our Q4 wins with the APAC team! 🎉🥂',
      is_approved: false,
      created_at: new Date().toISOString(),
      guest: { id: 'gst-004', name: 'Siti Rahmawati', table_number: 'Emerald 08' },
    },
    {
      id: 'pw-pending-2',
      event_id: eventId,
      guest_id: 'gst-006',
      media_type: 'image',
      image_url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80',
      thumbnail_url: null,
      filter_used: 'glam-gold',
      frame_used: 'cyber-frame',
      caption: 'Stage lighting is incredible tonight! ⚡🚀',
      is_approved: false,
      created_at: new Date().toISOString(),
      guest: { id: 'gst-006', name: 'Nadia Michelle', table_number: 'Platinum 01' },
    },
  ]);

  // 6. Game Master & Raffle Queue State
  const [gameStep, setGameStep] = useState<'lobby' | 'question_active' | 'answers_locked' | 'reveal' | 'podium'>('question_active');
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [rafflePrize, setRafflePrize] = useState('Apple MacBook Pro M4 Max (16-inch)');
  const [raffleStyle, setRaffleStyle] = useState<'wheel' | 'claw' | 'slot'>('slot');
  const [isRaffleBroadcasting, setIsRaffleBroadcasting] = useState(false);

  const enabledModules = stageConfig.modules.filter((m) => m.isEnabled);
  const unapprovedPhotos = pendingPhotos.filter((p) => !p.is_approved);
  const approvedPhotos = pendingPhotos.filter((p) => p.is_approved);
  const checkedInCount = guests.filter((g) => g.is_checked_in).length;

  // Broadcast live state to all Big Screen surfaces (/stage, /photowall/live, /games, /raffle, /play) via BroadcastChannel + localStorage
  const broadcastToBigScreen = useCallback(
    (
      nextModule: StageModuleId,
      autoRotating: boolean,
      updatedPhotos?: PhotoWallUpload[],
      overrideQuizIdx?: number,
      overrideGameStep?: 'question_active' | 'answers_locked' | 'reveal' | 'podium'
    ) => {
      const qIdx = overrideQuizIdx ?? activeQuestionIdx;
      const gStep = overrideGameStep ?? gameStep;
      const payload = {
        type: 'STAGE_PUSH_LIVE',
        activeModule: nextModule,
        isAutoRotating: autoRotating,
        stageConfig,
        approvedPhotos: updatedPhotos || approvedPhotos,
        rafflePrize,
        raffleStyle,
        activeQuestionIdx: qIdx,
        gameStep: gStep,
        quizQuestion: QUIZ_QUESTIONS[qIdx % QUIZ_QUESTIONS.length],
        checkedInCount,
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem('all41_live_stage_state', JSON.stringify(payload));
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const channel = new BroadcastChannel('all41_stage_bus');
          channel.postMessage(payload);
          channel.close();
        }
      } catch {
        // Ignore storage error
      }
      setLastPushTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    },
    [stageConfig, approvedPhotos, rafflePrize, raffleStyle, activeQuestionIdx, gameStep, checkedInCount]
  );

  // Push Preview (Cue) -> Active Big Screen (Program)
  const handlePushPreviewToLive = useCallback(() => {
    if (isScreenLocked) return;

    const pushedModule = previewModule;
    setLiveActiveModule(pushedModule);

    // Automatically cue the next enabled module in the queue into Preview
    const currentIdx = enabledModules.findIndex((m) => m.id === pushedModule);
    const nextMod = enabledModules[(currentIdx + 1) % Math.max(1, enabledModules.length)];
    if (nextMod) {
      setPreviewModule(nextMod.id);
    }

    // Reset countdown timer to the pushed module's configured duration or customTimerSeconds
    const modDuration = stageConfig.modules.find((m) => m.id === pushedModule)?.durationSeconds || customTimerSeconds;
    setCountdownRemaining(modDuration);

    broadcastToBigScreen(pushedModule, triggerMode === 'custom_timer');
  }, [isScreenLocked, previewModule, enabledModules, stageConfig.modules, customTimerSeconds, triggerMode, broadcastToBigScreen]);

  // Auto-Timer Countdown Effect when triggerMode === 'custom_timer'
  useEffect(() => {
    if (triggerMode !== 'custom_timer' || !isTimerRunning || isScreenLocked) return;

    const interval = setInterval(() => {
      setCountdownRemaining((prev) => {
        if (prev <= 1) {
          handlePushPreviewToLive();
          return customTimerSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [triggerMode, isTimerRunning, isScreenLocked, customTimerSeconds, handlePushPreviewToLive]);

  // Update individual module timer in the queue
  const handleUpdateModuleDuration = (modId: StageModuleId, newSeconds: number) => {
    const clamped = Math.max(5, Math.min(180, newSeconds));
    const updatedModules = stageConfig.modules.map((m) =>
      m.id === modId ? { ...m, durationSeconds: clamped } : m
    );
    setStageConfig({ ...stageConfig, modules: updatedModules });
    if (modId === liveActiveModule) {
      setCustomTimerSeconds(clamped);
      setCountdownRemaining(clamped);
    }
  };

  // Resolve target URL for the selected Big Screen
  const getBigScreenUrl = (target: BigScreenTarget) => {
    switch (target) {
      case 'stage':
        return `/events/${event.slug}/stage`;
      case 'photowall':
        return `/events/${event.slug}/photowall/live`;
      case 'games':
        return `/events/${event.slug}/games`;
      case 'raffle':
        return `/events/${event.slug}/raffle`;
    }
  };

  // Handle Gate Check-in
  const handleVerifyGateToken = (token: string) => {
    const trimmed = token.trim();
    if (!trimmed) return;

    const found = guests.find((g) => g.qr_code_token.toLowerCase() === trimmed.toLowerCase());
    if (!found) {
      setGateFeedback({ status: 'invalid', message: `Token "${trimmed}" not found in event roster.` });
      return;
    }

    if (found.is_checked_in) {
      setGateFeedback({
        status: 'duplicate',
        message: `Already checked in earlier by ${found.checked_in_by || 'Gate Desk 01'}.`,
        guest: found,
      });
      return;
    }

    const updated = guests.map((g) =>
      g.id === found.id
        ? { ...g, is_checked_in: true, checked_in_at: new Date().toISOString(), checked_in_by: 'Operator Cockpit' }
        : g
    );
    setGuests(updated);
    setGateFeedback({
      status: 'success',
      message: `Admission Verified! Unlocked Photo Wall, Quiz & Raffle for ${found.name}.`,
      guest: { ...found, is_checked_in: true },
    });
    setTokenInput('');
  };

  // Moderate Photo (Approve & Push to Stage Queue)
  const handleApprovePhoto = (photoId: string, pushToStageImmediately = false) => {
    const nextPhotos = pendingPhotos.map((p) => (p.id === photoId ? { ...p, is_approved: true } : p));
    setPendingPhotos(nextPhotos);
    const nextApproved = nextPhotos.filter((p) => p.is_approved);

    if (pushToStageImmediately) {
      setLiveActiveModule('photowall');
      broadcastToBigScreen('photowall', triggerMode === 'custom_timer', nextApproved);
    } else {
      broadcastToBigScreen(liveActiveModule, triggerMode === 'custom_timer', nextApproved);
    }
  };

  const handleRejectPhoto = (photoId: string) => {
    setPendingPhotos((prev) => prev.filter((p) => p.id !== photoId));
    if (cuedPhoto?.id === photoId) setCuedPhoto(null);
  };

  // Trigger Remote Raffle Spin on Stage
  const handleTriggerStageRaffle = () => {
    setIsRaffleBroadcasting(true);
    setLiveActiveModule('raffle');
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('all41_stage_bus');
        channel.postMessage({ type: 'TRIGGER_RAFFLE_SPIN', rafflePrize, raffleStyle });
        channel.close();
      }
    } catch {
      // Ignore
    }
    setTimeout(() => {
      setIsRaffleBroadcasting(false);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }, 3600);
  };

  // Helper to render a compact visual preview of any StageModuleId
  const renderModuleMonitorCard = (moduleId: StageModuleId, isLiveMonitor: boolean) => {
    const modMeta = stageConfig.modules.find((m) => m.id === moduleId);
    const activeQ = QUIZ_QUESTIONS[activeQuestionIdx % QUIZ_QUESTIONS.length];
    const displayPhoto = cuedPhoto || approvedPhotos[0];

    return (
      <div className="relative rounded-2xl bg-premium-black border border-premium-borderDark overflow-hidden aspect-video flex flex-col justify-between p-5 select-none shadow-inner">
        {/* Top Overlay Status Pill */}
        <div className="flex items-center justify-between z-10">
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isLiveMonitor
                ? 'bg-premium-success/20 text-premium-success border border-premium-success/40'
                : 'bg-premium-gold/20 text-premium-gold border border-premium-gold/40'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLiveMonitor ? 'bg-premium-success animate-pulse' : 'bg-premium-gold'}`} />
            {isLiveMonitor ? 'ON AIR • ACTIVE BIG SCREEN' : 'STAGING PREVIEW • VERIFY BEFORE PUSH'}
          </span>

          <span className="text-[10px] font-mono text-zinc-400 bg-premium-charcoal px-2.5 py-1 rounded-lg border border-premium-borderDark">
            Module: <strong className="text-white uppercase">{modMeta?.name || moduleId}</strong>
          </span>
        </div>

        {/* Center Module Content Preview */}
        <div className="my-auto py-3 z-10">
          {moduleId === 'welcome' && (
            <div className="text-center space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-premium-gold block">
                Welcome & Keynote Hero
              </span>
              <h4 className="text-xl sm:text-2xl font-display font-bold text-white">{event.name}</h4>
              <div className="flex items-center justify-center gap-3 pt-1">
                <span className="px-3 py-1 rounded-xl bg-premium-charcoal border border-premium-borderDark text-xs font-mono text-premium-success">
                  {checkedInCount} Pax Checked In
                </span>
                <span className="px-3 py-1 rounded-xl bg-premium-charcoal border border-premium-borderDark text-xs font-mono text-premium-neon">
                  {event.slug}.all41.app
                </span>
              </div>
            </div>
          )}

          {moduleId === 'photowall' && (
            <div className="flex items-center gap-4 bg-premium-charcoal/90 p-3 rounded-2xl border border-premium-borderDark">
              {displayPhoto && (
                <img
                  src={displayPhoto.image_url}
                  alt="Preview"
                  className="w-24 h-20 object-cover rounded-xl border border-premium-gold/40 flex-shrink-0"
                />
              )}
              <div className="text-left space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-premium-neon/15 text-premium-neon font-bold">
                    {cuedPhoto && !isLiveMonitor ? 'Cued Photo Inspection' : `${approvedPhotos.length} Approved on Wall`}
                  </span>
                  {unapprovedPhotos.length > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-premium-danger/20 text-premium-danger font-bold">
                      {unapprovedPhotos.length} In Queue
                    </span>
                  )}
                </div>
                <p className="text-xs text-white font-medium line-clamp-2">
                  &ldquo;{displayPhoto?.caption || 'Live Pinterest Masonry Photo & 720p Video Stream'}&rdquo;
                </p>
                <div className="text-[10px] font-mono text-premium-gold">
                  By @{displayPhoto?.guest?.name || 'Guest'} • Table {displayPhoto?.guest?.table_number || 'VIP'}
                </div>
              </div>
            </div>
          )}

          {moduleId === 'quiz' && (
            <div className="space-y-2 text-left bg-premium-charcoal/90 p-3.5 rounded-2xl border border-premium-borderDark">
              <div className="flex items-center justify-between text-[10px] font-mono text-premium-neon">
                <span>⚡ LIVE TRIVIA • Q{activeQ.id} OF {QUIZ_QUESTIONS.length}</span>
                <span>State: {gameStep.toUpperCase()} ({activeQ.timerSeconds}s)</span>
              </div>
              <p className="text-xs sm:text-sm font-display font-bold text-white line-clamp-1">{activeQ.question}</p>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {activeQ.options.map((opt) => (
                  <div
                    key={opt}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold truncate ${
                      gameStep === 'reveal' && opt === activeQ.correct
                        ? 'bg-premium-success text-black'
                        : 'bg-premium-surfaceDark text-zinc-300 border border-premium-borderDark'
                    }`}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            </div>
          )}

          {moduleId === 'raffle' && (
            <div className="text-center space-y-2 bg-premium-charcoal/90 p-3.5 rounded-2xl border border-premium-gold/30">
              <span className="text-[10px] font-mono uppercase text-premium-gold font-bold block">
                🎰 3D {raffleStyle.toUpperCase()} MACHINE • {checkedInCount} ELIGIBLE CHECKED-IN POOL
              </span>
              <h4 className="text-base sm:text-lg font-display font-bold text-white truncate">{rafflePrize}</h4>
              <p className="text-[11px] text-zinc-400 font-mono">
                Ready for CSPRNG audited draw on Ballroom LED
              </p>
            </div>
          )}

          {moduleId === 'rundown' && (
            <div className="space-y-1.5 text-left bg-premium-charcoal/90 p-3 rounded-2xl border border-premium-borderDark">
              <span className="text-[10px] font-mono uppercase text-premium-gold font-bold block">
                ● Active Session on Rundown
              </span>
              {MOCK_RUNDOWN.slice(0, 2).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-zinc-800 last:border-0">
                  <span className="text-white font-medium truncate">{item.title}</span>
                  <span className="text-[10px] font-mono text-premium-gold ml-2">{item.time}</span>
                </div>
              ))}
            </div>
          )}

          {moduleId === 'menu' && (
            <div className="space-y-1 text-left bg-premium-charcoal/90 p-3 rounded-2xl border border-premium-borderDark">
              <span className="text-[10px] font-mono uppercase text-premium-gold font-bold block">
                4-Course Executive Banquet Menu
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {MOCK_MENU.slice(0, 2).map((dish) => (
                  <div key={dish.id} className="p-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark">
                    <div className="text-[9px] font-mono text-premium-gold uppercase">{dish.course}</div>
                    <div className="text-[11px] font-bold text-white truncate">{dish.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {moduleId === 'sponsors' && (
            <div className="text-center space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-premium-gold">Tier-1 Partners & Co-Hosts</span>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {['Nexus', 'Alpha SG', 'CloudScale', 'FintechSEA'].map((sp) => (
                  <div key={sp} className="p-2 rounded-xl bg-premium-charcoal border border-premium-borderDark text-[10px] font-bold text-white">
                    {sp}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Ticker Preview */}
        <div className="pt-2 border-t border-premium-borderDark flex items-center justify-between text-[10px] font-mono text-premium-gold truncate z-10">
          <span className="truncate">Ticker: {stageConfig.tickerText}</span>
          <span className="text-zinc-500 ml-2 flex-shrink-0">{modMeta?.durationSeconds || 20}s</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 flex flex-col font-sans select-none">
      {/* TOP BAR: SURFACE SWITCHER (Frontend Operator <-> Active Big Screen) */}
      <header className="px-6 py-4 bg-premium-black/90 backdrop-blur-xl border-b border-premium-borderDark sticky top-0 z-40 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/events/${eventId}`}
              className="p-2.5 rounded-2xl bg-premium-charcoal text-zinc-400 hover:text-white border border-premium-borderDark scale-on-click"
              title="Back to 10-Menu Event Command Suite"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-base shadow-gold">
              41
            </div>
            <div>
              <h1 className="text-base font-display font-bold text-white flex items-center gap-2">
                <span>Operator Broadcast Switcher & Queue Deck</span>
                <span className="w-2 h-2 rounded-full bg-premium-success shadow-[0_0_8px_#00E676] animate-pulse" />
              </h1>
              <p className="text-xs text-zinc-400 font-mono">
                <span className="text-premium-neon font-semibold">{event.slug}.all41.app</span> • Preview Before Live • Timer & Click Control
              </p>
            </div>
          </div>

          {/* FRONTEND OPERATOR <-> SELECTED BIG SCREEN VIEW MODE SWITCHER */}
          <div className="flex flex-wrap items-center gap-2 bg-premium-surfaceDark p-1.5 rounded-2xl border border-premium-borderDark">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-2">View Mode:</span>
            <button
              type="button"
              onClick={() => setViewLayout('switcher_studio')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all scale-on-click ${
                viewLayout === 'switcher_studio'
                  ? 'bg-premium-gold text-black shadow-gold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>1. Operator Switcher Deck</span>
            </button>

            <button
              type="button"
              onClick={() => setViewLayout('split_live')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all scale-on-click ${
                viewLayout === 'split_live'
                  ? 'bg-premium-neon text-black shadow-neon'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>2. Split (Operator + Big Screen)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewLayout('bigscreen_focus')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all scale-on-click ${
                viewLayout === 'bigscreen_focus'
                  ? 'bg-premium-gold text-black shadow-gold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>3. Active Big Screen Monitor</span>
            </button>
          </div>

          {/* SELECTED FRONT-END BIG SCREEN TARGET & EXTERNAL LAUNCHER */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-premium-surfaceDark p-1 rounded-xl border border-premium-borderDark">
              {(
                [
                  { id: 'stage', label: '7-Mod Stage' },
                  { id: 'photowall', label: 'Photo Wall' },
                  { id: 'games', label: 'Trivia Stage' },
                  { id: 'raffle', label: '3D Raffle' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedBigScreenTarget(t.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all scale-on-click ${
                    selectedBigScreenTarget === t.id
                      ? 'bg-premium-charcoal text-premium-gold border border-premium-gold/40'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => window.open(getBigScreenUrl(selectedBigScreenTarget), '_blank')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-premium-gold text-black text-xs font-display font-bold hover:bg-premium-goldHover transition-all shadow-gold scale-on-click"
            >
              <span>Pop Out Big Screen</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs for Operator Desks */}
        <div className="flex items-center justify-between pt-2 border-t border-premium-borderDark/60 overflow-x-auto gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('switcher')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 scale-on-click ${
                activeTab === 'switcher'
                  ? 'bg-premium-gold text-black shadow-gold'
                  : 'bg-premium-charcoal text-zinc-400 hover:text-white border border-premium-borderDark'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Preview → Live Switcher & All Queues</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('photowall')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 scale-on-click ${
                activeTab === 'photowall'
                  ? 'bg-premium-neon text-black shadow-neon'
                  : 'bg-premium-charcoal text-zinc-400 hover:text-white border border-premium-borderDark'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Photo Queue ({unapprovedPhotos.length} Pending)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('gamemaster')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 scale-on-click ${
                activeTab === 'gamemaster'
                  ? 'bg-premium-gold text-black shadow-gold'
                  : 'bg-premium-charcoal text-zinc-400 hover:text-white border border-premium-borderDark'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Trivia Game Master</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('raffle')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 scale-on-click ${
                activeTab === 'raffle'
                  ? 'bg-premium-gold text-black shadow-gold'
                  : 'bg-premium-charcoal text-zinc-400 hover:text-white border border-premium-borderDark'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>3D Raffle Trigger</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('gate')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 scale-on-click ${
                activeTab === 'gate'
                  ? 'bg-premium-gold text-black shadow-gold'
                  : 'bg-premium-charcoal text-zinc-400 hover:text-white border border-premium-borderDark'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Gate Desk ({checkedInCount}/{guests.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stage_editor')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 scale-on-click ${
                activeTab === 'stage_editor'
                  ? 'bg-premium-gold text-black shadow-gold'
                  : 'bg-premium-charcoal text-zinc-400 hover:text-white border border-premium-borderDark'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>7-Module Policy Editor</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 flex-shrink-0">
            <span>
              Active on Stage: <strong className="text-premium-success uppercase">{liveActiveModule}</strong>
            </span>
            <span>•</span>
            <span>
              Next in Cue: <strong className="text-premium-gold uppercase">{previewModule}</strong>
            </span>
            <span>•</span>
            <span>Last Sync: {lastPushTimestamp}</span>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE BODY */}
      <main className="flex-1 p-6 max-w-[1600px] mx-auto w-full">
        {/* VIEW MODE 3: FULL ACTIVE BIG SCREEN MONITOR FOCUS */}
        {viewLayout === 'bigscreen_focus' ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-premium-success/20 text-premium-success border border-premium-success/40 text-xs font-mono font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-premium-success animate-pulse" />
                  LIVE ACTIVE BIG SCREEN MONITOR ({getBigScreenUrl(selectedBigScreenTarget)})
                </span>
                <span className="text-xs text-zinc-400">
                  Showing exact real-time feed of the selected Big Screen. Switch back to Operator Deck at any time.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewLayout('switcher_studio')}
                  className="px-4 py-2 rounded-xl bg-premium-gold text-black font-bold text-xs scale-on-click"
                >
                  Return to Operator Controls
                </button>
              </div>
            </div>

            <div className="rounded-[2.5rem] overflow-hidden border-2 border-premium-gold/50 shadow-2xl bg-premium-black h-[78vh]">
              <iframe
                key={selectedBigScreenTarget}
                src={getBigScreenUrl(selectedBigScreenTarget)}
                className="w-full h-full border-0"
                title="Active Big Screen Live Monitor"
              />
            </div>
          </div>
        ) : (
          <div className={viewLayout === 'split_live' ? 'grid grid-cols-1 xl:grid-cols-12 gap-6 items-start' : 'space-y-6'}>
            {/* LEFT / MAIN OPERATOR COLUMN */}
            <div className={viewLayout === 'split_live' ? 'xl:col-span-7 space-y-6' : 'space-y-6'}>
              {/* TAB: PREVIEW -> LIVE BROADCAST SWITCHER & ALL QUEUES */}
              {activeTab === 'switcher' && (
                <div className="space-y-6">
                  {/* DUAL MONITOR BROADCAST DECK: PREVIEW (LEFT) -> CONTROLLER (CENTER) -> ACTIVE BIG SCREEN (RIGHT) */}
                  <div className="p-6 sm:p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark shadow-2xl space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-premium-borderDark pb-4">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-premium-gold font-bold">
                          Pre-Broadcast Verification Deck
                        </span>
                        <h2 className="text-xl font-display font-bold text-white">
                          Staging Preview (Cue) vs. Active Big Screen (Program)
                        </h2>
                        <p className="text-xs text-zinc-400">
                          Inspect and verify any module, photo, question, or prize in the left Preview monitor before displaying it on the Ballroom Big Screen.
                        </p>
                      </div>

                      {/* Lock / Freeze Big Screen Safety Button */}
                      <button
                        type="button"
                        onClick={() => setIsScreenLocked((v) => !v)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all scale-on-click ${
                          isScreenLocked
                            ? 'bg-premium-danger text-white shadow-lg'
                            : 'bg-premium-surfaceDark border border-premium-borderDark text-zinc-300 hover:border-premium-gold'
                        }`}
                      >
                        {isScreenLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        <span>{isScreenLocked ? 'Big Screen LOCKED (Freeze On)' : 'Big Screen Unlocked'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                      {/* 1. LEFT MONITOR: STAGING PREVIEW (INSPECT BEFORE LIVE) */}
                      <div className="lg:col-span-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-display font-bold text-premium-gold flex items-center gap-1.5">
                            <Eye className="w-4 h-4" />
                            <span>1. PREVIEW / STAGING MONITOR (NEXT UP)</span>
                          </span>
                          <select
                            value={previewModule}
                            onChange={(e) => setPreviewModule(e.target.value as StageModuleId)}
                            className="px-3 py-1 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-xs font-mono text-white focus:border-premium-gold outline-none"
                          >
                            {stageConfig.modules.map((m) => (
                              <option key={m.id} value={m.id}>
                                Cue: {m.name} ({m.durationSeconds}s)
                              </option>
                            ))}
                          </select>
                        </div>

                        {renderModuleMonitorCard(previewModule, false)}
                      </div>

                      {/* 2. CENTER: TRANSITION TRIGGER & CUSTOM TIMER CONTROLLER */}
                      <div className="lg:col-span-2 flex flex-col items-center justify-center space-y-3 p-4 rounded-3xl bg-premium-surfaceDark border border-premium-borderDark">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                          Transition Mode
                        </span>

                        {/* Switch between Manual Click vs Custom Timer */}
                        <div className="grid grid-cols-2 gap-1.5 w-full bg-premium-black p-1 rounded-xl border border-premium-borderDark">
                          <button
                            type="button"
                            onClick={() => {
                              setTriggerMode('manual_click');
                              setIsTimerRunning(false);
                            }}
                            className={`py-2 px-2 rounded-lg text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${
                              triggerMode === 'manual_click'
                                ? 'bg-premium-gold text-black shadow-gold'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            <MousePointerClick className="w-3.5 h-3.5" />
                            <span>Manual Click</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTriggerMode('custom_timer');
                              setIsTimerRunning(true);
                            }}
                            className={`py-2 px-2 rounded-lg text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${
                              triggerMode === 'custom_timer'
                                ? 'bg-premium-neon text-black shadow-neon'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            <Timer className="w-3.5 h-3.5" />
                            <span>Auto Timer</span>
                          </button>
                        </div>

                        {/* Custom Timer Controls */}
                        <div className="w-full space-y-2 pt-1 border-t border-premium-borderDark text-center">
                          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                            <span>Timer:</span>
                            <span className="text-sm font-bold text-white">{countdownRemaining}s</span>
                          </div>

                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const next = Math.max(5, customTimerSeconds - 5);
                                setCustomTimerSeconds(next);
                                setCountdownRemaining(next);
                              }}
                              className="p-1.5 rounded-lg bg-premium-charcoal border border-premium-borderDark text-zinc-300 hover:text-white scale-on-click"
                              title="-5 Seconds"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min={5}
                              max={300}
                              value={customTimerSeconds}
                              onChange={(e) => {
                                const val = Math.max(5, Number(e.target.value) || 15);
                                setCustomTimerSeconds(val);
                                setCountdownRemaining(val);
                              }}
                              className="w-14 text-center py-1 rounded-lg bg-premium-black border border-premium-borderDark text-xs font-mono font-bold text-premium-gold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = Math.min(300, customTimerSeconds + 5);
                                setCustomTimerSeconds(next);
                                setCountdownRemaining(next);
                              }}
                              className="p-1.5 rounded-lg bg-premium-charcoal border border-premium-borderDark text-zinc-300 hover:text-white scale-on-click"
                              title="+5 Seconds"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {triggerMode === 'custom_timer' && (
                            <button
                              type="button"
                              onClick={() => setIsTimerRunning((r) => !r)}
                              className={`w-full py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 ${
                                isTimerRunning
                                  ? 'bg-premium-charcoal text-premium-neon border border-premium-neon/40'
                                  : 'bg-premium-gold/20 text-premium-gold border border-premium-gold/40'
                              }`}
                            >
                              {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                              <span>{isTimerRunning ? 'Pause Countdown' : 'Resume Countdown'}</span>
                            </button>
                          )}
                        </div>

                        {/* PRIMARY PUSH TO BIG SCREEN BUTTON */}
                        <button
                          type="button"
                          disabled={isScreenLocked}
                          onClick={handlePushPreviewToLive}
                          className={`w-full py-3.5 px-3 rounded-2xl font-display font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all scale-on-click ${
                            isScreenLocked
                              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                              : 'bg-premium-gold hover:bg-premium-goldHover text-black shadow-gold'
                          }`}
                        >
                          <Send className="w-4 h-4" />
                          <span>PUSH TO BIG SCREEN</span>
                        </button>
                      </div>

                      {/* 3. RIGHT MONITOR: ACTIVE ON BIG SCREEN (LIVE PROGRAM) */}
                      <div className="lg:col-span-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-display font-bold text-premium-success flex items-center gap-1.5">
                            <Tv className="w-4 h-4" />
                            <span>2. ACTIVE ON BIG SCREEN (LIVE PROGRAM)</span>
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400">
                            {triggerMode === 'custom_timer' && isTimerRunning
                              ? `Auto-switching in ${countdownRemaining}s`
                              : 'Locked on Manual Click'}
                          </span>
                        </div>

                        {renderModuleMonitorCard(liveActiveModule, true)}
                      </div>
                    </div>
                  </div>

                  {/* UNIFIED QUEUE DECK: ALL THE QUEUES IN ONE VIEW */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* QUEUE 1: 7-MODULE STAGE ROTATION PLAYLIST & TIMER CUSTOMIZER */}
                    <div className="lg:col-span-7 p-6 sm:p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-4 shadow-xl">
                      <div className="flex items-center justify-between border-b border-premium-borderDark pb-3">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-premium-gold font-bold">
                            Master Stage Playlist Queue
                          </span>
                          <h3 className="text-lg font-display font-bold text-white">
                            7-Module Rotation Queue & Custom Timers
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={handlePushPreviewToLive}
                          className="px-3.5 py-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark hover:border-premium-gold text-xs font-bold text-white flex items-center gap-1.5 scale-on-click"
                        >
                          <SkipForward className="w-3.5 h-3.5 text-premium-gold" />
                          <span>Advance Queue Now</span>
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {stageConfig.modules.map((mod, idx) => {
                          const isLive = liveActiveModule === mod.id;
                          const isPreview = previewModule === mod.id;
                          return (
                            <div
                              key={mod.id}
                              className={`p-3.5 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                                isLive
                                  ? 'bg-premium-success/10 border-premium-success'
                                  : isPreview
                                  ? 'bg-premium-gold/10 border-premium-gold'
                                  : mod.isEnabled
                                  ? 'bg-premium-surfaceDark border-premium-borderDark'
                                  : 'bg-premium-black border-zinc-900 opacity-50'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-6 h-6 rounded-lg bg-premium-black border border-premium-borderDark flex items-center justify-center text-[11px] font-mono font-bold text-zinc-400">
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-display font-bold text-white">{mod.name}</span>
                                    {isLive && (
                                      <span className="px-2 py-0.5 rounded-full bg-premium-success text-black text-[9px] font-mono font-bold uppercase">
                                        LIVE ON STAGE
                                      </span>
                                    )}
                                    {isPreview && !isLive && (
                                      <span className="px-2 py-0.5 rounded-full bg-premium-gold text-black text-[9px] font-mono font-bold uppercase">
                                        IN PREVIEW CUE
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-zinc-400 truncate max-w-xs">{mod.description}</p>
                                </div>
                              </div>

                              {/* Per-Module Timer Customizer & Cue/Push Buttons */}
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-premium-black px-2 py-1 rounded-xl border border-premium-borderDark">
                                  <Clock className="w-3 h-3 text-premium-gold" />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateModuleDuration(mod.id, mod.durationSeconds - 5)}
                                    className="text-xs text-zinc-400 hover:text-white px-1"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-mono font-bold text-white w-8 text-center">
                                    {mod.durationSeconds}s
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateModuleDuration(mod.id, mod.durationSeconds + 5)}
                                    className="text-xs text-zinc-400 hover:text-white px-1"
                                  >
                                    +
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setPreviewModule(mod.id)}
                                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all scale-on-click ${
                                    isPreview
                                      ? 'bg-premium-gold text-black'
                                      : 'bg-premium-charcoal text-zinc-300 hover:text-white border border-premium-borderDark'
                                  }`}
                                >
                                  Cue Preview
                                </button>

                                <button
                                  type="button"
                                  disabled={isScreenLocked}
                                  onClick={() => {
                                    setLiveActiveModule(mod.id);
                                    setCustomTimerSeconds(mod.durationSeconds);
                                    setCountdownRemaining(mod.durationSeconds);
                                    broadcastToBigScreen(mod.id, triggerMode === 'custom_timer');
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-premium-surfaceDark border border-premium-gold/50 text-premium-gold hover:bg-premium-gold hover:text-black text-[11px] font-bold transition-all scale-on-click"
                                >
                                  Push Live
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* QUEUE 2: PHOTO WALL & INTERACTIVE CUE QUEUE */}
                    <div className="lg:col-span-5 p-6 sm:p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-4 shadow-xl">
                      <div className="flex items-center justify-between border-b border-premium-borderDark pb-3">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-premium-neon font-bold">
                            Incoming Guest Media & Game Queue
                          </span>
                          <h3 className="text-lg font-display font-bold text-white">
                            Verify Submissions Before Stage Display
                          </h3>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-premium-danger/20 text-premium-danger text-xs font-mono font-bold">
                          {unapprovedPhotos.length} Pending
                        </span>
                      </div>

                      {unapprovedPhotos.length === 0 ? (
                        <div className="p-6 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-center space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-premium-success mx-auto" />
                          <div className="text-sm font-bold text-white">All Guest Uploads Verified!</div>
                          <p className="text-xs text-zinc-400">
                            {approvedPhotos.length} approved WebP photos/videos are currently streaming in the Photo Wall rotation queue.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                          {unapprovedPhotos.map((photo) => (
                            <div
                              key={photo.id}
                              className="p-3.5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark space-y-3"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={photo.image_url}
                                  alt="Pending upload"
                                  className="w-20 h-16 object-cover rounded-xl border border-premium-borderDark flex-shrink-0"
                                />
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center justify-between text-[11px] font-mono">
                                    <span className="text-premium-neon font-bold truncate">@{photo.guest?.name}</span>
                                    <span className="text-premium-gold">Table {photo.guest?.table_number}</span>
                                  </div>
                                  <p className="text-xs text-white line-clamp-2">
                                    &ldquo;{photo.caption || 'No caption'}&rdquo;
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCuedPhoto(photo);
                                    setPreviewModule('photowall');
                                  }}
                                  className="py-1.5 rounded-xl bg-premium-charcoal border border-premium-borderDark text-zinc-300 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1 scale-on-click"
                                >
                                  <Eye className="w-3 h-3 text-premium-gold" />
                                  <span>Preview</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApprovePhoto(photo.id, true)}
                                  className="py-1.5 rounded-xl bg-premium-gold text-black text-[11px] font-bold flex items-center justify-center gap-1 scale-on-click"
                                >
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>Approve & Show</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectPhoto(photo.id)}
                                  className="py-1.5 rounded-xl bg-premium-danger/15 border border-premium-danger/30 text-premium-danger text-[11px] font-bold flex items-center justify-center gap-1 scale-on-click"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: PHOTO WALL MODERATION QUEUE */}
              {activeTab === 'photowall' && (
                <div className="p-6 sm:p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-premium-borderDark pb-4">
                    <div>
                      <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                        <span>Photo & 720p Video Moderation Queue</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-premium-gold/20 text-premium-gold font-mono">
                          {unapprovedPhotos.length} Awaiting Review
                        </span>
                      </h2>
                      <p className="text-xs text-zinc-400">
                        Inspect attendee uploads and 300-character captions before broadcasting to the Ballroom LED Wall
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => unapprovedPhotos.forEach((p) => handleApprovePhoto(p.id, false))}
                      className="px-4 py-2.5 rounded-2xl bg-premium-gold text-black text-xs font-bold shadow-gold scale-on-click"
                    >
                      Approve All Pending ({unapprovedPhotos.length})
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className={`rounded-3xl border overflow-hidden transition-all flex flex-col justify-between ${
                          photo.is_approved
                            ? 'bg-premium-surfaceDark border-premium-success/50'
                            : 'bg-premium-surfaceDark border-premium-borderDark'
                        }`}
                      >
                        <div className="relative aspect-video overflow-hidden bg-black">
                          <img src={photo.image_url} alt="Attendee upload" className="w-full h-full object-cover" />
                          {photo.is_approved && (
                            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-premium-success text-black text-[10px] font-bold">
                              Approved on Stage Queue
                            </div>
                          )}
                        </div>

                        <div className="p-4 space-y-2">
                          <p className="text-xs font-medium text-white line-clamp-2">
                            &ldquo;{photo.caption || 'No caption provided'}&rdquo;
                          </p>
                          <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between pt-2 border-t border-zinc-800">
                            <span className="font-bold text-premium-neon">@{photo.guest?.name}</span>
                            <span className="text-premium-gold">Table: {photo.guest?.table_number || 'VIP'}</span>
                          </div>
                        </div>

                        <div className="p-3 bg-premium-black border-t border-premium-borderDark flex items-center justify-between gap-2">
                          {!photo.is_approved ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRejectPhoto(photo.id)}
                                className="flex-1 py-2 rounded-xl bg-premium-danger/15 border border-premium-danger/30 text-premium-danger text-xs font-bold hover:bg-premium-danger/25 flex items-center justify-center gap-1 scale-on-click"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApprovePhoto(photo.id, true)}
                                className="flex-1 py-2 rounded-xl bg-premium-gold text-black text-xs font-bold hover:bg-premium-goldHover flex items-center justify-center gap-1 scale-on-click"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Approve & Push</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-premium-success font-bold flex items-center gap-1.5 w-full justify-center py-1">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Streaming in Stage Queue</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: GATE SCANNER DESK */}
              {activeTab === 'gate' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  <div className="md:col-span-7 p-6 sm:p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
                    <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-premium-gold" />
                      <span>Manual Token & USB 2D Barcode Scanner Wedge</span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Plug in a USB/Bluetooth 2D barcode scanner or paste a guest QR token to verify admission in &lt;0.6s.
                    </p>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleVerifyGateToken(tokenInput);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        autoFocus
                        placeholder="Scan pass token (e.g. QR-ALL41-SITI-3309)..."
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        className="flex-1 px-4 py-3.5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-xs font-mono text-white focus:outline-none focus:border-premium-gold"
                      />
                      <button
                        type="submit"
                        className="px-6 py-3.5 rounded-2xl bg-premium-gold text-black font-bold text-xs shadow-gold scale-on-click"
                      >
                        Admit Guest
                      </button>
                    </form>

                    <div className="pt-3 border-t border-premium-borderDark flex flex-wrap gap-2 text-xs">
                      <span className="text-[11px] text-zinc-500 font-mono self-center">Quick Test Tokens:</span>
                      <button
                        type="button"
                        onClick={() => handleVerifyGateToken('QR-ALL41-SITI-3309')}
                        className="px-3 py-1.5 rounded-xl bg-premium-surfaceDark text-premium-success font-mono border border-premium-borderDark scale-on-click"
                      >
                        Siti (First Scan)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerifyGateToken('QR-ALL41-BUDI-9812')}
                        className="px-3 py-1.5 rounded-xl bg-premium-surfaceDark text-premium-danger font-mono border border-premium-borderDark scale-on-click"
                      >
                        Budi (Duplicate Scan)
                      </button>
                    </div>

                    {gateFeedback && (
                      <div
                        className={`p-5 rounded-2xl border ${
                          gateFeedback.status === 'success'
                            ? 'bg-premium-success/10 border-premium-success text-premium-success'
                            : 'bg-premium-danger/10 border-premium-danger text-premium-danger'
                        }`}
                      >
                        <div className="text-base font-display font-bold uppercase">
                          {gateFeedback.status === 'success' && '✓ Admission Verified'}
                          {gateFeedback.status === 'duplicate' && '⚠ Duplicate Pass Token'}
                          {gateFeedback.status === 'invalid' && '✕ Invalid Token'}
                        </div>
                        <div className="text-xs mt-1 text-zinc-200">{gateFeedback.message}</div>
                        {gateFeedback.guest && (
                          <div className="mt-3 pt-3 border-t border-current/20 flex justify-between text-xs font-bold text-white">
                            <span>
                              {gateFeedback.guest.name} ({gateFeedback.guest.category})
                            </span>
                            <span className="text-premium-gold">
                              Table: {gateFeedback.guest.table_number || 'VIP'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-5 p-6 sm:p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
                    <span className="text-xs font-mono uppercase text-zinc-400">Live Gate Telemetry</span>
                    <div className="text-4xl font-display font-bold text-premium-success">
                      {checkedInCount} / {guests.length}
                    </div>
                    <div className="w-full bg-premium-surfaceDark h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-premium-success h-full transition-all duration-500"
                        style={{ width: `${(checkedInCount / guests.length) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-zinc-400 font-mono">
                      {((checkedInCount / guests.length) * 100).toFixed(0)}% checked in and eligible for Games & 3D Raffle
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: TRIVIA GAME MASTER */}
              {activeTab === 'gamemaster' && (
                <div className="p-6 sm:p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-premium-borderDark pb-4">
                    <div>
                      <h3 className="text-lg font-display font-bold text-white">
                        Live Trivia Blitz Controller (Preview & Stage Sync)
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Cue questions in Preview, customize timer, and push live to the Ballroom Stage & Guest Buzzer Phones
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewModule('quiz');
                        setLiveActiveModule('quiz');
                        broadcastToBigScreen('quiz', false);
                      }}
                      className="px-5 py-2.5 rounded-2xl bg-premium-gold text-black font-bold text-xs shadow-gold scale-on-click"
                    >
                      Switch Big Screen to Quiz Arena Now
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(
                      [
                        { id: 'question_active', label: '1. Broadcast Question' },
                        { id: 'answers_locked', label: '2. Lock Buzzers' },
                        { id: 'reveal', label: '3. Reveal Correct Answer' },
                        { id: 'podium', label: '4. Show Table Podium' },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setGameStep(st.id);
                          setPreviewModule('quiz');
                          broadcastToBigScreen(liveActiveModule, triggerMode === 'custom_timer', undefined, activeQuestionIdx, st.id);
                          if (st.id === 'podium') {
                            confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
                          }
                        }}
                        className={`p-4 rounded-2xl border text-xs font-bold transition-all scale-on-click ${
                          gameStep === st.id
                            ? 'bg-premium-gold text-black border-premium-gold shadow-gold'
                            : 'bg-premium-surfaceDark border-premium-borderDark text-zinc-300 hover:border-premium-gold'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <span className="text-xs font-mono uppercase text-premium-gold font-bold block">
                      Question Queue (Click to Cue into Preview)
                    </span>
                    {QUIZ_QUESTIONS.map((q, idx) => (
                      <div
                        key={q.id}
                        onClick={() => {
                          setActiveQuestionIdx(idx);
                          setPreviewModule('quiz');
                        }}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-4 ${
                          activeQuestionIdx === idx
                            ? 'bg-premium-gold/10 border-premium-gold'
                            : 'bg-premium-surfaceDark border-premium-borderDark hover:border-zinc-600'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-mono text-premium-gold font-bold">
                            Question {q.id} • {q.points} PTS • {q.timerSeconds}s Timer
                          </div>
                          <div className="text-sm font-bold text-white mt-0.5">{q.question}</div>
                          <div className="text-xs text-premium-success font-mono mt-1">Correct: {q.correct}</div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveQuestionIdx(idx);
                            setGameStep('question_active');
                            setLiveActiveModule('quiz');
                            broadcastToBigScreen('quiz', false, undefined, idx, 'question_active');
                          }}
                          className="px-4 py-2 rounded-xl bg-premium-gold text-black text-xs font-bold flex-shrink-0 scale-on-click"
                        >
                          Push Q{q.id} Live
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: 3D RAFFLE CONTROLLER */}
              {activeTab === 'raffle' && (
                <div className="p-6 sm:p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-6">
                  <div className="border-b border-premium-borderDark pb-4">
                    <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                      <Gift className="w-5 h-5 text-premium-gold" />
                      <span>3D Door Prize Raffle Stage Controller</span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Configure prize and 3D machine in Preview first, then trigger the audited spin on the Ballroom Big Screen
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-2">Grand Prize Title (Previewed Before Live)</label>
                    <input
                      type="text"
                      value={rafflePrize}
                      onChange={(e) => {
                        setRafflePrize(e.target.value);
                        setPreviewModule('raffle');
                      }}
                      className="w-full px-4 py-3.5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-sm font-bold text-white focus:outline-none focus:border-premium-gold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-2">Select 3D Visualizer Mode</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['slot', 'wheel', 'claw'] as const).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => {
                            setRaffleStyle(style);
                            setPreviewModule('raffle');
                          }}
                          className={`p-4 rounded-2xl border text-xs font-bold uppercase transition-all scale-on-click ${
                            raffleStyle === style
                              ? 'bg-premium-gold text-black border-premium-gold shadow-gold'
                              : 'bg-premium-surfaceDark border-premium-borderDark text-zinc-400 hover:text-white'
                          }`}
                        >
                          {style === 'slot' ? '🎰 Slot 777' : style === 'wheel' ? '🎡 Wheel of Spin' : '🕹️ Arcade Claw'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isRaffleBroadcasting}
                    onClick={handleTriggerStageRaffle}
                    className={`w-full py-4 rounded-2xl font-display font-bold text-sm uppercase tracking-wider text-black transition-all shadow-gold scale-on-click ${
                      isRaffleBroadcasting ? 'bg-zinc-600 cursor-not-allowed' : 'bg-premium-gold hover:bg-premium-goldHover'
                    }`}
                  >
                    {isRaffleBroadcasting
                      ? 'Spinning Live on Ballroom Big Screen...'
                      : 'Push Raffle to Big Screen & Trigger Spin!'}
                  </button>
                </div>
              )}

              {/* TAB: 7-MODULE STAGE POLICY EDITOR */}
              {activeTab === 'stage_editor' && (
                <StageLedEditor
                  eventId={eventId}
                  initialConfig={stageConfig}
                  captionsEnabled={true}
                  onConfigChange={(nextCfg) => setStageConfig(nextCfg)}
                />
              )}
            </div>

            {/* RIGHT COLUMN WHEN IN SPLIT VIEW: EMBEDDED LIVE ACTIVE BIG SCREEN */}
            {viewLayout === 'split_live' && (
              <div className="xl:col-span-5 sticky top-36 space-y-3">
                <div className="p-4 rounded-2xl bg-premium-charcoal border border-premium-gold/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-premium-success animate-pulse" />
                    <span className="text-xs font-display font-bold text-white">
                      Live Big Screen Output ({getBigScreenUrl(selectedBigScreenTarget)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.open(getBigScreenUrl(selectedBigScreenTarget), '_blank')}
                    className="text-xs font-mono text-premium-gold hover:underline flex items-center gap-1"
                  >
                    <span>Open Full Tab</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="rounded-[2rem] overflow-hidden border-2 border-premium-gold/50 shadow-2xl bg-premium-black aspect-video">
                  <iframe
                    key={selectedBigScreenTarget}
                    src={getBigScreenUrl(selectedBigScreenTarget)}
                    className="w-full h-full border-0"
                    title="Live Split Big Screen Monitor"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-xs text-zinc-400 flex items-center justify-between">
                  <span>Mode: <strong className="text-white">{triggerMode === 'custom_timer' ? `Auto-Timer (${countdownRemaining}s)` : 'Manual Click'}</strong></span>
                  <span>Active Module: <strong className="text-premium-success uppercase">{liveActiveModule}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function OperatorCommandCenterWrapper({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  return <OperatorCommandCenterContent eventId={unwrappedParams.id} />;
}

export default function OperatorCommandCenterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-zinc-400">Loading operator broadcast switcher...</div>}>
      <OperatorCommandCenterWrapper params={params} />
    </Suspense>
  );
}
