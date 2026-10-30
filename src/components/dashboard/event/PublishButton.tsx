'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Globe, Loader2, UploadCloud, X } from 'lucide-react';
import { useEventConfig, useOrgEventsCache } from '@/lib/eventStore';
import { pullEvent, saveEvent, SaveConflictError, type SaveOptions } from '@/lib/eventSync';
import { setOrgEventStatus } from '@/lib/orgEvents';

type Busy = 'save' | 'publish' | 'unpublish' | 'load' | null;
type Panel = 'conflict' | 'discard' | 'unpublish' | null;

const clock = (time: number | string) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Try again.');

const panelButton = 'flex-1 px-3 py-2 rounded-xl text-xs font-display font-bold scale-on-click transition-all disabled:opacity-50';
const secondary = 'bg-premium-surfaceDark border border-premium-borderDark text-white hover:border-premium-gold/50';
const gold = 'bg-premium-gold hover:bg-premium-goldHover text-black shadow-gold';
const danger = 'bg-premium-danger/10 border border-premium-danger/40 text-premium-danger hover:bg-premium-danger/20';

/**
 * Builder edits are kept on this device until Save stores them on the server. Saving keeps the event's status:
 * a live event's pages update on every phone and screen, a draft stays with the team until Publish.
 * A save never lands on top of a teammate's newer one without asking.
 */
export function PublishButton({ eventId }: { eventId: string }) {
  const { sync } = useEventConfig(eventId);
  const row = useOrgEventsCache()?.[eventId];
  const isOrgEvent = !!row;
  const live = row?.status === 'published';
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  // The newer version found on the server, and what the save that ran into it was doing.
  const [conflict, setConflict] = useState<{ savedIso: string; status?: SaveOptions['status'] } | null>(null);

  // Opening the event, or coming back to it, loads a teammate's newer save unless this device has unsaved changes.
  useEffect(() => {
    if (!isOrgEvent) return;
    const pull = () => pullEvent(eventId).catch(() => {});
    pull();
    const onVisible = () => document.visibilityState === 'visible' && pull();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [eventId, isOrgEvent]);

  // Warn before leaving with unsaved changes (day-of results alone don't count).
  useEffect(() => {
    if (!isOrgEvent || !sync.unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isOrgEvent, sync.unsaved]);

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel]);

  if (!isOrgEvent) {
    return (
      <span className="shrink-0 px-3 py-1.5 rounded-xl border border-premium-borderDark text-[11px] font-bold text-zinc-500" title="Sample events stay on this device and cannot be published.">
        Sample event
      </span>
    );
  }

  const neverSaved = sync.savedAt === null;
  const needsSave = sync.unsaved || neverSaved;
  // Winners drawn on this device that the server does not have yet; Save sends them too.
  const liveOnly = !needsSave && sync.liveAt !== null;

  const run = async (kind: Exclude<Busy, null>, task: () => Promise<unknown>, status?: SaveOptions['status']) => {
    setBusy(kind);
    setError(null);
    try {
      await task();
      setConflict(null);
      setPanel(null);
    } catch (e) {
      if (e instanceof SaveConflictError) {
        setConflict({ savedIso: e.savedIso, status });
        setPanel('conflict');
      } else {
        setError(message(e));
        setPanel(null);
      }
    } finally {
      setBusy(null);
    }
  };

  const save = (options: SaveOptions = {}) =>
    run(options.status === 'published' ? 'publish' : 'save', () => saveEvent(eventId, options), options.status);

  // A draft with nothing new to save only changes its status; otherwise it is saved and published together.
  const publish = () =>
    needsSave
      ? save({ status: 'published' })
      : run('publish', async () => {
          await setOrgEventStatus(eventId, 'published');
          await pullEvent(eventId).catch(() => {});
        });

  const unpublish = () => run('unpublish', () => setOrgEventStatus(eventId, 'draft'));
  const loadTheirs = () => run('load', () => pullEvent(eventId, { discard: true }));
  const keepMine = () => save({ status: conflict?.status, force: true });

  const savedTime = sync.savedAt ? clock(sync.savedAt) : null;
  const saveStyle = needsSave
    ? live ? gold : secondary
    : liveOnly ? secondary : 'bg-premium-surfaceDark border border-premium-borderDark text-zinc-400';

  return (
    <div className="relative flex items-center gap-2 shrink-0">
      {live ? (
        <button
          type="button"
          onClick={() => setPanel(panel === 'unpublish' ? null : 'unpublish')}
          aria-expanded={panel === 'unpublish'}
          title="Guests can open this event"
          className="px-2.5 py-1.5 rounded-xl border border-premium-success/30 bg-premium-success/10 text-[11px] font-bold text-premium-success flex items-center gap-1.5 scale-on-click"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-premium-success shadow-[0_0_6px_#00E676] animate-pulse" /> Live
          <ChevronDown className="w-3 h-3" />
        </button>
      ) : (
        <span
          title="Only your team can open a draft. Publish it to let guests in."
          className="px-2.5 py-1.5 rounded-xl border border-premium-borderDark text-[11px] font-bold text-zinc-400 flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" /> Draft
        </span>
      )}

      {error ? (
        <span className="hidden lg:flex items-center gap-1 text-[11px] font-bold text-premium-danger max-w-[260px] truncate" title={error}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
        </span>
      ) : sync.unsaved ? (
        <span className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold text-premium-gold">
          <span className="w-1.5 h-1.5 rounded-full bg-premium-gold" /> Unsaved changes
        </span>
      ) : liveOnly ? (
        <span className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold text-zinc-400" title="Winners drawn on this device. Save to share them with your team.">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" /> Winners not saved yet
        </span>
      ) : savedTime ? (
        <span className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold text-zinc-400">
          <Check className="w-3.5 h-3.5 text-premium-success" /> Saved {savedTime}
        </span>
      ) : null}

      <button
        type="button"
        onClick={() => save()}
        disabled={!!busy || (!needsSave && !liveOnly)}
        title={live ? 'Guests see saved changes right away' : 'The draft stays with your team until you publish it'}
        className={`px-3.5 py-1.5 rounded-xl text-xs font-display font-bold flex items-center gap-1.5 scale-on-click transition-all disabled:cursor-default ${saveStyle}`}
      >
        {busy === 'save' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : needsSave || liveOnly ? <UploadCloud className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5 text-premium-success" />}
        {busy === 'save' ? 'Saving…' : needsSave || liveOnly ? 'Save' : 'Saved'}
      </button>

      {!live && (
        <button
          type="button"
          onClick={publish}
          disabled={!!busy}
          title="Let guests open the event's pages"
          className={`px-3.5 py-1.5 rounded-xl text-xs font-display font-bold flex items-center gap-1.5 scale-on-click transition-all disabled:opacity-60 ${gold}`}
        >
          {busy === 'publish' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
          {busy === 'publish' ? 'Publishing…' : 'Publish'}
        </button>
      )}

      {panel && (
        <div
          role="alertdialog"
          aria-labelledby="publish-panel-title"
          className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark shadow-2xl z-40 font-sans"
        >
          {panel === 'conflict' && conflict && (
            <>
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-premium-gold shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p id="publish-panel-title" className="text-sm font-display font-bold text-white">
                    A teammate saved a newer version at {clock(conflict.savedIso)}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">Saving now would replace their changes with yours.</p>
                </div>
                <button type="button" onClick={() => setPanel(null)} className="text-zinc-500 hover:text-white scale-on-click" aria-label="Decide later">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setPanel('discard')} disabled={!!busy} className={`${panelButton} ${secondary}`}>
                  Load theirs
                </button>
                <button type="button" onClick={keepMine} disabled={!!busy} className={`${panelButton} ${gold} flex items-center justify-center gap-1.5`}>
                  {(busy === 'save' || busy === 'publish') && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Keep mine and save
                </button>
              </div>
            </>
          )}

          {panel === 'discard' && (
            <>
              <p id="publish-panel-title" className="text-sm font-display font-bold text-white">Load their version?</p>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Your unsaved changes on this device will be discarded. Winners drawn on this device stay.
              </p>
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setPanel('conflict')} disabled={!!busy} className={`${panelButton} ${secondary}`}>
                  Back
                </button>
                <button type="button" onClick={loadTheirs} disabled={!!busy} className={`${panelButton} ${danger} flex items-center justify-center gap-1.5`}>
                  {busy === 'load' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Discard mine and load
                </button>
              </div>
            </>
          )}

          {panel === 'unpublish' && (
            <>
              <p id="publish-panel-title" className="text-sm font-display font-bold text-white">Unpublish this event?</p>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Guests opening its pages will see that the event isn&apos;t live yet, until you publish again. Your team can still open everything.
              </p>
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setPanel(null)} disabled={!!busy} className={`${panelButton} ${secondary}`}>
                  Cancel
                </button>
                <button type="button" onClick={unpublish} disabled={!!busy} className={`${panelButton} ${danger} flex items-center justify-center gap-1.5`}>
                  {busy === 'unpublish' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Unpublish
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
