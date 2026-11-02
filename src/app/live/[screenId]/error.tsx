'use client';

import { useEffect } from 'react';
import { BrandMark } from '@/components/BrandMark';

/**
 * A big screen must not stay on an error page: if the output page ever crashes, it shows the logo for a moment and
 * starts again by itself (the page rebuilds from the last feed this computer saved, so it needs no internet to do so).
 */
export default function LiveScreenError({ error, reset }: { error: unknown; reset: () => void }) {
  useEffect(() => {
    console.error('Live screen crashed, restarting', error);
    const t = window.setTimeout(reset, 3000);
    return () => window.clearTimeout(t);
  }, [error, reset]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-premium-black">
      <BrandMark size={120} />
    </div>
  );
}
