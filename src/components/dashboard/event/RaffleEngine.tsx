'use client';

import React, { useState } from 'react';
import { Copy, Download, ExternalLink, Gift, Plus, Trash2, Trophy, Tv, Palette, Settings2, Sparkles, Check, Users, UserX, X } from 'lucide-react';
import {
  formatGuestNumber, guestPool, newDoorPrize, newId, numberDigits, updateDrawWinners, useEventConfig, useGuests, type DoorPrize, type DrawWinner,
} from '@/lib/eventStore';
import { forfeitDraw, serverPrize, toDrawWinner, useDoorPrizeBoard, useDoorPrizeSync } from '@/lib/doorPrizeApi';
import { isServerEventId } from '@/lib/guestsApi';
import { saveStageState } from '@/lib/stageApi';
import { AudiencePicker } from '@/components/raffle/AudiencePicker';
import { SendButtons } from './SendButtons';
import { DrawMachine, DRAW_STYLES } from '@/components/raffle/DrawMachine';
import { SlotSettings } from '@/components/raffle/SlotSettings';
import { RepeatWinnersToggle } from '@/components/raffle/RepeatWinnersToggle';
import { ScreenLookNote } from '@/components/screens/ScreenLookNote';
import { StageFrameShell } from '@/components/stage/StageFrameShell';
import { downloadBlob, toCsv } from '@/lib/image';

type Tab = 'machine' | 'prize' | 'guests' | 'design' | 'winners' | 'screen';

const input = 'w-full px-3 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-xs text-white outline-none focus:border-premium-gold/60';

export function RaffleEngine({ eventId }: { eventId: string }) {
  const { config, base, update } = useEventConfig(eventId);
  const { items, activeId } = config.doorprizes;
  const guests = useGuests(eventId);
  const digits = numberDigits(guests, config.info.capacity);
  const [selectedId, setSelectedId] = useState<string>(activeId || items[0]?.id || '');
  const [tab, setTab] = useState<Tab>('machine');
  const [saveWinners, setSaveWinners] = useState(false);
  const [copied, setCopied] = useState('');
  const [winnerError, setWinnerError] = useState<string | null>(null);
  const draw = items.find((d) => d.id === selectedId) ?? items[0];

  // Saved events: winners live on the server (drawn on any screen); the setup is kept in step with it.
  const server = isServerEventId(eventId);
  const { board } = useDoorPrizeBoard(server ? eventId : null, server && tab === 'winners' ? 5000 : 0);
  useDoorPrizeSync(server ? eventId : null, items);
  const awardedOf = (d: DoorPrize) => (server ? serverPrize(board, d.id)?.awarded ?? 0 : d.winners.length);
  const winnersOf = (d: DoorPrize): (DrawWinner & { forfeited?: boolean })[] => {
    if (!server) return d.winners;
    const p = serverPrize(board, d.id);
    return (p?.winners ?? []).map((w) => ({ ...toDrawWinner(p!, w, digits), forfeited: w.status === 'forfeited' }));
  };
  const forfeit = async (w: DrawWinner) => {
    if (!confirm(`Forfeit ${w.number ? `No. ${w.label}` : w.label}? They stay out of the draw, and you can draw this prize again.`)) return;
    setWinnerError(null);
    try {
      await forfeitDraw(eventId, w.id);
    } catch (e) {
      setWinnerError(e instanceof Error ? e.message : 'Could not forfeit that winner.');
    }
  };
  const putOnStage = (id: string) => {
    update('doorprizes', { activeId: id });
    if (server) saveStageState(eventId, { doorprize_id: id }).catch(() => {});
  };

  const setItems = (next: DoorPrize[], patch: Partial<typeof config.doorprizes> = {}) => update('doorprizes', { items: next, ...patch });
  const patch = (p: Partial<DoorPrize>) => draw && setItems(items.map((d) => (d.id === draw.id ? { ...d, ...p } : d)));

  const add = () => {
    const d = newDoorPrize(base, items.length + 1);
    setItems([...items, d]);
    setSelectedId(d.id);
    setTab('prize');
  };
  const duplicate = (d: DoorPrize) => {
    // A fresh id: the server keys each door prize's winners by it.
    const copy: DoorPrize = { ...structuredClone(d), id: newId('dp'), name: `${d.name} (copy)`, winners: [] };
    setItems([...items, copy]);
    setSelectedId(copy.id);
  };
  const remove = (d: DoorPrize) => {
    if (items.length === 1) return alert('Keep at least one door prize.');
    const n = awardedOf(d);
    const question = server && n
      ? `Delete “${d.name}”? Its ${n} winner(s) stay on record and won't be drawn again.`
      : `Delete “${d.name}” and its ${n} winner(s)?`;
    if (!confirm(question)) return;
    const next = items.filter((x) => x.id !== d.id);
    setItems(next, activeId === d.id ? { activeId: next[0].id } : {});
    if (selectedId === d.id) setSelectedId(next[0].id);
  };

  const allUrl = `/events/${config.info.slug}/doorprize`;
  const screenUrl = draw ? `${allUrl}/${draw.id}` : '';
  const winnerName = (guestId?: string) => (guestId ? guests.find((g) => g.id === guestId) : undefined);

  return (
    <div className="space-y-5">
      {/* Door prize list */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((d) => {
          const sel = draw?.id === d.id;
          return (
            <div
              key={d.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(d.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(d.id); }}
              className={`min-w-[210px] p-4 rounded-2xl border text-left cursor-pointer scale-on-click transition-all ${sel ? 'bg-premium-charcoal border-premium-gold shadow-gold' : 'bg-premium-charcoal border-premium-borderDark hover:border-premium-gold/40'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-premium-gold">{DRAW_STYLES.find((s) => s.id === d.style)?.label}</span>
                {config.doorprizes.activeId === d.id && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-premium-success/15 text-premium-success border border-premium-success/30">ON STAGE</span>}
              </div>
              <div className="text-sm font-display font-bold text-white mt-1 truncate">{d.name}</div>
              <div className="text-[11px] text-zinc-400 truncate">{d.prize} · ×{d.quantity}</div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] font-mono text-zinc-500">{awardedOf(d)}/{d.quantity} drawn</span>
                <span className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => duplicate(d)} className="text-zinc-500 hover:text-white scale-on-click" aria-label="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => remove(d)} className="text-zinc-600 hover:text-premium-danger scale-on-click" aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </span>
              </div>
            </div>
          );
        })}
        <button type="button" onClick={add} className="min-w-[170px] p-4 rounded-2xl border-2 border-dashed border-premium-borderDark text-zinc-400 hover:text-white hover:border-premium-gold/50 flex flex-col items-center justify-center gap-2 scale-on-click">
          <Plus className="w-5 h-5" />
          <span className="text-xs font-bold">Add door prize</span>
        </button>
      </div>

      {draw && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { id: 'machine', label: 'Machine', icon: Sparkles },
              { id: 'prize', label: 'Prize', icon: Gift },
              { id: 'guests', label: `Guests (${guestPool(guests, draw.audience, draw.pickedGuestIds).length})`, icon: Users },
              { id: 'design', label: 'Frame & Footer', icon: Palette },
              { id: 'winners', label: `Winners (${awardedOf(draw)})`, icon: Trophy },
              { id: 'screen', label: 'Big Screen', icon: Tv },
            ] as const).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold scale-on-click transition-all ${tab === t.id ? 'bg-premium-gold/15 text-premium-gold border border-premium-gold/40' : 'bg-premium-surfaceDark text-zinc-400 border border-premium-borderDark hover:text-white'}`}
              >
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>

          {tab === 'machine' && (
            <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {DRAW_STYLES.map((s) => (
                  <button key={s.id} type="button" onClick={() => patch({ style: s.id })} className={`p-4 rounded-2xl border text-left scale-on-click transition-all ${draw.style === s.id ? 'border-premium-gold bg-premium-surfaceDark shadow-gold' : 'border-premium-borderDark bg-premium-black/60 hover:border-zinc-600'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{s.label}</span>
                      {draw.style === s.id && <Check className="w-3.5 h-3.5 text-premium-gold" />}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">{s.desc}</div>
                  </button>
                ))}
              </div>
              <SlotSettings eventId={eventId} drawId={draw.id} />
              <div className="rounded-[2rem] overflow-hidden border border-premium-borderDark bg-premium-black">
                <StageFrameShell frame={draw.frame} logoRef={config.design.logoUrl}>
                  <div className="py-10 px-4 flex flex-col items-center gap-4">
                    <div className="text-center">
                      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-premium-gold">★ {draw.name} ★</p>
                      <p className="text-xl font-display font-bold text-white">{draw.prize}</p>
                    </div>
                    <DrawMachine eventId={eventId} draw={draw} record={saveWinners} />
                  </div>
                </StageFrameShell>
              </div>
              <RepeatWinnersToggle eventId={eventId} drawId={draw.id} />
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <input type="checkbox" checked={saveWinners} onChange={(e) => setSaveWinners(e.target.checked)} className="accent-[#C5A059]" />
                Save winners drawn here (off = practice spins)
              </label>
            </div>
          )}

          {tab === 'prize' && (
            <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1.5"><span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Door prize name</span><input value={draw.name} onChange={(e) => patch({ name: e.target.value })} className={input} /></label>
              <label className="space-y-1.5"><span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Prize</span><input value={draw.prize} onChange={(e) => patch({ prize: e.target.value })} className={input} /></label>
              <label className="space-y-1.5"><span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">How many winners</span><input type="number" min={1} value={draw.quantity} onChange={(e) => patch({ quantity: Math.max(1, parseInt(e.target.value || '1', 10)) })} className={input} /></label>
              <label className="space-y-1.5"><span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Sponsor (optional)</span><input value={draw.sponsor} onChange={(e) => patch({ sponsor: e.target.value })} className={input} /></label>
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer sm:col-span-2">
                <input type="checkbox" checked={draw.confetti} onChange={(e) => patch({ confetti: e.target.checked })} className="accent-[#C5A059]" />
                Confetti burst when a winner is revealed
              </label>
              <p className="text-[11px] text-zinc-500 sm:col-span-2">Only checked-in guests can win, and a guest can only win once across all door prizes, unless “Winner can participate again” is on for this door prize (Machine tab).</p>
            </div>
          )}

          {tab === 'guests' && (
            <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark">
              <AudiencePicker
                guests={guests}
                audience={draw.audience}
                picked={draw.pickedGuestIds}
                anonymous={draw.anonymous}
                digits={digits}
                noun="draw"
                onChange={(p) => patch(p)}
              />
            </div>
          )}

          {tab === 'design' && (
            <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark">
              <ScreenLookNote eventId={eventId} />
            </div>
          )}

          {tab === 'winners' && (() => {
            const rows = winnersOf(draw);
            const won = rows.filter((w) => !w.forfeited);
            return (
              <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">{awardedOf(draw)} of {draw.quantity} winners drawn</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Tell each winner with one tap. Edit the message in Broadcast → Winner.
                      {server && ' A winner who doesn’t come forward can be forfeited, then draw again.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!won.length}
                    onClick={() => downloadBlob(`${draw.name}-winners.csv`, new Blob([toCsv([['Winner', 'Guest No.', 'Guest', 'Drawn at'], ...won.map((w) => { const g = winnerName(w.guestId); return [w.label, formatGuestNumber(g?.guest_number ?? w.number, digits), g?.name ?? '', new Date(w.at).toLocaleString()]; })])], { type: 'text/csv;charset=utf-8' }))}
                    className="px-3 py-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white text-xs font-bold scale-on-click flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                </div>
                {winnerError && <p className="text-[11px] text-premium-danger">{winnerError}</p>}
                {rows.length === 0 ? (
                  <p className="text-xs text-zinc-500">No winners yet. Draw on the big screen, or tick “Save winners” on the Machine tab.</p>
                ) : (
                  <div className="divide-y divide-premium-borderDark/60 rounded-2xl border border-premium-borderDark overflow-hidden">
                    {rows.map((w, i) => {
                      const guest = winnerName(w.guestId);
                      return (
                        <div key={w.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 text-xs ${w.forfeited ? 'opacity-50' : ''}`}>
                          <span className="w-6 h-6 rounded-full bg-premium-gold/15 text-premium-gold font-bold flex items-center justify-center">{rows.length - i}</span>
                          <span className={`flex-1 min-w-0 truncate ${w.forfeited ? 'line-through' : ''}`}>
                            <span className="font-bold text-white">{w.number ? `No. ${w.label}` : w.label}</span>
                            {guest && guest.name !== w.label && <span className="text-zinc-400 ml-2">· {guest.name}</span>}
                          </span>
                          {w.forfeited ? (
                            <span className="text-[10px] font-bold uppercase text-zinc-500">Forfeited</span>
                          ) : (
                            guest && <SendButtons eventId={eventId} kind="winner" guest={guest} prize={draw.prize || draw.name} size="sm" />
                          )}
                          <span className="font-mono text-zinc-500">{new Date(w.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {server ? (
                            !w.forfeited && (
                              <button type="button" onClick={() => void forfeit(w)} className="text-zinc-600 hover:text-premium-danger scale-on-click" aria-label="Forfeit winner" title="Did not come forward: forfeit, then draw again">
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            )
                          ) : (
                            <button type="button" onClick={() => updateDrawWinners(eventId, draw.id, (ws) => ws.filter((x) => x.id !== w.id))} className="text-zinc-600 hover:text-premium-danger scale-on-click" aria-label="Remove winner"><X className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {tab === 'screen' && (
            <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
              <p className="text-xs text-zinc-400">Door prizes have their own link, separate from games. Open it on the ballroom screen, or put this door prize on the LED stage.</p>
              {[
                { label: `This door prize: ${draw.name}`, url: screenUrl },
                { label: 'All door prizes (switch between them on screen)', url: allUrl },
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
              <button
                type="button"
                onClick={() => putOnStage(draw.id)}
                disabled={config.doorprizes.activeId === draw.id}
                className="px-4 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black text-xs font-bold scale-on-click shadow-gold flex items-center gap-1.5 disabled:opacity-50"
              >
                <Settings2 className="w-3.5 h-3.5" /> {config.doorprizes.activeId === draw.id ? 'This door prize is on the LED stage' : 'Use this door prize on the LED stage'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
