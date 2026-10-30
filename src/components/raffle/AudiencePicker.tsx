'use client';

import React, { useMemo, useState } from 'react';
import { Check, EyeOff, Search, Users, UserCheck } from 'lucide-react';
import { formatGuestNumber, type Audience } from '@/lib/eventStore';
import type { Guest } from '@/lib/types';

export interface AudiencePatch {
  audience?: Audience;
  pickedGuestIds?: string[];
  anonymous?: boolean;
}

interface Props {
  guests: Guest[];
  audience: Audience;
  picked: string[];
  anonymous: boolean;
  digits: number;
  onChange: (patch: AudiencePatch) => void;
  /** What guests join, e.g. "draw" or "game". */
  noun?: string;
}

/** All / Picked guests selector with an anonymous (numbers only) switch, shared by door prizes and games. */
export function AudiencePicker({ guests, audience, picked, anonymous, digits, onChange, noun = 'draw' }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const pickedSet = useMemo(() => new Set(picked), [picked]);
  const categories = useMemo(() => Array.from(new Set(guests.map((g) => g.category).filter(Boolean))), [guests]);

  const members = audience === 'all' ? guests : guests.filter((g) => pickedSet.has(g.id));
  const live = members.filter((g) => g.is_checked_in).length;

  const shown = guests.filter((g) => {
    if (category !== 'all' && g.category !== category) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${g.guest_number ?? ''} ${formatGuestNumber(g.guest_number, digits)} ${g.name} ${g.category} ${g.table_number ?? ''}`.toLowerCase().includes(q);
  });

  const toggle = (id: string) => {
    const next = new Set(pickedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ pickedGuestIds: guests.filter((g) => next.has(g.id)).map((g) => g.id) });
  };
  const selectShown = () => {
    const next = new Set(pickedSet);
    shown.forEach((g) => next.add(g.id));
    onChange({ pickedGuestIds: guests.filter((g) => next.has(g.id)).map((g) => g.id) });
  };
  const clearShown = () => {
    const drop = new Set(shown.map((g) => g.id));
    onChange({ pickedGuestIds: picked.filter((id) => !drop.has(id)) });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest">Who&apos;s in the {noun}</div>
        <div className="flex items-center gap-1 bg-premium-surfaceDark p-1 rounded-xl border border-premium-borderDark">
          {([
            { id: 'all', label: 'All guests', icon: Users },
            { id: 'picked', label: 'Picked guests', icon: UserCheck },
          ] as { id: Audience; label: string; icon: typeof Users }[]).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange({ audience: m.id })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold scale-on-click transition-all ${
                audience === m.id ? 'bg-premium-gold text-black shadow-gold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <m.icon className="w-3.5 h-3.5" /> {m.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-zinc-400">
        <span className="font-mono text-white">{members.length}</span> guest{members.length === 1 ? '' : 's'} in this {noun} ·{' '}
        <span className="font-mono text-premium-success">{live}</span> checked in{' '}
        <span className="text-zinc-500">(only checked-in guests can play or win)</span>
      </p>

      {audience === 'picked' && (
        <div className="rounded-2xl border border-premium-borderDark bg-premium-surfaceDark/60 overflow-hidden">
          <div className="p-3 flex flex-wrap items-center gap-2 border-b border-premium-borderDark">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, number or table"
                className="w-full bg-premium-black border border-premium-borderDark text-white pl-8 pr-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold"
              />
            </div>
            <button type="button" onClick={selectShown} className="px-3 py-2 rounded-xl border border-premium-borderDark text-xs font-bold text-zinc-300 hover:text-white scale-on-click">
              Select shown
            </button>
            <button type="button" onClick={clearShown} className="px-3 py-2 rounded-xl border border-premium-borderDark text-xs font-bold text-zinc-500 hover:text-white scale-on-click">
              Clear shown
            </button>
          </div>
          {categories.length > 1 && (
            <div className="px-3 py-2 flex flex-wrap gap-1.5 border-b border-premium-borderDark">
              {['all', ...categories].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold scale-on-click ${category === c ? 'bg-premium-gold/15 text-premium-gold border border-premium-gold/40' : 'text-zinc-500 border border-premium-borderDark hover:text-white'}`}
                >
                  {c === 'all' ? 'All categories' : c}
                </button>
              ))}
            </div>
          )}
          <div className="max-h-72 overflow-y-auto divide-y divide-premium-borderDark/50">
            {shown.length === 0 && <p className="p-4 text-xs text-zinc-500">No guests match.</p>}
            {shown.map((g) => {
              const on = pickedSet.has(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggle(g.id)}
                  aria-pressed={on}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs hover:bg-premium-charcoal/60 scale-on-click"
                >
                  <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${on ? 'bg-premium-gold border-premium-gold' : 'border-zinc-600'}`}>
                    {on && <Check className="w-3 h-3 text-black" />}
                  </span>
                  <span className="font-mono font-bold text-premium-gold w-12 shrink-0">{formatGuestNumber(g.guest_number, digits)}</span>
                  <span className="flex-1 min-w-0 truncate text-white font-medium">{g.name}</span>
                  <span className="text-[10px] text-zinc-500 shrink-0">{g.category}</span>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${g.is_checked_in ? 'bg-premium-success' : 'bg-zinc-700'}`} title={g.is_checked_in ? 'Checked in' : 'Not checked in'} />
                </button>
              );
            })}
          </div>
          <div className="px-3 py-2 text-[11px] text-zinc-500 border-t border-premium-borderDark">
            <span className="font-mono text-premium-gold">{picked.length}</span> picked
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 p-3 rounded-2xl border border-premium-borderDark bg-premium-surfaceDark/60">
        <div className="flex items-start gap-3">
          <EyeOff className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs text-white font-medium">Anonymous: show numbers, not names</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              The screen shows <span className="font-mono text-premium-gold">No. {formatGuestNumber(18, digits)}</span> instead of the guest&apos;s name.
            </div>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={anonymous}
          aria-label="Anonymous mode"
          onClick={() => onChange({ anonymous: !anonymous })}
          className={`w-11 h-6 rounded-full transition-colors flex items-center shrink-0 scale-on-click ${anonymous ? 'bg-premium-success justify-end pr-0.5' : 'bg-zinc-700 pl-0.5'}`}
        >
          <span className="w-5 h-5 rounded-full bg-white shadow" />
        </button>
      </div>
    </div>
  );
}
