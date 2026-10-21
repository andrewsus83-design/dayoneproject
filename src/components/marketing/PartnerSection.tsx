'use client';

import { Users, Award, Wallet, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';

export function PartnerSection() {
  const tiers = [
    { range: '100 - 499 guests', percent: '10%', note: 'Starter & Plus celebrations' },
    { range: '500 - 999 guests', percent: '12%', note: 'Mid-sized corporate galas & weddings' },
    { range: '1,000 - 1,999 guests', percent: '15%', note: 'Large annual summits' },
    { range: '2,000+ guests', percent: '18%', note: 'Mega festivals & enterprise expos' },
  ];

  return (
    <section id="partners" className="py-24 relative overflow-hidden bg-[#0b0d13]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl p-8 sm:p-14 bg-gradient-to-br from-[#151726] via-[#10121d] to-[#0c0e17] border border-[#2b273d] overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#ff007f]/10 blur-[120px] pointer-events-none rounded-full" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#dfb76c]/10 blur-[120px] pointer-events-none rounded-full" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#271d2b] border border-[#442c4c] text-xs font-semibold text-[#ff007f] mb-4">
                <Award className="w-3.5 h-3.5" />
                <span>Event & Wedding Organizer Affiliate Program</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Empower your clients. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff007f] via-[#dfb76c] to-[#00f0ff]">
                  Earn up to 18% cashback.
                </span>
              </h2>

              <p className="mt-4 text-base sm:text-lg text-gray-300 leading-relaxed max-w-2xl">
                Are you an Event Organizer (EO) or Wedding Organizer (WO)? Partner with all41 to deliver cutting-edge interactive attendee experiences while unlocking automated recurring cashback on every client event you manage.
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#141624] border border-[#212439]">
                  <Wallet className="w-6 h-6 text-[#00ff88] mb-2" />
                  <div className="text-sm font-bold text-white">Direct Bank Payout</div>
                  <div className="text-xs text-gray-400 mt-1">Manual disbursement by admin post-event completion (min Rp 100k).</div>
                </div>

                <div className="p-4 rounded-xl bg-[#141624] border border-[#212439]">
                  <Users className="w-6 h-6 text-[#00f0ff] mb-2" />
                  <div className="text-sm font-bold text-white">Multi-Client Portal</div>
                  <div className="text-xs text-gray-400 mt-1">Manage multiple simultaneous weddings and conferences from one login.</div>
                </div>

                <div className="p-4 rounded-xl bg-[#141624] border border-[#212439]">
                  <Sparkles className="w-6 h-6 text-[#dfb76c] mb-2" />
                  <div className="text-sm font-bold text-white">White Label Handoff</div>
                  <div className="text-xs text-gray-400 mt-1">Present customized branding and your own domain directly to clients.</div>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/dashboard/referrals"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-[#0b0d13] bg-gradient-to-r from-[#ff007f] via-[#dfb76c] to-[#00f0ff] hover:brightness-110 transition-all shadow-[0_0_20px_rgba(255,0,127,0.3)]"
                >
                  <span>Apply as Verified Partner</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="mailto:info@all41.app?subject=EO%20WO%20Partner%20Inquiry"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm text-gray-300 bg-[#161828] border border-[#2c304c] hover:text-white hover:border-[#dfb76c] transition-colors"
                >
                  <span>Contact Partner Desk</span>
                </a>
              </div>
            </div>

            {/* Right Column: Cashback Tier Ladder */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-[#0f111c] border border-[#26293f] p-6 shadow-xl">
                <div className="text-xs font-mono uppercase tracking-wider text-[#dfb76c] font-bold mb-4 flex items-center justify-between">
                  <span>Cashback Commission Ladder</span>
                  <span>Min 100 pax</span>
                </div>

                <div className="space-y-3">
                  {tiers.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-[#151829] border border-[#222742] flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-bold text-white">{t.range}</div>
                        <div className="text-xs text-gray-400">{t.note}</div>
                      </div>
                      <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#dfb76c] to-[#ff007f]">
                        {t.percent}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 rounded-lg bg-[#141624] border border-[#222439] text-xs text-gray-400">
                  <strong className="text-white">Note:</strong> Commission is calculated on the package base fee plus extra guest purchases, disallowing add-ons. Paid out automatically within 7 business days following verified event wrap-up.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
