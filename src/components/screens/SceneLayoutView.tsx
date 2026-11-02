'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { useAssetUrl } from '@/lib/eventStore';
import { UNIT_PX, type Enter, type LayoutItem, type Look, type MainLayout } from '@/lib/sceneLayout';

/**
 * Draws what the screen editor added to a screen (lib/sceneLayout.ts): the scene's own content moved, zoomed and
 * styled, and the text, pictures and logo on top. The same components draw it in the editor, the preview and on the
 * big screen. Entrance effects wait (paused on their first frame) until `playing`, so on air they start together with
 * the crossfade instead of finishing out of sight while the screen loads.
 */

const GLOW_COLOR = { gold: 'var(--color-premium-gold)', neon: 'var(--color-premium-neon)', white: '#ffffff' } as const;
const TEXT_COLOR = { white: '#ffffff', gold: 'var(--color-premium-gold)', neon: 'var(--color-premium-neon)', black: 'var(--color-premium-black)' } as const;

const enterStyle = (enter: Enter, delay: number, playing: boolean): React.CSSProperties | undefined =>
  enter === 'none'
    ? undefined
    : { animation: `d1-fx-${enter} 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}s both`, animationPlayState: playing ? 'running' : 'paused' };

const loopStyle = (loop: Look['loop'], playing: boolean): React.CSSProperties | undefined =>
  loop === 'none' ? undefined : { animation: `d1-fx-${loop} ${loop === 'pulse' ? 2.4 : 3.6}s ease-in-out infinite`, animationPlayState: playing ? 'running' : 'paused' };

/**
 * Opacity, shadow and glow. The shadow and glow are drop-shadow filters (they follow the shape and chain into the broad
 * haze the editor shows). A filter on something that also floats or pulses is redone by the graphics card on every
 * frame, which is heavy for a weak card on a 4K screen: that combination is the costly one.
 */
function lookStyle(look: Look): React.CSSProperties {
  const filters: string[] = [];
  if (look.shadow === 'soft') filters.push('drop-shadow(0 0.4em 0.7em rgba(0,0,0,0.55))');
  if (look.shadow === 'strong') filters.push('drop-shadow(0 0.5em 1em rgba(0,0,0,0.9))');
  if (look.glow !== 'none') filters.push(`drop-shadow(0 0 0.5em ${GLOW_COLOR[look.glow]})`, `drop-shadow(0 0 1.2em ${GLOW_COLOR[look.glow]})`);
  return { opacity: look.opacity < 1 ? look.opacity : undefined, filter: filters.length ? filters.join(' ') : undefined };
}

/* ───────────────────────── The scene's own content ───────────────────────── */

/**
 * Wraps the picture, video or page: moved and zoomed as the manager set it, blurred or darkened, with its entrance
 * effect. With nothing set it adds no styles, so a scene that was never edited looks exactly as it did.
 */
export function MainLayer({ main, playing, replay, children }: { main: MainLayout; playing: boolean; replay: number; children: React.ReactNode }) {
  const enterRef = useRef<HTMLDivElement>(null);
  // Replay restarts the entrance without reloading what is inside (a video must not start over from the network).
  useEffect(() => {
    if (!replay) return;
    enterRef.current?.getAnimations().forEach((a) => {
      a.cancel();
      a.play();
    });
  }, [replay]);

  const moved = main.x !== 0 || main.y !== 0 || main.scale !== 1;
  // Darken is a see-through black sheet over the content, not a brightness filter: the same look (black at that
  // strength multiplies every colour by the same amount), but a filter on a full-screen layer is re-done by the graphics
  // card for every frame of a video, which stutters a 4K screen. Blur has no such shortcut and stays a filter.
  const blur = main.blur > 0 ? `blur(${main.blur}px)` : undefined;
  return (
    <div
      data-layer-main
      className="absolute inset-0"
      style={moved || blur ? { transform: moved ? `translate(${main.x}%, ${main.y}%) scale(${main.scale})` : undefined, filter: blur } : undefined}
    >
      <div ref={enterRef} className="absolute inset-0" style={enterStyle(main.enter, main.delay, playing)}>
        {children}
        {main.dim > 0 && <div data-layer-dim className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: main.dim }} />}
      </div>
    </div>
  );
}

/* ───────────────────────── Added items ───────────────────────── */

export interface OverlayState {
  /** Added pictures still loading, and pictures that could not load. */
  pending: number;
  failed: number;
}

/** Decodes every added picture before the screen counts as ready; one that cannot load is reported, not hidden. */
function useOverlayPictures(urls: string[], onState?: (s: OverlayState) => void) {
  const [seen, setSeen] = useState<Record<string, 'ok' | 'bad'>>({});
  const started = useRef(new Set<string>());
  // Not a per-effect flag: a development double-mount would otherwise drop the answers of loads it already started.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    for (const u of urls) {
      if (started.current.has(u)) continue;
      started.current.add(u);
      const img = new Image();
      const settle = (v: 'ok' | 'bad') => {
        if (mounted.current) setSeen((s) => (s[u] ? s : { ...s, [u]: v }));
      };
      // A picture counts once it is decoded, so it never pops in half-drawn.
      img.onload = () => img.decode().catch(() => undefined).then(() => settle('ok'));
      img.onerror = () => settle('bad');
      img.src = u;
    }
  }, [urls]);

  const pending = urls.filter((u) => !seen[u]).length;
  const failed = urls.filter((u) => seen[u] === 'bad').length;
  const reported = useRef<OverlayState | null>(null);
  useEffect(() => {
    if (reported.current?.pending === pending && reported.current.failed === failed) return;
    reported.current = { pending, failed };
    onState?.({ pending, failed });
  }, [pending, failed, onState]);
}

function ItemBody({ item, logoUrl }: { item: LayoutItem; logoUrl: string }) {
  if (item.type === 'text') {
    const pill = item.bg !== 'none';
    return (
      <div
        className="font-display font-bold text-center leading-tight whitespace-pre-wrap break-words"
        style={{
          fontSize: item.size * UNIT_PX,
          color: item.bg === 'gold' ? 'var(--color-premium-black)' : TEXT_COLOR[item.color],
          background: item.bg === 'gold' ? 'var(--color-premium-gold)' : item.bg === 'dark' ? 'rgba(9,9,11,0.82)' : undefined,
          padding: pill ? '0.25em 0.7em' : undefined,
          borderRadius: pill ? '0.45em' : undefined,
        }}
      >
        {item.text}
      </div>
    );
  }
  if (item.type === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.url} alt="" draggable={false} className="block w-full h-auto" />;
  }
  // The event's logo, or the brand mark when it has none.
  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt="" draggable={false} className="block w-full h-auto object-contain" />
  ) : (
    <BrandMark size={Math.round(item.size * UNIT_PX)} />
  );
}

/**
 * The added items, over everything else on the screen. Each sits in its own positioned box (the box never animates,
 * so the editor can measure it), and inside that the entrance effect, the looping effect and the look.
 */
export function ItemsLayer({ items, playing, replay, logo, onState }: {
  items: LayoutItem[];
  playing: boolean;
  /** A new number plays every entrance again. */
  replay: number;
  logo?: string | null;
  onState?: (s: OverlayState) => void;
}) {
  const logoUrl = useAssetUrl(logo ?? undefined);
  const hasLogo = items.some((i) => i.type === 'logo');
  const urlKey = items.map((i) => (i.type === 'image' ? i.url : '')).join('\n') + (hasLogo ? `\n${logoUrl}` : '');
  const urls = useMemo(() => urlKey.split('\n').filter(Boolean), [urlKey]);
  useOverlayPictures(urls, onState);

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {items.map((item, i) => (
        <div
          key={`${item.id}:${replay}`}
          data-layer={item.id}
          className="absolute"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 50 + i,
            // Pictures are sized by their width; text by its letters, up to nearly the screen's width.
            width: item.type === 'text' ? 'max-content' : item.size * UNIT_PX,
            maxWidth: item.type === 'text' ? '92%' : undefined,
          }}
        >
          <div style={enterStyle(item.enter, item.delay, playing)}>
            <div style={loopStyle(item.loop, playing)}>
              <div style={lookStyle(item)}>
                <ItemBody item={item} logoUrl={logoUrl} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
