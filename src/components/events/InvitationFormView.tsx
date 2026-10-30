'use client';

import React, { useEffect, useMemo, useState, type CSSProperties } from 'react';
import QRCode from 'qrcode';
import {
  ArrowLeft, ArrowRight, Calendar, Check, Clock, Download, ExternalLink, Heart, Lock, Mail, MapPin, Navigation,
  Pencil, Phone,
} from 'lucide-react';
import {
  fillVariables, findQuestion, formatEventDate, formatEventTime, makePassToken, newId,
  type EventInfo, type FormQuestion, type FormResponse, type InvitationConfig, type WriteResult,
} from '@/lib/eventStore';
import { alpha, type ResolvedTheme } from '@/lib/eventTheme';
import { downloadBlob, downloadDataUrl } from '@/lib/image';

export type PreviewScreen = 'cover' | 'question' | 'review' | 'confirmed' | 'declined' | 'closed';

type Screen =
  | { kind: 'cover' }
  | { kind: 'question'; id: string }
  | { kind: 'review' }
  | { kind: 'done'; response: FormResponse }
  | { kind: 'closed' };

interface Props {
  info: EventInfo;
  invitation: InvitationConfig;
  theme: ResolvedTheme;
  coverUrl: string;
  isWedding: boolean;
  closedReason?: string | null;
  embedded?: boolean;
  forcedScreen?: PreviewScreen;
  forcedQuestionIndex?: number;
  onSubmit?: (response: FormResponse) => WriteResult;
  backHref?: string;
}

const SAMPLE: FormResponse = {
  id: 'preview',
  submittedAt: '',
  answers: {},
  name: 'Rafael Cruz',
  email: 'rafael@example.com',
  phone: '',
  attending: true,
  party: 2,
  token: 'ALL41-7K2PBEA9',
};

function visibleQuestions(questions: FormQuestion[], answers: Record<string, string>) {
  const att = findQuestion(questions, 'attending');
  if (!att || answers[att.id] !== 'No') return questions;
  const party = findQuestion(questions, 'party');
  return questions.filter((q) => q.id !== party?.id);
}

function validate(q: FormQuestion, value: string, maxPerReply: number, isParty: boolean): string | null {
  const v = value.trim();
  if (!v) return q.required ? 'This one is required.' : null;
  if (q.type === 'email' && !/^\S+@\S+\.\S+$/.test(v)) return 'Please enter a valid email address.';
  if (q.type === 'phone' && v.replace(/\D/g, '').length < 7) return 'Please enter a valid phone number.';
  if (q.type === 'number') {
    const n = Number(v);
    if (!Number.isInteger(n) || n < (isParty ? 1 : 0)) return isParty ? 'Please enter at least 1.' : 'Please enter a whole number.';
    if (isParty && maxPerReply > 0 && n > maxPerReply) return `Up to ${maxPerReply} guests per reply.`;
  }
  return null;
}

function directionsUrl(info: EventInfo) {
  return info.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${info.venue} ${info.address}`.trim())}`;
}

function icsEscape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function downloadIcs(info: EventInfo, token: string) {
  const dt = (d: string, t: string) => `${d.replaceAll('-', '')}T${(t || '00:00').replace(':', '')}00`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//all41//Event//EN',
    'BEGIN:VEVENT',
    `UID:${token}@all41.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dt(info.startDate, info.startTime)}`,
    `DTEND:${dt(info.endDate || info.startDate, info.endTime || info.startTime)}`,
    `SUMMARY:${icsEscape(info.name)}`,
    `LOCATION:${icsEscape([info.venue, info.address].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${icsEscape(`Your pass code: ${token}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  downloadBlob(`${info.slug || 'event'}.ics`, new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
}

export function InvitationFormView({
  info, invitation, theme, coverUrl, isWedding, closedReason, embedded, forcedScreen, forcedQuestionIndex, onSubmit, backHref,
}: Props) {
  const [screen, setScreen] = useState<Screen>(closedReason ? { kind: 'closed' } : { kind: 'cover' });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState('');

  const all = invitation.questions;
  const questions = useMemo(() => visibleQuestions(all, answers), [all, answers]);
  const partyQ = findQuestion(all, 'party');
  const maxPerReply = parseInt(invitation.maxPerReply || '0', 10) || 0;

  useEffect(() => {
    if (!forcedScreen) return;
    setError(null);
    if (forcedScreen === 'cover') setScreen({ kind: 'cover' });
    else if (forcedScreen === 'question') {
      const q = all[Math.min(forcedQuestionIndex ?? 0, all.length - 1)];
      setScreen(q ? { kind: 'question', id: q.id } : { kind: 'cover' });
    } else if (forcedScreen === 'review') setScreen({ kind: 'review' });
    else if (forcedScreen === 'confirmed') setScreen({ kind: 'done', response: SAMPLE });
    else if (forcedScreen === 'declined') setScreen({ kind: 'done', response: { ...SAMPLE, attending: false, party: 0 } });
    else setScreen({ kind: 'closed' });
  }, [forcedScreen, forcedQuestionIndex, all]);

  useEffect(() => {
    if (!forcedScreen && closedReason) setScreen({ kind: 'closed' });
  }, [closedReason, forcedScreen]);

  const doneToken = screen.kind === 'done' ? screen.response.token : '';
  useEffect(() => {
    if (!doneToken) return;
    QRCode.toDataURL(doneToken, { width: 360, margin: 1, color: { dark: '#09090B', light: '#FFFFFF' } }).then(setQrUrl).catch(() => setQrUrl(''));
  }, [doneToken]);

  const baseVars = {
    event: info.name,
    date: formatEventDate(info.startDate),
    time: formatEventTime(info.startTime),
    venue: info.venue,
  };
  const fill = (text: string, r?: FormResponse) =>
    fillVariables(text, {
      ...baseVars,
      name: r?.name.split(' ')[0],
      fullname: r?.name,
      party: r?.party,
      code: r?.token,
    });

  const headingStyle: CSSProperties = { fontFamily: theme.headingFamily, letterSpacing: '-0.02em' };
  const primaryBtn: CSSProperties = { background: theme.primary, color: theme.onPrimary, borderRadius: theme.buttonRadius };
  const secondaryBtn: CSSProperties = {
    background: theme.surface,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.buttonRadius,
  };
  const inputCls =
    'w-full px-4 py-3.5 text-base outline-none transition-colors border bg-[var(--ev-surface)] text-[var(--ev-text)] border-[var(--ev-border)] focus:border-[var(--ev-primary)] placeholder:text-[var(--ev-subtle)]';

  const submit = (ans: Record<string, string>) => {
    const nameQ = findQuestion(all, 'name');
    const attQ = findQuestion(all, 'attending');
    const emailQ = findQuestion(all, 'email');
    const phoneQ = findQuestion(all, 'phone');
    const attending = attQ ? ans[attQ.id] !== 'No' : true;
    const partyRaw = partyQ ? parseInt(ans[partyQ.id] || '1', 10) : 1;
    const response: FormResponse = {
      id: newId('rsp'),
      submittedAt: new Date().toISOString(),
      answers: { ...ans },
      name: ((nameQ && ans[nameQ.id]) || 'Guest').trim(),
      email: emailQ ? (ans[emailQ.id] ?? '').trim() : '',
      phone: phoneQ ? (ans[phoneQ.id] ?? '').trim() : '',
      attending,
      party: attending ? Math.max(1, partyRaw || 1) : 0,
      token: makePassToken(),
    };
    if (onSubmit) {
      const res = onSubmit(response);
      if (!res.ok) {
        setError(res.error ?? 'Your reply could not be saved. Please try again.');
        return;
      }
    }
    setError(null);
    setScreen({ kind: 'done', response });
  };

  const advanceFrom = (id: string, ans: Record<string, string>) => {
    const qs = visibleQuestions(all, ans);
    const idx = qs.findIndex((q) => q.id === id);
    const next = qs[idx + 1];
    setError(null);
    if (next) setScreen({ kind: 'question', id: next.id });
    else if (invitation.askReview) setScreen({ kind: 'review' });
    else submit(ans);
  };

  const goNext = (q: FormQuestion) => {
    const err = validate(q, answers[q.id] ?? '', maxPerReply, q.id === partyQ?.id);
    if (err) {
      setError(err);
      return;
    }
    advanceFrom(q.id, answers);
  };

  const goBack = (id: string) => {
    const idx = questions.findIndex((q) => q.id === id);
    setError(null);
    setScreen(idx > 0 ? { kind: 'question', id: questions[idx - 1].id } : { kind: 'cover' });
  };

  const choose = (q: FormQuestion, value: string) => {
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    setError(null);
    window.setTimeout(() => advanceFrom(q.id, next), 220);
  };

  const start = () => {
    setError(null);
    if (all.length === 0) submit({});
    else setScreen({ kind: 'question', id: questions[0].id });
  };

  const contactBlock = invitation.showContact && (invitation.contactPhone || invitation.contactEmail) && (
    <div className="space-y-2">
      <p className="text-xs" style={{ color: theme.subtle }}>Questions? Contact the host</p>
      <div className="flex flex-wrap gap-2">
        {invitation.contactPhone && (
          <a href={`tel:${invitation.contactPhone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold scale-on-click" style={secondaryBtn}>
            <Phone className="w-3.5 h-3.5" /> {invitation.contactPhone}
          </a>
        )}
        {invitation.contactEmail && (
          <a href={`mailto:${invitation.contactEmail}`} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold scale-on-click" style={secondaryBtn}>
            <Mail className="w-3.5 h-3.5" /> {invitation.contactEmail}
          </a>
        )}
      </div>
    </div>
  );

  const extraButton = invitation.extraLabel && invitation.extraUrl && (
    <a
      href={invitation.extraUrl.startsWith('http') ? invitation.extraUrl : `https://${invitation.extraUrl}`}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full inline-flex items-center justify-center gap-2 py-3.5 text-sm font-bold scale-on-click"
      style={secondaryBtn}
    >
      {invitation.extraLabel} <ExternalLink className="w-3.5 h-3.5" />
    </a>
  );

  /* ── Screens ── */

  let body: React.ReactNode = null;

  if (screen.kind === 'cover') {
    body = (
      <div className="pb-10">
        {coverUrl ? (
          <div className="relative h-60 sm:h-72">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 35%, ${theme.bg} 100%)` }} />
          </div>
        ) : (
          <div className="h-36" style={{ background: `linear-gradient(180deg, ${alpha(theme.primary, 0.35)} 0%, ${theme.bg} 100%)` }} />
        )}
        <div className="px-6 -mt-4 relative space-y-5">
          {invitation.heading && (
            <p className="text-[11px] uppercase tracking-[0.22em] font-bold" style={{ color: theme.primaryText }}>
              {fill(invitation.heading)}
            </p>
          )}
          <div>
            <h1 className="text-3xl font-bold leading-tight" style={headingStyle}>{info.name}</h1>
            {invitation.subtitle && <p className="text-sm mt-1.5" style={{ color: theme.muted }}>{fill(invitation.subtitle)}</p>}
          </div>
          <div className="space-y-2 text-sm font-medium">
            {info.startDate && (
              <div className="flex items-center gap-2.5"><Calendar className="w-4 h-4 shrink-0" style={{ color: theme.primaryText }} />{formatEventDate(info.startDate)}</div>
            )}
            {info.startTime && (
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 shrink-0" style={{ color: theme.primaryText }} />
                {formatEventTime(info.startTime)}{info.endTime ? ` – ${formatEventTime(info.endTime)}` : ''}
              </div>
            )}
            {info.venue && (
              <div className="flex items-center gap-2.5"><MapPin className="w-4 h-4 shrink-0" style={{ color: theme.primaryText }} />{[info.venue, info.city].filter(Boolean).join(', ')}</div>
            )}
          </div>
          {invitation.message && <p className="text-sm leading-relaxed" style={{ color: theme.muted }}>{fill(invitation.message)}</p>}
          {error && <p className="text-sm font-bold text-premium-danger">{error}</p>}
          <button type="button" onClick={start} className="w-full py-4 text-base font-bold flex items-center justify-center gap-2 scale-on-click" style={primaryBtn}>
            {invitation.startLabel || 'Start'} <ArrowRight className="w-4 h-4" />
          </button>
          {invitation.startNote && <p className="text-center text-xs" style={{ color: theme.subtle }}>{invitation.startNote}</p>}
        </div>
      </div>
    );
  } else if (screen.kind === 'question') {
    const q = questions.find((x) => x.id === screen.id) ?? all.find((x) => x.id === screen.id);
    if (q) {
      const idx = Math.max(0, questions.findIndex((x) => x.id === q.id));
      const value = answers[q.id] ?? '';
      const isParty = q.id === partyQ?.id;
      const setValue = (v: string) => {
        setAnswers((prev) => ({ ...prev, [q.id]: v }));
        if (error) setError(null);
      };
      const onEnter = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement && !e.metaKey && !e.ctrlKey)) {
          e.preventDefault();
          goNext(q);
        }
      };
      const isAttending = q.id === findQuestion(all, 'attending')?.id;
      const choiceOptions = q.type === 'yes_no' ? ['Yes', 'No'] : q.options ?? [];
      const choiceLabel = (opt: string) =>
        q.type === 'yes_no' && isAttending ? (opt === 'Yes' ? "Yes, I'll be there" : "Sorry, I can't make it") : opt;

      body = (
        <div className="px-6 py-8 space-y-6">
          <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: theme.border }}>
            <div className="h-full transition-all duration-300" style={{ width: `${((idx + 1) / Math.max(questions.length, 1)) * 100}%`, background: theme.primary }} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-mono font-bold" style={{ color: theme.primaryText }}>
              {idx + 1} / {questions.length}
            </p>
            <h2 className="text-2xl font-bold leading-snug" style={headingStyle}>
              {q.label}
              {q.required && <span style={{ color: theme.primaryText }}> *</span>}
            </h2>
            {isParty && maxPerReply > 0 && <p className="text-xs" style={{ color: theme.subtle }}>Up to {maxPerReply} guests per reply.</p>}
          </div>

          {(q.type === 'yes_no' || q.type === 'multiple') ? (
            <div className="space-y-2.5">
              {choiceOptions.map((opt, i) => {
                const selected = value === opt;
                return (
                  <button
                    key={opt + i}
                    type="button"
                    onClick={() => choose(q, opt)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold scale-on-click transition-colors"
                    style={{
                      borderRadius: Math.min(theme.buttonRadius, 16),
                      border: `1.5px solid ${selected ? theme.primary : theme.border}`,
                      background: selected ? alpha(theme.primary, 0.14) : theme.surface,
                      color: theme.text,
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-mono font-bold shrink-0"
                      style={{ background: selected ? theme.primary : theme.card, color: selected ? theme.onPrimary : theme.muted, border: `1px solid ${theme.border}` }}
                    >
                      {selected ? <Check className="w-3.5 h-3.5" /> : String.fromCharCode(65 + i)}
                    </span>
                    {choiceLabel(opt)}
                  </button>
                );
              })}
            </div>
          ) : q.type === 'long_text' ? (
            <textarea
              rows={4}
              value={value}
              placeholder={q.placeholder || 'Type your answer…'}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onEnter}
              autoFocus={!embedded}
              className={`${inputCls} resize-none`}
              style={{ borderRadius: Math.min(theme.buttonRadius, 14) }}
            />
          ) : (
            <input
              type={q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : q.type === 'number' ? 'number' : 'text'}
              inputMode={q.type === 'number' ? 'numeric' : q.type === 'phone' ? 'tel' : undefined}
              min={q.type === 'number' ? (isParty ? 1 : 0) : undefined}
              max={isParty && maxPerReply > 0 ? maxPerReply : undefined}
              value={value}
              placeholder={
                q.placeholder ||
                (q.type === 'email' ? 'you@example.com' : q.type === 'phone' ? '+62 812 3456 7890' : q.type === 'number' ? '1' : 'Type your answer…')
              }
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onEnter}
              autoFocus={!embedded}
              className={inputCls}
              style={{ borderRadius: Math.min(theme.buttonRadius, 14) }}
            />
          )}

          {error && <p className="text-sm font-bold text-premium-danger">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => goBack(q.id)} className="px-5 py-3.5 scale-on-click" style={secondaryBtn} aria-label="Back">
              <ArrowLeft className="w-4 h-4" />
            </button>
            {!(q.type === 'yes_no' || q.type === 'multiple') || value ? (
              <button type="button" onClick={() => goNext(q)} className="flex-1 py-3.5 text-sm font-bold flex items-center justify-center gap-2 scale-on-click" style={primaryBtn}>
                {idx === questions.length - 1 ? (invitation.askReview ? 'Review answers' : invitation.sendLabel || 'Send') : 'OK'}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              !q.required && (
                <button type="button" onClick={() => advanceFrom(q.id, answers)} className="flex-1 py-3.5 text-sm font-bold scale-on-click" style={secondaryBtn}>
                  Skip
                </button>
              )
            )}
          </div>
          {q.type !== 'yes_no' && q.type !== 'multiple' && !embedded && (
            <p className="text-[11px]" style={{ color: theme.subtle }}>
              Press <strong>Enter ↵</strong>{q.type === 'long_text' ? ' with Ctrl/⌘' : ''} to continue
            </p>
          )}
        </div>
      );
    } else {
      body = (
        <div className="px-6 py-16 text-center text-sm" style={{ color: theme.muted }}>
          No questions yet — add one in the builder.
        </div>
      );
    }
  } else if (screen.kind === 'review') {
    body = (
      <div className="px-6 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold" style={headingStyle}>Check your answers</h2>
          <p className="text-sm mt-1" style={{ color: theme.muted }}>Tap any answer to change it.</p>
        </div>
        <div className="overflow-hidden" style={theme.cardStyle}>
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setScreen({ kind: 'question', id: q.id })}
              className="w-full text-left px-5 py-3.5 flex items-start justify-between gap-3 scale-on-click"
              style={{ borderTop: i === 0 ? 'none' : `1px solid ${theme.border}` }}
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wide" style={{ color: theme.subtle }}>{q.label}</span>
                <span className="block text-sm font-semibold mt-0.5 break-words">{answers[q.id]?.trim() || '—'}</span>
              </span>
              <Pencil className="w-3.5 h-3.5 shrink-0 mt-1" style={{ color: theme.subtle }} />
            </button>
          ))}
        </div>
        {error && <p className="text-sm font-bold text-premium-danger">{error}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => questions.length && setScreen({ kind: 'question', id: questions[questions.length - 1].id })}
            className="px-5 py-3.5 scale-on-click"
            style={secondaryBtn}
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const missing = questions.find((q) => validate(q, answers[q.id] ?? '', maxPerReply, q.id === partyQ?.id));
              if (missing) {
                setScreen({ kind: 'question', id: missing.id });
                setError(validate(missing, answers[missing.id] ?? '', maxPerReply, missing.id === partyQ?.id));
                return;
              }
              submit(answers);
            }}
            className="flex-1 py-3.5 text-sm font-bold flex items-center justify-center gap-2 scale-on-click"
            style={primaryBtn}
          >
            {invitation.sendLabel || 'Send'} <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  } else if (screen.kind === 'done') {
    const r = screen.response;
    const copy = r.attending ? invitation.confirmed : invitation.declined;
    body = (
      <div className="px-6 py-8 space-y-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: r.attending ? theme.primary : theme.surface, border: `1px solid ${theme.border}` }}>
            {r.attending ? <Check className="w-7 h-7" style={{ color: theme.onPrimary }} /> : <Heart className="w-6 h-6" style={{ color: theme.primaryText }} />}
          </div>
          <div>
            <h2 className="text-2xl font-bold" style={headingStyle}>{fill(copy.heading, r)}</h2>
            {copy.message && <p className="text-sm mt-2 leading-relaxed" style={{ color: theme.muted }}>{fill(copy.message, r)}</p>}
          </div>
        </div>

        {r.attending && invitation.showTicket && (
          <div className="overflow-hidden" style={{ ...theme.cardStyle, padding: 0 }}>
            <div className="px-5 py-4" style={{ background: theme.primary, color: theme.onPrimary }}>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">{fill(invitation.heading || "You're invited")}</div>
              <div className="text-lg font-bold leading-tight mt-0.5" style={headingStyle}>{info.name}</div>
              {invitation.subtitle && <div className="text-xs opacity-80 mt-0.5">{fill(invitation.subtitle)}</div>}
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 text-sm">
              {[
                { k: 'Guest', v: r.name },
                { k: 'Party', v: String(r.party) },
                { k: 'Date', v: formatEventDate(info.startDate, 'short') },
                { k: 'Time', v: formatEventTime(info.startTime) },
              ].map((x) => (
                <div key={x.k}>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.subtle }}>{x.k}</div>
                  <div className="font-semibold truncate">{x.v}</div>
                </div>
              ))}
              <div className="col-span-2">
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.subtle }}>Venue</div>
                <div className="font-semibold">{[info.venue, info.city].filter(Boolean).join(', ')}</div>
              </div>
            </div>
            <div className="px-5 pb-5 pt-4 flex flex-col items-center gap-2" style={{ borderTop: `1px dashed ${theme.border}` }}>
              <div className="w-40 h-40 bg-white rounded-2xl p-2 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {qrUrl ? <img src={qrUrl} alt={`QR pass ${r.token}`} className="w-full h-full" /> : <div className="w-full h-full animate-pulse bg-zinc-200 rounded-xl" />}
              </div>
              <div className="font-mono text-sm font-bold tracking-widest">{r.token}</div>
              {copy.smallPrint && <p className="text-[11px] text-center" style={{ color: theme.subtle }}>{fill(copy.smallPrint, r)}</p>}
              {qrUrl && (
                <button type="button" onClick={() => downloadDataUrl(`${r.token}.png`, qrUrl)} className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold scale-on-click" style={secondaryBtn}>
                  <Download className="w-3.5 h-3.5" /> Save QR pass
                </button>
              )}
            </div>
          </div>
        )}

        {r.attending && (invitation.showCalendar || invitation.showDirections) && (
          <div className="grid grid-cols-2 gap-3">
            {invitation.showCalendar && (
              <button type="button" onClick={() => downloadIcs(info, r.token)} className="py-3.5 text-sm font-bold flex items-center justify-center gap-2 scale-on-click" style={secondaryBtn}>
                <Calendar className="w-4 h-4" /> Add to calendar
              </button>
            )}
            {invitation.showDirections && (
              <a href={directionsUrl(info)} target="_blank" rel="noopener noreferrer" className="py-3.5 text-sm font-bold flex items-center justify-center gap-2 scale-on-click" style={secondaryBtn}>
                <Navigation className="w-4 h-4" /> Directions
              </a>
            )}
          </div>
        )}
        {extraButton}
        {contactBlock}
        {backHref && !embedded && (
          <a href={backHref} className="block text-center text-xs underline-offset-4 hover:underline" style={{ color: theme.subtle }}>
            ← Back to event page
          </a>
        )}
      </div>
    );
  } else {
    body = (
      <div className="px-6 py-16 space-y-5 text-center">
        <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <Lock className="w-6 h-6" style={{ color: theme.primaryText }} />
        </div>
        <h2 className="text-2xl font-bold" style={headingStyle}>{fill(invitation.closed.heading)}</h2>
        <p className="text-sm leading-relaxed" style={{ color: theme.muted }}>{fill(invitation.closed.message)}</p>
        {closedReason && <p className="text-xs" style={{ color: theme.subtle }}>{closedReason}</p>}
        <div className="text-left">{contactBlock}</div>
      </div>
    );
  }

  return (
    <div
      className={embedded ? 'h-full overflow-y-auto' : 'min-h-screen flex flex-col'}
      style={{ ...theme.vars, background: theme.bg, color: theme.text, fontFamily: theme.bodyFamily }}
    >
      {!embedded && (
        <nav className="flex items-center justify-between px-6 py-4 max-w-lg w-full mx-auto">
          {backHref ? (
            <a href={backHref} className="flex items-center gap-2 text-sm font-medium" style={{ color: theme.muted }}>
              <ArrowLeft className="w-4 h-4" /> Event page
            </a>
          ) : <span />}
          <div className="w-8 h-8 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-sm shadow-gold">41</div>
        </nav>
      )}
      <div className={embedded ? '' : 'flex-1 w-full max-w-lg mx-auto'}>{body}</div>
      {!embedded && (
        <p className="text-center text-[11px] py-6" style={{ color: theme.subtle }}>
          {isWedding ? 'With love' : 'Powered by'} · all41.app
        </p>
      )}
    </div>
  );
}
