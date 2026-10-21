'use client';

import Link from 'next/link';
import { Sparkles, QrCode, Camera, Trophy, Gift, Mail, Globe, ArrowRight, CheckCircle2 } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
      {/* Background Neon Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-tr from-[#00f0ff]/15 via-[#dfb76c]/10 to-[#ff007f]/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 left-10 w-72 h-72 bg-[#00f0ff]/10 blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute top-1/2 right-10 w-80 h-80 bg-[#ff007f]/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Top Announcement Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#161c2c] border border-[#232d44] text-xs font-semibold text-gray-300 mb-8 shadow-inner hover:border-[#dfb76c]/50 transition-colors">
          <span className="flex h-2 w-2 rounded-full bg-[#00f0ff] animate-ping" />
          <span className="text-[#dfb76c]">Next-Gen Platform</span>
          <span className="text-gray-500">•</span>
          <span>Corporate Galas & Modern Weddings</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.12]">
          Everything you need <br />
          for your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] via-[#dfb76c] to-[#ff007f]">unforgettable event</span>.
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
          Say goodbye to juggling 5 different apps. From branded landing pages, RSVP invitations, and high-speed QR check-ins, to live photo walls, claw machine raffles, and interactive trivia.
        </p>

        {/* Primary CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard/events/new"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-[#0b0d13] bg-gradient-to-r from-[#00f0ff] via-[#dfb76c] to-[#ff007f] hover:brightness-110 transition-all shadow-[0_0_30px_rgba(223,183,108,0.3)] active:scale-95"
          >
            <span>Start Free Event (≤5 Guests)</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/events/techunite"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-base text-gray-200 bg-[#141926] border border-[#232c42] hover:bg-[#1a2133] hover:text-white hover:border-[#00f0ff]/50 transition-all"
          >
            <span>Explore Live Demo Experience</span>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#00ff88]" />
            <span>Zero App Downloads Required</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#00f0ff]" />
            <span>Multi-device Realtime Sync</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#dfb76c]" />
            <span>Subdomain & Custom Domain Ready</span>
          </div>
        </div>

        {/* Visual Interactive Dashboard Preview Teaser */}
        <div className="mt-16 relative mx-auto max-w-5xl rounded-2xl border border-[#242d45] bg-[#0e121c]/90 p-3 sm:p-4 shadow-2xl backdrop-blur-xl">
          <div className="relative rounded-xl border border-[#1e263d] bg-[#121624] overflow-hidden">
            {/* Top Bar Window Controls */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0d101a] border-b border-[#1e263d]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                <span className="text-xs font-mono text-gray-400 ml-2">live.all41.app / techunite-summit-2026</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                  Realtime Gate Active
                </span>
                <span className="text-xs text-gray-400">Checked-in: <strong className="text-white">418 / 650</strong></span>
              </div>
            </div>

            {/* Quick module feature bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-6 bg-[#0e121e]">
              <div className="p-4 rounded-xl bg-[#151a2a] border border-[#222b42] flex items-center gap-3 hover:border-[#00f0ff]/40 transition-colors">
                <div className="p-2.5 rounded-lg bg-[#00f0ff]/10 text-[#00f0ff]">
                  <QrCode className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-xs text-gray-400">Fast Gate</div>
                  <div className="text-sm font-bold text-white">QR Check-in</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#151a2a] border border-[#222b42] flex items-center gap-3 hover:border-[#dfb76c]/40 transition-colors">
                <div className="p-2.5 rounded-lg bg-[#dfb76c]/10 text-[#dfb76c]">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-xs text-gray-400">Live WebP</div>
                  <div className="text-sm font-bold text-white">Photo Wall</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#151a2a] border border-[#222b42] flex items-center gap-3 hover:border-[#ff007f]/40 transition-colors">
                <div className="p-2.5 rounded-lg bg-[#ff007f]/10 text-[#ff007f]">
                  <Gift className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-xs text-gray-400">Door Prize</div>
                  <div className="text-sm font-bold text-white">Raffle Wheel</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#151a2a] border border-[#222b42] flex items-center gap-3 hover:border-[#9d00ff]/40 transition-colors">
                <div className="p-2.5 rounded-lg bg-[#9d00ff]/10 text-[#9d00ff]">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-xs text-gray-400">Interactive</div>
                  <div className="text-sm font-bold text-white">Kahoot Quiz</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
