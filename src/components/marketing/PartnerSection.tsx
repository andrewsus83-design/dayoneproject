'use client';

import { Building2, Heart, Users } from 'lucide-react';

const SEGMENTS = [
  {
    icon: Building2,
    color: 'text-premium-neon',
    bg: 'bg-premium-neon/10 border-premium-neon/20',
    label: 'Corporate Events',
    description:
      'HR teams, marketing leads, and agency planners running annual summits, product launches, townhalls, and award galas.',
    tags: ['Keynote Speakers Grid', 'Tiered Sponsors', 'Live Trivia Blitz', '3D Raffle Machine'],
  },
  {
    icon: Heart,
    color: 'text-premium-danger',
    bg: 'bg-premium-danger/10 border-premium-danger/20',
    label: 'Luxury Weddings',
    description:
      'Couples and wedding organizers crafting intimate ceremonies, 5-star ballroom receptions, and destination galas.',
    tags: ['Love Story Timeline', 'Digital Angpao QRIS', 'Dress Code Swatches', 'Banquet Menu'],
  },
  {
    icon: Users,
    color: 'text-premium-gold',
    bg: 'bg-premium-gold/10 border-premium-gold/20',
    label: 'Event Organizers',
    description:
      'EO and WO agencies managing multiple parallel events per month with white-label domains and multi-event workspaces.',
    tags: ['Multi-Event Workspace', 'White-Label Domain', 'Custom BYOD', 'Full Brand Control'],
  },
];

export function PartnerSection() {
  return (
    <section className="py-28 md:py-36 bg-premium-black font-sans">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-16">

        {/* Header */}
        <div className="max-w-2xl mb-16 md:mb-20">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-premium-gold mb-5">
            Built for Every Event Type
          </p>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white leading-[1.08] tracking-tight">
            One platform.<br />
            Every event format.
          </h2>
          <p className="mt-6 text-[15px] md:text-base text-zinc-400 font-light leading-relaxed max-w-xl">
            Whether it&apos;s a 1,000-pax APAC summit or an intimate Bali wedding,
            dayoneproject.xyz adapts its entire experience — themes, forms, modules, and stage
            display — to match your event&apos;s identity from day one.
          </p>
        </div>

        {/* Segment cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {SEGMENTS.map(({ icon: Icon, color, bg, label, description, tags }) => (
            <div
              key={label}
              className="group p-8 md:p-10 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark hover:border-white/[0.1] transition-all duration-300 flex flex-col gap-7"
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>

              {/* Text */}
              <div className="flex-1 space-y-3">
                <h3 className="text-xl font-display font-bold text-white tracking-tight">{label}</h3>
                <p className="text-[13px] text-zinc-400 font-light leading-relaxed">{description}</p>
              </div>

              {/* Feature tags */}
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-3 py-1.5 rounded-full bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
