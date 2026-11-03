'use client';

import { useEffect } from 'react';
import { Smartphone } from 'lucide-react';

/**
 * Keeps the guest app upright on a phone. The installed Android app is locked by the manifest ("orientation": "portrait");
 * here the page also asks the browser to lock when it is allowed to (an installed or full-screen app), and every phone
 * held sideways, iPhones included (a web page cannot lock those), gets a "turn your phone" cover. The cover is plain CSS
 * (globals.css .guest-rotate), shown only on guest app pages and only on a sideways phone.
 */
export function GuestPortraitLock() {
  useEffect(() => {
    const installed = window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches;
    const phone = Math.min(window.screen.width, window.screen.height) < 600;
    const orientation = window.screen.orientation as (ScreenOrientation & { lock?: (type: 'portrait') => Promise<void> }) | undefined;
    if (installed && phone && orientation?.lock) orientation.lock('portrait').catch(() => undefined);
  }, []);

  return (
    <div className="guest-rotate fixed inset-0 z-[200] flex-col items-center justify-center gap-4 bg-premium-black px-8 text-center font-sans" role="alert">
      <Smartphone className="w-14 h-14 text-premium-gold" />
      <p className="text-xl font-display font-bold text-white">Turn your phone upright</p>
      <p className="text-sm text-zinc-400">This app is made to be used in portrait.</p>
    </div>
  );
}
