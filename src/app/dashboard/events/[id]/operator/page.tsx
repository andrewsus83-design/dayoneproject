'use client';

import React, { useState, use, Suspense } from 'react';
import Link from 'next/link';
import { MOCK_EVENT, MOCK_GUESTS, MOCK_PHOTO_WALL_UPLOADS, MOCK_RAFFLES } from '@/lib/mockData';
import { Guest, PhotoWallUpload } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import {
  Sliders,
  QrCode,
  Camera,
  Gamepad2,
  Gift,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Volume2,
  VolumeX,
  ShieldCheck,
  Check,
  X,
  ArrowLeft,
  Maximize2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

function OperatorCommandCenterContent({ eventId }: { eventId: string }) {
  const [activeTab, setActiveTab] = useState<'gate' | 'photowall' | 'gamemaster' | 'raffle'>('photowall');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Gate Scanner State
  const [guests, setGuests] = useState<Guest[]>(MOCK_GUESTS);
  const [tokenInput, setTokenInput] = useState('');
  const [gateFeedback, setGateFeedback] = useState<{ status: 'success' | 'duplicate' | 'invalid'; message: string; guest?: Guest } | null>(null);

  // Photo Wall Moderation Queue State
  const [pendingPhotos, setPendingPhotos] = useState<PhotoWallUpload[]>([
    ...MOCK_PHOTO_WALL_UPLOADS,
    {
      id: 'pw-pending-1',
      event_id: eventId,
      guest_id: 'gst-004',
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

  // Game Master State
  const [gameStep, setGameStep] = useState<'lobby' | 'question_active' | 'answers_locked' | 'reveal' | 'podium'>('question_active');
  const [activeQuestion, setActiveQuestion] = useState(1);

  // Raffle State
  const [rafflePrize, setRafflePrize] = useState('Apple MacBook Pro M4 Max');
  const [raffleStyle, setRaffleStyle] = useState<'wheel' | 'claw' | 'slot'>('wheel');
  const [isRaffleBroadcasting, setIsRaffleBroadcasting] = useState(false);

  // Handle Gate Check-in
  const handleVerifyGateToken = (token: string) => {
    const trimmed = token.trim();
    if (!trimmed) return;

    const found = guests.find((g) => g.qr_code_token.toLowerCase() === trimmed.toLowerCase());
    if (!found) {
      setGateFeedback({ status: 'invalid', message: `Token "${trimmed}" not found in database.` });
      return;
    }

    if (found.is_checked_in) {
      setGateFeedback({
        status: 'duplicate',
        message: `Already checked in earlier by ${found.checked_in_by || 'Gate Staff'}.`,
        guest: found,
      });
      return;
    }

    // Check in
    const updated = guests.map((g) =>
      g.id === found.id
        ? { ...g, is_checked_in: true, checked_in_at: new Date().toISOString(), checked_in_by: 'Operator Terminal Alpha' }
        : g
    );
    setGuests(updated);
    setGateFeedback({
      status: 'success',
      message: `Verified! Welcome to ${MOCK_EVENT.name}.`,
      guest: { ...found, is_checked_in: true },
    });
    setTokenInput('');
  };

  // Moderate Photo
  const handleApprovePhoto = (photoId: string) => {
    setPendingPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, is_approved: true } : p))
    );
  };

  const handleRejectPhoto = (photoId: string) => {
    setPendingPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  // Trigger Remote Raffle Spin on Stage
  const handleTriggerStageRaffle = () => {
    setIsRaffleBroadcasting(true);
    setTimeout(() => {
      setIsRaffleBroadcasting(false);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }, 4500);
  };

  const checkedInCount = guests.filter((g) => g.is_checked_in).length;
  const unapprovedPhotos = pendingPhotos.filter((p) => !p.is_approved);

  return (
    <div className="min-h-screen bg-[#07090f] text-[#f8fafc] flex flex-col">
      {/* Top Operator Command Bar */}
      <header className="h-16 px-6 bg-[#0c101c] border-b border-[#1f283d] flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-[#141928] text-gray-400 hover:text-white border border-[#232c44]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>Event Operator Command Center</span>
              <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            </h1>
            <p className="text-[10px] text-gray-400 font-mono">
              {MOCK_EVENT.name} • Gate, Moderation & Stage Broadcast
            </p>
          </div>
        </div>

        {/* Operational View Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-[#121624] p-1 rounded-xl border border-[#20293d]">
          <button
            type="button"
            onClick={() => setActiveTab('photowall')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'photowall'
                ? 'bg-[#00f0ff] text-[#07090f] shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Photo Moderation</span>
            {unapprovedPhotos.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#ff007f] text-white text-[10px] font-mono">
                {unapprovedPhotos.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'gate'
                ? 'bg-[#00f0ff] text-[#07090f] shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Gate Scanner</span>
            <span className="text-[10px] text-gray-500 font-mono">({checkedInCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gamemaster')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'gamemaster'
                ? 'bg-[#00f0ff] text-[#07090f] shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Game Master</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('raffle')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'raffle'
                ? 'bg-[#00f0ff] text-[#07090f] shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Raffle Stage</span>
          </button>
        </div>

        {/* Quick Launch Live Screens Link */}
        <div className="flex items-center gap-3">
          <Link
            href={`/events/${MOCK_EVENT.slug}/stage`}
            target="_blank"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#172035] border border-[#28385a] text-xs font-bold text-[#dfb76c] hover:bg-[#202c48] transition-colors"
          >
            <span>Launch Stage Master Screen</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* TAB 1: Photo Wall Moderation Queue */}
        {activeTab === 'photowall' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#1e263d] pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Photo Wall Moderation Queue</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#dfb76c]/20 text-[#dfb76c] font-mono">
                    {unapprovedPhotos.length} Awaiting Approval
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  Review attendee selfies before allowing them onto the grand ballroom LED projector
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    unapprovedPhotos.forEach((p) => handleApprovePhoto(p.id));
                  }}
                  className="px-4 py-2 rounded-xl bg-[#00ff88]/20 border border-[#00ff88] text-[#00ff88] text-xs font-bold hover:bg-[#00ff88]/30 transition-all"
                >
                  Approve All Pending
                </button>
              </div>
            </div>

            {/* Grid of Moderation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className={`rounded-2xl border overflow-hidden transition-all flex flex-col justify-between ${
                    photo.is_approved
                      ? 'bg-[#0b1c14] border-[#00ff88]/50'
                      : 'bg-[#121624] border-[#202b40]'
                  }`}
                >
                  <div className="relative aspect-video overflow-hidden bg-black">
                    <img
                      src={photo.image_url}
                      alt="Attendee submission"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] font-mono font-bold text-[#dfb76c] border border-white/10">
                      {photo.frame_used || 'Standard'}
                    </div>
                    {photo.is_approved && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#00ff88] text-[#07090f] text-[10px] font-bold">
                        Live on Wall
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <p className="text-xs font-medium text-white line-clamp-2">
                      &ldquo;{photo.caption || 'No caption provided'}&rdquo;
                    </p>
                    <div className="text-[11px] font-mono text-gray-400 flex items-center justify-between pt-1 border-t border-[#1a2336]">
                      <span className="font-bold text-[#00f0ff]">@{photo.guest?.name}</span>
                      <span>Table: {photo.guest?.table_number || 'VIP'}</span>
                    </div>
                  </div>

                  {/* Moderation Controls */}
                  <div className="p-3 bg-[#0d101a] border-t border-[#1a2336] flex items-center justify-between gap-2">
                    {!photo.is_approved ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRejectPhoto(photo.id)}
                          className="flex-1 py-1.5 rounded-lg bg-[#24151a] border border-red-500/40 text-red-400 text-xs font-semibold hover:bg-red-500/20 flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprovePhoto(photo.id)}
                          className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-[#00ff88] to-[#00f0ff] text-[#07090f] text-xs font-bold hover:brightness-110 flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Broadcast Live</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-[#00ff88] font-bold flex items-center gap-1 w-full justify-center py-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Broadcasting to Stage</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Gate Check-in Station */}
        {activeTab === 'gate' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-7 space-y-4">
              <div className="p-6 rounded-3xl bg-[#121624] border border-[#20293d] space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#00f0ff]" />
                  <span>Manual Token & Barcode Scan Input</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Plug in USB barcode scanner or type guest pass token
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
                    className="flex-1 px-4 py-3 rounded-xl bg-[#090b12] border border-[#1e263d] text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-[#00f0ff]"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-[#00f0ff] text-[#07090f] font-bold text-xs hover:brightness-110 shadow"
                  >
                    Admit Guest
                  </button>
                </form>

                {/* Quick Simulators */}
                <div className="pt-3 border-t border-[#1a2133] flex flex-wrap gap-2 text-xs">
                  <span className="text-[11px] text-gray-500 font-mono self-center">Instant Test:</span>
                  <button
                    type="button"
                    onClick={() => handleVerifyGateToken('QR-ALL41-SITI-3309')}
                    className="px-2.5 py-1 rounded-lg bg-[#192237] text-[#00ff88] font-mono border border-[#27375a]"
                  >
                    Siti (Pending)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerifyGateToken('QR-ALL41-BUDI-9812')}
                    className="px-2.5 py-1 rounded-lg bg-[#192237] text-[#ff007f] font-mono border border-[#27375a]"
                  >
                    Budi (Duplicate)
                  </button>
                </div>
              </div>

              {/* Feedback Display */}
              {gateFeedback && (
                <div
                  className={`p-5 rounded-2xl border animate-fadeIn ${
                    gateFeedback.status === 'success'
                      ? 'bg-[#0b1f17] border-[#00ff88] text-[#00ff88]'
                      : gateFeedback.status === 'duplicate'
                      ? 'bg-[#29131c] border-[#ff007f] text-[#ff007f]'
                      : 'bg-[#241315] border-red-500 text-red-400'
                  }`}
                >
                  <div className="text-base font-black uppercase">
                    {gateFeedback.status === 'success' && '✓ Admission Verified'}
                    {gateFeedback.status === 'duplicate' && '⚠ Duplicate Pass Token'}
                    {gateFeedback.status === 'invalid' && '✕ Invalid Token'}
                  </div>
                  <div className="text-xs mt-1 text-gray-300">{gateFeedback.message}</div>
                  {gateFeedback.guest && (
                    <div className="mt-3 pt-3 border-t border-current/20 flex justify-between text-xs font-bold text-white">
                      <span>{gateFeedback.guest.name} ({gateFeedback.guest.category})</span>
                      <span className="text-[#dfb76c]">Table: {gateFeedback.guest.table_number || 'General'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Roster Stats */}
            <div className="md:col-span-5 space-y-4">
              <div className="p-6 rounded-3xl bg-[#121624] border border-[#20293d] space-y-3">
                <span className="text-xs font-mono uppercase text-gray-400">Gate Telemetry</span>
                <div className="text-3xl font-black text-[#00ff88]">{checkedInCount} / {guests.length}</div>
                <div className="w-full bg-[#1e263d] h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#00ff88] h-full transition-all duration-500"
                    style={{ width: `${(checkedInCount / guests.length) * 100}%` }}
                  />
                </div>
                <div className="text-[11px] text-gray-400 font-mono">
                  {((checkedInCount / guests.length) * 100).toFixed(0)}% attendance verified
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Game Master Controller */}
        {activeTab === 'gamemaster' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="p-6 rounded-3xl bg-[#121624] border border-[#20293d] space-y-6">
              <div className="flex items-center justify-between border-b border-[#1e263d] pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-[#9d00ff]" />
                    <span>Live Game Master Broadcast Controller</span>
                  </h3>
                  <p className="text-xs text-gray-400">Controls question broadcast on stage screens & participant buzzer locks</p>
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#9d00ff]/20 text-[#9d00ff] font-bold">
                  Question {activeQuestion} of 3
                </span>
              </div>

              {/* Step Sequence Controller */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setGameStep('question_active')}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    gameStep === 'question_active'
                      ? 'bg-[#201538] border-[#9d00ff] text-[#9d00ff] font-bold'
                      : 'bg-[#0d101a] border-[#1e263d] text-gray-400'
                  }`}
                >
                  <Play className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs block">1. Broadcast Q</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGameStep('answers_locked')}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    gameStep === 'answers_locked'
                      ? 'bg-[#201538] border-[#ff007f] text-[#ff007f] font-bold'
                      : 'bg-[#0d101a] border-[#1e263d] text-gray-400'
                  }`}
                >
                  <Clock className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs block">2. Lock Buzzers</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGameStep('reveal')}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    gameStep === 'reveal'
                      ? 'bg-[#201538] border-[#00ff88] text-[#00ff88] font-bold'
                      : 'bg-[#0d101a] border-[#1e263d] text-gray-400'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs block">3. Reveal Answer</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGameStep('podium');
                    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
                  }}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    gameStep === 'podium'
                      ? 'bg-[#201538] border-[#dfb76c] text-[#dfb76c] font-bold'
                      : 'bg-[#0d101a] border-[#1e263d] text-gray-400'
                  }`}
                >
                  <Sparkles className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs block">4. Stage Podium</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[#090b12] border border-[#1b2234] text-xs space-y-2">
                <div className="font-bold text-white">Current Question on Stage:</div>
                <div className="text-gray-300">
                  &ldquo;In which year was the first unicorn startup founded in Southeast Asia?&rdquo;
                </div>
                <div className="text-[11px] text-[#00ff88] font-mono">
                  Correct Answer: B (2012) • 412 Guests Responded
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveQuestion((q) => Math.max(1, q - 1))}
                  className="px-4 py-2 rounded-xl bg-[#141926] text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Previous Question
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveQuestion((q) => q + 1);
                    setGameStep('question_active');
                  }}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-[#07090f] bg-gradient-to-r from-[#00f0ff] to-[#dfb76c] hover:brightness-110 shadow"
                >
                  Next Question →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Raffle Operator Controller */}
        {activeTab === 'raffle' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="p-6 rounded-3xl bg-[#121624] border border-[#20293d] space-y-5">
              <div className="border-b border-[#1e263d] pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-[#dfb76c]" />
                  <span>Door Prize Remote Trigger</span>
                </h3>
                <p className="text-xs text-gray-400">Trigger animated spin broadcasts directly to the ballroom stage projector</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Grand Prize Title</label>
                <input
                  type="text"
                  value={rafflePrize}
                  onChange={(e) => setRafflePrize(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#090b12] border border-[#1e263d] text-xs font-bold text-white focus:outline-none focus:border-[#dfb76c]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Raffle Visual Mechanism</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['wheel', 'claw', 'slot'] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setRaffleStyle(style)}
                      className={`p-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                        raffleStyle === style
                          ? 'bg-[#dfb76c]/20 border-[#dfb76c] text-[#dfb76c]'
                          : 'bg-[#090b12] border-[#1e263d] text-gray-400'
                      }`}
                    >
                      {style} Machine
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  disabled={isRaffleBroadcasting}
                  onClick={handleTriggerStageRaffle}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-[#07090f] transition-all shadow-xl ${
                    isRaffleBroadcasting
                      ? 'bg-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#dfb76c] via-[#00f0ff] to-[#ff007f] hover:brightness-110 active:scale-95'
                  }`}
                >
                  {isRaffleBroadcasting ? 'Spinning Live on Stage Screen...' : 'Trigger Spin on Stage Projector!'}
                </button>
              </div>
            </div>
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
    <Suspense fallback={<div className="p-8 text-xs text-gray-400">Loading operator suite...</div>}>
      <OperatorCommandCenterWrapper params={params} />
    </Suspense>
  );
}
