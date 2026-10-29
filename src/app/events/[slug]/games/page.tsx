'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { MOCK_EVENT, MOCK_CORPORATE_NEXUS_EVENT, MOCK_WEDDING_BALI_EVENT, MOCK_POPVERSE_EVENT, MOCK_WEDDING_EVENT, MOCK_GAME_SESSIONS, MOCK_GUESTS } from '@/lib/mockData';
import { GameSession, Guest } from '@/lib/types';
import {
  Gamepad2,
  Trophy,
  Clock,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Crown,
  Play,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

const QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'In which year was the first startup unicorn born in Southeast Asia?',
    options: ['2009', '2012', '2014', '2016'],
    correctIndex: 1,
  },
  {
    id: 'q2',
    question: 'Which country is hosting the APAC Tech Summit 2026 tonight?',
    options: ['Indonesia', 'Singapore', 'Thailand', 'Malaysia'],
    correctIndex: 0,
  },
  {
    id: 'q3',
    question: 'Which protocol is best suited for sub-second live audience quiz sync?',
    options: ['WebSockets', 'HTTP Polling', 'SMTP', 'FTP'],
    correctIndex: 0,
  },
];

function InteractiveGamesContent({ slug }: { slug: string }) {
  const event =
    slug === 'aria-daniel' ? MOCK_WEDDING_EVENT :
    slug === 'sophia-marco' ? MOCK_WEDDING_BALI_EVENT :
    slug === 'nexus' ? MOCK_CORPORATE_NEXUS_EVENT :
    slug === 'popverse' ? MOCK_POPVERSE_EVENT :
    MOCK_EVENT;
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(15);
  const [gameFinished, setGameFinished] = useState(false);
  const [leaderboard, setLeaderboard] = useState([
    { name: 'Budi Santoso', score: 2850, table: 'Diamond 01' },
    { name: 'Clarissa Tan', score: 2700, table: 'Platinum 03' },
    { name: 'Hendrik Wijaya', score: 2400, table: 'Diamond 02' },
  ]);

  const currentQ = QUESTIONS[currentQIndex % QUESTIONS.length];

  // Sync question index, reveal state, and podium from Operator Broadcast Switcher
  useEffect(() => {
    const applyState = (data: {
      activeQuestionIdx?: number;
      gameStep?: 'question_active' | 'answers_locked' | 'reveal' | 'podium';
    }) => {
      if (typeof data.activeQuestionIdx === 'number') {
        setCurrentQIndex(data.activeQuestionIdx % QUESTIONS.length);
      }
      if (data.gameStep === 'question_active') {
        setGameFinished(false);
        setIsAnswerSubmitted(false);
        setSelectedAnswer(null);
        setTimer(15);
      } else if (data.gameStep === 'answers_locked' || data.gameStep === 'reveal') {
        setGameFinished(false);
        setIsAnswerSubmitted(true);
      } else if (data.gameStep === 'podium') {
        setGameFinished(true);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      }
    };

    try {
      const saved = localStorage.getItem('all41_live_stage_state');
      if (saved) applyState(JSON.parse(saved));
    } catch {
      // Ignore storage error
    }

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('all41_stage_bus');
      channel.onmessage = (ev) => {
        if (ev.data?.type === 'STAGE_PUSH_LIVE') {
          applyState(ev.data);
        }
      };
      return () => channel.close();
    }
  }, []);

  const handleAnswerSubmit = (optionIdx: number) => {
    setSelectedAnswer(optionIdx);
    setIsAnswerSubmitted(true);

    if (optionIdx === currentQ.correctIndex) {
      const addedPoints = 500 + timer * 30;
      setScore((s) => s + addedPoints);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
  };

  // Timer countdown
  useEffect(() => {
    if (gameFinished || isAnswerSubmitted) return;

    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setTimeout(() => handleAnswerSubmit(-1), 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAnswerSubmitted, gameFinished]);

  const handleNextQuestion = () => {
    if (currentQIndex + 1 < QUESTIONS.length) {
      setCurrentQIndex((i) => i + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setTimer(15);
    } else {
      setGameFinished(true);
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
    }
  };

  const handleRestart = () => {
    setCurrentQIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setTimer(15);
    setGameFinished(false);
  };

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 flex flex-col justify-between select-none relative overflow-hidden font-sans">
      {/* Ambient Lighting */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-premium-neon/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-premium-gold/10 blur-[150px] pointer-events-none rounded-full" />

      {/* Top Header */}
      <header className="h-20 px-6 sm:px-8 border-b border-premium-borderDark bg-premium-black/80 backdrop-blur-xl flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <Link
            href={`/events/${slug}`}
            className="p-2.5 rounded-2xl bg-premium-charcoal text-zinc-400 hover:text-white border border-premium-borderDark scale-on-click"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-display font-medium text-white flex items-center gap-2">
              <span>Kahoot-Style Trivia Blitz</span>
              <span className="w-2 h-2 rounded-full bg-premium-neon shadow-[0_0_8px_#00F0FF] animate-pulse" />
            </h1>
            <p className="text-xs text-zinc-400 font-mono">{event.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-zinc-500">Your Score: </span>
            <strong className="text-premium-neon font-display font-bold text-base">{score} pts</strong>
          </div>
        </div>
      </header>

      {/* Main Game Container */}
      <main className="flex-1 p-6 sm:p-8 max-w-4xl mx-auto w-full flex flex-col justify-center items-center z-10">
        {!gameFinished ? (
          <div className="w-full space-y-6">
            {/* Top Bar: Question # & Timer */}
            <div className="flex items-center justify-between">
              <span className="px-4 py-1.5 rounded-full bg-premium-surfaceDark border border-premium-borderDark text-xs font-mono text-premium-neon font-bold">
                Question {currentQIndex + 1} of {QUESTIONS.length}
              </span>

              <div
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border font-mono ${
                  timer <= 5
                    ? 'bg-premium-danger/20 text-premium-danger border-premium-danger animate-pulse shadow-danger'
                    : 'bg-premium-surfaceDark text-premium-gold border-premium-gold/30'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{timer}s left</span>
              </div>
            </div>

            {/* Question Card */}
            <div className="p-8 sm:p-12 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark text-center shadow-2xl">
              <h2 className="text-2xl sm:text-3xl font-display font-medium text-white leading-snug">
                {currentQ.question}
              </h2>
            </div>

            {/* Answer Options Grid (Kahoot 4-quadrant style colors) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrect = idx === currentQ.correctIndex;

                let btnStyle = 'bg-premium-charcoal border-premium-borderDark text-white hover:border-premium-gold';

                if (isAnswerSubmitted) {
                  if (isCorrect) {
                    btnStyle = 'bg-premium-surfaceDark border-premium-success text-premium-success font-bold shadow-[0_0_15px_rgba(0,230,118,0.2)]';
                  } else if (isSelected) {
                    btnStyle = 'bg-premium-surfaceDark border-premium-danger text-premium-danger shadow-danger';
                  } else {
                    btnStyle = 'bg-premium-surfaceDark border-premium-borderDark text-zinc-600 opacity-40';
                  }
                }

                // Quadrant accent colors
                const badgeColor =
                  idx === 0
                    ? 'bg-premium-danger text-white'
                    : idx === 1
                    ? 'bg-premium-neon text-black'
                    : idx === 2
                    ? 'bg-premium-gold text-black'
                    : 'bg-premium-success text-black';

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswerSubmitted}
                    onClick={() => handleAnswerSubmit(idx)}
                    className={`p-6 rounded-[2rem] border text-left flex items-center gap-4 transition-all duration-200 scale-on-click shadow-md ${btnStyle}`}
                  >
                    <div className={`w-10 h-10 rounded-2xl ${badgeColor} font-display font-bold text-sm flex items-center justify-center flex-shrink-0 shadow`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-base font-display font-medium flex-1">{opt}</span>
                    {isAnswerSubmitted && isCorrect && (
                      <CheckCircle2 className="w-6 h-6 text-premium-success" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Next Question Control */}
            {isAnswerSubmitted && (
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="px-8 py-4 rounded-2xl font-bold text-sm text-black bg-premium-gold hover:bg-premium-goldHover transition-all shadow-gold scale-on-click"
                >
                  {currentQIndex + 1 < QUESTIONS.length ? 'Next Question →' : 'See Podium Results →'}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Game Finished Podium */
          <div className="w-full max-w-lg p-10 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark text-center shadow-2xl space-y-8 animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-premium-gold/15 text-premium-gold mx-auto flex items-center justify-center shadow-gold">
              <Crown className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-mono uppercase text-premium-neon font-bold tracking-wider">
                Trivia Blitz Concluded
              </span>
              <h2 className="text-3xl font-display font-medium text-white mt-1">Leaderboard Podium</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Your final score: <strong className="text-premium-success font-display text-base">{score} points</strong>
              </p>
            </div>

            {/* Top 3 Leaderboard List */}
            <div className="space-y-3 text-left">
              {leaderboard.map((user, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border flex items-center justify-between text-xs ${
                    idx === 0
                      ? 'bg-premium-surfaceDark border-premium-gold shadow-gold'
                      : 'bg-premium-surfaceDark/50 border-premium-borderDark'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-base text-premium-gold">#{idx + 1}</span>
                    <div>
                      <div className="font-bold text-white text-sm font-display">{user.name}</div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">{user.table}</div>
                    </div>
                  </div>
                  <span className="font-display font-bold text-premium-neon text-sm">{user.score} pts</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleRestart}
              className="w-full py-4 rounded-2xl font-bold text-sm text-black bg-premium-gold hover:bg-premium-goldHover transition-all shadow-gold scale-on-click flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function InteractiveGamesWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  return <InteractiveGamesContent slug={unwrappedParams.slug} />;
}

export default function InteractiveGamesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-gray-400">Loading trivia...</div>}>
      <InteractiveGamesWrapper params={params} />
    </Suspense>
  );
}
