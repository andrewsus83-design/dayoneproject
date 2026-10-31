'use client';

import React, { useMemo } from 'react';
import { formLabel, type InvitationForm } from '@/lib/eventStore';
import type { Guest } from '@/lib/types';

/** The guests of one invitation form ('' is the first form), or every guest for null. */
export function inForm(g: Pick<Guest, 'form_id'>, form: string | null): boolean {
  return form === null || (g.form_id ?? '') === form;
}

/**
 * Pills that narrow a guest list to one invitation form. Shown only when the event has more than one form (or guests
 * of a form that was removed since); otherwise renders nothing, so single-form events look as before.
 */
export function FormFilter({
  forms, guests, value, onChange, className = '',
}: {
  forms: InvitationForm[];
  guests: Pick<Guest, 'form_id'>[];
  value: string | null;
  onChange: (form: string | null) => void;
  className?: string;
}) {
  const options = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of guests) counts.set(g.form_id ?? '', (counts.get(g.form_id ?? '') ?? 0) + 1);
    const known = new Set(forms.map((f) => f.id));
    const removed = Array.from(counts.keys()).filter((id) => !known.has(id));
    return [
      ...forms.map((f) => ({ id: f.id, label: formLabel(f), count: counts.get(f.id) ?? 0 })),
      ...removed.map((id) => ({ id, label: `Removed form · ${id}`, count: counts.get(id) ?? 0 })),
    ];
  }, [forms, guests]);

  if (options.length <= 1) return null;

  const pill = (active: boolean) =>
    `px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap shrink-0 border scale-on-click transition-all flex items-center gap-1.5 ${
      active ? 'bg-premium-gold/15 text-white border-premium-gold/40' : 'bg-premium-surfaceDark text-zinc-400 border-premium-borderDark hover:text-white'
    }`;
  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto pb-0.5 ${className}`} role="tablist" aria-label="Form">
      <button type="button" role="tab" aria-selected={value === null} onClick={() => onChange(null)} className={pill(value === null)}>
        All forms <span className="font-mono text-[10px] text-zinc-500">{guests.length}</span>
      </button>
      {options.map((o) => (
        <button key={o.id || 'first'} type="button" role="tab" aria-selected={value === o.id} onClick={() => onChange(o.id)} className={pill(value === o.id)}>
          {o.label} <span className="font-mono text-[10px] text-zinc-500">{o.count}</span>
        </button>
      ))}
    </div>
  );
}
