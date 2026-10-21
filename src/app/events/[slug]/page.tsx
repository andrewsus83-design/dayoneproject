'use client';

import React, { useState, use, Suspense } from 'react';
import Link from 'next/link';
import { MOCK_EVENT, MOCK_WEDDING_EVENT } from '@/lib/mockData';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Camera,
  Gift,
  Gamepad2,
  CheckCircle2,
  Send,
  Navigation,
  Share2,
  Heart,
  ChevronDown,
} from 'lucide-react';

function EventPublicLandingContent({ slug }: { slug: string }) {
  const event = slug === 'aria-daniel' ? MOCK_WEDDING_EVENT : MOCK_EVENT;
  const isWedding = event.event_type === 'wedding';

  // RSVP Form State
  const [rsvpName, setRsvpName] = useState('');
  const [rsvpEmail, setRsvpEmail] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<'attending' | 'declined'>('attending');
  const [plusOnes, setPlusOnes] = useState(0);
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);

  const handleSubmitRsvp = (e: React.FormEvent) => {
    e.preventDefault();
    setRsvpSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#0b0d13] text-[#f8fafc] flex flex-col selection:bg-[#dfb76c]/30">
      {/* Top Floating Glass Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0b0d13]/80 border-b border-[#1e263d]/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00f0ff] via-[#dfb76c] to-[#ff007f] p-[1.5px]">
            <div className="w-full h-full bg-[#0b0d13] rounded-[5px] flex items-center justify-center font-black text-xs text-white">
              41
            </div>
          </div>
          <span className="text-sm font-extrabold tracking-tight text-white">{event.name}</span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#rsvp"
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#0b0d13] bg-gradient-to-r from-[#dfb76c] to-[#00f0ff] hover:brightness-110 transition-all shadow-md"
          >
            RSVP Now
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 text-center overflow-hidden">
        {/* Ambient Neon Blobs */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-tr from-[#00f0ff]/15 via-[#dfb76c]/15 to-[#ff007f]/15 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#161c2c] border border-[#232d44] text-xs font-semibold text-[#dfb76c]">
            {isWedding ? <Heart className="w-3.5 h-3.5 text-[#ff007f]" /> : <Sparkles className="w-3.5 h-3.5 text-[#00f0ff]" />}
            <span>{isWedding ? 'Wedding Celebration' : 'Annual Leadership Summit'}</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            {event.name}
          </h1>

          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            {isWedding
              ? 'Join us as we celebrate love, laughter, and a lifetime of happiness together.'
              : 'Bringing together visionaries, founders, and industry leaders to shape the future of technology in Southeast Asia.'}
          </p>

          {/* Event Quick Details Card */}
          <div className="max-w-xl mx-auto p-4 rounded-2xl bg-[#121624]/90 border border-[#20293d] shadow-xl backdrop-blur-md grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#dfb76c]/10 text-[#dfb76c]">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase font-mono">Date & Time</div>
                <div className="text-xs font-bold text-white">{formatDate(event.start_date)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#00f0ff]/10 text-[#00f0ff]">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="truncate">
                <div className="text-[10px] text-gray-400 uppercase font-mono">Location</div>
                <div className="text-xs font-bold text-white truncate">{event.location_name}</div>
              </div>
            </div>
          </div>

          {/* Quick Interactive Portals for Guests */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/events/${slug}/photowall`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#151c2e] border border-[#273554] text-xs font-bold text-[#00f0ff] hover:bg-[#1c263e] hover:border-[#00f0ff]/60 transition-all shadow-md"
            >
              <Camera className="w-4 h-4" />
              <span>Snap Photo to Live Wall</span>
            </Link>

            <Link
              href={`/events/${slug}/games`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#151c2e] border border-[#273554] text-xs font-bold text-[#9d00ff] hover:bg-[#1c263e] hover:border-[#9d00ff]/60 transition-all shadow-md"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Join Live Trivia Game</span>
            </Link>

            <Link
              href={`/events/${slug}/raffle`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#151c2e] border border-[#273554] text-xs font-bold text-[#dfb76c] hover:bg-[#1c263e] hover:border-[#dfb76c]/60 transition-all shadow-md"
            >
              <Gift className="w-4 h-4" />
              <span>Door Prize Stage</span>
            </Link>
          </div>
        </div>
      </section>

      {/* RSVP Form Section */}
      <section id="rsvp" className="py-16 px-4 bg-[#0e121e] border-t border-[#1b2234]">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-white">Digital RSVP</h2>
            <p className="text-xs text-gray-400 mt-1">
              Please confirm your attendance to receive your personal QR entry passport.
            </p>
          </div>

          {rsvpSubmitted ? (
            <div className="p-8 rounded-3xl bg-[#0f231a] border border-[#00ff88] text-center space-y-4 animate-fadeIn">
              <div className="w-14 h-14 rounded-full bg-[#00ff88]/20 text-[#00ff88] mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">RSVP Received!</h3>
              <p className="text-xs text-gray-300 leading-relaxed max-w-sm mx-auto">
                Thank you, <strong>{rsvpName}</strong>. Your reservation is confirmed. Your dynamic QR ticket pass has been prepared for gate check-in!
              </p>
              <div className="pt-2">
                <Link
                  href={`/events/${slug}/photowall`}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-[#0b0d13] bg-[#00ff88] hover:brightness-110"
                >
                  <Camera className="w-4 h-4" />
                  <span>Open Live Photo Wall</span>
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmitRsvp}
              className="p-6 sm:p-8 rounded-3xl bg-[#121624] border border-[#20293d] space-y-5 shadow-2xl"
            >
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  value={rsvpName}
                  onChange={(e) => setRsvpName(e.target.value)}
                  placeholder="e.g. Jessica Tan"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0c0e17] border border-[#1e263d] text-xs text-white focus:outline-none focus:border-[#dfb76c]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Email for QR Ticket *</label>
                <input
                  type="email"
                  required
                  value={rsvpEmail}
                  onChange={(e) => setRsvpEmail(e.target.value)}
                  placeholder="e.g. jessica@company.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0c0e17] border border-[#1e263d] text-xs text-white focus:outline-none focus:border-[#dfb76c]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-2">Will you be attending?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRsvpStatus('attending')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                      rsvpStatus === 'attending'
                        ? 'bg-[#00ff88]/20 border-[#00ff88] text-[#00ff88]'
                        : 'bg-[#0c0e17] border-[#1e263d] text-gray-400'
                    }`}
                  >
                    Joyfully Attend
                  </button>
                  <button
                    type="button"
                    onClick={() => setRsvpStatus('declined')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                      rsvpStatus === 'declined'
                        ? 'bg-[#ff007f]/20 border-[#ff007f] text-[#ff007f]'
                        : 'bg-[#0c0e17] border-[#1e263d] text-gray-400'
                    }`}
                  >
                    Regretfully Decline
                  </button>
                </div>
              </div>

              {rsvpStatus === 'attending' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1">Bringing Plus-Ones?</label>
                    <select
                      value={plusOnes}
                      onChange={(e) => setPlusOnes(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0c0e17] border border-[#1e263d] text-xs text-white focus:outline-none focus:border-[#dfb76c]"
                    >
                      <option value={0}>Just me (1 Guest)</option>
                      <option value={1}>+1 Guest (2 Total)</option>
                      <option value={2}>+2 Guests (3 Total)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1">Dietary Restrictions or Special Wishes</label>
                    <input
                      type="text"
                      value={dietaryNotes}
                      onChange={(e) => setDietaryNotes(e.target.value)}
                      placeholder="e.g. Vegetarian, Halal, Nut allergy"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0c0e17] border border-[#1e263d] text-xs text-white focus:outline-none focus:border-[#dfb76c]"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl font-bold text-xs text-[#0b0d13] bg-gradient-to-r from-[#dfb76c] via-[#00f0ff] to-[#ff007f] hover:brightness-110 transition-all shadow-lg active:scale-95"
              >
                Submit RSVP & Get Digital Ticket
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-gray-500 border-t border-[#181d2c] bg-[#080a10]">
        Powered by{' '}
        <Link href="/" className="text-gray-400 hover:text-white font-bold">
          all41.app
        </Link>
      </footer>
    </div>
  );
}

function EventPublicLandingWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  return <EventPublicLandingContent slug={unwrappedParams.slug} />;
}

export default function EventPublicLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-gray-400">Loading celebration...</div>}>
      <EventPublicLandingWrapper params={params} />
    </Suspense>
  );
}
