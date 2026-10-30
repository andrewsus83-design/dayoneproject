'use client';

import React, { Suspense, use, useCallback, useEffect, useState } from 'react';
import { DESIGN_HEIGHT, FitBox, SourceView, designWidth } from '@/components/screens/ScreenView';
import { ScreenControls } from '@/components/screens/ScreenControls';
import { useScreenFeed, type ScreenFeed } from '@/lib/screensApi';
import { BrandMark } from '@/components/BrandMark';

interface Layer {
  /** A new key means a different source (or a new version of the scene): it loads underneath and fades in. */
  key: string;
  source: string;
  slide: number;
  scene: ScreenFeed['scene'];
}

const FADE_MS = 600;
/** If the next source is still not ready after this, show it anyway rather than hold the old one forever. */
const READY_TIMEOUT_MS = 6000;

const layerOf = (feed: ScreenFeed): Layer => ({
  key: `${feed.screen.program.source}|${feed.scene?.updated_at ?? ''}`,
  source: feed.screen.program.source,
  slide: feed.screen.program.slide,
  scene: feed.scene,
});

/**
 * One live screen (LED wall, side screen, TV) at /live/<screen id>: shows what the switcher took live, full screen,
 * with no pointer and no controls. A new source is loaded underneath and crossfades in once it is ready, so the
 * audience never sees a blank or a loading page. Click once to start: that allows full screen and the video's sound.
 * It lives outside /events/<slug> so no event loading notice ever shows on air.
 */
function ScreenOutput({ screenId }: { screenId: string }) {
  const { feed, state } = useScreenFeed(screenId);
  const [shown, setShown] = useState<Layer | null>(null);
  const [incoming, setIncoming] = useState<Layer | null>(null);
  const [fading, setFading] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!feed) return;
    const layer = layerOf(feed);
    // Following the server's feed into the two layers on air.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!shown) {
      setShown(layer);
    } else if (layer.key === shown.key) {
      // Same source: only the slide moves (the slides crossfade on their own); drop any half-loaded take.
      if (layer.slide !== shown.slide) setShown(layer);
      if (incoming) setIncoming(null);
    } else if (layer.key === incoming?.key) {
      if (layer.slide !== incoming.slide) setIncoming(layer);
    } else {
      setFading(false);
      setIncoming(layer);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [feed, shown, incoming]);

  const incomingKey = incoming?.key ?? null;
  const ready = useCallback(() => setFading(true), []);

  // Show the next source even if it never reports ready.
  useEffect(() => {
    if (!incomingKey) return;
    const t = window.setTimeout(() => setFading(true), READY_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [incomingKey]);

  // After the fade, the incoming layer is the one on air (same key, so it is not reloaded).
  useEffect(() => {
    if (!fading || !incoming) return;
    const t = window.setTimeout(() => {
      setShown(incoming);
      setIncoming(null);
      setFading(false);
    }, FADE_MS);
    return () => window.clearTimeout(t);
  }, [fading, incoming]);

  const start = () => {
    setStarted(true);
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => undefined);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'f' && e.key !== 'F') return;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
      else document.documentElement.requestFullscreen().catch(() => undefined);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const width = feed?.screen.width ?? 1920;
  const height = feed?.screen.height ?? 1080;
  const layers = [shown, incoming].filter((l): l is Layer => !!l);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none" style={{ cursor: started ? 'none' : 'default' }} onClick={started ? undefined : start}>
      {/* Nothing on air may show a pointer once the screen is running (except the controls at the top edge). */}
      {started && <style>{'*{cursor:none !important}'}</style>}
      {/* Screen managers land on their switcher, organizers on their events. */}
      <ScreenControls backHref="/dashboard" />

      <div className="absolute inset-0">
      <FitBox width={designWidth(width, height)} height={DESIGN_HEIGHT} className="w-full h-full">
        {layers.map((layer) => {
          const isIncoming = layer === incoming;
          return (
            <div
              key={layer.key}
              className="absolute inset-0"
              style={{
                zIndex: isIncoming ? 2 : 1,
                opacity: isIncoming ? (fading ? 1 : 0) : 1,
                transition: isIncoming ? `opacity ${FADE_MS}ms ease-in-out` : undefined,
              }}
            >
              <SourceView
                source={layer.source}
                scene={layer.scene}
                slug={feed?.event.slug ?? ''}
                slide={layer.slide}
                wallKey={feed?.event.wall_key}
                logo={feed?.event.logo}
                playing
                sound={started}
                onReady={isIncoming ? ready : undefined}
              />
            </div>
          );
        })}
      </FitBox>
      </div>

      {state === 'missing' && !shown && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-600 font-mono text-sm">This screen is no longer set up.</div>
      )}

      {!started && feed && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="px-8 py-6 rounded-[2rem] bg-premium-charcoal border border-premium-gold/40 text-center space-y-2 shadow-gold">
            <BrandMark size={40} className="mx-auto" />
            <div className="text-xl font-display font-bold text-white">{feed.screen.name}</div>
            <div className="text-xs font-mono text-zinc-400">{width} × {height}</div>
            <div className="text-sm text-premium-gold font-bold pt-2">Click anywhere to start this screen</div>
            <div className="text-[11px] text-zinc-500">It goes full screen and hides the pointer. Move the pointer to the top edge for Back, Full screen and Close.</div>
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
    <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
      <Wrapper params={params} />
    </Suspense>
  );
}
