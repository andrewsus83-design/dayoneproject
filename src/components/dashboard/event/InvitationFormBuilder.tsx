'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlignLeft, ArrowDown, ArrowUp, Check, CheckSquare, ChevronDown, Copy, Download, ExternalLink, Eye, GripVertical,
  Hash, KeyRound, Link as LinkIcon, List, Mail, Phone, Plus, QrCode, RotateCcw, Settings2,
  Share2, Smartphone, Trash2, Upload, X,
} from 'lucide-react';
import {
  addResponse, deleteAsset, deleteResponse, findQuestion, formatEventDate, newId, resetEventSection, saveAsset,
  useAssetUrl, useEventConfig, useResponses, ESSENTIALS_CORPORATE, ESSENTIALS_WEDDING,
  type FormQuestion, type InvitationConfig, type QuestionType, type ClosingCopy, type EventInfo,
} from '@/lib/eventStore';
import { INVITATION_THEMES, resolveInvitationTheme, resolveTheme } from '@/lib/eventTheme';
import { compressImage, downloadBlob, downloadDataUrl, toCsv } from '@/lib/image';
import { InvitationFormView, type PreviewScreen } from '@/components/events/InvitationFormView';
import { EventFonts } from '@/components/events/EventFonts';

const TYPE_ICONS: Record<QuestionType, React.ComponentType<{ className?: string }>> = {
  text: AlignLeft, long_text: AlignLeft, yes_no: CheckSquare,
  multiple: ChevronDown, number: Hash, email: Mail, phone: Phone,
};

const TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Short answer', long_text: 'Long text', yes_no: 'Yes / No',
  multiple: 'Multiple choice', number: 'Number', email: 'Email', phone: 'Phone',
};

const ROLE_LABELS: Record<string, string> = {
  name: 'Guest name',
  attending: 'Attending yes/no',
  party: 'Party size',
  email: 'Pass sent here',
  phone: 'WhatsApp',
};

const EXTRA_WEDDING: FormQuestion[] = [
  { id: 'sg-6', type: 'multiple', label: 'Choose your main course', required: false, options: ['Beef Tenderloin', 'Sea Bass', 'Mushroom Risotto'] },
  { id: 'sg-7', type: 'long_text', label: 'Any allergies or dietary needs?', required: false },
  { id: 'sg-8', type: 'text', label: 'Names of your +1 or family members', required: false },
  { id: 'sg-9', type: 'multiple', label: 'Whose side are you on?', required: false, options: ["Bride's side", "Groom's side", 'Both'] },
  { id: 'sg-10', type: 'yes_no', label: 'Do you need a shuttle from the hotel?', required: false },
  { id: 'sg-11', type: 'text', label: 'A song that gets you dancing', required: false },
  { id: 'sg-12', type: 'long_text', label: 'A message for the couple', required: false },
];

const EXTRA_CORPORATE: FormQuestion[] = [
  { id: 'sg-6', type: 'multiple', label: 'Industry vertical', required: false, options: ['Fintech', 'SaaS / Cloud', 'E-commerce', 'Healthcare Tech', 'Other'] },
  { id: 'sg-7', type: 'number', label: 'How many delegates from your company?', required: false },
  { id: 'sg-8', type: 'multiple', label: 'Dietary preference', required: false, options: ['Halal', 'Vegetarian', 'Vegan', 'None'] },
  { id: 'sg-9', type: 'long_text', label: 'Topics you want to discuss', required: false },
];

const VARIABLES = ['{name}', '{fullname}', '{party}', '{guests}', '{event}', '{date}', '{time}', '{venue}', '{code}'];

type FormTab = 'cover' | 'questions' | 'closing' | 'share' | 'responses' | 'pwa' | 'settings';
type ClosingView = 'confirmed' | 'declined' | 'closed';
type ClosingField = 'heading' | 'message' | 'smallPrint';

const inputCls =
  'w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-xs outline-none focus:border-premium-gold';

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`w-11 h-6 rounded-full transition-colors flex items-center shrink-0 scale-on-click ${on ? 'bg-premium-success justify-end pr-0.5' : 'bg-zinc-700 pl-0.5'}`}
    >
      <span className="w-5 h-5 rounded-full bg-white shadow" />
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-zinc-400 font-bold block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-zinc-500 mt-1">{hint}</p>}
    </div>
  );
}

export function InvitationFormBuilder({ eventId }: { eventId: string }) {
  const { config, event, update, savedAt } = useEventConfig(eventId);
  const responses = useResponses(eventId);
  const inv = config.invitation;
  const info = config.info;
  const isWedding = event.event_type === 'wedding';
  const slug = info.slug;

  const [formTab, setFormTab] = useState<FormTab>('cover');
  const [closingView, setClosingView] = useState<ClosingView>('confirmed');
  const [selectedQ, setSelectedQ] = useState<string | null>(null);
  const [previewOverride, setPreviewOverride] = useState<PreviewScreen | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<QuestionType>('text');
  const [dragId, setDragId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [qrPng, setQrPng] = useState('');
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const closingRefs = useRef<Partial<Record<ClosingField, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const [activeField, setActiveField] = useState<ClosingField>('message');

  useEffect(() => setOrigin(window.location.origin), []);

  const formUrl = `${origin}/events/${slug}/invitation`;
  const theme = useMemo(() => resolveInvitationTheme(config.design, inv.theme), [config.design, inv.theme]);
  const eventTheme = useMemo(() => resolveTheme(config.design), [config.design]);
  const photo = useAssetUrl(inv.photoUrl);
  const hero = useAssetUrl(config.landing.heroUrl);
  const coverUrl = photo || hero || event.cover_image_url || '';

  useEffect(() => {
    if (!origin) return;
    QRCode.toDataURL(formUrl, { width: 1024, margin: 2, color: { dark: '#09090B', light: '#FFFFFF' } }).then(setQrPng).catch(() => setQrPng(''));
  }, [formUrl, origin]);

  useEffect(() => setPreviewOverride(null), [formTab, closingView]);

  const report = (res: { ok: boolean; error?: string }) => setStorageError(res.ok ? null : res.error ?? 'Could not save.');
  const setInv = (patch: Partial<InvitationConfig>) => report(update('invitation', patch));
  const setInfo = (patch: Partial<EventInfo>) => report(update('info', patch));
  const setQuestions = (qs: FormQuestion[]) => setInv({ questions: qs });
  const patchQuestion = (id: string, patch: Partial<FormQuestion>) =>
    setQuestions(inv.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const flash = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  };
  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text).then(() => flash(key)).catch(() => flash(key));
  };

  /* ── Cover photo upload ── */
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImage(file, 1600, 0.8);
      const saved = saveAsset(dataUrl);
      if (!saved.ok || !saved.ref) {
        report(saved);
        return;
      }
      if (inv.photoUrl) deleteAsset(inv.photoUrl);
      setInv({ photoUrl: saved.ref });
    } catch (e) {
      setStorageError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  /* ── Questions ── */
  const essentials = isWedding ? ESSENTIALS_WEDDING : ESSENTIALS_CORPORATE;
  const extras = isWedding ? EXTRA_WEDDING : EXTRA_CORPORATE;
  const hasLabel = (label: string) => inv.questions.some((q) => q.label.trim().toLowerCase() === label.trim().toLowerCase());
  const addSuggested = (q: FormQuestion) => {
    if (hasLabel(q.label)) return;
    const role = q.role && findQuestion(inv.questions, q.role) ? undefined : q.role;
    const id = newId('q');
    setQuestions([...inv.questions, { ...q, id, role, options: q.options ? [...q.options] : undefined }]);
    setSelectedQ(id);
  };
  const addEssentials = () => {
    const missing = essentials.filter((q) => !hasLabel(q.label)).map((q) => ({ ...q, id: newId('q') }));
    setQuestions([...inv.questions, ...missing]);
  };
  const addCustom = () => {
    if (!newLabel.trim()) return;
    const id = newId('q');
    setQuestions([
      ...inv.questions,
      { id, type: newType, label: newLabel.trim(), required: false, options: newType === 'multiple' ? ['Option 1', 'Option 2'] : undefined },
    ]);
    setSelectedQ(id);
    setNewLabel('');
    setNewType('text');
    setShowAdd(false);
  };
  const moveQuestion = (id: string, dir: -1 | 1) => {
    const idx = inv.questions.findIndex((q) => q.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= inv.questions.length) return;
    const next = [...inv.questions];
    [next[idx], next[target]] = [next[target], next[idx]];
    setQuestions(next);
  };
  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const next = [...inv.questions];
    const from = next.findIndex((q) => q.id === dragId);
    const to = next.findIndex((q) => q.id === targetId);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setQuestions(next);
    setDragId(null);
  };
  const changeType = (q: FormQuestion, type: QuestionType) => {
    const role = q.role === 'attending' && type !== 'yes_no' ? undefined
      : q.role === 'party' && type !== 'number' ? undefined
      : q.role === 'email' && type !== 'email' ? undefined
      : q.role === 'phone' && type !== 'phone' ? undefined
      : q.role;
    patchQuestion(q.id, { type, role, options: type === 'multiple' ? q.options?.length ? q.options : ['Option 1', 'Option 2'] : undefined });
  };

  /* ── Closing copy ── */
  const closingCopy: ClosingCopy = inv[closingView];
  const setClosing = (patch: Partial<ClosingCopy>) => setInv({ [closingView]: { ...closingCopy, ...patch } } as Partial<InvitationConfig>);
  const insertVariable = (token: string) => {
    const el = closingRefs.current[activeField];
    const current = closingCopy[activeField] ?? '';
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    const nextValue = current.slice(0, start) + token + current.slice(end);
    setClosing({ [activeField]: nextValue });
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  /* ── Responses ── */
  const attendingCount = responses.filter((r) => r.attending).reduce((s, r) => s + r.party, 0);
  const declinedCount = responses.filter((r) => !r.attending).length;
  const exportCsv = () => {
    const header = ['Submitted', 'Name', 'Attending', 'Party', 'Email', 'Phone', 'Pass code', ...inv.questions.map((q) => q.label)];
    const rows = responses.map((r) => [
      new Date(r.submittedAt).toLocaleString(),
      r.name,
      r.attending ? 'Yes' : 'No',
      r.party,
      r.email,
      r.phone,
      r.token,
      ...inv.questions.map((q) => r.answers[q.id] ?? ''),
    ]);
    downloadBlob(`${slug}-responses.csv`, new Blob([toCsv([header, ...rows])], { type: 'text/csv;charset=utf-8' }));
  };

  /* ── Share ── */
  const shareText = `${isWedding ? "You're invited to" : 'Register for'} ${info.name} — ${formatEventDate(info.startDate)}. ${formUrl}`;
  const downloadSvg = async () => {
    const svg = await QRCode.toString(formUrl, { type: 'svg', margin: 2, color: { dark: '#09090B', light: '#FFFFFF' } });
    downloadBlob(`${slug}-rsvp-qr.svg`, new Blob([svg], { type: 'image/svg+xml' }));
  };

  /* ── Preview screen ── */
  const selectedIndex = Math.max(0, inv.questions.findIndex((q) => q.id === selectedQ));
  const tabScreen: PreviewScreen =
    formTab === 'questions' ? (inv.questions.length ? 'question' : 'cover')
    : formTab === 'closing' ? closingView
    : formTab === 'responses' ? 'confirmed'
    : formTab === 'settings' && !inv.accepting ? 'closed'
    : 'cover';
  const previewScreen = previewOverride ?? tabScreen;

  const TABS = [
    { id: 'cover' as const, label: 'Cover', icon: Eye },
    { id: 'questions' as const, label: `Questions (${inv.questions.length})`, icon: List },
    { id: 'closing' as const, label: 'Closing', icon: QrCode },
    { id: 'share' as const, label: 'Share', icon: Share2 },
    { id: 'responses' as const, label: `Responses (${responses.length})`, icon: CheckSquare },
    { id: 'pwa' as const, label: 'PWA', icon: Smartphone },
    { id: 'settings' as const, label: 'Settings', icon: Settings2 },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <EventFonts href={theme.fontsHref} />

      {/* Left: builder */}
      <div className="xl:col-span-7 space-y-4 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFormTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold scale-on-click transition-all ${
                formTab === t.id
                  ? 'bg-premium-gold text-black shadow-gold'
                  : 'bg-premium-surfaceDark text-zinc-400 border border-premium-borderDark hover:text-white'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 text-[11px] font-mono px-1">
          <span className="text-zinc-500">Changes save automatically.</span>
          {savedAt && (
            <span className="inline-flex items-center gap-1 text-premium-success">
              <Check className="w-3 h-3" /> Saved {new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {storageError && (
          <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-xs font-bold flex items-center justify-between gap-3">
            <span>{storageError}</span>
            <button type="button" onClick={() => setStorageError(null)} className="scale-on-click" aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* COVER */}
        {formTab === 'cover' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-6">
            <h3 className="font-display font-bold text-white text-base">Cover Page</h3>

            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest mb-2 block">Color Theme</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setInv({ theme: 'event' })}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-bold scale-on-click transition-all ${
                    inv.theme === 'event' ? 'border-premium-gold text-white bg-premium-gold/10' : 'border-premium-borderDark text-zinc-300 hover:border-premium-gold/50'
                  }`}
                >
                  <span className="flex gap-0.5 items-center">
                    <span className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: eventTheme.primary }} />
                    <span className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: eventTheme.bg }} />
                    <span className="w-2.5 h-2.5 rounded-full opacity-70" style={{ backgroundColor: eventTheme.accent }} />
                  </span>
                  Event Design
                </button>
                {INVITATION_THEMES.map((th) => (
                  <button
                    key={th.name}
                    type="button"
                    onClick={() => setInv({ theme: th.name })}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-bold scale-on-click transition-all ${
                      inv.theme === th.name ? 'border-premium-gold text-white bg-premium-gold/10' : 'border-premium-borderDark text-zinc-300 hover:border-premium-gold/50'
                    }`}
                  >
                    <span className="flex gap-0.5 items-center">
                      <span className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: th.c1 }} />
                      <span className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: th.c2 }} />
                      <span className="w-2.5 h-2.5 rounded-full opacity-70" style={{ backgroundColor: th.c3 }} />
                    </span>
                    {th.name}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-600 mt-1.5">“Event Design” follows the light/dark mode and colors set in Design Studio.</p>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest mb-2 block">Event Details · shared with Event Information</label>
              <div className="space-y-3">
                {([
                  { label: 'Event name', value: info.name, onChange: (v: string) => setInfo({ name: v }) },
                  { label: 'Subtitle', value: inv.subtitle, onChange: (v: string) => setInv({ subtitle: v }) },
                  { label: 'Venue', value: info.venue, onChange: (v: string) => setInfo({ venue: v }) },
                  { label: 'City', value: info.city, onChange: (v: string) => setInfo({ city: v }) },
                ]).map((f) => (
                  <div key={f.label} className="grid grid-cols-3 gap-3 items-center">
                    <label className="text-xs text-zinc-400">{f.label}</label>
                    <input value={f.value} onChange={(e) => f.onChange(e.target.value)} className={`col-span-2 ${inputCls}`} />
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="text-xs text-zinc-400">Date & time</label>
                  <div className="col-span-2 grid grid-cols-2 gap-2">
                    <input type="date" value={info.startDate} onChange={(e) => setInfo({ startDate: e.target.value })} className={`${inputCls} [color-scheme:dark]`} />
                    <input type="time" value={info.startTime} onChange={(e) => setInfo({ startTime: e.target.value })} className={`${inputCls} [color-scheme:dark]`} />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest mb-2 block">Cover Content</label>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="text-xs text-zinc-400">Small heading above title</label>
                  <input value={inv.heading} onChange={(e) => setInv({ heading: e.target.value })} className={`col-span-2 ${inputCls}`} />
                </div>
                <div className="grid grid-cols-3 gap-3 items-start">
                  <label className="text-xs text-zinc-400 pt-2">Message</label>
                  <textarea rows={3} value={inv.message} onChange={(e) => setInv({ message: e.target.value })} className={`col-span-2 ${inputCls} resize-none`} />
                </div>
                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="text-xs text-zinc-400">Start button</label>
                  <input value={inv.startLabel} onChange={(e) => setInv({ startLabel: e.target.value })} className={`col-span-2 ${inputCls}`} />
                </div>
                <div className="grid grid-cols-3 gap-3 items-center">
                  <label className="text-xs text-zinc-400">Small note under button</label>
                  <input value={inv.startNote} onChange={(e) => setInv({ startNote: e.target.value })} className={`col-span-2 ${inputCls}`} />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest mb-2 block">Cover Photo</label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              {inv.photoUrl && photo ? (
                <div className="relative h-40 rounded-2xl overflow-hidden border border-premium-borderDark">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button type="button" onClick={() => fileRef.current?.click()} className="px-3 py-1.5 rounded-xl bg-black/70 border border-white/20 text-white text-[11px] font-bold scale-on-click flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" /> Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => { deleteAsset(inv.photoUrl); setInv({ photoUrl: '' }); }}
                      className="w-8 h-8 rounded-xl bg-black/70 border border-white/20 text-white flex items-center justify-center hover:bg-premium-danger scale-on-click"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
                  className={`w-full h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors scale-on-click ${
                    dragOver ? 'border-premium-gold bg-premium-gold/10' : 'border-premium-borderDark bg-premium-surfaceDark hover:border-premium-gold/50'
                  }`}
                >
                  {uploading ? (
                    <span className="text-xs text-premium-gold font-bold">Compressing photo…</span>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-premium-gold" />
                      <span className="text-xs font-bold text-white">Upload or drop a photo</span>
                      <span className="text-[10px] text-zinc-500">JPG, PNG, WebP · auto-compressed · until then the landing hero is used</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* QUESTIONS */}
        {formTab === 'questions' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display font-bold text-white text-base">Questions</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Guests answer one at a time. Click a question to edit it; drag or use the arrows to reorder.</p>
              </div>
              <button
                type="button"
                onClick={() => { if (confirm('Replace all questions with the default set?')) { setQuestions(essentials.map((q) => ({ ...q }))); setSelectedQ(null); } }}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 hover:text-white text-[11px] font-bold scale-on-click flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" /> Defaults
              </button>
            </div>

            {inv.questions.length === 0 ? (
              <div className="p-8 rounded-2xl border-2 border-dashed border-premium-borderDark flex flex-col items-center gap-3 text-center">
                <AlignLeft className="w-6 h-6 text-zinc-500" />
                <div className="text-sm font-bold text-white">No questions yet</div>
                <button type="button" onClick={addEssentials} className="px-5 py-2.5 rounded-xl bg-premium-gold text-black text-xs font-bold scale-on-click flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" /> Add the essentials
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {inv.questions.map((q, idx) => {
                  const Icon = TYPE_ICONS[q.type];
                  const open = selectedQ === q.id;
                  return (
                    <div
                      key={q.id}
                      draggable
                      onDragStart={() => setDragId(q.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => dropOn(q.id)}
                      onDragEnd={() => setDragId(null)}
                      className={`rounded-2xl border transition-colors ${open ? 'bg-premium-surfaceDark border-premium-gold/50' : 'bg-premium-surfaceDark border-premium-borderDark'} ${dragId === q.id ? 'opacity-50' : ''}`}
                    >
                      <div className="p-3 flex items-center gap-2.5">
                        <GripVertical className="w-3.5 h-3.5 text-zinc-600 shrink-0 cursor-grab" />
                        <span className="text-[10px] font-mono text-zinc-600 w-4 shrink-0">{idx + 1}</span>
                        <button type="button" onClick={() => setSelectedQ(open ? null : q.id)} className="flex-1 min-w-0 flex items-center gap-2.5 text-left">
                          <Icon className="w-4 h-4 text-zinc-500 shrink-0" />
                          <span className="min-w-0">
                            <span className="block text-xs font-bold text-white truncate">{q.label || 'Untitled question'}</span>
                            <span className="block text-[10px] text-zinc-500">
                              {TYPE_LABELS[q.type]}
                              {q.role && <span className="text-premium-neon"> · {ROLE_LABELS[q.role]}</span>}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => patchQuestion(q.id, { required: !q.required })}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border scale-on-click ${q.required ? 'border-premium-danger/40 text-premium-danger bg-premium-danger/10' : 'border-zinc-700 text-zinc-500'}`}
                        >
                          {q.required ? 'Required' : 'Optional'}
                        </button>
                        <button type="button" onClick={() => moveQuestion(q.id, -1)} disabled={idx === 0} className="text-zinc-500 hover:text-white disabled:opacity-20 scale-on-click" aria-label="Move up">
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => moveQuestion(q.id, 1)} disabled={idx === inv.questions.length - 1} className="text-zinc-500 hover:text-white disabled:opacity-20 scale-on-click" aria-label="Move down">
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setQuestions(inv.questions.filter((x) => x.id !== q.id)); if (open) setSelectedQ(null); }}
                          className="text-zinc-600 hover:text-premium-danger scale-on-click"
                          aria-label="Delete question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {open && (
                        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-premium-borderDark/60">
                          <Field label="Question">
                            <input value={q.label} onChange={(e) => patchQuestion(q.id, { label: e.target.value })} className={inputCls} />
                          </Field>
                          <Field label="Answer type">
                            <div className="flex gap-1.5 flex-wrap">
                              {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => {
                                const TIcon = TYPE_ICONS[t];
                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => changeType(q, t)}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold scale-on-click ${
                                      q.type === t ? 'bg-premium-gold text-black border-premium-gold' : 'border-premium-borderDark text-zinc-400 hover:border-premium-gold/40'
                                    }`}
                                  >
                                    <TIcon className="w-3 h-3" /> {TYPE_LABELS[t]}
                                  </button>
                                );
                              })}
                            </div>
                          </Field>
                          {q.type === 'multiple' && (
                            <Field label="Choices">
                              <div className="space-y-1.5">
                                {(q.options ?? []).map((opt, oi) => (
                                  <div key={oi} className="flex items-center gap-2">
                                    <span className="w-5 text-[10px] font-mono text-zinc-500">{String.fromCharCode(65 + oi)}</span>
                                    <input
                                      value={opt}
                                      onChange={(e) => patchQuestion(q.id, { options: (q.options ?? []).map((o, i) => (i === oi ? e.target.value : o)) })}
                                      className={inputCls}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => patchQuestion(q.id, { options: (q.options ?? []).filter((_, i) => i !== oi) })}
                                      disabled={(q.options ?? []).length <= 2}
                                      className="text-zinc-600 hover:text-premium-danger disabled:opacity-20 scale-on-click"
                                      aria-label="Remove choice"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => patchQuestion(q.id, { options: [...(q.options ?? []), `Option ${(q.options?.length ?? 0) + 1}`] })}
                                  className="text-[11px] font-bold text-premium-gold hover:underline flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" /> Add choice
                                </button>
                              </div>
                            </Field>
                          )}
                          {['text', 'long_text', 'email', 'phone', 'number'].includes(q.type) && (
                            <Field label="Placeholder (optional)">
                              <input value={q.placeholder ?? ''} onChange={(e) => patchQuestion(q.id, { placeholder: e.target.value })} className={inputCls} />
                            </Field>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-premium-borderDark text-zinc-400 text-xs font-bold hover:border-premium-gold/50 hover:text-white flex items-center justify-center gap-2 scale-on-click"
            >
              <Plus className="w-4 h-4" /> Add a question
            </button>

            {showAdd && (
              <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-gold/30 space-y-3">
                <div className="flex gap-1.5 flex-wrap">
                  {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => {
                    const Icon = TYPE_ICONS[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewType(t)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-bold scale-on-click ${
                          newType === t ? 'bg-premium-gold text-black border-premium-gold' : 'border-premium-borderDark text-zinc-400 hover:border-premium-gold/40'
                        }`}
                      >
                        <Icon className="w-3 h-3" /> {TYPE_LABELS[t]}
                      </button>
                    );
                  })}
                </div>
                <input
                  autoFocus
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); if (e.key === 'Escape') setShowAdd(false); }}
                  placeholder="Type your question…"
                  className={inputCls}
                />
                <div className="flex gap-2">
                  <button type="button" onClick={addCustom} disabled={!newLabel.trim()} className="flex-1 py-2 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black text-xs font-bold disabled:opacity-40 scale-on-click">
                    Add question
                  </button>
                  <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl bg-premium-charcoal border border-premium-borderDark text-zinc-400 text-xs font-bold scale-on-click">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {[
                { title: 'Essentials', items: essentials },
                { title: isWedding ? 'Often useful for weddings' : 'Often useful for events', items: extras },
              ].map((group) => (
                <div key={group.title}>
                  <div className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest mb-2">{group.title}</div>
                  <div className="space-y-1.5">
                    {group.items.map((q) => {
                      const Icon = TYPE_ICONS[q.type];
                      const added = hasLabel(q.label);
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => addSuggested(q)}
                          disabled={added}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-full border text-[11px] font-medium transition-all ${
                            added ? 'border-premium-success/30 text-premium-success bg-premium-success/10 cursor-default' : 'border-premium-borderDark text-zinc-400 hover:border-premium-gold/50 hover:text-white scale-on-click'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          {q.label}
                          <span className="ml-auto font-bold">{added ? <Check className="w-3.5 h-3.5" /> : '+'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CLOSING */}
        {formTab === 'closing' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div>
              <h3 className="font-display font-bold text-white text-base">Closing Page</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">What guests see after they send the form. Each version has its own text.</p>
            </div>

            <div className="flex gap-2">
              {([
                { id: 'confirmed', label: 'Confirmed' },
                { id: 'declined', label: 'Declined' },
                { id: 'closed', label: 'Form closed' },
              ] as const).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setClosingView(v.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border scale-on-click ${closingView === v.id ? 'bg-premium-gold text-black border-premium-gold' : 'bg-premium-surfaceDark text-zinc-400 border-premium-borderDark hover:text-white'}`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <Field label="Heading">
                <input
                  ref={(el) => { closingRefs.current.heading = el; }}
                  value={closingCopy.heading}
                  onFocus={() => setActiveField('heading')}
                  onChange={(e) => setClosing({ heading: e.target.value })}
                  className={`${inputCls} ${activeField === 'heading' ? 'border-premium-gold/60' : ''}`}
                />
              </Field>
              <Field label="Message">
                <textarea
                  ref={(el) => { closingRefs.current.message = el; }}
                  rows={3}
                  value={closingCopy.message}
                  onFocus={() => setActiveField('message')}
                  onChange={(e) => setClosing({ message: e.target.value })}
                  className={`${inputCls} resize-none ${activeField === 'message' ? 'border-premium-gold/60' : ''}`}
                />
              </Field>
              {closingView === 'confirmed' && (
                <Field label="Small print under the QR code">
                  <textarea
                    ref={(el) => { closingRefs.current.smallPrint = el; }}
                    rows={2}
                    value={closingCopy.smallPrint}
                    onFocus={() => setActiveField('smallPrint')}
                    onChange={(e) => setClosing({ smallPrint: e.target.value })}
                    className={`${inputCls} resize-none ${activeField === 'smallPrint' ? 'border-premium-gold/60' : ''}`}
                  />
                </Field>
              )}

              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">
                  Insert variable into <span className="text-premium-gold">{activeField === 'smallPrint' ? 'small print' : activeField}</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertVariable(v)}
                      className="px-2 py-1 rounded-lg bg-premium-surfaceDark border border-premium-borderDark text-[10px] font-mono text-premium-neon hover:border-premium-neon/50 scale-on-click"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <div className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest mb-1">What guests can do</div>
                {([
                  { key: 'showTicket', label: 'Show the ticket with QR code', sub: 'The QR is what you scan at the door.' },
                  { key: 'showCalendar', label: '"Add to calendar" button', sub: 'Downloads an .ics file.' },
                  { key: 'showDirections', label: '"Directions" button', sub: 'Opens the map link from Event Information.' },
                  { key: 'showContact', label: 'Show your phone and email', sub: 'Guests can call or email you.' },
                ] as const).map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-4 py-2">
                    <div>
                      <div className="text-xs text-white font-medium">{item.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{item.sub}</div>
                    </div>
                    <Toggle on={inv[item.key]} label={item.label} onClick={() => setInv({ [item.key]: !inv[item.key] } as Partial<InvitationConfig>)} />
                  </div>
                ))}
                {inv.showContact && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Field label="Your phone">
                      <input value={inv.contactPhone} onChange={(e) => setInv({ contactPhone: e.target.value })} placeholder="+62 812 0000 0000" className={inputCls} />
                    </Field>
                    <Field label="Your email">
                      <input value={inv.contactEmail} onChange={(e) => setInv({ contactEmail: e.target.value })} placeholder="host@example.com" className={inputCls} />
                    </Field>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <Field label="Extra button label">
                  <input value={inv.extraLabel} onChange={(e) => setInv({ extraLabel: e.target.value })} placeholder={isWedding ? 'View our registry' : 'Download agenda'} className={inputCls} />
                </Field>
                <Field label="Extra button link">
                  <input value={inv.extraUrl} onChange={(e) => setInv({ extraUrl: e.target.value })} placeholder="https://" className={inputCls} />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* SHARE */}
        {formTab === 'share' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-6">
            <div>
              <h3 className="font-display font-bold text-white text-base flex items-center gap-2"><Share2 className="w-4 h-4 text-premium-gold" /> Share Your Form</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Send the RSVP link by WhatsApp, email, Telegram, or print the QR code.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Public RSVP link</label>
              <div className="flex items-center gap-2 bg-premium-surfaceDark border border-premium-borderDark rounded-2xl px-4 py-3">
                <LinkIcon className="w-4 h-4 text-premium-neon shrink-0" />
                <span className="flex-1 font-mono text-xs text-premium-neon truncate">{formUrl}</span>
                <button type="button" onClick={() => copy(formUrl, 'link')} className="px-3 py-1.5 rounded-xl bg-premium-gold text-black font-bold text-[10px] scale-on-click">
                  {copied === 'link' ? 'Copied!' : 'Copy'}
                </button>
                <a href={`/events/${slug}/invitation`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-xl bg-premium-charcoal border border-premium-borderDark text-white font-bold text-[10px] scale-on-click flex items-center gap-1">
                  Open <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="w-36 h-36 bg-white rounded-2xl p-2 shrink-0 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {qrPng ? <img src={qrPng} alt="RSVP QR code" className="w-full h-full" /> : <QrCode className="w-16 h-16 text-black" />}
              </div>
              <div className="space-y-3 flex-1">
                <div>
                  <div className="text-sm font-bold text-white">QR code</div>
                  <div className="text-xs text-zinc-400 mt-0.5">Print it on invitation cards. Guests scan it to open the RSVP form.</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button type="button" disabled={!qrPng} onClick={() => downloadDataUrl(`${slug}-rsvp-qr.png`, qrPng)} className="px-4 py-2 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-bold text-xs scale-on-click flex items-center gap-1.5 disabled:opacity-40">
                    <Download className="w-3.5 h-3.5" /> Download PNG
                  </button>
                  <button type="button" disabled={!origin} onClick={downloadSvg} className="px-4 py-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white font-bold text-xs scale-on-click disabled:opacity-40">
                    Download SVG
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Share via</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="py-2.5 rounded-xl bg-premium-success text-black font-bold text-xs text-center scale-on-click">
                  WhatsApp
                </a>
                <a href={`mailto:?subject=${encodeURIComponent(info.name)}&body=${encodeURIComponent(shareText)}`} className="py-2.5 rounded-xl bg-premium-gold text-black font-bold text-xs text-center scale-on-click">
                  Email
                </a>
                <a href={`https://t.me/share/url?url=${encodeURIComponent(formUrl)}&text=${encodeURIComponent(info.name)}`} target="_blank" rel="noopener noreferrer" className="py-2.5 rounded-xl bg-premium-neon text-black font-bold text-xs text-center scale-on-click">
                  Telegram
                </a>
                <button type="button" onClick={() => copy(shareText, 'msg')} className="py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white font-bold text-xs scale-on-click">
                  {copied === 'msg' ? 'Copied!' : 'Copy message'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RESPONSES */}
        {formTab === 'responses' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-bold text-white text-base flex items-center gap-2"><CheckSquare className="w-4 h-4 text-premium-gold" /> Responses</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Every reply sent through the live form lands here.</p>
              </div>
              <button type="button" onClick={exportCsv} disabled={responses.length === 0} className="px-3.5 py-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white font-bold text-xs scale-on-click flex items-center gap-1.5 disabled:opacity-40">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Replies', value: responses.length, color: 'text-white' },
                { label: 'Guests coming', value: attendingCount, color: 'text-premium-success' },
                { label: 'Declined', value: declinedCount, color: 'text-premium-danger' },
              ].map((s) => (
                <div key={s.label} className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-center">
                  <div className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">{s.label}</div>
                </div>
              ))}
            </div>

            {responses.length === 0 ? (
              <div className="p-8 rounded-2xl border-2 border-dashed border-premium-borderDark text-center space-y-3">
                <div className="text-sm font-bold text-white">No replies yet</div>
                <p className="text-xs text-zinc-500">Open the live form and send a test reply — it will appear here instantly.</p>
                <a href={`/events/${slug}/invitation`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-premium-gold text-black font-bold text-xs scale-on-click">
                  Open live form <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden border border-premium-borderDark divide-y divide-premium-borderDark/60">
                {responses.map((r) => (
                  <div key={r.id}>
                    <div className="flex items-center gap-3 px-4 py-3 text-xs">
                      <button type="button" onClick={() => setExpandedResponse(expandedResponse === r.id ? null : r.id)} className="flex-1 min-w-0 text-left">
                        <span className="font-bold text-white block truncate">{r.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{new Date(r.submittedAt).toLocaleString()} · {r.token}</span>
                      </button>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${r.attending ? 'bg-premium-success/15 text-premium-success border-premium-success/30' : 'bg-premium-danger/15 text-premium-danger border-premium-danger/30'}`}>
                        {r.attending ? `Yes · ${r.party}` : 'No'}
                      </span>
                      <button type="button" onClick={() => { if (confirm(`Delete the reply from ${r.name}?`)) report(deleteResponse(eventId, r.id)); }} className="text-zinc-600 hover:text-premium-danger scale-on-click" aria-label="Delete reply">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {expandedResponse === r.id && (
                      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {inv.questions.map((q) => (
                          <div key={q.id} className="p-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark">
                            <div className="text-[10px] text-zinc-500 font-bold">{q.label}</div>
                            <div className="text-xs text-white mt-0.5 break-words">{r.answers[q.id] || '—'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {responses.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  const nameQ = findQuestion(inv.questions, 'name');
                  report(addResponse(eventId, {
                    id: newId('rsp'), submittedAt: new Date().toISOString(),
                    answers: nameQ ? { [nameQ.id]: 'Test Guest' } : {},
                    name: 'Test Guest', email: '', phone: '', attending: true, party: 1, token: 'ALL41-TEST0001',
                  }));
                }}
                className="w-full text-[11px] text-zinc-500 hover:text-white font-bold"
              >
                + Add a test reply
              </button>
            )}
          </div>
        )}

        {/* PWA */}
        {formTab === 'pwa' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div>
              <h3 className="font-display font-bold text-white text-base flex items-center gap-2"><Smartphone className="w-4 h-4 text-premium-gold" /> Register Desk PWA</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Install the door scanner on any phone or tablet. It is locked with a username and passcode.</p>
            </div>

            <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-gold/30 flex items-start gap-3">
              <KeyRound className="w-4 h-4 text-premium-gold shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-300 space-y-1">
                <div className="font-bold text-white">Desk login</div>
                <div className="font-mono">Username: <span className="text-premium-gold">{config.access.username}</span> · Passcode: <span className="text-premium-gold">{config.access.passcode}</span></div>
                <div className="text-[10px] text-zinc-500">Change these in Settings → Register Desk Access.</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-center space-y-4">
              <div className="w-16 h-16 bg-premium-gold rounded-full flex items-center justify-center mx-auto shadow-gold">
                <span className="text-premium-black font-display font-bold text-2xl">41</span>
              </div>
              <div>
                <div className="text-sm font-bold text-white">all41 Register Desk</div>
                <div className="text-xs text-zinc-400 mt-0.5">Check in guests, scan QR passes, add walk-ins</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <a href={`/events/${slug}/gate`} target="_blank" rel="noopener noreferrer" className="py-3 rounded-xl bg-premium-black border border-premium-borderDark text-xs font-bold text-white flex flex-col items-center gap-1 scale-on-click hover:border-premium-gold/50">
                  <Smartphone className="w-5 h-5 text-premium-gold" /> Open Register Desk
                </a>
                <button type="button" onClick={() => copy(`${origin}/events/${slug}/gate`, 'desk')} className="py-3 rounded-xl bg-premium-gold text-black text-xs font-bold flex flex-col items-center gap-1 scale-on-click shadow-gold">
                  <LinkIcon className="w-5 h-5" /> {copied === 'desk' ? 'Copied!' : 'Copy Desk URL'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Setup steps</p>
              {[
                'Open the Register Desk link on the door phone or tablet',
                'Add it to the home screen (Share → Add to Home Screen)',
                'Sign in with the desk username and passcode',
                'Scan guest QR passes or search names to check them in',
              ].map((step, i) => (
                <div key={step} className="flex items-start gap-3 text-xs text-zinc-300">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-premium-gold text-black font-bold text-[10px] flex items-center justify-center">{i + 1}</span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {formTab === 'settings' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div>
              <h3 className="font-display font-bold text-white text-base">Settings</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Rules for the form.</p>
            </div>

            <Field label="Form name" hint="Only you see this.">
              <input value={inv.formName} onChange={(e) => setInv({ formName: e.target.value })} className={inputCls} />
            </Field>

            <div className="flex items-center justify-between gap-4 py-1">
              <div>
                <div className="text-xs font-bold text-white">Accepting responses</div>
                <div className="text-[10px] text-zinc-500">Turn off to show the “Form closed” page.</div>
              </div>
              <Toggle on={inv.accepting} label="Accepting responses" onClick={() => setInv({ accepting: !inv.accepting })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Reply by (optional)" hint="Closes the form after this day.">
                <input type="date" value={inv.replyBy} onChange={(e) => setInv({ replyBy: e.target.value })} className={`${inputCls} [color-scheme:dark]`} />
              </Field>
              <Field label="Guest limit (optional)" hint="Closes when total party size is reached.">
                <input type="number" min={0} value={inv.guestLimit} onChange={(e) => setInv({ guestLimit: e.target.value })} placeholder="200" className={inputCls} />
              </Field>
            </div>

            <Field label="Most guests per reply" hint='Caps the "how many guests" question.'>
              <input type="number" min={1} value={inv.maxPerReply} onChange={(e) => setInv({ maxPerReply: e.target.value })} className={`${inputCls} max-w-32`} />
            </Field>

            <div className="flex items-center justify-between gap-4 py-1">
              <div>
                <div className="text-xs font-bold text-white">Ask guests to review before sending</div>
                <div className="text-[10px] text-zinc-500">One last screen that lists their answers.</div>
              </div>
              <Toggle on={inv.askReview} label="Ask guests to review" onClick={() => setInv({ askReview: !inv.askReview })} />
            </div>

            <Field label="Send button says">
              <input value={inv.sendLabel} onChange={(e) => setInv({ sendLabel: e.target.value })} className={inputCls} />
            </Field>

            <div className="pt-3 border-t border-premium-borderDark/60 flex justify-end">
              <button
                type="button"
                onClick={() => { if (confirm('Reset the whole invitation form (cover, questions, closing, settings) to defaults?')) { if (inv.photoUrl) deleteAsset(inv.photoUrl); report(resetEventSection(eventId, 'invitation')); setSelectedQ(null); } }}
                className="px-4 py-2 rounded-xl border border-premium-danger/40 text-premium-danger text-xs font-bold scale-on-click flex items-center gap-1.5 hover:bg-premium-danger/10"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset form to defaults
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right: live preview */}
      <div className="xl:col-span-5 flex flex-col items-center gap-3 xl:sticky xl:top-20 self-start">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Live Preview · what guests see</span>
        <div className="w-[236px] h-[472px] rounded-[2.5rem] border-[6px] border-zinc-800 overflow-hidden shadow-2xl bg-black">
          <div style={{ width: 360, height: 740, transform: 'scale(0.6222)', transformOrigin: 'top left' }}>
            <InvitationFormView
              embedded
              info={info}
              invitation={inv}
              theme={theme}
              coverUrl={coverUrl}
              isWedding={isWedding}
              forcedScreen={previewScreen}
              forcedQuestionIndex={selectedIndex}
            />
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-1 max-w-[280px]">
          {([
            ['cover', 'Cover'], ['question', 'Question'], ['review', 'Review'], ['confirmed', 'Confirmed'], ['declined', 'Declined'], ['closed', 'Closed'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPreviewOverride(id)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border scale-on-click ${previewScreen === id ? 'border-premium-gold/60 text-premium-gold bg-premium-gold/10' : 'border-premium-borderDark text-zinc-500 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="w-full max-w-[280px] p-4 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
          <div className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest">Share form link</div>
          <div className="flex items-center gap-2 bg-premium-surfaceDark border border-premium-borderDark rounded-xl px-3 py-2">
            <span className="text-[10px] font-mono text-premium-neon flex-1 truncate">{formUrl.replace(/^https?:\/\//, '')}</span>
            <button type="button" onClick={() => copy(formUrl, 'side')} className="text-zinc-400 hover:text-white scale-on-click" aria-label="Copy link">
              {copied === 'side' ? <Check className="w-3.5 h-3.5 text-premium-success" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <a href={`/events/${slug}/invitation`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-premium-neon flex items-center gap-1 hover:underline">
            <ExternalLink className="w-3 h-3" /> Open live form
          </a>
        </div>
      </div>
    </div>
  );
}
