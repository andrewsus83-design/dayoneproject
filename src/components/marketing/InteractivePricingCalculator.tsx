'use client';

import React, { useState } from 'react';
import { PRICING_PLANS, ADDONS, calculateEventQuote, getReferralCashbackRate } from '@/lib/pricing';
import { PackageTier } from '@/lib/types';
import { formatIDR } from '@/lib/utils';
import { Check, Sparkles, AlertCircle, HelpCircle, ArrowRight, Percent, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export function InteractivePricingCalculator() {
  const [selectedTier, setSelectedTier] = useState<PackageTier>('plus');
  const [extraGuests, setExtraGuests] = useState<number>(0);
  const [includeWhiteLabel, setIncludeWhiteLabel] = useState<boolean>(false);
  const [whatsappProvider, setWhatsappProvider] = useState<'none' | 'fonnte' | 'official'>('none');

  const plan = PRICING_PLANS[selectedTier];

  // Adjust extra guests if tier changed to non-eligible (free or scale)
  const currentExtraGuests = plan.canAddExtraGuests ? extraGuests : 0;

  const quote = calculateEventQuote({
    tier: selectedTier,
    extraGuests: currentExtraGuests,
    includeWhiteLabel,
    whatsappProvider,
  });

  const handleExtraGuestsChange = (val: number) => {
    // Round to nearest 10
    const rounded = Math.max(0, Math.round(val / 10) * 10);
    setExtraGuests(rounded);
  };

  return (
    <section id="pricing" className="py-24 bg-[#0e121e] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1e273c] border border-[#2d3a54] text-xs font-semibold text-[#dfb76c] mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transparent Flat Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Predictable costs. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#dfb76c] via-[#00f0ff] to-[#ff007f]">
              Zero surprise gate fees.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-400">
            Choose the perfect flat tier for your guest count. Easily top up extra guests in flexible increments of 10.
          </p>
        </div>

        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-16">
          {(Object.keys(PRICING_PLANS) as PackageTier[])
            .filter((t) => t !== 'enterprise')
            .map((tierKey) => {
              const item = PRICING_PLANS[tierKey];
              const isSelected = selectedTier === tierKey;

              return (
                <div
                  key={tierKey}
                  onClick={() => setSelectedTier(tierKey)}
                  className={`relative p-5 rounded-2xl cursor-pointer transition-all duration-300 border flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#151c2d] border-[#dfb76c] shadow-[0_0_25px_rgba(223,183,108,0.2)] -translate-y-1'
                      : 'bg-[#101420] border-[#1d2638] hover:border-[#2d3a54] hover:bg-[#131826]'
                  }`}
                >
                  {item.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#dfb76c] to-[#00f0ff] text-[#0b0d13] text-[11px] font-extrabold uppercase tracking-wider shadow">
                      Most Popular
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-300">{item.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#1c2438] text-gray-400 font-mono">
                        {item.badge}
                      </span>
                    </div>

                    <div className="my-3">
                      <span className="text-2xl font-black text-white">
                        {item.basePrice === 0 ? 'Free' : formatIDR(item.basePrice)}
                      </span>
                      <span className="text-xs text-gray-400 block mt-0.5">
                        Includes up to <strong>{item.maxGuests}</strong> guests
                      </span>
                    </div>

                    <div className="text-xs text-gray-400 mb-4 pb-4 border-b border-[#1b2336]">
                      {item.canAddExtraGuests ? (
                        <span className="text-[#00f0ff]">
                          + {formatIDR(item.extraGuestPricePerUnit * 10)} per 10 extra guests
                        </span>
                      ) : (
                        <span className="text-gray-500">Fixed guest limit</span>
                      )}
                    </div>

                    <ul className="space-y-2 mb-4">
                      {item.features.slice(0, 3).map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                          <Check className="w-3.5 h-3.5 text-[#00ff88] flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#dfb76c] text-[#0b0d13]'
                        : 'bg-[#182030] text-gray-300 hover:text-white'
                    }`}
                  >
                    {isSelected ? 'Selected Plan' : 'Select'}
                  </button>
                </div>
              );
            })}
        </div>

        {/* Live Interactive Quote & Add-on Calculator Box */}
        <div className="rounded-3xl border border-[#242f47] bg-[#121626] p-6 sm:p-10 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Interactive Controls */}
            <div className="lg:col-span-7 space-y-8">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>Customize Your Event Parameters</span>
                  <span className="text-xs font-normal text-gray-400">({plan.name} selected)</span>
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Adjust guest overflow buffers and optional add-ons to preview exact costs and EO/WO cashback.
                </p>
              </div>

              {/* Extra Guests Control */}
              <div className="p-5 rounded-2xl bg-[#161c2e] border border-[#222b40]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="text-sm font-semibold text-white block">
                      Extra Guests Top-up
                    </label>
                    <span className="text-xs text-gray-400">
                      Multiples of 10 guests only.
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-[#00f0ff]">
                      +{currentExtraGuests} guests
                    </span>
                    <span className="text-xs text-gray-400 block">
                      {plan.canAddExtraGuests
                        ? formatIDR(currentExtraGuests * plan.extraGuestPricePerUnit)
                        : 'Not available for this tier'}
                    </span>
                  </div>
                </div>

                {plan.canAddExtraGuests ? (
                  <div className="space-y-3">
                    <input
                      type="range"
                      min={0}
                      max={500}
                      step={10}
                      value={currentExtraGuests}
                      onChange={(e) => handleExtraGuestsChange(Number(e.target.value))}
                      className="w-full accent-[#00f0ff] cursor-pointer h-2 bg-[#20293d] rounded-lg"
                    />
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>0 extra</span>
                      <div className="flex gap-2">
                        {[20, 50, 100, 200].map((step) => (
                          <button
                            key={step}
                            type="button"
                            onClick={() => handleExtraGuestsChange(step)}
                            className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                              currentExtraGuests === step
                                ? 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/50'
                                : 'bg-[#1b2234] text-gray-400 border-[#28344d] hover:text-white'
                            }`}
                          >
                            +{step}
                          </button>
                        ))}
                      </div>
                      <span>500 extra</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 bg-[#121622] p-3 rounded-lg border border-[#1e273a] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>
                      {selectedTier === 'free'
                        ? 'Free tier is limited to 5 guests. Upgrade to Starter or Plus to invite more.'
                        : 'Scale tier is capped at 2,500 guests. Need more? Talk to our Enterprise team.'}
                    </span>
                  </div>
                )}
              </div>

              {/* Add-ons Toggles */}
              <div className="space-y-4">
                <label className="text-sm font-semibold text-white block">Optional Add-ons</label>

                {/* White Label Addon */}
                <div
                  onClick={() => setIncludeWhiteLabel(!includeWhiteLabel)}
                  className={`p-4 rounded-xl border cursor-pointer transition-colors flex items-center justify-between ${
                    includeWhiteLabel
                      ? 'bg-[#162033] border-[#00f0ff]/50'
                      : 'bg-[#161c2e] border-[#222b40] hover:border-[#2d3a54]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                        includeWhiteLabel
                          ? 'bg-[#00f0ff] border-[#00f0ff] text-[#0b0d13]'
                          : 'border-gray-500 bg-[#121622]'
                      }`}
                    >
                      {includeWhiteLabel && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">White Label & Custom Domain</div>
                      <div className="text-xs text-gray-400">
                        Remove all41 branding, use your own domain (e.g. event.yourbrand.com)
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-[#dfb76c]">
                    +{formatIDR(ADDONS.whiteLabel.price)}
                  </div>
                </div>

                {/* WhatsApp Add-on Options */}
                <div className="p-4 rounded-xl bg-[#161c2e] border border-[#222b40] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">WhatsApp Integration Add-on</div>
                      <div className="text-xs text-gray-400">
                        Direct guest delivery with rate limiting protection
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setWhatsappProvider('none')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors ${
                        whatsappProvider === 'none'
                          ? 'bg-[#21293e] border-gray-400 text-white'
                          : 'bg-[#121622] border-[#232c42] text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold">Email Only</div>
                      <div className="text-[10px] text-gray-400">Included free</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWhatsappProvider('fonnte')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors ${
                        whatsappProvider === 'fonnte'
                          ? 'bg-[#00f0ff]/10 border-[#00f0ff] text-[#00f0ff]'
                          : 'bg-[#121622] border-[#232c42] text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold">Fonnte (BYON)</div>
                      <div className="text-[10px] text-gray-300">
                        +{formatIDR(plan.whatsappFonntePrice)}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWhatsappProvider('official')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors opacity-75 ${
                        whatsappProvider === 'official'
                          ? 'bg-[#dfb76c]/10 border-[#dfb76c] text-[#dfb76c]'
                          : 'bg-[#121622] border-[#232c42] text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold">Official Meta API</div>
                      <div className="text-[10px] text-gray-300">
                        +{formatIDR(plan.whatsappOfficialPrice)}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Quote Card & Referral Cashback Estimation */}
            <div className="lg:col-span-5 space-y-6">
              {/* Total Quote Card */}
              <div className="p-6 rounded-2xl bg-[#171e30] border border-[#2a3652] shadow-xl">
                <span className="text-xs font-mono text-gray-400 uppercase tracking-wider block mb-1">
                  Estimated Event Investment
                </span>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-3xl sm:text-4xl font-black text-white">
                    {formatIDR(quote.totalCost)}
                  </span>
                  <span className="text-xs text-gray-400">/ event</span>
                </div>

                <div className="space-y-2.5 text-xs text-gray-300 border-t border-[#232d44] pt-4 mb-6">
                  <div className="flex justify-between">
                    <span>{plan.name} Base ({plan.maxGuests} guests)</span>
                    <span className="font-semibold text-white">{formatIDR(quote.basePrice)}</span>
                  </div>

                  {quote.extraGuestsCount > 0 && (
                    <div className="flex justify-between text-[#00f0ff]">
                      <span>Extra Guests (+{quote.extraGuestsCount})</span>
                      <span className="font-semibold">{formatIDR(quote.extraGuestsCost)}</span>
                    </div>
                  )}

                  {quote.whiteLabelCost > 0 && (
                    <div className="flex justify-between text-gray-300">
                      <span>White Label / Custom Domain</span>
                      <span className="font-semibold text-white">{formatIDR(quote.whiteLabelCost)}</span>
                    </div>
                  )}

                  {quote.whatsappCost > 0 && (
                    <div className="flex justify-between text-gray-300">
                      <span>WhatsApp {whatsappProvider === 'fonnte' ? 'Fonnte' : 'Official'}</span>
                      <span className="font-semibold text-white">{formatIDR(quote.whatsappCost)}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-2 border-t border-[#232d44] font-semibold text-white">
                    <span>Total Guest Capacity:</span>
                    <span className="text-[#00ff88]">{quote.totalGuestsCapacity} Guests</span>
                  </div>
                </div>

                <Link
                  href={`/dashboard/events/new?tier=${selectedTier}&extra=${quote.extraGuestsCount}&wl=${includeWhiteLabel}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm text-[#0b0d13] bg-gradient-to-r from-[#00f0ff] via-[#dfb76c] to-[#ff007f] hover:brightness-110 transition-all shadow-[0_0_20px_rgba(223,183,108,0.25)]"
                >
                  <span>Lock in Quote & Create Event</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* EO/WO Referral Cashback Estimator Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1a1c26] to-[#141824] border border-[#ff007f]/30 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-[#ff007f]/20 text-[#ff007f]">
                    <Percent className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    EO & WO Partner Cashback
                  </h4>
                </div>

                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                  Registered event & wedding organizers earn up to <strong>18% cashback</strong> on package + extra guest spend.
                </p>

                <div className="p-4 rounded-xl bg-[#0e121c] border border-[#26283b] space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Total Guests:</span>
                    <span className="font-bold text-white">{quote.totalGuestsCapacity} pax</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Applicable Tier:</span>
                    <span className="font-bold text-[#dfb76c]">
                      {quote.cashbackRate > 0 ? `${(quote.cashbackRate * 100).toFixed(0)}% Tier` : 'Below 100 pax (0%)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pt-2 border-t border-[#1c1f2e]">
                    <span className="text-gray-300 font-medium">Estimated Cashback:</span>
                    <span className="font-extrabold text-[#00ff88] text-sm">
                      {formatIDR(quote.estimatedCashback)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-gray-500 leading-tight">
                  * Cashback is calculated after event completion. Minimum withdrawal Rp 100.000. Add-ons excluded.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
