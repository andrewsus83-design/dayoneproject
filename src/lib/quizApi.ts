'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Activity } from '@/lib/eventStore';

/*
 * Live trivia (Supabase RPCs, see supabase/migrations/*_a41_quiz_live.sql).
 *
 *   Host (event managers, signed in): syncActivity → openLobby, then controlQuiz start / reveal / next / end.
 *     useHostQuiz polls a41_quiz_host_state (join code, lobby players, server time) once a second.
 *   Guests (checked-in pass on the phone): joinWithCode, answerQuiz, myQuiz. usePublicQuiz polls the cached
 *     /api/quiz/<play key> once a second; the personal RPCs run only on join, on answer, and when a reveal or the
 *     end lands, so 1,500 phones do not hammer the database.
 *
 * Questions open 3 seconds after start / next (openedAt); screens and phones count 3, 2, 1 until then, on the
 * server's clock (serverNow) so every device flips at the same moment.
 */

export type QuizPhase = 'lobby' | 'question' | 'reveal' | 'finished';

export interface QuizQuestion {
  prompt: string;
  options: string[];
  timeLimit: number;
  basePoints: number;
  /** Epoch ms: answers count from here (3 s after start / next). */
  openedAt: number;
  closesAt: number;
}

export interface QuizReveal {
  correctIndex: number;
  /** Answers per option. */
  counts: number[];
}

export interface QuizStanding {
  id: string;
  rank: number;
  /** "No. 007" when the quiz is anonymous, otherwise the short name ("Alice S."). */
  name: string;
  score: number;
  correct: number;
}

export interface QuizSession {
  id: string;
  rev: number;
  phase: QuizPhase;
  quizId: string;
  /** The Games activity this quiz came from (null for an older version that was replaced). */
  activityId: string | null;
  quizTitle: string;
  anonymous: boolean;
  questionCount: number;
  position: number | null;
  players: number;
  answered: number | null;
  question: QuizQuestion | null;
  reveal: QuizReveal | null;
  /** Top 10, in reveal and finished. */
  leaderboard: QuizStanding[] | null;
  /** Host state only: the 6-digit code while the session is live. */
  joinCode?: string | null;
  /** Host state only, in the lobby: the latest 50 players. */
  lobbyPlayers?: { id: string; name: string }[];
}

export interface QuizState {
  session: QuizSession | null;
}

export interface HostQuizState extends QuizState {
  now: number;
  /** Guests can only join a published event. */
  published: boolean;
}

export interface QuizMyAnswer {
  position: number;
  choice: number;
  correct?: boolean;
  points?: number;
  elapsedMs?: number;
}

export interface QuizMe {
  id: string;
  name: string;
  number: number;
  anonymous?: boolean;
  now: number;
  session: { id: string; rev: number; phase: QuizPhase; position: number | null } | null;
  joined?: boolean;
  score?: number;
  correct?: number;
  rank?: number | null;
  players?: number;
  answer?: QuizMyAnswer | null;
}

export type JoinFailure = 'no_pass' | 'not_checked_in' | 'wrong_code' | 'no_game' | 'finished';
export type JoinResult = (QuizMe & { ok: true; playKey: string }) | { ok: false; reason: JoinFailure };

export type AnswerFailure = 'no_session' | 'closed' | 'not_open' | 'late' | 'invalid_choice' | 'already_answered';
export type AnswerResult = { ok: true; choice: number } | { ok: false; reason: AnswerFailure; choice?: number; opensAt?: number };

/** The 3-2-1 before every question (a41_quiz_control). */
export const QUIZ_COUNTDOWN_MS = 3000;

/** Brand colours of the answer buttons, A to D (screen and phones match). */
export const ANSWER_STYLES = [
  { letter: 'A', shape: '▲', button: 'bg-premium-danger text-white', badge: 'bg-premium-danger text-white', bar: 'bg-premium-danger' },
  { letter: 'B', shape: '◆', button: 'bg-premium-neon text-black', badge: 'bg-premium-neon text-black', bar: 'bg-premium-neon' },
  { letter: 'C', shape: '●', button: 'bg-premium-gold text-black', badge: 'bg-premium-gold text-black', bar: 'bg-premium-gold' },
  { letter: 'D', shape: '■', button: 'bg-premium-success text-black', badge: 'bg-premium-success text-black', bar: 'bg-premium-success' },
] as const;

/* ───────────────────────── Server clock ───────────────────────── */

let clockOffset = 0;

/** Remembers how far this device's clock is from the server's (from an RPC that returned the server time). */
function noteServerTime(serverNow: unknown, sentAt: number) {
  if (typeof serverNow !== 'number' || !Number.isFinite(serverNow)) return;
  const receivedAt = Date.now();
  clockOffset = serverNow - (sentAt + receivedAt) / 2;
}

/** The server's time in epoch ms, as best this device knows it. */
export function serverNow(): number {
  return Date.now() + clockOffset;
}

/** serverNow(), refreshed every `ms` while `active`. */
export function useServerNow(active = true, ms = 200): number {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(serverNow()), ms);
    return () => window.clearInterval(t);
  }, [active, ms]);
  return now;
}

/* ───────────────────────── Errors ───────────────────────── */

export class QuizError extends Error {
  readonly forbidden: boolean;

  constructor(message: string, forbidden = false) {
    super(message);
    this.name = 'QuizError';
    this.forbidden = forbidden;
  }
}

function toError(error: PostgrestError): QuizError {
  if (error.code === '42501' || /forbidden|permission denied/i.test(error.message)) {
    return new QuizError('Sign in as an organizer to run the game.', true);
  }
  if (/Failed to fetch|NetworkError|network/i.test(error.message)) return new QuizError('No connection. Check the internet and try again.');
  return new QuizError(error.details || error.message);
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await createClient().rpc(fn, args);
  if (error) throw toError(error);
  return data as T;
}

/* ───────────────────────── Host ───────────────────────── */

/** Copies the activity's questions into the live quiz (only while no game of it is open). */
export function syncActivity(eventId: string, activity: Activity): Promise<{ quizId: string; changed: boolean }> {
  return rpc('a41_quiz_sync_activity', {
    p_event: eventId,
    p_activity_id: activity.id,
    p_title: activity.name,
    p_anonymous: activity.anonymous,
    p_questions: activity.questions.map((q) => ({ text: q.text, options: q.options, answer: q.answer, points: q.points, seconds: q.seconds })),
  });
}

async function hostCall(fn: string, args: Record<string, unknown>): Promise<HostQuizState> {
  const sentAt = Date.now();
  const state = await rpc<HostQuizState>(fn, args);
  noteServerTime(state?.now, sentAt);
  return state;
}

export function openLobby(quizId: string): Promise<HostQuizState> {
  return hostCall('a41_quiz_open_lobby', { p_quiz: quizId });
}

export function controlQuiz(sessionId: string, action: 'start' | 'reveal' | 'next' | 'end', position?: number | null): Promise<HostQuizState> {
  return hostCall('a41_quiz_control', { p_session: sessionId, p_action: action, p_position: position ?? null });
}

export function hostState(eventId: string): Promise<HostQuizState> {
  return hostCall('a41_quiz_host_state', { p_event: eventId });
}

/** A newer state for the same session never gets replaced by an older one that arrived late. */
function isStale<T extends QuizState>(incoming: T, current: T | null): boolean {
  const a = incoming.session;
  const b = current?.session;
  return !!a && !!b && a.id === b.id && a.rev < b.rev;
}

/** The host's big screen: polls the host state every pollMs while the page is visible. eventId null stays idle. */
export function useHostQuiz(eventId: string | null, pollMs = 1000) {
  const [state, setState] = useState<HostQuizState | null>(null);
  const [error, setError] = useState<QuizError | null>(null);
  const latest = useRef<HostQuizState | null>(null);

  const apply = useCallback((next: HostQuizState) => {
    if (isStale(next, latest.current)) return;
    latest.current = next;
    setState(next);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!eventId) return;
    try {
      apply(await hostState(eventId));
    } catch (e) {
      setError(e instanceof QuizError ? e : new QuizError('Could not load the game.'));
    }
  }, [eventId, apply]);

  useEffect(() => {
    if (!eventId) return;
    let running = false;
    const tick = () => {
      if (running || document.visibilityState !== 'visible') return;
      running = true;
      void refresh().finally(() => {
        running = false;
      });
    };
    tick();
    const t = window.setInterval(tick, pollMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [eventId, pollMs, refresh]);

  return { state, error, refresh, apply };
}

/* ───────────────────────── Guests ───────────────────────── */

/** Joins the live game with the code on the big screen (checked-in guests only). */
export async function joinWithCode(code: string, token: string): Promise<JoinResult> {
  const sentAt = Date.now();
  const result = await rpc<JoinResult>('a41_quiz_join_code', { p_code: code, p_token: token });
  if (result.ok) noteServerTime(result.now, sentAt);
  return result;
}

/** This guest's own card (answer, score, rank). Null when the pass is unknown. */
export async function myQuiz(token: string): Promise<QuizMe | null> {
  const sentAt = Date.now();
  const me = await rpc<QuizMe | null>('a41_quiz_me', { p_token: token });
  if (me) noteServerTime(me.now, sentAt);
  return me;
}

/** Null when the pass is not checked in (or unknown). */
export function answerQuiz(token: string, position: number, choice: number): Promise<AnswerResult | null> {
  return rpc<AnswerResult | null>('a41_quiz_answer', { p_token: token, p_position: position, p_choice: choice });
}

export function quizStatePath(playKey: string): string {
  return `/api/quiz/${encodeURIComponent(playKey)}`;
}

export async function fetchQuizState(playKey: string, signal?: AbortSignal): Promise<QuizState | null> {
  const res = await fetch(quizStatePath(playKey), { signal });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`quiz ${res.status}`);
  return (await res.json()) as QuizState;
}

export type PublicQuizStatus = 'loading' | 'ready' | 'missing' | 'offline';

/** The cached public state, polled every intervalMs while the page is visible. playKey null stays idle. */
export function usePublicQuiz(playKey: string | null, intervalMs = 1000) {
  const [state, setState] = useState<QuizState | null>(null);
  const [status, setStatus] = useState<PublicQuizStatus>('loading');
  const latest = useRef<QuizState | null>(null);

  useEffect(() => {
    if (!playKey) return;
    let alive = true;
    let controller: AbortController | null = null;
    const load = () => {
      if (document.visibilityState !== 'visible') return;
      controller?.abort();
      controller = new AbortController();
      fetchQuizState(playKey, controller.signal)
        .then((data) => {
          if (!alive) return;
          if (!data) {
            setStatus('missing');
            return;
          }
          if (isStale(data, latest.current)) return;
          latest.current = data;
          setState(data);
          setStatus('ready');
        })
        .catch((e: unknown) => {
          if (!alive || (e instanceof DOMException && e.name === 'AbortError')) return;
          setStatus((s) => (s === 'ready' ? s : 'offline'));
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
  }, [playKey, intervalMs]);

  return { state, status: playKey ? status : ('loading' as PublicQuizStatus) };
}

/* ───────────────────────── The game this phone joined ───────────────────────── */

export interface JoinedGame {
  sessionId: string;
  playKey: string;
}

const joinedKey = (slug: string) => `d1-quiz-${slug}`;

export function readJoinedGame(slug: string): JoinedGame | null {
  try {
    const raw = localStorage.getItem(joinedKey(slug));
    const parsed = raw ? (JSON.parse(raw) as Partial<JoinedGame>) : null;
    return parsed?.sessionId && parsed.playKey ? { sessionId: parsed.sessionId, playKey: parsed.playKey } : null;
  } catch {
    return null;
  }
}

export function storeJoinedGame(slug: string, game: JoinedGame) {
  try {
    localStorage.setItem(joinedKey(slug), JSON.stringify(game));
  } catch {}
}

/** "123456" → "123 456". */
export function formatJoinCode(code: string | null | undefined): string {
  return code && code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code ?? '';
}
