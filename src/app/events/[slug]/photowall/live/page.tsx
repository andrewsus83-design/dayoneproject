'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { MOCK_EVENT, MOCK_WEDDING_EVENT, MOCK_PHOTO_WALL_UPLOADS } from '@/lib/mockData';
import { PhotoWallUpload } from '@/lib/types';
import { getClientDomain } from '@/lib/domain';
import { PinterestMasonryPhotoWall } from '@/components/events/PinterestMasonryPhotoWall';
import { Camera, Sparkles, Heart, Maximize2, Minimize2, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

function LivePhotoWallContent({ slug }: { slug: string }) {
  const event = slug === 'aria-daniel' ? MOCK_WEDDING_EVENT : MOCK_EVENT;
  const clientDomain = getClientDomain(slug);
  const captionsEnabled = event.settings?.enablePhotoWallCaptions ?? true;

  const [photos, setPhotos] = useState<PhotoWallUpload[]>(
    MOCK_PHOTO_WALL_UPLOADS.filter((p) => p.is_approved)
  );
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sync approved photos in real-time from Operator Broadcast Switcher
  useEffect(() => {
    try {
      const saved = localStorage.getItem('all41_live_stage_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.approvedPhotos) setPhotos(parsed.approvedPhotos);
      }
    } catch {
      // Ignore storage error
    }

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('all41_stage_bus');
      channel.onmessage = (ev) => {
        const data = ev.data;
        if (data?.type === 'STAGE_PUSH_LIVE' && data.approvedPhotos) {
          setPhotos(data.approvedPhotos);
        }
      };
      return () => channel.close();
    }
  }, []);

  useEffect(() => {
    // Generate QR code for guests to scan and open the uploader
    const uploadUrl = `https://${clientDomain}/photowall`;
    QRCode.toDataURL(uploadUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: '#07090e',
        light: '#ffffff',
      },
    }).then(setQrDataUrl);

    // Keyboard shortcut for fullscreen
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clientDomain]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 flex flex-col justify-between overflow-x-hidden relative select-none font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-premium-neon/10 blur-[180px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-[700px] h-[700px] bg-premium-gold/10 blur-[180px] pointer-events-none rounded-full" />

      {/* Top Ballroom Projector Header */}
      <header className="h-20 px-8 flex items-center justify-between z-20 backdrop-blur-md bg-premium-surfaceDark/80 border-b border-premium-borderDark">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-xl shadow-gold flex-shrink-0">
            41
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <span>{event.name}</span>
              <span className="px-3 py-1 bg-premium-neon/15 text-premium-neon border border-premium-neon/30 rounded-full font-mono font-bold text-xs">
                PINTEREST LIVE WALL
              </span>
            </h1>
            <p className="text-xs text-zinc-400 font-mono">
              <span className="text-premium-neon font-bold">{clientDomain}</span> • Cloudflare R2 WebP & 720p HD Video Stream
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-mono uppercase text-zinc-400 block">Verified Audience</span>
            <span className="text-sm font-bold text-premium-success flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-premium-success animate-pulse" />
              <span>418 Checked In</span>
            </span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-2xl bg-premium-charcoal border border-premium-borderDark text-zinc-300 hover:text-white transition-colors scale-on-click"
            title="Toggle Stage Fullscreen (Key: F)"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Pinterest-style Masonry Stream */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full z-10">
        <PinterestMasonryPhotoWall
          photos={photos}
          showCaptions={captionsEnabled}
          canLike={true}
        />
      </main>

      {/* Bottom Stage Banner with Live Floating QR Code Call to Action */}
      <footer className="h-28 px-8 bg-premium-surfaceDark/95 border-t border-premium-borderDark flex items-center justify-between relative z-20 backdrop-blur-2xl">
        <div className="flex items-center gap-6">
          {/* QR Code Container */}
          <div className="p-2.5 bg-white rounded-2xl shadow-2xl flex-shrink-0 flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Scan QR to Post" className="w-20 h-20 object-contain" />
            ) : (
              <QrCode className="w-16 h-16 text-black" />
            )}
          </div>

          <div>
            <div className="text-base font-display font-medium text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-premium-neon" />
              <span>Snap Photo or Video to Broadcast onto This Wall!</span>
            </div>
            <div className="text-xs font-mono text-premium-gold font-bold mt-0.5">
              Scan QR with smartphone camera or visit: {clientDomain}/photowall
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 max-w-lg">
              Cloudflare R2 automatically optimizes your selfies to WebP. Photos and short videos appear on screen in sub-second speed!
            </p>
          </div>
        </div>

        <div className="text-right hidden md:block">
          <div className="text-xs font-mono text-zinc-400 uppercase">Live Attending Audience</div>
          <div className="text-2xl font-display font-bold text-premium-gold glow-gold">
            418 Verified Pax
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
