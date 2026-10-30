'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Image as ImageIcon, Type, AlignLeft, Info, BookOpen, Grid3X3, Sparkles, Upload, Plus, Trash2, Eye, EyeOff,
  Check, Star, Quote, X as XIcon, Smartphone, ExternalLink, RotateCcw,
} from 'lucide-react';
import {
  deleteAsset, formatEventDate, formatEventTime, newId, resetEventSection, saveAsset, useAssetUrl, useEventConfig,
  type EventInfo, type LandingConfig,
} from '@/lib/eventStore';
import { BASE_EVENTS } from '@/lib/events';
import { resolveTheme, type ResolvedTheme } from '@/lib/eventTheme';
import { compressImage } from '@/lib/image';

type LandingSubTab = 'hero' | 'gallery' | 'testimony' | 'info' | 'title' | 'subtitle' | 'notes';

const MAX_GALLERY = 12;
const AI_HEROES = BASE_EVENTS.map((e) => ({ id: e.id, label: e.name.split(':')[0], url: e.cover_image_url ?? '' })).filter((h) => h.url);

const inputCls =
  'w-full px-3 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-xs text-white outline-none focus:border-premium-gold/60';

function SubNav({ active, onChange }: { active: LandingSubTab; onChange: (t: LandingSubTab) => void }) {
  const tabs: { id: LandingSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'hero', label: 'Hero Image', icon: ImageIcon },
    { id: 'gallery', label: 'Photo Gallery', icon: Grid3X3 },
    { id: 'testimony', label: 'Testimony', icon: Quote },
    { id: 'info', label: 'Core Information', icon: Info },
    { id: 'title', label: 'Title', icon: Type },
    { id: 'subtitle', label: 'Subtitle / Label', icon: AlignLeft },
    { id: 'notes', label: 'Notes', icon: BookOpen },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold scale-on-click transition-all whitespace-nowrap ${
            active === t.id
              ? 'bg-premium-gold/15 text-premium-gold border border-premium-gold/40'
              : 'bg-premium-surfaceDark text-zinc-400 border border-premium-borderDark hover:text-white'
          }`}
        >
          <t.icon className="w-3.5 h-3.5" />
          {t.label}
        </button>
      ))}
    </div>
  );
}

function OnOff({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs scale-on-click ${on ? 'bg-premium-gold text-black shadow-gold' : 'bg-zinc-800 text-zinc-400'}`}
    >
      {on ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      {on ? 'ON' : 'OFF'}
    </button>
  );
}

function GalleryThumb({ refId, onRemove }: { refId: string; onRemove: () => void }) {
  const url = useAssetUrl(refId);
  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800 group">
      {url && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${url})` }} />}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center hover:bg-premium-danger scale-on-click"
        aria-label="Remove photo"
      >
        <Trash2 className="w-3.5 h-3.5 text-white" />
      </button>
    </div>
  );
}

function PreviewGalleryCell({ refId, theme }: { refId: string; theme: ResolvedTheme }) {
  const url = useAssetUrl(refId);
  return <div className="aspect-square rounded bg-cover bg-center" style={{ backgroundColor: theme.surface, backgroundImage: url ? `url(${url})` : undefined }} />;
}

function PhonePreview({ info, landing, heroUrl, theme }: { info: EventInfo; landing: LandingConfig; heroUrl: string; theme: ResolvedTheme }) {
  const line = [formatEventDate(info.startDate, 'short'), formatEventTime(info.startTime), info.venue].filter(Boolean).join(' · ');
  return (
    <div className="shrink-0 w-[210px] h-[420px] rounded-[2.5rem] border-4 border-zinc-700 overflow-hidden shadow-2xl relative flex flex-col" style={{ background: theme.bg, fontFamily: theme.bodyFamily }}>
      <div className="absolute inset-x-0 top-0 h-6 flex items-center justify-center z-10">
        <div className="w-20 h-4 rounded-b-xl bg-zinc-800" />
      </div>
      <div className="flex-1 overflow-y-auto pt-5">
        <div className="relative h-32" style={{ background: theme.surface }}>
          {heroUrl && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroUrl})` }} />}
          {landing.heroOverlay && <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-transparent" />}
          <div className="absolute inset-x-0 bottom-0 h-12" style={{ background: `linear-gradient(180deg, transparent, ${theme.bg})` }} />
        </div>
        <div className="px-4 pt-1 space-y-1.5 pb-4" style={{ color: theme.text }}>
          {landing.badge && (
            <span className="inline-block text-[7px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${theme.primary}26`, color: theme.primaryText }}>
              {landing.badge}
            </span>
          )}
          {landing.subtitle && <div className="text-[8px] font-mono uppercase tracking-widest" style={{ color: theme.accentText }}>{landing.subtitle}</div>}
          <div className="text-sm font-bold leading-tight" style={{ fontFamily: theme.headingFamily }}>{info.name || 'Event Title'}</div>
          <div className="text-[8px]" style={{ color: theme.muted }}>{line || 'Date · Venue'}</div>
          {landing.notesOn && landing.notesText && (
            <div className="text-[8px] italic pl-2" style={{ color: theme.muted, borderLeft: `1px solid ${theme.primary}` }}>{landing.notesText}</div>
          )}
          {landing.galleryOn && landing.gallery.length > 0 && (
            <div className="grid grid-cols-3 gap-0.5 mt-1">
              {landing.gallery.slice(0, 6).map((p) => <PreviewGalleryCell key={p.id} refId={p.url} theme={theme} />)}
            </div>
          )}
          {landing.testimoniesOn && landing.testimonies[0] && (
            <div className="rounded-xl px-3 py-2 mt-1" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <div className="text-[8px] italic">&ldquo;{landing.testimonies[0].text}&rdquo;</div>
              <div className="text-[7px] mt-0.5" style={{ color: theme.subtle }}>— {landing.testimonies[0].name}</div>
            </div>
          )}
          <div className="w-full py-1.5 font-bold text-[9px] mt-2 text-center" style={{ background: theme.primary, color: theme.onPrimary, borderRadius: Math.min(theme.buttonRadius, 10) }}>
            {landing.ctaLabel || 'Register Now'}
          </div>
          {landing.ctaSub && <div className="text-[7px] text-center" style={{ color: theme.subtle }}>{landing.ctaSub}</div>}
        </div>
      </div>
    </div>
  );
}

export function LandingPageBuilder({ eventId }: { eventId: string }) {
  const { config, event, update, savedAt } = useEventConfig(eventId);
  const { landing, info } = config;
  const isWedding = event.event_type === 'wedding';
  const theme = useMemo(() => resolveTheme(config.design), [config.design]);
  const heroAsset = useAssetUrl(landing.heroUrl);
  const heroUrl = heroAsset || event.cover_image_url || '';

  const [subTab, setSubTab] = useState<LandingSubTab>('hero');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [newTestimony, setNewTestimony] = useState({ name: '', role: '', text: '', rating: 5 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showAiPicker, setShowAiPicker] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const report = (r: { ok: boolean; error?: string }) => setError(r.ok ? null : r.error ?? 'Could not save.');
  const setLanding = (patch: Partial<LandingConfig>) => report(update('landing', patch));
  const setInfo = (patch: Partial<EventInfo>) => report(update('info', patch));

  const replaceHero = (ref: string) => {
    if (landing.heroUrl && landing.heroUrl !== ref) deleteAsset(landing.heroUrl);
    setLanding({ heroUrl: ref });
  };

  const uploadHero = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const saved = saveAsset(await compressImage(file, 1920, 0.8));
      if (!saved.ok || !saved.ref) return report(saved);
      replaceHero(saved.ref);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (heroInputRef.current) heroInputRef.current.value = '';
    }
  };

  const uploadGallery = async (files: File[]) => {
    if (!files.length) return;
    const room = MAX_GALLERY - landing.gallery.length;
    if (room <= 0) return setError(`The gallery holds up to ${MAX_GALLERY} photos.`);
    setBusy(true);
    const added: { id: string; url: string }[] = [];
    try {
      for (const file of files.slice(0, room)) {
        const saved = saveAsset(await compressImage(file, 1000, 0.75));
        if (!saved.ok || !saved.ref) {
          report(saved);
          break;
        }
        added.push({ id: newId('ph'), url: saved.ref });
      }
      if (added.length) setLanding({ gallery: [...landing.gallery, ...added] });
      if (files.length > room) setError(`Only ${room} more photo${room === 1 ? '' : 's'} fit — the gallery holds ${MAX_GALLERY}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const line = [formatEventDate(info.startDate), formatEventTime(info.startTime), info.venue].filter(Boolean).join(' · ');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
      <div className="space-y-5 min-w-0">
        <SubNav active={subTab} onChange={setSubTab} />

        {error && (
          <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-xs font-bold flex items-center justify-between gap-3">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="scale-on-click" aria-label="Dismiss"><XIcon className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {subTab === 'hero' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div>
              <h4 className="font-display font-bold text-white">Hero / Cover Image</h4>
              <p className="text-xs text-zinc-400 mt-0.5">Full-bleed banner at the top of the landing page.</p>
            </div>
            <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadHero(e.target.files?.[0])} />

            <div className="relative rounded-2xl overflow-hidden h-48 bg-premium-surfaceDark">
              {heroUrl && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroUrl})` }} />}
              {landing.heroOverlay && <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 border border-white/15 text-[10px] font-mono text-white">
                {landing.heroUrl ? (landing.heroUrl.startsWith('asset:') ? 'Your upload' : 'AI gallery') : 'Event default'}
              </div>
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => heroInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-black/70 border border-white/20 text-white text-[11px] font-bold scale-on-click flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> {busy ? 'Compressing…' : 'Upload'}
                </button>
                {landing.heroUrl && (
                  <button
                    type="button"
                    onClick={() => replaceHero('')}
                    className="px-3 py-1.5 rounded-xl bg-black/70 border border-white/20 text-white text-[11px] font-bold scale-on-click flex items-center gap-1.5 hover:bg-premium-danger"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Default
                  </button>
                )}
              </div>
            </div>
            <p className="text-[10px] text-zinc-500">JPG, PNG or WebP · large photos are compressed automatically.</p>

            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-300">Dark gradient overlay</span>
              <button
                type="button"
                onClick={() => setLanding({ heroOverlay: !landing.heroOverlay })}
                className={`px-3 py-1.5 rounded-xl font-bold scale-on-click ${landing.heroOverlay ? 'bg-premium-gold text-black' : 'bg-zinc-800 text-zinc-400'}`}
              >
                {landing.heroOverlay ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark/60 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-premium-gold" /> AI-generated hero images
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Cinematic banners from the all41 library</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAiPicker((v) => !v)}
                  className="px-3.5 py-2 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-bold text-xs shadow-gold scale-on-click"
                >
                  {showAiPicker ? 'Close' : 'Browse'}
                </button>
              </div>
              {showAiPicker && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AI_HEROES.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => replaceHero(h.url)}
                      className={`relative aspect-video rounded-xl overflow-hidden border-2 scale-on-click ${landing.heroUrl === h.url ? 'border-premium-gold' : 'border-transparent hover:border-premium-gold/50'}`}
                    >
                      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${h.url})` }} />
                      <div className="absolute inset-x-0 bottom-0 px-2 py-1 bg-black/70 text-[9px] text-white font-bold truncate text-left">{h.label}</div>
                      {landing.heroUrl === h.url && <Check className="absolute top-1.5 right-1.5 w-4 h-4 text-premium-gold" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {subTab === 'gallery' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display font-bold text-white">Photo Gallery Section</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Masonry grid shown on the landing page.</p>
              </div>
              <OnOff on={landing.galleryOn} onClick={() => setLanding({ galleryOn: !landing.galleryOn })} />
            </div>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => uploadGallery(Array.from(e.target.files || []))}
            />
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {landing.gallery.map((p) => (
                <GalleryThumb
                  key={p.id}
                  refId={p.url}
                  onRemove={() => {
                    deleteAsset(p.url);
                    setLanding({ gallery: landing.gallery.filter((x) => x.id !== p.id) });
                  }}
                />
              ))}
              {landing.gallery.length < MAX_GALLERY && (
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-premium-borderDark bg-premium-surfaceDark flex flex-col items-center justify-center gap-1 hover:border-premium-gold/50 transition-colors scale-on-click"
                >
                  <Plus className="w-5 h-5 text-zinc-400" />
                  <span className="text-[10px] text-zinc-500">{busy ? 'Adding…' : 'Add photos'}</span>
                </button>
              )}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">
              {landing.gallery.length} / {MAX_GALLERY} photos{!landing.galleryOn && landing.gallery.length > 0 ? ' · section is OFF, turn it ON to show it' : ''}
            </div>
          </div>
        )}

        {subTab === 'testimony' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display font-bold text-white">Testimonies / Quotes</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Social proof cards shown before the call-to-action.</p>
              </div>
              <OnOff on={landing.testimoniesOn} onClick={() => setLanding({ testimoniesOn: !landing.testimoniesOn })} />
            </div>

            <div className="space-y-3">
              {landing.testimonies.map((t) => (
                <div key={t.id} className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-premium-gold text-premium-gold" />)}
                    </div>
                    <p className="text-xs italic text-zinc-300">&ldquo;{t.text}&rdquo;</p>
                    <p className="text-[10px] text-zinc-500 mt-1 font-bold">{t.name}{t.role ? ` · ${t.role}` : ''}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLanding({ testimonies: landing.testimonies.filter((x) => x.id !== t.id) })}
                    className="shrink-0 text-zinc-600 hover:text-premium-danger scale-on-click"
                    aria-label="Delete testimony"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark/60 space-y-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Add testimony</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={newTestimony.name} onChange={(e) => setNewTestimony((p) => ({ ...p, name: e.target.value }))} placeholder="Name" className={inputCls} />
                <input value={newTestimony.role} onChange={(e) => setNewTestimony((p) => ({ ...p, role: e.target.value }))} placeholder={isWedding ? 'Relation' : 'Role / Company'} className={inputCls} />
              </div>
              <textarea rows={2} value={newTestimony.text} onChange={(e) => setNewTestimony((p) => ({ ...p, text: e.target.value }))} placeholder="Their testimonial…" className={`${inputCls} resize-none`} />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setNewTestimony((p) => ({ ...p, rating: s }))} className="scale-on-click" aria-label={`${s} stars`}>
                      <Star className={`w-4 h-4 ${s <= newTestimony.rating ? 'fill-premium-gold text-premium-gold' : 'text-zinc-700'}`} />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={!newTestimony.name.trim() || !newTestimony.text.trim()}
                  onClick={() => {
                    setLanding({ testimonies: [...landing.testimonies, { id: newId('t'), ...newTestimony, name: newTestimony.name.trim(), text: newTestimony.text.trim() }], testimoniesOn: true });
                    setNewTestimony({ name: '', role: '', text: '', rating: 5 });
                  }}
                  className="px-4 py-1.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-bold text-xs scale-on-click disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {subTab === 'info' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
            <div>
              <h4 className="font-display font-bold text-white">Core Event Information</h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">Shared with Event Information and the invitation form.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Event Date</label>
                <input type="date" value={info.startDate} onChange={(e) => setInfo({ startDate: e.target.value })} className={`${inputCls} [color-scheme:dark]`} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Event Time</label>
                <input type="time" value={info.startTime} onChange={(e) => setInfo({ startTime: e.target.value })} className={`${inputCls} [color-scheme:dark]`} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Venue / Hall</label>
                <input value={info.venue} onChange={(e) => setInfo({ venue: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">City / Country</label>
                <input value={info.city} onChange={(e) => setInfo({ city: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Capacity (guests)</label>
                <input type="number" min={1} value={info.capacity} onChange={(e) => setInfo({ capacity: Math.max(0, parseInt(e.target.value || '0', 10)) })} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{isWedding ? 'Dress Code' : 'Attire'}</label>
                <input value={landing.dressCode} onChange={(e) => setLanding({ dressCode: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-[10px] font-mono text-zinc-400">Preview: {line}</div>
          </div>
        )}

        {subTab === 'title' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
            <h4 className="font-display font-bold text-white">Event Title & CTA Button</h4>
            {([
              { label: 'Main Title', value: info.name, onChange: (v: string) => setInfo({ name: v }), hint: 'The event name — shown as the big headline' },
              { label: 'CTA Button Label', value: landing.ctaLabel, onChange: (v: string) => setLanding({ ctaLabel: v }), hint: 'Main call-to-action text' },
              { label: 'CTA Sub-label', value: landing.ctaSub, onChange: (v: string) => setLanding({ ctaSub: v }), hint: 'Small text beneath the bottom button' },
            ]).map((f) => (
              <div key={f.label} className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{f.label}</label>
                <input value={f.value} onChange={(e) => f.onChange(e.target.value)} className={`${inputCls} text-sm`} />
                <p className="text-[10px] text-zinc-600">{f.hint}</p>
              </div>
            ))}
          </div>
        )}

        {subTab === 'subtitle' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
            <h4 className="font-display font-bold text-white">Subtitle & Label Badge</h4>
            {([
              { label: 'Subtitle / Tagline', value: landing.subtitle, onChange: (v: string) => setLanding({ subtitle: v }), hint: 'Optional line above the main title — leave empty to hide' },
              { label: 'Label Badge', value: landing.badge, onChange: (v: string) => setLanding({ badge: v }), hint: 'Small pill badge, e.g. "Invitation Only"' },
            ]).map((f) => (
              <div key={f.label} className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{f.label}</label>
                <input value={f.value} onChange={(e) => f.onChange(e.target.value)} className={`${inputCls} text-sm`} />
                <p className="text-[10px] text-zinc-600">{f.hint}</p>
              </div>
            ))}
          </div>
        )}

        {subTab === 'notes' && (
          <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display font-bold text-white">Notes / Verse / Quote</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Optional text shown below the core information.</p>
              </div>
              <OnOff on={landing.notesOn} onClick={() => setLanding({ notesOn: !landing.notesOn })} />
            </div>
            <textarea
              rows={4}
              value={landing.notesText}
              onChange={(e) => setLanding({ notesText: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-sm text-white italic outline-none focus:border-premium-gold/60 resize-none"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-300 text-sm font-bold scale-on-click hover:border-zinc-600 lg:hidden"
            >
              <Smartphone className="w-4 h-4" /> Preview
            </button>
            <a
              href={`/events/${info.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-300 text-sm font-bold scale-on-click hover:border-premium-gold/50"
            >
              <ExternalLink className="w-4 h-4" /> Open landing page
            </a>
            <button
              type="button"
              onClick={() => {
                if (!confirm('Reset the landing page sections to defaults? Uploaded photos will be removed.')) return;
                if (landing.heroUrl) deleteAsset(landing.heroUrl);
                landing.gallery.forEach((p) => deleteAsset(p.url));
                report(resetEventSection(eventId, 'landing'));
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-zinc-500 hover:text-white text-xs font-bold scale-on-click"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
          <div className="flex items-center gap-3">
            {savedAt && (
              <span className="text-[11px] font-mono text-premium-success flex items-center gap-1">
                <Check className="w-3 h-3" /> Auto-saved {new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSaved(true);
                setTimeout(() => setSaved(false), 1800);
              }}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm scale-on-click transition-all ${saved ? 'bg-premium-success text-black' : 'bg-premium-gold hover:bg-premium-goldHover text-black shadow-gold'}`}
            >
              {saved ? '✓ Saved' : 'Save Landing Page'}
            </button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-col items-center gap-3 pt-[3.5rem]">
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Live Preview</span>
        <PhonePreview info={info} landing={landing} heroUrl={heroUrl} theme={theme} />
      </div>

      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 lg:hidden" onClick={() => setShowPreviewModal(false)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setShowPreviewModal(false)} className="absolute -top-10 right-0 p-2 text-zinc-400 hover:text-white scale-on-click" aria-label="Close preview">
              <XIcon className="w-5 h-5" />
            </button>
            <PhonePreview info={info} landing={landing} heroUrl={heroUrl} theme={theme} />
          </div>
        </div>
      )}
    </div>
  );
}
