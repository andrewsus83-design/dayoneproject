'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  AlertCircle, Camera, CheckCircle2, ChevronRight, Download, Frame, Images, RefreshCw, RotateCcw, Share2, ShieldCheck,
  Sparkles, SwitchCamera, Upload, X,
} from 'lucide-react';
import { readAsset, useAssetUrl, type ShotConfig } from '@/lib/eventStore';
import {
  MAX_CAPTION, MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, guestPhotoApi, photoErrorMessage, type GuestPhotoState, type UploadJob,
} from '@/lib/photoWallApi';
import {
  CUSTOM_FRAME_PREFIX, SHOT_EFFECTS, SHOT_FILTERS, SHOT_FRAMES, SHOT_HEIGHT, SHOT_WIDTH, loadCanvasImage, renderLook,
  type Look, type LookAssets,
} from '@/lib/shotLooks';

/*
 * Shot: the guest app's camera once the guest is checked in, like the Instagram / TikTok story camera. A live,
 * full-screen viewfinder with the filters, effects and frames the organizer switched on; tap for a photo, hold for
 * a video (up to 60 s). Looks are baked into the file, which posts to the photo wall (photos ≤ 2 MB, videos ≤ 20 MB)
 * and/or goes to the phone's share sheet for social media.
 */

type Shot = { file: File; url: string; kind: 'image' | 'video' };
type Source = { kind: 'camera' } | { kind: 'image'; img: HTMLImageElement } | { kind: 'video'; el: HTMLVideoElement; url: string };

const MAX_VIDEO_MS = 60_000;
const HOLD_MS = 280;
const PHOTO_WIDTH = 1080;
const PHOTO_HEIGHT = 1920;

const FILTER_LABELS: Record<string, string> = { normal: 'Normal', ...Object.fromEntries(SHOT_FILTERS.map((f) => [f.id, f.label])) };
const EFFECT_LABELS: Record<string, string> = { none: 'None', ...Object.fromEntries(SHOT_EFFECTS.map((f) => [f.id, f.label])) };

/** The phone's share sheet with the file, or a download where sharing files is not supported. */
async function shareFile(file: File, title: string): Promise<'shared' | 'saved' | 'cancelled'> {
  const data: ShareData = { files: [file], title };
  if (typeof navigator !== 'undefined' && navigator.canShare?.(data)) {
    try {
      await navigator.share(data);
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'saved';
}

/** A WebP (or JPEG) of the canvas at most 2 MB. */
async function canvasPhoto(canvas: HTMLCanvasElement): Promise<Blob> {
  for (const q of [0.9, 0.82, 0.72, 0.6]) {
    let blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', q));
    if (!blob || blob.type !== 'image/webp') blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', q));
    if (blob && blob.size <= MAX_PHOTO_BYTES) return blob;
  }
  throw new Error('That photo came out too big. Please try again.');
}

function stopTracks(ref: React.RefObject<MediaStream | null>) {
  ref.current?.getTracks().forEach((t) => t.stop());
  ref.current = null;
}

function recorderMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const options = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return options.find((m) => MediaRecorder.isTypeSupported?.(m)) ?? '';
}

/* ───────────────────────── Camera ───────────────────────── */

interface CameraProps {
  filters: string[];
  effects: string[];
  frames: { id: string; label: string }[];
  initialLook: Look;
  assets: React.RefObject<LookAssets>;
  onDone: (shot: Shot) => void;
  onClose: () => void;
}

function ShotCamera({ filters, effects, frames, initialLook, assets, onDone, onClose }: CameraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<Source>({ kind: 'camera' });
  const lookRef = useRef<Look>(initialLook);
  const facingRef = useRef<'user' | 'environment'>('environment');
  const t0 = useRef(0);
  const holdTimer = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const swipeX = useRef<number | null>(null);

  const [look, setLookState] = useState<Look>(initialLook);
  const [facing, setFacing] = useState<'user' | 'environment'>('environment');
  const [source, setSourceState] = useState<Source>({ kind: 'camera' });
  const [camError, setCamError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sheet, setSheet] = useState<'frames' | 'effects' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setLook = (patch: Partial<Look>) => {
    lookRef.current = { ...lookRef.current, ...patch };
    setLookState(lookRef.current);
  };
  const setSource = (next: Source) => {
    const prev = sourceRef.current;
    if (prev.kind === 'video' && prev !== next) {
      prev.el.pause();
      URL.revokeObjectURL(prev.url);
    }
    sourceRef.current = next;
    setSourceState(next);
  };

  // The camera (with the microphone when allowed, for videos).
  useEffect(() => {
    if (source.kind !== 'camera') {
      stopTracks(streamRef);
      return;
    }
    let cancelled = false;
    facingRef.current = facing;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamError('This browser cannot open the camera. Pick a photo or video from your gallery instead.');
        return;
      }
      const video = { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } };
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
        } catch {
          if (!cancelled) setCamError('Allow camera access for this site in your browser settings, or pick from your gallery.');
          return;
        }
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      stopTracks(streamRef);
      streamRef.current = stream;
      const el = videoRef.current;
      if (el) {
        el.srcObject = stream;
        el.muted = true;
        await el.play().catch(() => undefined);
      }
      setCamError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [facing, source.kind]);

  // Draw every frame: the camera or the gallery pick, with the chosen look.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    t0.current = performance.now();
    let raf = 0;
    const tick = () => {
      const t = (performance.now() - t0.current) / 1000;
      const src = sourceRef.current;
      const a = assets.current;
      if (a) {
        if (src.kind === 'camera') {
          const v = videoRef.current;
          if (v && v.videoWidth) renderLook(ctx, v, v.videoWidth, v.videoHeight, lookRef.current, a, { mirror: facingRef.current === 'user', t });
        } else if (src.kind === 'image') {
          renderLook(ctx, src.img, src.img.naturalWidth, src.img.naturalHeight, lookRef.current, a, { fit: 'contain', t });
        } else if (src.el.videoWidth) {
          renderLook(ctx, src.el, src.el.videoWidth, src.el.videoHeight, lookRef.current, a, { fit: 'contain', t });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [assets]);

  // Leaving the camera: stop everything.
  useEffect(
    () => () => {
      stopTracks(streamRef);
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      const src = sourceRef.current;
      if (src.kind === 'video') {
        src.el.pause();
        URL.revokeObjectURL(src.url);
      }
      void audioCtxRef.current?.close();
    },
    [],
  );

  // Recording time, for the ring and the timer.
  useEffect(() => {
    if (!recording) return;
    const started = performance.now();
    const timer = window.setInterval(() => {
      const ms = performance.now() - started;
      setElapsed(ms);
      if (ms >= MAX_VIDEO_MS) recorderRef.current?.stop();
    }, 100);
    return () => window.clearInterval(timer);
  }, [recording]);

  const takePhoto = async () => {
    const a = assets.current;
    if (!a) return;
    setBusy('Saving your photo…');
    try {
      const out = document.createElement('canvas');
      out.width = PHOTO_WIDTH;
      out.height = PHOTO_HEIGHT;
      const ctx = out.getContext('2d')!;
      const src = sourceRef.current;
      const t = (performance.now() - t0.current) / 1000;
      if (src.kind === 'camera') {
        const v = videoRef.current;
        if (!v || !v.videoWidth) throw new Error('The camera is not ready yet.');
        renderLook(ctx, v, v.videoWidth, v.videoHeight, lookRef.current, a, { mirror: facingRef.current === 'user', t });
      } else if (src.kind === 'image') {
        renderLook(ctx, src.img, src.img.naturalWidth, src.img.naturalHeight, lookRef.current, a, { fit: 'contain', t });
      }
      const blob = await canvasPhoto(out);
      const file = new File([blob], `shot-${Date.now()}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`, { type: blob.type });
      onDone({ file, url: URL.createObjectURL(file), kind: 'image' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not take the photo.');
    } finally {
      setBusy(null);
    }
  };

  /** Records the canvas (with the looks) plus the given sound, up to 60 s. */
  const record = (audio: MediaStreamTrack[], onStopped?: () => void) => {
    const canvas = canvasRef.current;
    const mime = recorderMime();
    if (!canvas || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      setError('This browser cannot record video here. Take a photo instead.');
      return;
    }
    const picture = canvas.captureStream(30);
    const stream = new MediaStream([...picture.getVideoTracks(), ...audio]);
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 2_200_000, audioBitsPerSecond: 96_000 });
    } catch {
      setError('This browser cannot record video here. Take a photo instead.');
      return;
    }
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      picture.getTracks().forEach((t) => t.stop());
      setRecording(false);
      setElapsed(0);
      onStopped?.();
      const type = (rec.mimeType || mime || 'video/webm').split(';')[0];
      const blob = new Blob(chunks, { type });
      if (!blob.size) return setError('The video did not record. Please try again.');
      if (blob.size > MAX_VIDEO_BYTES) return setError('That video is over 20 MB. Record a shorter one.');
      const file = new File([blob], `shot-${Date.now()}.${type.includes('mp4') ? 'mp4' : 'webm'}`, { type });
      onDone({ file, url: URL.createObjectURL(file), kind: 'video' });
    };
    recorderRef.current = rec;
    rec.start(1000);
    setRecording(true);
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  /** A gallery video plays through the looks and is recorded again (in real time, up to 60 s). */
  const applyToVideo = () => {
    const src = sourceRef.current;
    if (src.kind !== 'video') return;
    const el = src.el;
    let audio: MediaStreamTrack[] = [];
    try {
      const ctx = audioCtxRef.current ?? new AudioContext();
      audioCtxRef.current = ctx;
      void ctx.resume();
      const dest = ctx.createMediaStreamDestination();
      ctx.createMediaElementSource(el).connect(dest);
      audio = dest.stream.getAudioTracks();
    } catch {
      // Without sound rather than not at all.
    }
    el.loop = false;
    el.muted = audio.length === 0;
    el.currentTime = 0;
    void el.play();
    el.onended = stopRecording;
    record(audio, () => {
      el.onended = null;
      el.pause();
    });
  };

  const onShutterDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Keep getting this finger's events even if it slides off the button while recording.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (busy || recording) return;
    const src = sourceRef.current;
    if (src.kind !== 'camera' || camError) return;
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      record(streamRef.current?.getAudioTracks() ?? []);
    }, HOLD_MS);
  };
  const onShutterUp = () => {
    if (recording) return stopRecording();
    if (busy) return;
    const src = sourceRef.current;
    if (src.kind === 'camera') {
      if (holdTimer.current === null) return;
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
      void takePhoto();
    } else if (src.kind === 'image') {
      void takePhoto();
    } else {
      applyToVideo();
    }
  };

  const pickFromGallery = async (file: File | undefined) => {
    if (galleryRef.current) galleryRef.current.value = '';
    if (!file) return;
    setError(null);
    const url = URL.createObjectURL(file);
    if (file.type.startsWith('video/')) {
      const el = document.createElement('video');
      el.src = url;
      el.playsInline = true;
      el.muted = true;
      el.loop = true;
      el.crossOrigin = 'anonymous';
      await el.play().catch(() => undefined);
      setSource({ kind: 'video', el, url });
    } else {
      const img = await loadCanvasImage(url);
      URL.revokeObjectURL(url);
      if (!img) return setError('That photo could not be opened.');
      setSource({ kind: 'image', img });
    }
  };

  const filterIds = useMemo(() => ['normal', ...filters], [filters]);
  const stepFilter = (dir: 1 | -1) => {
    const i = filterIds.indexOf(lookRef.current.filter);
    setLook({ filter: filterIds[(i + dir + filterIds.length) % filterIds.length] });
  };

  const seconds = Math.floor(elapsed / 1000);
  const progress = Math.min(1, elapsed / MAX_VIDEO_MS);
  const ring = 2 * Math.PI * 38;
  const shutterHint = source.kind === 'camera' ? 'Tap for photo · Hold for video' : source.kind === 'image' ? 'Tap to use this photo' : 'Tap to apply the look (plays through once)';

  return (
    <div className="fixed inset-0 z-50 bg-black flex justify-center select-none">
      <div className="relative w-full max-w-[420px] h-full overflow-hidden">
        <video ref={videoRef} playsInline muted className="hidden" />
        <canvas
          ref={canvasRef}
          width={SHOT_WIDTH}
          height={SHOT_HEIGHT}
          className="absolute inset-0 w-full h-full object-contain touch-pan-y"
          onPointerDown={(e) => { swipeX.current = e.clientX; }}
          onPointerUp={(e) => {
            if (swipeX.current === null) return;
            const dx = e.clientX - swipeX.current;
            swipeX.current = null;
            if (Math.abs(dx) > 50) stepFilter(dx < 0 ? 1 : -1);
          }}
        />

        {camError && source.kind === 'camera' && (
          <div className="absolute inset-x-6 top-1/3 p-6 rounded-[2rem] glass-panel text-center space-y-3">
            <Camera className="w-8 h-8 text-premium-gold mx-auto" />
            <p className="text-sm text-white leading-relaxed">{camError}</p>
            <button type="button" onClick={() => galleryRef.current?.click()} className="px-5 py-2.5 rounded-xl bg-premium-gold text-black font-display font-bold text-sm shadow-gold scale-on-click">
              Pick from gallery
            </button>
          </div>
        )}

        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 p-4 pt-[max(1rem,env(safe-area-inset-top))] flex items-center justify-between">
          <button
            type="button"
            onClick={() => (source.kind === 'camera' ? onClose() : setSource({ kind: 'camera' }))}
            disabled={recording}
            className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-white scale-on-click"
            aria-label={source.kind === 'camera' ? 'Close the camera' : 'Back to the camera'}
          >
            <X className="w-5 h-5" />
          </button>
          {recording ? (
            <span className="px-3 py-1 rounded-full bg-premium-danger text-white text-xs font-mono font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> 0:{String(seconds).padStart(2, '0')} / 1:00
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full glass-panel text-white text-xs font-bold">{FILTER_LABELS[look.filter] ?? 'Normal'}</span>
          )}
          <span className="w-10" />
        </div>

        {/* Side tools */}
        {!recording && (
          <div className="absolute right-3 top-24 flex flex-col gap-3">
            {source.kind === 'camera' && (
              <button type="button" onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))} className="w-11 h-11 rounded-full glass-panel flex items-center justify-center text-white scale-on-click" aria-label="Flip camera">
                <SwitchCamera className="w-5 h-5" />
              </button>
            )}
            {frames.length > 1 && (
              <button type="button" onClick={() => setSheet(sheet === 'frames' ? null : 'frames')} className={`w-11 h-11 rounded-full glass-panel flex items-center justify-center scale-on-click ${look.frame !== 'none' ? 'text-premium-gold' : 'text-white'}`} aria-label="Frames">
                <Frame className="w-5 h-5" />
              </button>
            )}
            {effects.length > 0 && (
              <button type="button" onClick={() => setSheet(sheet === 'effects' ? null : 'effects')} className={`w-11 h-11 rounded-full glass-panel flex items-center justify-center scale-on-click ${look.effect !== 'none' ? 'text-premium-neon' : 'text-white'}`} aria-label="Effects">
                <Sparkles className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {(error || busy) && (
          <div className="absolute inset-x-6 top-20 px-4 py-2.5 rounded-2xl glass-panel text-center text-xs text-white">
            {busy ?? error}
          </div>
        )}

        {/* Bottom: frames / effects sheet, filter carousel, shutter */}
        <div className="absolute bottom-0 inset-x-0 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4">
          {sheet && !recording && (
            <div className="mx-3 p-3 rounded-[1.5rem] glass-panel">
              <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                {(sheet === 'frames' ? frames : [{ id: 'none', label: 'None' }, ...effects.map((id) => ({ id, label: EFFECT_LABELS[id] ?? id }))]).map((o) => {
                  const active = sheet === 'frames' ? look.frame === o.id : look.effect === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setLook(sheet === 'frames' ? { frame: o.id } : { effect: o.id })}
                      className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold scale-on-click ${active ? 'bg-premium-gold text-black' : 'bg-white/10 text-white'}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!recording && filterIds.length > 1 && (
            <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 snap-x">
              {filterIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLook({ filter: id })}
                  className={`snap-center shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold scale-on-click ${look.filter === id ? 'bg-white text-black' : 'bg-black/40 text-white border border-white/20'}`}
                >
                  {FILTER_LABELS[id] ?? id}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-around px-8">
            <input ref={galleryRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => pickFromGallery(e.target.files?.[0])} />
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              disabled={recording}
              className={`w-11 h-11 rounded-xl glass-panel flex items-center justify-center text-white scale-on-click ${recording ? 'opacity-0' : ''}`}
              aria-label="Pick from gallery"
            >
              <Images className="w-5 h-5" />
            </button>
            <button
              type="button"
              onPointerDown={onShutterDown}
              onPointerUp={onShutterUp}
              onPointerCancel={() => {
                if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
                holdTimer.current = null;
                stopRecording();
              }}
              onContextMenu={(e) => e.preventDefault()}
              disabled={!!busy || (source.kind === 'camera' && !!camError)}
              className="relative w-20 h-20 flex items-center justify-center touch-none disabled:opacity-50"
              aria-label={source.kind === 'camera' ? 'Tap for a photo, hold for a video' : 'Use this'}
            >
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80" aria-hidden>
                <circle cx="40" cy="40" r="38" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="4" />
                {recording && (
                  <circle cx="40" cy="40" r="38" fill="none" stroke="#FF3366" strokeWidth="4" strokeDasharray={ring} strokeDashoffset={ring * (1 - progress)} strokeLinecap="round" />
                )}
              </svg>
              <span className={`rounded-full transition-all ${recording ? 'w-8 h-8 rounded-lg bg-premium-danger' : source.kind === 'camera' ? 'w-16 h-16 bg-white' : 'w-16 h-16 bg-premium-gold'}`} />
            </button>
            <span className="w-11" />
          </div>
          <p className="text-center text-[11px] text-white/80 font-bold drop-shadow">{recording ? 'Release to stop' : shutterHint}</p>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Tab ───────────────────────── */

export function GuestShot({ slug, token, eventName, dateLabel, primary, logoRef, shot: options, sample }: {
  slug: string;
  token: string | null;
  eventName: string;
  dateLabel: string;
  primary: string;
  logoRef: string;
  shot: ShotConfig;
  sample: boolean;
}) {
  const [wall, setWall] = useState<GuestPhotoState | null>(null);
  const [phase, setPhase] = useState<'home' | 'camera' | 'review'>('home');
  const [shot, setShot] = useState<Shot | null>(null);
  const [caption, setCaption] = useState('');
  const [step, setStep] = useState<'idle' | 'compressing' | 'uploading' | 'saving'>('idle');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [agreeing, setAgreeing] = useState(false);
  const [posted, setPosted] = useState(false);
  const jobRef = useRef<UploadJob>({});
  const fontRef = useRef<HTMLSpanElement>(null);
  const assetsRef = useRef<LookAssets>({ eventName, dateLabel, primary, fontFamily: 'sans-serif', logo: null, customFrames: {} });
  const logoUrl = useAssetUrl(logoRef);

  // Only the looks the organizer switched on (and frames that still exist).
  const custom = options.customFrames;
  const frameOptions = useMemo(() => {
    const names: Record<string, string> = {
      ...Object.fromEntries(SHOT_FRAMES.map((f) => [f.id, f.label])),
      ...Object.fromEntries(custom.map((f) => [`${CUSTOM_FRAME_PREFIX}${f.id}`, f.name])),
    };
    return [{ id: 'none', label: 'No frame' }, ...options.frames.filter((id) => names[id]).map((id) => ({ id, label: names[id] }))];
  }, [options.frames, custom]);
  const filters = useMemo(() => options.filters.filter((id) => FILTER_LABELS[id]), [options.filters]);
  const effects = useMemo(() => options.effects.filter((id) => EFFECT_LABELS[id]), [options.effects]);
  const initialLook: Look = {
    filter: 'normal',
    effect: 'none',
    frame: frameOptions.some((f) => f.id === options.defaultFrame) ? options.defaultFrame : 'none',
  };

  // The event's name, colour, logo and uploaded frames for the frames.
  const customKey = custom.map((f) => f.url).join('|');
  useEffect(() => {
    let alive = true;
    Promise.all([loadCanvasImage(logoUrl), ...custom.map((f) => loadCanvasImage(readAsset(f.url)))]).then(([logo, ...images]) => {
      if (!alive) return;
      assetsRef.current = {
        eventName,
        dateLabel,
        primary,
        fontFamily: fontRef.current ? getComputedStyle(fontRef.current).fontFamily : 'sans-serif',
        logo,
        customFrames: Object.fromEntries(custom.map((f, i) => [f.id, images[i]])),
      };
    });
    return () => {
      alive = false;
    };
    // customKey stands in for the uploaded frames.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoUrl, customKey, eventName, dateLabel, primary]);

  const refresh = useCallback(async () => {
    if (sample || !token) return;
    try {
      setWall(await guestPhotoApi.state(token));
    } catch {
      // The camera and sharing still work without the wall.
    }
  }, [sample, token]);

  useEffect(() => {
    // Loads once; setState happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  // Free the last shot's memory when it changes or the tab closes.
  useEffect(() => () => {
    if (shot) URL.revokeObjectURL(shot.url);
  }, [shot]);

  // The camera and review cover the whole screen; the page behind them should not scroll.
  useEffect(() => {
    if (phase === 'home') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  const share = async () => {
    if (!shot) return;
    const result = await shareFile(shot.file, eventName);
    if (result === 'saved') setMessage({ tone: 'ok', text: 'Saved to your phone. Post it from your gallery to any app.' });
  };

  const agree = async () => {
    if (!token) return;
    setAgreeing(true);
    setMessage(null);
    try {
      await guestPhotoApi.consent(token);
      await refresh();
    } catch (e) {
      setMessage({ tone: 'error', text: photoErrorMessage(e) });
    } finally {
      setAgreeing(false);
    }
  };

  const post = async () => {
    if (!shot || !token || !wall) return;
    setMessage(null);
    try {
      const item = await guestPhotoApi.upload(token, shot.file, wall.captions_enabled ? caption : '', jobRef.current, setStep);
      jobRef.current = {};
      setPosted(true);
      if (item.status === 'approved') confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      setMessage({ tone: 'ok', text: item.status === 'approved' ? 'It’s on the photo wall!' : 'Sent! The host approves it before it shows on the wall.' });
    } catch (e) {
      setMessage({ tone: 'error', text: photoErrorMessage(e) });
    } finally {
      setStep('idle');
      await refresh();
    }
  };

  const done = (next: Shot) => {
    setShot(next);
    setCaption('');
    setMessage(null);
    setPosted(false);
    // The shot is final (looks baked in, within the size limits), so the upload sends it as it is.
    jobRef.current = { blob: next.file };
    setPhase('review');
  };

  const busy = step !== 'idle';
  const remaining = wall ? Math.max(0, wall.photo_quota - wall.photos_used) : 0;
  const wallReady = !!wall && wall.enabled && wall.checked_in && wall.uploads_open;
  const stepLabel = step === 'compressing' ? 'Optimizing…' : step === 'uploading' ? 'Uploading…' : 'Saving…';

  return (
    <div className="space-y-4">
      <span ref={fontRef} className="font-display hidden" aria-hidden />

      <div className="relative overflow-hidden rounded-[2.5rem] border border-premium-gold/30 bg-premium-charcoal p-8 text-center space-y-4 shadow-gold">
        <div className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-premium-gold/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-premium-neon/10 blur-3xl pointer-events-none" />
        <h2 className="relative text-2xl font-display font-bold text-white">Shot</h2>
        <p className="relative text-[13px] text-zinc-400">Capture the moment with the event&apos;s frames and filters. Post it to the photo wall or share it to your socials.</p>
        <button
          type="button"
          onClick={() => setPhase('camera')}
          className="relative mx-auto w-24 h-24 rounded-full bg-premium-gold hover:bg-premium-goldHover text-black flex items-center justify-center shadow-gold scale-on-click"
          aria-label="Open the camera"
        >
          <Camera className="w-10 h-10" />
        </button>
        <p className="relative text-[11px] text-zinc-500 font-mono">Tap for photo · Hold for video</p>
        {wall?.enabled && <p className="relative text-[11px] text-zinc-500 font-mono">{wall.photos_used}/{wall.photo_quota} posted to the wall</p>}
      </div>

      {!sample && (
        <Link href={`/events/${slug}/photowall`} className="flex items-center gap-3 p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark hover:border-zinc-600 scale-on-click">
          <Images className="w-5 h-5 text-premium-neon flex-shrink-0" />
          <span className="flex-1 text-[13px] font-bold text-white">My posts &amp; event album</span>
          <ChevronRight className="w-4 h-4 text-zinc-600" />
        </Link>
      )}

      {phase === 'camera' && (
        <ShotCamera
          filters={filters}
          effects={effects}
          frames={frameOptions}
          initialLook={initialLook}
          assets={assetsRef}
          onDone={done}
          onClose={() => setPhase('home')}
        />
      )}

      {phase === 'review' && shot && (
        <div className="fixed inset-0 z-50 bg-black flex justify-center">
          <div className="relative w-full max-w-[420px] h-full flex flex-col">
            <div className="relative flex-1 min-h-0">
              {shot.kind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shot.url} alt="Your shot" className="absolute inset-0 w-full h-full object-contain" />
              ) : (
                <video src={shot.url} autoPlay loop playsInline controls className="absolute inset-0 w-full h-full object-contain" />
              )}
              <button
                type="button"
                onClick={() => setPhase('home')}
                disabled={busy}
                className="absolute top-4 left-4 mt-[env(safe-area-inset-top)] w-10 h-10 rounded-full glass-panel flex items-center justify-center text-white scale-on-click"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3 bg-premium-black border-t border-premium-borderDark">
              {message && (
                <div className={`p-3 rounded-2xl text-xs flex items-start gap-2 border text-white ${message.tone === 'ok' ? 'bg-premium-success/10 border-premium-success/40' : 'bg-premium-danger/10 border-premium-danger/50'}`}>
                  {message.tone === 'ok' ? <CheckCircle2 className="w-4 h-4 text-premium-success flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-premium-danger flex-shrink-0" />}
                  <span>{message.text}</span>
                </div>
              )}

              {!sample && wallReady && wall && !posted && (
                !wall.consented_at ? (
                  <div className="p-3 rounded-2xl bg-premium-charcoal border border-premium-gold/40 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-white"><ShieldCheck className="w-4 h-4 text-premium-gold" /> Share on the photo wall</div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Your posts show on the event&apos;s wall and album with your first name and initial.
                      {wall.moderation === 'manual' ? ' The host approves each one first.' : ''} You can remove them any time; they are deleted 30 days after the event.
                    </p>
                    <button type="button" onClick={agree} disabled={agreeing} className="w-full py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click disabled:opacity-60">
                      {agreeing ? 'Saving…' : 'I agree'}
                    </button>
                  </div>
                ) : remaining <= 0 ? (
                  <p className="text-[12px] text-zinc-400">You&apos;ve posted {wall.photo_quota} to the wall. Remove one in My posts to add another. You can still share this.</p>
                ) : (
                  <>
                    {wall.captions_enabled && (
                      <textarea
                        rows={2}
                        maxLength={MAX_CAPTION}
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Add a caption…"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-sm text-white focus:outline-none focus:border-premium-gold resize-none"
                      />
                    )}
                    <button
                      type="button"
                      onClick={post}
                      disabled={busy}
                      className="w-full py-3.5 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {busy ? stepLabel : wall.moderation === 'manual' ? 'Send to the wall for approval' : 'Post to the photo wall'}
                    </button>
                  </>
                )
              )}
              {!sample && wall && !wallReady && (
                <p className="text-[11px] text-zinc-500 text-center">{wall.enabled ? 'Posting to the wall has closed.' : "The host hasn't opened the photo wall yet."} You can still share this.</p>
              )}
              {sample && <p className="text-[11px] text-zinc-500 text-center">This is a sample event, so nothing is posted to a wall.</p>}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPhase('camera')}
                  disabled={busy}
                  className="py-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-white font-bold text-sm scale-on-click flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <RotateCcw className="w-4 h-4" /> Retake
                </button>
                <button
                  type="button"
                  onClick={share}
                  disabled={busy}
                  className="py-3 rounded-2xl bg-premium-surfaceDark border border-premium-neon/40 text-white font-bold text-sm scale-on-click flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {typeof navigator !== 'undefined' && 'share' in navigator ? <Share2 className="w-4 h-4 text-premium-neon" /> : <Download className="w-4 h-4 text-premium-neon" />}
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
