'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { MOCK_EVENT, MOCK_PHOTO_WALL_UPLOADS } from '@/lib/mockData';
import { PhotoWallUpload } from '@/lib/types';
import { Camera, Sparkles, Heart, Maximize2, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

function LivePhotoWallContent({ slug }: { slug: string }) {
  const [photos, setPhotos] = useState<PhotoWallUpload[]>(MOCK_PHOTO_WALL_UPLOADS);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [featuredPhoto, setFeaturedPhoto] = useState<PhotoWallUpload | null>(null);

  useEffect(() => {
    // Generate QR code for guests to scan and open the uploader
    const uploadUrl = `https://${slug}.all41.app/photowall`;
    QRCode.toDataURL(uploadUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: '#0b0d13',
        light: '#ffffff',
      },
    }).then(setQrDataUrl);

    // Auto rotate featured photo every 8 seconds
    const interval = setInterval(() => {
      setPhotos((current) => {
        if (current.length === 0) return current;
        const randomIdx = Math.floor(Math.random() * current.length);
        setFeaturedPhoto(current[randomIdx]);
        return current;
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [slug]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] flex flex-col justify-between overflow-hidden relative select-none">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#00f0ff]/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#ff007f]/10 blur-[150px] pointer-events-none rounded-full" />

      {/* Top Projector Header */}
      <header className="h-20 px-8 flex items-center justify-between z-20 backdrop-blur-md bg-[#0b0e17]/60 border-b border-[#1b2234]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f0ff] via-[#dfb76c] to-[#ff007f] p-[2px]">
            <div className="w-full h-full bg-[#0b0d13] rounded-[10px] flex items-center justify-center font-black text-sm text-white">
              41
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{MOCK_EVENT.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30 font-mono">
                LIVE WALL
              </span>
            </h1>
            <p className="text-xs text-gray-400 font-mono">#TechUnite2026 • Realtime WebP Stream</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-[#141926] border border-[#222b40] text-gray-300 hover:text-white transition-colors"
            title="Toggle Stage Fullscreen"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Grid Photo Showcase */}
      <main className="flex-1 p-8 grid grid-cols-2 md:grid-cols-4 gap-6 items-stretch relative z-10 overflow-hidden">
        {photos.slice(0, 8).map((p, idx) => (
          <div
            key={p.id}
            className={`group relative rounded-3xl overflow-hidden border border-[#232c42] bg-[#101422] shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:border-[#dfb76c] flex flex-col justify-end ${
              idx === 0 ? 'md:col-span-2 md:row-span-2' : ''
            }`}
          >
            <img
              src={p.image_url}
              alt={p.caption || 'Live photo wall capture'}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            {/* Gradient Overlay & Badge */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

            {/* Frame badge if used */}
            {p.frame_used && (
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-[#dfb76c]/50 text-[11px] font-mono font-bold text-[#dfb76c] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#dfb76c]" />
                <span className="capitalize">{p.frame_used.replace(/-/g, ' ')}</span>
              </div>
            )}

            {/* Guest Caption & Name */}
            <div className="relative p-5 z-10">
              <p className="text-sm font-semibold text-white drop-shadow-md mb-2 leading-snug">
                &ldquo;{p.caption || 'Celebrating together!'}&rdquo;
              </p>
              <div className="flex items-center justify-between text-xs font-mono text-gray-300">
                <span className="font-bold text-[#00f0ff]">@{p.guest?.name || 'Attendee'}</span>
                <span className="text-gray-400">{p.guest?.table_number || 'VIP Table'}</span>
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* Bottom Stage Banner with Live Floating QR Code Call to Action */}
      <footer className="h-28 px-8 bg-[#0b0e17]/90 border-t border-[#1b2234] flex items-center justify-between relative z-20 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          {/* QR Code Container */}
          <div className="p-2 bg-white rounded-xl shadow-2xl flex-shrink-0 flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Scan QR to Post" className="w-20 h-20 object-contain" />
            ) : (
              <QrCode className="w-16 h-16 text-black" />
            )}
          </div>

          <div>
            <div className="text-base font-black text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#00f0ff]" />
              <span>Snap & Post Your Photo onto This Wall!</span>
            </div>
            <p className="text-xs text-gray-400 mt-1 max-w-md">
              Point your smartphone camera at the QR code to take a selfie. Cloudflare R2 WebP compression automatically broadcasts your photo live!
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <div className="text-xs font-mono text-gray-400 uppercase">Live Attending Audience</div>
          <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#dfb76c]">
            418 Verified Guests
          </div>
        </div>
      </footer>
    </div>
  );
}

function LivePhotoWallWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  return <LivePhotoWallContent slug={unwrappedParams.slug} />;
}

export default function LivePhotoWallPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-gray-400">Loading live stage wall...</div>}>
      <LivePhotoWallWrapper params={params} />
    </Suspense>
  );
}
