'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, Download, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { MOCK_REGISTRATIONS } from '@/lib/mockData';
import { formatGuestNumber, getQuestions, numberDigits, useEventConfig, useGuestList } from '@/lib/eventStore';
import { downloadBlob, toCsv } from '@/lib/image';

type Filter = 'all' | 'attending' | 'declined';

const cell = (v: string | number) => (typeof v === 'string' && /^[=+\-@]/.test(v) ? `'${v}` : v);

/** The sample events' made-up approval queue (they have no server). */
function SampleRegistrations({ eventId }: { eventId: string }) {
  const [registrations, setRegistrations] = useState(MOCK_REGISTRATIONS[eventId] ?? MOCK_REGISTRATIONS['evt-techunite-2026']);
  const setStatus = (id: string, status: 'approved' | 'rejected') =>
    setRegistrations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

  return (
    <div className="space-y-4">
      {registrations.map((reg) => (
        <div key={reg.id} className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h4 className="text-base font-display font-bold text-white">{reg.name}</h4>
              <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                reg.status === 'approved'
                  ? 'bg-premium-success/15 text-premium-success border border-premium-success/30'
                  : reg.status === 'rejected'
                  ? 'bg-premium-danger/15 text-premium-danger border border-premium-danger/30'
                  : 'bg-premium-gold/15 text-premium-gold border border-premium-gold/30'
              }`}>
                {reg.status}
              </span>
            </div>
            <div className="text-xs text-zinc-400 font-mono">{reg.email} • {reg.phone} • Submitted {reg.submittedAt}</div>
            <div className="text-xs text-zinc-300 pt-1">
              {Object.entries(reg.answers).map(([k, v], i) => (
                <span key={k}>{i > 0 && ' • '}{k}: <strong>{v}</strong></span>
              ))}
            </div>
          </div>
          {reg.status === 'pending' && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setStatus(reg.id, 'rejected')} className="px-4 py-2 rounded-xl bg-transparent border border-premium-borderDark text-zinc-400 hover:text-white text-xs font-bold scale-on-click">
                Decline
              </button>
              <button type="button" onClick={() => setStatus(reg.id, 'approved')} className="px-5 py-2 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black text-xs font-display font-bold shadow-gold scale-on-click">
                Approve & Issue Pass
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Registrations tab: every reply to the invitation form, with the form's answers. */
export function RegistrationsTab({ eventId }: { eventId: string }) {
  const { config } = useEventConfig(eventId);
  const list = useGuestList(eventId, 30_000);
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);
  const questions = useMemo(() => getQuestions(config.invitation.items), [config.invitation.items]);
  const digits = numberDigits(list.guests, list.capacity ?? config.info.capacity);

  const replies = useMemo(
    () => list.guests
      .filter((g) => g.rsvp_status !== 'pending')
      .sort((a, b) => (b.responded_at ?? '').localeCompare(a.responded_at ?? '')),
    [list.guests],
  );
  const shown = filter === 'all' ? replies : replies.filter((g) => g.rsvp_status === filter);
  const attendingPeople = replies.filter((g) => g.rsvp_status === 'attending').reduce((s, g) => s + (g.party_size || 1), 0);
  const declined = replies.filter((g) => g.rsvp_status === 'declined').length;

  // Answers to questions that are no longer on the form still show, under their id.
  const labelFor = (id: string) => questions.find((q) => q.id === id)?.label ?? id;

  const exportCsv = () => {
    const ids = Array.from(new Set([...questions.map((q) => q.id), ...replies.flatMap((g) => Object.keys(g.custom_fields))]));
    const rows = [
      ['Submitted', 'Guest No.', 'Name', 'Attending', 'Party', 'Email', 'Phone', ...ids.map(labelFor)],
      ...replies.map((g) => [
        g.responded_at ? new Date(g.responded_at).toLocaleString() : '',
        formatGuestNumber(g.guest_number, digits),
        g.name,
        g.rsvp_status === 'attending' ? 'Yes' : 'No',
        g.rsvp_status === 'attending' ? g.party_size || 1 : 0,
        g.email ?? '',
        g.phone ?? '',
        ...ids.map((id) => String(g.custom_fields[id] ?? '')),
      ].map(cell)),
    ];
    downloadBlob(`${config.info.slug}-registrations.csv`, new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl font-display font-bold text-white">Public RSVP Registrations</h3>
          <p className="text-xs text-zinc-400">
            {list.isSample
              ? 'Review inbound registrations, approve seats, and trigger automatic QR tickets.'
              : 'Every reply to the invitation form. Each guest gets a QR pass right away and joins the guest list.'}
          </p>
        </div>
        {!list.isSample && (
          <div className="flex items-center gap-2">
            <a
              href={`/events/${config.info.slug}/invitation`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-xs font-bold text-white hover:border-premium-gold scale-on-click flex items-center gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open form
            </a>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!replies.length}
              className="px-4 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-xs shadow-gold scale-on-click flex items-center gap-2 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        )}
      </div>

      {list.isSample ? (
        <SampleRegistrations eventId={eventId} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Replies', value: replies.length, color: 'text-white' },
              { label: 'People coming', value: attendingPeople, color: 'text-premium-success' },
              { label: 'Declined', value: declined, color: 'text-premium-danger' },
            ].map((s) => (
              <div key={s.label} className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark text-center">
                <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-zinc-500 mt-1 font-mono uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {(['all', 'attending', 'declined'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize scale-on-click transition-all ${
                  filter === f ? 'bg-premium-gold/15 text-white border border-premium-gold/40' : 'bg-premium-surfaceDark text-zinc-400 border border-premium-borderDark hover:text-white'
                }`}
              >
                {f === 'all' ? 'All' : f === 'attending' ? 'Coming' : 'Not coming'}
              </button>
            ))}
          </div>

          {list.status === 'error' ? (
            <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-danger/40 text-sm text-premium-danger flex items-center justify-between gap-3">
              <span>{list.error}</span>
              <button type="button" onClick={() => void list.refresh()} className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white text-xs font-bold scale-on-click">
                <RefreshCw className="w-3.5 h-3.5" /> Try again
              </button>
            </div>
          ) : list.status !== 'ready' && !replies.length ? (
            <div className="p-10 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark text-sm text-zinc-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-premium-gold" /> Loading replies…
            </div>
          ) : shown.length === 0 ? (
            <div className="p-10 rounded-[2rem] border-2 border-dashed border-premium-borderDark text-center space-y-2">
              <div className="text-sm font-bold text-white">{replies.length ? 'No replies in this view' : 'No replies yet'}</div>
              <p className="text-xs text-zinc-500">Share the invitation form; replies land here as soon as guests send it.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shown.map((g) => {
                const answers = Object.entries(g.custom_fields).filter(([, v]) => String(v ?? '').trim());
                const expanded = open === g.id;
                return (
                  <div key={g.id} className="rounded-[2rem] bg-premium-charcoal border border-premium-borderDark shadow-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpen(expanded ? null : g.id)}
                      className="w-full p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left scale-on-click"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-premium-gold font-bold text-sm">{formatGuestNumber(g.guest_number, digits)}</span>
                          <h4 className="text-base font-display font-bold text-white truncate">{g.name}</h4>
                          <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                            g.rsvp_status === 'attending'
                              ? 'bg-premium-success/15 text-premium-success border-premium-success/30'
                              : 'bg-premium-danger/15 text-premium-danger border-premium-danger/30'
                          }`}>
                            {g.rsvp_status === 'attending' ? `Coming · ${g.party_size || 1}` : 'Not coming'}
                          </span>
                          {g.is_checked_in && (
                            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase border bg-premium-success/10 text-premium-success border-premium-success/30">Checked in</span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400 font-mono truncate">
                          {[g.email, g.phone].filter(Boolean).join(' • ') || 'No contact given'}
                          {g.responded_at && ` • ${new Date(g.responded_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`}
                        </div>
                        {g.rsvp_notes && <div className="text-xs text-zinc-300 pt-1">“{g.rsvp_notes}”</div>}
                      </div>
                      {answers.length > 0 && (
                        <span className="text-[11px] text-zinc-500 font-bold flex items-center gap-1 shrink-0">
                          {answers.length} answer{answers.length === 1 ? '' : 's'}
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        </span>
                      )}
                    </button>
                    {expanded && answers.length > 0 && (
                      <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {answers.map(([id, value]) => (
                          <div key={id} className="p-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark">
                            <div className="text-[10px] text-zinc-500 font-bold">{labelFor(id)}</div>
                            <div className="text-xs text-white mt-0.5 break-words">{String(value)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
