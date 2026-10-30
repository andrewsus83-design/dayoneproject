'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock, Crown, EyeOff, MapPin, RotateCcw, Search, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatGuestNumber, guestPool, numberDigits, quizPointsAt, useEventConfigBySlug, useGuests, type Activity, type QuizItem } from '@/lib/eventStore';
import { isServerEventId } from '@/lib/guestsApi';
import { StageFrameShell } from '@/components/stage/StageFrameShell';
import { LiveQuizHost } from '@/components/events/LiveQuizHost';

export interface Player {
  id: string;
  label: string;
  table: string;
}

function QuizRunner({ questions, players, onScore }: { questions: QuizItem[]; players: Player[]; onScore: (s: number) => void }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(questions[0]?.seconds ?? 15);
  const [finished, setFinished] = useState(false);
  const q = questions[index % Math.max(questions.length, 1)];

  useEffect(() => onScore(score), [score, onScore]);

  const answer = (i: number) => {
    if (!q) return;
    setSelected(i);
    setSubmitted(true);
    if (i === q.answer) {
      setScore((s) => s + quizPointsAt(q.points, q.seconds, q.seconds - timer));
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
  };

  useEffect(() => {
    if (finished || submitted || !q) return;
    const id = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(id);
          setTimeout(() => answer(-1), 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, finished, index]);

  const next = () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setSelected(null);
      setSubmitted(false);
      setTimer(questions[index + 1].seconds);
    } else {
      setFinished(true);
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
    }
  };

  if (!q) return <p className="text-sm text-zinc-500">This activity has no questions yet — add some in the dashboard.</p>;

  if (finished) {
    return (
      <div className="w-full max-w-lg p-10 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark text-center shadow-2xl space-y-8">
        <div className="w-20 h-20 rounded-full bg-premium-gold/15 text-premium-gold mx-auto flex items-center justify-center shadow-gold"><Crown className="w-10 h-10" /></div>
        <div>
          <span className="text-xs font-mono uppercase text-premium-neon font-bold tracking-wider">Round complete</span>
          <h2 className="text-3xl font-display font-medium text-white mt-1">Thanks for playing!</h2>
          <p className="text-sm text-zinc-400 mt-1">Your final score: <strong className="text-premium-success font-display text-base">{score} points</strong></p>
        </div>
        <div className="space-y-3 text-left">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Players in this round ({players.length})</div>
          {players.length === 0 && <p className="text-xs text-zinc-500">No checked-in players yet.</p>}
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {players.map((p) => (
              <span key={p.id} className="px-3 py-1.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-xs font-bold text-white">
                {p.label}
                {p.table && <span className="ml-1.5 font-mono font-normal text-zinc-500">{p.table}</span>}
              </span>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => { setIndex(0); setSelected(null); setSubmitted(false); setScore(0); setTimer(questions[0].seconds); setFinished(false); }} className="w-full py-4 rounded-2xl font-bold text-sm text-black bg-premium-gold hover:bg-premium-goldHover shadow-gold scale-on-click flex items-center justify-center gap-2">
          <RotateCcw className="w-4 h-4" /> Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <span className="px-4 py-1.5 rounded-full bg-premium-surfaceDark border border-premium-borderDark text-xs font-mono text-premium-neon font-bold">Question {index + 1} of {questions.length}</span>
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border font-mono ${timer <= 5 ? 'bg-premium-danger/20 text-premium-danger border-premium-danger animate-pulse' : 'bg-premium-surfaceDark text-premium-gold border-premium-gold/30'}`}>
          <Clock className="w-4 h-4" /> <span>{timer}s left</span>
          {!submitted && <span className="pl-2 ml-1 border-l border-current/30">worth {quizPointsAt(q.points, q.seconds, q.seconds - timer)} pts</span>}
        </div>
      </div>
      <div className="p-8 sm:p-12 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark text-center shadow-2xl">
        <h2 className="text-2xl sm:text-3xl font-display font-medium text-white leading-snug">{q.text}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {q.options.map((opt, i) => {
          const correct = i === q.answer;
          const style = submitted
            ? correct ? 'bg-premium-surfaceDark border-premium-success text-premium-success font-bold' : selected === i ? 'bg-premium-surfaceDark border-premium-danger text-premium-danger' : 'bg-premium-surfaceDark border-premium-borderDark text-zinc-600 opacity-40'
            : 'bg-premium-charcoal border-premium-borderDark text-white hover:border-premium-gold';
          const badge = ['bg-premium-danger text-white', 'bg-premium-neon text-black', 'bg-premium-gold text-black', 'bg-premium-success text-black'][i % 4];
          return (
            <button key={i} type="button" disabled={submitted} onClick={() => answer(i)} className={`p-6 rounded-[2rem] border text-left flex items-center gap-4 transition-all scale-on-click ${style}`}>
              <div className={`w-10 h-10 rounded-2xl ${badge} font-display font-bold text-sm flex items-center justify-center shrink-0`}>{String.fromCharCode(65 + i)}</div>
              <span className="text-base font-display font-medium flex-1">{opt}</span>
              {submitted && correct && <CheckCircle2 className="w-6 h-6 text-premium-success" />}
            </button>
          );
        })}
      </div>
      {submitted && (
        <div className="flex justify-end pt-2">
          <button type="button" onClick={next} className="px-8 py-4 rounded-2xl font-bold text-sm text-black bg-premium-gold hover:bg-premium-goldHover shadow-gold scale-on-click">
            {index + 1 < questions.length ? 'Next Question →' : 'See Results →'}
          </button>
        </div>
      )}
    </div>
  );
}

function HuntBoard({ activity }: { activity: Activity }) {
  return (
    <div className="w-full space-y-6">
      <div className="text-center">
        <span className="text-xs font-mono uppercase text-premium-neon font-bold tracking-widest">Scavenger Hunt · {activity.clues.length} clues</span>
        <h2 className="text-3xl font-display font-bold text-white mt-1">Find every QR code hidden around the venue</h2>
        <p className="text-sm text-zinc-400 mt-1">Scan each code with your guest pass app to unlock the next riddle.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activity.clues.map((c, i) => (
          <div key={c.id} className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-2">
            <div className="flex items-center gap-2 text-premium-gold text-xs font-mono font-bold"><MapPin className="w-3.5 h-3.5" /> Clue {i + 1}</div>
            <p className="text-white font-display text-lg leading-snug">{c.riddle || 'Riddle coming soon…'}</p>
            {c.hint && <p className="text-xs text-zinc-500 flex items-center gap-1.5"><Search className="w-3 h-3" /> Hint: {c.hint}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Big-screen games view. Games live at /events/[slug]/games, separate from door prizes. Trivia on a saved event
 * runs live on the server (LiveQuizHost: guests join on their phones); the sample events keep the local demo.
 */
export function GamesScreen({ slug, initialId }: { slug: string; initialId?: string | null }) {
  const router = useRouter();
  const { eventId, hydrated, config, event } = useEventConfigBySlug(slug);
  const guests = useGuests(eventId);
  const { activities, activeId } = config.games;
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null);
  const activity = activities.find((a) => a.id === selectedId) ?? activities.find((a) => a.id === activeId) ?? activities[0];
  const [score, setScore] = useState(0);
  const digits = numberDigits(guests, config.info.capacity);
  const players: Player[] = activity
    ? guestPool(guests, activity.audience, activity.pickedGuestIds).map((g) => ({
        id: g.id,
        label: activity.anonymous ? `No. ${formatGuestNumber(g.guest_number, digits)}` : g.name,
        table: activity.anonymous ? '' : g.table_number ?? g.category,
      }))
    : [];

  if (!hydrated || !activity) {
    return <div className="min-h-screen bg-premium-black flex items-center justify-center text-zinc-500 text-sm">Loading activity…</div>;
  }
  const live = activity.kind === 'quiz' && isServerEventId(eventId);

  // Left sits beside the back button; center and right get their own line under the controls.
  const nameAlign = activity.nameAlign;
  const justify = nameAlign === 'center' ? 'justify-center' : nameAlign === 'right' ? 'justify-end' : '';
  const title = (
    <div className="min-w-0">
      <h1 className={`text-base font-display font-medium text-white flex items-center gap-2 truncate ${justify}`}>
        {activity.name}
        <span className="w-2 h-2 rounded-full bg-premium-neon shadow-[0_0_8px_#00F0FF] animate-pulse" />
      </h1>
      <p className={`text-xs text-zinc-400 font-mono truncate flex items-center gap-2 ${justify}`}>
        {event.name}
        <span className="inline-flex items-center gap-1 text-premium-success"><Users className="w-3 h-3" /> {players.length} {live ? 'checked in' : `player${players.length === 1 ? '' : 's'}`}</span>
        {activity.anonymous && <span className="inline-flex items-center gap-1 text-premium-gold"><EyeOff className="w-3 h-3" /> Anonymous</span>}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 select-none relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-premium-neon/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-premium-gold/10 blur-[150px] pointer-events-none rounded-full" />
      <StageFrameShell frame={activity.frame} logoRef={config.design.logoUrl} className="min-h-screen">
        <header className="px-8 pt-6 pb-4 z-20 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Link href={`/events/${slug}`} className="p-2.5 rounded-2xl bg-premium-charcoal text-zinc-400 hover:text-white border border-premium-borderDark scale-on-click" aria-label="Back to event">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              {nameAlign === 'left' && title}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto max-w-full">
              {activities.length > 1 && activities.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { setSelectedId(a.id); router.replace(`/events/${slug}/games/${a.id}`, { scroll: false }); }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap scale-on-click ${a.id === activity.id ? 'bg-premium-gold text-black shadow-gold' : 'bg-premium-charcoal border border-premium-borderDark text-zinc-400 hover:text-white'}`}
                >
                  {a.name}
                </button>
              ))}
              {activity.kind === 'quiz' && !live && (
                <span className="text-xs font-mono ml-2 whitespace-nowrap"><span className="text-zinc-500">Score </span><strong className="text-premium-neon font-display text-base">{score}</strong></span>
              )}
            </div>
          </div>
          {nameAlign !== 'left' && title}
        </header>
        <main className="flex-1 p-6 sm:p-8 max-w-4xl mx-auto w-full flex flex-col justify-center items-center z-10">
          {live ? (
            <LiveQuizHost key={activity.id} eventId={eventId} slug={slug} activity={activity} />
          ) : activity.kind === 'quiz' ? (
            <QuizRunner key={activity.id} questions={activity.questions} players={players} onScore={setScore} />
          ) : (
            <HuntBoard activity={activity} />
          )}
        </main>
      </StageFrameShell>
    </div>
  );
}
