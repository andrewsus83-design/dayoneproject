'use client';

import React from 'react';

/**
 * An uploaded landing page. It runs in a frame with no access to the app (no sign-in, cookies or storage), so the
 * organizer's own scripts are safe to run; its links open in the whole window. Live pages load /events/<slug>/site;
 * the builder shows the draft through srcDoc.
 */
export function CustomHtmlFrame({ title, src, srcDoc, embedded }: { title: string; src?: string; srcDoc?: string; embedded?: boolean }) {
  return (
    <iframe
      title={title}
      src={src}
      srcDoc={srcDoc}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-downloads allow-top-navigation-by-user-activation"
      allow="clipboard-write; fullscreen; autoplay"
      className={`block border-0 bg-white ${embedded ? 'w-full h-full' : 'guest-landing fixed inset-0 w-full'}`}
      style={embedded ? undefined : { height: '100dvh' }}
    />
  );
}
