'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Check, Copy, Download, ExternalLink, Gamepad2, MapPin, Palette, Plus, Search, Trash2, Trophy, Tv, Upload, Users, X,
} from 'lucide-react';
import {
  formatGuestNumber, guestPool, newActivity, newClue, newId, newQuizItem, numberDigits, QUIZ_STEP_SECONDS, quizPointLadder, updateGameWinners, useEventConfig, useGuests,
  type Activity, type ClueItem, type NameAlign, type QuizItem,
} from '@/lib/eventStore';
import { AudiencePicker } from '@/components/raffle/AudiencePicker';
import { SendButtons } from './SendButtons';
import { FrameDesigner } from '@/components/stage/FrameDesigner';
import { downloadBlob, downloadDataUrl, toCsv } from '@/lib/image';

type Tab = 'content' | 'guests' | 'winners' | 'design' | 'screen';
const input = 'w-full px-3 py-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-xs text-white outline-none focus:border-premium-gold/60';
const NAME_ALIGNS: { id: NameAlign; label: string; icon: typeof AlignLeft }[] = [
  { id: 'left', label: 'Left', icon: AlignLeft },
  { id: 'center', label: 'Center', icon: AlignCenter },
  { id: 'right', label: 'Right', icon: AlignRight },
];

function move<T>(list: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function QuizEditor({ questions, onChange }: { questions: QuizItem[]; onChange: (q: QuizItem[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [openId, setOpenId] = useState<string | null>(questions[0]?.id ?? null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const patch = (id: string, p: Partial<QuizItem>) => onChange(questions.map((q) => (q.id === id ? { ...q, ...p } : q)));

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
      const parsed: QuizItem[] = [];
      for (const r of rows.slice(1)) {
        const [text, a, b, c, d, ans, pts] = r.map((x) => String(x).trim());
        if (!text || !a || !b) continue;
        const options = [a, b, c, d].filter(Boolean);
        const letter = (ans || 'A').toUpperCase().charCodeAt(0) - 65;
        parsed.push({ id: newId('qz'), text, options, answer: Math.min(Math.max(letter, 0), options.length - 1), points: parseInt(pts || '1000', 10) || 1000, seconds: 15 });
      }
      onChange([...questions, ...parsed]);
      setImportMsg(`Imported ${parsed.length} question${parsed.length === 1 ? '' : 's'}.`);
    } catch {
      setImportMsg('Could not read that file. Use columns: Question, A, B, C, D, Answer (A–D), Points.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { const q = newQuizItem(); onChange([...questions, q]); setOpenId(q.id); }} className="px-3 py-2 rounded-xl bg-premium-gold text-black text-xs font-bold scale-on-click flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Question</button>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white text-xs font-bold scale-on-click flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Import CSV / Excel</button>
        <button type="button" onClick={() => downloadBlob('quiz-template.csv', new Blob([toCsv([['Question', 'A', 'B', 'C', 'D', 'Answer', 'Points'], ['Who is known as the King of Pop?', 'Elvis', 'Prince', 'Michael Jackson', 'Bowie', 'C', '1000']])], { type: 'text/csv' }))} className="text-[11px] font-mono text-premium-neon hover:underline">Template ↓</button>
        <span className="text-[11px] text-zinc-500 ml-auto">{questions.length} questions</span>
      </div>
      {importMsg && <p className="text-xs text-premium-gold">{importMsg}</p>}
      {questions.map((q, i) => {
        const open = openId === q.id;
        return (
          <div key={q.id} className={`rounded-2xl border bg-premium-surfaceDark ${open ? 'border-premium-gold/50' : 'border-premium-borderDark'}`}>
            <div className="flex items-center gap-2.5 p-3">
              <span className="text-[10px] font-mono text-zinc-600 w-5">{i + 1}</span>
              <button type="button" onClick={() => setOpenId(open ? null : q.id)} className="flex-1 min-w-0 text-left">
                <span className="block text-xs font-bold text-white truncate">{q.text}</span>
                <span className="block text-[10px] text-zinc-500">Answer: {q.options[q.answer]} · {q.points} pts · {q.seconds}s</span>
              </button>
              <button type="button" onClick={() => onChange(move(questions, i, -1))} disabled={i === 0} className="text-zinc-500 hover:text-white disabled:opacity-20 scale-on-click" aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => onChange(move(questions, i, 1))} disabled={i === questions.length - 1} className="text-zinc-500 hover:text-white disabled:opacity-20 scale-on-click" aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => onChange(questions.filter((x) => x.id !== q.id))} className="text-zinc-600 hover:text-premium-danger scale-on-click" aria-label="Delete question"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            {open && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-premium-borderDark/60">
                <textarea rows={2} value={q.text} onChange={(e) => patch(q.id, { text: e.target.value })} className={`${input} resize-y`} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => patch(q.id, { answer: oi })}
                        className={`w-7 h-7 rounded-lg text-[11px] font-bold shrink-0 scale-on-click ${q.answer === oi ? 'bg-premium-success text-black' : 'bg-premium-charcoal border border-premium-borderDark text-zinc-400'}`}
                        aria-label={`Mark ${String.fromCharCode(65 + oi)} as correct`}
                        title="Mark as correct answer"
                      >
                        {q.answer === oi ? <Check className="w-3.5 h-3.5 mx-auto" /> : String.fromCharCode(65 + oi)}
                      </button>
                      <input value={opt} onChange={(e) => patch(q.id, { options: q.options.map((o, k) => (k === oi ? e.target.value : o)) })} className={input} />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] text-zinc-500 font-mono uppercase">Points<input type="number" min={0} value={q.points} onChange={(e) => patch(q.id, { points: Math.max(0, parseInt(e.target.value || '0', 10)) })} className={`${input} mt-1`} /></label>
                  <label className="text-[10px] text-zinc-500 font-mono uppercase">Seconds<input type="number" min={5} value={q.seconds} onChange={(e) => patch(q.id, { seconds: Math.max(5, parseInt(e.target.value || '15', 10)) })} className={`${input} mt-1`} /></label>
                </div>
                <p className="text-[10px] text-zinc-500">
                  Faster answers score more. Every {QUIZ_STEP_SECONDS} seconds:{' '}
                  <span className="font-mono text-premium-gold">{quizPointLadder(q.points, q.seconds).join(' → ')}</span> pts. Wrong or too late: 0.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ClueQr({ token }: { token: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    QRCode.toDataURL(`D1-HUNT-${token}`, { width: 300, margin: 1 }).then(setUrl).catch(() => setUrl(''));
  }, [token]);
  if (!url) return <div className="w-14 h-14 rounded-lg bg-white/10" />;
  return (
    <button type="button" onClick={() => downloadDataUrl(`clue-${token}.png`, url)} title="Download QR" className="shrink-0 scale-on-click">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={`QR ${token}`} className="w-14 h-14 rounded-lg bg-white p-1" />
    </button>
  );
}

function HuntEditor({ clues, onChange }: { clues: ClueItem[]; onChange: (c: ClueItem[]) => void }) {
  const patch = (id: string, p: Partial<ClueItem>) => onChange(clues.map((c) => (c.id === id ? { ...c, ...p } : c)));
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange([...clues, newClue()])} className="px-3 py-2 rounded-xl bg-premium-gold text-black text-xs font-bold scale-on-click flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Clue</button>
        <span className="text-[11px] text-zinc-500 ml-auto">{clues.length} clues · click a QR to download it</span>
      </div>
      {clues.map((c, i) => (
        <div key={c.id} className="p-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark flex gap-3">
          <ClueQr token={c.token} />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-premium-gold font-bold">#{i + 1}</span>
              <MapPin className="w-3.5 h-3.5 text-zinc-500" />
              <input value={c.location} onChange={(e) => patch(c.id, { location: e.target.value })} placeholder="Where is this QR hidden?" className={input} />
            </div>
            <input value={c.riddle} onChange={(e) => patch(c.id, { riddle: e.target.value })} placeholder="Riddle shown to guests" className={input} />
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <input value={c.hint} onChange={(e) => patch(c.id, { hint: e.target.value })} placeholder="Hint (optional)" className={input} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button type="button" onClick={() => onChange(move(clues, i, -1))} disabled={i === 0} className="text-zinc-500 hover:text-white disabled:opacity-20 scale-on-click" aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => onChange(move(clues, i, 1))} disabled={i === clues.length - 1} className="text-zinc-500 hover:text-white disabled:opacity-20 scale-on-click" aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => onChange(clues.filter((x) => x.id !== c.id))} className="text-zinc-600 hover:text-premium-danger scale-on-click" aria-label="Delete clue"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function GameWinners({ eventId, activity, onChange }: { eventId: string; activity: Activity; onChange: (p: Partial<Activity>) => void }) {
  const { config } = useEventConfig(eventId);
  const guests = useGuests(eventId);
  const [query, setQuery] = useState('');
  const digits = numberDigits(guests, config.info.capacity);
  const byId = new Map(guests.map((g) => [g.id, g]));
  const winnerIds = new Set(activity.winners.map((w) => w.guestId));
  const q = query.trim().toLowerCase();
  const candidates = guestPool(guests, activity.audience, activity.pickedGuestIds)
    .filter((g) => !winnerIds.has(g.id))
    .filter((g) => !q || `${formatGuestNumber(g.guest_number, digits)} ${g.name} ${g.table_number ?? ''}`.toLowerCase().includes(q));
  const prize = activity.prize || `a prize in ${activity.name}`;

  return (
    <div className="space-y-5">
      <label className="block space-y-1.5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">What winners get</span>
        <input value={activity.prize} onChange={(e) => onChange({ prize: e.target.value })} placeholder="e.g. Bluetooth speaker" className={input} />
      </label>

      <div className="space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Winners · tell each one with a tap (edit the text in Broadcast → Winner)</div>
        {activity.winners.length === 0 && <p className="text-xs text-zinc-500">No winners yet. Pick them from the players below.</p>}
        <div className="rounded-2xl border border-premium-borderDark divide-y divide-premium-borderDark/60 overflow-hidden">
          {activity.winners.map((w, i) => {
            const g = byId.get(w.guestId);
            if (!g) return null;
            return (
              <div key={w.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-xs">
                <span className="w-6 h-6 rounded-full bg-premium-gold/15 text-premium-gold font-bold flex items-center justify-center">{i + 1}</span>
                <span className="font-mono font-bold text-premium-gold">{formatGuestNumber(g.guest_number, digits)}</span>
                <span className="flex-1 min-w-[120px] font-bold text-white truncate">{g.name}</span>
                <SendButtons eventId={eventId} kind="winner" guest={g} prize={prize} size="sm" />
                <button type="button" onClick={() => updateGameWinners(eventId, activity.id, (ws) => ws.filter((x) => x.id !== w.id))} className="text-zinc-600 hover:text-premium-danger scale-on-click" aria-label="Remove winner">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Pick a winner from the players</div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, number or table" className={`${input} pl-8`} />
        </div>
        <div className="max-h-64 overflow-y-auto rounded-2xl border border-premium-borderDark divide-y divide-premium-borderDark/50">
          {candidates.length === 0 && <p className="p-4 text-xs text-zinc-500">No checked-in players to pick.</p>}
          {candidates.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => updateGameWinners(eventId, activity.id, (ws) => [...ws, { id: newId('gw'), guestId: g.id, at: new Date().toISOString() }])}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs hover:bg-premium-surfaceDark scale-on-click"
            >
              <span className="font-mono font-bold text-premium-gold w-12">{formatGuestNumber(g.guest_number, digits)}</span>
              <span className="flex-1 truncate text-white">{g.name}</span>
              <span className="text-[11px] font-bold text-premium-gold flex items-center gap-1"><Plus className="w-3 h-3" /> Winner</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GamesBuilder({ eventId }: { eventId: string }) {
  const { config, base, update } = useEventConfig(eventId);
  const { activities, activeId } = config.games;
  const guests = useGuests(eventId);
  const [selectedId, setSelectedId] = useState<string>(activeId || activities[0]?.id || '');
  const [tab, setTab] = useState<Tab>('content');
  const [copied, setCopied] = useState('');
  const activity = activities.find((a) => a.id === selectedId) ?? activities[0];

  const setActivities = (next: Activity[], extra: Partial<typeof config.games> = {}) => update('games', { activities: next, ...extra });
  const patch = (p: Partial<Activity>) => activity && setActivities(activities.map((a) => (a.id === activity.id ? { ...a, ...p } : a)));

  const add = (kind: Activity['kind']) => {
    const a = newActivity(kind, base, activities.filter((x) => x.kind === kind).length + 1);
    setActivities([...activities, a]);
    setSelectedId(a.id);
    setTab('content');
  };
  const remove = (a: Activity) => {
    if (activities.length === 1) return alert('Keep at least one activity.');
    if (!confirm(`Delete “${a.name}”?`)) return;
    const next = activities.filter((x) => x.id !== a.id);
    setActivities(next, activeId === a.id ? { activeId: next[0].id } : {});
    if (selectedId === a.id) setSelectedId(next[0].id);
  };
  const duplicate = (a: Activity) => {
    const copy: Activity = { ...structuredClone(a), id: newId('act'), name: `${a.name} (copy)` };
    setActivities([...activities, copy]);
    setSelectedId(copy.id);
  };

  const allUrl = `/events/${config.info.slug}/games`;
  const screenUrl = activity ? `${allUrl}/${activity.id}` : '';

  return (
    <div className="space-y-5">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {activities.map((a) => {
          const sel = activity?.id === a.id;
          return (
            <div
              key={a.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(a.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(a.id); }}
              className={`min-w-[210px] p-4 rounded-2xl border text-left cursor-pointer scale-on-click transition-all ${sel ? 'bg-premium-charcoal border-premium-gold shadow-gold' : 'bg-premium-charcoal border-premium-borderDark hover:border-premium-gold/40'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-premium-gold">{a.kind === 'quiz' ? 'Trivia quiz' : 'Scavenger hunt'}</span>
                {activeId === a.id && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-premium-success/15 text-premium-success border border-premium-success/30">ON STAGE</span>}
              </div>
              <div className="text-sm font-display font-bold text-white mt-1 truncate">{a.name}</div>
              <div className="text-[11px] text-zinc-400">{a.kind === 'quiz' ? `${a.questions.length} questions` : `${a.clues.length} clues`}</div>
              <div className="flex justify-end gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => duplicate(a)} className="text-zinc-500 hover:text-white scale-on-click" aria-label="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => remove(a)} className="text-zinc-600 hover:text-premium-danger scale-on-click" aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          );
        })}
        <div className="min-w-[180px] flex flex-col gap-2">
          <button type="button" onClick={() => add('quiz')} className="flex-1 p-3 rounded-2xl border-2 border-dashed border-premium-borderDark text-zinc-400 hover:text-white hover:border-premium-gold/50 text-xs font-bold flex items-center justify-center gap-1.5 scale-on-click"><Plus className="w-4 h-4" /> Trivia quiz</button>
          <button type="button" onClick={() => add('scavenger')} className="flex-1 p-3 rounded-2xl border-2 border-dashed border-premium-borderDark text-zinc-400 hover:text-white hover:border-premium-gold/50 text-xs font-bold flex items-center justify-center gap-1.5 scale-on-click"><Plus className="w-4 h-4" /> Scavenger hunt</button>
        </div>
      </div>

      {activity && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { id: 'content', label: activity.kind === 'quiz' ? 'Questions' : 'Clues', icon: Gamepad2 },
              { id: 'guests', label: `Players (${guestPool(guests, activity.audience, activity.pickedGuestIds).length})`, icon: Users },
              { id: 'winners', label: `Winners (${activity.winners.length})`, icon: Trophy },
              { id: 'design', label: 'Frame & Footer', icon: Palette },
              { id: 'screen', label: 'Big Screen', icon: Tv },
            ] as const).map((t) => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold scale-on-click ${tab === t.id ? 'bg-premium-gold/15 text-premium-gold border border-premium-gold/40' : 'bg-premium-surfaceDark text-zinc-400 border border-premium-borderDark hover:text-white'}`}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>

          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
            {tab === 'content' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Activity name</span>
                    <input value={activity.name} onChange={(e) => patch({ name: e.target.value })} className={input} />
                  </label>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Name position on screen</span>
                    <div className="flex gap-1 p-1 rounded-xl bg-premium-surfaceDark border border-premium-borderDark">
                      {NAME_ALIGNS.map(({ id, label, icon: Icon }) => {
                        const active = activity.nameAlign === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => patch({ nameAlign: id })}
                            aria-pressed={active}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold scale-on-click ${active ? 'bg-premium-gold text-black shadow-gold' : 'text-zinc-400 hover:text-white'}`}
                          >
                            <Icon className="w-3.5 h-3.5" /> {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {activity.kind === 'quiz'
                  ? <QuizEditor questions={activity.questions} onChange={(questions) => patch({ questions })} />
                  : <HuntEditor clues={activity.clues} onChange={(clues) => patch({ clues })} />}
              </>
            )}
            {tab === 'winners' && <GameWinners eventId={eventId} activity={activity} onChange={patch} />}
            {tab === 'guests' && (
              <AudiencePicker
                guests={guests}
                audience={activity.audience}
                picked={activity.pickedGuestIds}
                anonymous={activity.anonymous}
                digits={numberDigits(guests, config.info.capacity)}
                noun="game"
                onChange={(p) => patch(p)}
              />
            )}
            {tab === 'design' && <FrameDesigner value={activity.frame} onChange={(p) => patch({ frame: { ...activity.frame, ...p } })} logoRef={config.design.logoUrl} />}
            {tab === 'screen' && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-400">Games have their own link, separate from door prizes. Each activity also has its own link.</p>
                {[
                  { label: `This activity: ${activity.name}`, url: screenUrl },
                  { label: 'All games (switch between them on screen)', url: allUrl },
                ].map((l) => (
                  <div key={l.url} className="space-y-1.5">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{l.label}</div>
                    <div className="flex items-center gap-2 bg-premium-surfaceDark border border-premium-borderDark rounded-2xl px-4 py-3">
                      <span className="flex-1 font-mono text-xs text-premium-neon truncate">{l.url}</span>
                      <button type="button" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}${l.url}`); setCopied(l.url); setTimeout(() => setCopied(''), 1500); }} className="px-3 py-1.5 rounded-xl bg-premium-gold text-black font-bold text-[10px] scale-on-click">{copied === l.url ? 'Copied!' : 'Copy'}</button>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl bg-premium-charcoal border border-premium-borderDark text-white font-bold text-[10px] scale-on-click flex items-center gap-1">Open <ExternalLink className="w-3 h-3" /></a>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => update('games', { activeId: activity.id })} disabled={activeId === activity.id} className="px-4 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black text-xs font-bold scale-on-click shadow-gold disabled:opacity-50">
                  {activeId === activity.id ? 'This activity opens by default' : 'Open this activity by default'}
                </button>
                {activity.kind === 'scavenger' && (
                  <button
                    type="button"
                    onClick={() => downloadBlob(`${activity.name}-clues.csv`, new Blob([toCsv([['#', 'Location', 'Riddle', 'Hint', 'QR value'], ...activity.clues.map((c, i) => [i + 1, c.location, c.riddle, c.hint, `D1-HUNT-${c.token}`])])], { type: 'text/csv' }))}
                    className="px-4 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white text-xs font-bold scale-on-click flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Export clue sheet
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
