'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StageFrameShell } from '@/components/stage/StageFrameShell';
import type { StageFrame } from '@/lib/eventStore';
import { moduleOutputPath, parseSource, sceneModule, type Scene, type SceneKind } from '@/lib/screensApi';
import { isHttpsUrl } from '@/lib/screenUrl';
import { normalizeLayout } from '@/lib/sceneLayout';
import { ItemsLayer, MainLayer, type OverlayState } from './SceneLayoutView';

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

/* ───────────────────────── Load states ─────────────────────────
 * Every source reports once, before it is shown: onReady (it has something to show: image decoded, video can play,
 * page loaded, stage on screen) or onFail with a reason (an error, or no answer within its time limit). Anything that
 * goes wrong after it was ready is handled quietly where it happens (a picture is tried again, a video restarts);
 * the output never reports a source that is already on air as failed. */

export type LoadState = { state: 'loading' } | { state: 'ready' } | { state: 'failed'; reason: string };

/** How long each kind of source may take before it counts as failed. Video files are the biggest. */
export const LOAD_TIMEOUT_MS: Record<SceneKind | 'module', number> = { slides: 20_000, images: 20_000, video: 45_000, web: 25_000, module: 15_000 };

/** Makes onReady and onFail fire at most once between them, and fails on its own after `timeoutMs`. */
export function useLoadGuard(timeoutMs: number, onReady?: () => void, onFail?: (reason: string) => void) {
  const handlers = useRef({ onReady, onFail });
  useEffect(() => {
    handlers.current = { onReady, onFail };
  });
  const done = useRef(false);
  const ready = useCallback(() => {
    if (done.current) return;
    done.current = true;
    handlers.current.onReady?.();
  }, []);
  const fail = useCallback((reason: string) => {
    if (done.current) return;
    done.current = true;
    handlers.current.onFail?.(reason);
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => fail('It is taking too long to load.'), timeoutMs);
    return () => window.clearTimeout(t);
  }, [timeoutMs, fail]);
  return { ready, fail };
}

/**
 * The load state of one source for a screen that shows it to an organizer (preview, editor). A new `resetKey`
 * starts again at loading; mount the source with the same key so it starts fresh too.
 */
export function useLoadState(resetKey: string) {
  const [stored, setStored] = useState<{ key: string; load: LoadState }>({ key: resetKey, load: { state: 'loading' } });
  const load: LoadState = stored.key === resetKey ? stored.load : { state: 'loading' };
  const onReady = useCallback(() => setStored({ key: resetKey, load: { state: 'ready' } }), [resetKey]);
  const onFail = useCallback((reason: string) => setStored({ key: resetKey, load: { state: 'failed', reason } }), [resetKey]);
  return { load, onReady, onFail };
}

/* ───────────────────────── Pictures ───────────────────────── */

const RETRY_PICTURE_MS = [2000, 5000, 10_000, 20_000, 30_000];

/**
 * Slides and images: the current one fades in over the last. Neighbours are kept loaded and the rest are fetched in
 * the background, so stepping through never waits or flashes. A picture counts as loaded once it is decoded, and one
 * that fails is tried again with growing waits.
 */
function ImageStack({ urls, index, fit, kenburns, driftSeconds, ready, fail }: {
  urls: string[];
  index: number;
  fit: 'contain' | 'cover';
  /** Drift and zoom slowly while a picture shows (the screen editor's Ken Burns effect). */
  kenburns: boolean;
  driftSeconds: number;
  ready: () => void;
  fail: (reason: string) => void;
}) {
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [tries, setTries] = useState<Record<string, number>>({});
  const current = urls[index] ?? urls[0];

  // Warm the browser cache with every image, nearest first. Each one once: decoding a big picture again and again
  // pushes the picture on show out of the browser's decoded-image memory, which shows as stutter on a big screen.
  const warmed = useRef(new Set<string>());
  useEffect(() => {
    const order = urls.map((u, i) => ({ u, d: Math.abs(i - index) })).sort((a, b) => a.d - b.d).map((x) => x.u);
    let cancelled = false;
    (async () => {
      for (const u of order) {
        if (cancelled) return;
        if (warmed.current.has(u)) continue;
        warmed.current.add(u);
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
    if (current && loaded[current]) ready();
  }, [current, loaded, ready]);

  const retryTimers = useRef<number[]>([]);
  useEffect(() => {
    const timers = retryTimers.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const broken = (u: string) => {
    if (u === current) fail('This picture could not be loaded. Check the link, or upload the file again.');
    const n = tries[u] ?? 0;
    if (n >= RETRY_PICTURE_MS.length) return;
    retryTimers.current.push(window.setTimeout(() => setTries((t) => ({ ...t, [u]: (t[u] ?? 0) + 1 })), RETRY_PICTURE_MS[n]));
  };

  const near = new Set([index - 1, index, index + 1, index + 2].filter((i) => i >= 0 && i < urls.length).map((i) => urls[i]));
  return (
    <div className="absolute inset-0 bg-black">
      {urls.map((u) =>
        near.has(u) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${u}#${tries[u] ?? 0}`}
            src={u}
            alt=""
            draggable={false}
            referrerPolicy="no-referrer"
            onLoad={(e) => {
              // Decoded before it counts: a picture that is still being drawn would flash in half-painted.
              e.currentTarget.decode().catch(() => undefined).then(() => setLoaded((l) => (l[u] ? l : { ...l, [u]: true })));
            }}
            onError={() => broken(u)}
            className={`absolute inset-0 w-full h-full ${kenburns ? '' : 'transition-opacity duration-500 ease-out'} ${fit === 'cover' ? 'object-cover' : 'object-contain'}`}
            style={
              kenburns
                ? {
                    // Its own layer, so the slow zoom is the graphics card scaling a finished picture, not a repaint.
                    willChange: 'transform, opacity',
                    opacity: u === current && loaded[u] ? 1 : 0,
                    // The picture on show zooms slowly; one that is leaving eases back while it fades, so nothing jumps.
                    transform: u === current && loaded[u] ? 'scale(1.1)' : 'scale(1)',
                    transition: u === current && loaded[u] ? `opacity 0.5s ease-out, transform ${driftSeconds}s linear` : 'opacity 0.5s ease-out, transform 0.6s ease-out',
                  }
                : { opacity: u === current && loaded[u] ? 1 : 0 }
            }
          />
        ) : null,
      )}
    </div>
  );
}

/* ───────────────────────── Video ───────────────────────── */

function VideoPlayer({ url, loop, sound, playing, fit, ready, fail }: { url: string; loop: boolean; sound: boolean; playing: boolean; fit: 'contain' | 'cover'; ready: () => void; fail: (reason: string) => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const wasReady = useRef(false);
  const errors = useRef(0);
  const retryTimer = useRef<number | undefined>(undefined);

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

  useEffect(() => () => window.clearTimeout(retryTimer.current), []);

  const broken = () => {
    if (!wasReady.current) {
      fail('This video could not be played. Use an MP4 or WebM file that opens in a browser.');
      return;
    }
    // It played before: the connection dropped. Start over after a wait that grows, up to 30 s.
    errors.current += 1;
    window.clearTimeout(retryTimer.current);
    retryTimer.current = window.setTimeout(() => {
      const v = ref.current;
      if (!v) return;
      v.load();
      if (playing) v.play().catch(() => undefined);
    }, Math.min(30_000, 1500 * 2 ** errors.current));
  };

  return (
    <video
      ref={ref}
      src={url}
      muted={!sound}
      loop={loop}
      playsInline
      preload="auto"
      onCanPlay={() => {
        wasReady.current = true;
        errors.current = 0;
        ready();
      }}
      onError={broken}
      className={`absolute inset-0 w-full h-full bg-black ${fit === 'cover' ? 'object-cover' : 'object-contain'}`}
    />
  );
}

/* ───────────────────────── Web pages and embeds ───────────────────────── */

/**
 * A web page or embed inside the screen. It counts as loaded when the frame finishes loading, a moment later so the
 * first paint is done. A browser never says whether a site refused to be framed, so that is checked on the server
 * before a link can be saved (/api/screen-probe); this catches what is left: a frame blocked by this app's own
 * security policy, and a page that does not answer.
 */
function WebFrame({ url, ready, fail }: { url: string; ready: () => void; fail: (reason: string) => void }) {
  // A page of this app itself would share its origin with the sandbox flags below, which defeats them.
  const ownPage = isHttpsUrl(url) && typeof window !== 'undefined' && new URL(url).origin === window.location.origin;
  const safe = isHttpsUrl(url) && !ownPage;

  useEffect(() => {
    if (!safe) fail(ownPage ? 'Pages of this app cannot be shown as a link. Use the Sources on the left instead.' : 'Only https links can be shown on a screen.');
  }, [safe, ownPage, fail]);

  useEffect(() => {
    const onViolation = (e: SecurityPolicyViolationEvent) => {
      if (e.effectiveDirective === 'frame-src' || e.effectiveDirective === 'child-src') {
        fail('The app’s security settings blocked this page from loading in a frame.');
      }
    };
    document.addEventListener('securitypolicyviolation', onViolation);
    return () => document.removeEventListener('securitypolicyviolation', onViolation);
  }, [fail]);

  const settle = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(settle.current), []);

  if (!safe) return <div className="absolute inset-0 bg-black" />;
  return (
    <iframe
      src={url}
      title="Linked page"
      tabIndex={-1}
      // The page keeps its own origin (no access to this app); scripts, sound and full screen are what embeds need.
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      referrerPolicy="strict-origin-when-cross-origin"
      onLoad={() => {
        window.clearTimeout(settle.current);
        settle.current = window.setTimeout(ready, 700);
      }}
      className="absolute inset-0 w-full h-full border-0 pointer-events-none bg-black"
    />
  );
}

/* ───────────────────────── A custom scene ───────────────────────── */

/**
 * A custom scene: slides, images, a video or a linked page inside its frame and footer, with whatever the screen editor
 * added (the content moved or zoomed, text, pictures, the logo, effects). A scene is ready once its content and every
 * added picture have loaded.
 */
export function SceneContent({ scene, slide, playing, sound, logo, slug, wallKey, replay = 0, bare = false, onReady, onFail, onOverlays }: {
  scene: SceneLike;
  slide: number;
  /** The screen draws its own header, frame and footer: leave out the scene's own (a stage module leaves out its header and ticker). */
  bare?: boolean;
  /** A stage module scene shows that module of this event (the photo wall also needs the wall key). */
  slug?: string;
  wallKey?: string | null;
  /** Outputs play videos and run image slideshows; small previews stay still. */
  playing: boolean;
  sound: boolean;
  logo?: string | null;
  /** The editor's "play the effects again". */
  replay?: number;
  onReady?: () => void;
  onFail?: (reason: string) => void;
  /** The editor follows the added pictures after the first load too (a picture added to a draft). */
  onOverlays?: (state: OverlayState) => void;
}) {
  const fit = scene.options.fit === 'cover' ? 'cover' : 'contain';
  // The same list every render unless the pictures change: a new array each time would restart the slideshow's
  // picture warm-up (decoding every picture again) on every render.
  const urlKey = scene.media.map((m) => m.url).join('\n');
  const urls = useMemo(() => (urlKey ? urlKey.split('\n') : []), [urlKey]);
  const layout = useMemo(() => normalizeLayout(scene.options.layout), [scene.options.layout]);
  const [auto, setAuto] = useState({ from: slide, at: slide });
  const { ready, fail } = useLoadGuard(LOAD_TIMEOUT_MS[scene.kind], onReady, onFail);

  // Ready = the content loaded and no added picture is still loading; an added picture that cannot load fails the scene.
  const [mainLoaded, setMainLoaded] = useState(false);
  const mainReady = useCallback(() => setMainLoaded(true), []);
  // No content yet counts as loaded, so a take never hangs. A stage module has no media: it counts once its stage is up.
  const moduleId = sceneModule(scene);
  const isModule = scene.kind === 'module';
  const mainOk = mainLoaded || (urls.length === 0 && !isModule);
  const [overlayRaw, setOverlayRaw] = useState<OverlayState>({ pending: 0, failed: 0 });
  const overlay = layout.items.length ? overlayRaw : NO_OVERLAY;
  // The editor follows the added pictures itself (it can delete a broken one), so for it only the content decides.
  const callerTracksOverlays = !!onOverlays;
  useEffect(() => {
    if (callerTracksOverlays) {
      if (mainOk) ready();
    } else if (overlay.failed > 0) fail('A picture added to this screen could not be loaded.');
    else if (mainOk && overlay.pending === 0) ready();
  }, [mainOk, overlay.pending, overlay.failed, callerTracksOverlays, ready, fail]);
  useEffect(() => {
    onOverlays?.(overlay);
  }, [overlay, onOverlays]);

  // Image slideshows move on by themselves while playing, starting from the slide the switcher chose.
  const seconds = Math.max(2, Number(scene.options.seconds) || 8);
  useEffect(() => {
    if (scene.kind !== 'images' || !playing || urls.length < 2) return;
    const t = window.setInterval(() => setAuto((a) => ({ from: slide, at: (a.from === slide ? a.at + 1 : slide + 1) % urls.length })), seconds * 1000);
    return () => window.clearInterval(t);
  }, [scene.kind, playing, urls.length, seconds, slide]);
  const index = scene.kind === 'images' && auto.from === slide ? auto.at : Math.min(slide, Math.max(0, urls.length - 1));

  const kenburns = layout.main.kenburns && (scene.kind === 'images' || scene.kind === 'slides');
  const driftSeconds = scene.kind === 'images' ? Math.max(6, seconds + 1) : 20;

  const content = (
    <div className="relative flex-1 min-h-0">
      {isModule ? (
        <MainLayer main={layout.main} playing={playing} replay={replay}>
          {moduleId && slug ? (
            <ModuleFrame src={moduleOutputPath(slug, moduleId, wallKey, bare)} title={moduleId} onReady={mainReady} onFail={fail} />
          ) : (
            <MissingSource onFail={fail} />
          )}
        </MainLayer>
      ) : !urls.length ? (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-600 font-mono text-2xl">No media yet</div>
      ) : (
        <MainLayer main={layout.main} playing={playing} replay={replay}>
          {scene.kind === 'web' ? (
            <WebFrame url={urls[0]} ready={mainReady} fail={fail} />
          ) : scene.kind === 'video' ? (
            <VideoPlayer url={urls[0]} loop={scene.options.loop !== false} sound={!!scene.options.sound && sound} playing={playing} fit={fit} ready={mainReady} fail={fail} />
          ) : (
            <ImageStack urls={urls} index={index} fit={fit} kenburns={kenburns} driftSeconds={driftSeconds} ready={mainReady} fail={fail} />
          )}
        </MainLayer>
      )}
    </div>
  );

  return (
    <div className="relative w-full h-full flex flex-col bg-black">
      {/* A stage module draws its own header, frame and ticker (or the screen's look does), never a scene frame. */}
      {bare || isModule ? (
        content
      ) : (
        <StageFrameShell frame={sceneFrame(scene.frame)} logoRef={logo ?? undefined} className="w-full h-full bg-black">
          {content}
        </StageFrameShell>
      )}
      {layout.items.length > 0 && <ItemsLayer items={layout.items} playing={playing} replay={replay} logo={logo} onState={setOverlayRaw} />}
    </div>
  );
}

const NO_OVERLAY: OverlayState = { pending: 0, failed: 0 };

/* ───────────────────────── A source ───────────────────────── */

/**
 * One source drawn at a screen's design size: a stage module (the stage page in output mode) or a custom scene.
 * It tells onReady when it has something to show, or onFail why not, so a take can go on air only when the next
 * source is ready.
 */
export function SourceView({ source, scene, slug, slide, wallKey, logo, playing, sound = false, bare = false, onReady, onFail }: {
  source: string;
  scene: SceneLike | null;
  slug: string;
  slide: number;
  wallKey?: string | null;
  logo?: string | null;
  playing: boolean;
  sound?: boolean;
  /** The screen draws its own header, frame and footer around this: the module leaves out its header and ticker, the scene its frame and footer. */
  bare?: boolean;
  onReady?: () => void;
  onFail?: (reason: string) => void;
}) {
  const parsed = parseSource(source);
  if (parsed?.kind === 'module') {
    return <ModuleFrame src={moduleOutputPath(slug, parsed.id, wallKey, bare)} title={parsed.id} onReady={onReady} onFail={onFail} />;
  }
  if (parsed?.kind === 'scene' && scene) {
    return <SceneContent scene={scene} slide={slide} playing={playing} sound={sound} logo={logo} slug={slug} wallKey={wallKey} bare={bare} onReady={onReady} onFail={onFail} />;
  }
  return <MissingSource onFail={onFail} />;
}

/**
 * A stage module through the stage page in output mode. It is ready once the stage itself is on the page (not the
 * event's loading notice), plus a moment for its first data. If the stage never appears (offline, the event is not
 * published) it fails instead of showing an error page.
 */
function ModuleFrame({ src, title, onReady, onFail }: { src: string; title: string; onReady?: () => void; onFail?: (reason: string) => void }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const timers = useRef<number[]>([]);
  const { ready, fail } = useLoadGuard(LOAD_TIMEOUT_MS.module, onReady, onFail);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  const loaded = () => {
    const started = Date.now();
    const check = () => {
      let found = false;
      try {
        found = !!ref.current?.contentDocument?.querySelector('[data-stage-root]');
      } catch {
        // Not our page (the browser's error page): keep looking until the time is up.
      }
      if (found) {
        timers.current.push(window.setTimeout(ready, 500));
        return;
      }
      if (Date.now() - started > 8000) {
        fail('The stage page did not start. Check the connection and that the event is published.');
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

/** The source named by a program is not there (deleted, or an unknown module): that is a failure, not a blank take. */
function MissingSource({ onFail }: { onFail?: (reason: string) => void }) {
  const { fail } = useLoadGuard(LOAD_TIMEOUT_MS.module, undefined, onFail);
  useEffect(() => {
    fail('That screen is not available any more.');
  }, [fail]);
  return <div className="absolute inset-0 bg-black" />;
}
