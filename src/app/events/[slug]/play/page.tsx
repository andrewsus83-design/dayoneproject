'use client';

import React, { use, useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { ArrowLeft, CheckCircle2, Clock, Gamepad2, QrCode, RefreshCw, Ticket, Trophy, Users, XCircle } from 'lucide-react';
import { isSampleSlug } from '@/lib/events';
import { getClientDomain } from '@/lib/domain';
import { guestAppPath, useMyPass } from '@/lib/guestsApi';
import {
  ANSWER_STYLES, answerQuiz, formatJoinCode, joinWithCode, myQuiz, readJoinedGame, storeJoinedGame, usePublicQuiz, useServerNow,
  type JoinFailure, type JoinedGame, type QuizMe, type QuizSession,
} from '@/lib/quizApi';

/*
 * Live trivia on a guest's phone. The pass saved on this phone (useMyPass) identifies the guest; only
 * checked-in guests can join. Join with the 6-digit code on the big screen (?code= when they scanned its QR),
 * wait in the lobby, then 3, 2, 1 and answer. The shared game state comes from the cached /api/quiz/<key>
 * (polled every second); this guest's own result is fetched only on join, answer, reveal and the end.
 */

function Shell({ slug, score, children }: { slug: string; score?: number | null; children: React.ReactNode }) {
  return (
    <div className="guest-app w-full min-h-screen bg-premium-black text-zinc-100 flex flex-col max-w-md mx-auto border-x border-premium-borderDark select-none font-sans">
      <header className="h-14 px-4 bg-premium-surfaceDark border-b border-premium-borderDark flex items-center justify-between sticky top-0 z-40">
        <Link href={guestAppPath(slug, 'activity')} className="p-2 rounded-xl bg-premium-charcoal text-zinc-400 hover:text-white border border-premium-borderDark scale-on-click" aria-label="Back to the guest app">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="text-center min-w-0 flex-1 px-2">
          <span className="text-xs font-display font-bold text-white block">Live Trivia</span>
          <span className="text-[10px] text-premium-neon font-mono block truncate">{getClientDomain(slug)}</span>
        </div>
        <div className="min-w-[4rem] text-right">
          {typeof score === 'number' && <span className="text-xs font-mono font-bold text-premium-gold">{score.toLocaleString()} pts</span>}
        </div>
      </header>
      <main className="flex-1 p-4 flex flex-col justify-center">{children}</main>
    </div>
  );
}

function Notice({ icon, title, children, tone = 'gold' }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; tone?: 'gold' | 'danger' | 'success' }) {
  const ring = tone === 'danger' ? 'bg-premium-danger/10 border-premium-danger/30 text-premium-danger' : tone === 'success' ? 'bg-premium-success/10 border-premium-success/30 text-premium-success' : 'bg-premium-gold/10 border-premium-gold/30 text-premium-gold';
  return (
    <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark text-center space-y-4 shadow-2xl">
      <div className={`w-14 h-14 mx-auto rounded-full border flex items-center justify-center ${ring}`}>{icon ?? <Ticket className="w-6 h-6" />}</div>
      <h2 className="text-xl font-display font-bold text-white">{title}</h2>
      {children}
    </div>
  );
}

const JOIN_MESSAGES: Record<JoinFailure, string> = {
  wrong_code: "That code doesn't match the game on the screen. Check the 6 digits.",
  no_game: 'No game is open yet. Wait for the host to open the lobby.',
  finished: 'That game has ended. Wait for the host to open the next one.',
  not_checked_in: 'Show your QR pass at the entrance first.',
  no_pass: 'Open your QR pass link on this phone first.',
};

function JoinForm({ initial, busy, message, onJoin }: { initial: string; busy: boolean; message: string | null; onJoin: (code: string) => void }) {
  const [code, setCode] = useState(initial.replace(/\D/g, '').slice(0, 6));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === 6) onJoin(code);
      }}
      className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark text-center space-y-5 shadow-2xl"
    >
      <div className="w-14 h-14 mx-auto rounded-full bg-premium-neon/10 border border-premium-neon/30 text-premium-neon flex items-center justify-center"><Gamepad2 className="w-6 h-6" /></div>
      <div>
        <h2 className="text-xl font-display font-bold text-white">Join the game</h2>
        <p className="text-xs text-zinc-400 mt-1">Enter the 6-digit code on the big screen.</p>
      </div>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Join code"
        placeholder="000000"
        className="w-full px-4 py-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-center font-mono text-3xl tracking-[0.3em] text-white outline-none focus:border-premium-gold/60"
      />
      {message && <p className="text-xs text-premium-danger">{message}</p>}
      <button type="submit" disabled={busy || code.length !== 6} className="w-full py-4 rounded-2xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold shadow-gold scale-on-click disabled:opacity-50">
        {busy ? 'Joining…' : 'Join'}
      </button>
    </form>
  );
}

interface LocalAnswer {
  sessionId: string;
  position: number;
  choice: number;
  status: 'sending' | 'locked' | 'late';
}

function Game({ slug, token, codeParam, onScore }: { slug: string; token: string; codeParam: string; onScore: (score: number | null) => void }) {
  // This component only mounts on the client, after the pass has loaded, so localStorage is safe here.
  const [joined, setJoined] = useState<JoinedGame | null>(() => readJoinedGame(slug));
  const [me, setMe] = useState<QuizMe | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [gate, setGate] = useState<JoinFailure | null>(null);
  const [local, setLocal] = useState<LocalAnswer | null>(null);
  /** A short note under the buttons, for one question (`<session>:<position>`). */
  const [answerNote, setAnswerNote] = useState<{ key: string; text: string } | null>(null);
  const { state, status } = usePublicQuiz(joined?.playKey ?? null);
  const session: QuizSession | null = state?.session ?? null;
  const ours = !!session && !!joined && session.id === joined.sessionId;
  const now = useServerNow(ours && session?.phase === 'question', 150);

  const join = async (code: string) => {
    setJoining(true);
    setJoinMessage(null);
    try {
      const r = await joinWithCode(code, token);
      if (!r.ok) {
        if (r.reason === 'not_checked_in' || r.reason === 'no_pass') setGate(r.reason);
        else setJoinMessage(JOIN_MESSAGES[r.reason]);
        return;
      }
      if (!r.session) return;
      const game = { sessionId: r.session.id, playKey: r.playKey };
      storeJoinedGame(slug, game);
      setJoined(game);
      setMe(r);
    } catch (e) {
      setJoinMessage(e instanceof Error ? e.message : 'Could not join. Try again.');
    } finally {
      setJoining(false);
    }
  };

  // Arriving from the QR on the big screen (?code=): join straight away, once. Joining the same game again is
  // harmless, and a code for a newer game moves this phone to it.
  const autoJoined = useRef(false);
  useEffect(() => {
    if (autoJoined.current || !/^\d{6}$/.test(codeParam)) return;
    autoJoined.current = true;
    void join(codeParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeParam]);

  // Back on the page after a reload (without a code): this guest's card (answered already? score?) and the
  // server clock. A fresh join returns the card itself.
  const joinedOnLoad = useRef(joined);
  useEffect(() => {
    if (!joinedOnLoad.current || /^\d{6}$/.test(codeParam)) return;
    myQuiz(token).then((m) => m && setMe(m)).catch(() => {});
  }, [token, codeParam]);

  // A reveal or the end landed: fetch this guest's points and rank, spread over a second so 1,500 phones
  // don't ask at the same instant.
  const phaseTag = ours && session && (session.phase === 'reveal' || session.phase === 'finished') ? `${session.id}:${session.phase}:${session.position}` : '';
  useEffect(() => {
    if (!phaseTag) return;
    const t = window.setTimeout(() => {
      myQuiz(token).then((m) => m && setMe(m)).catch(() => {});
    }, Math.random() * 1200);
    return () => window.clearTimeout(t);
  }, [phaseTag, token]);

  // The score in the header follows this guest's card for the game on screen.
  const myScore = ours && me?.session?.id === session?.id ? me?.score ?? 0 : null;
  useEffect(() => onScore(myScore), [myScore, onScore]);

  // Confetti for a podium finish.
  const celebrated = useRef('');
  useEffect(() => {
    if (!ours || session?.phase !== 'finished' || me?.session?.id !== session.id || !me.rank || me.rank > 3) return;
    if (celebrated.current === session.id) return;
    celebrated.current = session.id;
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
  }, [ours, session, me]);

  const answer = async (choice: number) => {
    if (!session || session.position == null) return;
    const position = session.position;
    const key = `${session.id}:${position}`;
    setAnswerNote(null);
    setLocal({ sessionId: session.id, position, choice, status: 'sending' });
    try {
      const r = await answerQuiz(token, position, choice);
      if (!r) {
        setLocal(null);
        setGate('not_checked_in');
        return;
      }
      if (r.ok) setLocal({ sessionId: session.id, position, choice, status: 'locked' });
      else if (r.reason === 'already_answered') setLocal({ sessionId: session.id, position, choice: r.choice ?? choice, status: 'locked' });
      else if (r.reason === 'not_open') {
        setLocal(null);
        setAnswerNote({ key, text: 'Wait for the countdown, then tap.' });
      } else setLocal({ sessionId: session.id, position, choice, status: 'late' });
    } catch {
      setLocal(null);
      setAnswerNote({ key, text: 'No connection. Tap your answer again.' });
    }
  };

  if (gate === 'not_checked_in') {
    return (
      <Notice icon={<QrCode className="w-6 h-6" />} title="Show your QR pass at the entrance first">
        <p className="text-sm text-zinc-400">Trivia is for checked-in guests. Once the door scans your pass, come back here.</p>
        <Link href={`/events/${slug}/pass`} className="inline-flex px-5 py-3 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click">Open my pass</Link>
      </Notice>
    );
  }
  if (gate === 'no_pass') {
    return (
      <Notice title="Open your QR pass link on this phone first">
        <p className="text-sm text-zinc-400">Open the pass link you were sent (or reply to the invitation) on this phone, then come back.</p>
      </Notice>
    );
  }

  // Not in a game yet, or the game we joined has been replaced by a new one.
  if (!joined || (session && !ours)) {
    const newGame = !!joined && !!session && session.phase !== 'finished';
    return (
      <div className="space-y-4">
        {newGame && <p className="text-center text-xs text-premium-neon font-mono">A new game is open. Enter its code.</p>}
        {joined && session && !ours && session.phase === 'finished' && <p className="text-center text-xs text-zinc-500">Wait for the host to open the next game.</p>}
        <JoinForm key={joined?.sessionId ?? 'first'} initial={newGame ? '' : codeParam} busy={joining} message={joinMessage} onJoin={join} />
      </div>
    );
  }

  if (!session) {
    if (status === 'missing') {
      return <Notice title="This game isn't available" tone="danger" icon={<XCircle className="w-6 h-6" />}><p className="text-sm text-zinc-400">Ask the host to check the event is published.</p></Notice>;
    }
    if (status === 'offline') {
      return <Notice title="Reconnecting…" icon={<RefreshCw className="w-6 h-6" />}><p className="text-sm text-zinc-400">Check your internet connection.</p></Notice>;
    }
    return <div className="h-80 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark animate-pulse" aria-label="Loading the game" />;
  }

  const myAnswer =
    local && local.sessionId === session.id && local.position === session.position
      ? local
      : me?.answer && me.session?.id === session.id && me.answer.position === session.position
        ? { choice: me.answer.choice, status: 'locked' as const }
        : null;
  const fresh = me?.session?.id === session.id && me.session.rev >= session.rev;

  if (session.phase === 'lobby') {
    return (
      <Notice icon={<CheckCircle2 className="w-6 h-6" />} tone="success" title="You're in!">
        <p className="text-sm text-zinc-300">Waiting for the host to start.</p>
        {me?.name && <p className="text-xs text-zinc-500">Playing as <span className="font-bold text-white">{me.name}</span></p>}
        <p className="text-xs font-mono text-premium-success flex items-center justify-center gap-1.5"><Users className="w-3.5 h-3.5" /> {session.players} player{session.players === 1 ? '' : 's'} joined</p>
      </Notice>
    );
  }

  if (session.phase === 'question' && session.question) {
    const q = session.question;
    if (now < q.openedAt) {
      const n = Math.min(3, Math.max(1, Math.ceil((q.openedAt - now) / 1000)));
      return (
        <div className="text-center space-y-3 py-10">
          <span className="text-xs font-mono uppercase tracking-widest text-premium-neon font-bold">Question {session.position} of {session.questionCount}</span>
          <div key={n} className="text-[9rem] leading-none font-display font-bold text-premium-gold">{n}</div>
          <p className="text-sm text-zinc-400">Get ready…</p>
        </div>
      );
    }
    if (myAnswer) {
      const s = ANSWER_STYLES[myAnswer.choice];
      if (myAnswer.status === 'late') {
        return <Notice icon={<Clock className="w-6 h-6" />} tone="danger" title="Too late for this one"><p className="text-sm text-zinc-400">Get ready for the next question.</p></Notice>;
      }
      return (
        <Notice icon={<CheckCircle2 className="w-6 h-6" />} tone="success" title={myAnswer.status === 'sending' ? 'Sending…' : 'Answer locked in'}>
          <div className={`mx-auto w-20 h-20 rounded-3xl ${s.button} flex items-center justify-center text-3xl font-display font-bold`}>{s.letter}</div>
          <p className="text-sm text-white font-display">{q.options[myAnswer.choice]}</p>
          <p className="text-xs text-zinc-500">Look at the big screen for the answer.</p>
        </Notice>
      );
    }
    const left = Math.max(0, q.closesAt - now);
    if (left === 0) {
      return <Notice icon={<Clock className="w-6 h-6" />} title="Time's up"><p className="text-sm text-zinc-400">Waiting for the answer…</p></Notice>;
    }
    const total = q.closesAt - q.openedAt;
    return (
      <div className="flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-premium-neon font-bold">Q{session.position} / {session.questionCount}</span>
          <span className={`font-bold ${left <= 5000 ? 'text-premium-danger' : 'text-premium-gold'}`}>{Math.ceil(left / 1000)}s</span>
        </div>
        <div className="h-1.5 rounded-full bg-premium-surfaceDark overflow-hidden">
          <div className="h-full bg-premium-gold transition-[width] duration-150 ease-linear" style={{ width: `${total > 0 ? (left / total) * 100 : 0}%` }} />
        </div>
        <p className="text-center text-sm text-zinc-300 font-display px-2">{q.prompt}</p>
        {answerNote?.key === `${session.id}:${session.position}` && <p className="text-center text-xs text-premium-gold">{answerNote.text}</p>}
        <div className={`grid gap-3 flex-1 min-h-[360px] ${q.options.length > 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => void answer(i)}
              className={`rounded-3xl p-4 flex flex-col items-center justify-center text-center shadow-2xl scale-on-click active:brightness-90 ${ANSWER_STYLES[i].button}`}
            >
              <span className="text-3xl font-display font-bold">{ANSWER_STYLES[i].shape} {ANSWER_STYLES[i].letter}</span>
              <span className="text-sm font-bold mt-2 leading-snug break-words">{opt}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (session.phase === 'reveal' && session.question && session.reveal) {
    const q = session.question;
    const right = session.reveal.correctIndex;
    // The server's word once this guest's card has caught up with the reveal; until then, what this phone sent.
    const recorded = fresh && me?.answer?.position === session.position ? me.answer : null;
    const chose = fresh ? recorded?.choice ?? null : myAnswer && myAnswer.status !== 'late' ? myAnswer.choice : null;
    const correct = chose !== null && chose === right;
    const points = recorded ? recorded.points ?? 0 : null;
    return (
      <Notice
        icon={chose === null ? <Clock className="w-6 h-6" /> : correct ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
        tone={correct ? 'success' : chose === null ? 'gold' : 'danger'}
        title={chose === null ? 'No answer this time' : correct ? 'Correct!' : 'Not this time'}
      >
        {correct ? (
          <p className="text-3xl font-display font-bold text-premium-success">{points === null ? '…' : `+${points.toLocaleString()}`}</p>
        ) : (
          <p className="text-sm text-zinc-300">The answer was <span className="font-bold text-premium-success">{ANSWER_STYLES[right].letter}. {q.options[right]}</span></p>
        )}
        {fresh && (
          <p className="text-xs font-mono text-zinc-400">
            {(me?.score ?? 0).toLocaleString()} pts{me?.rank ? ` · #${me.rank} of ${me.players ?? session.players}` : ''}
          </p>
        )}
      </Notice>
    );
  }

  if (session.phase === 'finished') {
    return (
      <Notice icon={<Trophy className="w-6 h-6" />} title="Game over">
        {fresh && me?.rank ? (
          <>
            <p className="text-5xl font-display font-bold text-premium-gold">#{me.rank}</p>
            <p className="text-sm text-zinc-300">of {me.players ?? session.players} players · <span className="font-mono font-bold text-white">{(me.score ?? 0).toLocaleString()} pts</span></p>
          </>
        ) : (
          <p className="text-sm text-zinc-400">Adding up the scores…</p>
        )}
        <p className="text-xs text-zinc-500">Thanks for playing! The leaderboard is on the big screen.</p>
      </Notice>
    );
  }

  return <div className="h-80 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark animate-pulse" aria-label="Loading the game" />;
}

function PlayContent({ slug }: { slug: string }) {
  const codeParam = useSearchParams().get('code') ?? '';
  const sample = isSampleSlug(slug);
  const mine = useMyPass(sample ? '' : slug);
  // Waiting at the door: look again every 10 s so the game opens as soon as the pass is scanned.
  const waiting = !sample && mine.status === 'ready' && !mine.checkedIn;
  const { refresh } = mine;
  useEffect(() => {
    if (!waiting) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 10_000);
    return () => window.clearInterval(t);
  }, [waiting, refresh]);

  const [score, setScore] = useState<number | null>(null);

  let body: React.ReactNode;
  if (sample) {
    body = (
      <Notice icon={<Gamepad2 className="w-6 h-6" />} title="This is a sample event">
        <p className="text-sm text-zinc-400">Live trivia on phones runs on your own events. The sample round plays on the big screen.</p>
        <Link href={`/events/${slug}/games`} className="inline-flex px-5 py-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white font-bold text-sm scale-on-click">Open the big screen</Link>
      </Notice>
    );
  } else if (mine.status === 'none' || mine.status === 'missing') {
    body = (
      <Notice title="Open your QR pass link on this phone first" tone={mine.status === 'missing' ? 'danger' : 'gold'}>
        <p className="text-sm text-zinc-400">
          {mine.status === 'missing' ? "The pass saved on this phone isn't on the guest list. " : ''}
          Open the pass link you were sent on this phone, or reply to the invitation, then come back here.
        </p>
        <Link href={`/events/${slug}/invitation`} className="inline-flex px-5 py-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white font-bold text-sm scale-on-click">Open the invitation</Link>
      </Notice>
    );
  } else if (mine.status === 'error') {
    body = (
      <Notice title="We couldn't load your pass" tone="danger">
        <p className="text-sm text-zinc-400">Check your internet connection and try again.</p>
        <button type="button" onClick={() => void mine.refresh()} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click">
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      </Notice>
    );
  } else if (mine.status === 'ready' && mine.token && !mine.checkedIn) {
    body = (
      <Notice icon={<QrCode className="w-6 h-6" />} title="Show your QR pass at the entrance first">
        <p className="text-sm text-zinc-400">Trivia opens once the door has scanned your pass. This page updates on its own.</p>
        <Link href={`/events/${slug}/pass`} className="inline-flex px-5 py-3 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click">Open my pass</Link>
      </Notice>
    );
  } else if (mine.status === 'ready' && mine.token) {
    body = <Game slug={slug} token={mine.token} codeParam={codeParam} onScore={setScore} />;
  } else {
    body = <div className="h-80 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark animate-pulse" aria-label="Loading your pass" />;
  }

  return (
    <Shell slug={slug} score={mine.status === 'ready' && mine.checkedIn ? score : null}>
      {body}
      {codeParam && !sample && mine.status === 'ready' && !mine.checkedIn && (
        <p className="mt-4 text-center text-[11px] font-mono text-zinc-500">Game code {formatJoinCode(codeParam)}</p>
      )}
    </Shell>
  );
}

function PlayWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <PlayContent slug={slug} />;
}

export default function GuestPlayPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-zinc-500">Loading trivia…</div>}>
      <PlayWrapper params={params} />
    </Suspense>
  );
}
