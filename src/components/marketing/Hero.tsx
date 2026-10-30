'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, QrCode, Camera, Gift, Trophy } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative overflow-hidden min-h-[92vh] flex items-center pt-8 pb-24 md:pb-32 font-sans">

      {/* Background ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-[30%] w-[900px] h-[600px] bg-premium-gold/[0.06] blur-[180px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-premium-neon/[0.05] blur-[140px] rounded-full" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-premium-gold/[0.04] blur-[120px] rounded-full" />
      </div>

      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">

          {/* ── Left column ── */}
          <div className="space-y-8 lg:space-y-10">

            {/* Eyebrow */}
            <span className="inline-flex items-center gap-2 px-4 py-1.5 text-[11px] font-bold bg-premium-gold/15 text-premium-gold border border-premium-gold/25 rounded-full tracking-[0.16em] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-premium-gold animate-pulse" />
              Southeast Asia&apos;s Event OS
            </span>

            {/* Main headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-[72px] xl:text-[80px] font-display font-medium tracking-[-0.025em] text-white leading-[1.05]">
              Everything you{' '}
              <br className="hidden sm:block" />
              need for your{' '}
              <br className="hidden sm:block" />
              <span className="text-premium-gold">unforgettable</span>
              <br className="hidden sm:block" />
              event.
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-zinc-400 font-light leading-relaxed max-w-lg">
              One platform, one theme, zero friction. Branded invitations,
              sub-second QR check-ins, live photo walls, prize raffles and
              interactive leaderboards — all unified.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link
                href="/dashboard/events/new"
                className="inline-flex items-center gap-2.5 bg-premium-gold hover:bg-premium-goldHover text-black px-8 py-4 rounded-[1.5rem] text-[15px] font-bold transition-all shadow-gold scale-on-click"
              >
                <span>Create Your Event</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2.5 bg-transparent border border-white/10 hover:border-white/25 text-white/80 hover:text-white px-8 py-4 rounded-[1.5rem] text-[15px] font-medium transition-all scale-on-click"
              >
                <span>Explore modules</span>
              </Link>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap items-center gap-y-3 gap-x-7 text-[11px] font-medium text-zinc-500 uppercase tracking-wider pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-premium-success flex-shrink-0" />
                Zero app downloads
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-premium-neon flex-shrink-0" />
                Realtime cloud sync
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-premium-gold flex-shrink-0" />
                Custom subdomains
              </div>
            </div>
          </div>

          {/* ── Right column — dashboard preview ── */}
          <div className="relative lg:pl-4">

            {/* Floating badge */}
            <div className="absolute -top-5 -left-4 z-20 hidden lg:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-premium-charcoal border border-premium-borderDark shadow-2xl">
              <span className="w-2.5 h-2.5 rounded-full bg-premium-success shadow-[0_0_10px_#00E676] animate-pulse" />
              <span className="text-xs font-bold text-white">Gate Active</span>
              <span className="text-xs text-zinc-400">QR check-in live</span>
            </div>

            {/* Main card */}
            <div className="rounded-[2.5rem] bg-premium-charcoal border border-white/[0.08] shadow-2xl overflow-hidden">

              {/* Window bar */}
              <div className="flex items-center gap-3 px-6 py-4 bg-premium-black border-b border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                  <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                  <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                </div>
                <span className="text-[11px] font-mono text-zinc-500 ml-2">app.dayoneproject.xyz/events/your-event</span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-premium-success font-medium">
                  <span className="w-2 h-2 rounded-full bg-premium-success animate-pulse" />
                  Live
                </span>
              </div>

              {/* Module cards */}
              <div className="p-5 grid grid-cols-2 gap-3">
                {[
                  { icon: QrCode, label: 'QR Check-in', sub: 'Sub-second gate', color: 'premium-neon' },
                  { icon: Camera, label: 'Photo Wall', sub: 'WebP live stream', color: 'premium-gold' },
                  { icon: Gift, label: 'Door Prize', sub: '3D raffle machine', color: 'premium-gold' },
                  { icon: Trophy, label: 'Live Trivia', sub: 'Kahoot-style blitz', color: 'premium-neon' },
                ].map(({ icon: Icon, label, sub, color }) => (
                  <div key={label} className="p-4 rounded-2xl bg-premium-surfaceDark border border-white/[0.05] flex items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-xl bg-${color}/15 text-${color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider leading-none mb-1">{sub}</div>
                      <div className="text-[14px] font-display font-bold text-white">{label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom stats bar */}
              <div className="px-5 pb-5 grid grid-cols-3 gap-3">
                {[
                  { value: '2,500+', label: 'Max guests' },
                  { value: '<0.6s', label: 'Check-in speed' },
                  { value: '7', label: 'Stage modules' },
                ].map(({ value, label }) => (
                  <div key={label} className="p-3.5 rounded-xl bg-premium-black/50 border border-white/[0.04] text-center">
                    <div className="text-[18px] font-display font-bold text-premium-gold leading-none">{value}</div>
                    <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Second floating badge — bottom right */}
            <div className="absolute -bottom-4 -right-2 z-20 hidden lg:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-premium-charcoal border border-premium-borderDark shadow-2xl">
              <span className="text-xl">🎰</span>
              <div>
                <div className="text-[11px] font-bold text-white">Door Prize Draw</div>
                <div className="text-[10px] text-zinc-400">Only checked-in guests win</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
