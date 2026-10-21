'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import { MOCK_EVENT, MOCK_PHOTO_WALL_UPLOADS, MOCK_GUESTS, MOCK_RAFFLES } from '@/lib/mockData';
import { PhotoWallUpload, Guest } from '@/lib/types';
import { formatDate } from '@/lib/utils';
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
  Radio,
  Layers,
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';

function StageBigScreenContent({ slug }: { slug: string }) {
  const [stageMode, setStageMode] = useState<'welcome' | 'photowall' | 'quiz' | 'raffle'>('welcome');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);

  // Photo Wall Stage State
  const [photos] = useState<PhotoWallUpload[]>(MOCK_PHOTO_WALL_UPLOADS);
  const [qrUploadUrl, setQrUploadUrl] = useState('');

  // Quiz Big Screen State
  const [quizTimer, setQuizTimer] = useState(12);
  const [quizPhase, setQuizPhase] = useState<'question' | 'reveal' | 'podium'>('question');

  // Raffle Big Screen State
  const [isRaffleSpinning, setIsRaffleSpinning] = useState(false);
  const [raffleWinner, setRaffleWinner] = useState<Guest | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);

  useEffect(() => {
    QRCode.toDataURL(`https://${slug}.all41.app/photowall`, {
      width: 240,
      margin: 1,
      color: { dark: '#07090e', light: '#ffffff' },
    }).then(setQrUploadUrl);

    // Keyboard shortcuts for ballroom technicians
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 'h' || e.key === 'H') setHudVisible((v) => !v);
      if (e.key === '1') setStageMode('welcome');
      if (e.key === '2') setStageMode('photowall');
      if (e.key === '3') setStageMode('quiz');
      if (e.key === '4') setStageMode('raffle');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slug]);

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
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-[#06080e] text-[#f8fafc] flex flex-col justify-between overflow-hidden relative select-none font-sans">
      {/* Background Stage Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-[#00f0ff]/10 blur-[180px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-[#dfb76c]/10 blur-[180px] pointer-events-none rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#ff007f]/5 blur-[200px] pointer-events-none rounded-full" />

      {/* Top Ballroom Stage Header */}
      <header className="h-20 px-10 flex items-center justify-between z-20 backdrop-blur-md bg-[#0a0d17]/70 border-b border-[#1b2234]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f0ff] via-[#dfb76c] to-[#ff007f] p-[2px]">
            <div className="w-full h-full bg-[#07090e] rounded-[10px] flex items-center justify-center font-black text-sm text-white">
              41
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{MOCK_EVENT.name}</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30 font-mono">
                BALLROOM LED MASTER
              </span>
            </h1>
            <p className="text-xs text-gray-400 font-mono">
              {formatDate(MOCK_EVENT.start_date)} • {MOCK_EVENT.location_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-mono uppercase text-gray-400 block">Verified Audience</span>
            <div className="text-lg font-black text-[#00ff88] flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
              <span>418 Checked In</span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-[#141926] border border-[#222b40] text-gray-300 hover:text-white transition-colors"
            title="Toggle Stage Fullscreen (Key: F)"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* STAGE MODE 1: Welcome & Live Attendance Counter */}
      {stageMode === 'welcome' && (
        <main className="flex-1 p-12 flex flex-col justify-center items-center text-center max-w-5xl mx-auto z-10 animate-fadeIn">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#141928] border border-[#25324e] text-xs font-semibold text-[#dfb76c] mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Welcome Distinguished Guests & Honorees</span>
          </div>

          <h2 className="text-5xl sm:text-7xl font-black text-white tracking-tight leading-tight mb-6">
            {MOCK_EVENT.name}
          </h2>

          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Please take your seats. The grand presentation and live interactive experiences are commencing shortly.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
            <div className="p-6 rounded-3xl bg-[#0f1322] border border-[#1e273d] shadow-xl">
              <span className="text-xs font-mono uppercase text-gray-400">Gate Attendance</span>
              <div className="text-4xl font-black text-[#00ff88] mt-2">418 Pax</div>
              <span className="text-xs text-gray-500 mt-1 block">Sub-second QR verified</span>
            </div>

            <div className="p-6 rounded-3xl bg-[#0f1322] border border-[#1e273d] shadow-xl">
              <span className="text-xs font-mono uppercase text-gray-400">Ballroom Wi-Fi</span>
              <div className="text-xl font-mono font-black text-white mt-2">ALL41_GUEST</div>
              <span className="text-xs text-[#dfb76c] mt-1 font-mono block">Pass: tech2026</span>
            </div>

            <div className="p-6 rounded-3xl bg-[#0f1322] border border-[#1e273d] shadow-xl">
              <span className="text-xs font-mono uppercase text-gray-400">Interactive Wall</span>
              <div className="text-xl font-black text-[#00f0ff] mt-2">Live Stream</div>
              <span className="text-xs text-gray-500 mt-1 block">Selfies broadcast here</span>
            </div>
          </div>
        </main>
      )}

      {/* STAGE MODE 2: Live Ballroom Photo Wall */}
      {stageMode === 'photowall' && (
        <main className="flex-1 p-8 grid grid-cols-2 md:grid-cols-4 gap-6 items-stretch relative z-10 animate-fadeIn overflow-hidden">
          {photos.map((p, idx) => (
            <div
              key={p.id}
              className={`group relative rounded-3xl overflow-hidden border border-[#232c42] bg-[#101422] shadow-2xl flex flex-col justify-end ${
                idx === 0 ? 'md:col-span-2 md:row-span-2' : ''
              }`}
            >
              <img
                src={p.image_url}
                alt={p.caption || 'Live photo wall capture'}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

              {p.frame_used && (
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-[#dfb76c]/50 text-[11px] font-mono font-bold text-[#dfb76c] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="capitalize">{p.frame_used.replace(/-/g, ' ')}</span>
                </div>
              )}

              <div className="relative p-5 z-10">
                <p className="text-sm font-semibold text-white drop-shadow-md mb-2 leading-snug">
                  &ldquo;{p.caption || 'Celebrating together!'}&rdquo;
                </p>
                <div className="flex items-center justify-between text-xs font-mono text-gray-300">
                  <span className="font-bold text-[#00f0ff]">@{p.guest?.name}</span>
                  <span className="text-gray-400">{p.guest?.table_number || 'VIP Table'}</span>
                </div>
              </div>
            </div>
          ))}
        </main>
      )}

      {/* STAGE MODE 3: Kahoot Game Arena (Audience Projector View) */}
      {stageMode === 'quiz' && (
        <main className="flex-1 p-10 flex flex-col justify-center items-center max-w-5xl mx-auto w-full z-10 animate-fadeIn space-y-8">
          <div className="flex items-center justify-between w-full">
            <span className="px-4 py-1.5 rounded-full bg-[#1b152e] border border-[#3b2563] text-sm font-mono text-[#9d00ff] font-bold">
              ⚡ LIVE TRIVIA BLITZ • QUESTION 1 OF 3
            </span>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#121624] text-sm font-bold font-mono text-[#dfb76c] border border-[#25324e]">
              <Clock className="w-4 h-4" />
              <span>{quizTimer}s remaining</span>
            </div>
          </div>

          <div className="p-10 rounded-3xl bg-[#101422]/90 border border-[#232d44] w-full text-center shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-snug">
              In which year was the first startup unicorn born in Southeast Asia?
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-6 w-full">
            <div className="p-6 rounded-2xl bg-[#e21b3c] text-white flex items-center gap-4 shadow-xl">
              <span className="text-3xl font-black">▲</span>
              <span className="text-xl font-bold">A. 2009</span>
            </div>
            <div className="p-6 rounded-2xl bg-[#1368ce] text-white flex items-center gap-4 shadow-xl">
              <span className="text-3xl font-black">◆</span>
              <span className="text-xl font-bold">B. 2012</span>
            </div>
            <div className="p-6 rounded-2xl bg-[#d89e00] text-white flex items-center gap-4 shadow-xl">
              <span className="text-3xl font-black">●</span>
              <span className="text-xl font-bold">C. 2014</span>
            </div>
            <div className="p-6 rounded-2xl bg-[#26890c] text-white flex items-center gap-4 shadow-xl">
              <span className="text-3xl font-black">■</span>
              <span className="text-xl font-bold">D. 2016</span>
            </div>
          </div>
        </main>
      )}

      {/* STAGE MODE 4: Door Prize Raffle Arena */}
      {stageMode === 'raffle' && (
        <main className="flex-1 p-10 flex flex-col justify-center items-center max-w-4xl mx-auto w-full z-10 animate-fadeIn text-center space-y-6">
          <div>
            <span className="text-xs font-mono uppercase text-[#dfb76c] font-bold tracking-widest">
              ★ GRAND AUDITED RAFFLE DRAW ★
            </span>
            <h2 className="text-4xl font-black text-white mt-1">
              Apple MacBook Pro M4 Max (16-inch)
            </h2>
          </div>

          {/* Big Wheel Spinner */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute -top-4 z-30 w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-[36px] border-t-[#ff007f] drop-shadow-[0_4px_16px_rgba(255,0,127,0.9)]" />

            <div
              className="w-80 sm:w-[420px] h-80 sm:h-[420px] rounded-full border-8 border-[#dfb76c] shadow-[0_0_60px_rgba(223,183,108,0.4)] relative overflow-hidden transition-all duration-[4500ms] ease-out flex items-center justify-center"
              style={{
                transform: `rotate(${wheelRotation}deg)`,
                background: 'conic-gradient(#121624 0deg 45deg, #1b233a 45deg 90deg, #121624 90deg 135deg, #1b233a 135deg 180deg, #121624 180deg 225deg, #1b233a 225deg 270deg, #121624 270deg 315deg, #1b233a 315deg 360deg)',
              }}
            >
              {MOCK_GUESTS.slice(0, 8).map((g, idx) => {
                const deg = idx * 45;
                return (
                  <div
                    key={g.id}
                    className="absolute w-full text-center text-xs font-bold text-gray-200"
                    style={{ transform: `rotate(${deg}deg) translateY(-140px)` }}
                  >
                    {g.name.split(' ')[0]}
                  </div>
                );
              })}
              <div className="w-24 h-24 rounded-full bg-[#07090e] border-4 border-[#00f0ff] shadow-xl flex items-center justify-center font-black text-lg text-[#dfb76c] z-20">
                ALL41
              </div>
            </div>
          </div>

          {raffleWinner ? (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1c182a] to-[#101422] border-2 border-[#dfb76c] shadow-2xl max-w-md w-full animate-fadeIn">
              <span className="text-xs font-mono uppercase text-[#00ff88] font-bold">🎉 WINNER VERIFIED</span>
              <h3 className="text-3xl font-black text-white mt-1">{raffleWinner.name}</h3>
              <p className="text-xs text-gray-300 mt-1">Table: <strong className="text-[#dfb76c]">{raffleWinner.table_number}</strong></p>
            </div>
          ) : (
            <button
              type="button"
              disabled={isRaffleSpinning}
              onClick={handleStageSpin}
              className="px-10 py-3.5 rounded-2xl font-black text-sm text-[#07090f] uppercase bg-gradient-to-r from-[#dfb76c] via-[#00f0ff] to-[#ff007f] hover:brightness-110 shadow-xl cursor-pointer"
            >
              {isRaffleSpinning ? 'Drawing Winner on Stage...' : 'Spin Fortune Wheel'}
            </button>
          )}
        </main>
      )}

      {/* Bottom Stage Banner with Floating QR Code */}
      <footer className="h-28 px-10 bg-[#0a0d17]/90 border-t border-[#1b2234] flex items-center justify-between relative z-20 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="p-2 bg-white rounded-xl shadow-2xl flex-shrink-0">
            {qrUploadUrl ? (
              <img src={qrUploadUrl} alt="Scan QR" className="w-20 h-20 object-contain" />
            ) : (
              <QrCode className="w-16 h-16 text-black" />
            )}
          </div>
          <div>
            <div className="text-base font-black text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#00f0ff]" />
              <span>Snap & Post Your Photo onto This Stage LED Screen!</span>
            </div>
            <p className="text-xs text-gray-400 mt-1 max-w-md">
              Point your smartphone camera at this QR code. WebP photos appear live across ballroom monitors.
            </p>
          </div>
        </div>

        {/* Floating Discrete Operator Mode Switcher HUD */}
        {hudVisible && (
          <div className="flex items-center gap-2 bg-[#121624] p-1.5 rounded-2xl border border-[#25324e] shadow-2xl">
            <span className="text-[10px] font-mono text-gray-500 uppercase px-2 hidden lg:inline">Stage Mode:</span>
            <button
              type="button"
              onClick={() => setStageMode('welcome')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                stageMode === 'welcome' ? 'bg-[#dfb76c] text-[#07090f]' : 'text-gray-400 hover:text-white'
              }`}
            >
              1. Welcome
            </button>
            <button
              type="button"
              onClick={() => setStageMode('photowall')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                stageMode === 'photowall' ? 'bg-[#00f0ff] text-[#07090f]' : 'text-gray-400 hover:text-white'
              }`}
            >
              2. Photo Wall
            </button>
            <button
              type="button"
              onClick={() => setStageMode('quiz')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                stageMode === 'quiz' ? 'bg-[#9d00ff] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              3. Quiz Arena
            </button>
            <button
              type="button"
              onClick={() => setStageMode('raffle')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                stageMode === 'raffle' ? 'bg-[#ff007f] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              4. Raffle Arena
            </button>
          </div>
        )}
      </footer>
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
