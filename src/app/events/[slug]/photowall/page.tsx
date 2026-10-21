'use client';

import React, { useState, useRef, use, Suspense } from 'react';
import Link from 'next/link';
import { MOCK_EVENT, MOCK_GUESTS } from '@/lib/mockData';
import { Guest } from '@/lib/types';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  X,
  Share2,
  RefreshCw,
  Sliders,
} from 'lucide-react';

function GuestPhotoWallContent({ slug }: { slug: string }) {
  // Selected verified guest
  const [selectedGuest, setSelectedGuest] = useState<Guest>(MOCK_GUESTS[0]); // Budi Santoso (checked in)
  const [selectedFilter, setSelectedFilter] = useState<string>('cyberpunk-neon');
  const [selectedFrame, setSelectedFrame] = useState<string>('gold-badge-2026');
  const [caption, setCaption] = useState<string>('Having an awesome time at TechUnite! 🚀✨');
  const [previewImage, setPreviewImage] = useState<string | null>(
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80'
  );
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filters = [
    { id: 'normal', name: 'Original', style: 'none' },
    { id: 'cyberpunk-neon', name: 'Neon Cyber', style: 'contrast(1.2) saturate(1.5) hue-rotate(15deg)' },
    { id: 'glam-gold', name: 'Warm Gold', style: 'sepia(0.3) saturate(1.3) contrast(1.1)' },
    { id: 'monochrome', name: 'Dramatic B&W', style: 'grayscale(1) contrast(1.3)' },
  ];

  const frames = [
    { id: 'none', name: 'No Frame' },
    { id: 'gold-badge-2026', name: 'VIP Gold 2026' },
    { id: 'cyber-frame', name: 'Cyan Tech Border' },
    { id: 'celebration-pink', name: 'Neon Pink Glow' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side WebP compression / canvas simulation
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewImage(event.target?.result as string);
      setUploadSuccess(false);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setUploadSuccess(true);
    }, 1200);
  };

  const maxPhotos = MOCK_EVENT.settings.maxPhotosPerGuest || 10;
  const currentUploads = selectedGuest.photos_uploaded_count;
  const remainingUploads = Math.max(0, maxPhotos - currentUploads);

  return (
    <div className="min-h-screen bg-[#090b12] text-[#f8fafc] flex flex-col justify-between max-w-md mx-auto border-x border-[#1a2133] selection:bg-[#dfb76c]/30">
      {/* Header */}
      <header className="h-16 px-4 border-b border-[#1a2133] bg-[#0c0e17] flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Link
            href={`/events/${slug}`}
            className="p-2 rounded-lg bg-[#141926] text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Live Photo Wall Uploader</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse" />
            </h1>
            <p className="text-[10px] text-gray-400 font-mono">{MOCK_EVENT.name}</p>
          </div>
        </div>

        <Link
          href={`/events/${slug}/photowall/live`}
          target="_blank"
          className="text-[11px] font-bold text-[#00f0ff] hover:underline"
        >
          View Live Wall
        </Link>
      </header>

      {/* Main Upload Body */}
      <main className="p-4 space-y-5 flex-1 overflow-y-auto">
        {/* Guest Verification & Fair-Use Quota Notice */}
        <div className="p-3.5 rounded-2xl bg-[#121624] border border-[#20293d] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00f0ff] to-[#dfb76c] p-[1.5px] flex-shrink-0">
              <div className="w-full h-full bg-[#10131d] rounded-full flex items-center justify-center font-bold text-xs text-white">
                {selectedGuest.name.slice(0, 2)}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{selectedGuest.name}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#00ff88]/20 text-[#00ff88] font-mono">
                  Checked In
                </span>
              </div>
              <div className="text-[10px] text-gray-400">
                Table: {selectedGuest.table_number} • Fair-use: {currentUploads}/{maxPhotos} used ({remainingUploads} remaining)
              </div>
            </div>
          </div>
        </div>

        {/* Upload Success State */}
        {uploadSuccess && (
          <div className="p-4 rounded-2xl bg-[#0b2419] border border-[#00ff88] text-center space-y-2 animate-fadeIn">
            <div className="w-10 h-10 rounded-full bg-[#00ff88]/20 text-[#00ff88] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">Broadcasted to Live Wall!</h3>
            <p className="text-xs text-gray-300">
              Your photo is now live on the main stage LED screens. Look up!
            </p>
            <div className="pt-2">
              <Link
                href={`/events/${slug}/photowall/live`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00ff88] text-[#0b0d13] text-xs font-bold"
              >
                <span>Watch Stage Projector</span>
              </Link>
            </div>
          </div>
        )}

        {/* Image Preview Canvas */}
        <div className="relative rounded-3xl overflow-hidden border border-[#252f47] bg-[#101422] aspect-[4/5] flex items-center justify-center shadow-xl">
          {previewImage ? (
            <div className="relative w-full h-full">
              <img
                src={previewImage}
                alt="Upload preview"
                className="w-full h-full object-cover transition-all"
                style={{
                  filter: filters.find((f) => f.id === selectedFilter)?.style || 'none',
                }}
              />

              {/* Decorative Frame Overlays */}
              {selectedFrame === 'gold-badge-2026' && (
                <div className="absolute inset-2 border-2 border-[#dfb76c] rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                  <span className="text-[10px] font-mono font-bold text-[#dfb76c] uppercase tracking-widest bg-black/50 px-2 py-0.5 rounded self-start">
                    VIP ACCESS 2026
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#dfb76c] uppercase tracking-widest bg-black/50 px-2 py-0.5 rounded self-end">
                    TECHUNITE APAC
                  </span>
                </div>
              )}

              {selectedFrame === 'cyber-frame' && (
                <div className="absolute inset-2 border-2 border-[#00f0ff] rounded-2xl pointer-events-none shadow-[inset_0_0_20px_rgba(0,240,255,0.3)] flex flex-col justify-between p-3">
                  <span className="text-[10px] font-mono font-bold text-[#00f0ff] uppercase bg-black/60 px-2 py-0.5 rounded self-start">
                    ⚡ LIVE BROADCAST
                  </span>
                </div>
              )}

              {selectedFrame === 'celebration-pink' && (
                <div className="absolute inset-2 border-2 border-[#ff007f] rounded-2xl pointer-events-none shadow-[inset_0_0_20px_rgba(255,0,127,0.3)]" />
              )}
            </div>
          ) : (
            <div className="text-center p-6 space-y-2">
              <Camera className="w-12 h-12 text-gray-500 mx-auto" />
              <p className="text-xs text-gray-400">Take a photo or choose from camera roll</p>
            </div>
          )}

          {/* Change photo button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-xs font-semibold text-white flex items-center gap-1.5 hover:bg-black"
          >
            <Camera className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>Retake</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Filter Selection Slider */}
        <div>
          <label className="text-xs font-semibold text-gray-300 block mb-2">Color Filter</label>
          <div className="grid grid-cols-4 gap-2">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFilter(f.id)}
                className={`py-2 px-1 rounded-xl text-[11px] font-medium border text-center transition-all ${
                  selectedFilter === f.id
                    ? 'bg-[#18233a] border-[#00f0ff] text-[#00f0ff]'
                    : 'bg-[#101422] border-[#1e263d] text-gray-400'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Frame Selection */}
        <div>
          <label className="text-xs font-semibold text-gray-300 block mb-2">Stage Frame</label>
          <div className="grid grid-cols-2 gap-2">
            {frames.map((fr) => (
              <button
                key={fr.id}
                type="button"
                onClick={() => setSelectedFrame(fr.id)}
                className={`py-2 px-2.5 rounded-xl text-[11px] font-medium border text-left transition-all ${
                  selectedFrame === fr.id
                    ? 'bg-[#18233a] border-[#dfb76c] text-[#dfb76c]'
                    : 'bg-[#101422] border-[#1e263d] text-gray-400'
                }`}
              >
                {fr.name}
              </button>
            ))}
          </div>
        </div>

        {/* Caption Input */}
        <div>
          <label className="text-xs font-semibold text-gray-300 block mb-1">Add a Shoutout or Caption</label>
          <input
            type="text"
            maxLength={100}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write something to display on screen..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#101422] border border-[#1e263d] text-xs text-white focus:outline-none focus:border-[#dfb76c]"
          />
        </div>
      </main>

      {/* Bottom Sticky Action Button */}
      <footer className="p-4 border-t border-[#1a2133] bg-[#0c0e17] sticky bottom-0 z-40">
        <button
          type="button"
          disabled={isUploading || remainingUploads <= 0}
          onClick={handleUpload}
          className={`w-full py-3.5 rounded-xl font-bold text-xs text-[#0b0d13] flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
            isUploading
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#00f0ff] via-[#dfb76c] to-[#ff007f] hover:brightness-110'
          }`}
        >
          {isUploading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Optimizing WebP & Streaming to LED Wall...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Broadcast to Live Stage Wall</span>
            </>
          )}
        </button>
      </footer>
    </div>
  );
}

function GuestPhotoWallWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  return <GuestPhotoWallContent slug={unwrappedParams.slug} />;
}

export default function GuestPhotoWallPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-gray-400">Loading uploader...</div>}>
      <GuestPhotoWallWrapper params={params} />
    </Suspense>
  );
}
