'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_STAGE_CONFIG } from '@/lib/mockData';
import type { StageModuleId } from '@/lib/types';
import type { LatestWinner } from '@/lib/doorPrizeApi';

/*
 * The stage LED screen across devices (supabase/migrations/*_a41_stage_state.sql).
 *
 * The operator (StageLedEditor, an event manager) saves the stage state with saveStageState; every stage screen
 * polls the cached /api/stage/<slug> route (useStageFeed) and follows the highest rev it has seen. On the same
 * device the change also goes out at once on a BroadcastChannel keyed by the event (stageBusName), and sample events
 * live only there and in localStorage (stageLocalKey). Only the 7 system modules can be on the stage: the database
 * refuses anything else, and normalizeStageState drops it here.
 */

export const STAGE_MODULE_IDS: readonly StageModuleId[] = ['welcome', 'photowall', 'quiz', 'raffle', 'rundown', 'menu', 'sponsors'];

export const STAGE_MODULE_NAMES: Record<StageModuleId, string> = Object.fromEntries(
  DEFAULT_STAGE_CONFIG.modules.map((m) => [m.id, m.name]),
) as Record<StageModuleId, string>;

/** Modules that have nothing to show yet; the stage skips them. */
export const STAGE_MODULES_WITHOUT_CONTENT: readonly StageModuleId[] = ['rundown', 'menu', 'sponsors'];

export interface StageModuleSetting {
  id: StageModuleId;
  enabled: boolean;
  seconds: number;
}

export interface StageState {
  active_module: StageModuleId;
  auto_rotate: boolean;
  /** All 7 modules, in stage order. */
  modules: StageModuleSetting[];
  /** Null: the ticker is built from the event's own details. */
  ticker: string | null;
  /** The door prize on stage (its id in the event setup). */
  doorprize_id: string | null;
  /** Goes up with every change; screens follow the highest. 0 = never set. */
  rev: number;
  updated_at: string | null;
}

export interface StageQuiz {
  phase: 'lobby' | 'question' | 'reveal' | 'finished';
  title: string | null;
  join_code: string | null;
  position: number | null;
  question_count: number;
  players: number;
}

export interface StageFeed {
  event: { name: string; slug: string; type: string; timezone: string; starts_at: string; ends_at: string; venue_name: string | null };
  stage: StageState | null;
  checked_in: number;
  doorprize: { config_id: string; name: string; prize: string | null; quantity: number; awarded: number } | null;
  latest_winner: LatestWinner | null;
  /** The open trivia game, if any. */
  quiz: StageQuiz | null;
}

export function isStageModule(id: unknown): id is StageModuleId {
  return typeof id === 'string' && (STAGE_MODULE_IDS as readonly string[]).includes(id);
}

const DEFAULT_SECONDS: Record<StageModuleId, number> = Object.fromEntries(
  DEFAULT_STAGE_CONFIG.modules.map((m) => [m.id, m.durationSeconds]),
) as Record<StageModuleId, number>;

/** Every one of the 7 modules in stage order, taking what `raw` says about each and nothing else. */
export function normalizeStageState(raw?: Partial<StageState> | null): StageState {
  const given = new Map((raw?.modules ?? []).filter((m) => isStageModule(m?.id)).map((m) => [m.id, m]));
  const modules = STAGE_MODULE_IDS.map((id) => {
    const m = given.get(id);
    const seconds = Number(m?.seconds);
    return {
      id,
      enabled: typeof m?.enabled === 'boolean' ? m.enabled : !STAGE_MODULES_WITHOUT_CONTENT.includes(id),
      seconds: Number.isFinite(seconds) ? Math.min(300, Math.max(5, Math.round(seconds))) : DEFAULT_SECONDS[id] ?? 20,
    };
  });
  const active = raw?.active_module;
  return {
    active_module: isStageModule(active) ? active : 'welcome',
    auto_rotate: typeof raw?.auto_rotate === 'boolean' ? raw.auto_rotate : true,
    modules,
    ticker: typeof raw?.ticker === 'string' && raw.ticker.trim() ? raw.ticker.trim().slice(0, 300) : null,
    doorprize_id: typeof raw?.doorprize_id === 'string' && raw.doorprize_id ? raw.doorprize_id : null,
    rev: typeof raw?.rev === 'number' ? raw.rev : 0,
    updated_at: raw?.updated_at ?? null,
  };
}

/** The modules a stage screen can show right now, in order (welcome when none is). */
export function showableModules(state: StageState): StageModuleSetting[] {
  const list = state.modules.filter((m) => m.enabled && !STAGE_MODULES_WITHOUT_CONTENT.includes(m.id));
  return list.length ? list : [{ id: 'welcome', enabled: true, seconds: DEFAULT_SECONDS.welcome ?? 20 }];
}

/** The ticker for an event that has none of its own: the event's name, date, venue and photo wall link. */
export function defaultTicker(event: { name: string; date?: string; venue?: string | null }, domain: string): string {
  const parts = [`Welcome to ${event.name}`, event.date, event.venue, `Share your photos at ${domain}/photowall`].filter(Boolean);
  return `★ ${parts.join(' • ')} ★`;
}

/* ───────────────────────── Same device: BroadcastChannel and localStorage, per event ───────────────────────── */

export const stageBusName = (eventId: string) => `all41_stage_bus:${eventId}`;
export const stageLocalKey = (eventId: string) => `all41_live_stage_state:${eventId}`;

export interface StageBusMessage {
  type: 'STAGE_STATE';
  state: StageState;
}

const localCache = new Map<string, { raw: string | null; value: StageState | null }>();
const localListeners = new Set<() => void>();

/** The stage state this device last published for the event (null if none). */
export function readLocalStage(eventId: string): StageState | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(stageLocalKey(eventId));
  } catch {
    return null;
  }
  const cached = localCache.get(eventId);
  if (cached && cached.raw === raw) return cached.value;
  let value: StageState | null = null;
  try {
    value = raw ? normalizeStageState(JSON.parse(raw) as Partial<StageState>) : null;
  } catch {
    value = null;
  }
  localCache.set(eventId, { raw, value });
  return value;
}

/** Shows a state on this device's stage screens at once (and keeps it for screens opened later). */
export function publishLocalStage(eventId: string, state: StageState) {
  try {
    localStorage.setItem(stageLocalKey(eventId), JSON.stringify(state));
  } catch {}
  localListeners.forEach((l) => l());
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
  const channel = new BroadcastChannel(stageBusName(eventId));
  channel.postMessage({ type: 'STAGE_STATE', state } satisfies StageBusMessage);
  channel.close();
}

/**
 * The stage state the operator on this device published for the event, following every change at once
 * (BroadcastChannel, other tabs' storage events). Null before hydration or when there is none.
 */
export function useLocalStage(eventId: string | null): StageState | null {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (!eventId) return () => {};
      const onStorage = (e: StorageEvent) => {
        if (!e.key || e.key === stageLocalKey(eventId)) cb();
      };
      window.addEventListener('storage', onStorage);
      localListeners.add(cb);
      let channel: BroadcastChannel | null = null;
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel(stageBusName(eventId));
        channel.onmessage = (ev: MessageEvent<StageBusMessage>) => {
          if (ev.data?.type === 'STAGE_STATE') cb();
        };
      }
      return () => {
        window.removeEventListener('storage', onStorage);
        localListeners.delete(cb);
        channel?.close();
      };
    },
    [eventId],
  );
  return useSyncExternalStore(subscribe, () => (eventId ? readLocalStage(eventId) : null), () => null);
}

/** Of two copies of the stage state, the newer (the server's on a tie). */
export function newerStage(server: StageState | null, local: StageState | null): StageState | null {
  if (!server) return local;
  if (!local) return server;
  return local.rev > server.rev ? local : server;
}

/* ───────────────────────── Server ───────────────────────── */

function readable(message: string): string {
  if (/forbidden|permission denied/i.test(message)) return "Only the event's organizers can change the stage.";
  if (message.includes('ticker_too_long')) return 'Keep the ticker to 300 characters.';
  if (message.includes('invalid_stage')) return 'Only the 7 stage modules can be shown on the stage.';
  if (/Failed to fetch|NetworkError|network|load failed/i.test(message)) return 'No connection. Check the internet and try again.';
  return message;
}

/** The saved stage state of an event (organizers and desk staff), or null when none was set yet. */
export async function loadStageState(eventId: string): Promise<StageState | null> {
  const { data, error } = await createClient()
    .from('a41_stage_state')
    .select('active_module, auto_rotate, modules, ticker, doorprize_id, rev, updated_at')
    .eq('event_id', eventId)
    .maybeSingle();
  if (error) throw new Error(readable(error.message));
  return data ? normalizeStageState(data as Partial<StageState>) : null;
}

export type StagePatch = Partial<Pick<StageState, 'active_module' | 'auto_rotate' | 'modules' | 'ticker' | 'doorprize_id'>>;

/** Changes what the event's stage screens show (event managers). Keys left out keep their value. */
export async function saveStageState(eventId: string, patch: StagePatch): Promise<StageState> {
  const body: Record<string, unknown> = { ...patch };
  if (patch.modules) body.modules = patch.modules.filter((m) => isStageModule(m.id)).map((m) => ({ id: m.id, enabled: m.enabled, seconds: m.seconds }));
  if ('ticker' in patch) body.ticker = patch.ticker ?? '';
  const { data, error } = await createClient().rpc('a41_set_stage_state', { p_event: eventId, p_state: body });
  if (error) throw new Error(readable(error.message));
  return normalizeStageState(data as Partial<StageState>);
}

export function stageFeedPath(slug: string): string {
  return `/api/stage/${encodeURIComponent(slug)}`;
}

export async function fetchStageFeed(slug: string, signal?: AbortSignal): Promise<StageFeed | null> {
  const res = await fetch(stageFeedPath(slug), { signal });
  if (res.status === 404) {
    // Drafts are not on the public route; organizers and desk staff read them with their own session.
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) return null;
    const { data, error } = await supabase.rpc('a41_stage_public', { p_slug: slug });
    if (error) throw new Error(readable(error.message));
    return (data as StageFeed | null) ?? null;
  }
  if (!res.ok) throw new Error(`stage ${res.status}`);
  return (await res.json()) as StageFeed;
}

export type StageFeedState = 'loading' | 'ready' | 'missing' | 'offline';

/** Polls the stage feed while the page is visible. enabled false keeps it idle (sample events). */
export function useStageFeed(slug: string, enabled = true, intervalMs = 2000) {
  const [feed, setFeed] = useState<StageFeed | null>(null);
  const [state, setState] = useState<StageFeedState>('loading');

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let controller: AbortController | null = null;
    const load = () => {
      if (document.visibilityState !== 'visible') return;
      controller?.abort();
      controller = new AbortController();
      fetchStageFeed(slug, controller.signal)
        .then((data) => {
          if (!alive) return;
          setFeed(data);
          setState(data ? 'ready' : 'missing');
        })
        .catch((e: unknown) => {
          if (!alive || (e instanceof DOMException && e.name === 'AbortError')) return;
          setState((s) => (s === 'ready' ? s : 'offline'));
        });
    };
    load();
    const timer = window.setInterval(load, intervalMs);
    document.addEventListener('visibilitychange', load);
    return () => {
      alive = false;
      controller?.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [slug, enabled, intervalMs]);

  return { feed, state: enabled ? state : ('missing' as StageFeedState) };
}
