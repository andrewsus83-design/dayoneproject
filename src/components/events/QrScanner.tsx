'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2 } from 'lucide-react';

/** The browser's built-in QR reader (Chrome/Android, Safari 17+); not in TypeScript's DOM types yet. */
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
interface BarcodeDetectorClass {
  new (options: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

type Detect = (video: HTMLVideoElement) => Promise<string | null>;

/** BarcodeDetector where the browser has it; otherwise jsQR, loaded only when a desk turns its camera on. */
async function makeDetector(): Promise<Detect> {
  const Native = (window as unknown as { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector;
  if (Native) {
    try {
      const formats = await Native.getSupportedFormats?.();
      if (!formats || formats.includes('qr_code')) {
        const detector = new Native({ formats: ['qr_code'] });
        return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
      }
    } catch {
      // fall through to jsQR
    }
  }
  const { default: jsQR } = await import('jsqr');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return async (video) => {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!ctx || !w || !h) return null;
    const scale = Math.min(1, 720 / Math.max(w, h));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
  };
}

type CameraState = 'off' | 'starting' | 'on' | 'denied' | 'unavailable';

const SCAN_EVERY_MS = 200;
const AUTO_START_KEY = 'd1-desk-camera';

/**
 * Camera QR scanner for the register desk. Shows the brand viewfinder (gold corners and scan line); `overlay` is
 * drawn on top of the video (scan results). The same code is ignored for `repeatMs`, so holding a pass in front of
 * the camera checks it in once. Detection stops while `paused`.
 */
export function QrScanner({
  onScan,
  paused = false,
  repeatMs = 4000,
  overlay,
  className = '',
}: {
  onScan: (text: string) => void;
  paused?: boolean;
  repeatMs?: number;
  overlay?: React.ReactNode;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectRef = useRef<Detect | null>(null);
  const lastRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const onScanRef = useRef(onScan);
  const pausedRef = useRef(paused);
  const [state, setState] = useState<CameraState>('off');

  useEffect(() => {
    onScanRef.current = onScan;
    pausedRef.current = paused;
  }, [onScan, paused]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setState('off');
    try {
      sessionStorage.removeItem(AUTO_START_KEY);
    } catch {}
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unavailable');
      return;
    }
    setState('starting');
    try {
      const [stream, detect] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }),
        detectRef.current ? Promise.resolve(detectRef.current) : makeDetector(),
      ]);
      detectRef.current = detect;
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }
      setState('on');
      try {
        sessionStorage.setItem(AUTO_START_KEY, '1');
      } catch {}
    } catch (e) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const name = e instanceof DOMException ? e.name : '';
      setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
    }
  }, []);

  // A desk that had its camera on keeps it on after a reload (the browser remembers the permission).
  useEffect(() => {
    let auto = false;
    try {
      auto = sessionStorage.getItem(AUTO_START_KEY) === '1';
    } catch {}
    const t = auto ? window.setTimeout(() => void start(), 0) : 0;
    return () => {
      window.clearTimeout(t);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [start]);

  useEffect(() => {
    if (state !== 'on') return;
    let busy = false;
    const timer = window.setInterval(async () => {
      const video = videoRef.current;
      const detect = detectRef.current;
      if (busy || pausedRef.current || !video || !detect || video.readyState < 2) return;
      busy = true;
      try {
        const text = (await detect(video))?.trim();
        if (text) {
          const now = Date.now();
          const last = lastRef.current;
          if (text !== last.text || now - last.at > repeatMs) {
            lastRef.current = { text, at: now };
            onScanRef.current(text);
          }
        }
      } catch {
        // a frame that cannot be read is skipped
      } finally {
        busy = false;
      }
    }, SCAN_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [state, repeatMs]);

  const live = state === 'on';

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity ${live ? 'opacity-100' : 'opacity-0'}`}
      />
      {live && <div className="absolute inset-0 bg-premium-black/20 pointer-events-none" />}

      {!overlay && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {[
            'top-6 left-6 border-t-2 border-l-2',
            'top-6 right-6 border-t-2 border-r-2',
            'bottom-6 left-6 border-b-2 border-l-2',
            'bottom-6 right-6 border-b-2 border-r-2',
          ].map((cls) => (
            <div key={cls} className={`absolute w-8 h-8 rounded-sm border-premium-gold ${cls}`} />
          ))}
          {/* A quarter-height band whose bottom edge is the laser; the keyframes move it by its own height. */}
          <div className="absolute top-0 left-[17.5%] right-[17.5%] h-1/4 animate-scan-line pointer-events-none bg-gradient-to-b from-transparent to-premium-gold/10 border-b-2 border-premium-gold/70" />

          {!live && (
            <div className="relative flex flex-col items-center gap-3 px-8 text-center">
              {state === 'starting' ? (
                <Loader2 className="w-10 h-10 text-premium-gold animate-spin" />
              ) : (
                <Camera className="w-12 h-12 text-zinc-600" />
              )}
              <p className="text-[12px] text-zinc-400 font-medium">
                {state === 'denied'
                  ? 'Camera blocked. Allow the camera for this site in the browser settings.'
                  : state === 'unavailable'
                  ? 'No camera here. Use a USB scanner or type the code below.'
                  : 'Point the camera at the guest’s QR pass'}
              </p>
              {(state === 'off' || state === 'denied') && (
                <button
                  type="button"
                  onClick={() => void start()}
                  className="px-4 py-2 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-xs shadow-gold scale-on-click flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" /> Turn on camera
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {overlay && <div className="absolute inset-0 flex items-center justify-center bg-premium-black/70">{overlay}</div>}

      {live && !overlay && (
        <button
          type="button"
          onClick={stop}
          className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-premium-black/70 border border-premium-borderDark text-[11px] font-bold text-zinc-300 hover:text-white scale-on-click flex items-center gap-1.5"
        >
          <CameraOff className="w-3.5 h-3.5" /> Camera off
        </button>
      )}
    </div>
  );
}
