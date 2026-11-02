'use client';

import React, { useEffect, useRef, useState } from 'react';

/** How fast the text travels, in px per second (what the old 25 s loop did on a typical line). */
const SPEED_PX_S = 52;
const MAX_COPIES = 60;

/**
 * The scrolling line at the bottom of the stage screen. The track holds as many identical copies of one unit
 * (the line and a bullet) as it takes to cover the bar plus one more, and slides by exactly one unit, so the
 * bar is never empty and the loop has no seam. The slide itself is a CSS transform on the compositor, so it
 * keeps going even while the page is busy.
 */
export function StageTicker({ text }: { text: string }) {
  const bar = useRef<HTMLDivElement>(null);
  const unit = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState({ copies: 2, seconds: 25 });

  useEffect(() => {
    const barEl = bar.current;
    const unitEl = unit.current;
    if (!barEl || !unitEl) return;
    const measure = () => {
      const unitWidth = unitEl.getBoundingClientRect().width;
      const barWidth = barEl.getBoundingClientRect().width;
      if (!unitWidth || !barWidth) return;
      const copies = Math.min(MAX_COPIES, Math.max(2, Math.ceil(barWidth / unitWidth) + 1));
      const seconds = Math.round((unitEl.offsetWidth / SPEED_PX_S) * 10) / 10;
      setFit((f) => (f.copies === copies && f.seconds === seconds ? f : { copies, seconds }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(barEl);
    observer.observe(unitEl);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div ref={bar} className="h-10 bg-premium-surfaceDark border-t border-premium-borderDark overflow-hidden flex items-center z-20">
      <div
        className="flex w-max shrink-0 whitespace-nowrap font-mono text-xs text-premium-gold animate-ticker"
        style={{ '--ticker-copies': fit.copies, '--ticker-seconds': `${fit.seconds}s` } as React.CSSProperties}
      >
        {Array.from({ length: fit.copies }, (_, i) => (
          <span key={i} ref={i === 0 ? unit : undefined} aria-hidden={i > 0 || undefined} className="flex shrink-0 items-center gap-8 pr-8">
            <span>{text}</span>
            <span>•</span>
          </span>
        ))}
      </div>
    </div>
  );
}
