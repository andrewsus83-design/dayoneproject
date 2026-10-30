'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, Star, Trash2, Upload } from 'lucide-react';
import { deleteAsset, formatEventDate, readAsset, saveAsset, useAssetUrl, useEventConfig, type ShotConfig } from '@/lib/eventStore';
import { paletteColors } from '@/lib/eventTheme';
import {
  CUSTOM_FRAME_PREFIX, PLAIN_LOOK, SHOT_EFFECTS, SHOT_FILTERS, SHOT_FRAMES, loadCanvasImage, renderLook, samplePicture,
  type Look, type LookAssets,
} from '@/lib/shotLooks';

const label = 'text-[10px] font-mono uppercase tracking-widest text-zinc-500';

/** One look drawn on the sample scene. */
function LookPreview({ look, assets }: { look: Look; assets: LookAssets | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx || !assets) return;
    const scene = samplePicture();
    renderLook(ctx, scene, scene.width, scene.height, look, assets, { t: 1.3 });
  }, [look, assets]);
  return <canvas ref={ref} width={180} height={320} className="w-full aspect-[9/16] rounded-xl bg-black" />;
}

/** A look the organizer switches on or off, previewed on the sample scene. */
function Tile({ name, on, look, assets, onToggle, children }: { name: string; on: boolean; look: Look; assets: LookAssets | null; onToggle: () => void; children?: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border p-2 space-y-2 transition-all ${on ? 'border-premium-gold/60 bg-premium-surfaceDark shadow-gold' : 'border-premium-borderDark bg-premium-black/50 opacity-70'}`}>
      <button type="button" onClick={onToggle} className="block w-full scale-on-click" aria-pressed={on}>
        <LookPreview look={look} assets={assets} />
      </button>
      <div className="flex items-center justify-between gap-1">
        <button type="button" onClick={onToggle} className="flex items-center gap-1.5 min-w-0 text-left scale-on-click">
          <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${on ? 'bg-premium-gold border-premium-gold' : 'border-zinc-600'}`}>
            {on && <Check className="w-3 h-3 text-black" />}
          </span>
          <span className="text-[11px] font-bold text-white truncate">{name}</span>
        </button>
        {children}
      </div>
    </div>
  );
}

/** Turns an uploaded frame into a 1080×1920 WebP (PNG where the browser cannot write WebP), keeping transparency. */
async function frameDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadCanvasImage(url);
    if (!img) throw new Error('That file could not be read as an image.');
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    canvas.getContext('2d')!.drawImage(img, 0, 0, 1080, 1920);
    const webp = canvas.toDataURL('image/webp', 0.9);
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * The organizer picks the filters, effects and frames guests get in the guest app's Shot camera, and can upload
 * their own frames. Saved with the event's design, so guests see changes once the event is saved.
 */
export function ShotSettings({ eventId }: { eventId: string }) {
  const { config, update } = useEventConfig(eventId);
  const shot = config.design.shot;
  const logoUrl = useAssetUrl(config.design.logoUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const fontRef = useRef<HTMLSpanElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<LookAssets | null>(null);

  const customUrls = shot.customFrames.map((f) => f.url).join('|');
  const primary = paletteColors(config.design).primary;
  const eventName = config.info.name || 'Our Event';
  const dateLabel = config.info.startDate ? formatEventDate(config.info.startDate, 'short') : '';

  // Load the logo and uploaded frames for the previews.
  useEffect(() => {
    let alive = true;
    const frames = shot.customFrames;
    Promise.all([
      loadCanvasImage(logoUrl),
      ...frames.map((f) => loadCanvasImage(readAsset(f.url))),
    ]).then(([logo, ...images]) => {
      if (!alive) return;
      setAssets({
        eventName,
        dateLabel,
        primary,
        fontFamily: fontRef.current ? getComputedStyle(fontRef.current).fontFamily : 'sans-serif',
        logo,
        customFrames: Object.fromEntries(frames.map((f, i) => [f.id, images[i]])),
      });
    });
    return () => {
      alive = false;
    };
    // customUrls stands in for the frames list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoUrl, customUrls, eventName, dateLabel, primary]);

  const save = (patch: Partial<ShotConfig>) => {
    const r = update('design', { shot: { ...shot, ...patch } });
    setError(r.ok ? null : r.error ?? 'Could not save.');
  };
  const toggle = (key: 'filters' | 'effects' | 'frames', id: string) => {
    const on = shot[key].includes(id);
    const next = on ? shot[key].filter((x) => x !== id) : [...shot[key], id];
    save({ [key]: next, ...(key === 'frames' && on && shot.defaultFrame === id ? { defaultFrame: 'none' } : {}) });
  };

  const upload = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('image/')) return setError('Upload a PNG (or WebP) frame with a see-through middle.');
    if (file.size > 10 * 1024 * 1024) return setError('That frame is over 10 MB. Export it smaller and try again.');
    try {
      const saved = saveAsset(await frameDataUrl(file));
      if (!saved.ok || !saved.ref) return setError(saved.error ?? 'Could not keep the frame on this device.');
      const id = saved.ref.slice('asset:'.length);
      const frameId = `${CUSTOM_FRAME_PREFIX}${id}`;
      save({
        customFrames: [...shot.customFrames, { id, name: file.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'My frame', url: saved.ref }],
        frames: [...shot.frames, frameId],
        defaultFrame: frameId,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that frame.');
    }
  };

  const removeCustom = (id: string) => {
    const frame = shot.customFrames.find((f) => f.id === id);
    if (!frame || !confirm(`Remove the frame “${frame.name}”?`)) return;
    const frameId = `${CUSTOM_FRAME_PREFIX}${id}`;
    if (frame.url.startsWith('asset:')) deleteAsset(frame.url);
    save({
      customFrames: shot.customFrames.filter((f) => f.id !== id),
      frames: shot.frames.filter((f) => f !== frameId),
      defaultFrame: shot.defaultFrame === frameId ? 'none' : shot.defaultFrame,
    });
  };

  const frameTiles = useMemo(
    () => [
      ...shot.customFrames.map((f) => ({ id: `${CUSTOM_FRAME_PREFIX}${f.id}`, label: f.name, customId: f.id })),
      ...SHOT_FRAMES.map((f) => ({ ...f, customId: null as string | null })),
    ],
    [shot.customFrames],
  );

  return (
    <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-6">
      <span ref={fontRef} className="font-display hidden" aria-hidden />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-display font-bold text-white flex items-center gap-2"><Camera className="w-5 h-5 text-premium-gold" /> Shot camera</h4>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            After check-in, guests get Shot in the guest app: a camera for photos and videos (up to 20 MB) with the filters,
            effects and frames you switch on here. Guests see changes after you save the event.
          </p>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="px-4 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-xs shadow-gold scale-on-click flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" /> Upload your frame
        </button>
      </div>
      {error && <p className="text-xs text-premium-danger font-bold">{error}</p>}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className={label}>Frames</p>
          <p className="text-[10px] text-zinc-500">Tap the star to open the camera with that frame. Your own frame: PNG, 1080×1920, see-through middle.</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {frameTiles.map((f) => (
            <Tile key={f.id} assets={assets} name={f.label} on={shot.frames.includes(f.id)} look={{ ...PLAIN_LOOK, frame: f.id }} onToggle={() => toggle('frames', f.id)}>
              <span className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => save({ defaultFrame: f.id, frames: shot.frames.includes(f.id) ? shot.frames : [...shot.frames, f.id] })}
                  className={`p-1 rounded-md scale-on-click ${shot.defaultFrame === f.id ? 'text-premium-gold' : 'text-zinc-600 hover:text-zinc-300'}`}
                  title={shot.defaultFrame === f.id ? 'The camera opens with this frame' : 'Open the camera with this frame'}
                >
                  <Star className={`w-3.5 h-3.5 ${shot.defaultFrame === f.id ? 'fill-current' : ''}`} />
                </button>
                {f.customId && (
                  <button type="button" onClick={() => removeCustom(f.customId!)} className="p-1 rounded-md text-zinc-600 hover:text-premium-danger scale-on-click" title="Remove this frame">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
            </Tile>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className={label}>Filters</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {SHOT_FILTERS.map((f) => (
            <Tile key={f.id} assets={assets} name={f.label} on={shot.filters.includes(f.id)} look={{ ...PLAIN_LOOK, filter: f.id }} onToggle={() => toggle('filters', f.id)} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className={label}>Effects</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {SHOT_EFFECTS.map((f) => (
            <Tile key={f.id} assets={assets} name={f.label} on={shot.effects.includes(f.id)} look={{ ...PLAIN_LOOK, effect: f.id }} onToggle={() => toggle('effects', f.id)} />
          ))}
        </div>
      </section>
    </div>
  );
}
