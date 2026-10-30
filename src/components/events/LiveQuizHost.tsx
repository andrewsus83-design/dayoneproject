'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { AlertTriangle, CheckCircle2, Clock, Crown, LogIn, Play, RotateCcw, Square, Trophy, Users } from 'lucide-react';
import type { Activity, NameAlign } from '@/lib/eventStore';
import { getClientDomain, getEffectiveClientUrl } from '@/lib/domain';
import { useSessionUser } from '@/lib/useSession';
import {
  ANSWER_STYLES, controlQuiz, formatJoinCode, openLobby, syncActivity, useHostQuiz, useServerNow,
  type HostQuizState, type QuizSession, type QuizStanding,
} from '@/lib/quizApi';

const card = 'w-full p-8 sm:p-10 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark shadow-2xl';
const goldButton = 'px-8 py-4 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold shadow-gold scale-on-click disabled:opacity-50 flex items-center justify-center gap-2';
const quietButton = 'px-5 py-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-300 hover:text-white text-xs font-bold scale-on-click disabled:opacity-50 flex items-center justify-center gap-2';
const alignText: Record<NameAlign, string> = { left: 'text-left', center: 'text-center', right: 'text-right' };

function Panel({ children }: { children: React.ReactNode }) {
  return <div className={`${card} text-center space-y-5`}>{children}</div>;
}

export function useJoinQr(slug: string, code: string | null | undefined) {
  const [qr, setQr] = useState<{ code: string; url: string }>({ code: '', url: '' });
  useEffect(() => {
    if (!code) return;
    let alive = true;
    QRCode.toDataURL(getEffectiveClientUrl(slug, `/play?code=${code}`), { width: 360, margin: 1, color: { dark: '#09090B', light: '#FFFFFF' } })
      .then((url) => alive && setQr({ code, url }))
      .catch(() => alive && setQr({ code, url: '' }));
    return () => {
      alive = false;
    };
  }, [slug, code]);
  return qr.code === code ? qr.url : '';
}

function Leaderboard({ rows, limit = 10 }: { rows: QuizStanding[]; limit?: number }) {
  if (rows.length === 0) return <p className="text-sm text-zinc-500">No one answered yet.</p>;
  return (
    <ol className="space-y-2 text-left">
      {rows.slice(0, limit).map((r) => (
        <li key={r.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${r.rank === 1 ? 'bg-premium-gold/10 border-premium-gold/50' : 'bg-premium-surfaceDark border-premium-borderDark'}`}>
          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm shrink-0 ${r.rank === 1 ? 'bg-premium-gold text-black shadow-gold' : 'bg-premium-charcoal text-zinc-300 border border-premium-borderDark'}`}>
            {r.rank === 1 ? <Crown className="w-4 h-4" /> : r.rank}
          </span>
          <span className="flex-1 min-w-0 truncate font-display font-bold text-white">{r.name}</span>
          <span className="text-[11px] font-mono text-zinc-500">{r.correct} right</span>
          <span className="font-mono font-bold text-premium-gold">{r.score.toLocaleString()}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The live game on the big screen for a saved event: open the lobby (copies the activity's questions to the
 * server), show the join code and QR, start, 3-2-1, questions on a timer, reveal, next, final leaderboard.
 * Guests play on their phones at /events/<slug>/play.
 */
export function LiveQuizHost({ eventId, slug, activity }: { eventId: string; slug: string; activity: Activity }) {
  const { user, ready } = useSessionUser();
  const { state, error, apply } = useHostQuiz(user ? eventId : null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const session = state?.session ?? null;
  const ticking = session?.phase === 'question';
  const now = useServerNow(ticking, 200);

  const run = async (work: () => Promise<HostQuizState>) => {
    setBusy(true);
    setActionError(null);
    try {
      apply(await work());
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const open = () =>
    run(async () => {
      const { quizId } = await syncActivity(eventId, activity);
      return openLobby(quizId);
    });

  // Reveal on its own when time is up, or as soon as every player has answered.
  const autoRevealed = useRef('');
  useEffect(() => {
    if (!session || session.phase !== 'question' || !session.question || busy) return;
    const tag = `${session.id}:${session.position}`;
    if (autoRevealed.current === tag) return;
    const q = session.question;
    const timeUp = now >= q.closesAt + 400;
    const allIn = now >= q.openedAt && session.players > 0 && (session.answered ?? 0) >= session.players;
    if (!timeUp && !allIn) return;
    autoRevealed.current = tag;
    controlQuiz(session.id, 'reveal', session.position).then(apply).catch(() => {
      // Someone pressed Reveal first, or the connection dropped: the next poll shows where the game is.
    });
  }, [session, now, busy, apply]);

  // Confetti once when this screen sees its game end (not when it opens on a game that ended earlier).
  const watchedLive = useRef('');
  const celebrated = useRef('');
  useEffect(() => {
    if (!session || session.activityId !== activity.id) return;
    if (session.phase !== 'finished') {
      watchedLive.current = session.id;
    } else if (watchedLive.current === session.id && celebrated.current !== session.id) {
      celebrated.current = session.id;
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.5 } });
    }
  }, [session, activity.id]);

  const qr = useJoinQr(slug, session?.phase === 'lobby' ? session.joinCode : null);

  if (!ready || (user && !state && !error)) {
    return <div className="text-sm text-zinc-500">Loading the game…</div>;
  }

  if (!user || error?.forbidden) {
    const next = `/events/${slug}/games/${activity.id}`;
    return (
      <Panel>
        <div className="w-14 h-14 mx-auto rounded-full bg-premium-gold/10 border border-premium-gold/30 text-premium-gold flex items-center justify-center"><LogIn className="w-6 h-6" /></div>
        <h2 className="text-2xl font-display font-bold text-white">Sign in as an organizer to run the game</h2>
        <p className="text-sm text-zinc-400">Guests play on their phones; the big screen controls the game, so it needs an organizer of this event.</p>
        <Link href={`/login?next=${encodeURIComponent(next)}`} className={`${goldButton} inline-flex`}>Sign in</Link>
      </Panel>
    );
  }

  if (!state) {
    return (
      <Panel>
        <h2 className="text-xl font-display font-bold text-white">We couldn&apos;t load the game</h2>
        <p className="text-sm text-zinc-400">{error?.message}</p>
        <p className="text-xs text-zinc-500">Retrying every second…</p>
      </Panel>
    );
  }

  const errorLine = actionError && <p className="text-sm text-premium-danger">{actionError}</p>;
  const draftWarning = !state.published && (
    <p className="text-xs text-premium-gold flex items-center justify-center gap-2"><AlertTriangle className="w-4 h-4" /> This event is not published yet, so guests&apos; phones can&apos;t join. Publish it first.</p>
  );
  const mine = !!session && session.activityId === activity.id;

  // Another activity's game is open: one live game per event.
  if (session && session.phase !== 'finished' && !mine) {
    return (
      <Panel>
        <h2 className="text-2xl font-display font-bold text-white">“{session.quizTitle}” is open</h2>
        <p className="text-sm text-zinc-400">One game runs at a time. End that game to start {activity.name}.</p>
        <button type="button" disabled={busy} onClick={() => confirm(`End “${session.quizTitle}” for everyone?`) && run(() => controlQuiz(session.id, 'end'))} className={`${quietButton} mx-auto`}>
          <Square className="w-4 h-4" /> End “{session.quizTitle}”
        </button>
        {errorLine}
      </Panel>
    );
  }

  if (!session || !mine) {
    return (
      <Panel>
        <div className="w-16 h-16 mx-auto rounded-full bg-premium-neon/10 border border-premium-neon/30 text-premium-neon flex items-center justify-center"><Users className="w-7 h-7" /></div>
        <h2 className={`text-3xl font-display font-bold text-white ${alignText[activity.nameAlign]}`}>{activity.name}</h2>
        <p className="text-sm text-zinc-400">
          {activity.questions.length} question{activity.questions.length === 1 ? '' : 's'}. Open the lobby and checked-in guests join on their phones with a code.
        </p>
        {draftWarning}
        <button type="button" disabled={busy || activity.questions.length === 0} onClick={open} className={`${goldButton} mx-auto text-base`}>
          <Play className="w-5 h-5" /> {busy ? 'Opening…' : 'Open lobby'}
        </button>
        {errorLine}
      </Panel>
    );
  }

  return (
    <div className="w-full space-y-4">
      {session.phase === 'lobby' && (
        <LobbyCard
          slug={slug}
          title={activity.name}
          nameAlign={activity.nameAlign}
          joinCode={session.joinCode}
          qr={qr}
          anonymous={session.anonymous}
          players={session.players}
          names={session.lobbyPlayers ?? []}
          busy={busy}
          onStart={() => run(() => controlQuiz(session.id, 'start'))}
        />
      )}
      {session.phase === 'question' && <QuestionView session={session} now={now} busy={busy} onReveal={() => run(() => controlQuiz(session.id, 'reveal', session.position))} />}
      {session.phase === 'reveal' && <RevealView session={session} busy={busy} onNext={() => run(() => controlQuiz(session.id, 'next', session.position))} />}
      {session.phase === 'finished' && (
        <div className={`${card} space-y-6`}>
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-premium-gold/15 text-premium-gold mx-auto flex items-center justify-center shadow-gold"><Trophy className="w-8 h-8" /></div>
            <span className="text-xs font-mono uppercase text-premium-neon font-bold tracking-widest">Final leaderboard</span>
            <h2 className="text-3xl font-display font-bold text-white">{session.quizTitle}</h2>
            <p className="text-xs text-zinc-500">{session.players} player{session.players === 1 ? '' : 's'}</p>
          </div>
          <Leaderboard rows={session.leaderboard ?? []} />
          <button type="button" disabled={busy} onClick={open} className={`${quietButton} mx-auto`}><RotateCcw className="w-4 h-4" /> New game</button>
        </div>
      )}
      {errorLine && <div className="text-center">{errorLine}</div>}
      {draftWarning}
      {session.phase !== 'finished' && (
        <div className="flex justify-center">
          <button type="button" disabled={busy} onClick={() => confirm('End the game for everyone?') && run(() => controlQuiz(session.id, 'end'))} className="text-[11px] font-mono text-zinc-500 hover:text-premium-danger scale-on-click flex items-center gap-1.5">
            <Square className="w-3 h-3" /> End game
          </button>
        </div>
      )}
    </div>
  );
}

/** The lobby on the big screen: join code and QR, who has joined, and Start. Live games and the sample round share it. */
export function LobbyCard({ slug, title, nameAlign, joinCode, qr, anonymous, players, names, busy, onStart, note }: {
  slug: string;
  title: string;
  nameAlign: NameAlign;
  joinCode: string | null | undefined;
  qr: string;
  anonymous: boolean;
  players: number;
  names: { id: string; name: string }[];
  busy: boolean;
  onStart: () => void;
  note?: string;
}) {
  const more = Math.max(0, players - names.length);
  return (
    <div className={`${card} space-y-8`}>
      <h2 className={`text-4xl font-display font-bold text-white ${alignText[nameAlign]}`}>{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center">
        <div className="w-56 h-56 mx-auto bg-white rounded-[2rem] p-3 shadow-2xl flex items-center justify-center">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="Scan to join" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full bg-zinc-200 animate-pulse rounded-2xl" />
          )}
        </div>
        <div className="text-center md:text-left space-y-3">
          <p className="text-sm text-zinc-400">Scan the code, or open <span className="font-mono text-premium-neon">{getClientDomain(slug)}/play</span> and enter</p>
          <div className="font-mono font-bold text-white text-6xl sm:text-7xl tracking-[0.15em]" aria-label="Join code">{formatJoinCode(joinCode)}</div>
          <p className="text-xs text-zinc-500">Checked-in guests only{anonymous ? ' · players show as their guest number' : ''}.</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Players</span>
          <span className="flex items-center gap-2 text-premium-success font-display font-bold text-2xl"><Users className="w-5 h-5" /> {players}</span>
        </div>
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          {names.length === 0 && <p className="text-sm text-zinc-500">Waiting for the first player…</p>}
          {names.map((p) => (
            <span key={p.id} className="px-3 py-1.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-sm font-bold text-white">{p.name}</span>
          ))}
          {more > 0 && <span className="px-3 py-1.5 rounded-xl text-sm font-mono text-zinc-500">+{more} more</span>}
        </div>
      </div>
      <button type="button" disabled={busy || players === 0} onClick={onStart} className={`${goldButton} w-full text-lg`}>
        <Play className="w-5 h-5" /> {busy ? 'Starting…' : players === 0 ? 'Waiting for players' : 'Start'}
      </button>
      {note && <p className="text-xs text-zinc-500 text-center">{note}</p>}
    </div>
  );
}

function QuestionView({ session, now, busy, onReveal }: { session: QuizSession; now: number; busy: boolean; onReveal: () => void }) {
  const q = session.question;
  if (!q) return null;
  const counting = now < q.openedAt;

  if (counting) {
    const n = Math.min(3, Math.max(1, Math.ceil((q.openedAt - now) / 1000)));
    return (
      <div className={`${card} text-center py-16 space-y-4`}>
        <span className="text-xs font-mono uppercase tracking-widest text-premium-neon font-bold">Question {session.position} of {session.questionCount}</span>
        <div key={n} className="text-[10rem] leading-none font-display font-bold text-premium-gold">{n}</div>
        <p className="text-sm text-zinc-400">Get ready…</p>
      </div>
    );
  }

  const total = q.closesAt - q.openedAt;
  const left = Math.max(0, q.closesAt - now);
  const secondsLeft = Math.ceil(left / 1000);
  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="px-4 py-1.5 rounded-full bg-premium-surfaceDark border border-premium-borderDark text-xs font-mono text-premium-neon font-bold">Question {session.position} of {session.questionCount}</span>
        <span className="px-4 py-1.5 rounded-full bg-premium-surfaceDark border border-premium-borderDark text-xs font-mono text-zinc-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-premium-success" /> {session.answered ?? 0} / {session.players} answered
        </span>
        <span className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border font-mono ${secondsLeft <= 5 ? 'bg-premium-danger/20 text-premium-danger border-premium-danger animate-pulse' : 'bg-premium-surfaceDark text-premium-gold border-premium-gold/30'}`}>
          <Clock className="w-4 h-4" /> {secondsLeft}s
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-premium-surfaceDark overflow-hidden">
        <div className="h-full bg-premium-gold transition-[width] duration-200 ease-linear" style={{ width: `${total > 0 ? (left / total) * 100 : 0}%` }} />
      </div>
      <div className="p-8 sm:p-12 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark text-center shadow-2xl">
        <h2 className="text-3xl sm:text-4xl font-display font-medium text-white leading-snug">{q.prompt}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {q.options.map((opt, i) => (
          <div key={i} className="p-6 rounded-[2rem] border border-premium-borderDark bg-premium-charcoal flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl ${ANSWER_STYLES[i].badge} font-display font-bold text-lg flex items-center justify-center shrink-0`}>{ANSWER_STYLES[i].letter}</div>
            <span className="text-xl font-display font-medium text-white flex-1">{opt}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button type="button" disabled={busy} onClick={onReveal} className={goldButton}>{busy ? 'Revealing…' : 'Reveal answer'}</button>
      </div>
    </div>
  );
}

function RevealView({ session, busy, onNext }: { session: QuizSession; busy: boolean; onNext: () => void }) {
  const q = session.question;
  const reveal = session.reveal;
  if (!q || !reveal) return null;
  const totalAnswers = reveal.counts.reduce((a, b) => a + b, 0);
  const last = (session.position ?? 0) >= session.questionCount;
  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between gap-3">
        <span className="px-4 py-1.5 rounded-full bg-premium-surfaceDark border border-premium-borderDark text-xs font-mono text-premium-neon font-bold">Question {session.position} of {session.questionCount}</span>
        <span className="text-xs font-mono text-zinc-400">{totalAnswers} answer{totalAnswers === 1 ? '' : 's'}</span>
      </div>
      <div className="p-6 sm:p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark text-center">
        <h2 className="text-2xl sm:text-3xl font-display font-medium text-white leading-snug">{q.prompt}</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,22rem)] gap-5">
        <div className="space-y-3">
          {q.options.map((opt, i) => {
            const right = i === reveal.correctIndex;
            const count = reveal.counts[i] ?? 0;
            const pct = totalAnswers ? Math.round((count / totalAnswers) * 100) : 0;
            return (
              <div key={i} className={`relative overflow-hidden p-5 rounded-[2rem] border flex items-center gap-4 ${right ? 'border-premium-success bg-premium-success/10' : 'border-premium-borderDark bg-premium-charcoal opacity-60'}`}>
                <div className={`absolute inset-y-0 left-0 ${ANSWER_STYLES[i].bar} opacity-15`} style={{ width: `${pct}%` }} />
                <div className={`relative w-11 h-11 rounded-2xl ${ANSWER_STYLES[i].badge} font-display font-bold flex items-center justify-center shrink-0`}>{ANSWER_STYLES[i].letter}</div>
                <span className={`relative flex-1 text-lg font-display ${right ? 'text-premium-success font-bold' : 'text-white'}`}>{opt}</span>
                <span className="relative font-mono text-sm text-zinc-300">{count}</span>
                {right && <CheckCircle2 className="relative w-6 h-6 text-premium-success" />}
              </div>
            );
          })}
        </div>
        <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Leaderboard</div>
          <Leaderboard rows={session.leaderboard ?? []} limit={5} />
        </div>
      </div>
      <div className="flex justify-end">
        <button type="button" disabled={busy} onClick={onNext} className={goldButton}>
          {last ? <><Trophy className="w-4 h-4" /> Final leaderboard</> : 'Next question →'}
        </button>
      </div>
    </div>
  );
}
