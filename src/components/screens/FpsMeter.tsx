'use client';

import React, { useEffect, useState } from 'react';

/**
 * A small readout for the people running a big screen (press D on the output to show or hide it): how many frames per
 * second the screen really draws, the worst gap between frames lately, and the things that most often explain a choppy
 * screen that is not the app's fault: a display running at 30 Hz, Chrome limiting frames to save power, or the browser
 * drawing in software because graphics acceleration is off. It costs one frame callback and one small update a second,
 * and it is not drawn at all while hidden.
 */

interface Stats {
  fps: number;
  /** Longest gap between two frames in the last 5 seconds, in ms. */
  worst: number;
  /** Frames that took longer than 50 ms in the last 10 seconds. */
  slow: number;
}

/** The graphics card the browser says it draws with ("SwiftShader" or "llvmpipe" means in software). */
function readGraphicsCard(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
    if (!gl || !(gl instanceof WebGLRenderingContext)) return 'no WebGL (drawing in software)';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return 'unknown';
  }
}

export function FpsMeter({ source }: { source?: string | null }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [card] = useState(readGraphicsCard);
  const [fullscreen, setFullscreen] = useState(() => !!document.fullscreenElement);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let windowStart = last;
    let frames = 0;
    const gaps: { at: number; gap: number }[] = [];
    const loop = (now: number) => {
      gaps.push({ at: now, gap: now - last });
      last = now;
      frames += 1;
      while (gaps.length && now - gaps[0].at > 10_000) gaps.shift();
      if (now - windowStart >= 1000) {
        const recent = gaps.filter((g) => now - g.at <= 5000);
        setStats({
          fps: Math.round((frames * 1000) / (now - windowStart)),
          worst: Math.round(Math.max(0, ...recent.map((g) => g.gap))),
          slow: gaps.filter((g) => g.gap > 50).length,
        });
        frames = 0;
        windowStart = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onFullscreen = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, []);

  const dpr = window.devicePixelRatio || 1;
  const inSoftware = /swiftshader|llvmpipe|software|basic render|no webgl/i.test(card);
  const hint = inSoftware
    ? 'The browser is drawing in software: turn on graphics acceleration in the browser settings and restart it.'
    : stats && stats.fps >= 26 && stats.fps <= 34
      ? 'About 30 frames a second: the display may be running at 30 Hz (check the HDMI cable and the display refresh rate), or the browser is limiting frames to save power (Chrome Energy Saver, Low Power Mode).'
      : stats && stats.fps < 24
        ? 'The computer cannot keep up with this screen. Close other tabs and apps, or lower the screen resolution.'
        : stats && stats.slow > 5
          ? 'Mostly smooth, with short stalls.'
          : stats
            ? 'Smooth.'
            : 'Measuring…';

  return (
    <div className="fixed left-3 bottom-3 z-[90] max-w-[34rem] rounded-xl bg-premium-black/85 border border-premium-borderDark px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-300 pointer-events-none">
      <div className="flex items-baseline gap-3">
        <span className={`text-lg font-bold ${stats && stats.fps < 24 ? 'text-premium-danger' : stats && stats.fps < 50 ? 'text-premium-gold' : 'text-premium-success'}`}>{stats ? `${stats.fps} fps` : '… fps'}</span>
        {stats && <span>worst gap {stats.worst} ms · {stats.slow} slow frames / 10 s</span>}
      </div>
      <div>
        {window.innerWidth}×{window.innerHeight} at {dpr}x = {Math.round(window.innerWidth * dpr)}×{Math.round(window.innerHeight * dpr)} px · {fullscreen ? 'full screen' : 'window'} · {navigator.hardwareConcurrency ?? '?'} cores
      </div>
      <div className="truncate">graphics: {card}</div>
      {source && <div className="truncate">on air: {source}</div>}
      <div className="text-premium-neon">{hint}</div>
      <div className="text-zinc-500">Press D to hide this.</div>
    </div>
  );
}
