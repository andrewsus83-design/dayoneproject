'use client';

import React, { useState, use, Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, RotateCcw, Trophy, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

function GuestPlayGameContent({ slug }: { slug: string }) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submittedTime, setSubmittedTime] = useState<string | null>(null);
  const [myScore, setMyScore] = useState<number>(1450);

  const shapes = [
    { id: 0, label: 'A', shape: '▲ Triangle', bg: 'bg-[#e21b3c]', hover: 'active:bg-[#b0142e]' },
    { id: 1, label: 'B', shape: '◆ Diamond', bg: 'bg-[#1368ce]', hover: 'active:bg-[#0e4e9b]' },
    { id: 2, label: 'C', shape: '● Circle', bg: 'bg-[#d89e00]', hover: 'active:bg-[#a67a00]' },
    { id: 3, label: 'D', shape: '■ Square', bg: 'bg-[#26890c]', hover: 'active:bg-[#1c6609]' },
  ];

  const handleSelectAnswer = (idx: number) => {
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
    <div className="min-h-screen bg-[#07090e] text-[#f8fafc] flex flex-col justify-between max-w-md mx-auto border-x border-[#1a2133] select-none">
      {/* Top Mobile Bar */}
      <header className="h-14 px-4 bg-[#0d101a] border-b border-[#1b2234] flex items-center justify-between sticky top-0 z-40">
        <Link
          href={`/events/${slug}/pass`}
          className="p-1.5 rounded-lg bg-[#141926] text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="text-center">
          <span className="text-xs font-mono font-bold text-white block">Interactive Quiz Pad</span>
          <span className="text-[10px] text-[#00ff88] font-mono">Live Stage Sync Active</span>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-black text-[#dfb76c]">{myScore} pts</span>
        </div>
      </header>

      {/* Main Touch Pad */}
      <main className="flex-1 p-4 flex flex-col justify-center items-center">
        {selectedAnswer === null ? (
          <div className="w-full h-full flex flex-col justify-center space-y-4">
            <div className="text-center mb-2">
              <span className="text-xs font-mono uppercase text-[#dfb76c] font-bold tracking-wider">
                Question in Progress
              </span>
              <p className="text-xs text-gray-400 mt-0.5">
                Look at the ballroom LED screen and tap your answer below!
              </p>
            </div>

            {/* 4 Giant Tactile Touch Quadrants */}
            <div className="grid grid-cols-2 gap-3.5 flex-1 min-h-[360px]">
              {shapes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectAnswer(s.id)}
                  className={`rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-2xl transition-transform active:scale-90 ${s.bg} ${s.hover} text-white cursor-pointer`}
                >
                  <span className="text-3xl font-black drop-shadow">{s.label}</span>
                  <span className="text-[11px] font-bold font-mono tracking-wider mt-1 opacity-90">
                    {s.shape}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Submitted State */
          <div className="p-8 rounded-3xl bg-[#121624] border border-[#232c42] text-center space-y-5 w-full shadow-2xl animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-[#00ff88]/20 text-[#00ff88] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div>
              <span className="text-xs font-mono uppercase text-[#00ff88] font-bold">
                Answer Locked In!
              </span>
              <h2 className="text-xl font-black text-white mt-1">
                You selected {shapes[selectedAnswer].label}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Response recorded in <strong className="text-[#00f0ff]">{submittedTime}s</strong>. Look up at the ballroom projector for the correct reveal!
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#090b14] border border-[#1b2234] text-xs font-mono flex items-center justify-between">
              <span className="text-gray-400">Current Leaderboard Points:</span>
              <strong className="text-[#00ff88] text-sm">{myScore} pts</strong>
            </div>

            <button
              type="button"
              onClick={handleResetForNextQuestion}
              className="w-full py-3 rounded-xl font-bold text-xs text-[#07080f] bg-gradient-to-r from-[#00f0ff] to-[#dfb76c] hover:brightness-110 shadow"
            >
              Ready for Next Question
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-3 text-center text-[10px] text-gray-500 border-t border-[#1a2133] bg-[#090b12]">
        Synchronized with Stage Master Host via WebSockets
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
