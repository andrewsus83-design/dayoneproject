'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Maximize2, Minimize2, X } from 'lucide-react';

/** How close to the top edge the pointer must be to bring the controls up, and how long they stay after it leaves. */
const HOT_ZONE_PX = 72;
const HIDE_AFTER_MS = 2500;

/**
 * Back, full screen and close for the big screens (stage, live photo wall, Live Screens outputs). They stay hidden
 * on air and show while the mouse is at the top edge of the screen, or after a tap there, then hide again, so an
 * operator can always leave a screen that was opened in its own tab. Close falls back to Back when the browser
 * does not let the page close its own tab. `status` is a line of connection details for the operator, shown with them.
 */
export function ScreenControls({ backHref, backLabel = 'Back', status }: { backHref: string; backLabel?: string; status?: string }) {
  const [visible, setVisible] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const hideTimer = useRef<number | undefined>(undefined);
  const hovering = useRef(false);

  const scheduleHide = useCallback(() => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!hovering.current) setVisible(false);
    }, HIDE_AFTER_MS);
  }, []);

  useEffect(() => {
    const atTop = (y: number) => y <= HOT_ZONE_PX;
    const onMove = (e: MouseEvent) => {
      if (!atTop(e.clientY)) return;
      setVisible(true);
      scheduleHide();
    };
    const onPointer = (e: PointerEvent) => {
      if (!atTop(e.clientY)) return;
      setVisible(true);
      scheduleHide();
    };
    const onFullscreen = () => setFullscreen(!!document.fullscreenElement);
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('fullscreenchange', onFullscreen);
      window.clearTimeout(hideTimer.current);
    };
  }, [scheduleHide]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else document.documentElement.requestFullscreen().catch(() => undefined);
  };

  const close = () => {
    window.close();
    // Still here: the browser keeps tabs it did not open by script, so go back instead.
    window.setTimeout(() => window.location.assign(backHref), 300);
  };

  const button =
    'screen-controls flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-200 hover:text-white hover:bg-white/10 scale-on-click';

  return (
    <div
      className={`screen-controls fixed top-3 left-1/2 -translate-x-1/2 z-[100] glass-panel rounded-2xl p-1 flex items-center gap-1 shadow-2xl transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      // Clicks here are for the controls only (the Live Screens page starts on any other click).
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => {
        hovering.current = true;
        window.clearTimeout(hideTimer.current);
      }}
      onMouseLeave={() => {
        hovering.current = false;
        scheduleHide();
      }}
      aria-hidden={!visible}
    >
      {status && <span className="px-3 max-w-[40vw] truncate text-[11px] font-mono text-zinc-400" title={status}>{status}</span>}
      <a href={backHref} className={button} aria-label={backLabel}>
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </a>
      <button type="button" onClick={toggleFullscreen} className={button} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}>
        {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        {fullscreen ? 'Exit full screen' : 'Full screen'}
      </button>
      <button type="button" onClick={close} className={button} aria-label="Close this screen">
        <X className="w-4 h-4" /> Close
      </button>
    </div>
  );
}
