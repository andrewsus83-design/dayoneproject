'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, UploadCloud } from 'lucide-react';
import { useEventConfig, useOrgEventsCache } from '@/lib/eventStore';
import { publishEvent, pullEvent } from '@/lib/eventSync';

/**
 * Builder edits are kept on this device until this button saves them to the server.
 * Saving also publishes the event, so its live pages on every phone and screen update.
 */
export function PublishButton({ eventId }: { eventId: string }) {
  const { sync } = useEventConfig(eventId);
  const isOrgEvent = !!useOrgEventsCache()?.[eventId];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opening the event loads a teammate's newer save, unless this device has unsaved changes.
  useEffect(() => {
    if (isOrgEvent) pullEvent(eventId).catch(() => {});
  }, [eventId, isOrgEvent]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!isOrgEvent || !sync.unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isOrgEvent, sync.unsaved]);

  if (!isOrgEvent) {
    return (
      <span className="shrink-0 px-3 py-1.5 rounded-xl border border-premium-borderDark text-[11px] font-bold text-zinc-500" title="Sample events stay on this device and cannot be published.">
        Sample event
      </span>
    );
  }

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await publishEvent(eventId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const savedTime = sync.savedAt
    ? new Date(sync.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="flex items-center gap-2 shrink-0">
      {error ? (
        <span className="hidden lg:flex items-center gap-1 text-[11px] font-bold text-premium-danger max-w-[260px] truncate" title={error}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
        </span>
      ) : sync.unsaved ? (
        <span className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold text-premium-gold">
          <span className="w-1.5 h-1.5 rounded-full bg-premium-gold" /> Unsaved changes
        </span>
      ) : savedTime ? (
        <span className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold text-premium-success">
          <span className="w-1.5 h-1.5 rounded-full bg-premium-success shadow-[0_0_6px_#00E676]" /> Live · saved {savedTime}
        </span>
      ) : null}
      <button
        type="button"
        onClick={save}
        disabled={busy || (!sync.unsaved && !!savedTime)}
        className={`px-3.5 py-1.5 rounded-xl text-xs font-display font-bold flex items-center gap-1.5 scale-on-click transition-all disabled:cursor-default ${
          sync.unsaved || !savedTime
            ? 'bg-premium-gold hover:bg-premium-goldHover text-black shadow-gold'
            : 'bg-premium-surfaceDark border border-premium-borderDark text-zinc-400'
        }`}
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : sync.unsaved || !savedTime ? <UploadCloud className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5 text-premium-success" />}
        {busy ? 'Saving…' : sync.unsaved || !savedTime ? 'Save & publish' : 'Saved'}
      </button>
    </div>
  );
}
