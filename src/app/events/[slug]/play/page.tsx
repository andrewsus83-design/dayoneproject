'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

function GuestPlayGameContent({ slug }: { slug: string }) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submittedTime, setSubmittedTime] = useState<string | null>(null);
  const [myScore, setMyScore] = useState<number>(1450);
  const [activeQuestionNum, setActiveQuestionNum] = useState<number>(1);
  const [gameStep, setGameStep] = useState<'question_active' | 'answers_locked' | 'reveal' | 'podium'>('question_active');

  const shapes = [
    { id: 0, label: 'A', shape: '▲ Triangle', bg: 'bg-premium-danger', hover: 'active:brightness-90' },
    { id: 1, label: 'B', shape: '◆ Diamond', bg: 'bg-premium-neon text-black', hover: 'active:brightness-90' },
    { id: 2, label: 'C', shape: '● Circle', bg: 'bg-premium-gold text-black', hover: 'active:brightness-90' },
    { id: 3, label: 'D', shape: '■ Square', bg: 'bg-premium-success text-black', hover: 'active:brightness-90' },
  ];

  // Sync with Operator Broadcast Switcher via BroadcastChannel
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('all41_stage_bus');
      channel.onmessage = (ev) => {
        const data = ev.data;
        if (data?.type === 'STAGE_PUSH_LIVE') {
          if (typeof data.activeQuestionIdx === 'number') {
            setActiveQuestionNum(data.activeQuestionIdx + 1);
          }
          if (data.gameStep) {
            setGameStep(data.gameStep);
            if (data.gameStep === 'question_active') {
              setSelectedAnswer(null);
              setSubmittedTime(null);
            }
          }
        }
      };
      return () => channel.close();
    }
  }, []);

  const handleSelectAnswer = (idx: number) => {
    if (gameStep !== 'question_active') return;
    setSelectedAnswer(idx);
    const speed = (Math.random() * 2 + 1.2).toFixed(1);
    setSubmittedTime(speed);
    setMyScore((s) => s + 480);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
  };

  const handleResetForNextQuestion = () => {
    setSelectedAnswer(null);
    setSubmittedTime(null);
  };

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 flex flex-col justify-between max-w-md mx-auto border-x border-premium-borderDark select-none font-sans">
      {/* Top Mobile Bar */}
      <header className="h-14 px-4 bg-premium-surfaceDark border-b border-premium-borderDark flex items-center justify-between sticky top-0 z-40">
        <Link
          href={`/events/${slug}/pass`}
          className="p-2 rounded-xl bg-premium-charcoal text-zinc-400 hover:text-white border border-premium-borderDark"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="text-center">
          <span className="text-xs font-display font-bold text-white block">
            Interactive Quiz Pad • Q{activeQuestionNum}
          </span>
          <span className="text-[10px] text-premium-neon font-mono">app.dayoneproject.xyz/events/{slug}</span>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-premium-gold">{myScore} pts</span>
        </div>
      </header>

      {/* Main Touch Pad */}
      <main className="flex-1 p-4 flex flex-col justify-center items-center">
        {selectedAnswer === null ? (
          <div className="w-full h-full flex flex-col justify-center space-y-4">
            <div className="text-center mb-2">
              <span className="text-xs font-mono uppercase text-premium-gold font-bold tracking-wider">
                Question {activeQuestionNum} • {gameStep === 'question_active' ? 'Buzzer Live' : gameStep.toUpperCase()}
              </span>
              <p className="text-xs text-zinc-400 mt-0.5">
                Look at the ballroom LED screen and tap your answer below!
              </p>
            </div>

            {/* 4 Giant Tactile Touch Quadrants */}
            <div className="grid grid-cols-2 gap-3.5 flex-1 min-h-[360px]">
              {shapes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={gameStep !== 'question_active'}
                  onClick={() => handleSelectAnswer(s.id)}
                  className={`rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-2xl transition-transform active:scale-95 ${s.bg} ${s.hover} cursor-pointer disabled:opacity-40`}
                >
                  <span className="text-3xl font-display font-bold drop-shadow">{s.label}</span>
                  <span className="text-[11px] font-bold font-mono tracking-wider mt-1 opacity-90">
                    {s.shape}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Submitted State */
          <div className="p-8 rounded-3xl bg-premium-charcoal border border-premium-borderDark text-center space-y-5 w-full shadow-2xl animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-premium-success/20 text-premium-success mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div>
              <span className="text-xs font-mono uppercase text-premium-success font-bold">
                Answer Locked In!
              </span>
              <h2 className="text-xl font-display font-bold text-white mt-1">
                You selected {shapes[selectedAnswer].label}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Response recorded in <strong className="text-premium-neon">{submittedTime}s</strong>. Look up at the ballroom projector for the correct reveal!
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-xs font-mono flex items-center justify-between">
              <span className="text-zinc-400">Current Leaderboard Points:</span>
              <strong className="text-premium-success text-sm">{myScore} pts</strong>
            </div>

            <button
              type="button"
              onClick={handleResetForNextQuestion}
              className="w-full py-3.5 rounded-2xl font-display font-bold text-xs text-black bg-premium-gold hover:bg-premium-goldHover shadow-gold scale-on-click"
            >
              Ready for Next Question
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-3 text-center text-[10px] text-zinc-500 border-t border-premium-borderDark bg-premium-surfaceDark font-mono">
        Synchronized with Stage Master Host via BroadcastBus & WebSockets
      </footer>
    </div>
  );
}

function GuestPlayGameWrapper({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  return <GuestPlayGameContent slug={unwrappedParams.slug} />;
}

export default function GuestPlayGamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-gray-400">Loading quiz pad...</div>}>
      <GuestPlayGameWrapper params={params} />
    </Suspense>
  );
}
