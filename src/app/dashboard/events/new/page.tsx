'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/Header';
import { THEME_PRESETS } from '@/lib/theme/defaultThemes';
import { PRICING_PLANS, calculateEventQuote, ADDONS } from '@/lib/pricing';
import { PackageTier, EventType } from '@/lib/types';
import { formatIDR } from '@/lib/utils';
import {
  Calendar,
  Layers,
  Palette,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  MapPin,
  Clock,
  Shield,
  Gift,
  Camera,
  Gamepad2,
  MailCheck,
} from 'lucide-react';

export default function NewEventPage() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);

  // Form State
  const [name, setName] = useState('Google Tech Summit 2026');
  const [slug, setSlug] = useState('google-tech-summit');
  const [eventType, setEventType] = useState<EventType>('corporate');
  const [startDate, setStartDate] = useState('2026-11-20T09:00');
  const [endDate, setEndDate] = useState('2026-11-20T18:00');
  const [locationName, setLocationName] = useState('The Ritz-Carlton Pacific Place');
  const [locationAddress, setLocationAddress] = useState('SCBD, Jl. Jend. Sudirman Kav. 52-53, Senayan, Jakarta');
  const [locationMapsUrl, setLocationMapsUrl] = useState('https://maps.google.com/?q=Ritz+Carlton+Pacific+Place');

  // Theme & Modules
  const [selectedPreset, setSelectedPreset] = useState<string>('neon_dark_gold');
  const [enablePhotoWall, setEnablePhotoWall] = useState(true);
  const [enableRaffle, setEnableRaffle] = useState(true);
  const [enableGames, setEnableGames] = useState(true);
  const [enableRsvp, setEnableRsvp] = useState(true);

  // Package & Add-ons
  const [selectedTier, setSelectedTier] = useState<PackageTier>('pro');
  const [extraGuests, setExtraGuests] = useState<number>(50);
  const [isWhiteLabel, setIsWhiteLabel] = useState<boolean>(false);
  const [referralCode, setReferralCode] = useState<string>('EO-VIP-SUMMIT');

  const plan = PRICING_PLANS[selectedTier];
  const quote = calculateEventQuote({
    tier: selectedTier,
    extraGuests: plan.canAddExtraGuests ? extraGuests : 0,
    includeWhiteLabel: isWhiteLabel,
    whatsappProvider: 'none',
  });

  const handleSlugify = (text: string) => {
    const s = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setSlug(s);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate event creation and redirect to the event's guest list manager
    router.push('/dashboard/events/evt-techunite-2026/guests?created=true');
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Event Creation Wizard"
        subtitle="Set up branding, venue parameters, attendee capacity, and interactive modules"
      />

      <div className="p-6 sm:p-8 max-w-5xl mx-auto w-full space-y-8">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-[#1e263d] pb-6">
          <div className="flex items-center gap-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(s)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s
                      ? 'bg-gradient-to-r from-[#00f0ff] to-[#dfb76c] text-[#0b0d13] shadow-md'
                      : step > s
                      ? 'bg-[#1e263d] text-[#00ff88]'
                      : 'bg-[#121624] text-gray-500 border border-[#1e263d]'
                  }`}
                >
                  {step > s ? <Check className="w-4 h-4 stroke-[3]" /> : s}
                </button>
                <span
                  className={`text-xs font-semibold hidden sm:inline ${
                    step === s ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {s === 1 && 'Details & Venue'}
                  {s === 2 && 'Theme & Modules'}
                  {s === 3 && 'Package & Capacity'}
                </span>
                {s < 3 && <div className="w-8 h-[1px] bg-[#1e263d] hidden sm:block" />}
              </div>
            ))}
          </div>

          <div className="text-xs font-mono text-gray-400">
            Step <span className="text-[#00f0ff] font-bold">{step}</span> of 3
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleCreate} className="space-y-8">
          {/* STEP 1: Details & Venue */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="border-b border-[#1e263d] pb-4">
                <h2 className="text-lg font-bold text-white">Event Basics & Venue</h2>
                <p className="text-xs text-gray-400">Enter essential event information and custom domain slug</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-300">Event Title *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      handleSlugify(e.target.value);
                    }}
                    placeholder="e.g. APAC Tech Summit 2026"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#121624] border border-[#1e263d] text-sm text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Event Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as EventType)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#121624] border border-[#1e263d] text-sm text-white focus:outline-none focus:border-[#00f0ff]"
                  >
                    <option value="corporate">Corporate Conference / Gala</option>
                    <option value="wedding">Wedding Reception</option>
                    <option value="concert">Concert / Festival</option>
                    <option value="conference">Summit / Expo</option>
                    <option value="other">Private Celebration</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Subdomain Access Slug *</label>
                  <div className="flex items-center">
                    <span className="px-3 py-2.5 bg-[#0e121c] border border-r-0 border-[#1e263d] rounded-l-xl text-xs text-gray-400 font-mono">
                      https://
                    </span>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#121624] border border-[#1e263d] text-xs font-mono text-[#00f0ff] focus:outline-none focus:border-[#00f0ff]"
                    />
                    <span className="px-3 py-2.5 bg-[#0e121c] border border-l-0 border-[#1e263d] rounded-r-xl text-xs text-gray-400 font-mono">
                      .all41.app
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#121624] border border-[#1e263d] text-sm text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#121624] border border-[#1e263d] text-sm text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-300">Location / Venue Name *</label>
                  <input
                    type="text"
                    required
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="e.g. Grand Ballroom, The Ritz-Carlton Pacific Place"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#121624] border border-[#1e263d] text-sm text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-300">Physical Address</label>
                  <input
                    type="text"
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder="Full street address for invitation maps"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#121624] border border-[#1e263d] text-sm text-white focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs text-[#0b0d13] bg-gradient-to-r from-[#00f0ff] to-[#dfb76c] hover:brightness-110 transition-all shadow-md"
                >
                  <span>Continue to Themes & Modules</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Theme Presets & Interactive Modules */}
          {step === 2 && (
            <div className="space-y-8">
              <div className="border-b border-[#1e263d] pb-4">
                <h2 className="text-lg font-bold text-white">Visual Theme & Experience Modules</h2>
                <p className="text-xs text-gray-400">Choose styling and toggle on-stage experiences</p>
              </div>

              {/* Theme Presets */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-3">Theme Aesthetic</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(THEME_PRESETS).map(([key, preset]) => {
                    const isSelected = selectedPreset === key;
                    return (
                      <div
                        key={key}
                        onClick={() => setSelectedPreset(key)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#161d2e] border-[#dfb76c] shadow-[0_0_20px_rgba(223,183,108,0.2)]'
                            : 'bg-[#101420] border-[#1d2638] hover:border-[#2d3a54]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-white capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-[#dfb76c]" />}
                        </div>
                        <div className="flex gap-2 mb-2">
                          <div
                            className="w-5 h-5 rounded-full border border-black/20"
                            style={{ backgroundColor: preset.primaryColor }}
                            title="Primary"
                          />
                          <div
                            className="w-5 h-5 rounded-full border border-black/20"
                            style={{ backgroundColor: preset.secondaryColor }}
                            title="Secondary"
                          />
                          <div
                            className="w-5 h-5 rounded-full border border-black/20"
                            style={{ backgroundColor: preset.accentColor }}
                            title="Accent"
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">Font: {preset.fontFamily}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Module Switches */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-3">Modules to Activate</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setEnablePhotoWall(!enablePhotoWall)}
                    className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                      enablePhotoWall ? 'bg-[#151c2e] border-[#00f0ff]/50' : 'bg-[#101420] border-[#1d2638]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#00f0ff]/10 text-[#00f0ff]">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Live Photo Wall (WebP)</div>
                        <div className="text-[11px] text-gray-400">Guests snap selfies onto ballroom projector</div>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${enablePhotoWall ? 'bg-[#00f0ff] border-[#00f0ff] text-[#0b0d13]' : 'border-gray-500'}`}>
                      {enablePhotoWall && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <div
                    onClick={() => setEnableRaffle(!enableRaffle)}
                    className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                      enableRaffle ? 'bg-[#151c2e] border-[#dfb76c]/50' : 'bg-[#101420] border-[#1d2638]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#dfb76c]/10 text-[#dfb76c]">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Door Prize & Raffle Machine</div>
                        <div className="text-[11px] text-gray-400">Animated Wheel of Spin & Claw Machine</div>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${enableRaffle ? 'bg-[#dfb76c] border-[#dfb76c] text-[#0b0d13]' : 'border-gray-500'}`}>
                      {enableRaffle && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <div
                    onClick={() => setEnableGames(!enableGames)}
                    className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                      enableGames ? 'bg-[#151c2e] border-[#9d00ff]/50' : 'bg-[#101420] border-[#1d2638]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#9d00ff]/10 text-[#9d00ff]">
                        <Gamepad2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Interactive Kahoot Trivia</div>
                        <div className="text-[11px] text-gray-400">Realtime multiplayer trivia & leaderboards</div>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${enableGames ? 'bg-[#9d00ff] border-[#9d00ff] text-[#0b0d13]' : 'border-gray-500'}`}>
                      {enableGames && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <div
                    onClick={() => setEnableRsvp(!enableRsvp)}
                    className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                      enableRsvp ? 'bg-[#151c2e] border-[#00ff88]/50' : 'bg-[#101420] border-[#1d2638]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#00ff88]/10 text-[#00ff88]">
                        <MailCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Digital RSVP & Resend Email</div>
                        <div className="text-[11px] text-gray-400">Personalized ticket links & calendar invites</div>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${enableRsvp ? 'bg-[#00ff88] border-[#00ff88] text-[#0b0d13]' : 'border-gray-500'}`}>
                      {enableRsvp && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-[#141928] border border-[#232c44]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs text-[#0b0d13] bg-gradient-to-r from-[#00f0ff] to-[#dfb76c] hover:brightness-110 transition-all shadow-md"
                >
                  <span>Continue to Package & Capacity</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Package, Capacity & Add-ons */}
          {step === 3 && (
            <div className="space-y-8">
              <div className="border-b border-[#1e263d] pb-4">
                <h2 className="text-lg font-bold text-white">Package Selection & Capacity</h2>
                <p className="text-xs text-gray-400">Select flat package, top up extra guests in multiples of 10, or add White Label</p>
              </div>

              {/* Package Tier Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {(Object.keys(PRICING_PLANS) as PackageTier[])
                  .filter((t) => t !== 'enterprise')
                  .map((t) => {
                    const item = PRICING_PLANS[t];
                    const isSelected = selectedTier === t;

                    return (
                      <div
                        key={t}
                        onClick={() => setSelectedTier(t)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#161d2e] border-[#dfb76c] shadow-[0_0_15px_rgba(223,183,108,0.2)]'
                            : 'bg-[#101420] border-[#1d2638] hover:border-[#2d3a54]'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{item.name}</div>
                        <div className="text-[11px] font-mono text-[#00f0ff] mt-0.5">
                          {item.basePrice === 0 ? 'Free' : formatIDR(item.basePrice)}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-2">
                          Up to <strong>{item.maxGuests}</strong> pax
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Extra Guests Control */}
              {plan.canAddExtraGuests && (
                <div className="p-4 rounded-xl bg-[#141928] border border-[#232c44]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white">Extra Guests Buffer (Multiples of 10)</span>
                    <span className="text-xs font-bold text-[#00f0ff]">+{extraGuests} pax ({formatIDR(extraGuests * plan.extraGuestPricePerUnit)})</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={500}
                    step={10}
                    value={extraGuests}
                    onChange={(e) => setExtraGuests(Number(e.target.value))}
                    className="w-full accent-[#00f0ff] h-2 bg-[#1e263d] rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>0</span>
                    <span>100</span>
                    <span>250</span>
                    <span>500 extra</span>
                  </div>
                </div>
              )}

              {/* Addons & Partner Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setIsWhiteLabel(!isWhiteLabel)}
                  className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                    isWhiteLabel ? 'bg-[#151c2e] border-[#dfb76c]' : 'bg-[#101420] border-[#1d2638]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white">White Label & Custom Domain</div>
                    <div className="text-[10px] text-gray-400">Remove all41 branding (+{formatIDR(ADDONS.whiteLabel.price)})</div>
                  </div>
                  <div className={`w-4 h-4 rounded flex items-center justify-center border ${isWhiteLabel ? 'bg-[#dfb76c] border-[#dfb76c] text-[#0b0d13]' : 'border-gray-500'}`}>
                    {isWhiteLabel && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">EO / WO Referral Code</label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder="e.g. EO-JKT-VVIP"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#121624] border border-[#1e263d] text-xs font-mono text-white focus:outline-none focus:border-[#dfb76c]"
                  />
                </div>
              </div>

              {/* Live Quote Summary Card */}
              <div className="p-5 rounded-2xl bg-[#161c2d] border border-[#2b3956] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                    Total Estimated Investment
                  </div>
                  <div className="text-2xl font-black text-white">
                    {formatIDR(quote.totalCost)}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Total Capacity: <strong className="text-[#00ff88]">{quote.totalGuestsCapacity} pax</strong>
                    {quote.cashbackRate > 0 && (
                      <span className="ml-2 text-[#dfb76c] font-semibold">
                        • EO Cashback: {formatIDR(quote.estimatedCashback)} ({(quote.cashbackRate * 100).toFixed(0)}%)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-3 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-[#141928] border border-[#232c44]"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-xs text-[#0b0d13] bg-gradient-to-r from-[#00f0ff] via-[#dfb76c] to-[#ff007f] hover:brightness-110 transition-all shadow-lg active:scale-95"
                  >
                    <span>Create Event & Open Guest List</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
