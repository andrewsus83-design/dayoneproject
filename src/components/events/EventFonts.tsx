'use client';

import { useEffect } from 'react';

export function EventFonts({ href }: { href: string | null }) {
  useEffect(() => {
    if (!href) return;
    if (document.querySelector(`link[data-ev-font="${CSS.escape(href)}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.evFont = href;
    document.head.appendChild(link);
  }, [href]);
  return null;
}
