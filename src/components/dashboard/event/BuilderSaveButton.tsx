'use client';

import { useState } from 'react';
import { AlertTriangle, Check, Loader2, UploadCloud } from 'lucide-react';
import { useEventConfig, useOrgEventsCache } from '@/lib/eventStore';
import { saveEvent, SaveConflictError } from '@/lib/eventSync';

const clock = (time: number) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Save inside a builder: stores this device's edits on the server, like Save at the top of the event page (whose
 * menu also handles a teammate's newer version and publishing). Sample events stay on this device.
 */
export function BuilderSaveButton({ eventId }: { eventId: string }) {
  const { sync } = useEventConfig(eventId);
  const row = useOrgEventsCache()?.[eventId];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!row) {
    return <span className="text-[11px] font-mono text-zinc-500">Sample event · changes stay on this device</span>;
  }

  const needsSave = sync.unsaved || sync.savedAt === null;
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveEvent(eventId);
    } catch (e) {
      setError(
        e instanceof SaveConflictError
          ? 'A teammate saved a newer version. Use Save at the top of the page to choose which to keep.'
          : e instanceof Error ? e.message : 'Could not save. Try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 min-w-0">
      {error ? (
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-premium-danger min-w-0">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> <span className="truncate" title={error}>{error}</span>
        </span>
      ) : needsSave ? (
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-premium-gold">
          <span className="w-1.5 h-1.5 rounded-full bg-premium-gold shrink-0" />
          {row.status === 'published' ? 'Unsaved: guests see the last saved version' : 'Unsaved changes'}
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-[11px] font-mono text-premium-success">
          <Check className="w-3 h-3" /> Saved{sync.savedAt ? ` ${clock(sync.savedAt)}` : ''}
        </span>
      )}
      <button
        type="button"
        onClick={() => void save()}
        disabled={busy || !needsSave}
        className={`shrink-0 px-4 py-2 rounded-xl text-xs font-display font-bold flex items-center gap-1.5 scale-on-click transition-all disabled:cursor-default ${
          needsSave ? 'bg-premium-gold hover:bg-premium-goldHover text-black shadow-gold' : 'bg-premium-surfaceDark border border-premium-borderDark text-zinc-400'
        }`}
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : needsSave ? <UploadCloud className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5 text-premium-success" />}
        {busy ? 'Saving…' : needsSave ? 'Save' : 'Saved'}
      </button>
    </div>
  );
}
