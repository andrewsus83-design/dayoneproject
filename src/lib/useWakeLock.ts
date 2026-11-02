'use client';

import { useEffect, useState } from 'react';

export type WakeLockState = 'off' | 'held' | 'unsupported';

/**
 * Keeps the display awake while a big screen is open (the Screen Wake Lock API). The browser drops the lock whenever
 * the tab is hidden, so it is asked for again as soon as the tab is visible, and every 30 s in case the system
 * released it (low battery, a lock the browser refused before the first click). Browsers without the API cannot be
 * kept awake from a page: turn off sleep and screen saver in the computer's settings.
 */
export function useWakeLock(active = true): WakeLockState {
  const [state, setState] = useState<WakeLockState>('off');

  useEffect(() => {
    if (!active) return;
    if (!('wakeLock' in navigator)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState('unsupported');
      return;
    }
    let sentinel: WakeLockSentinel | null = null;
    let stopped = false;

    const acquire = async () => {
      if (stopped || document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (stopped) {
          lock.release().catch(() => undefined);
          return;
        }
        sentinel = lock;
        setState('held');
        lock.addEventListener('release', () => {
          if (sentinel === lock) sentinel = null;
          if (!stopped) setState('off');
        });
      } catch {
        // Refused for now (hidden tab, power saving): the next visible moment or the timer asks again.
      }
    };

    acquire();
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(acquire, 30_000);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
      sentinel?.release().catch(() => undefined);
    };
  }, [active]);

  return state;
}
