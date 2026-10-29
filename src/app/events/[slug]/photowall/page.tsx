'use client';

import React, { useState, useRef, use, Suspense } from 'react';
import Link from 'next/link';
import { MOCK_EVENT, MOCK_WEDDING_EVENT, MOCK_GUESTS } from '@/lib/mockData';
import { Guest } from '@/lib/types';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  X,
  Share2,
  RefreshCw,
  Sliders,
  Download,
  Video,
  MessageSquare,
} from 'lucide-react';
import confetti from 'canvas-confetti';

function GuestPhotoWallContent({ slug }: { slug: string }) {
  const event = slug === 'aria-daniel' ? MOCK_WEDDING_EVENT : MOCK_EVENT;
  const captionsEnabled = event.settings?.enablePhotoWallCaptions ?? true;
  const maxCaptionLength = event.settings?.maxCaptionLength ?? 300;

  // Selected verified guest
  const [selectedGuest] = useState<Guest>(MOCK_GUESTS[0]); // Budi Santoso (checked in)
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [selectedFilter, setSelectedFilter] = useState<string>('cyberpunk-neon');
  const [selectedFrame, setSelectedFrame] = useState<string>('gold-badge-2026');
  const [caption, setCaption] = useState<string>('Having an awesome time at TechUnite! 🚀✨');
  const [previewMedia, setPreviewMedia] = useState<string | null>(
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80'
  );
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'compressing' | 'queued' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filters = [
    { id: 'normal', name: 'Original', style: 'none' },
    { id: 'cyberpunk-neon', name: 'Neon Cyber', style: 'contrast(1.2) saturate(1.5)' },
    { id: 'glam-gold', name: 'Warm Gold', style: 'sepia(0.3) saturate(1.3)' },
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

    setErrorMessage(null);

    if (mediaType === 'image') {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMessage('File photo melebihi batas 2MB. Harap gunakan foto dengan ukuran lebih kecil.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewMedia(event.target?.result as string);
        setUploadStatus('idle');
      };
      reader.readAsDataURL(file);
    } else {
      if (file.size > 20 * 1024 * 1024) {
        setErrorMessage('Video melebihi batas 20MB (720p). Harap rekam video dengan durasi lebih singkat.');
        return;
      }
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setPreviewMedia(url);
      setUploadStatus('idle');
    }
  };

  const handleUpload = () => {
    setUploadStatus('compressing');

    setTimeout(() => {
      setUploadStatus('queued');

      setTimeout(() => {
        setUploadStatus('success');
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      }, 1200);
    }, 1000);
  };

  const handleDownload = () => {
    if (!previewMedia) return;
    const a = document.createElement('a');
    a.href = previewMedia;
    a.download = `all41-${Date.now()}.${mediaType === 'video' ? 'mp4' : 'webp'}`;
    a.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${event.name} • Live Photo Wall`,
          text: caption || 'Captured live at the event!',
          url: window.location.href,
        });
      } catch (err) {}
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert('Tautan berhasil disalin ke clipboard!');
    }
  };

  const maxPhotos = event.settings?.maxPhotosPerGuest || 10;
  const currentUploads = selectedGuest.photos_uploaded_count;
  const remainingUploads = Math.max(0, maxPhotos - currentUploads);

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] flex flex-col justify-between max-w-md mx-auto border-x border-[#1a2133] selection:bg-[#dfb76c]/30">
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
            <p className="text-[10px] text-gray-400 font-mono">{slug}.all41.app</p>
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
      <main className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Media Type Toggle: Image vs Video */}
        <div className="grid grid-cols-2 gap-2 bg-[#0c0f18] p-1 rounded-2xl border border-[#1b2336]">
          <button
            type="button"
            onClick={() => {
              setMediaType('image');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mediaType === 'image'
                ? 'bg-[#00f0ff] text-[#07090f] shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Photo (WebP ≤ 2MB)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMediaType('video');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mediaType === 'video'
                ? 'bg-[#ff007f] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video (720p ≤ 20MB)</span>
          </button>
        </div>

        {/* Guest Verification & Fair-Use Quota Notice */}
        <div className="p-3 rounded-2xl bg-[#121624] border border-[#20293d] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00ff88]" />
            <span className="font-bold text-white">{selectedGuest.name}</span>
            <span className="text-gray-400 font-mono">({selectedGuest.table_number})</span>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">
            Quota: {currentUploads}/{maxPhotos} used
          </span>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#ff007f]/15 border border-[#ff007f] text-xs text-white flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-[#ff007f] flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Upload Success State */}
        {uploadStatus === 'success' && (
          <div className="p-4 rounded-2xl bg-[#0b2419] border border-[#00ff88] text-center space-y-3 animate-fadeIn">
            <div className="w-10 h-10 rounded-full bg-[#00ff88]/20 text-[#00ff88] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">Broadcasted to Live Stage Wall!</h3>
            <p className="text-xs text-gray-300">
              Your {mediaType === 'video' ? 'video' : 'photo'} is now live on the main ballroom LED display.
            </p>

            {/* Download & Social Share Buttons */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#122b1e] border border-[#00ff88]/40 text-xs font-bold text-[#00ff88]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Media</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#122b1e] border border-[#00ff88]/40 text-xs font-bold text-[#dfb76c]"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share to Social</span>
              </button>
            </div>
          </div>
        )}

        {/* Media Preview Canvas */}
        <div className="relative rounded-3xl overflow-hidden border border-[#252f47] bg-[#101422] aspect-[4/5] flex items-center justify-center shadow-xl">
          {mediaType === 'video' && videoFile ? (
            <video
              src={previewMedia || ''}
              controls
              className="w-full h-full object-contain"
            />
          ) : previewMedia ? (
            <div className="relative w-full h-full">
              <img
                src={previewMedia}
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
              <p className="text-xs text-gray-400">Take a photo or record video from device</p>
            </div>
          )}

          {/* Retake / Change Media Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-xs font-semibold text-white flex items-center gap-1.5 hover:bg-black"
          >
            <Camera className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>{previewMedia ? 'Change File' : 'Choose Media'}</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={mediaType === 'image' ? 'image/*' : 'video/mp4,video/quicktime'}
          capture="user"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Filter Selection for Photos */}
        {mediaType === 'image' && (
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1.5">Color Filter</label>
            <div className="grid grid-cols-4 gap-1.5">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFilter(f.id)}
                  className={`py-2 px-1 rounded-xl text-[10px] font-medium border text-center transition-all ${
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
        )}

        {/* Frame Selection */}
        <div>
          <label className="text-xs font-semibold text-gray-300 block mb-1.5">Stage Frame</label>
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

        {/* Captions Input (Strictly respecting Event Setting: ON/OFF, Max 300 Chars) */}
        {captionsEnabled ? (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-300">
                Wishes or Caption (Up to {maxCaptionLength} characters)
              </label>
              <span
                className={`text-[10px] font-mono ${
                  caption.length > maxCaptionLength ? 'text-[#ff007f]' : 'text-gray-400'
                }`}
              >
                {caption.length} / {maxCaptionLength}
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={maxCaptionLength}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a message to display on the live stage..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#101422] border border-[#1e263d] text-xs text-white focus:outline-none focus:border-[#dfb76c] resize-none"
            />
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[#0e121e] border border-[#1e263d] text-xs text-gray-400 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span>Captions disabled for this event. Media-only upload.</span>
          </div>
        )}
      </main>

      {/* Bottom Sticky Action Button */}
      <footer className="p-4 border-t border-[#1a2133] bg-[#0c0e17] sticky bottom-0 z-40">
        <button
          type="button"
          disabled={uploadStatus === 'compressing' || uploadStatus === 'queued' || remainingUploads <= 0}
          onClick={handleUpload}
          className={`w-full py-3.5 rounded-xl font-bold text-xs text-[#0b0d13] flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
            uploadStatus === 'compressing' || uploadStatus === 'queued'
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#00f0ff] via-[#dfb76c] to-[#ff007f] hover:brightness-110'
          }`}
        >
          {uploadStatus === 'compressing' ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Optimizing WebP (≤2MB) & Validating Video...</span>
            </>
          ) : uploadStatus === 'queued' ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-[#dfb76c]" />
              <span>Queued in Moderation Station...</span>
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
