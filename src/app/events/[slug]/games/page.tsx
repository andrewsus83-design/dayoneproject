'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { MOCK_EVENT, MOCK_GAME_SESSIONS, MOCK_GUESTS } from '@/lib/mockData';
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

  const currentQ = QUESTIONS[currentQIndex];

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
    <div className="min-h-screen bg-[#080a11] text-[#f8fafc] flex flex-col justify-between select-none relative overflow-hidden">
      {/* Ambient Lighting */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#9d00ff]/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#00f0ff]/10 blur-[150px] pointer-events-none rounded-full" />

      {/* Top Header */}
      <header className="h-16 px-6 border-b border-[#1b2234] bg-[#0c101a] flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <Link
            href={`/events/${slug}`}
            className="p-2 rounded-lg bg-[#141926] text-gray-400 hover:text-white border border-[#232d44]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Kahoot-Style Trivia Blitz</span>
              <span className="w-2 h-2 rounded-full bg-[#9d00ff] animate-pulse" />
            </h1>
            <p className="text-[10px] text-gray-400 font-mono">{MOCK_EVENT.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-gray-400">Your Score: </span>
            <strong className="text-[#00ff88] text-sm">{score} pts</strong>
          </div>
        </div>
      </header>

      {/* Main Game Container */}
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col justify-center items-center z-10">
        {!gameFinished ? (
          <div className="w-full space-y-6">
            {/* Top Bar: Question # & Timer */}
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#181d2e] border border-[#25324e] text-xs font-mono text-[#00f0ff]">
                Question {currentQIndex + 1} of {QUESTIONS.length}
              </span>

              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border font-mono ${
                  timer <= 5
                    ? 'bg-red-500/20 text-red-400 border-red-500 animate-pulse'
                    : 'bg-[#181d2e] text-[#dfb76c] border-[#25324e]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{timer}s left</span>
              </div>
            </div>

            {/* Question Card */}
            <div className="p-8 rounded-3xl bg-[#121624] border border-[#232d42] text-center shadow-2xl">
              <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
                {currentQ.question}
              </h2>
            </div>

            {/* Answer Options Grid (Kahoot 4-quadrant style colors) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrect = idx === currentQ.correctIndex;

                let btnStyle = 'bg-[#151a2a] border-[#253047] text-white hover:border-[#dfb76c]';

                if (isAnswerSubmitted) {
                  if (isCorrect) {
                    btnStyle = 'bg-[#0b291d] border-[#00ff88] text-[#00ff88] font-bold';
                  } else if (isSelected) {
                    btnStyle = 'bg-[#291218] border-red-500 text-red-400';
                  } else {
                    btnStyle = 'bg-[#121622] border-[#1d2538] text-gray-500 opacity-50';
                  }
                }

                // Quadrant accent colors
                const badgeColor =
                  idx === 0
                    ? 'bg-red-500'
                    : idx === 1
                    ? 'bg-blue-500'
                    : idx === 2
                    ? 'bg-amber-500'
                    : 'bg-green-500';

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAnswerSubmitted}
                    onClick={() => handleAnswerSubmit(idx)}
                    className={`p-5 rounded-2xl border text-left flex items-center gap-4 transition-all duration-200 active:scale-95 shadow-md ${btnStyle}`}
                  >
                    <div className={`w-8 h-8 rounded-xl ${badgeColor} text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-sm font-semibold flex-1">{opt}</span>
                    {isAnswerSubmitted && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-[#00ff88]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Next Question Control */}
            {isAnswerSubmitted && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="px-8 py-3 rounded-xl font-bold text-xs text-[#0b0d13] bg-gradient-to-r from-[#00f0ff] to-[#dfb76c] hover:brightness-110 transition-all shadow-md"
                >
                  {currentQIndex + 1 < QUESTIONS.length ? 'Next Question →' : 'See Podium Results →'}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Game Finished Podium */
          <div className="w-full max-w-lg p-8 rounded-3xl bg-[#121624] border border-[#25324e] text-center shadow-2xl space-y-6 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-[#dfb76c]/20 text-[#dfb76c] mx-auto flex items-center justify-center">
              <Crown className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-mono uppercase text-[#00ff88] font-bold">
                Trivia Blitz Concluded
              </span>
              <h2 className="text-2xl font-black text-white mt-1">Leaderboard Podium</h2>
              <p className="text-xs text-gray-400 mt-1">
                Your final score: <strong className="text-[#00ff88]">{score} points</strong>
              </p>
            </div>

            {/* Top 3 Leaderboard List */}
            <div className="space-y-2.5 text-left">
              {leaderboard.map((user, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                    idx === 0
                      ? 'bg-[#1c1a24] border-[#dfb76c] shadow-[0_0_15px_rgba(223,183,108,0.2)]'
                      : 'bg-[#151a2a] border-[#222b40]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-[#dfb76c]">#{idx + 1}</span>
                    <div>
                      <div className="font-bold text-white">{user.name}</div>
                      <div className="text-[10px] text-gray-400">{user.table}</div>
                    </div>
                  </div>
                  <span className="font-mono font-extrabold text-[#00ff88]">{user.score} pts</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleRestart}
              className="w-full py-3 rounded-xl font-bold text-xs text-[#0b0d13] bg-gradient-to-r from-[#00f0ff] to-[#dfb76c] hover:brightness-110 transition-all flex items-center justify-center gap-2"
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
