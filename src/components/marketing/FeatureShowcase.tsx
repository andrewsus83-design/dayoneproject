'use client';

import {
  Globe,
  MailCheck,
  Send,
  QrCode,
  Gamepad2,
  Gift,
  Camera,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

const MODULES = [
  {
    icon: Globe,
    title: 'Visual Landing Page Builder',
    description:
      'Launch stunning responsive event landing pages in minutes. Custom subdomain (<slug>.all41.app) or bring your own custom domain.',
    badge: 'Module 1',
    accentColor: '#00f0ff',
    features: ['Custom countdown & agenda', 'Google Maps integration', 'Dress code & FAQ blocks'],
  },
  {
    icon: MailCheck,
    title: 'Digital RSVP & Guest Portal',
    description:
      'Personalized RSVP links for every guest. Capture attendance, plus-ones, meal preferences, and personalized greetings effortlessly.',
    badge: 'Module 2',
    accentColor: '#dfb76c',
    features: ['Plus-one capacity control', 'Dietary & VIP tags', 'Instant confirmation SMS/Email'],
  },
  {
    icon: Send,
    title: 'Resend Branded Email Dispatcher',
    description:
      'Automated high-deliverability invitations, calendar .ics attachments, reminder countdowns, and embedded digital QR entry passes.',
    badge: 'Module 3',
    accentColor: '#ff007f',
    features: ['Embedded dynamic QR pass', 'Up to 3 free emails/guest', 'Real-time open & click audit'],
  },
  {
    icon: QrCode,
    title: 'Instant QR Gate Attendance',
    description:
      'Scan guest badges in sub-second speed using any smartphone or iPad camera. Built-in duplicate entry prevention and live check-in counters.',
    badge: 'Module 4',
    accentColor: '#00ff88',
    features: ['PWA camera scanner', 'Sub-second verification', 'Offline-resilient attendance log'],
  },
  {
    icon: Camera,
    title: 'Live Photo Wall & Cloudflare R2',
    description:
      'Guests scan a QR code to snap and broadcast selfies straight onto the ballroom LED wall. Client WebP compression ensures lightning-fast load times.',
    badge: 'Module 5',
    accentColor: '#00f0ff',
    features: ['Client WebP compression ≤2MB', 'Custom frames & neon filters', 'Host moderation approval queue'],
  },
  {
    icon: Gift,
    title: 'Door Prize & Raffle Machine',
    description:
      'Keep crowds on the edge of their seats with animated 3D Wheel of Spin, arcade Claw Machine, and Slot Machine draws exclusively for checked-in guests.',
    badge: 'Module 6',
    accentColor: '#dfb76c',
    features: ['Wheel, Claw & Slot modes', 'Strict checked-in filter', 'Exportable winner audit logs'],
  },
  {
    icon: Gamepad2,
    title: 'Live Kahoot-Style Games & Trivia',
    description:
      'Energize company all-hands or wedding receptions with realtime interactive trivia, scavenger hunts, couple quizzes, and live leaderboards.',
    badge: 'Module 7',
    accentColor: '#9d00ff',
    features: ['Host broadcast controls', 'Sub-second WebSockets sync', 'Instant winner podium'],
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp Automation (Fonnte BYON)',
    description:
      'Send instant WhatsApp QR tickets directly to guests. Bring Your Own Number (BYON) supported with automated background rate-pacing for safety.',
    badge: 'Module 8',
    accentColor: '#ff007f',
    features: ['Fonnte integration', 'Automated rate limit & pacing', 'High engagement ticket delivery'],
  },
];

export function FeatureShowcase() {
  return (
    <section id="features" className="py-24 relative bg-[#0b0d13]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#181f30] border border-[#26334d] text-xs font-semibold text-[#00f0ff] mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Complete Event Lifecycle</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Eight essential modules. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] via-[#dfb76c] to-[#ff007f]">
              One synchronized engine.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-400">
            From the first invitation sent weeks prior to the final door prize drawn on stage, all41 keeps your crew, hosts, and guests in perfect harmony.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {MODULES.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <div
                key={idx}
                className="group relative p-6 rounded-2xl bg-[#121624] border border-[#1e273c] hover:border-[#384766] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="p-3 rounded-xl bg-[#171d2e] border border-[#242f47] transition-transform group-hover:scale-110 duration-300"
                      style={{ color: mod.accentColor }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 px-2 py-0.5 rounded bg-[#161c2a] border border-[#222c42]">
                      {mod.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300">
                    {mod.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed mb-6">
                    {mod.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#1a2133] space-y-2">
                  {mod.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2 text-xs text-gray-300">
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: mod.accentColor }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
