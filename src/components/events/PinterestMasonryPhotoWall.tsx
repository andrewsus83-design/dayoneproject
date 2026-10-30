'use client';

import React, { useState } from 'react';
import { PhotoWallUpload } from '@/lib/types';
import {
  Heart,
  Download,
  Share2,
  Play,
  Sparkles,
  X,
  Check,
  Video,
} from 'lucide-react';

interface PinterestMasonryPhotoWallProps {
  photos: PhotoWallUpload[];
  showCaptions?: boolean;
  onUploadClick?: () => void;
  canLike?: boolean;
  frameOverlayUrl?: string;
}

export function PinterestMasonryPhotoWall({
  photos,
  showCaptions = true,
  onUploadClick,
  canLike = true,
  frameOverlayUrl,
}: PinterestMasonryPhotoWallProps) {
  // Photos come straight from props, so a polling parent (live wall, album) shows new ones as they arrive.
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const items = photos;
  const selectedItem = selectedId ? items.find((p) => p.id === selectedId) ?? null : null;
  const setSelectedItem = (item: PhotoWallUpload | null) => setSelectedId(item?.id ?? null);
  const likesOf = (item: PhotoWallUpload) => (item.likes_count || 0) + (likedIds[item.id] ? 1 : 0);

  const handleToggleLike = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!canLike) return;
    setLikedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDownload = (e: React.MouseEvent, item: PhotoWallUpload) => {
    e.stopPropagation();
    const ext = item.media_type === 'video' ? 'mp4' : item.image_url.includes('.jpg') ? 'jpg' : 'webp';
    const filename = `dayoneproject-${item.id}.${ext}`;
    const link = document.createElement('a');
    const href = item.video_url && item.media_type === 'video' ? item.video_url : item.image_url;
    // Supabase Storage sends the file as a download (not a new tab) when asked to.
    link.href = href.includes('/storage/v1/object/public/') ? `${href}?download=${encodeURIComponent(filename)}` : href;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async (e: React.MouseEvent, item: PhotoWallUpload) => {
    e.stopPropagation();
    // Stored photos are shared as the photo itself (or its own link), never the page address,
    // which can carry the wall key.
    const stored = item.image_url.includes('/storage/v1/object/public/');
    const link = stored ? item.image_url : window.location.href;
    const text = item.caption || 'A moment from the event, on dayoneproject.xyz';

    if (navigator.share) {
      try {
        if (stored && navigator.canShare) {
          const blob = await fetch(item.image_url).then((r) => r.blob());
          const file = new File([blob], `dayoneproject-${item.id}.${blob.type === 'image/jpeg' ? 'jpg' : 'webp'}`, { type: blob.type });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], text });
            return;
          }
        }
        await navigator.share({ title: 'Event photo wall • dayoneproject.xyz', text, url: link });
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) copyLink(link);
      }
    } else {
      copyLink(link);
    }
  };

  const copyLink = (link: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link).catch(() => undefined);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="w-full">
      {/* Pinterest-style Masonry Columns */}
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {items.map((item) => {
          const isLiked = likedIds[item.id];
          const isVideo = item.media_type === 'video';

          // Aspect ratio styling
          let aspectClass = 'aspect-[3/4]'; // portrait default
          if (item.aspect_ratio === 'square') aspectClass = 'aspect-square';
          else if (item.aspect_ratio === 'landscape') aspectClass = 'aspect-[16/10]';

          return (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="break-inside-avoid group relative rounded-3xl overflow-hidden bg-premium-charcoal border border-premium-borderDark hover:border-premium-gold transition-all duration-300 shadow-lg cursor-pointer transform hover:-translate-y-1 scale-on-click"
            >
              {/* Media Container */}
              <div className={`relative w-full ${aspectClass} overflow-hidden bg-premium-surfaceDark`}>
                {isVideo && item.video_url ? (
                  // Guest videos play silently on the wall; the lightbox has sound and controls.
                  <video
                    src={item.video_url}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <img
                    src={item.image_url}
                    alt={item.caption || 'Event capture'}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}

                {/* Subtle dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/30 pointer-events-none" />

                {/* Event photo frame overlay (e.g. POPVERSE stained-glass cathedral frame) */}
                {frameOverlayUrl && (
                  <img
                    src={frameOverlayUrl}
                    alt="Event frame"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10"
                    style={{ mixBlendMode: 'screen' }}
                  />
                )}

                {/* Video Play Badge if media is video */}
                {isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {!item.video_url && (
                      <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-premium-neon/60 flex items-center justify-center text-premium-neon shadow-neon group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-premium-neon ml-0.5" />
                      </div>
                    )}
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] font-mono text-premium-neon border border-premium-neon/30 flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      <span>720p HD</span>
                    </span>
                  </div>
                )}

                {/* Frame or Filter Badge */}
                {item.frame_used && (
                  <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-premium-gold/40 text-[9px] font-mono text-premium-gold font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{item.frame_used.replace(/-/g, ' ')}</span>
                  </div>
                )}

                {/* Action Hover Pills (Download & Share) */}
                <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 z-10">
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, item)}
                    title="Download Media"
                    className="p-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white hover:text-premium-neon hover:border-premium-neon transition-all shadow-md scale-on-click"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleShare(e, item)}
                    title="Share to Social Media"
                    className="p-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white hover:text-premium-gold hover:border-premium-gold transition-all shadow-md scale-on-click"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Bottom Content within Media Card */}
                <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col justify-end z-10">
                  {/* Guest Caption (Respecting showCaptions prop) */}
                  {showCaptions && item.caption && (
                    <p className="text-xs sm:text-[13px] font-medium text-white drop-shadow-md line-clamp-3 mb-2 leading-relaxed">
                      &ldquo;{item.caption}&rdquo;
                    </p>
                  )}

                  {/* Guest Identity & Like Button Bar */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10">
                    <div className="truncate mr-2">
                      <span className="font-bold text-premium-neon truncate block">
                        {item.guest?.name || 'Guest'}
                      </span>
                      {item.guest?.table_number && (
                        <span className="text-[10px] text-zinc-400 font-mono truncate block">
                          Table {item.guest.table_number}
                        </span>
                      )}
                    </div>

                    {canLike && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleLike(e, item.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono transition-all scale-on-click ${
                          isLiked
                            ? 'bg-premium-danger text-white shadow-danger scale-105'
                            : 'bg-black/60 text-zinc-300 hover:text-white border border-white/20'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            isLiked ? 'fill-white stroke-white' : 'stroke-current'
                          }`}
                        />
                        <span>{likesOf(item)}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-premium-charcoal border border-premium-borderDark rounded-[2.5rem] max-w-2xl w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 text-zinc-300 hover:text-white border border-white/20 flex items-center justify-center backdrop-blur-md transition-all scale-on-click"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Lightbox Media */}
            <div className="relative bg-black flex items-center justify-center max-h-[60vh] overflow-hidden">
              {selectedItem.media_type === 'video' && selectedItem.video_url ? (
                <video
                  src={selectedItem.video_url}
                  controls
                  autoPlay
                  className="w-full max-h-[60vh] object-contain"
                />
              ) : (
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.caption || 'Event photo'}
                  className="w-full max-h-[60vh] object-contain"
                />
              )}
            </div>

            {/* Lightbox Details & Social Bar */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-display font-medium text-white flex items-center gap-2">
                    <span>{selectedItem.guest?.name || 'Guest'}</span>
                    <span className="px-2.5 py-0.5 bg-premium-success/20 text-premium-success border border-premium-success/30 rounded-full text-xs font-bold font-mono">
                      Checked-in
                    </span>
                  </h3>
                  {selectedItem.guest?.table_number && (
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">Table {selectedItem.guest.table_number}</p>
                  )}
                </div>

                {canLike && (
                  <button
                    type="button"
                    onClick={(e) => handleToggleLike(e, selectedItem.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all scale-on-click ${
                      likedIds[selectedItem.id]
                        ? 'bg-premium-danger text-white shadow-danger scale-105'
                        : 'bg-premium-surfaceDark text-zinc-300 hover:text-white border border-premium-borderDark'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        likedIds[selectedItem.id] ? 'fill-white stroke-white' : ''
                      }`}
                    />
                    <span>{likesOf(selectedItem)} Cheers</span>
                  </button>
                )}
              </div>

              {/* Caption if enabled */}
              {showCaptions && selectedItem.caption && (
                <p className="text-sm text-zinc-200 bg-premium-surfaceDark p-4 rounded-2xl border border-premium-borderDark leading-relaxed">
                  &ldquo;{selectedItem.caption}&rdquo;
                </p>
              )}

              {/* Download & Share Button Rows */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-premium-borderDark">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, selectedItem)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-xs font-bold text-white hover:border-premium-neon transition-colors scale-on-click"
                  >
                    <Download className="w-4 h-4 text-premium-neon" />
                    <span>Download {selectedItem.media_type === 'video' ? 'Video' : 'Photo'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleShare(e, selectedItem)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-xs font-bold text-white hover:border-premium-gold transition-colors scale-on-click"
                  >
                    <Share2 className="w-4 h-4 text-premium-gold" />
                    <span>Share to Social</span>
                  </button>
                </div>

                {copiedLink && (
                  <span className="text-xs font-mono text-premium-success flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Link copied to clipboard!</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
