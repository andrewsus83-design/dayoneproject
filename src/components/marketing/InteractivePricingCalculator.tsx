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
    <section id="pricing" className="py-28 bg-premium-black relative font-sans">
      <div className="max-w-[1600px] mx-auto px-6 md:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="px-4 py-1.5 text-xs font-bold bg-premium-gold/20 text-premium-gold border border-premium-gold/30 rounded-full mb-6 inline-block tracking-widest uppercase">
            Transparent Flat Pricing
          </span>
          <h2 className="text-4xl sm:text-6xl font-display font-medium text-white tracking-tight leading-tight">
            Predictable costs. <br />
            <span className="text-premium-gold">
              Zero surprise gate fees.
            </span>
          </h2>
          <p className="mt-6 text-lg text-zinc-400 font-light leading-relaxed">
            Choose the perfect flat tier for your attendee count. Easily buffer extra guests in flexible increments of 10.
          </p>
        </div>

        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {(Object.keys(PRICING_PLANS) as PackageTier[])
            .filter((t) => t !== 'enterprise')
            .map((tierKey) => {
              const item = PRICING_PLANS[tierKey];
              const isSelected = selectedTier === tierKey;

              return (
                <div
                  key={tierKey}
                  onClick={() => setSelectedTier(tierKey)}
                  className={`relative p-8 rounded-[2rem] cursor-pointer transition-all duration-300 border flex flex-col justify-between scale-on-click ${
                    isSelected
                      ? 'bg-premium-charcoal border-premium-gold shadow-gold -translate-y-1'
                      : 'bg-premium-charcoal/60 border-premium-borderDark hover:border-zinc-700 hover:bg-premium-charcoal'
                  }`}
                >
                  {item.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-premium-gold text-black text-xs font-bold uppercase tracking-wider shadow-gold">
                      Most Popular
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-base font-display font-medium text-white">{item.name}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-premium-surfaceDark text-zinc-400 font-mono border border-premium-borderDark">
                        {item.badge}
                      </span>
                    </div>

                    <div className="my-4">
                      <span className="text-3xl font-display font-bold text-white">
                        {item.basePrice === 0 ? 'Free' : formatIDR(item.basePrice)}
                      </span>
                      <span className="text-xs text-zinc-400 block mt-1">
                        Includes up to <strong>{item.maxGuests}</strong> guests
                      </span>
                    </div>

                    <div className="text-xs text-zinc-400 mb-6 pb-6 border-b border-premium-borderDark">
                      {item.canAddExtraGuests ? (
                        <span className="text-premium-neon font-mono font-medium">
                          + {formatIDR(item.extraGuestPricePerUnit * 10)} per 10 extra guests
                        </span>
                      ) : (
                        <span className="text-zinc-500">Fixed guest limit</span>
                      )}
                    </div>

                    <ul className="space-y-3 mb-6">
                      {item.features.slice(0, 3).map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                          <Check className="w-4 h-4 text-premium-success flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    className={`w-full py-3.5 rounded-xl text-xs font-bold transition-all scale-on-click ${
                      isSelected
                        ? 'bg-premium-gold text-black shadow-gold'
                        : 'bg-premium-surfaceDark border border-premium-borderDark text-zinc-300 hover:text-white'
                    }`}
                  >
                    {isSelected ? 'Selected Plan' : 'Select Plan'}
                  </button>
                </div>
              );
            })}
        </div>

        {/* Live Interactive Quote & Add-on Calculator Box */}
        <div className="rounded-[2.5rem] border border-premium-borderDark bg-premium-charcoal p-8 sm:p-12 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left Column: Interactive Controls */}
            <div className="lg:col-span-7 space-y-8">
              <div>
                <h3 className="text-2xl font-display font-medium text-white flex items-center gap-3">
                  <span>Customize Event Parameters</span>
                  <span className="text-xs font-bold text-premium-gold px-3 py-1 rounded-full bg-premium-gold/15 border border-premium-gold/30">
                    {plan.name} selected
                  </span>
                </h3>
                <p className="text-sm text-zinc-400 mt-2 font-light">
                  Adjust guest overflow buffers and optional add-ons to preview exact investments and EO/WO partner rebates.
                </p>
              </div>

              {/* Extra Guests Control */}
              <div className="p-6 rounded-[2rem] bg-premium-surfaceDark border border-premium-borderDark">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="text-base font-display font-medium text-white block">
                      Extra Guests Top-up
                    </label>
                    <span className="text-xs text-zinc-500">
                      Multiples of 10 guests only.
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-display font-bold text-premium-neon">
                      +{currentExtraGuests} guests
                    </span>
                    <span className="text-xs text-zinc-400 block font-mono mt-0.5">
                      {plan.canAddExtraGuests
                        ? formatIDR(currentExtraGuests * plan.extraGuestPricePerUnit)
                        : 'Fixed for this tier'}
                    </span>
                  </div>
                </div>

                {plan.canAddExtraGuests ? (
                  <div className="space-y-4">
                    <input
                      type="range"
                      min={0}
                      max={500}
                      step={10}
                      value={currentExtraGuests}
                      onChange={(e) => handleExtraGuestsChange(Number(e.target.value))}
                      className="w-full accent-[#C5A059] cursor-pointer h-2 bg-zinc-800 rounded-lg"
                    />
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                      <span>0 extra</span>
                      <div className="flex gap-2">
                        {[20, 50, 100, 200].map((step) => (
                          <button
                            key={step}
                            type="button"
                            onClick={() => handleExtraGuestsChange(step)}
                            className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-colors scale-on-click ${
                              currentExtraGuests === step
                                ? 'bg-premium-gold text-black shadow-gold'
                                : 'bg-premium-charcoal text-zinc-400 border border-premium-borderDark hover:text-white'
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
                  <div className="text-xs text-zinc-400 bg-premium-charcoal p-4 rounded-xl border border-premium-borderDark flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-premium-gold flex-shrink-0" />
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
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">Optional Add-ons</label>

                {/* White Label Addon */}
                <div
                  onClick={() => setIncludeWhiteLabel(!includeWhiteLabel)}
                  className={`p-6 rounded-[2rem] border cursor-pointer transition-colors flex items-center justify-between scale-on-click ${
                    includeWhiteLabel
                      ? 'bg-premium-surfaceDark border-premium-gold shadow-gold'
                      : 'bg-premium-surfaceDark/50 border-premium-borderDark hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-6 h-6 rounded-xl flex items-center justify-center border transition-colors ${
                        includeWhiteLabel
                          ? 'bg-premium-gold border-premium-gold text-black'
                          : 'border-zinc-700 bg-premium-charcoal'
                      }`}
                    >
                      {includeWhiteLabel && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="font-display font-medium text-white text-base">White Label & Custom Domain</div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Remove all41 branding, use your own domain (e.g. event.yourbrand.com)
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-premium-gold font-mono">
                    +{formatIDR(ADDONS.whiteLabel.price)}
                  </div>
                </div>

                {/* WhatsApp Add-on Options */}
                <div className="p-6 rounded-[2rem] bg-premium-surfaceDark border border-premium-borderDark space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-display font-medium text-white text-base">WhatsApp Dispatch Integration</div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Direct attendee mobile delivery with background safety pacing
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setWhatsappProvider('none')}
                      className={`px-4 py-3 rounded-xl text-xs font-bold border text-left transition-colors scale-on-click ${
                        whatsappProvider === 'none'
                          ? 'bg-premium-gold text-black border-premium-gold shadow-gold'
                          : 'bg-premium-charcoal border-premium-borderDark text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div>Email Only</div>
                      <div className="text-[10px] opacity-80 mt-0.5">Included free</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWhatsappProvider('fonnte')}
                      className={`px-4 py-3 rounded-xl text-xs font-bold border text-left transition-colors scale-on-click ${
                        whatsappProvider === 'fonnte'
                          ? 'bg-premium-neon text-black border-premium-neon shadow-neon'
                          : 'bg-premium-charcoal border-premium-borderDark text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div>Fonnte (BYON)</div>
                      <div className="text-[10px] opacity-80 mt-0.5">
                        +{formatIDR(plan.whatsappFonntePrice)}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWhatsappProvider('official')}
                      className={`px-4 py-3 rounded-xl text-xs font-bold border text-left transition-colors scale-on-click ${
                        whatsappProvider === 'official'
                          ? 'bg-premium-gold text-black border-premium-gold shadow-gold'
                          : 'bg-premium-charcoal border-premium-borderDark text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div>Official Meta API</div>
                      <div className="text-[10px] opacity-80 mt-0.5">
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
              <div className="p-8 rounded-[2rem] bg-premium-surfaceDark border border-premium-gold/30 shadow-gold">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">
                  Total Estimated Investment
                </span>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-display font-bold text-premium-gold">
                    {formatIDR(quote.totalCost)}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">/ event flat</span>
                </div>

                <div className="space-y-3 text-sm text-zinc-300 border-t border-premium-borderDark pt-6 mb-8 font-light">
                  <div className="flex justify-between">
                    <span>{plan.name} Tier ({plan.maxGuests} guests)</span>
                    <span className="font-bold text-white font-mono">{formatIDR(quote.basePrice)}</span>
                  </div>

                  {quote.extraGuestsCount > 0 && (
                    <div className="flex justify-between text-premium-neon">
                      <span>Extra Guests (+{quote.extraGuestsCount} pax)</span>
                      <span className="font-bold font-mono">{formatIDR(quote.extraGuestsCost)}</span>
                    </div>
                  )}

                  {quote.whiteLabelCost > 0 && (
                    <div className="flex justify-between text-zinc-300">
                      <span>White Label / Custom Domain</span>
                      <span className="font-bold text-white font-mono">{formatIDR(quote.whiteLabelCost)}</span>
                    </div>
                  )}

                  {quote.whatsappCost > 0 && (
                    <div className="flex justify-between text-zinc-300">
                      <span>WhatsApp {whatsappProvider === 'fonnte' ? 'Fonnte' : 'Official'}</span>
                      <span className="font-bold text-white font-mono">{formatIDR(quote.whatsappCost)}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-3 border-t border-premium-borderDark font-medium text-white">
                    <span>Total Verified Capacity:</span>
                    <span className="text-premium-success font-bold font-display">{quote.totalGuestsCapacity} Guests</span>
                  </div>
                </div>

                <Link
                  href={`/dashboard/events/new?tier=${selectedTier}&extra=${quote.extraGuestsCount}&wl=${includeWhiteLabel}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-bold text-base text-black bg-premium-gold hover:bg-premium-goldHover transition-all shadow-gold scale-on-click"
                >
                  <span>Lock in Quote & Create Event</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>

              {/* EO/WO Referral Cashback Estimator Card */}
              <div className="p-8 rounded-[2rem] bg-premium-surfaceDark border border-premium-borderDark relative overflow-hidden">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-premium-gold/15 text-premium-gold flex items-center justify-center shadow-gold">
                    <Percent className="w-5 h-5" />
                  </div>
                  <h4 className="text-xl font-display font-medium text-white">
                    EO & WO Partner Cashback
                  </h4>
                </div>

                <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-light">
                  Registered event & wedding organizers receive up to <strong>18% cashback</strong> directly to their payout balance.
                </p>

                <div className="p-5 rounded-2xl bg-premium-charcoal border border-premium-borderDark space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Total Guests:</span>
                    <span className="font-bold text-white font-mono">{quote.totalGuestsCapacity} pax</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Applicable Tier:</span>
                    <span className="font-bold text-premium-gold font-mono">
                      {quote.cashbackRate > 0 ? `${(quote.cashbackRate * 100).toFixed(0)}% Cashback Tier` : 'Below 100 pax (0%)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pt-3 border-t border-premium-borderDark">
                    <span className="text-zinc-300 font-medium">Estimated Rebate:</span>
                    <span className="font-display font-bold text-premium-success text-base">
                      {formatIDR(quote.estimatedCashback)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
