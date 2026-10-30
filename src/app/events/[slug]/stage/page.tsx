'use client';

import { useEventConfigBySlug } from '@/lib/eventStore';
import React, { useState, useEffect, use, Suspense } from 'react';
import {
  MOCK_EVENT,
  MOCK_WEDDING_EVENT,
  MOCK_CORPORATE_NEXUS_EVENT,
  MOCK_WEDDING_BALI_EVENT,
  MOCK_POPVERSE_EVENT,
  MOCK_PHOTO_WALL_UPLOADS,
  MOCK_GUESTS,
  MOCK_RAFFLES,
  MOCK_RUNDOWN,
  MOCK_MENU,
  DEFAULT_STAGE_CONFIG,
} from '@/lib/mockData';
import { PhotoWallUpload, Guest, StageModuleId, StageConfig } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { getClientDomain } from '@/lib/domain';
import { PinterestMasonryPhotoWall } from '@/components/events/PinterestMasonryPhotoWall';
import {
  Maximize2,
  Minimize2,
  Camera,
  Gamepad2,
  Gift,
  Sparkles,
  QrCode,
  Users,
  Trophy,
  Crown,
  Clock,
  CheckCircle2,
  UtensilsCrossed,
  Tv,
  Building,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';

function StageBigScreenContent({ slug }: { slug: string }) {
  const { event } = useEventConfigBySlug(slug);
  const clientDomain = getClientDomain(slug);
  const captionsEnabled = event.settings?.enablePhotoWallCaptions ?? true;

  const [stageConfig, setStageConfig] = useState<StageConfig>(DEFAULT_STAGE_CONFIG);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [stageMode, setStageMode] = useState<StageModuleId>('welcome');
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hudVisible, setHudVisible] = useState(false);

  // Photo Wall State
  const [photos, setPhotos] = useState<PhotoWallUpload[]>(MOCK_PHOTO_WALL_UPLOADS);
  const [qrUploadUrl, setQrUploadUrl] = useState('');

  // Quiz Big Screen State
  const [quizTimer, setQuizTimer] = useState(15);

  // Raffle Big Screen State
  const [isRaffleSpinning, setIsRaffleSpinning] = useState(false);
  const [raffleWinner, setRaffleWinner] = useState<Guest | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [activeRafflePrize, setActiveRafflePrize] = useState('Apple MacBook Pro M4 Max (16-inch)');
  const [activeRaffleStyle, setActiveRaffleStyle] = useState<'wheel' | 'claw' | 'slot'>('slot');
  const [activeQuizQuestion, setActiveQuizQuestion] = useState({
    id: 1,
    question: 'In which year was the first startup unicorn born in Southeast Asia?',
    options: ['A. 2009', 'B. 2012', 'C. 2014', 'D. 2016'],
    correct: 'B. 2012',
    points: 1000,
    timerSeconds: 15,
  });
  const [quizGameStep, setQuizGameStep] = useState<'question_active' | 'answers_locked' | 'reveal' | 'podium'>('question_active');
  const [liveCheckedInCount, setLiveCheckedInCount] = useState(418);

  // Filter only enabled modules
  const enabledModules = stageConfig.modules.filter((m) => m.isEnabled);

  // Real-time synchronization with Frontend Operator (/dashboard/events/[id]/operator)
  useEffect(() => {
    const loadSavedState = () => {
      try {
        const raw = localStorage.getItem('all41_live_stage_state');
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed.activeModule) setStageMode(parsed.activeModule);
        if (typeof parsed.isAutoRotating === 'boolean') setIsAutoRotating(parsed.isAutoRotating);
        if (parsed.stageConfig) setStageConfig(parsed.stageConfig);
        if (parsed.approvedPhotos) setPhotos(parsed.approvedPhotos);
        if (parsed.rafflePrize) setActiveRafflePrize(parsed.rafflePrize);
        if (parsed.raffleStyle) setActiveRaffleStyle(parsed.raffleStyle);
        if (parsed.quizQuestion) {
          setActiveQuizQuestion(parsed.quizQuestion);
          setQuizTimer(parsed.quizQuestion.timerSeconds || 15);
        }
        if (parsed.gameStep) setQuizGameStep(parsed.gameStep);
        if (typeof parsed.checkedInCount === 'number' && parsed.checkedInCount > 10) {
          setLiveCheckedInCount(parsed.checkedInCount);
        }
      } catch {
        // Ignore storage parse errors
      }
    };

    loadSavedState();

    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('all41_stage_bus');
      channel.onmessage = (event) => {
        const data = event.data;
        if (!data) return;
        if (data.type === 'STAGE_PUSH_LIVE') {
          setStageMode(data.activeModule);
          setIsAutoRotating(Boolean(data.isAutoRotating));
          if (data.stageConfig) setStageConfig(data.stageConfig);
          if (data.approvedPhotos) setPhotos(data.approvedPhotos);
          if (data.rafflePrize) setActiveRafflePrize(data.rafflePrize);
          if (data.raffleStyle) setActiveRaffleStyle(data.raffleStyle);
          if (data.quizQuestion) {
            setActiveQuizQuestion(data.quizQuestion);
            setQuizTimer(data.quizQuestion.timerSeconds || 15);
          }
          if (data.gameStep) setQuizGameStep(data.gameStep);
        } else if (data.type === 'TRIGGER_RAFFLE_SPIN') {
          setStageMode('raffle');
          setIsAutoRotating(false);
          if (data.rafflePrize) setActiveRafflePrize(data.rafflePrize);
          if (data.raffleStyle) setActiveRaffleStyle(data.raffleStyle);
          handleStageSpin();
        }
      };
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'all41_live_stage_state') loadSavedState();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    QRCode.toDataURL(`https://${clientDomain}/photowall`, {
      width: 240,
      margin: 1,
      color: { dark: '#07090e', light: '#ffffff' },
    }).then(setQrUploadUrl);

    // Keyboard shortcuts for ballroom technicians
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 'h' || e.key === 'H') setHudVisible((v) => !v);
      if (e.key === ' ') {
        e.preventDefault();
        setIsAutoRotating((r) => !r);
      }
      if (e.key === '1') { setStageMode('welcome'); setIsAutoRotating(false); }
      if (e.key === '2') { setStageMode('photowall'); setIsAutoRotating(false); }
      if (e.key === '3') { setStageMode('quiz'); setIsAutoRotating(false); }
      if (e.key === '4') { setStageMode('raffle'); setIsAutoRotating(false); }
      if (e.key === '5') { setStageMode('rundown'); setIsAutoRotating(false); }
      if (e.key === '6') { setStageMode('menu'); setIsAutoRotating(false); }
      if (e.key === '7') { setStageMode('sponsors'); setIsAutoRotating(false); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clientDomain]);

  // Auto-rotation timer between enabled system modules
  useEffect(() => {
    if (!isAutoRotating || enabledModules.length <= 1) return;

    const currentModConfig = enabledModules[currentModuleIndex % enabledModules.length];
    const duration = (currentModConfig?.durationSeconds || 20) * 1000;

    const timer = setTimeout(() => {
      setCurrentModuleIndex((prev) => {
        const nextIndex = (prev + 1) % enabledModules.length;
        setStageMode(enabledModules[nextIndex].id);
        return nextIndex;
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [isAutoRotating, currentModuleIndex, enabledModules]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleStageSpin = () => {
    if (isRaffleSpinning) return;
    setIsRaffleSpinning(true);
    setRaffleWinner(null);

    const randomAngle = wheelRotation + 1800 + Math.floor(Math.random() * 360);
    setWheelRotation(randomAngle);

    setTimeout(() => {
      setIsRaffleSpinning(false);
      setRaffleWinner(MOCK_GUESTS[1]); // Clarissa Tan
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 flex flex-col justify-between overflow-x-hidden relative select-none font-sans">
      {/* Background Stage Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-premium-neon/10 blur-[180px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-premium-gold/10 blur-[180px] pointer-events-none rounded-full" />

      {/* POPVERSE LED Stage Frame — decorative cathedral border overlay for the big screen */}
      {slug === 'popverse' && (
        <img
          src="https://cdn.openart.ai/openart-ai/production/2026-10/create-image/gyygId5ZYPaN2nz17abs/image_1793300675118_e65da6c9_1793300675879_1fc2362a.png"
          alt="POPVERSE stage frame"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none z-30"
          style={{ mixBlendMode: 'screen' }}
        />
      )}

      {/* Top Ballroom Stage Header */}
      <header className="h-20 px-8 sm:px-12 flex items-center justify-between z-20 backdrop-blur-md bg-premium-surfaceDark/80 border-b border-premium-borderDark">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-xl shadow-gold flex-shrink-0">
            41
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <span>{event.name}</span>
              <span className="px-3 py-1 bg-premium-gold/20 text-premium-gold rounded-full text-xs font-bold uppercase border border-premium-gold/30 font-mono">
                BALLROOM LED MASTER
              </span>
              {isAutoRotating && (
                <span className="px-2.5 py-0.5 rounded-full bg-premium-neon/15 text-premium-neon border border-premium-neon/30 font-mono text-[10px] flex items-center gap-1">
                  <RotateCcw className="w-2.5 h-2.5 animate-spin" />
                  <span>Auto-Rotate</span>
                </span>
              )}
            </h1>
            <p className="text-xs text-zinc-400 font-mono">
              <span className="text-premium-neon font-bold">{clientDomain}</span> • {formatDate(event.start_date)} • {event.location_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-mono uppercase text-zinc-400 block">Verified Audience</span>
            <div className="text-lg font-black text-premium-success flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-premium-success animate-pulse" />
              <span>418 Checked In</span>
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

      {/* MODULE 1: Welcome & VIP Attendance Counter */}
      {stageMode === 'welcome' && (
        <main className="flex-1 p-10 sm:p-14 flex flex-col justify-center items-center text-center max-w-5xl mx-auto z-10 animate-fadeIn">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-premium-gold/20 border border-premium-gold/30 text-xs font-bold text-premium-gold uppercase tracking-widest mb-6">
            <Sparkles className="w-4 h-4 text-premium-gold" />
            <span>Welcome Distinguished Guests & Honorees</span>
          </div>

          <h2 className="text-4xl sm:text-7xl font-display font-medium text-white tracking-tight leading-tight mb-6">
            {event.name}
          </h2>

          <p className="text-base sm:text-xl text-zinc-300 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            Please take your seats. The grand presentation and live interactive experiences are commencing shortly.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
            <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark shadow-xl">
              <span className="text-xs font-mono uppercase text-zinc-400">Gate Attendance</span>
              <div className="text-4xl font-display font-bold text-premium-success mt-2">418 Pax</div>
              <span className="text-xs text-zinc-500 mt-1 block">Sub-second QR verified</span>
            </div>

            <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark shadow-xl">
              <span className="text-xs font-mono uppercase text-zinc-400">Ballroom Wi-Fi</span>
              <div className="text-xl font-mono font-bold text-white mt-2">ALL41_GUEST</div>
              <span className="text-xs text-premium-gold mt-1 font-mono block">Pass: tech2026</span>
            </div>

            <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark shadow-xl">
              <span className="text-xs font-mono uppercase text-zinc-400">Guest Portal</span>
              <div className="text-lg font-mono font-bold text-premium-neon mt-2 truncate">{clientDomain}</div>
              <span className="text-xs text-zinc-400 mt-1 block">Live photo wall & quiz pad</span>
            </div>
          </div>
        </main>
      )}

      {/* MODULE 2: Pinterest-style Live Masonry Photo & Video Wall */}
      {stageMode === 'photowall' && (
        <main className="flex-1 p-8 sm:p-12 max-w-7xl mx-auto w-full z-10 animate-fadeIn">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-premium-borderDark">
            <div className="flex items-center gap-3">
              <Camera className="w-6 h-6 text-premium-neon" />
              <h3 className="text-2xl font-display font-bold text-white">Live Ballroom Photo & Video Wall</h3>
              <span className="px-3 py-1 rounded-full bg-premium-success/20 text-premium-success text-xs font-mono font-bold">
                PINTEREST STREAM ({photos.length} APPROVED)
              </span>
            </div>

            <div className="text-right font-mono text-xs text-premium-gold">
              Scan QR or visit: <strong className="text-white">{clientDomain}/photowall</strong>
            </div>
          </div>

          <PinterestMasonryPhotoWall
            photos={photos}
            showCaptions={captionsEnabled}
            canLike={true}
            frameOverlayUrl={slug === 'popverse' ? 'https://cdn.openart.ai/openart-ai/production/2026-10/create-image/gyygId5ZYPaN2nz17abs/image_1793300673142_6e56e2a4_1793300673564_d0c29a20.png' : undefined}
          />
        </main>
      )}

      {/* MODULE 3: Kahoot Game Arena (Audience Projector View Synced with Operator) */}
      {stageMode === 'quiz' && (
        <main className="flex-1 p-10 flex flex-col justify-center items-center max-w-5xl mx-auto w-full z-10 animate-fadeIn space-y-8">
          <div className="flex flex-wrap items-center justify-between w-full gap-3">
            <span className="px-4 py-1.5 rounded-full bg-premium-charcoal border border-premium-gold/40 text-sm font-mono text-premium-gold font-bold">
              ⚡ LIVE TRIVIA BLITZ • QUESTION {activeQuizQuestion.id} OF 3 ({activeQuizQuestion.points} PTS)
            </span>
            <span className="text-xs font-mono text-premium-neon bg-premium-surfaceDark border border-premium-borderDark px-3.5 py-1.5 rounded-full font-bold">
              📱 Join buzzer: {clientDomain}/play
            </span>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-premium-charcoal text-sm font-bold font-mono text-premium-gold border border-premium-borderDark">
              <Clock className="w-4 h-4" />
              <span>
                {quizGameStep === 'question_active'
                  ? `${quizTimer}s remaining`
                  : quizGameStep === 'answers_locked'
                  ? 'Buzzers Locked'
                  : quizGameStep === 'reveal'
                  ? 'Correct Answer Revealed'
                  : 'Leaderboard Podium'}
              </span>
            </div>
          </div>

          {quizGameStep === 'podium' ? (
            <div className="p-10 rounded-[2.5rem] bg-premium-charcoal border border-premium-gold shadow-2xl w-full text-center space-y-6">
              <span className="text-xs font-mono uppercase tracking-widest text-premium-gold font-bold">
                ★ OFFICIAL LIVE TRIVIA PODIUM ★
              </span>
              <h2 className="text-4xl font-display font-bold text-white">Top Fastest Responders</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {[
                  { rank: '1st Place', name: 'Budi Santoso', table: 'Diamond 01', score: '2,850 PTS', accent: 'border-premium-gold bg-premium-gold/10 text-premium-gold' },
                  { rank: '2nd Place', name: 'Clarissa Tan', table: 'Platinum 03', score: '2,700 PTS', accent: 'border-premium-neon bg-premium-neon/10 text-premium-neon' },
                  { rank: '3rd Place', name: 'Hendrik Wijaya', table: 'Diamond 02', score: '2,400 PTS', accent: 'border-premium-success bg-premium-success/10 text-premium-success' },
                ].map((winner) => (
                  <div key={winner.rank} className={`p-6 rounded-3xl border ${winner.accent} space-y-1`}>
                    <div className="text-xs font-mono font-bold uppercase">{winner.rank}</div>
                    <div className="text-2xl font-display font-bold text-white">{winner.name}</div>
                    <div className="text-xs font-mono text-zinc-300">Table {winner.table}</div>
                    <div className="text-lg font-mono font-bold pt-2">{winner.score}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="p-10 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark w-full text-center shadow-2xl">
                <h2 className="text-3xl sm:text-4xl font-display font-bold text-white leading-snug">
                  {activeQuizQuestion.question}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-6 w-full">
                {activeQuizQuestion.options.map((opt, idx) => {
                  const shapes = ['▲', '◆', '●', '■'];
                  const baseColors = [
                    'bg-premium-danger text-white',
                    'bg-premium-neon text-black',
                    'bg-premium-gold text-black',
                    'bg-premium-success text-black',
                  ];
                  const isCorrect = opt === activeQuizQuestion.correct;
                  const stateClass =
                    quizGameStep === 'reveal'
                      ? isCorrect
                        ? 'ring-4 ring-white scale-[1.02] shadow-2xl'
                        : 'opacity-25 grayscale'
                      : '';

                  return (
                    <div
                      key={opt}
                      className={`p-6 rounded-3xl ${baseColors[idx % 4]} flex items-center justify-between gap-4 shadow-xl transition-all duration-300 ${stateClass}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl font-display font-bold">{shapes[idx % 4]}</span>
                        <span className="text-xl font-display font-bold">{opt}</span>
                      </div>
                      {quizGameStep === 'reveal' && isCorrect && (
                        <span className="px-3 py-1 rounded-full bg-black/80 text-premium-success text-xs font-mono font-bold uppercase">
                          ✓ Correct
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
      )}

      {/* MODULE 4: Door Prize Raffle Arena (Synced with Operator Mode: Slot / Wheel / Claw) */}
      {stageMode === 'raffle' && (
        <main className="flex-1 p-10 flex flex-col justify-center items-center max-w-4xl mx-auto w-full z-10 animate-fadeIn text-center space-y-6">
          <div>
            <span className="text-xs font-mono uppercase text-premium-gold font-bold tracking-widest">
              ★ GRAND AUDITED RAFFLE DRAW • {activeRaffleStyle.toUpperCase()} MODE ★
            </span>
            <h2 className="text-4xl font-display font-bold text-white mt-1">
              {activeRafflePrize}
            </h2>
          </div>

          {/* 1. Slot Machine 777 Mode */}
          {activeRaffleStyle === 'slot' && (
            <div className="flex gap-5 p-8 rounded-[2.5rem] bg-premium-charcoal border-2 border-premium-gold shadow-gold my-4">
              {[0, 1, 2].map((reel) => (
                <div
                  key={reel}
                  className="w-28 sm:w-36 h-40 rounded-3xl bg-premium-black border border-premium-borderDark flex flex-col items-center justify-center shadow-inner"
                >
                  <span className="text-[10px] font-mono uppercase text-zinc-500 mb-1">
                    {reel === 0 ? 'Table' : reel === 1 ? 'Category' : 'Winner'}
                  </span>
                  <span className="text-2xl sm:text-3xl font-display font-bold text-premium-gold px-2 truncate max-w-full">
                    {isRaffleSpinning
                      ? '777'
                      : raffleWinner
                      ? reel === 0
                        ? raffleWinner.table_number || 'VIP'
                        : reel === 1
                        ? raffleWinner.category
                        : raffleWinner.name.split(' ')[0]
                      : '★'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 2. 3D Wheel Spinner Mode */}
          {activeRaffleStyle === 'wheel' && (
            <div className="relative w-80 h-80 my-4 flex items-center justify-center">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[28px] border-t-premium-danger drop-shadow-[0_4px_10px_rgba(255,51,102,0.8)]" />

              <div
                className="w-full h-full rounded-full border-8 border-premium-gold shadow-gold relative overflow-hidden transition-all duration-[4500ms] cubic-bezier(0.15, 0.9, 0.2, 1)"
                style={{ transform: `rotate(${wheelRotation}deg)` }}
              >
                {MOCK_GUESTS.map((g, idx) => {
                  const angle = (360 / MOCK_GUESTS.length) * idx;
                  const colors = ['#00F0FF', '#C5A059', '#FF3366', '#00E676', '#18181B', '#E5C378'];
                  return (
                    <div
                      key={g.id}
                      className="absolute inset-0 origin-center flex justify-center items-start pt-6 font-mono text-xs font-bold text-black"
                      style={{
                        transform: `rotate(${angle}deg)`,
                        backgroundColor: colors[idx % colors.length],
                        clipPath: 'polygon(50% 50%, 0 0, 100% 0)',
                      }}
                    >
                      <span className="rotate-90 origin-bottom mt-2 truncate max-w-[90px]">
                        {g.name.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="absolute w-20 h-20 rounded-full bg-premium-black border-4 border-premium-gold shadow-2xl flex items-center justify-center font-display font-bold text-lg text-premium-gold z-20">
                41
              </div>
            </div>
          )}

          {/* 3. Arcade Claw Machine Mode */}
          {activeRaffleStyle === 'claw' && (
            <div className="w-96 h-72 rounded-[2.5rem] border-2 border-premium-gold bg-premium-charcoal shadow-gold relative flex flex-col items-center justify-between p-6 my-4">
              <div className="w-20 h-8 rounded-b-2xl bg-premium-neon text-black font-mono text-[10px] font-bold flex items-center justify-center shadow-neon">
                CLAW ARMED
              </div>
              <div className="text-center space-y-2">
                <Gift className={`w-20 h-20 text-premium-gold mx-auto ${isRaffleSpinning ? 'animate-bounce' : ''}`} />
                <div className="text-xs font-mono text-zinc-300">
                  {isRaffleSpinning ? 'Grabbing Golden Capsule from Checked-In Pool...' : '418 Verified Capsules Ready'}
                </div>
              </div>
              <div className="w-full h-3 bg-premium-surfaceDark rounded-full border border-premium-borderDark" />
            </div>
          )}

          {/* Winner Spotlight Banner */}
          {raffleWinner && (
            <div className="p-6 rounded-3xl bg-premium-charcoal border-2 border-premium-success shadow-2xl animate-bounce text-center space-y-1">
              <span className="text-xs font-mono uppercase text-premium-success tracking-widest font-bold">
                🎉 OFFICIAL AUDITED WINNER 🎉
              </span>
              <h3 className="text-4xl font-display font-bold text-white">{raffleWinner.name}</h3>
              <p className="text-sm font-mono text-premium-gold">
                Table {raffleWinner.table_number || 'VIP'} • Verified Pass ID: {raffleWinner.qr_code_token}
              </p>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              disabled={isRaffleSpinning}
              onClick={handleStageSpin}
              className={`px-10 py-4 rounded-2xl font-display font-bold text-sm uppercase tracking-wider text-black shadow-gold transition-all scale-on-click ${
                isRaffleSpinning
                  ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                  : 'bg-premium-gold hover:bg-premium-goldHover'
              }`}
            >
              {isRaffleSpinning ? 'SPINNING LIVE ON STAGE...' : 'TRIGGER AUDITED STAGE SPIN'}
            </button>
          </div>
        </main>
      )}

      {/* MODULE 5: Live Agenda & Keynote Slide */}
      {stageMode === 'rundown' && (
        <main className="flex-1 p-10 sm:p-14 max-w-5xl mx-auto w-full z-10 animate-fadeIn space-y-8">
          <div className="flex items-center justify-between border-b border-premium-borderDark pb-4">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-premium-gold" />
              <h3 className="text-2xl font-display font-medium text-white">Event Rundown & Keynote Schedule</h3>
            </div>
            <span className="text-xs font-mono text-premium-success bg-premium-success/15 px-3 py-1 rounded-full border border-premium-success/30 font-bold">
              Live Stage Sync
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_RUNDOWN.map((item) => (
              <div
                key={item.id}
                className={`p-6 rounded-[2rem] border transition-all ${
                  item.isCurrent
                    ? 'bg-gradient-to-r from-premium-surfaceDark to-premium-charcoal border-premium-gold shadow-gold'
                    : 'bg-premium-charcoal border-premium-borderDark'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-premium-gold font-bold">{item.time}</span>
                  {item.isCurrent && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-premium-success/20 text-premium-success font-mono font-bold uppercase border border-premium-success/30">
                      ● Active Now
                    </span>
                  )}
                </div>
                <h4 className="text-base font-display font-medium text-white">{item.title}</h4>
                {item.speakerOrHost && (
                  <p className="text-xs text-premium-neon mt-1">{item.speakerOrHost} • {item.location}</p>
                )}
                {item.description && (
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{item.description}</p>
                )}
              </div>
            ))}
          </div>
        </main>
      )}

      {/* MODULE 6: Banquet Dining Menu Showcase Slide */}
      {stageMode === 'menu' && (
        <main className="flex-1 p-10 sm:p-14 max-w-5xl mx-auto w-full z-10 animate-fadeIn space-y-8">
          <div className="flex items-center justify-between border-b border-premium-borderDark pb-4">
            <div className="flex items-center gap-3">
              <UtensilsCrossed className="w-6 h-6 text-premium-gold" />
              <h3 className="text-2xl font-display font-medium text-white">Executive Banquet Dining Showcase</h3>
            </div>
            <span className="text-xs font-mono text-premium-gold bg-premium-gold/20 px-3 py-1 rounded-full border border-premium-gold/30 font-bold">
              4-Course Haute Cuisine
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {MOCK_MENU.map((m) => (
              <div key={m.id} className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-2 shadow-xl">
                <span className="text-xs font-mono text-premium-gold uppercase font-bold tracking-widest block">
                  {m.course}
                </span>
                <h4 className="text-lg font-display font-medium text-white">{m.name}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">{m.description}</p>
                {m.pairing && (
                  <div className="text-xs text-premium-neon font-mono pt-2 border-t border-zinc-800">
                    Sommelier Pairing: <strong>{m.pairing}</strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      )}

      {/* MODULE 7: Sponsors & Partners Slide */}
      {stageMode === 'sponsors' && (
        <main className="flex-1 p-12 flex flex-col justify-center items-center text-center max-w-5xl mx-auto w-full z-10 animate-fadeIn space-y-8">
          <div>
            <span className="text-xs font-mono uppercase text-premium-gold font-bold tracking-widest block">
              WITH SINCERE GRATITUDE TO OUR PARTNERS
            </span>
            <h2 className="text-4xl sm:text-5xl font-display font-medium text-white mt-2">
              Principal Sponsors & Industry Co-Hosts
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full pt-4">
            {['Nexus Ventures', 'Alpha Global SG', 'CloudScale Asia', 'FintechSEA', 'CyberShield', 'VenturePulse', 'SummitAI', 'All41 Platform'].map((name, idx) => (
              <div
                key={name}
                className="p-8 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark flex flex-col items-center justify-center shadow-xl hover:border-premium-gold transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-premium-gold/15 border border-premium-gold/30 flex items-center justify-center font-display font-bold text-lg text-premium-gold mb-3 shadow-gold">
                  {idx + 1}
                </div>
                <strong className="text-sm text-white font-display font-medium">{name}</strong>
                <span className="text-[10px] font-mono text-zinc-500 uppercase mt-1">Tier-1 Sponsor</span>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* Scrolling Stage Bottom Ticker Text */}
      <div className="h-10 bg-premium-surfaceDark border-t border-premium-borderDark overflow-hidden flex items-center z-20">
        <div className="whitespace-nowrap animate-marquee font-mono text-xs text-premium-gold flex items-center gap-8">
          <span>{stageConfig.tickerText}</span>
          <span>•</span>
          <span>{stageConfig.tickerText}</span>
        </div>
      </div>

      {/* Stage Tech HUD Controller Bar (Hidden with key H) */}
      {hudVisible && (
        <footer className="h-14 px-8 bg-premium-surfaceDark/90 border-t border-premium-borderDark flex items-center justify-between z-30 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">HUD [Key: H to toggle]:</span>
            <button
              type="button"
              onClick={() => setIsAutoRotating(!isAutoRotating)}
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

          {/* Module Switcher Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {stageConfig.modules.filter((m) => m.isEnabled).map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setStageMode(m.id);
                  setIsAutoRotating(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all scale-on-click ${
                  stageMode === m.id
                    ? 'bg-premium-gold text-black shadow-gold'
                    : 'bg-premium-charcoal text-zinc-400 hover:text-white border border-premium-borderDark'
                }`}
              >
                {idx + 1}. {m.name}
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
    <Suspense fallback={<div className="p-8 text-xs text-gray-400">Loading stage screen...</div>}>
      <StageBigScreenWrapper params={params} />
    </Suspense>
  );
}
