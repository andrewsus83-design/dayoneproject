'use client';

import React, { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import QRCode from 'qrcode';
import {
  AlarmClock, ArrowLeft, ArrowRight, Calendar, Check, Clock, Download, ExternalLink, FileText, Heart, Lock, Mail, MapPin, Move,
  Navigation, Pencil, Phone,
} from 'lucide-react';
import {
  fillVariables, findQuestion, formatEventDate, formatGuestNumber, formatEventTime, formatOpensAt, getQuestions, isQuestion, makePassToken, newId, useAssetUrl,
  type EventInfo, type FormFile, type FormImage, type FormItem, type FormQuestion, type FormResponse, type InvitationConfig, type WriteResult,
} from '@/lib/eventStore';
import { alpha, type ResolvedTheme } from '@/lib/eventTheme';
import { downloadBlob, downloadDataUrl } from '@/lib/image';

export type PreviewScreen = 'cover' | 'page' | 'review' | 'confirmed' | 'declined' | 'closed' | 'upcoming';

type Screen =
  | { kind: 'cover' }
  | { kind: 'page'; index: number }
  | { kind: 'review' }
  | { kind: 'done'; response: FormResponse }
  | { kind: 'closed' }
  | { kind: 'upcoming' };

interface Page {
  title: string;
  description: string;
  items: FormItem[];
}

interface Props {
  info: EventInfo;
  invitation: InvitationConfig;
  theme: ResolvedTheme;
  coverUrl: string;
  isWedding: boolean;
  logoRef?: string;
  logoSize?: 's' | 'm' | 'l';
  closedReason?: string | null;
  notOpenUntil?: string | null;
  embedded?: boolean;
  forcedScreen?: PreviewScreen;
  forcedItemId?: string | null;
  onSubmit?: (response: FormResponse) => WriteResult & { number?: number };
  /** Digits used to pad guest numbers (001 vs 0001). */
  numberPad?: number;
  onAdjustPhoto?: (patch: { photoX: number; photoY: number }) => void;
  backHref?: string;
}

const SAMPLE: FormResponse = {
  id: 'preview', submittedAt: '', answers: {}, name: 'Rafael Cruz', email: 'rafael@example.com', phone: '',
  attending: true, party: 2, token: 'D1-7K2PBEA9', number: 18,
};

function buildPages(items: FormItem[]): Page[] {
  const pages: Page[] = [{ title: '', description: '', items: [] }];
  for (const it of items) {
    if (it.kind === 'page_break') pages.push({ title: it.title, description: it.description, items: [] });
    else pages[pages.length - 1].items.push(it);
  }
  return pages;
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
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//dayoneproject.xyz//Event//EN', 'BEGIN:VEVENT',
    `UID:${token}@dayoneproject.xyz`, `DTSTAMP:${stamp}`,
    `DTSTART:${dt(info.startDate, info.startTime)}`,
    `DTEND:${dt(info.endDate || info.startDate, info.endTime || info.startTime)}`,
    `SUMMARY:${icsEscape(info.name)}`,
    `LOCATION:${icsEscape([info.venue, info.address].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${icsEscape(`Your pass code: ${token}`)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ];
  downloadBlob(`${info.slug || 'event'}.ics`, new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function ImageItem({ item, theme }: { item: FormImage; theme: ResolvedTheme }) {
  const url = useAssetUrl(item.url);
  return (
    <figure className="space-y-2">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={item.caption} className="w-full object-cover" style={{ borderRadius: Math.min(theme.radius, 20) }} />
      ) : (
        <div className="h-32 flex items-center justify-center text-xs" style={{ background: theme.surface, border: `1px dashed ${theme.border}`, borderRadius: 14, color: theme.subtle }}>Image</div>
      )}
      {item.caption && <figcaption className="text-xs text-center" style={{ color: theme.subtle }}>{item.caption}</figcaption>}
    </figure>
  );
}

function FileItem({ item, theme }: { item: FormFile; theme: ResolvedTheme }) {
  const url = useAssetUrl(item.url);
  return (
    <div className="flex items-center gap-3 p-3" style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: Math.min(theme.radius, 16) }}>
      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: alpha(theme.primary, 0.15) }}>
        <FileText className="w-5 h-5" style={{ color: theme.primaryText }} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold truncate">{item.label || item.name}</span>
        <span className="block text-[11px]" style={{ color: theme.subtle }}>{item.name} · {formatBytes(item.size)}</span>
      </span>
      {url && (
        <a href={url} download={item.name} className="px-3 py-2 text-xs font-bold flex items-center gap-1.5 scale-on-click" style={{ background: theme.primary, color: theme.onPrimary, borderRadius: theme.buttonRadius }}>
          <Download className="w-3.5 h-3.5" /> Download
        </a>
      )}
    </div>
  );
}

function LogoMark({ refId, size }: { refId?: string; size?: 's' | 'm' | 'l' }) {
  const url = useAssetUrl(refId);
  if (!url) return null;
  const h = size === 's' ? 28 : size === 'l' ? 52 : 38;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="Logo" style={{ height: h, width: 'auto', maxWidth: h * 4 }} className="object-contain" />;
}

export function InvitationFormView({
  info, invitation, theme, coverUrl, isWedding, logoRef, logoSize, closedReason, notOpenUntil, embedded, forcedScreen, forcedItemId,
  onSubmit, onAdjustPhoto, backHref, numberPad = 3,
}: Props) {
  const [screen, setScreen] = useState<Screen>(closedReason ? { kind: 'closed' } : notOpenUntil ? { kind: 'upcoming' } : { kind: 'cover' });
  const [nowTs, setNowTs] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const dragRef = useRef<{ x: number; y: number; px: number; py: number; w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const all = invitation.items;
  const questions = useMemo(() => getQuestions(all), [all]);
  const partyQ = findQuestion(questions, 'party');
  const attQ = findQuestion(questions, 'attending');
  const maxPerReply = parseInt(invitation.maxPerReply || '0', 10) || 0;
  const hideParty = !!attQ && answers[attQ.id] === 'No';

  const pages = useMemo(() => {
    return buildPages(all)
      .map((p) => ({ ...p, items: p.items.filter((it) => !(hideParty && it.id === partyQ?.id)) }))
      .filter((p) => p.items.length > 0);
  }, [all, hideParty, partyQ?.id]);
  const visibleQuestions = pages.flatMap((p) => p.items.filter(isQuestion));

  useEffect(() => {
    if (!forcedScreen) return;
    setErrors({});
    setFormError(null);
    if (forcedScreen === 'cover') setScreen({ kind: 'cover' });
    else if (forcedScreen === 'page') {
      const base = buildPages(all).filter((p) => p.items.length > 0);
      const idx = forcedItemId ? base.findIndex((p) => p.items.some((it) => it.id === forcedItemId)) : 0;
      setScreen(base.length ? { kind: 'page', index: Math.max(0, idx) } : { kind: 'cover' });
    } else if (forcedScreen === 'review') setScreen({ kind: 'review' });
    else if (forcedScreen === 'confirmed') setScreen({ kind: 'done', response: SAMPLE });
    else if (forcedScreen === 'declined') setScreen({ kind: 'done', response: { ...SAMPLE, attending: false, party: 0 } });
    else if (forcedScreen === 'upcoming') setScreen({ kind: 'upcoming' });
    else setScreen({ kind: 'closed' });
  }, [forcedScreen, forcedItemId, all]);

  useEffect(() => {
    if (!forcedScreen && closedReason) setScreen({ kind: 'closed' });
    else if (!forcedScreen && notOpenUntil) setScreen({ kind: 'upcoming' });
  }, [closedReason, notOpenUntil, forcedScreen]);

  const opensTarget = invitation.opensAt ? new Date(invitation.opensAt).getTime() : 0;
  useEffect(() => {
    if (screen.kind !== 'upcoming') return;
    const tick = () => {
      const now = Date.now();
      setNowTs(now);
      if (!forcedScreen && opensTarget && now >= opensTarget) setScreen({ kind: 'cover' });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [screen.kind, opensTarget, forcedScreen]);

  const doneToken = screen.kind === 'done' ? screen.response.token : '';
  useEffect(() => {
    if (!doneToken) return;
    QRCode.toDataURL(doneToken, { width: 360, margin: 1, color: { dark: '#09090B', light: '#FFFFFF' } }).then(setQrUrl).catch(() => setQrUrl(''));
  }, [doneToken]);

  const baseVars = { event: info.name, date: formatEventDate(info.startDate), time: formatEventTime(info.startTime), venue: info.venue, opens: formatOpensAt(invitation.opensAt) };
  const fill = (text: string, r?: FormResponse) =>
    fillVariables(text, { ...baseVars, name: r?.name.split(' ')[0], fullname: r?.name, party: r?.party, code: r?.token, number: r?.number ? formatGuestNumber(r.number, numberPad) : undefined });

  const sp = theme.space;
  const accentIsScript = theme.accentFamily !== theme.headingFamily;
  const headingStyle: CSSProperties = { fontFamily: theme.headingFamily, letterSpacing: theme.space.headingTracking };
  const primaryBtn: CSSProperties = { background: theme.primary, color: theme.onPrimary, borderRadius: theme.buttonRadius };
  const secondaryBtn: CSSProperties = { background: theme.surface, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: theme.buttonRadius };
  const inputCls =
    'w-full px-4 py-3.5 text-base outline-none transition-colors border bg-[var(--ev-surface)] text-[var(--ev-text)] border-[var(--ev-border)] focus:border-[var(--ev-primary)] placeholder:text-[var(--ev-subtle)]';
  const inviteLabelStyle: CSSProperties = accentIsScript
    ? { fontFamily: theme.accentFamily, color: theme.secondaryText, fontSize: 26, lineHeight: 1.1 }
    : { fontFamily: theme.accentFamily, color: theme.primaryText };

  const submit = (ans: Record<string, string>) => {
    const nameQ = findQuestion(questions, 'name');
    const emailQ = findQuestion(questions, 'email');
    const phoneQ = findQuestion(questions, 'phone');
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
    let saved = response;
    if (onSubmit) {
      const res = onSubmit(response);
      if (!res.ok) {
        setFormError(res.error ?? 'Your reply could not be saved. Please try again.');
        return;
      }
      if (res.number) saved = { ...response, number: res.number };
    }
    setFormError(null);
    setScreen({ kind: 'done', response: saved });
  };

  const pageErrors = (page: Page, ans: Record<string, string>) => {
    const out: Record<string, string> = {};
    for (const it of page.items) {
      if (!isQuestion(it)) continue;
      const err = validate(it, ans[it.id] ?? '', maxPerReply, it.id === partyQ?.id);
      if (err) out[it.id] = err;
    }
    return out;
  };

  const goNext = (index: number, ans: Record<string, string>, pageList: Page[] = pages) => {
    const page = pageList[index];
    if (!page) return;
    const errs = pageErrors(page, ans);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (index + 1 < pageList.length) setScreen({ kind: 'page', index: index + 1 });
    else if (invitation.askReview && visibleQuestions.length) setScreen({ kind: 'review' });
    else submit(ans);
  };

  const setAnswer = (q: FormQuestion, value: string) => {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
    if (errors[q.id]) setErrors((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
  };

  const choose = (q: FormQuestion, value: string, pageIndex: number) => {
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    setErrors((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
    const page = pages[pageIndex];
    const onlyQuestion = page && page.items.filter(isQuestion).length === 1;
    if (onlyQuestion) {
      // Pages are rebuilt when the attending answer changes, so recompute before advancing.
      const nextHideParty = !!attQ && next[attQ.id] === 'No';
      const rebuilt = buildPages(all)
        .map((p) => ({ ...p, items: p.items.filter((it) => !(nextHideParty && it.id === partyQ?.id)) }))
        .filter((p) => p.items.length > 0);
      window.setTimeout(() => goNext(pageIndex, next, rebuilt), 220);
    }
  };

  const start = () => {
    setFormError(null);
    if (pages.length === 0) submit({});
    else setScreen({ kind: 'page', index: 0 });
  };

  const onPhotoPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onAdjustPhoto) return;
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = { x: e.clientX, y: e.clientY, px: invitation.photoX, py: invitation.photoY, w: rect.width, h: rect.height };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onPhotoPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || !onAdjustPhoto) return;
    const dx = ((e.clientX - d.x) / d.w) * 100;
    const dy = ((e.clientY - d.y) / d.h) * 100;
    onAdjustPhoto({
      photoX: Math.round(Math.min(100, Math.max(0, d.px - dx))),
      photoY: Math.round(Math.min(100, Math.max(0, d.py - dy))),
    });
  };
  const endDrag = () => {
    dragRef.current = null;
    setDragging(false);
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

  const bottomBar = (children: React.ReactNode, sticky = true) => (
    <div className={`${sticky ? 'sticky bottom-0' : 'relative'} z-20 mt-auto`} style={{ padding: `${sp.gap}px ${sp.card}px ${sp.card}px`, background: `linear-gradient(to top, ${theme.bg} 72%, ${alpha(theme.bg, 0)})` }}>
      {formError && <p className="text-sm font-bold text-premium-danger mb-2">{formError}</p>}
      <div className="flex gap-3">{children}</div>
    </div>
  );

  const renderQuestion = (q: FormQuestion, pageIndex: number, autoFocus: boolean) => {
    const value = answers[q.id] ?? '';
    const isParty = q.id === partyQ?.id;
    const isAttending = q.id === attQ?.id;
    const choiceOptions = q.type === 'yes_no' ? ['Yes', 'No'] : q.options ?? [];
    const choiceLabel = (opt: string) => (q.type === 'yes_no' && isAttending ? (opt === 'Yes' ? "Yes, I'll be there" : "Sorry, I can't make it") : opt);
    const onEnter = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        goNext(pageIndex, answers);
      }
    };
    return (
      <div key={q.id} className="space-y-3">
        <div>
          <h2 className="text-xl font-bold leading-snug" style={headingStyle}>
            {q.label}
            {q.required && <span style={{ color: theme.primaryText }}> *</span>}
          </h2>
          {isParty && maxPerReply > 0 && <p className="text-xs mt-1" style={{ color: theme.subtle }}>Up to {maxPerReply} guests per reply.</p>}
        </div>
        {q.type === 'yes_no' || q.type === 'multiple' ? (
          <div className="space-y-2">
            {choiceOptions.map((opt, i) => {
              const selected = value === opt;
              return (
                <button
                  key={opt + i}
                  type="button"
                  onClick={() => choose(q, opt, pageIndex)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold scale-on-click transition-colors"
                  style={{
                    borderRadius: Math.min(theme.buttonRadius, 16),
                    border: `1.5px solid ${selected ? theme.primary : theme.border}`,
                    background: selected ? alpha(theme.primary, 0.14) : theme.surface,
                    color: theme.text,
                  }}
                >
                  <span className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-mono font-bold shrink-0" style={{ background: selected ? theme.primary : theme.card, color: selected ? theme.onPrimary : theme.muted, border: `1px solid ${theme.border}` }}>
                    {selected ? <Check className="w-3.5 h-3.5" /> : String.fromCharCode(65 + i)}
                  </span>
                  {choiceLabel(opt)}
                </button>
              );
            })}
          </div>
        ) : q.type === 'long_text' ? (
          <textarea rows={4} value={value} placeholder={q.placeholder || 'Type your answer…'} onChange={(e) => setAnswer(q, e.target.value)} onKeyDown={onEnter} autoFocus={autoFocus} className={`${inputCls} resize-none`} style={{ borderRadius: Math.min(theme.buttonRadius, 14) }} />
        ) : (
          <input
            type={q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : q.type === 'number' ? 'number' : 'text'}
            inputMode={q.type === 'number' ? 'numeric' : q.type === 'phone' ? 'tel' : undefined}
            min={q.type === 'number' ? (isParty ? 1 : 0) : undefined}
            max={isParty && maxPerReply > 0 ? maxPerReply : undefined}
            value={value}
            placeholder={q.placeholder || (q.type === 'email' ? 'you@example.com' : q.type === 'phone' ? '+62 812 3456 7890' : q.type === 'number' ? '1' : 'Type your answer…')}
            onChange={(e) => setAnswer(q, e.target.value)}
            onKeyDown={onEnter}
            autoFocus={autoFocus}
            className={inputCls}
            style={{ borderRadius: Math.min(theme.buttonRadius, 14) }}
          />
        )}
        {errors[q.id] && <p className="text-sm font-bold text-premium-danger">{errors[q.id]}</p>}
      </div>
    );
  };

  let body: React.ReactNode = null;

  if (screen.kind === 'cover' || screen.kind === 'upcoming') {
    const zoom = invitation.photoZoom || 1;
    const notYet = screen.kind === 'upcoming';
    const diff = Math.max(0, opensTarget - (nowTs || opensTarget));
    const parts = [
      { v: Math.floor(diff / 86400000), l: 'Days' },
      { v: Math.floor((diff % 86400000) / 3600000), l: 'Hours' },
      { v: Math.floor((diff % 3600000) / 60000), l: 'Min' },
      { v: Math.floor((diff % 60000) / 1000), l: 'Sec' },
    ];
    body = (
      <>
        {coverUrl ? (
          <div
            className={`relative overflow-hidden shrink-0 ${onAdjustPhoto ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            style={{ height: invitation.photoHeight || 240, touchAction: onAdjustPhoto ? 'none' : undefined }}
            onPointerDown={onPhotoPointerDown}
            onPointerMove={onPhotoPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt=""
              draggable={false}
              className="w-full h-full object-cover select-none"
              style={{ objectPosition: `${invitation.photoX}% ${invitation.photoY}%`, transform: `scale(${zoom})`, transformOrigin: `${invitation.photoX}% ${invitation.photoY}%` }}
            />
            <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(180deg, transparent 40%, ${theme.bg} 100%)` }} />
            {onAdjustPhoto && (
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-[11px] font-bold flex items-center gap-1 pointer-events-none">
                <Move className="w-3 h-3" /> Drag to reposition
              </span>
            )}
          </div>
        ) : (
          <div className="h-36 shrink-0" style={{ background: `linear-gradient(180deg, ${alpha(theme.primary, 0.35)} 0%, ${theme.bg} 100%)` }} />
        )}
        <div className="relative -mt-4 flex flex-col" style={{ padding: `0 ${sp.card}px`, gap: sp.stack }}>
          {logoRef && <LogoMark refId={logoRef} size={logoSize} />}
          {invitation.heading && (
            <p className={accentIsScript ? '' : 'text-[11px] uppercase tracking-[0.22em] font-bold'} style={inviteLabelStyle}>
              {fill(invitation.heading)}
            </p>
          )}
          <div>
            <h1 className="text-3xl font-bold leading-tight" style={headingStyle}>{info.name}</h1>
            {invitation.subtitle && <p className="text-sm mt-1.5" style={{ color: theme.muted }}>{fill(invitation.subtitle)}</p>}
          </div>
          <div className="space-y-2 text-sm font-medium">
            {info.startDate && <div className="flex items-center gap-2.5"><Calendar className="w-4 h-4 shrink-0" style={{ color: theme.primaryText }} />{formatEventDate(info.startDate)}</div>}
            {info.startTime && (
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 shrink-0" style={{ color: theme.primaryText }} />
                {formatEventTime(info.startTime)}{info.endTime ? ` – ${formatEventTime(info.endTime)}` : ''}
              </div>
            )}
            {info.venue && <div className="flex items-center gap-2.5"><MapPin className="w-4 h-4 shrink-0" style={{ color: theme.primaryText }} />{[info.venue, info.city].filter(Boolean).join(', ')}</div>}
          </div>
          {invitation.message && <p className="text-sm leading-relaxed" style={{ color: theme.muted }}>{fill(invitation.message)}</p>}
        </div>
        {bottomBar(
          notYet ? (
            <div className="w-full space-y-3">
              <div className="p-4 text-center space-y-3" style={{ ...theme.cardStyle, padding: sp.card * 0.8 }}>
                <div className="flex items-center justify-center gap-2">
                  <AlarmClock className="w-4 h-4" style={{ color: theme.primaryText }} />
                  <span className="text-sm font-bold" style={headingStyle}>{fill(invitation.upcoming.heading)}</span>
                </div>
                {invitation.upcoming.message && <p className="text-xs leading-relaxed" style={{ color: theme.muted }}>{fill(invitation.upcoming.message)}</p>}
                {opensTarget > 0 && (
                  <div className="flex justify-center gap-2">
                    {parts.map((p) => (
                      <div key={p.l} className="flex flex-col items-center gap-1">
                        <span className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold tabular-nums" style={{ background: theme.surface, border: `1px solid ${theme.border}`, color: theme.primaryText, fontFamily: theme.headingFamily }}>
                          {String(p.v).padStart(2, '0')}
                        </span>
                        <span className="text-[9px] uppercase tracking-widest" style={{ color: theme.subtle }}>{p.l}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" disabled className="w-full py-4 text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed opacity-60" style={{ ...primaryBtn, background: theme.surface, color: theme.muted, border: `1px solid ${theme.border}` }}>
                <Lock className="w-4 h-4" /> Opens {formatOpensAt(invitation.opensAt) || 'soon'}
              </button>
              {contactBlock}
            </div>
          ) : (
            <div className="w-full space-y-2">
              <button type="button" onClick={start} className="w-full py-4 text-base font-bold flex items-center justify-center gap-2 scale-on-click" style={primaryBtn}>
                {invitation.startLabel || 'Start'} <ArrowRight className="w-4 h-4" />
              </button>
              {invitation.startNote && <p className="text-center text-xs" style={{ color: theme.subtle }}>{invitation.startNote}</p>}
            </div>
          ),
          !notYet,
        )}
      </>
    );
  } else if (screen.kind === 'page') {
    const index = Math.min(screen.index, Math.max(0, pages.length - 1));
    const page = pages[index];
    if (page) {
      const firstQuestion = page.items.find(isQuestion);
      const choiceOnly = page.items.filter(isQuestion).length === 1 && firstQuestion && (firstQuestion.type === 'yes_no' || firstQuestion.type === 'multiple');
      const answeredChoice = choiceOnly && firstQuestion && answers[firstQuestion.id];
      body = (
        <>
          <div className="flex flex-col" style={{ padding: `${sp.card}px ${sp.card}px 0`, gap: sp.stack * 1.2 }}>
            <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: theme.border }}>
              <div className="h-full transition-all duration-300" style={{ width: `${((index + 1) / Math.max(pages.length, 1)) * 100}%`, background: theme.primary }} />
            </div>
            <p className="text-xs font-mono font-bold" style={{ color: theme.primaryText }}>Page {index + 1} / {pages.length}</p>
            {(page.title || page.description) && (
              <div>
                {page.title && <h2 className="text-2xl font-bold" style={headingStyle}>{page.title}</h2>}
                {page.description && <p className="text-sm mt-1" style={{ color: theme.muted }}>{page.description}</p>}
              </div>
            )}
            {page.items.map((it) =>
              isQuestion(it) ? renderQuestion(it, index, !embedded && it.id === firstQuestion?.id)
              : it.kind === 'image' ? <ImageItem key={it.id} item={it} theme={theme} />
              : it.kind === 'file' ? <FileItem key={it.id} item={it} theme={theme} />
              : null,
            )}
          </div>
          {bottomBar(
            <>
              <button type="button" onClick={() => { setErrors({}); setScreen(index > 0 ? { kind: 'page', index: index - 1 } : { kind: 'cover' }); }} className="px-5 py-3.5 scale-on-click" style={secondaryBtn} aria-label="Back">
                <ArrowLeft className="w-4 h-4" />
              </button>
              {choiceOnly && !answeredChoice && firstQuestion && !firstQuestion.required ? (
                <button type="button" onClick={() => goNext(index, answers)} className="flex-1 py-3.5 text-sm font-bold scale-on-click" style={secondaryBtn}>Skip</button>
              ) : (
                <button type="button" onClick={() => goNext(index, answers)} className="flex-1 py-3.5 text-sm font-bold flex items-center justify-center gap-2 scale-on-click" style={primaryBtn}>
                  {index === pages.length - 1 ? (invitation.askReview && visibleQuestions.length ? 'Review answers' : invitation.sendLabel || 'Send') : 'Next'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </>,
          )}
        </>
      );
    } else {
      body = <div className="px-6 py-16 text-center text-sm" style={{ color: theme.muted }}>No questions yet — add one in the builder.</div>;
    }
  } else if (screen.kind === 'review') {
    body = (
      <>
        <div className="flex flex-col" style={{ padding: `${sp.card}px ${sp.card}px 0`, gap: sp.stack }}>
          <div>
            <h2 className="text-2xl font-bold" style={headingStyle}>Check your answers</h2>
            <p className="text-sm mt-1" style={{ color: theme.muted }}>Tap any answer to change it.</p>
          </div>
          <div className="overflow-hidden" style={theme.cardStyle}>
            {visibleQuestions.map((q, i) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setScreen({ kind: 'page', index: Math.max(0, pages.findIndex((p) => p.items.some((it) => it.id === q.id))) })}
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
        </div>
        {bottomBar(
          <>
            <button type="button" onClick={() => setScreen({ kind: 'page', index: Math.max(0, pages.length - 1) })} className="px-5 py-3.5 scale-on-click" style={secondaryBtn} aria-label="Back">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const badPage = pages.findIndex((p) => Object.keys(pageErrors(p, answers)).length > 0);
                if (badPage >= 0) {
                  setErrors(pageErrors(pages[badPage], answers));
                  setScreen({ kind: 'page', index: badPage });
                  return;
                }
                submit(answers);
              }}
              className="flex-1 py-3.5 text-sm font-bold flex items-center justify-center gap-2 scale-on-click"
              style={primaryBtn}
            >
              {invitation.sendLabel || 'Send'} <Check className="w-4 h-4" />
            </button>
          </>,
        )}
      </>
    );
  } else if (screen.kind === 'done') {
    const r = screen.response;
    const copy = r.attending ? invitation.confirmed : invitation.declined;
    body = (
      <div className="flex flex-col" style={{ padding: sp.card, gap: sp.stack * 1.2 }}>
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
            <div className="px-5 py-4 flex items-start justify-between gap-3" style={{ background: theme.primary, color: theme.onPrimary }}>
              <div className="min-w-0">
                <div className={accentIsScript ? 'text-xl' : 'text-[10px] font-bold uppercase tracking-[0.2em] opacity-80'} style={{ fontFamily: theme.accentFamily }}>
                  {fill(invitation.ticketLabel || invitation.heading || "You're invited")}
                </div>
                <div className="text-lg font-bold leading-tight mt-0.5" style={headingStyle}>{info.name}</div>
                {invitation.subtitle && <div className="text-xs opacity-80 mt-0.5">{fill(invitation.subtitle)}</div>}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {logoRef && <LogoMark refId={logoRef} size="s" />}
                {invitation.guestNumbers && r.number && (
                  <div className="text-right">
                    <div className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-80">{invitation.numberLabel || 'Guest No.'}</div>
                    <div className="font-mono text-2xl font-bold leading-none tracking-wider mt-0.5">{formatGuestNumber(r.number, numberPad)}</div>
                  </div>
                )}
              </div>
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
          <a href={backHref} className="block text-center text-xs hover:underline" style={{ color: theme.subtle }}>← Back to event page</a>
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
          {logoRef ? <LogoMark refId={logoRef} size="s" /> : (
            <div className="w-8 h-8 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-sm shadow-gold">D1</div>
          )}
        </nav>
      )}
      <div className={`flex flex-col ${embedded ? 'min-h-full' : 'flex-1 w-full max-w-lg mx-auto'}`}>{body}</div>
      {!embedded && (screen.kind === 'done' || screen.kind === 'closed') && (
        <p className="text-center text-[11px] py-6" style={{ color: theme.subtle }}>{isWedding ? 'With love' : 'Powered by'} · dayoneproject.xyz</p>
      )}
    </div>
  );
}
