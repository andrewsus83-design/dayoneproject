'use client';

import React from 'react';
import { AlertTriangle, Check, Loader2, RotateCw } from 'lucide-react';
import type { LoadState } from './ScreenView';

/**
 * Whether a source in an organizer's preview has finished loading: loading, ready to go live, or failed with the
 * reason and a way to try again. Going live waits for "ready".
 */
export function LoadBadge({ load, onRetry, className = '' }: { load: LoadState; onRetry?: () => void; className?: string }) {
  if (load.state === 'loading') {
    return (
      <span role="status" className={`inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-300 ${className}`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin text-premium-gold" /> Loading the preview…
      </span>
    );
  }
  if (load.state === 'ready') {
    return (
      <span role="status" className={`inline-flex items-center gap-1.5 text-[11px] font-bold text-premium-success ${className}`}>
        <Check className="w-3.5 h-3.5" /> Loaded — ready to go live
      </span>
    );
  }
  return (
    <span role="alert" className={`inline-flex items-start gap-1.5 text-[11px] font-bold text-premium-danger ${className}`}>
      <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
      <span>{load.reason}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-premium-danger/50 text-premium-danger hover:bg-premium-danger/10 scale-on-click shrink-0">
          <RotateCw className="w-3 h-3" /> Try again
        </button>
      )}
    </span>
  );
}
