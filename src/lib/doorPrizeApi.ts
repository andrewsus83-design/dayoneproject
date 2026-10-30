'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { isServerEventId } from '@/lib/guestsApi';
import { formatGuestNumber, type DoorPrize, type DrawWinner } from '@/lib/eventStore';

/*
 * Door prizes on the server (supabase/migrations/*_a41_door_prize_server.sql).
 *
 *   Organizers (event managers): syncDoorPrizes (the setup → a41_raffle_prizes, by door prize id), drawDoorPrize
 *     (a random checked-in guest who has not won yet), drawDoorNumber (number-range draws), forfeitDraw, and the
 *     board (useDoorPrizeBoard) with every draw and its guest id.
 *   Everyone: the cached /api/doorprize/<slug> route (usePublicDoorPrizes) with names, or guest numbers for
 *     anonymous door prizes. Never contacts.
 *
 * The server picks the winner; the screen's machine only animates onto it. A draw stays off every board until its
 * machine has landed (reveal_at), so phones never give the winner away early. Sample events keep their winners on
 * this device (eventStore's recordDrawWinner).
 */

export interface ServerWinner {
  id: string;
  at: string;
  /** Number-range draws: the number drawn (there is no guest). */
  number: number | null;
  guest_number: number | null;
  /** Null for number draws, and on public boards for anonymous door prizes. */
  name: string | null;
  table_no: string | null;
  /** Organizers' board only. */
  status?: 'won' | 'forfeited';
  guest_id?: string | null;
  resolved_at?: string | null;
}

export interface ServerPrize {
  /** The door prize id in the event setup (config.doorprizes.items[].id). */
  config_id: string | null;
  name: string;
  prize: string | null;
  quantity: number;
  anonymous: boolean;
  /** Winners drawn and not forfeited, including one still animating. */
  awarded: number;
  /** Revealed draws, newest first (public boards: winners only). */
  winners: ServerWinner[];
}

export interface LatestWinner extends ServerWinner {
  config_id: string | null;
  prize_name: string;
  prize: string | null;
}

export interface DoorPrizeBoard {
  prizes: ServerPrize[];
  latest: LatestWinner | null;
  /** Organizers' board only. */
  checked_in?: number;
  remaining?: number;
}

export interface PublicDoorPrizes extends DoorPrizeBoard {
  event: { name: string; slug: string };
}

export interface GuestDraw {
  drawId: string;
  guest: { id: string; name: string; table_no: string | null; guest_number: number };
}

/* ───────────────────────── Errors ───────────────────────── */

const MESSAGES: Record<string, string> = {
  prize_fully_awarded: 'Every winner of this door prize has been drawn.',
  no_eligible_guests: 'No checked-in guests left to draw from.',
  no_numbers_left: 'Every number has already been drawn.',
  invalid_total: 'Set how many numbers are in the draw (1 to 100,000).',
  invalid_door_prize: 'This door prize could not be read. Reload the page and try again.',
  invalid_door_prizes: 'An event can have up to 100 door prizes.',
  raffle_prize_limit: 'An event can have up to 100 door prizes.',
  draw_not_found: 'That draw was not found. Reload the page.',
  draw_not_open: 'That winner was already forfeited.',
};

function readable(error: Pick<PostgrestError, 'message' | 'code'>): string {
  const code = Object.keys(MESSAGES).find((k) => error.message.includes(k));
  if (code) return MESSAGES[code];
  if (error.code === '42501' || /forbidden|permission denied/i.test(error.message)) {
    return "Only the event's organizers can draw door prizes.";
  }
  if (/Failed to fetch|NetworkError|network|load failed/i.test(error.message)) return 'No connection. Check the internet and try again.';
  return error.message;
}

class DoorPrizeError extends Error {
  readonly forbidden: boolean;

  constructor(error: Pick<PostgrestError, 'message' | 'code'>) {
    super(readable(error));
    this.name = 'DoorPrizeError';
    this.forbidden = error.code === '42501' || /forbidden|permission denied/i.test(error.message);
  }
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await createClient().rpc(fn, args);
  if (error) throw new DoorPrizeError(error);
  return data as T;
}

/* ───────────────────────── Organizers ───────────────────────── */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What the server keeps of a door prize item. */
function itemPayload(d: DoorPrize) {
  return { id: d.id, name: d.name.trim() || 'Door Prize', prize: d.prize.trim(), quantity: d.quantity, anonymous: d.anonymous };
}

/** Makes the server's door prizes match the setup. Returns the organizers' board. */
export async function syncDoorPrizes(eventId: string, items: DoorPrize[]): Promise<DoorPrizeBoard> {
  const board = await rpc<DoorPrizeBoard>('a41_sync_door_prizes', { p_event: eventId, p_items: items.slice(0, 100).map(itemPayload) });
  setBoard(eventId, { board, status: 'ready', error: null, loadedAt: Date.now() });
  return board;
}

/**
 * Draws a winner of the door prize: a random checked-in guest with no draw in this event yet (only the picked
 * guests when the door prize is for picked guests). revealMs is how long the machine animates first.
 */
export async function drawDoorPrize(eventId: string, draw: DoorPrize, revealMs: number): Promise<GuestDraw> {
  const picked = draw.audience === 'picked' ? draw.pickedGuestIds.filter((id) => UUID.test(id)) : null;
  const r = await rpc<{ draw: { id: string }; guest: GuestDraw['guest'] }>('a41_draw_door_prize', {
    p_event: eventId,
    p_item: itemPayload(draw),
    p_picked: picked,
    p_reveal_ms: Math.round(revealMs),
  });
  return { drawId: r.draw.id, guest: r.guest };
}

/** Draws a number from 1 to total that has not come up in this event yet (number-range door prizes). */
export async function drawDoorNumber(eventId: string, draw: DoorPrize, total: number, revealMs: number): Promise<{ drawId: string; number: number }> {
  const r = await rpc<{ draw: { id: string; number: number } }>('a41_draw_door_number', {
    p_event: eventId,
    p_item: itemPayload(draw),
    p_total: Math.floor(total),
    p_reveal_ms: Math.round(revealMs),
  });
  return { drawId: r.draw.id, number: r.draw.number };
}

/** The winner did not come forward: they stay out of the draw, and the prize can be drawn again. */
export async function forfeitDraw(eventId: string, drawId: string): Promise<void> {
  await rpc('a41_forfeit_raffle_draw', { p_draw: drawId });
  void refreshDoorPrizeBoard(eventId);
}

/* ───────────────────────── The organizers' board, shared by every screen ───────────────────────── */

export interface BoardState {
  board: DoorPrizeBoard | null;
  /** forbidden: this account does not run the event (or nobody is signed in). */
  status: 'idle' | 'loading' | 'ready' | 'forbidden' | 'error';
  error: string | null;
  loadedAt: number;
}

const IDLE: BoardState = { board: null, status: 'idle', error: null, loadedAt: 0 };
const STALE_MS = 10_000;
const boards = new Map<string, BoardState>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function setBoard(eventId: string, patch: Partial<BoardState>) {
  boards.set(eventId, { ...(boards.get(eventId) ?? IDLE), ...patch });
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Reloads an event's board from the server; every screen showing it updates. */
export function refreshDoorPrizeBoard(eventId: string): Promise<void> {
  const running = inflight.get(eventId);
  if (running) return running;
  if ((boards.get(eventId) ?? IDLE).status === 'idle') setBoard(eventId, { status: 'loading' });
  const p = (async () => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) {
      setBoard(eventId, { status: 'forbidden', error: null, loadedAt: Date.now() });
      return;
    }
    const { data, error } = await supabase.rpc('a41_door_prize_board', { p_event: eventId });
    if (error) {
      const e = new DoorPrizeError(error);
      setBoard(eventId, e.forbidden ? { status: 'forbidden', error: null, loadedAt: Date.now() } : { status: 'error', error: e.message, loadedAt: Date.now() });
      return;
    }
    setBoard(eventId, { board: data as DoorPrizeBoard, status: 'ready', error: null, loadedAt: Date.now() });
  })()
    .catch((e) => setBoard(eventId, { status: 'error', error: e instanceof Error ? e.message : 'Could not load the door prizes.', loadedAt: Date.now() }))
    .finally(() => inflight.delete(eventId));
  inflight.set(eventId, p);
  return p;
}

/**
 * The organizers' board of a saved event (pass null for sample events). Loads on first use, is shared by every
 * component on the page, and reloads every pollMs while the page is visible.
 */
export function useDoorPrizeBoard(eventId: string | null, pollMs = 0) {
  const id = eventId && isServerEventId(eventId) ? eventId : null;
  const state = useSyncExternalStore(subscribe, () => (id ? boards.get(id) ?? IDLE : IDLE), () => IDLE);

  useEffect(() => {
    if (!id) return;
    const cur = boards.get(id);
    if (!cur || Date.now() - cur.loadedAt > STALE_MS) void refreshDoorPrizeBoard(id);
    if (!pollMs) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshDoorPrizeBoard(id);
    }, pollMs);
    return () => clearInterval(t);
  }, [id, pollMs]);

  const refresh = useCallback(() => (id ? refreshDoorPrizeBoard(id) : Promise.resolve()), [id]);
  return { ...state, refresh };
}

/** Every guest and number that already has a draw (won or forfeited): the server never draws them again. */
export function boardExclusions(board: DoorPrizeBoard | null) {
  const numbers: number[] = [];
  const guestIds: string[] = [];
  for (const p of board?.prizes ?? []) {
    for (const w of p.winners) {
      if (typeof w.number === 'number') numbers.push(w.number);
      if (w.guest_id) guestIds.push(w.guest_id);
    }
  }
  return { numbers, guestIds };
}

/** A server draw as the screens list a winner: "No. 012" for numbers and anonymous door prizes, else the name. */
export function toDrawWinner(prize: Pick<ServerPrize, 'anonymous'>, w: ServerWinner, digits = 3): DrawWinner {
  if (w.number != null) return { id: w.id, at: w.at, label: formatGuestNumber(w.number, digits), number: w.number };
  if (prize.anonymous || !w.name) {
    return { id: w.id, at: w.at, label: formatGuestNumber(w.guest_number ?? undefined, digits), number: w.guest_number ?? undefined, guestId: w.guest_id ?? undefined };
  }
  return { id: w.id, at: w.at, label: w.name, guestId: w.guest_id ?? undefined };
}

/** The server prize behind a door prize item. */
export function serverPrize(board: DoorPrizeBoard | null, drawId: string): ServerPrize | undefined {
  return board?.prizes.find((p) => p.config_id === drawId);
}

/**
 * Door prize items with their winners: from the server for saved events (won draws only), as kept on this device
 * for sample events. Handy for screens that list winners (dashboard, broadcast).
 */
export function useDoorPrizeItems(eventId: string, items: DoorPrize[], digits = 3) {
  const server = isServerEventId(eventId);
  const { board, status } = useDoorPrizeBoard(server ? eventId : null);
  const withWinners = useMemo(() => {
    if (!server) return items;
    return items.map((d) => {
      const p = serverPrize(board, d.id);
      return { ...d, winners: p ? p.winners.filter((w) => w.status !== 'forfeited').map((w) => toDrawWinner(p, w, digits)) : [] };
    });
  }, [server, items, board, digits]);
  return { items: withWinners, server, board, status };
}

/**
 * Keeps the server's door prizes in step with the setup while an organizer has it open (saved events only).
 * Changes are sent a moment after the last edit.
 */
export function useDoorPrizeSync(eventId: string | null, items: DoorPrize[], enabled = true) {
  const id = enabled && eventId && isServerEventId(eventId) ? eventId : null;
  const key = JSON.stringify(items.map(itemPayload));
  const sent = useRef<string | null>(null);
  const latest = useRef(items);
  useEffect(() => {
    latest.current = items;
  });
  useEffect(() => {
    if (!id || sent.current === key) return;
    const t = setTimeout(() => {
      sent.current = key;
      syncDoorPrizes(id, latest.current).catch(() => {
        // Not allowed (desk staff) or offline: draws still send their own door prize.
        sent.current = null;
      });
    }, sent.current === null ? 0 : 800);
    return () => clearTimeout(t);
  }, [id, key]);
}

/* ───────────────────────── Everyone: the cached public board ───────────────────────── */

export function doorPrizeFeedPath(slug: string): string {
  return `/api/doorprize/${encodeURIComponent(slug)}`;
}

export async function fetchPublicDoorPrizes(slug: string, signal?: AbortSignal): Promise<PublicDoorPrizes | null> {
  const res = await fetch(doorPrizeFeedPath(slug), { signal });
  if (res.status === 404) {
    // Drafts are not on the public route; organizers and desk staff read them with their own session.
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) return null;
    const { data, error } = await supabase.rpc('a41_door_prize_public', { p_slug: slug });
    if (error) throw new DoorPrizeError(error);
    return (data as PublicDoorPrizes | null) ?? null;
  }
  if (!res.ok) throw new Error(`door prizes ${res.status}`);
  return (await res.json()) as PublicDoorPrizes;
}

export type FeedState = 'loading' | 'ready' | 'missing' | 'offline';

/** A winner that came in while the page was open, for the reveal. */
export interface FreshWinner {
  prize: ServerPrize;
  winner: ServerWinner;
}

/**
 * Polls the public door prize board while the page is visible. enabled false keeps it idle. `fresh` is the newest
 * winner revealed since the page opened (null until one comes in).
 */
export function usePublicDoorPrizes(slug: string, enabled = true, intervalMs = 3000) {
  const [data, setData] = useState<PublicDoorPrizes | null>(null);
  const [state, setState] = useState<FeedState>('loading');
  const [fresh, setFresh] = useState<FreshWinner | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let controller: AbortController | null = null;
    // Winners already on the board when the page opened are not news.
    let seen: Set<string> | null = null;
    const load = () => {
      if (document.visibilityState !== 'visible') return;
      controller?.abort();
      controller = new AbortController();
      fetchPublicDoorPrizes(slug, controller.signal)
        .then((d) => {
          if (!alive) return;
          if (d) {
            let news: FreshWinner | null = null;
            for (const prize of d.prizes) {
              for (const winner of prize.winners) {
                if (seen && !seen.has(winner.id) && (!news || Date.parse(winner.at) > Date.parse(news.winner.at))) news = { prize, winner };
              }
            }
            seen = new Set(d.prizes.flatMap((p) => p.winners.map((w) => w.id)));
            if (news) setFresh(news);
          }
          setData(d);
          setState(d ? 'ready' : 'missing');
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

  const dismissFresh = useCallback(() => setFresh(null), []);
  return { data, state: enabled ? state : ('missing' as FeedState), fresh, dismissFresh };
}

/** How a winner reads on a public screen: "No. 012" for numbers and anonymous door prizes, else the name. */
export function publicWinnerLabel(w: ServerWinner, digits = 3): string {
  if (w.number != null) return `No. ${formatGuestNumber(w.number, digits)}`;
  if (w.name) return w.name;
  return `No. ${formatGuestNumber(w.guest_number ?? undefined, digits)}`;
}
