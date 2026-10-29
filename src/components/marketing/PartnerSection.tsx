'use client';

import { Wallet, Users, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const TIERS = [
  { range: '100 – 499 guests', percent: '10%', note: 'Starter events' },
  { range: '500 – 999 guests', percent: '12%', note: 'Mid-size galas' },
  { range: '1,000 – 1,999 guests', percent: '15%', note: 'Large summits' },
  { range: '2,000+ guests', percent: '18%', note: 'Mega festivals' },
];

export function PartnerSection() {
  return (
    <section id="partners" className="py-24 md:py-36 bg-premium-black font-sans">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16">

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">

          {/* ── Left ── */}
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 text-[11px] font-bold bg-premium-gold/15 text-premium-gold border border-premium-gold/25 rounded-full tracking-[0.16em] uppercase">
              EO & WO Affiliate Program
            </span>

            <h2 className="text-4xl sm:text-5xl lg:text-[56px] font-display font-medium text-white tracking-[-0.02em] leading-[1.08]">
              Empower your clients.
              <br />
              <span className="text-premium-gold">Earn up to 18%.</span>
            </h2>

            <p className="text-[17px] text-zinc-400 font-light leading-[1.75] max-w-lg">
              Are you an Event Organizer or Wedding Planner? Partner with all41
              to deliver interactive attendee experiences — and earn automatic
              cashback on every event you manage.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {[
                { icon: Wallet, label: 'Direct bank payout', sub: 'Post-event settlement · min Rp 100k' },
                { icon: Users, label: 'Multi-client portal', sub: 'One console, many simultaneous events' },
                { icon: Sparkles, label: 'White label ready', sub: 'Custom subdomains for each client' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="p-5 rounded-2xl bg-premium-charcoal border border-white/[0.06] space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-premium-gold/10 text-premium-gold flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="text-[14px] font-medium text-white">{label}</div>
                    <div className="text-[12px] text-zinc-500 mt-0.5 font-light leading-snug">{sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/dashboard/referrals"
                className="inline-flex items-center gap-2 bg-premium-gold hover:bg-premium-goldHover text-black px-7 py-3.5 rounded-2xl text-[14px] font-bold transition-all shadow-gold scale-on-click"
              >
                <span>Join Partner Program</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* ── Right: cashback ladder ── */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-5">
              Cashback ladder
            </div>
            {TIERS.map(({ range, percent, note }, i) => (
              <div
                key={range}
                className={`flex items-center justify-between p-5 rounded-2xl border transition-colors ${
                  i === TIERS.length - 1
                    ? 'bg-premium-gold/10 border-premium-gold/30'
                    : 'bg-premium-charcoal border-white/[0.06] hover:border-white/10'
                }`}
              >
                <div>
                  <div className="text-[14px] font-medium text-white">{range}</div>
                  <div className="text-[12px] text-zinc-500 mt-0.5">{note}</div>
                </div>
                <div className={`text-2xl font-display font-bold ${i === TIERS.length - 1 ? 'text-premium-gold' : 'text-zinc-300'}`}>
                  {percent}
                </div>
              </div>
            ))}

            <div className="p-5 rounded-2xl bg-premium-charcoal border border-white/[0.06] mt-2">
              <div className="text-[12px] text-zinc-500 leading-relaxed font-light">
                Cashback computed automatically on final guest count once an event reaches{' '}
                <span className="text-zinc-300">completed</span> status. Minimum withdrawal{' '}
                <span className="text-zinc-300">Rp 100,000</span> via direct bank transfer.
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
