'use client';

import React, { Component, Suspense, use, useEffect, useReducer, useState } from 'react';
import { DESIGN_HEIGHT, FitBox, SourceView, designWidth } from '@/components/screens/ScreenView';
import { ScreenControls } from '@/components/screens/ScreenControls';
import { FpsMeter } from '@/components/screens/FpsMeter';
import { useScreenFeed, type ScreenFeed } from '@/lib/screensApi';
import { useWakeLock } from '@/lib/useWakeLock';
import { BrandMark } from '@/components/BrandMark';

interface Layer {
  /** A new key means a different source (or a new version of the scene). */
  key: string;
  source: string;
  slide: number;
  scene: ScreenFeed['scene'];
  /** Which try this is: a retry mounts the source again from scratch. */
  attempt: number;
}

const FADE_MS = 600;
/** How long to wait before trying a source that failed to load again: 2 s, 4 s, 8 s, 15 s, then every 30 s. */
const RETRY_MS = [2000, 4000, 8000, 15_000, 30_000];
/** If the source on air crashes, it starts over after this. */
const RESTART_MS = 4000;

const layerOf = (feed: ScreenFeed): Layer => ({
  key: `${feed.screen.program.source}|${feed.scene?.updated_at ?? ''}`,
  source: feed.screen.program.source,
  slide: feed.screen.program.slide,
  scene: feed.scene,
  attempt: 0,
});
const domKey = (l: Layer) => `${l.key}#${l.attempt}`;

/**
 * What is on air, and what is loading to replace it. The next source loads on a layer above the current one, out of
 * sight, and only fades in when it reports ready. If it fails, the current one stays on air and the next one is tried
 * again after a wait; the branded standby behind both is what shows when nothing has loaded yet.
 */
interface Air {
  shown: Layer | null;
  incoming: Layer | null;
  /** The incoming source is ready and fading in. */
  fading: boolean;
  /** The incoming source failed to load and waits to be tried again. */
  failed: string | null;
  /** The source on air crashed and waits to restart (the standby shows meanwhile). */
  shownDown: boolean;
}

type Action =
  | { type: 'feed'; layer: Layer }
  | { type: 'ready'; dom: string }
  | { type: 'fail'; dom: string; reason: string }
  | { type: 'retry' }
  | { type: 'faded' }
  | { type: 'crash'; dom: string }
  | { type: 'restart' };

const START: Air = { shown: null, incoming: null, fading: false, failed: null, shownDown: false };

function airReducer(air: Air, action: Action): Air {
  switch (action.type) {
    case 'feed': {
      const { layer } = action;
      if (air.shown && layer.key === air.shown.key) {
        // What is on air is what the server says: only the slide may move; drop any take that was loading.
        const shown = layer.slide !== air.shown.slide ? { ...air.shown, slide: layer.slide } : air.shown;
        if (shown === air.shown && !air.incoming) return air;
        return { ...air, shown, incoming: null, fading: false, failed: null };
      }
      if (air.incoming && layer.key === air.incoming.key) {
        return layer.slide !== air.incoming.slide ? { ...air, incoming: { ...air.incoming, slide: layer.slide } } : air;
      }
      return { ...air, incoming: layer, fading: false, failed: null };
    }
    case 'ready':
      return air.incoming && domKey(air.incoming) === action.dom && !air.failed && !air.fading ? { ...air, fading: true } : air;
    case 'fail':
      return air.incoming && domKey(air.incoming) === action.dom && !air.fading && air.failed !== action.reason
        ? { ...air, failed: action.reason }
        : air;
    case 'retry':
      return air.incoming && air.failed ? { ...air, incoming: { ...air.incoming, attempt: air.incoming.attempt + 1 }, failed: null } : air;
    case 'faded':
      return air.incoming && air.fading ? { shown: air.incoming, incoming: null, fading: false, failed: null, shownDown: false } : air;
    case 'crash':
      if (air.shown && domKey(air.shown) === action.dom) return air.shownDown ? air : { ...air, shownDown: true };
      return air.incoming && domKey(air.incoming) === action.dom && !air.failed ? { ...air, failed: 'This screen stopped working while loading.' } : air;
    case 'restart':
      return air.shown && air.shownDown ? { ...air, shown: { ...air.shown, attempt: air.shown.attempt + 1 }, shownDown: false } : air;
  }
}

/** A source that throws while drawing must not take the whole output down. */
class LayerBoundary extends Component<{ onCrash: () => void; children: React.ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  componentDidCatch() {
    this.props.onCrash();
  }
  render() {
    return this.state.crashed ? null : this.props.children;
  }
}

/**
 * What shows when nothing has loaded yet, or the source on air fell over: the event's name and logo, calm and still
 * (no spinner). Drawn in the screen's design space, so it never pokes out into the black bars of a differently shaped display.
 */
function Standby({ feed, message }: { feed: ScreenFeed | null; message?: string }) {
  const [logoOk, setLogoOk] = useState(true);
  const logo = feed?.event.logo;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-10 bg-premium-black text-center px-24">
      {logo && logoOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" onError={() => setLogoOk(false)} className="max-h-72 max-w-xl object-contain" />
      ) : (
        <BrandMark size={140} />
      )}
      {feed && <div className="font-display font-bold text-white/90 tracking-tight text-6xl leading-tight">{feed.event.name}</div>}
      {message && <div className="font-mono text-zinc-500 text-2xl">{message}</div>}
    </div>
  );
}

/**
 * One live screen (LED wall, side screen, TV) at /live/<screen id>: shows what the switcher took live, full screen,
 * with no pointer and no controls. A new source is loaded underneath and crossfades in once it is ready, so the
 * audience never sees a blank or a loading page; if it cannot load, the current one stays on air and the new one is
 * tried again. It keeps the display awake and the connection alive (retries, backoff, a copy of the last feed for a
 * restart without internet). Click once to start: that allows full screen and the video's sound.
 * It lives outside /events/<slug> so no event loading notice ever shows on air.
 */
function ScreenOutput({ screenId }: { screenId: string }) {
  const { feed, state } = useScreenFeed(screenId);
  const [air, dispatch] = useReducer(airReducer, START);
  const [started, setStarted] = useState(false);
  // The frame-rate readout for whoever runs the screen: key D, or ?debug=1 in the address.
  const [meter, setMeter] = useState(false);
  const wake = useWakeLock(true);
  const { shown, incoming, fading, failed, shownDown } = air;

  useEffect(() => {
    // Following the server's feed into the layers on air.
    if (feed) dispatch({ type: 'feed', layer: layerOf(feed) });
  }, [feed]);

  // After the fade, the incoming layer is the one on air (same key, so it is not reloaded).
  useEffect(() => {
    if (!fading) return;
    const t = window.setTimeout(() => dispatch({ type: 'faded' }), FADE_MS);
    return () => window.clearTimeout(t);
  }, [fading, incoming]);

  // A source that failed to load is tried again after a wait that grows; the current one stays on air meanwhile.
  const attempt = incoming?.attempt ?? 0;
  useEffect(() => {
    if (!failed) return;
    const t = window.setTimeout(() => dispatch({ type: 'retry' }), RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)]);
    return () => window.clearTimeout(t);
  }, [failed, attempt]);

  useEffect(() => {
    if (!shownDown) return;
    const t = window.setTimeout(() => dispatch({ type: 'restart' }), RESTART_MS);
    return () => window.clearTimeout(t);
  }, [shownDown]);

  // After a reload (or a restart of the computer's browser) the screen goes straight back on air; only the first start needs the click.
  const startedKey = `d1-live-started-${screenId}`;
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (window.sessionStorage.getItem(startedKey)) setStarted(true);
    } catch {
      // No session storage: the start card shows again after a reload.
    }
  }, [startedKey]);

  const start = () => {
    setStarted(true);
    try {
      window.sessionStorage.setItem(startedKey, '1');
    } catch {
      // Fine without.
    }
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => undefined);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).get('debug') === '1') setMeter(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        setMeter((on) => !on);
        return;
      }
      if (e.key !== 'f' && e.key !== 'F') return;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
      else document.documentElement.requestFullscreen().catch(() => undefined);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const width = feed?.screen.width ?? 1920;
  const height = feed?.screen.height ?? 1080;
  const layers = [shownDown ? null : shown, failed ? null : incoming].filter((l): l is Layer => !!l);

  const status = [
    state === 'offline' ? 'Offline: showing the last screen, retrying' : state === 'missing' ? 'This screen was removed' : state === 'live' ? 'Connected' : 'Connecting',
    failed ? `Next screen would not load (${failed}) · retrying` : null,
    wake === 'held' ? 'Display kept awake' : wake === 'unsupported' ? 'This browser cannot keep the display awake: turn off sleep in the computer settings' : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none" style={{ cursor: started ? 'none' : 'default' }} onClick={started ? undefined : start}>
      {/* Nothing on air may show a pointer once the screen is running (except the controls at the top edge). */}
      {started && <style>{'*{cursor:none !important}'}</style>}
      {/* Screen managers land on their switcher, organizers on their events. */}
      <ScreenControls backHref="/dashboard" status={status} />

      <div className="absolute inset-0">
        <FitBox width={designWidth(width, height)} height={DESIGN_HEIGHT} className="w-full h-full">
          {/* The standby sits under everything: it shows until the first source is ready, and whenever the one on air falls over. */}
          <Standby feed={feed} message={state === 'missing' && !shown ? 'This screen is no longer set up.' : undefined} />
          {layers.map((layer) => {
            const isIncoming = layer === incoming;
            const dom = domKey(layer);
            return (
              <div
                key={dom}
                className="absolute inset-0"
                style={{
                  zIndex: isIncoming ? 2 : 1,
                  opacity: isIncoming ? (fading ? 1 : 0) : 1,
                  transition: isIncoming ? `opacity ${FADE_MS}ms ease-in-out` : undefined,
                }}
              >
                <LayerBoundary onCrash={() => dispatch({ type: 'crash', dom })}>
                  <SourceView
                    source={layer.source}
                    scene={layer.scene}
                    slug={feed?.event.slug ?? ''}
                    slide={layer.slide}
                    wallKey={feed?.event.wall_key}
                    logo={feed?.event.logo}
                    // A take's video waits for its fade, so it starts from the beginning in front of the audience.
                    playing={!isIncoming || fading}
                    sound={started}
                    onReady={isIncoming ? () => dispatch({ type: 'ready', dom }) : undefined}
                    onFail={isIncoming ? (reason) => dispatch({ type: 'fail', dom, reason }) : undefined}
                  />
                </LayerBoundary>
              </div>
            );
          })}
        </FitBox>
      </div>

      {meter && <FpsMeter source={shown?.source} />}

      {!started && feed && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="px-8 py-6 rounded-[2rem] bg-premium-charcoal border border-premium-gold/40 text-center space-y-2 shadow-gold">
            <BrandMark size={40} className="mx-auto" />
            <div className="text-xl font-display font-bold text-white">{feed.screen.name}</div>
            <div className="text-xs font-mono text-zinc-400">{width} × {height}</div>
            <div className="text-sm text-premium-gold font-bold pt-2">Click anywhere to start this screen</div>
            <div className="text-[11px] text-zinc-500">It goes full screen and hides the pointer. Move the pointer to the top edge for Back, Full screen and Close. Press D for a frame-rate readout.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Wrapper({ params }: { params: Promise<{ screenId: string }> }) {
  const { screenId } = use(params);
  return <ScreenOutput screenId={screenId} />;
}

export default function LiveScreenPage({ params }: { params: Promise<{ screenId: string }> }) {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-premium-black" />}>
      <Wrapper params={params} />
    </Suspense>
  );
}
