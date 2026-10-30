'use client';

import React, { useEffect, useRef, useState } from 'react';
import { StageFrameShell } from '@/components/stage/StageFrameShell';
import type { StageFrame } from '@/lib/eventStore';
import { moduleOutputPath, parseSource, type Scene } from '@/lib/screensApi';

/** Screens are laid out 1080 units high (width follows their shape) and scaled to their real size. */
export const DESIGN_HEIGHT = 1080;
export const designWidth = (width: number, height: number) => Math.max(1, Math.round((width * DESIGN_HEIGHT) / height));

/** Scales a fixed-size screen into its container, centred, with black bars where the shapes differ. */
export function FitBox({ width, height, className = '', children }: { width: number; height: number; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setScale(Math.min(el.clientWidth / width, el.clientHeight / height));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);

  return (
    <div ref={ref} className={`relative overflow-hidden bg-black ${className}`}>
      {scale > 0 && (
        <div
          className="absolute left-1/2 top-1/2"
          style={{ width, height, transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center' }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

const NO_FRAME: StageFrame = {
  preset: 'none', imageUrl: '', imageBlend: 'normal', footerOn: false, footerText: '', footerLogo: true, footerStyle: 'dark', footerImageUrl: '',
};
export const sceneFrame = (frame: Partial<StageFrame> | undefined): StageFrame => ({ ...NO_FRAME, ...(frame ?? {}) });

type SceneLike = Pick<Scene, 'kind' | 'media' | 'options' | 'frame'>;

/**
 * Slides and images: the current one fades in over the last. Neighbours are kept loaded and the rest are fetched in
 * the background, so stepping through never waits or flashes.
 */
function ImageStack({ urls, index, fit, onReady }: { urls: string[]; index: number; fit: 'contain' | 'cover'; onReady?: () => void }) {
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const readySent = useRef(false);
  const current = urls[index] ?? urls[0];

  // Warm the browser cache with every image, nearest first.
  useEffect(() => {
    const order = urls.map((u, i) => ({ u, d: Math.abs(i - index) })).sort((a, b) => a.d - b.d).map((x) => x.u);
    let cancelled = false;
    (async () => {
      for (const u of order) {
        if (cancelled) return;
        const img = new Image();
        img.src = u;
        await img.decode().catch(() => undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [urls, index]);

  useEffect(() => {
    if (current && loaded[current] && !readySent.current) {
      readySent.current = true;
      onReady?.();
    }
  }, [current, loaded, onReady]);

  const near = new Set([index - 1, index, index + 1, index + 2].filter((i) => i >= 0 && i < urls.length).map((i) => urls[i]));
  return (
    <div className="absolute inset-0 bg-black">
      {urls.map((u) =>
        near.has(u) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={u}
            src={u}
            alt=""
            draggable={false}
            onLoad={() => setLoaded((l) => (l[u] ? l : { ...l, [u]: true }))}
            className={`absolute inset-0 w-full h-full transition-opacity duration-500 ease-out ${fit === 'cover' ? 'object-cover' : 'object-contain'}`}
            style={{ opacity: u === current && loaded[u] ? 1 : 0 }}
          />
        ) : null,
      )}
    </div>
  );
}

function VideoPlayer({ url, loop, sound, playing, fit, onReady }: { url: string; loop: boolean; sound: boolean; playing: boolean; fit: 'contain' | 'cover'; onReady?: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (playing) v.play().catch(() => {
      // Sound needs a click on the output first; play silently until then.
      v.muted = true;
      v.play().catch(() => undefined);
    });
    else v.pause();
  }, [playing, url]);
  return (
    <video
      ref={ref}
      src={url}
      muted={!sound}
      loop={loop}
      playsInline
      preload="auto"
      onCanPlay={onReady}
      className={`absolute inset-0 w-full h-full bg-black ${fit === 'cover' ? 'object-cover' : 'object-contain'}`}
    />
  );
}

/** A custom scene: slides, images or a video inside its frame and footer. */
export function SceneContent({ scene, slide, playing, sound, logo, onReady }: {
  scene: SceneLike;
  slide: number;
  /** Outputs play videos and run image slideshows; small previews stay still. */
  playing: boolean;
  sound: boolean;
  logo?: string | null;
  onReady?: () => void;
}) {
  const fit = scene.options.fit === 'cover' ? 'cover' : 'contain';
  const urls = scene.media.map((m) => m.url);
  const [auto, setAuto] = useState({ from: slide, at: slide });

  // Image slideshows move on by themselves while playing, starting from the slide the switcher chose.
  const seconds = Math.max(2, Number(scene.options.seconds) || 8);
  useEffect(() => {
    if (scene.kind !== 'images' || !playing || urls.length < 2) return;
    const t = window.setInterval(() => setAuto((a) => ({ from: slide, at: (a.from === slide ? a.at + 1 : slide + 1) % urls.length })), seconds * 1000);
    return () => window.clearInterval(t);
  }, [scene.kind, playing, urls.length, seconds, slide]);
  const index = scene.kind === 'images' && auto.from === slide ? auto.at : Math.min(slide, Math.max(0, urls.length - 1));

  // Nothing uploaded yet: still "ready", so a take never hangs.
  useEffect(() => {
    if (!urls.length) onReady?.();
  }, [urls.length, onReady]);

  return (
    <StageFrameShell frame={sceneFrame(scene.frame)} logoRef={logo ?? undefined} className="w-full h-full bg-black">
      <div className="relative flex-1 min-h-0">
        {!urls.length ? (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600 font-mono text-2xl">No media yet</div>
        ) : scene.kind === 'video' ? (
          <VideoPlayer url={urls[0]} loop={scene.options.loop !== false} sound={!!scene.options.sound && sound} playing={playing} fit={fit} onReady={onReady} />
        ) : (
          <ImageStack urls={urls} index={index} fit={fit} onReady={onReady} />
        )}
      </div>
    </StageFrameShell>
  );
}

/**
 * One source drawn at a screen's design size: a stage module (the stage page in output mode) or a custom scene.
 * onReady fires once it has something to show, so a take can fade over only when the next source is ready.
 */
export function SourceView({ source, scene, slug, slide, wallKey, logo, playing, sound = false, onReady }: {
  source: string;
  scene: SceneLike | null;
  slug: string;
  slide: number;
  wallKey?: string | null;
  logo?: string | null;
  playing: boolean;
  sound?: boolean;
  onReady?: () => void;
}) {
  const parsed = parseSource(source);
  if (parsed?.kind === 'module') {
    return <ModuleFrame src={moduleOutputPath(slug, parsed.id, wallKey)} title={parsed.id} onReady={onReady} />;
  }
  if (parsed?.kind === 'scene' && scene) {
    return <SceneContent scene={scene} slide={slide} playing={playing} sound={sound} logo={logo} onReady={onReady} />;
  }
  return <BlankScreen onReady={onReady} />;
}

/**
 * A stage module through the stage page in output mode. It is ready once the stage itself is on the page (not the
 * event's loading notice), plus a moment for its first data.
 */
function ModuleFrame({ src, title, onReady }: { src: string; title: string; onReady?: () => void }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const loaded = () => {
    const started = Date.now();
    const check = () => {
      let found = false;
      try {
        found = !!ref.current?.contentDocument?.querySelector('[data-stage-root]');
      } catch {
        // Another origin: fall back to the timeout below.
      }
      if (found || Date.now() - started > 8000) {
        timers.current.push(window.setTimeout(() => onReady?.(), 500));
        return;
      }
      timers.current.push(window.setTimeout(check, 150));
    };
    check();
  };

  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      tabIndex={-1}
      onLoad={loaded}
      className="absolute inset-0 w-full h-full border-0 pointer-events-none bg-black"
    />
  );
}

function BlankScreen({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return <div className="absolute inset-0 bg-black" />;
}
