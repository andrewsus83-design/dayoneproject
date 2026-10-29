'use client';

import React, { useState } from 'react';
import {
  Camera, Filter, Frame, Link2, Download, Trash2, Check, Eye, EyeOff,
  Grid, LayoutGrid, SlidersHorizontal, Star, StarOff, Share2, Settings2,
  ExternalLink, Copy, Upload, ImagePlus, Sparkles, X,
} from 'lucide-react';

const PHOTO_FILTERS = [
  { id: 'none', label: 'Original', css: '' },
  { id: 'warm', label: 'Warm Glow', css: 'sepia(0.35) brightness(1.05) saturate(1.2)' },
  { id: 'cool', label: 'Cool Blue', css: 'hue-rotate(190deg) saturate(0.9)' },
  { id: 'bw', label: 'Monochrome', css: 'grayscale(1) contrast(1.1)' },
  { id: 'vivid', label: 'Vivid Pop', css: 'saturate(1.7) brightness(1.05)' },
  { id: 'fade', label: 'Faded Film', css: 'contrast(0.85) brightness(1.1) sepia(0.12)' },
  { id: 'golden', label: 'Golden Hour', css: 'sepia(0.4) brightness(1.1) hue-rotate(-10deg) saturate(1.3)' },
  { id: 'mist', label: 'Soft Mist', css: 'brightness(1.15) contrast(0.88) saturate(0.75)' },
];

const PHOTO_FRAMES = [
  { id: 'none', label: 'No Frame' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'thin', label: 'Thin Border' },
  { id: 'shadow', label: 'Shadow Box' },
  { id: 'film', label: 'Film Strip' },
  { id: 'arch', label: 'Arch Top' },
];

const MOCK_PHOTOS = [
  { id: 'p1', guest: 'Alicia Santos', time: '3h ago', approved: true, featured: true, url: null },
  { id: 'p2', guest: 'Marcus Tan', time: '2h ago', approved: true, featured: false, url: null },
  { id: 'p3', guest: 'Priya Sharma', time: '1h ago', approved: false, featured: false, url: null },
  { id: 'p4', guest: 'Rafael Cruz', time: '45m ago', approved: true, featured: false, url: null },
  { id: 'p5', guest: 'Hana Kim', time: '30m ago', approved: false, featured: false, url: null },
  { id: 'p6', guest: 'Jordan Reyes', time: '15m ago', approved: true, featured: true, url: null },
];

const GRADIENT_PALETTES = [
  'from-zinc-800 to-zinc-900',
  'from-purple-900/60 to-zinc-900',
  'from-emerald-900/60 to-zinc-900',
  'from-rose-900/60 to-zinc-900',
  'from-amber-900/60 to-zinc-900',
  'from-sky-900/60 to-zinc-900',
];

interface PhotoEntry {
  id: string;
  guest: string;
  time: string;
  approved: boolean;
  featured: boolean;
  url: string | null;
}

export function PhotoWallManager() {
  const [activeFilter, setActiveFilter] = useState('none');
  const [activeFrame, setActiveFrame] = useState('none');
  const [photos, setPhotos] = useState<PhotoEntry[]>(MOCK_PHOTOS);
  const [driveLink, setDriveLink] = useState('');
  const [driveConnected, setDriveConnected] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [gridView, setGridView] = useState<'masonry' | 'grid'>('masonry');
  const [copiedLink, setCopiedLink] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);
  const [allowCaption, setAllowCaption] = useState(true);
  const [maxUploads, setMaxUploads] = useState('10');

  const toggleApproved = (id: string) =>
    setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, approved: !p.approved } : p));
  const toggleFeatured = (id: string) =>
    setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, featured: !p.featured } : p));
  const removePhoto = (id: string) =>
    setPhotos((prev) => prev.filter((p) => p.id !== id));

  const displayed = showPending ? photos : photos.filter((p) => p.approved);
  const pending = photos.filter((p) => !p.approved).length;

  return (
    <div className="space-y-5">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
            <Camera className="w-4.5 h-4.5 text-premium-gold" />
            Photo Wall
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">{photos.filter((p) => p.approved).length} approved · {pending} pending moderation</p>
        </div>
        <div className="flex items-center gap-2">
          {pending > 0 && (
            <button
              type="button"
              onClick={() => setShowPending(!showPending)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                showPending ? 'bg-premium-gold/10 border-premium-gold/40 text-premium-gold' : 'bg-premium-surfaceDark border-premium-borderDark text-zinc-400'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {showPending ? 'All photos' : `${pending} pending`}
            </button>
          )}
          <button
            type="button"
            onClick={() => setGridView(gridView === 'masonry' ? 'grid' : 'masonry')}
            className="p-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 hover:text-white"
          >
            {gridView === 'masonry' ? <Grid className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: settings */}
        <div className="xl:col-span-5 space-y-4">
          {/* Filters */}
          <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark">
            <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-premium-gold" />
              Photo Filter
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {PHOTO_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all scale-on-click ${
                    activeFilter === f.id
                      ? 'border-premium-gold bg-premium-gold/10'
                      : 'border-premium-borderDark bg-premium-surfaceDark hover:border-zinc-600'
                  }`}
                >
                  {/* filter swatch */}
                  <div
                    className="w-full aspect-square rounded-lg bg-gradient-to-br from-zinc-600 to-zinc-800"
                    style={{ filter: f.css || undefined }}
                  />
                  <span className={`text-[9px] font-bold text-center leading-tight ${activeFilter === f.id ? 'text-premium-gold' : 'text-zinc-500'}`}>
                    {f.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Frames */}
          <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark">
            <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
              <Frame className="w-3.5 h-3.5 text-premium-gold" />
              Photo Frame
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {PHOTO_FRAMES.map((fr) => (
                <button
                  key={fr.id}
                  type="button"
                  onClick={() => setActiveFrame(fr.id)}
                  className={`py-2.5 px-3 rounded-xl border text-[10px] font-bold transition-all scale-on-click ${
                    activeFrame === fr.id
                      ? 'border-premium-gold bg-premium-gold/10 text-premium-gold'
                      : 'border-premium-borderDark bg-premium-surfaceDark text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {fr.label}
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5 text-premium-gold" />
              Wall Settings
            </h4>

            {[
              { label: 'Require admin approval', sub: 'Photos must be approved before appearing on the wall.', val: requireApproval, set: setRequireApproval },
              { label: 'Allow guest captions', sub: 'Guests can add a short caption (max 300 chars).', val: allowCaption, set: setAllowCaption },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1">
                <div>
                  <div className="text-xs font-bold text-white">{item.label}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{item.sub}</div>
                </div>
                <button
                  type="button"
                  onClick={() => item.set(!item.val)}
                  className={`w-11 h-6 rounded-full transition-colors ${item.val ? 'bg-premium-success' : 'bg-zinc-700'} flex items-center ${item.val ? 'justify-end pr-0.5' : 'pl-0.5'}`}
                >
                  <div className="w-5 h-5 rounded-full bg-white" />
                </button>
              </div>
            ))}

            <div>
              <label className="text-xs text-zinc-400 font-bold block mb-1.5">Max uploads per guest</label>
              <input
                type="number"
                value={maxUploads}
                onChange={(e) => setMaxUploads(e.target.value)}
                className="w-24 bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold"
              />
            </div>
          </div>

          {/* Drive link */}
          <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-premium-neon" />
              Google Drive Backup
            </h4>
            {driveConnected ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-premium-success/10 border border-premium-success/30">
                <Check className="w-4 h-4 text-premium-success flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-premium-success">Connected</div>
                  <div className="text-[10px] text-zinc-400 truncate">{driveLink || 'drive.google.com/…'}</div>
                </div>
                <button type="button" onClick={() => setDriveConnected(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <input
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/…"
                  className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-neon font-mono"
                />
                <button
                  type="button"
                  onClick={() => { if (driveLink) setDriveConnected(true); }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold scale-on-click bg-premium-neon/10 text-premium-neon border border-premium-neon/30 hover:bg-premium-neon/20 flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Connect Google Drive
                </button>
              </>
            )}
            <p className="text-[10px] text-zinc-600">Photos will auto-sync to this folder every 30 minutes.</p>
          </div>

          {/* Share link */}
          <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Share2 className="w-3.5 h-3.5 text-premium-gold" />
              Guest Upload Link
            </h4>
            <div className="flex items-center gap-2 bg-premium-surfaceDark border border-premium-borderDark rounded-xl px-3 py-2">
              <span className="text-[10px] font-mono text-premium-neon flex-1 truncate">all41.app/photos/bea-migs</span>
              <button
                type="button"
                onClick={() => { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }}
                className="text-zinc-400 hover:text-white"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-premium-success" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right: photo grid */}
        <div className="xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              {displayed.length} photos shown
            </span>
            <div className="flex gap-2">
              <button type="button" className="px-3 py-1.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 text-[10px] font-bold hover:text-white flex items-center gap-1.5">
                <Download className="w-3 h-3" /> Export all
              </button>
            </div>
          </div>

          <div className={`${gridView === 'masonry' ? 'columns-3 gap-3 space-y-3' : 'grid grid-cols-3 gap-3'}`}>
            {displayed.map((photo, idx) => (
              <div
                key={photo.id}
                className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${GRADIENT_PALETTES[idx % GRADIENT_PALETTES.length]} border group ${
                  photo.approved ? 'border-premium-borderDark' : 'border-amber-500/40'
                } ${activeFrame === 'polaroid' ? 'p-2 bg-white' : ''}`}
                style={{ breakInside: 'avoid', aspectRatio: idx % 3 === 0 ? '3/4' : '1' }}
              >
                {/* Photo placeholder art */}
                <div
                  className={`w-full h-full min-h-[80px] flex items-center justify-center rounded-xl ${
                    activeFrame === 'thin' ? 'border-2 border-white/20' : ''
                  }`}
                  style={{ filter: PHOTO_FILTERS.find((f) => f.id === activeFilter)?.css || undefined }}
                >
                  <Camera className="w-6 h-6 text-white/20" />
                </div>

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => toggleFeatured(photo.id)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${photo.featured ? 'bg-premium-gold' : 'bg-white/20'}`}
                    >
                      {photo.featured ? <Star className="w-3 h-3 text-black" /> : <StarOff className="w-3 h-3 text-white" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="w-6 h-6 rounded-full bg-premium-danger/80 flex items-center justify-center"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-white">{photo.guest}</div>
                    <div className="text-[8px] text-white/60">{photo.time}</div>
                    {!photo.approved && (
                      <button
                        type="button"
                        onClick={() => toggleApproved(photo.id)}
                        className="mt-1.5 w-full py-1 rounded-lg bg-premium-success text-black text-[9px] font-bold"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </div>

                {/* Status badges */}
                {!photo.approved && (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-amber-500 text-black text-[8px] font-bold">
                    Pending
                  </div>
                )}
                {photo.featured && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-premium-gold flex items-center justify-center">
                    <Star className="w-3 h-3 text-black" />
                  </div>
                )}
              </div>
            ))}

            {/* Upload placeholder */}
            <div className="rounded-2xl border-2 border-dashed border-premium-borderDark bg-premium-surfaceDark flex flex-col items-center justify-center gap-2 min-h-[80px] cursor-pointer hover:border-premium-gold/50" style={{ breakInside: 'avoid' }}>
              <ImagePlus className="w-5 h-5 text-zinc-600" />
              <span className="text-[9px] text-zinc-600">Add photo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
