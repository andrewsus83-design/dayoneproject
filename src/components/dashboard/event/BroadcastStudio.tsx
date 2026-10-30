'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Check, Copy, Download, ExternalLink, Image as ImageIcon, Info, Mail, MessageSquare, RotateCcw, Search, Star, Trash2, Upload, X,
} from 'lucide-react';
import {
  deleteAsset, deleteFeedback, formatGuestNumber, numberDigits, saveAsset, useAssetUrl, useEventConfig, useFeedback, useGuests,
  type BroadcastKind, type BroadcastTemplate, type FeedbackConfig,
} from '@/lib/eventStore';
import { BROADCAST_KINDS, BROADCAST_VARIABLES, defaultBroadcastTemplates } from '@/lib/broadcastTemplates';
import { emailBody, renderBroadcast, waPhone, whatsappHref } from '@/lib/broadcast';
import { resolveTheme } from '@/lib/eventTheme';
import { compressImage, downloadBlob, downloadDataUrl, toCsv } from '@/lib/image';
import { SendButtons, useOrigin } from './SendButtons';
import type { Guest } from '@/lib/types';

type Field = 'subject' | 'heading' | 'message' | 'whatsapp';
type Filter = 'all' | 'attending' | 'checked_in' | 'not_checked_in' | 'not_sent';

const DEFAULT_FILTER: Record<BroadcastKind, Filter> = {
  invitation: 'all',
  pass: 'attending',
  reminder: 'attending',
  thankyou: 'checked_in',
  winner: 'all',
};

const input = 'w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2.5 rounded-xl text-xs outline-none focus:border-premium-gold';

interface Recipient {
  guest: Guest;
  prize?: string;
}

function FeedbackPanel({ eventId }: { eventId: string }) {
  const { config, update } = useEventConfig(eventId);
  const entries = useFeedback(eventId);
  const fb = config.broadcast.feedback;
  const set = (patch: Partial<FeedbackConfig>) => update('broadcast', { feedback: { ...fb, ...patch } });
  const avg = entries.length ? entries.reduce((sum, e) => sum + e.rating, 0) / entries.length : 0;
  const formUrl = `/events/${config.info.slug}/feedback`;

  const exportCsv = () => {
    const rows = entries.map((e) => [new Date(e.at).toLocaleString(), e.name ?? '', e.rating, e.comment]);
    downloadBlob(`${config.info.slug}-feedback.csv`, new Blob([toCsv([['Submitted', 'Guest', 'Rating', 'Comment'], ...rows])], { type: 'text/csv;charset=utf-8' }));
  };

  return (
    <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-white flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-premium-gold" /> Feedback form</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Adds a link to a short rating form under the Thank You message.</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={fb.on}
          aria-label="Feedback form"
          onClick={() => set({ on: !fb.on })}
          className={`w-11 h-6 rounded-full transition-colors flex items-center shrink-0 scale-on-click ${fb.on ? 'bg-premium-success justify-end pr-0.5' : 'bg-zinc-700 pl-0.5'}`}
        >
          <span className="w-5 h-5 rounded-full bg-white shadow" />
        </button>
      </div>

      {fb.on && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            { key: 'title', label: 'Form title' },
            { key: 'question', label: 'Rating question' },
            { key: 'prompt', label: 'Link text in the message' },
            { key: 'thanks', label: 'Thank-you after sending' },
          ] as const).map((f) => (
            <label key={f.key} className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{f.label}</span>
              <input value={fb[f.key]} onChange={(e) => set({ [f.key]: e.target.value } as Partial<FeedbackConfig>)} className={input} />
            </label>
          ))}
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer sm:col-span-2">
            <input type="checkbox" checked={fb.askComment} onChange={(e) => set({ askComment: e.target.checked })} className="accent-[#C5A059]" />
            Also ask for a written comment
          </label>
          <a href={formUrl} target="_blank" rel="noopener noreferrer" className="sm:col-span-2 inline-flex items-center gap-1.5 text-xs font-bold text-premium-neon hover:underline">
            Open the feedback form <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            {entries.length} repl{entries.length === 1 ? 'y' : 'ies'}{entries.length > 0 && <> · <span className="text-premium-gold">★ {avg.toFixed(1)}</span> average</>}
          </span>
          <button type="button" onClick={exportCsv} disabled={!entries.length} className="px-2.5 py-1 rounded-lg border border-premium-borderDark text-zinc-300 hover:text-white text-[11px] font-bold scale-on-click flex items-center gap-1 disabled:opacity-40">
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>
        {entries.length > 0 && (
          <>
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = entries.filter((e) => e.rating === n).length;
                return (
                  <div key={n} className="flex items-center gap-2 text-[10px] text-zinc-400">
                    <span className="w-6 font-mono">{n}★</span>
                    <span className="flex-1 h-1.5 rounded-full bg-premium-black overflow-hidden">
                      <span className="block h-full bg-premium-gold" style={{ width: `${(count / entries.length) * 100}%` }} />
                    </span>
                    <span className="w-5 text-right font-mono">{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-premium-borderDark/60 rounded-xl border border-premium-borderDark">
              {entries.map((e) => (
                <div key={e.id} className="flex items-start gap-2 px-3 py-2 text-[11px]">
                  <span className="font-mono text-premium-gold shrink-0">{'★'.repeat(e.rating)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="text-zinc-300">{e.comment || <span className="text-zinc-600">No comment</span>}</span>
                    <span className="block text-[10px] text-zinc-500">{e.name ?? 'Guest'} · {new Date(e.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                  <button type="button" onClick={() => { if (confirm('Delete this feedback?')) deleteFeedback(eventId, e.id); }} className="text-zinc-600 hover:text-premium-danger scale-on-click" aria-label="Delete feedback">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function BroadcastStudio({ eventId }: { eventId: string }) {
  const { config, base, update } = useEventConfig(eventId);
  const guests = useGuests(eventId);
  const origin = useOrigin();
  const bc = config.broadcast;
  const [kind, setKind] = useState<BroadcastKind>('invitation');
  const [filter, setFilter] = useState<Filter>(DEFAULT_FILTER.invitation);
  const [query, setQuery] = useState('');
  const [field, setField] = useState<Field>('message');
  const [previewId, setPreviewId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tpl = bc.templates[kind];
  const imageUrl = useAssetUrl(tpl.imageUrl);
  const digits = numberDigits(guests, config.info.capacity);
  const theme = useMemo(() => resolveTheme(config.design), [config.design]);
  const sentIds = useMemo(() => new Set(bc.sent[kind] ?? []), [bc.sent, kind]);

  const setTpl = (patch: Partial<BroadcastTemplate>) => {
    const r = update('broadcast', { templates: { ...bc.templates, [kind]: { ...tpl, ...patch } } });
    setError(r.ok ? null : r.error ?? 'Could not save.');
  };
  const chooseKind = (k: BroadcastKind) => {
    setKind(k);
    setFilter(DEFAULT_FILTER[k]);
    setPreviewId('');
  };

  // Winners come from every door prize and game; everyone else from the guest list.
  const recipients: Recipient[] = useMemo(() => {
    if (kind === 'winner') {
      const byId = new Map(guests.map((g) => [g.id, g]));
      const out: Recipient[] = [];
      for (const d of config.doorprizes.items) {
        for (const w of d.winners) {
          const g = w.guestId ? byId.get(w.guestId) : undefined;
          if (g) out.push({ guest: g, prize: d.prize || d.name });
        }
      }
      for (const a of config.games.activities) {
        for (const w of a.winners) {
          const g = byId.get(w.guestId);
          if (g) out.push({ guest: g, prize: a.prize || `a prize in ${a.name}` });
        }
      }
      return out;
    }
    return guests.map((g) => ({ guest: g }));
  }, [kind, guests, config.doorprizes.items, config.games.activities]);

  const shown = recipients.filter(({ guest: g }) => {
    if (filter === 'attending' && g.rsvp_status !== 'attending') return false;
    if (filter === 'checked_in' && !g.is_checked_in) return false;
    if (filter === 'not_checked_in' && g.is_checked_in) return false;
    if (filter === 'not_sent' && sentIds.has(g.id)) return false;
    const q = query.trim().toLowerCase();
    return !q || `${formatGuestNumber(g.guest_number, digits)} ${g.name} ${g.email ?? ''} ${g.phone ?? ''}`.toLowerCase().includes(q);
  });

  const previewRecipient = recipients.find((r) => r.guest.id === previewId) ?? shown[0] ?? recipients[0];
  const preview = renderBroadcast(kind, tpl, config, previewRecipient?.guest, { origin, digits, prize: previewRecipient?.prize ?? 'Apple MacBook Pro' });

  const insertVariable = (v: string) => {
    const el = document.getElementById(`bc-${field}`) as HTMLInputElement | HTMLTextAreaElement | null;
    const current = tpl[field];
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    setTpl({ [field]: current.slice(0, start) + v + current.slice(end) } as Partial<BroadcastTemplate>);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + v.length, start + v.length);
    });
  };

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await compressImage(file, 1200, 0.85);
      const saved = saveAsset(dataUrl);
      if (!saved.ok || !saved.ref) return setError(saved.error ?? 'Could not save the image.');
      if (tpl.imageUrl) deleteAsset(tpl.imageUrl);
      setTpl({ imageUrl: saved.ref });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const exportCsv = () => {
    const rows = shown.map(({ guest: g, prize }) => {
      const m = renderBroadcast(kind, tpl, config, g, { origin, digits, prize });
      return [
        formatGuestNumber(g.guest_number, digits), g.name, waPhone(g.phone, bc.countryCode), g.email ?? '',
        bc.channel === 'email' ? m.subject : '', bc.channel === 'email' ? emailBody(m) : m.whatsapp, m.link,
        whatsappHref(g.phone, m.whatsapp, bc.countryCode),
      ];
    });
    const header = ['Guest No.', 'Name', 'WhatsApp', 'Email', 'Subject', 'Message', 'Link', 'WhatsApp link'];
    downloadBlob(`${config.info.slug}-${kind}-messages.csv`, new Blob([toCsv([header, ...rows])], { type: 'text/csv;charset=utf-8' }));
  };

  const copyMessage = () => {
    navigator.clipboard?.writeText(bc.channel === 'email' ? `${preview.subject}\n\n${emailBody(preview)}` : preview.whatsapp);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const fieldProps = (f: Field) => ({
    id: `bc-${f}`,
    value: tpl[f],
    onFocus: () => setField(f),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setTpl({ [f]: e.target.value } as Partial<BroadcastTemplate>),
    className: `${input} ${field === f ? 'border-premium-gold/60' : ''}`,
  });

  return (
    <div className="p-6 sm:p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-6 shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-display font-bold text-white">Broadcast</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Write each message once, then send it to every guest by WhatsApp or email. Changes save automatically.</p>
        </div>
        <div className="flex items-center gap-1 bg-premium-surfaceDark p-1 rounded-xl border border-premium-borderDark">
          {([
            { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
            { id: 'email', label: 'Email', icon: Mail },
          ] as const).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => update('broadcast', { channel: c.id })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold scale-on-click transition-all ${bc.channel === c.id ? 'bg-premium-gold text-black shadow-gold' : 'text-zinc-400 hover:text-white'}`}
            >
              <c.icon className="w-3.5 h-3.5" /> {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
        {BROADCAST_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => chooseKind(k.id)}
            title={k.desc}
            className={`p-3 rounded-xl border text-left scale-on-click transition-all ${kind === k.id ? 'border-premium-gold bg-premium-gold/10 shadow-gold' : 'border-premium-borderDark bg-premium-surfaceDark hover:border-zinc-600'}`}
          >
            <div className={`text-xs font-bold ${kind === k.id ? 'text-premium-gold' : 'text-white'}`}>{k.label}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5 leading-snug">{k.desc}</div>
          </button>
        ))}
      </div>

      {error && <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-xs font-bold">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-4">
          {bc.channel === 'email' ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Email subject</span>
                <input {...fieldProps('subject')} />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Heading</span>
                <input {...fieldProps('heading')} />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Message</span>
                <textarea rows={7} {...fieldProps('message')} className={`${fieldProps('message').className} resize-y leading-relaxed`} />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Button text</span>
                <input value={tpl.buttonLabel} onChange={(e) => setTpl({ buttonLabel: e.target.value })} className={input} />
              </label>
            </>
          ) : (
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">WhatsApp message</span>
              <textarea rows={8} {...fieldProps('whatsapp')} className={`${fieldProps('whatsapp').className} resize-y leading-relaxed`} />
            </label>
          )}

          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
              Insert into <span className="text-premium-gold">{bc.channel === 'whatsapp' ? 'message' : field}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[...BROADCAST_VARIABLES, ...(kind === 'thankyou' && bc.feedback.on ? ['{feedback}'] : [])].map((v) => (
                <button
                  key={v}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { if (bc.channel === 'whatsapp') setField('whatsapp'); insertVariable(v); }}
                  className="px-2 py-1 rounded-lg bg-premium-surfaceDark border border-premium-borderDark text-[10px] font-mono text-premium-neon hover:border-premium-neon/50 scale-on-click"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Image</div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0])} />
            <div className="flex items-center gap-3">
              <div className="w-24 h-16 rounded-xl border border-premium-borderDark bg-premium-surfaceDark overflow-hidden flex items-center justify-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-zinc-600" />}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white text-xs font-bold scale-on-click flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> {busy ? 'Uploading…' : imageUrl ? 'Replace' : 'Add image'}
                </button>
                {imageUrl && (
                  <>
                    <button type="button" onClick={() => downloadDataUrl(`${config.info.slug}-${kind}.jpg`, imageUrl)} className="px-3 py-2 rounded-xl border border-premium-borderDark text-zinc-300 hover:text-white text-xs font-bold scale-on-click flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" /> Save
                    </button>
                    <button type="button" onClick={() => { deleteAsset(tpl.imageUrl); setTpl({ imageUrl: '' }); }} className="px-3 py-2 rounded-xl border border-premium-borderDark text-zinc-500 hover:text-premium-danger text-xs font-bold scale-on-click flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </>
                )}
              </div>
            </div>
            <p className="text-[10px] text-zinc-500">
              {bc.channel === 'email'
                ? 'Shown at the top of the email.'
                : 'Sent with the message once automatic WhatsApp sending is connected. When you send from your own WhatsApp, attach it yourself (use Save).'}
            </p>
          </div>

          {kind === 'thankyou' && <FeedbackPanel eventId={eventId} />}

          <button
            type="button"
            onClick={() => { if (confirm(`Reset the ${BROADCAST_KINDS.find((k) => k.id === kind)?.label} template to the default text?`)) setTpl({ ...defaultBroadcastTemplates(base)[kind], imageUrl: tpl.imageUrl }); }}
            className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset to default text
          </button>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Preview</span>
            {recipients.length > 0 && (
              <select
                value={previewRecipient?.guest.id ?? ''}
                onChange={(e) => setPreviewId(e.target.value)}
                className="bg-premium-surfaceDark border border-premium-borderDark text-white px-2 py-1.5 rounded-lg text-[11px] outline-none max-w-[200px]"
                aria-label="Preview as guest"
              >
                {recipients.map((r, i) => <option key={`${r.guest.id}-${i}`} value={r.guest.id}>As {r.guest.name}</option>)}
              </select>
            )}
          </div>

          {bc.channel === 'email' ? (
            <div className="rounded-2xl overflow-hidden border border-premium-borderDark" style={{ background: theme.bg, color: theme.text, fontFamily: theme.bodyFamily }}>
              <div className="px-4 py-2.5 text-[11px] border-b" style={{ borderColor: theme.border, color: theme.muted }}>
                <span className="font-bold" style={{ color: theme.text }}>Subject:</span> {preview.subject}
              </div>
              <div className="p-4">
                <div className="overflow-hidden" style={{ ...theme.cardStyle }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {imageUrl && <img src={imageUrl} alt="" className="w-full max-h-48 object-cover" />}
                  <div className="p-5 space-y-3">
                    <div className="text-xl font-bold" style={{ fontFamily: theme.headingFamily, letterSpacing: theme.space.headingTracking }}>{preview.heading}</div>
                    <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: theme.muted }}>{preview.message}</p>
                    <div className="flex flex-wrap gap-2">
                      {preview.buttonLabel && (
                        <span className="inline-block px-5 py-2.5 text-sm font-bold" style={{ background: theme.primary, color: theme.onPrimary, borderRadius: theme.buttonRadius }}>{preview.buttonLabel}</span>
                      )}
                      {preview.feedback && (
                        <span className="inline-block px-5 py-2.5 text-sm font-bold" style={{ border: `1px solid ${theme.primary}`, color: theme.primaryText, borderRadius: theme.buttonRadius }}>{preview.feedback.label}</span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-center mt-3" style={{ color: theme.subtle }}>{config.info.name} · sent with all41.app</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-premium-borderDark bg-premium-black p-4">
              <div className="max-w-[300px] ml-auto rounded-2xl rounded-tr-sm overflow-hidden bg-premium-success/15 border border-premium-success/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {imageUrl && <img src={imageUrl} alt="" className="w-full max-h-44 object-cover" />}
                <p className="px-3 py-2.5 text-[13px] text-zinc-100 whitespace-pre-line leading-relaxed break-words">
                  {preview.whatsapp.split(preview.link).map((part, i, arr) => (
                    <React.Fragment key={i}>
                      {part}
                      {i < arr.length - 1 && <span className="text-premium-neon underline">{preview.link}</span>}
                    </React.Fragment>
                  ))}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyMessage} className="px-3 py-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white text-xs font-bold scale-on-click flex items-center gap-1.5">
              {copied ? <Check className="w-3.5 h-3.5 text-premium-success" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy message'}
            </button>
          </div>
        </div>
      </div>

      {/* Recipients */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            Send to · <span className="text-white">{shown.length}</span> {kind === 'winner' ? 'winner' : 'guest'}{shown.length === 1 ? '' : 's'} · <span className="text-premium-success">{shown.filter((r) => sentIds.has(r.guest.id)).length} sent</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {kind !== 'winner' && (
              <div className="flex flex-wrap gap-1">
                {([
                  ['all', 'All'], ['attending', 'Attending'], ['checked_in', 'Checked in'], ['not_checked_in', 'Not checked in'], ['not_sent', 'Not sent yet'],
                ] as const).map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setFilter(id)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold scale-on-click ${filter === id ? 'bg-premium-gold/15 text-premium-gold border border-premium-gold/40' : 'text-zinc-500 border border-premium-borderDark hover:text-white'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={exportCsv} disabled={!shown.length} className="px-3 py-1.5 rounded-lg border border-premium-borderDark text-zinc-300 hover:text-white text-[11px] font-bold scale-on-click flex items-center gap-1.5 disabled:opacity-40">
              <Download className="w-3.5 h-3.5" /> CSV with messages
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, number, phone or email" className={`${input} pl-8`} />
        </div>

        <div className="rounded-2xl border border-premium-borderDark divide-y divide-premium-borderDark/50 max-h-96 overflow-y-auto">
          {shown.length === 0 && (
            <p className="p-4 text-xs text-zinc-500">{kind === 'winner' ? 'No winners yet. Winners from door prizes and games appear here.' : 'No guests match.'}</p>
          )}
          {shown.map(({ guest: g, prize }, i) => (
            <div key={`${g.id}-${i}`} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-xs">
              <span className="font-mono font-bold text-premium-gold w-12 shrink-0">{formatGuestNumber(g.guest_number, digits)}</span>
              <div className="flex-1 min-w-[140px]">
                <div className="font-bold text-white truncate">{g.name}</div>
                <div className="text-[10px] text-zinc-500 truncate">
                  {prize ? `Won ${prize} · ` : ''}{[g.phone, g.email].filter(Boolean).join(' · ') || 'No phone or email saved'}
                </div>
              </div>
              <SendButtons eventId={eventId} kind={kind} guest={g} prize={prize} size="sm" />
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-[11px] text-zinc-400 flex gap-2">
          <Info className="w-4 h-4 text-premium-neon shrink-0 mt-px" />
          <span>
            Each button opens the message ready to send from your own WhatsApp or email app.
            Automatic sending to everyone at once (WhatsApp through Fonnte, email through Resend) switches on once the server is connected.
            Phone numbers starting with 0 get country code
            <input
              value={bc.countryCode}
              onChange={(e) => update('broadcast', { countryCode: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              className="mx-1 w-12 bg-premium-black border border-premium-borderDark text-white px-1.5 py-0.5 rounded font-mono text-[11px] outline-none focus:border-premium-gold"
              aria-label="Country code"
            />
            added.
          </span>
        </div>
      </div>
    </div>
  );
}
