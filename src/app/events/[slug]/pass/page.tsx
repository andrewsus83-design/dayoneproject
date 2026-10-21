'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { MOCK_EVENT, MOCK_GUESTS } from '@/lib/mockData';
import { Guest } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import {
  QrCode,
  MapPin,
  Calendar,
  Wifi,
  Camera,
  Gamepad2,
  Gift,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Share2,
} from 'lucide-react';
import QRCode from 'qrcode';

function GuestMobilePassContent({ slug }: { slug: string }) {
  const [guest, setGuest] = useState<Guest>(MOCK_GUESTS[0]); // Budi Santoso
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(guest.qr_code_token, {
      width: 300,
      margin: 1,
      color: {
        dark: '#0b0d13',
        light: '#ffffff',
      },
    }).then(setQrDataUrl);
  }, [guest]);

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] flex flex-col justify-between max-w-md mx-auto border-x border-[#1a2133] selection:bg-[#dfb76c]/30">
      {/* Top Mobile Bar */}
      <header className="h-14 px-4 bg-[#0d101a] border-b border-[#1b2234] flex items-center justify-between sticky top-0 z-40">
        <Link
          href={`/events/${slug}`}
          className="p-1.5 rounded-lg bg-[#141926] text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider">
          Digital Event Passport
        </span>
        <div className="w-6" />
      </header>

      {/* Main Digital Pass Card */}
      <main className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Pass Lanyard Card */}
        <div className="relative rounded-3xl overflow-hidden border-2 border-[#dfb76c]/60 bg-gradient-to-b from-[#161a29] to-[#0f121d] shadow-[0_0_35px_rgba(223,183,108,0.25)] p-6 text-center">
          {/* Top Notch Hole */}
          <div className="w-12 h-3 rounded-full bg-[#07090e] mx-auto border border-[#242f47] mb-4" />

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#dfb76c]/20 text-[#dfb76c] text-[10px] font-mono font-bold uppercase tracking-wider border border-[#dfb76c]/40 mb-2">
            <Sparkles className="w-3 h-3" />
            <span>{guest.category}</span>
          </div>

          <h2 className="text-xl font-black text-white">{guest.name}</h2>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{MOCK_EVENT.name}</p>

          {/* High-Contrast QR Code */}
          <div className="my-5 p-3.5 bg-white rounded-2xl inline-block shadow-2xl">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Gate Pass QR" className="w-48 h-48 object-contain mx-auto" />
            ) : (
              <div className="w-48 h-48 bg-gray-200 animate-pulse rounded-xl" />
            )}
          </div>

          <div className="text-[11px] font-mono text-gray-400 bg-[#0c0e17] py-1.5 px-3 rounded-lg border border-[#1e263d] inline-block mb-4">
            {guest.qr_code_token}
          </div>

          {/* Table & Gate Status Badge */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#1e263d] text-left">
            <div className="p-3 rounded-xl bg-[#121624] border border-[#1e273a]">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Assigned Table</span>
              <strong className="text-sm text-[#dfb76c]">{guest.table_number || 'Open Seating'}</strong>
            </div>

            <div className="p-3 rounded-xl bg-[#121624] border border-[#1e273a]">
              <span className="text-[10px] text-gray-400 font-mono uppercase block">Gate Admission</span>
              <div className="flex items-center gap-1 text-[#00ff88] text-xs font-bold mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Entry</span>
              </div>
            </div>
          </div>
        </div>

        {/* Venue & Event Wi-Fi Card */}
        <div className="p-4 rounded-2xl bg-[#121624] border border-[#1f283d] space-y-2 text-xs">
          <div className="flex items-center justify-between text-gray-300">
            <span className="flex items-center gap-1.5 text-gray-400">
              <Calendar className="w-4 h-4 text-[#dfb76c]" />
              <span>Date:</span>
            </span>
            <span className="font-semibold">{formatDate(MOCK_EVENT.start_date)}</span>
          </div>

          <div className="flex items-center justify-between text-gray-300">
            <span className="flex items-center gap-1.5 text-gray-400">
              <MapPin className="w-4 h-4 text-[#00f0ff]" />
              <span>Ballroom:</span>
            </span>
            <span className="font-semibold truncate max-w-[200px]">{MOCK_EVENT.location_name}</span>
          </div>

          <div className="flex items-center justify-between text-gray-300 pt-2 border-t border-[#1b2234]">
            <span className="flex items-center gap-1.5 text-gray-400">
              <Wifi className="w-4 h-4 text-[#00ff88]" />
              <span>Event Wi-Fi:</span>
            </span>
            <span className="font-mono text-[#00ff88] font-bold">ALL41_GUEST / tech2026</span>
          </div>
        </div>

        {/* Quick In-Event Actions */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
            Attendee Interactive Access
          </span>

          <div className="grid grid-cols-3 gap-2">
            <Link
              href={`/events/${slug}/photowall`}
              className="p-3 rounded-xl bg-[#131726] border border-[#212b42] flex flex-col items-center justify-center text-center hover:border-[#00f0ff] transition-colors"
            >
              <Camera className="w-5 h-5 text-[#00f0ff] mb-1" />
              <span className="text-[11px] font-bold text-white">Live Wall</span>
              <span className="text-[9px] text-gray-400">Snap Photo</span>
            </Link>

            <Link
              href={`/events/${slug}/play`}
              className="p-3 rounded-xl bg-[#131726] border border-[#212b42] flex flex-col items-center justify-center text-center hover:border-[#9d00ff] transition-colors"
            >
              <Gamepad2 className="w-5 h-5 text-[#9d00ff] mb-1" />
              <span className="text-[11px] font-bold text-white">Quiz Pad</span>
              <span className="text-[9px] text-gray-400">Answer Live</span>
            </Link>

            <Link
              href={`/events/${slug}/raffle`}
              className="p-3 rounded-xl bg-[#131726] border border-[#212b42] flex flex-col items-center justify-center text-center hover:border-[#dfb76c] transition-colors"
            >
              <Gift className="w-5 h-5 text-[#dfb76c] mb-1" />
              <span className="text-[11px] font-bold text-white">Raffles</span>
              <span className="text-[9px] text-gray-400">Door Prize</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-3 text-center text-[10px] text-gray-500 border-t border-[#1a2133] bg-[#090b12]">
        Show this QR passport at ballroom gates for sub-second badge verification.
      </footer>
    </div>
  );
}

function GuestMobilePassWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  return <GuestMobilePassContent slug={unwrappedParams.slug} />;
}

export default function GuestMobilePassPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-gray-400">Loading pass...</div>}>
      <GuestMobilePassWrapper params={params} />
    </Suspense>
  );
}
