'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { deleteOrgEvent } from '@/lib/orgEvents';

/**
 * The event Setting menu's last card: deletes the event for good after the organizer types its name. The database only
 * lets the account owner delete; anyone else gets its refusal as a message.
 */
export function DeleteEventCard({ eventId, eventName }: { eventId: string; eventName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = eventName.trim();
  const matches = typed.trim().toLowerCase() === name.toLowerCase();

  const remove = async () => {
    if (!matches || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteOrgEvent(eventId);
      router.replace('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The event could not be deleted. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="p-6 rounded-[2.5rem] bg-premium-charcoal border border-premium-danger/30 space-y-4 shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-mono uppercase text-premium-danger font-bold flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Delete event
          </span>
          <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
            Deletes this event and everything in it for good: guests, replies and QR passes, door prizes, games, screens and
            messages. Photo wall uploads are removed overnight. This can&apos;t be undone.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-premium-surfaceDark border border-premium-danger/40 text-premium-danger hover:bg-premium-danger/10 font-bold text-xs scale-on-click flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete event
          </button>
        )}
      </div>

      {open && (
        <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-danger/40 space-y-3">
          <label htmlFor="delete-event-name" className="block text-xs text-zinc-300 leading-relaxed">
            Type <span className="font-bold text-white">{name}</span> to confirm.
          </label>
          <input
            id="delete-event-name"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && remove()}
            autoComplete="off"
            autoFocus
            disabled={busy}
            placeholder={name}
            className="w-full bg-premium-black border border-premium-borderDark text-white px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-premium-danger"
          />
          {error && (
            <p className="text-xs text-premium-danger font-bold flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => { setOpen(false); setTyped(''); setError(null); }}
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-premium-charcoal border border-premium-borderDark text-zinc-300 hover:text-white font-bold text-xs scale-on-click disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={!matches || busy}
              className="px-4 py-2 rounded-xl bg-premium-danger text-white font-bold text-xs scale-on-click flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {busy ? 'Deleting…' : 'Delete for good'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
