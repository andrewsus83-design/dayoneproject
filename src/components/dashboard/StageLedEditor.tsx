'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, ExternalLink, Loader2, RotateCcw, Tv } from 'lucide-react';
import { useEventConfig } from '@/lib/eventStore';
import { isServerEventId } from '@/lib/guestsApi';
import { getClientDomain } from '@/lib/domain';
import { formatDate } from '@/lib/utils';
import { DEFAULT_STAGE_CONFIG } from '@/lib/mockData';
import type { StageModuleId } from '@/lib/types';
import {
  STAGE_MODULES_WITHOUT_CONTENT, STAGE_MODULE_NAMES, defaultTicker, loadStageState, normalizeStageState, publishLocalStage,
  readLocalStage, saveStageState, type StagePatch, type StageState,
} from '@/lib/stageApi';

const DESCRIPTIONS: Record<string, string> = Object.fromEntries(DEFAULT_STAGE_CONFIG.modules.map((m) => [m.id, m.description]));

type Status = { kind: 'idle' | 'saving' | 'saved' | 'error'; message?: string };

/**
 * The operator's controller for the ballroom LED stage (/events/<slug>/stage). Saved events: every change goes to
 * the server (a41_set_stage_state) and reaches every stage screen within a couple of seconds, and this device's
 * screens at once. Sample events: this device only. Only the 7 system modules exist here, as in the database.
 */
export function StageLedEditor({ eventId }: { eventId: string }) {
  const { config, event } = useEventConfig(eventId);
  const server = isServerEventId(eventId);
  const [state, setState] = useState<StageState>(() => normalizeStageState(null));
  const [loaded, setLoaded] = useState(false);
  const [ticker, setTicker] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const stateRef = useRef(state);
  // The last state the server confirmed; optimistic changes show as its rev + 1 until the save lands.
  const serverRev = useRef(0);
  const pending = useRef<StagePatch>({});
  const timer = useRef<number | undefined>(undefined);
  const clientDomain = getClientDomain(config.info.slug || event.slug);
  const autoTicker = defaultTicker(
    { name: event.name, date: event.start_date ? formatDate(event.start_date) : undefined, venue: event.location_name },
    clientDomain,
  );

  useEffect(() => {
    let alive = true;
    const load = server ? loadStageState(eventId) : Promise.resolve(readLocalStage(eventId));
    load
      .then((s) => {
        if (!alive) return;
        const next = s ?? normalizeStageState(null);
        stateRef.current = next;
        serverRev.current = next.rev;
        setState(next);
        setTicker(next.ticker ?? '');
        setLoaded(true);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setStatus({ kind: 'error', message: e instanceof Error ? e.message : 'Could not load the stage.' });
        setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [eventId, server]);

  const show = (next: StageState) => {
    stateRef.current = next;
    setState(next);
    publishLocalStage(eventId, next);
  };

  const flush = async () => {
    const patch = pending.current;
    pending.current = {};
    if (!Object.keys(patch).length) return;
    setStatus({ kind: 'saving' });
    try {
      const saved = await saveStageState(eventId, patch);
      serverRev.current = saved.rev;
      // Changes made while this one was saving are still on their way; keep showing them.
      if (!Object.keys(pending.current).length) show(saved);
      setStatus({ kind: 'saved' });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : 'The stage did not update. Try again.' });
      // Put this device's screens back on what every other screen shows.
      loadStageState(eventId).then((s) => s && show(s)).catch(() => {});
    }
  };

  // Leaving the tab sends a slider change that is still waiting.
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });
  useEffect(() => () => {
    window.clearTimeout(timer.current);
    void flushRef.current();
  }, []);

  /** Shows a change on this device's screens at once and sends it to the server (after `delay` ms, merged). */
  const apply = (patch: StagePatch, delay = 0) => {
    const rev = server ? serverRev.current + 1 : stateRef.current.rev + 1;
    show(normalizeStageState({ ...stateRef.current, ...patch, rev, updated_at: new Date().toISOString() }));
    if (!server) return;
    pending.current = { ...pending.current, ...patch };
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), delay);
  };

  const setModule = (id: StageModuleId, change: { enabled?: boolean; seconds?: number }, delay = 0) =>
    apply({ modules: stateRef.current.modules.map((m) => (m.id === id ? { ...m, ...change } : m)) }, delay);

  const broadcastAll = () =>
    apply({
      active_module: state.active_module,
      auto_rotate: state.auto_rotate,
      modules: state.modules,
      ticker: ticker.trim() || null,
      doorprize_id: config.doorprizes.activeId || null,
    });

  const enabledCount = state.modules.filter((m) => m.enabled).length;
  const disabled = !loaded;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner: Quick Live Mode Selector */}
      <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-premium-gold/15 border border-premium-gold/30 text-premium-gold flex items-center justify-center shadow-gold">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-display font-medium text-white flex items-center gap-2">
                <span>Ballroom Stage LED Master Controller</span>
                <span className={`w-2 h-2 rounded-full ${status.kind === 'error' ? 'bg-premium-danger' : 'bg-premium-success animate-pulse'}`} />
              </h3>
              <p className="text-xs text-zinc-400">
                {server
                  ? 'Changes reach every stage screen within a couple of seconds. Only the 7 system modules can be shown.'
                  : 'Sample event: changes show on stage screens open on this device. Only the 7 system modules can be shown.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={() => apply({ auto_rotate: true })}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 scale-on-click disabled:opacity-50 ${
              state.auto_rotate
                ? 'bg-premium-gold hover:bg-premium-goldHover text-black shadow-gold font-bold'
                : 'bg-premium-surfaceDark text-zinc-300 hover:text-white border border-premium-borderDark'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Auto-Rotate Enabled Modules</span>
          </button>
        </div>

        {/* Mode Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-2">
          {state.modules.map((m) => {
            const isActive = !state.auto_rotate && state.active_module === m.id;
            const noContent = STAGE_MODULES_WITHOUT_CONTENT.includes(m.id);
            const usable = m.enabled && !noContent;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => apply({ active_module: m.id, auto_rotate: false })}
                disabled={disabled || !usable}
                className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 scale-on-click ${
                  isActive
                    ? 'bg-premium-neon/15 border-premium-neon text-white shadow-neon'
                    : usable
                    ? 'bg-premium-surfaceDark border-premium-borderDark text-zinc-300 hover:border-premium-gold'
                    : 'bg-premium-black border-zinc-900 text-zinc-600 opacity-40 cursor-not-allowed'
                }`}
              >
                <span className="text-xs font-display font-medium truncate w-full">{STAGE_MODULE_NAMES[m.id]}</span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {noContent ? 'Coming soon' : m.enabled ? (isActive ? 'On screen' : `${m.seconds}s`) : 'Disabled'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Module Permissions & Carousel Editor */}
      <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-5 shadow-xl">
        <div className="border-b border-premium-borderDark pb-3 flex items-center justify-between">
          <div>
            <h4 className="text-lg font-display font-medium text-white">System Display Modules</h4>
            <p className="text-xs text-zinc-400">
              Toggle which system slides may appear on the ballroom stage, and how long each stays up while rotating
            </p>
          </div>
          <span className="px-3 py-1 bg-premium-neon/15 text-premium-neon border border-premium-neon/30 rounded-full font-mono text-xs font-bold">
            {enabledCount} of {state.modules.length} active
          </span>
        </div>

        <div className="space-y-3">
          {state.modules.map((mod) => {
            const noContent = STAGE_MODULES_WITHOUT_CONTENT.includes(mod.id);
            return (
              <div
                key={mod.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  mod.enabled && !noContent
                    ? 'bg-premium-surfaceDark border-premium-borderDark'
                    : 'bg-premium-black border-zinc-900 opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setModule(mod.id, { enabled: !mod.enabled })}
                    disabled={disabled || noContent}
                    aria-label={`${mod.enabled ? 'Disable' : 'Enable'} ${STAGE_MODULE_NAMES[mod.id]}`}
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors scale-on-click disabled:cursor-not-allowed ${
                      mod.enabled && !noContent ? 'bg-premium-gold text-black shadow-gold font-bold' : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {mod.enabled && !noContent && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>
                  <div>
                    <h5 className="text-sm font-display font-medium text-white flex items-center gap-2">
                      <span>{STAGE_MODULE_NAMES[mod.id]}</span>
                      <span className="text-[10px] font-mono text-premium-gold uppercase">[{mod.id}]</span>
                      {noContent && <span className="text-[10px] font-mono text-zinc-500 uppercase">coming soon</span>}
                    </h5>
                    <p className="text-xs text-zinc-400">{DESCRIPTIONS[mod.id]}</p>
                  </div>
                </div>

                {/* Duration slider */}
                {mod.enabled && !noContent && (
                  <div className="flex items-center gap-3 pl-10 sm:pl-0">
                    <span className="text-xs font-mono text-zinc-400 whitespace-nowrap">
                      Slide Time: <strong className="text-white">{mod.seconds}s</strong>
                    </span>
                    <input
                      type="range"
                      min={5}
                      max={60}
                      step={5}
                      value={Math.min(60, mod.seconds)}
                      disabled={disabled}
                      onChange={(e) => setModule(mod.id, { seconds: Number(e.target.value) }, 600)}
                      className="w-24 accent-[#C5A059] h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage LED Ticker Banner Editor */}
      <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-display font-medium text-white">Stage Bottom Ticker Text</h4>
            <p className="text-xs text-zinc-400">
              Scrolls across the bottom of the stage screen. Leave it empty to show the event&apos;s own details.
            </p>
          </div>
          <span className={`text-xs font-mono font-bold ${ticker.length > 300 ? 'text-premium-danger' : 'text-premium-gold'}`}>{ticker.length}/300</span>
        </div>

        <input
          type="text"
          value={ticker}
          maxLength={300}
          disabled={disabled}
          onChange={(e) => setTicker(e.target.value)}
          placeholder={autoTicker}
          className="w-full px-5 py-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-sm font-mono text-white focus:border-premium-gold outline-none"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs min-h-[1.25rem]">
          {status.kind === 'saving' && (
            <span className="flex items-center gap-1.5 text-zinc-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating the stage…</span>
          )}
          {status.kind === 'saved' && (
            <span className="flex items-center gap-1.5 text-premium-success font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Live on every stage screen</span>
          )}
          {status.kind === 'error' && (
            <span className="flex items-center gap-1.5 text-premium-danger font-semibold"><AlertTriangle className="w-3.5 h-3.5" /> {status.message}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/events/${config.info.slug || event.slug}/stage`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-white text-sm font-display font-bold scale-on-click flex items-center gap-2 hover:border-premium-gold/50"
          >
            Open stage screen <ExternalLink className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={broadcastAll}
            disabled={disabled}
            className="bg-premium-gold hover:bg-premium-goldHover text-black px-8 py-4 rounded-2xl font-bold transition-all shadow-gold scale-on-click text-sm font-display disabled:opacity-50"
          >
            Save & Broadcast to Ballroom LED
          </button>
        </div>
      </div>
    </div>
  );
}
