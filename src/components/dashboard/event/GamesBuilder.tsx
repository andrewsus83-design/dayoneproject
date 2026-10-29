'use client';

import React, { useState, useRef } from 'react';
import {
  QrCode, MapPin, Plus, Trash2, Upload, FileText, CheckCircle2,
  Edit3, Copy, Download, Eye, AlertCircle, Hash, AlignLeft,
  ChevronRight, Trophy, Zap, GripVertical, X, Check, Sparkles,
} from 'lucide-react';

/* ─── Scavenger Hunt ─────────────────────────────────────── */

interface HuntClue {
  id: string;
  order: number;
  location: string;
  hint: string;
  riddle: string;
  token: string;
  generated: boolean;
}

function generateToken() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function ScavengerBuilder() {
  const [clues, setClues] = useState<HuntClue[]>([
    { id: 'c1', order: 1, location: 'Main Registration Desk', hint: 'Check where badges are given', riddle: 'Find the place where your journey starts — show this QR to begin!', token: generateToken(), generated: true },
    { id: 'c2', order: 2, location: 'Keynote Hall Entrance', hint: 'Look above the main stage doors', riddle: 'Speakers gather here to share their light. Scan me to claim your next clue!', token: generateToken(), generated: true },
    { id: 'c3', order: 3, location: 'Networking Lounge', hint: 'Near the coffee bar', riddle: 'Connections bloom where conversations flow. Scan to earn your prize!', token: generateToken(), generated: false },
  ]);
  const [editId, setEditId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const addClue = () => {
    const newClue: HuntClue = {
      id: `c${Date.now()}`,
      order: clues.length + 1,
      location: '',
      hint: '',
      riddle: '',
      token: generateToken(),
      generated: false,
    };
    setClues((prev) => [...prev, newClue]);
    setEditId(newClue.id);
  };

  const removeClue = (id: string) => setClues((prev) => prev.filter((c) => c.id !== id).map((c, i) => ({ ...c, order: i + 1 })));
  const updateClue = (id: string, key: keyof HuntClue, val: string) =>
    setClues((prev) => prev.map((c) => c.id === id ? { ...c, [key]: val } : c));

  const copyToken = (id: string, token: string) => {
    navigator.clipboard.writeText(token).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
            <MapPin className="w-4.5 h-4.5 text-premium-neon" />
            Scavenger Hunt Builder
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Place QR codes at each checkpoint. Guests scan to unlock the next clue.
          </p>
        </div>
        <button
          type="button"
          onClick={addClue}
          className="px-4 py-2 rounded-xl bg-premium-gold text-black text-xs font-bold shadow-gold scale-on-click flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Checkpoint
        </button>
      </div>

      {/* Flow diagram */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {clues.map((clue, idx) => (
          <React.Fragment key={clue.id}>
            <div className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-2xl border min-w-[90px] ${
              clue.generated
                ? 'border-premium-neon/30 bg-premium-neon/5'
                : 'border-premium-borderDark bg-premium-surfaceDark'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                clue.generated ? 'bg-premium-neon text-black' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {clue.order}
              </div>
              <div className="text-[9px] text-center text-zinc-400 leading-tight max-w-[80px] line-clamp-2">
                {clue.location || 'No location yet'}
              </div>
              {clue.generated && <QrCode className="w-3.5 h-3.5 text-premium-neon" />}
            </div>
            {idx < clues.length - 1 && (
              <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
        <button
          type="button"
          onClick={addClue}
          className="flex-shrink-0 w-16 h-20 rounded-2xl border-2 border-dashed border-premium-borderDark flex items-center justify-center text-zinc-600 hover:border-premium-neon/50 hover:text-premium-neon scale-on-click"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Clue cards */}
      <div className="space-y-3">
        {clues.map((clue) => {
          const isEditing = editId === clue.id;
          return (
            <div
              key={clue.id}
              className={`rounded-2xl border transition-all ${
                isEditing
                  ? 'border-premium-neon/40 bg-premium-neon/5'
                  : 'border-premium-borderDark bg-premium-charcoal'
              }`}
            >
              {/* Row header */}
              <div
                className="p-4 flex items-center gap-3 cursor-pointer"
                onClick={() => setEditId(isEditing ? null : clue.id)}
              >
                <GripVertical className="w-3.5 h-3.5 text-zinc-600 cursor-grab" />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  clue.generated ? 'bg-premium-neon text-black' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {clue.order}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{clue.location || 'New Checkpoint'}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{clue.hint || 'Add a hint for the admin'}</div>
                </div>
                {clue.generated && (
                  <div className="flex items-center gap-1 text-[10px] text-premium-neon font-mono">
                    <QrCode className="w-3.5 h-3.5" />
                    QR ready
                  </div>
                )}
                <button type="button" onClick={(e) => { e.stopPropagation(); removeClue(clue.id); }} className="text-zinc-600 hover:text-premium-danger">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Expanded editor */}
              {isEditing && (
                <div className="px-4 pb-4 space-y-3 border-t border-premium-borderDark/50 pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-400 font-bold block mb-1.5">Location name</label>
                      <input
                        value={clue.location}
                        onChange={(e) => updateClue(clue.id, 'location', e.target.value)}
                        placeholder="e.g. Registration Desk"
                        className="w-full bg-premium-black border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-neon"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 font-bold block mb-1.5">Admin hint (not shown to guest)</label>
                      <input
                        value={clue.hint}
                        onChange={(e) => updateClue(clue.id, 'hint', e.target.value)}
                        placeholder="e.g. On the pillar by door B"
                        className="w-full bg-premium-black border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-neon"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 font-bold block mb-1.5">Riddle / Message shown to guest when they scan</label>
                    <textarea
                      value={clue.riddle}
                      onChange={(e) => updateClue(clue.id, 'riddle', e.target.value)}
                      placeholder="Write a riddle that guides the guest to the next clue…"
                      rows={2}
                      className="w-full bg-premium-black border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-neon resize-none"
                    />
                  </div>

                  {/* QR token + mock */}
                  <div className="flex items-start gap-4 pt-1">
                    <div className="w-20 h-20 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                      <QrCode className="w-14 h-14 text-black" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="text-[10px] text-zinc-400 font-bold block mb-1">QR Token</label>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-premium-neon bg-premium-black border border-premium-borderDark px-3 py-1.5 rounded-xl">
                            {clue.token}
                          </span>
                          <button type="button" onClick={() => copyToken(clue.id, clue.token)} className="text-zinc-400 hover:text-white">
                            {copiedId === clue.id ? <Check className="w-3.5 h-3.5 text-premium-success" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateClue(clue.id, 'generated' as keyof HuntClue, 'true')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-premium-neon/10 text-premium-neon border border-premium-neon/30 hover:bg-premium-neon/20 scale-on-click"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Generate & Download QR
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Prize config */}
      <div className="p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark">
        <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-premium-gold" />
          Final Prize / Reward
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-zinc-400 font-bold block mb-1.5">Prize name</label>
            <input placeholder="e.g. AirPods Pro" className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-400 font-bold block mb-1.5">Winners (top N)</label>
            <input type="number" defaultValue="3" className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Quiz Builder ───────────────────────────────────────── */

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  points: number;
  timeLimit: number;
}

const SAMPLE_QUIZ: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'In what year was this company founded?',
    options: ['2018', '2020', '2022', '2024'],
    correct: 1,
    points: 100,
    timeLimit: 15,
  },
  {
    id: 'q2',
    question: 'Which of these is our flagship product?',
    options: ['Alpha Suite', 'Beta Core', 'Gamma Cloud', 'Delta AI'],
    correct: 2,
    points: 150,
    timeLimit: 20,
  },
];

function QuizBuilder() {
  const [questions, setQuestions] = useState<QuizQuestion[]>(SAMPLE_QUIZ);
  const [uploadState, setUploadState] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle');
  const [editId, setEditId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const simulateUpload = () => {
    setUploadState('parsing');
    setTimeout(() => setUploadState('done'), 1800);
  };

  const removeQuestion = (id: string) => setQuestions((prev) => prev.filter((q) => q.id !== id));
  const updateOption = (qid: string, idx: number, val: string) =>
    setQuestions((prev) => prev.map((q) => q.id === qid ? { ...q, options: q.options.map((o, i) => i === idx ? val : o) } : q));
  const setCorrect = (qid: string, idx: number) =>
    setQuestions((prev) => prev.map((q) => q.id === qid ? { ...q, correct: idx } : q));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
            <Zap className="w-4.5 h-4.5 text-premium-gold" />
            Live Trivia Quiz
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Upload a spreadsheet or build questions manually. Guests answer in real-time on the Stage LED.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setQuestions((prev) => [...prev, {
            id: `q${Date.now()}`,
            question: '',
            options: ['', '', '', ''],
            correct: 0,
            points: 100,
            timeLimit: 15,
          }])}
          className="px-4 py-2 rounded-xl bg-premium-gold text-black text-xs font-bold shadow-gold scale-on-click flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Question
        </button>
      </div>

      {/* CSV uploader */}
      <div
        className={`relative p-5 rounded-2xl border-2 border-dashed transition-all ${
          uploadState === 'done'
            ? 'border-premium-success/50 bg-premium-success/5'
            : uploadState === 'parsing'
              ? 'border-premium-gold/50 bg-premium-gold/5'
              : 'border-premium-borderDark bg-premium-surfaceDark hover:border-premium-gold/40'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={simulateUpload}
        />
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            uploadState === 'done' ? 'bg-premium-success/20' : uploadState === 'parsing' ? 'bg-premium-gold/20' : 'bg-zinc-800'
          }`}>
            {uploadState === 'done'
              ? <CheckCircle2 className="w-6 h-6 text-premium-success" />
              : uploadState === 'parsing'
                ? <div className="w-5 h-5 border-2 border-premium-gold border-t-transparent rounded-full animate-spin" />
                : <FileText className="w-6 h-6 text-zinc-500" />
            }
          </div>
          <div className="flex-1">
            {uploadState === 'idle' && (
              <>
                <div className="text-sm font-bold text-white">Upload CSV or Excel</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Columns: Question · Option A · Option B · Option C · Option D · Correct (A-D) · Points · Time (s)</div>
              </>
            )}
            {uploadState === 'parsing' && (
              <>
                <div className="text-sm font-bold text-premium-gold">Parsing spreadsheet…</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Reading questions and answers</div>
              </>
            )}
            {uploadState === 'done' && (
              <>
                <div className="text-sm font-bold text-premium-success">12 questions imported!</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">quiz_questions.xlsx · 14 KB · {new Date().toLocaleDateString()}</div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-zinc-800 border border-premium-borderDark text-zinc-300 text-xs font-bold hover:border-premium-gold/50 scale-on-click flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Browse
            </button>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="px-3 py-2 rounded-xl bg-zinc-800 border border-premium-borderDark text-zinc-400 text-xs font-bold hover:border-premium-gold/50 scale-on-click flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Template
            </a>
          </div>
        </div>

        {/* Drag hint */}
        <div className="mt-3 text-[10px] text-zinc-600 text-center">or drag and drop here</div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Questions', val: questions.length, color: 'text-premium-gold' },
          { label: 'Total Points', val: questions.reduce((s, q) => s + q.points, 0), color: 'text-premium-neon' },
          { label: 'Est. Duration', val: `${Math.ceil(questions.reduce((s, q) => s + q.timeLimit, 0) / 60)} min`, color: 'text-premium-success' },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-center">
            <div className={`text-lg font-display font-bold ${s.color}`}>{s.val}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Question list */}
      <div className="space-y-2">
        {questions.map((q, idx) => {
          const isEditing = editId === q.id;
          return (
            <div
              key={q.id}
              className={`rounded-2xl border transition-all ${
                isEditing ? 'border-premium-gold/40 bg-premium-gold/5' : 'border-premium-borderDark bg-premium-charcoal'
              }`}
            >
              <div
                className="p-4 flex items-center gap-3 cursor-pointer"
                onClick={() => setEditId(isEditing ? null : q.id)}
              >
                <div className="w-6 h-6 rounded-lg bg-premium-surfaceDark flex items-center justify-center text-[11px] font-bold text-zinc-500 flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{q.question || 'New question…'}</div>
                  <div className="text-[10px] text-zinc-500">{q.options.filter(Boolean).length} options · {q.points} pts · {q.timeLimit}s</div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-premium-success/10 border border-premium-success/20 text-[10px] font-bold text-premium-success">
                  <Check className="w-3 h-3" />
                  {['A', 'B', 'C', 'D'][q.correct]}
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); removeQuestion(q.id); }} className="text-zinc-600 hover:text-premium-danger">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {isEditing && (
                <div className="px-4 pb-4 space-y-3 border-t border-premium-borderDark/50 pt-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 font-bold block mb-1.5">Question</label>
                    <textarea
                      value={q.question}
                      onChange={(e) => setQuestions((prev) => prev.map((qq) => qq.id === q.id ? { ...qq, question: e.target.value } : qq))}
                      rows={2}
                      className="w-full bg-premium-black border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCorrect(q.id, oi)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 border-2 ${
                            q.correct === oi
                              ? 'bg-premium-success border-premium-success text-black'
                              : 'border-zinc-700 text-zinc-500 hover:border-premium-success/50'
                          }`}
                        >
                          {['A', 'B', 'C', 'D'][oi]}
                        </button>
                        <input
                          value={opt}
                          onChange={(e) => updateOption(q.id, oi, e.target.value)}
                          placeholder={`Option ${['A', 'B', 'C', 'D'][oi]}`}
                          className="flex-1 bg-premium-black border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-400 font-bold block mb-1.5">Points</label>
                      <input
                        type="number"
                        value={q.points}
                        onChange={(e) => setQuestions((prev) => prev.map((qq) => qq.id === q.id ? { ...qq, points: Number(e.target.value) } : qq))}
                        className="w-full bg-premium-black border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 font-bold block mb-1.5">Time limit (seconds)</label>
                      <input
                        type="number"
                        value={q.timeLimit}
                        onChange={(e) => setQuestions((prev) => prev.map((qq) => qq.id === q.id ? { ...qq, timeLimit: Number(e.target.value) } : qq))}
                        className="w-full bg-premium-black border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main GamesBuilder ──────────────────────────────────── */

interface GamesBuilderProps {
  subTab: 'quiz' | 'scavenger' | 'link';
  setSubTab: (t: 'quiz' | 'scavenger' | 'link') => void;
}

export function GamesBuilder({ subTab, setSubTab }: GamesBuilderProps) {
  return (
    <div className="space-y-5">
      {/* Tab switcher */}
      <div className="flex items-center gap-2 bg-premium-surfaceDark border border-premium-borderDark rounded-2xl p-1.5 w-max flex-wrap">
        {([['quiz', 'Live Trivia Quiz', Zap], ['scavenger', 'Scavenger Hunt', MapPin], ['link', 'Link URL', QrCode]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 scale-on-click ${
              subTab === id ? 'bg-premium-gold text-black shadow-gold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {subTab !== 'link' && (
        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark">
          {subTab === 'quiz' && <QuizBuilder />}
          {subTab === 'scavenger' && <ScavengerBuilder />}
        </div>
      )}

      {subTab === 'link' && (
        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Games Live URL</p>
            <p className="text-xs text-zinc-400">Share this link so guests can join your live games from their phones.</p>
          </div>
          <div className="flex items-center gap-2 bg-premium-surfaceDark border border-premium-borderDark rounded-2xl px-4 py-3">
            <span className="text-premium-neon font-mono text-sm flex-1 truncate">https://play.all41.app/g/your-event-slug</span>
            <button type="button" className="p-2 rounded-xl bg-premium-black border border-premium-borderDark hover:border-zinc-600 transition-all scale-on-click">
              <Copy className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center">
              <QrCode className="w-16 h-16 text-black" />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-400">QR Code for projector / printed materials</p>
              <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-premium-gold text-black rounded-xl text-xs font-bold scale-on-click shadow-gold">
                <Download className="w-3.5 h-3.5" />
                Download PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
