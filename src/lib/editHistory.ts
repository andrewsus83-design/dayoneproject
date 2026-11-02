/**
 * Undo and redo for the screen editor. Plain functions on a plain object so the rules are easy to test:
 * - `commit` is one step (a click on a chip, adding or deleting something);
 * - a drag is a gesture: `gestureStart`, many `gestureLive`, then `gestureEnd`, which makes the whole drag one step;
 * - a slider or a text box sends `commit` with a `key`: changes with the same key within `COALESCE_MS` of each other
 *   merge into one step, so one slide of a slider is one undo, not fifty.
 */

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  /** What the draft was when the current gesture began. */
  base: T | null;
  /** The key and time of the last keyed commit. */
  key: string | null;
  at: number;
}

export const COALESCE_MS = 700;
const LIMIT = 100;

export const newHistory = <T,>(present: T): History<T> => ({ past: [], present, future: [], base: null, key: null, at: 0 });

const push = <T,>(past: T[], item: T) => [...past, item].slice(-LIMIT);

export function commit<T>(h: History<T>, next: T, opts?: { key: string; now: number }): History<T> {
  if (next === h.present) return h;
  const merge = !!opts && h.key === opts.key && opts.now - h.at <= COALESCE_MS && h.past.length > 0;
  return {
    past: merge ? h.past : push(h.past, h.present),
    present: next,
    future: [],
    base: null,
    key: opts?.key ?? null,
    at: opts?.now ?? 0,
  };
}

export const gestureStart = <T,>(h: History<T>): History<T> => ({ ...h, base: h.present, key: null });

export const gestureLive = <T,>(h: History<T>, next: T): History<T> => ({ ...h, present: next });

export function gestureEnd<T>(h: History<T>): History<T> {
  if (h.base === null) return h;
  if (h.present === h.base) return { ...h, base: null };
  return { ...h, past: push(h.past, h.base), future: [], base: null, key: null };
}

export function undo<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future], base: null, key: null, at: 0 };
}

export function redo<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  return { past: push(h.past, h.present), present: h.future[0], future: h.future.slice(1), base: null, key: null, at: 0 };
}
