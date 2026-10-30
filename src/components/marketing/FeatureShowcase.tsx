'use client';

import {
  Globe,
  MailCheck,
  QrCode,
  Camera,
  Gamepad2,
  Gift,
  MonitorPlay,
  CheckCircle,
  ArrowRight,
  Wifi,
  Shield,
  Zap,
} from 'lucide-react';

/* ── Horizontal scroll modules ─────────────────────────────── */
const ALL_MODULES = [
  { icon: Globe, label: 'Landing Builder', color: 'text-premium-gold', dim: 'bg-premium-gold/10' },
  { icon: MailCheck, label: 'Digital RSVP', color: 'text-premium-neon', dim: 'bg-premium-neon/10' },
  { icon: QrCode, label: 'QR Gate Scan', color: 'text-premium-success', dim: 'bg-premium-success/10' },
  { icon: Camera, label: 'Photo Wall', color: 'text-premium-gold', dim: 'bg-premium-gold/10' },
  { icon: Gamepad2, label: 'Live Trivia', color: 'text-premium-neon', dim: 'bg-premium-neon/10' },
  { icon: Gift, label: '3D Raffle', color: 'text-premium-gold', dim: 'bg-premium-gold/10' },
  { icon: MonitorPlay, label: 'Stage LED', color: 'text-premium-neon', dim: 'bg-premium-neon/10' },
];

/* ── Main split sections ────────────────────────────────────── */
const SECTIONS = [
  {
    number: '01',
    eyebrow: 'Pre-Event',
    title: 'A stunning event presence, live in 60 seconds.',
    description:
      'Choose Corporate or Wedding. Pick a theme. Type your event name — your branded subdomain, RSVP landing page, and countdown timer are live instantly. No designers, no Webflow, no Canva.',
    bullets: [
      'Luma-style visual canvas with split preview',
      'Own link (app.dayoneproject.xyz/events/<slug>) or BYOD',
      'Typeform-style RSVP with dietary + plus-one',
      'Digital angpao QRIS for weddings',
    ],
    visual: <PreEventVisual />,
    flip: false,
  },
  {
    number: '02',
    eyebrow: 'Day-Of Operations',
    title: 'Sub-second check-ins. Zero ghost winners.',
    description:
      'Crew opens the scanner on any iPad. Guest shows their QR pass. Green flash, name callout, table assignment — in under 0.6 seconds. Works offline when ballroom Wi-Fi drops.',
    bullets: [
      'IndexedDB offline fallback for basement ballrooms',
      'Duplicate scan prevention with timestamp alert',
      'VVIP tier visual callout for ushers',
      'USB/Bluetooth HID wedge scanner support',
    ],
    visual: <GateScannerVisual />,
    flip: true,
  },
  {
    number: '03',
    eyebrow: 'Live Engagement',
    title: 'The whole ballroom becomes the game.',
    description:
      'Once checked in, guests unlock the Photo Wall, Trivia Buzzer, and Door Prize Raffle — all from their phone, no app download. Every winner is physically in the room.',
    bullets: [
      'Pinterest masonry photo wall on the ballroom LED',
      'Kahoot-style 4-quadrant trivia with speed scoring',
      '3D slot machine, spin wheel, or arcade claw raffle',
      'Cryptographically fair CSPRNG winner selection',
    ],
    visual: <EngagementVisual />,
    flip: false,
  },
];

/* ── Visual mock components ─────────────────────────────────── */

function PreEventVisual() {
  return (
    <div className="rounded-[2rem] bg-premium-charcoal border border-white/[0.07] overflow-hidden shadow-2xl">
      {/* Browser bar */}
      <div className="flex items-center gap-3 px-5 py-3.5 bg-premium-black border-b border-white/[0.06]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        </div>
        <span className="text-[11px] font-mono text-zinc-500 ml-1">app.dayoneproject.xyz/events/your-event</span>
      </div>

      {/* Event card mock */}
      <div className="p-5 space-y-4">
        {/* Cover */}
        <div className="h-28 rounded-xl bg-gradient-to-br from-premium-gold/20 to-premium-black flex items-center justify-center">
          <div className="text-center">
            <div className="text-[10px] font-mono text-premium-gold uppercase tracking-widest mb-1">APAC Executive Summit</div>
            <div className="text-xl font-display font-bold text-white">TechUnite 2026</div>
            <div className="text-[11px] text-zinc-400 mt-1">Jakarta · Nov 15, 2026</div>
          </div>
        </div>

        {/* Two mini pills */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-premium-surfaceDark border border-white/[0.05] text-center">
            <div className="text-base font-display font-bold text-premium-gold">18:00</div>
            <div className="text-[10px] text-zinc-500 font-mono">DOORS OPEN</div>
          </div>
          <div className="p-3 rounded-xl bg-premium-surfaceDark border border-white/[0.05] text-center">
            <div className="text-base font-display font-bold text-white">600</div>
            <div className="text-[10px] text-zinc-500 font-mono">CAPACITY</div>
          </div>
        </div>

        {/* RSVP button mock */}
        <div className="w-full py-3 rounded-xl bg-premium-gold text-black text-sm font-bold text-center shadow-gold">
          ✦ Reserve VIP Pass
        </div>
      </div>
    </div>
  );
}

function GateScannerVisual() {
  return (
    <div className="rounded-[2rem] bg-premium-charcoal border border-white/[0.07] overflow-hidden shadow-2xl">
      <div className="flex items-center gap-3 px-5 py-3.5 bg-premium-black border-b border-white/[0.06]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        </div>
        <span className="text-[11px] font-mono text-zinc-500 ml-1">Gate Scanner · Desk 01</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-premium-success font-bold">
          <Wifi className="w-3 h-3" /> Online
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Scanner viewfinder */}
        <div className="relative h-32 rounded-xl bg-premium-black border border-premium-neon/20 overflow-hidden flex items-center justify-center">
          {/* Corner brackets */}
          <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-premium-gold rounded-tl" />
          <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-premium-gold rounded-tr" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-premium-gold rounded-bl" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-premium-gold rounded-br" />
          {/* Scan line */}
          <div className="absolute inset-x-6 h-px bg-gradient-to-r from-transparent via-premium-neon to-transparent opacity-80 top-1/2" />
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">Align QR code here</span>
        </div>

        {/* Verified result card */}
        <div className="p-4 rounded-xl bg-premium-success/10 border border-premium-success/30">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-premium-success flex-shrink-0" />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-premium-success">✓ VERIFIED · FIRST SCAN</div>
              <div className="text-base font-display font-bold text-white mt-0.5">Budi Santoso</div>
              <div className="text-[11px] text-zinc-400 font-mono">TABLE DIAMOND 01 · VVIP</div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[['418', 'Checked In'], ['232', 'Remaining'], ['<0.6s', 'Avg Speed']].map(([v, l]) => (
            <div key={l} className="p-2.5 rounded-xl bg-premium-surfaceDark border border-white/[0.04] text-center">
              <div className="text-sm font-display font-bold text-premium-gold">{v}</div>
              <div className="text-[9px] text-zinc-500 font-mono uppercase">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EngagementVisual() {
  return (
    <div className="space-y-3">
      {/* Photo wall card */}
      <div className="rounded-[2rem] bg-premium-charcoal border border-white/[0.07] p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Photo Wall · Live</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-premium-neon font-bold">
            <span className="w-2 h-2 rounded-full bg-premium-neon animate-pulse" />
            STREAMING
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            'from-yellow-500/30 to-orange-500/20',
            'from-pink-500/30 to-purple-500/20',
            'from-blue-500/30 to-cyan-500/20',
            'from-green-500/30 to-teal-500/20',
            'from-purple-500/30 to-pink-500/20',
            'from-orange-500/30 to-red-500/20',
            'from-cyan-500/30 to-blue-500/20',
            'from-teal-500/30 to-green-500/20',
          ].map((g, i) => (
            <div key={i} className={`h-12 rounded-xl bg-gradient-to-br ${g} border border-white/[0.04]`} />
          ))}
        </div>
      </div>

      {/* Trivia + Raffle row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-premium-charcoal border border-white/[0.07] p-4 shadow-xl">
          <div className="text-[10px] font-mono text-premium-neon uppercase tracking-widest mb-2">Live Trivia</div>
          <div className="text-sm font-display font-medium text-white leading-tight mb-3">
            Which city hosted APAC&apos;s largest tech summit in 2025?
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { l: 'A', c: 'bg-red-500/80' },
              { l: 'B', c: 'bg-blue-500/80' },
              { l: 'C', c: 'bg-premium-gold/80' },
              { l: 'D', c: 'bg-green-500/80' },
            ].map(({ l, c }) => (
              <div key={l} className={`${c} rounded-xl h-10 flex items-center justify-center text-white font-bold text-sm`}>{l}</div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-premium-charcoal border border-white/[0.07] p-4 shadow-xl flex flex-col justify-between">
          <div className="text-[10px] font-mono text-premium-gold uppercase tracking-widest">Door Prize</div>
          <div className="flex items-center justify-center gap-1 my-2">
            {['7', '7', '7'].map((n, i) => (
              <div key={i} className="w-10 h-12 rounded-xl bg-premium-gold/20 border border-premium-gold/40 flex items-center justify-center text-premium-gold font-display font-bold text-xl">{n}</div>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-premium-gold" />
            <div className="text-[10px] text-zinc-400 font-mono">418 eligible · checked-in only</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export function FeatureShowcase() {
  return (
    <div id="features" className="bg-premium-black font-sans">

      {/* ── Platform stats strip ── */}
      <div className="border-y border-white/[0.06] py-10">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x md:divide-white/[0.06]">
            {[
              { value: '6 – 8', label: 'Tools replaced', sub: 'Luma · Canva · Kahoot · Kululu · more' },
              { value: '< 60s', label: 'Event creation time', sub: 'Typeform-style 6-step studio' },
              { value: '2,500+', label: 'Max guests per event', sub: 'Enterprise & stadium scale' },
              { value: '30 days', label: 'Media retention', sub: 'Cloudflare R2 auto-purge lifecycle' },
            ].map(({ value, label, sub }) => (
              <div key={label} className="md:px-10 first:pl-0 last:pr-0">
                <div className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">{value}</div>
                <div className="text-sm font-medium text-zinc-300 mt-1">{label}</div>
                <div className="text-[11px] text-zinc-500 mt-1 font-light">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Horizontal module scroll ── */}
      <div className="py-16 md:py-20 border-b border-white/[0.04]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16 mb-8">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            7 fully integrated modules
          </h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 px-6 md:px-12 lg:px-16 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {ALL_MODULES.map(({ icon: Icon, label, color, dim }) => (
            <div
              key={label}
              className="flex-shrink-0 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-premium-charcoal border border-white/[0.06] hover:border-white/20 transition-colors cursor-default"
            >
              <div className={`w-9 h-9 rounded-xl ${dim} ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <span className="text-sm font-medium text-zinc-300 whitespace-nowrap">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Alternating split sections ── */}
      {SECTIONS.map(({ number, eyebrow, title, description, bullets, visual, flip }) => (
        <div key={number} className="py-24 md:py-32 border-b border-white/[0.04] last:border-0">
          <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16">
            <div className={`grid lg:grid-cols-2 gap-16 lg:gap-24 items-center ${flip ? 'lg:[&>*:first-child]:order-2' : ''}`}>

              {/* Text side */}
              <div className="space-y-7">
                <div className="flex items-center gap-4">
                  <span className="text-[80px] font-display font-bold leading-none text-white/[0.04] select-none">
                    {number}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-premium-gold">
                    {eyebrow}
                  </span>
                </div>

                <h2 className="text-4xl sm:text-5xl lg:text-[52px] font-display font-medium text-white leading-[1.1] tracking-[-0.02em]">
                  {title}
                </h2>

                <p className="text-[17px] text-zinc-400 font-light leading-[1.75] max-w-lg">
                  {description}
                </p>

                <ul className="space-y-3.5">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-[14px] text-zinc-300">
                      <CheckCircle className="w-4.5 h-4.5 text-premium-gold mt-0.5 flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual side */}
              <div className={flip ? 'order-first lg:order-none' : ''}>
                {visual}
              </div>

            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
