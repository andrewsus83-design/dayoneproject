'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, Check, Copy, Eye, EyeOff, ExternalLink, GripVertical, Image as ImageIcon, LayoutTemplate,
  Monitor, Plus, RotateCcw, Smartphone, Sparkles, Star, Trash2, Upload, X,
} from 'lucide-react';
import { deleteAsset, resetEventSection, saveAsset, useAssetUrl, useEventConfig, type LandingConfig, type Testimony } from '@/lib/eventStore';
import { BASE_EVENTS } from '@/lib/events';
import {
  BLOCK_CATALOG, blockId, blockTitle, createBlock,
  type BlockType, type CtaTarget, type LandingBlock, type LandingListItem, type LandingPair,
} from '@/lib/landingBlocks';
import { resolveTheme } from '@/lib/eventTheme';
import { compressImage } from '@/lib/image';
import { LandingRenderer } from '@/components/events/landing/LandingRenderer';
import { EventFonts } from '@/components/events/EventFonts';

const AI_HEROES = BASE_EVENTS.map((e) => ({ id: e.id, label: e.name.split(':')[0], url: e.cover_image_url ?? '' })).filter((h) => h.url);
const input = 'w-full px-3 py-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-xs text-white outline-none focus:border-premium-gold/60';

/* ───────── Small field helpers ───────── */

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1.5">{children}</label>;
}

function Text({ label, value, onChange, placeholder, area }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; area?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      {area ? (
        <textarea rows={4} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={`${input} resize-y`} />
      ) : (
        <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={input} />
      )}
    </div>
  );
}

function Switch({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center justify-between w-full py-1.5 text-xs text-zinc-300 scale-on-click">
      <span className="font-bold">{label}</span>
      <span className={`w-10 h-6 rounded-full flex items-center transition-colors ${on ? 'bg-premium-success justify-end pr-0.5' : 'bg-zinc-700 pl-0.5'}`}>
        <span className="w-5 h-5 rounded-full bg-white" />
      </span>
    </button>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold scale-on-click border ${value === o.id ? 'bg-premium-gold text-black border-premium-gold' : 'bg-premium-surfaceDark text-zinc-400 border-premium-borderDark hover:text-white'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorDot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative w-8 h-8 rounded-lg border border-premium-borderDark shrink-0 cursor-pointer overflow-hidden" title="Item color (optional)" style={{ background: value || 'repeating-linear-gradient(45deg,#27272A,#27272A 4px,#18181B 4px,#18181B 8px)' }}>
      <input type="color" value={value || '#C5A059'} onChange={(e) => onChange(e.target.value.toUpperCase())} className="absolute inset-0 opacity-0 cursor-pointer" />
    </label>
  );
}

function AssetThumb({ refId, className }: { refId: string; className?: string }) {
  const url = useAssetUrl(refId);
  return <div className={`bg-cover bg-center bg-premium-surfaceDark ${className ?? ''}`} style={{ backgroundImage: url ? `url(${url})` : undefined }} />;
}

function useUploader(onError: (msg: string) => void) {
  const [busy, setBusy] = useState(false);
  const upload = async (file: File | undefined, max = 1600): Promise<string | null> => {
    if (!file) return null;
    setBusy(true);
    try {
      const saved = saveAsset(await compressImage(file, max, 0.8));
      if (!saved.ok || !saved.ref) {
        onError(saved.error ?? 'Could not save the image.');
        return null;
      }
      return saved.ref;
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Upload failed.');
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { busy, upload };
}

function ImagePicker({ label, value, onChange, onError, allowAi, fallbackLabel }: { label: string; value: string; onChange: (ref: string) => void; onError: (m: string) => void; allowAi?: boolean; fallbackLabel?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const { busy, upload } = useUploader(onError);
  const [showAi, setShowAi] = useState(false);
  const set = (next: string) => {
    if (value && value !== next) deleteAsset(value);
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={async (e) => { const r = await upload(e.target.files?.[0]); if (r) set(r); if (ref.current) ref.current.value = ''; }} />
      <div className="flex items-center gap-3">
        <AssetThumb refId={value} className="w-24 h-16 rounded-xl border border-premium-borderDark shrink-0" />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => ref.current?.click()} className="px-3 py-1.5 rounded-lg bg-premium-gold text-black text-[11px] font-bold scale-on-click flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" /> {busy ? 'Compressing…' : 'Upload'}
          </button>
          {allowAi && (
            <button type="button" onClick={() => setShowAi((v) => !v)} className="px-3 py-1.5 rounded-lg bg-premium-surfaceDark border border-premium-borderDark text-white text-[11px] font-bold scale-on-click flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-premium-gold" /> AI library
            </button>
          )}
          {value && (
            <button type="button" onClick={() => set('')} className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white text-[11px] font-bold scale-on-click">
              {fallbackLabel ?? 'Remove'}
            </button>
          )}
        </div>
      </div>
      {showAi && (
        <div className="grid grid-cols-3 gap-2">
          {AI_HEROES.map((h) => (
            <button key={h.id} type="button" onClick={() => set(h.url)} className={`relative aspect-video rounded-lg overflow-hidden border-2 scale-on-click ${value === h.url ? 'border-premium-gold' : 'border-transparent'}`}>
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${h.url})` }} />
              <span className="absolute inset-x-0 bottom-0 bg-black/70 text-[9px] text-white font-bold px-1.5 py-0.5 truncate text-left">{h.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CtaFields({ label, target, url, onChange }: { label: string; target: CtaTarget; url: string; onChange: (p: { ctaLabel?: string; ctaTarget?: CtaTarget; ctaUrl?: string }) => void }) {
  return (
    <div className="space-y-3">
      <Text label="Button label" value={label} onChange={(v) => onChange({ ctaLabel: v })} placeholder="Leave empty to hide the button" />
      <Segmented<CtaTarget>
        label="Button opens"
        // 'register' (older pages) opens the invitation form too, so it shows as that.
        value={target === 'register' ? 'invitation' : target}
        onChange={(v) => onChange({ ctaTarget: v })}
        options={[{ id: 'invitation', label: 'Invitation form' }, { id: 'custom', label: 'Custom link' }]}
      />
      {target === 'custom' && <Text label="Link" value={url} onChange={(v) => onChange({ ctaUrl: v })} placeholder="https://" />}
    </div>
  );
}

function ListEditor<T extends { id: string }>({
  items, onChange, make, render, addLabel,
}: { items: T[]; onChange: (items: T[]) => void; make: () => T; render: (item: T, set: (patch: Partial<T>) => void) => React.ReactNode; addLabel: string }) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={it.id} className="p-3 rounded-xl bg-premium-black/40 border border-premium-borderDark space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 space-y-2">{render(it, (patch) => onChange(items.map((x) => (x.id === it.id ? { ...x, ...patch } : x))))}</div>
            <div className="flex flex-col gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-zinc-500 hover:text-white disabled:opacity-20 scale-on-click" aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-zinc-500 hover:text-white disabled:opacity-20 scale-on-click" aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => onChange(items.filter((x) => x.id !== it.id))} className="text-zinc-600 hover:text-premium-danger scale-on-click" aria-label="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, make()])} className="w-full py-2 rounded-xl border border-dashed border-premium-borderDark text-[11px] font-bold text-zinc-400 hover:text-white hover:border-premium-gold/50 scale-on-click flex items-center justify-center gap-1.5">
        <Plus className="w-3.5 h-3.5" /> {addLabel}
      </button>
    </div>
  );
}

/* ───────── Block inspector ───────── */

function BlockEditor({ block, set, isWedding, onError }: { block: LandingBlock; set: (patch: Partial<LandingBlock>) => void; isWedding: boolean; onError: (m: string) => void }) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const { busy, upload } = useUploader(onError);
  const p = set as (patch: Record<string, unknown>) => void;

  switch (block.type) {
    case 'hero':
      return (
        <div className="space-y-4">
          <Segmented label="Layout" value={block.layout} onChange={(v) => p({ layout: v })} options={[{ id: 'left', label: 'Left aligned' }, { id: 'center', label: 'Centered' }]} />
          <ImagePicker label="Background image" value={block.imageUrl} onChange={(r) => p({ imageUrl: r })} onError={onError} allowAi fallbackLabel="Use event cover" />
          <Switch label="Dark gradient overlay" on={block.overlay} onClick={() => p({ overlay: !block.overlay })} />
          <Segmented label="Side decoration" value={block.decoration} onChange={(v) => p({ decoration: v })} options={[{ id: 'none', label: 'None' }, { id: 'prism', label: 'Stained-glass panels' }]} />
          <Text label="Badge" value={block.badge} onChange={(v) => p({ badge: v })} placeholder="e.g. Invitation Only" />
          <Text label="Small line above the title" value={block.eyebrow} onChange={(v) => p({ eyebrow: v })} placeholder="e.g. Year-End Party 2026" />
          <Text label="Title" value={block.title} onChange={(v) => p({ title: v })} placeholder="Empty = event name" />
          <Segmented label="Title style" value={block.titleStyle} onChange={(v) => p({ titleStyle: v })} options={[{ id: 'solid', label: 'Solid' }, { id: 'gradient', label: 'Gradient (your 3 colors)' }, { id: 'prism', label: 'Prism (animated)' }]} />
          <Text label="Tagline" value={block.tagline} onChange={(v) => p({ tagline: v })} />
          <Switch label="Show event description" on={block.showDescription} onClick={() => p({ showDescription: !block.showDescription })} />
          <Segmented label="Date & venue" value={block.meta} onChange={(v) => p({ meta: v })} options={[{ id: 'inline', label: 'Inline' }, { id: 'pills', label: 'Pills' }, { id: 'none', label: 'Hidden' }]} />
          <Switch label="Countdown inside the hero" on={block.showCountdown} onClick={() => p({ showCountdown: !block.showCountdown })} />
          {block.layout === 'center' && <Switch label="Show logo above the title" on={block.showLogo} onClick={() => p({ showLogo: !block.showLogo })} />}
          <CtaFields label={block.ctaLabel} target={block.ctaTarget} url={block.ctaUrl} onChange={p} />
          <Text label="Second button" value={block.secondaryLabel} onChange={(v) => p({ secondaryLabel: v })} placeholder="e.g. Learn More — empty hides it" />
          <Text label="Small note under the buttons" value={block.note} onChange={(v) => p({ note: v })} />
        </div>
      );
    case 'countdown':
      return <Text label="Label" value={block.label} onChange={(v) => p({ label: v })} />;
    case 'details':
      return (
        <div className="space-y-1">
          <Switch label="Date" on={block.showDate} onClick={() => p({ showDate: !block.showDate })} />
          <Switch label="Venue" on={block.showVenue} onClick={() => p({ showVenue: !block.showVenue })} />
          <Switch label="Capacity" on={block.showCapacity} onClick={() => p({ showCapacity: !block.showCapacity })} />
          <Switch label="Event link" on={block.showLink} onClick={() => p({ showLink: !block.showLink })} />
          <p className="text-[10px] text-zinc-600 pt-1">Values come from Event Information.</p>
        </div>
      );
    case 'text':
      return (
        <div className="space-y-3">
          <Text label="Small label" value={block.label} onChange={(v) => p({ label: v })} />
          <Text label="Heading" value={block.heading} onChange={(v) => p({ heading: v })} />
          <Text label="Paragraph" value={block.body} onChange={(v) => p({ body: v })} area />
          <Segmented label="Alignment" value={block.align} onChange={(v) => p({ align: v })} options={[{ id: 'left', label: 'Left' }, { id: 'center', label: 'Center' }]} />
          <Switch label="Show inside a card" on={block.card} onClick={() => p({ card: !block.card })} />
        </div>
      );
    case 'features':
      return (
        <div className="space-y-3">
          <Text label="Small label" value={block.label} onChange={(v) => p({ label: v })} />
          <Text label="Heading" value={block.heading} onChange={(v) => p({ heading: v })} />
          <Segmented label="Layout" value={block.layout} onChange={(v) => p({ layout: v })} options={[{ id: 'grid', label: 'Grid of cards' }, { id: 'list', label: 'List in one card' }]} />
          <ListEditor<LandingListItem>
            items={block.items}
            onChange={(items) => p({ items })}
            addLabel="Add point"
            make={() => ({ id: blockId('i'), title: 'New point', subtitle: '', body: '', color: '' })}
            render={(it, s) => (
              <>
                <div className="flex gap-2">
                  <ColorDot value={it.color} onChange={(v) => s({ color: v })} />
                  <input value={it.title} onChange={(e) => s({ title: e.target.value })} placeholder="Title" className={input} />
                </div>
                <input value={it.subtitle} onChange={(e) => s({ subtitle: e.target.value })} placeholder="Subtitle / year (optional)" className={input} />
                <textarea rows={2} value={it.body} onChange={(e) => s({ body: e.target.value })} placeholder="Description" className={`${input} resize-y`} />
              </>
            )}
          />
        </div>
      );
    case 'gallery':
      return (
        <div className="space-y-3">
          <Text label="Small label" value={block.label} onChange={(v) => p({ label: v })} />
          <Text label="Heading" value={block.heading} onChange={(v) => p({ heading: v })} />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files || []).slice(0, Math.max(0, 12 - block.images.length));
              const added: { id: string; url: string }[] = [];
              for (const f of files) {
                const r = await upload(f, 1000);
                if (!r) break;
                added.push({ id: blockId('g'), url: r });
              }
              if (added.length) p({ images: [...block.images, ...added] });
              if (galleryRef.current) galleryRef.current.value = '';
            }}
          />
          <div className="grid grid-cols-4 gap-2">
            {block.images.map((img) => (
              <div key={img.id} className="relative aspect-square">
                <AssetThumb refId={img.url} className="absolute inset-0 rounded-lg" />
                <button type="button" onClick={() => { deleteAsset(img.url); p({ images: block.images.filter((x) => x.id !== img.id) }); }} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center hover:bg-premium-danger scale-on-click" aria-label="Remove photo">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {block.images.length < 12 && (
              <button type="button" onClick={() => galleryRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-premium-borderDark flex flex-col items-center justify-center text-zinc-500 hover:border-premium-gold/50 scale-on-click">
                <Plus className="w-4 h-4" />
                <span className="text-[9px]">{busy ? 'Adding…' : 'Add'}</span>
              </button>
            )}
          </div>
          <p className="text-[10px] text-zinc-600">{block.images.length} / 12 photos · compressed automatically</p>
        </div>
      );
    case 'testimonials':
      return (
        <div className="space-y-3">
          <Text label="Small label" value={block.label} onChange={(v) => p({ label: v })} />
          <Text label="Heading" value={block.heading} onChange={(v) => p({ heading: v })} />
          <ListEditor<Testimony>
            items={block.items}
            onChange={(items) => p({ items })}
            addLabel="Add testimonial"
            make={() => ({ id: blockId('t'), name: 'Name', role: isWedding ? 'Friend' : 'Guest', text: 'What they said…', rating: 5 })}
            render={(it, s) => (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <input value={it.name} onChange={(e) => s({ name: e.target.value })} placeholder="Name" className={input} />
                  <input value={it.role} onChange={(e) => s({ role: e.target.value })} placeholder="Role" className={input} />
                </div>
                <textarea rows={2} value={it.text} onChange={(e) => s({ text: e.target.value })} className={`${input} resize-y`} />
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => s({ rating: n })} className="scale-on-click" aria-label={`${n} stars`}>
                      <Star className={`w-4 h-4 ${n <= it.rating ? 'fill-premium-gold text-premium-gold' : 'text-zinc-700'}`} />
                    </button>
                  ))}
                </div>
              </>
            )}
          />
        </div>
      );
    case 'quote':
      return (
        <div className="space-y-3">
          <Text label="Quote" value={block.text} onChange={(v) => p({ text: v })} area />
          <Text label="Author / source" value={block.author} onChange={(v) => p({ author: v })} />
        </div>
      );
    case 'facts':
      return (
        <div className="space-y-3">
          <Text label="Small label" value={block.label} onChange={(v) => p({ label: v })} />
          <Text label="Heading" value={block.heading} onChange={(v) => p({ heading: v })} />
          <ListEditor<LandingPair>
            items={block.items}
            onChange={(items) => p({ items })}
            addLabel="Add fact"
            make={() => ({ id: blockId('f'), label: 'Label', value: 'Value', color: '' })}
            render={(it, s) => (
              <div className="grid grid-cols-2 gap-2">
                <input value={it.label} onChange={(e) => s({ label: e.target.value })} placeholder="Label" className={input} />
                <input value={it.value} onChange={(e) => s({ value: e.target.value })} placeholder="Value" className={input} />
              </div>
            )}
          />
        </div>
      );
    case 'stats':
      return (
        <div className="space-y-3">
          <Text label="Small label" value={block.label} onChange={(v) => p({ label: v })} />
          <Text label="Big heading" value={block.heading} onChange={(v) => p({ heading: v })} />
          <Text label="Line under the heading" value={block.subheading} onChange={(v) => p({ subheading: v })} />
          <ListEditor<LandingPair>
            items={block.items}
            onChange={(items) => p({ items })}
            addLabel="Add number"
            make={() => ({ id: blockId('s'), label: 'Label', value: '100', color: '' })}
            render={(it, s) => (
              <div className="flex gap-2">
                <ColorDot value={it.color} onChange={(v) => s({ color: v })} />
                <input value={it.value} onChange={(e) => s({ value: e.target.value })} placeholder="Number" className={input} />
                <input value={it.label} onChange={(e) => s({ label: e.target.value })} placeholder="Label" className={input} />
              </div>
            )}
          />
          <div className="grid grid-cols-2 gap-2">
            <Text label="Footer note" value={block.note} onChange={(v) => p({ note: v })} />
            <Text label="Footer highlight" value={block.noteValue} onChange={(v) => p({ noteValue: v })} />
          </div>
        </div>
      );
    case 'venue':
      return (
        <div className="space-y-3">
          <Text label="Small label" value={block.label} onChange={(v) => p({ label: v })} />
          <Text label="Heading" value={block.heading} onChange={(v) => p({ heading: v })} />
          <Text label="About the venue" value={block.body} onChange={(v) => p({ body: v })} area />
          <Label>Getting there tips</Label>
          <ListEditor<LandingPair>
            items={block.tips}
            onChange={(tips) => p({ tips })}
            addLabel="Add tip"
            make={() => ({ id: blockId('v'), label: '📍', value: 'Tip', color: '' })}
            render={(it, s) => (
              <div className="flex gap-2">
                <ColorDot value={it.color} onChange={(v) => s({ color: v })} />
                <input value={it.label} onChange={(e) => s({ label: e.target.value })} className={`${input} w-14 text-center`} aria-label="Icon (emoji)" />
                <input value={it.value} onChange={(e) => s({ value: e.target.value })} placeholder="Tip text" className={input} />
              </div>
            )}
          />
          <Switch label='"Get directions" button' on={block.showDirections} onClick={() => p({ showDirections: !block.showDirections })} />
        </div>
      );
    case 'image':
      return (
        <div className="space-y-3">
          <ImagePicker label="Image" value={block.url} onChange={(r) => p({ url: r })} onError={onError} allowAi />
          <Text label="Caption" value={block.caption} onChange={(v) => p({ caption: v })} />
          <Switch label="Full width" on={block.fullWidth} onClick={() => p({ fullWidth: !block.fullWidth })} />
        </div>
      );
    case 'cta':
      return (
        <div className="space-y-3">
          <Text label="Small label" value={block.label} onChange={(v) => p({ label: v })} />
          <Text label="Heading" value={block.heading} onChange={(v) => p({ heading: v })} />
          <Text label="Message" value={block.body} onChange={(v) => p({ body: v })} area />
          <CtaFields label={block.ctaLabel} target={block.ctaTarget} url={block.ctaUrl} onChange={p} />
          <Text label="Small note" value={block.note} onChange={(v) => p({ note: v })} />
        </div>
      );
  }
}

/* ───────── Main builder ───────── */

export function LandingPageBuilder({ eventId }: { eventId: string }) {
  const { config, event, update, savedAt } = useEventConfig(eventId);
  const { landing, info } = config;
  const isWedding = event.event_type === 'wedding';
  const theme = useMemo(() => resolveTheme(config.design), [config.design]);

  const [selected, setSelected] = useState<string | null>(landing.blocks[0]?.id ?? null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const report = (r: { ok: boolean; error?: string }) => setError(r.ok ? null : r.error ?? 'Could not save.');
  const setLanding = (patch: Partial<LandingConfig>) => report(update('landing', patch));
  const setBlocks = (blocks: LandingBlock[]) => setLanding({ blocks });
  const patchBlock = (id: string, patch: Partial<LandingBlock>) =>
    setBlocks(landing.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as LandingBlock) : b)));

  const move = (id: string, d: -1 | 1) => {
    const i = landing.blocks.findIndex((b) => b.id === id);
    const j = i + d;
    if (i < 0 || j < 0 || j >= landing.blocks.length) return;
    const next = [...landing.blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
  };
  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const next = [...landing.blocks];
    const from = next.findIndex((b) => b.id === dragId);
    const to = next.findIndex((b) => b.id === targetId);
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setBlocks(next);
    setDragId(null);
  };
  const addBlock = (type: BlockType) => {
    const block = createBlock(type, isWedding);
    const at = selected ? landing.blocks.findIndex((b) => b.id === selected) + 1 : landing.blocks.length;
    const next = [...landing.blocks];
    next.splice(at > 0 ? at : next.length, 0, block);
    setBlocks(next);
    setSelected(block.id);
    setShowCatalog(false);
  };
  const duplicate = (b: LandingBlock) => {
    const copy = { ...structuredClone(b), id: blockId() } as LandingBlock;
    const i = landing.blocks.findIndex((x) => x.id === b.id);
    const next = [...landing.blocks];
    next.splice(i + 1, 0, copy);
    setBlocks(next);
    setSelected(copy.id);
  };
  const remove = (b: LandingBlock) => {
    if (!confirm(`Remove the “${blockTitle(b)}” block?`)) return;
    setBlocks(landing.blocks.filter((x) => x.id !== b.id));
    if (selected === b.id) setSelected(null);
  };

  const frame = device === 'mobile' ? { w: 390, h: 844, scale: 0.6 } : { w: 1280, h: 860, scale: 0.36 };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-6 items-start">
      <EventFonts href={theme.fontsHref} />

      <div className="space-y-4 min-w-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-zinc-400">
            <LayoutTemplate className="w-3.5 h-3.5 inline mr-1 text-premium-gold" />
            {landing.blocks.length} blocks · click one to edit, drag to reorder
          </p>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            {savedAt && (
              <span className="text-premium-success flex items-center gap-1">
                <Check className="w-3 h-3" /> Auto-saved {new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-xs font-bold flex items-center justify-between gap-3">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="scale-on-click" aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        <div className="space-y-2">
          {landing.blocks.map((b, idx) => {
            const open = selected === b.id;
            return (
              <div
                key={b.id}
                draggable
                onDragStart={() => setDragId(b.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropOn(b.id)}
                onDragEnd={() => setDragId(null)}
                className={`rounded-2xl border transition-colors ${open ? 'bg-premium-charcoal border-premium-gold/50' : 'bg-premium-charcoal border-premium-borderDark'} ${dragId === b.id ? 'opacity-50' : ''} ${b.hidden ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-2.5 p-3">
                  <GripVertical className="w-3.5 h-3.5 text-zinc-600 shrink-0 cursor-grab" />
                  <span className="text-[10px] font-mono text-zinc-600 w-4 shrink-0">{idx + 1}</span>
                  <button type="button" onClick={() => setSelected(open ? null : b.id)} className="flex-1 min-w-0 text-left">
                    <span className="block text-xs font-bold text-white truncate">{blockTitle(b)}</span>
                    {b.hidden && <span className="text-[10px] text-zinc-500">Hidden on the live page</span>}
                  </button>
                  <button type="button" onClick={() => patchBlock(b.id, { hidden: !b.hidden })} className="text-zinc-500 hover:text-white scale-on-click" aria-label={b.hidden ? 'Show block' : 'Hide block'} title={b.hidden ? 'Show' : 'Hide'}>
                    {b.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button type="button" onClick={() => move(b.id, -1)} disabled={idx === 0} className="text-zinc-500 hover:text-white disabled:opacity-20 scale-on-click" aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => move(b.id, 1)} disabled={idx === landing.blocks.length - 1} className="text-zinc-500 hover:text-white disabled:opacity-20 scale-on-click" aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => duplicate(b)} className="text-zinc-500 hover:text-white scale-on-click" aria-label="Duplicate block" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => remove(b)} className="text-zinc-600 hover:text-premium-danger scale-on-click" aria-label="Remove block" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                {open && (
                  <div className="px-4 pb-4 pt-2 border-t border-premium-borderDark/60">
                    <BlockEditor block={b} set={(patch) => patchBlock(b.id, patch)} isWedding={isWedding} onError={setError} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowCatalog((v) => !v)}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-premium-borderDark text-zinc-300 text-xs font-bold hover:border-premium-gold/50 flex items-center justify-center gap-2 scale-on-click"
        >
          <Plus className="w-4 h-4" /> Add a block {selected ? 'after the selected one' : 'at the end'}
        </button>
        {showCatalog && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-2xl bg-premium-surfaceDark border border-premium-gold/30">
            {BLOCK_CATALOG.map((c) => (
              <button key={c.type} type="button" onClick={() => addBlock(c.type)} className="p-3 rounded-xl bg-premium-charcoal border border-premium-borderDark text-left hover:border-premium-gold/50 scale-on-click">
                <div className="text-xs font-bold text-white">{c.label}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{c.desc}</div>
              </button>
            ))}
          </div>
        )}

        <div className="p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Footer</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input value={landing.footerTitle} onChange={(e) => setLanding({ footerTitle: e.target.value })} placeholder="Big footer title (optional)" className={input} />
            <input value={landing.footerTagline} onChange={(e) => setLanding({ footerTagline: e.target.value })} placeholder="Tagline (optional)" className={input} />
            <input value={landing.footerText} onChange={(e) => setLanding({ footerText: e.target.value })} placeholder="Small print (optional)" className={input} />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a href={`/events/${info.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black text-sm font-bold scale-on-click shadow-gold">
            <ExternalLink className="w-4 h-4" /> Open live landing page
          </a>
          <button
            type="button"
            onClick={() => { if (confirm('Reset the landing page to its default blocks? Uploaded photos stay in the library until removed.')) { report(resetEventSection(eventId, 'landing')); setSelected(null); } }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-zinc-500 hover:text-white text-xs font-bold scale-on-click"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset to default blocks
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 xl:sticky xl:top-20">
        <div className="flex items-center gap-1 bg-premium-surfaceDark p-1 rounded-xl border border-premium-borderDark">
          {([['mobile', Smartphone, 'Phone'], ['desktop', Monitor, 'Desktop']] as const).map(([id, Icon, label]) => (
            <button key={id} type="button" onClick={() => setDevice(id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold scale-on-click ${device === id ? 'bg-premium-gold text-black' : 'text-zinc-400 hover:text-white'}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
        <div
          className="overflow-hidden border-[6px] border-zinc-800 shadow-2xl bg-black"
          style={{ width: frame.w * frame.scale + 12, height: frame.h * frame.scale + 12, borderRadius: device === 'mobile' ? 36 : 14 }}
        >
          <div style={{ width: frame.w, height: frame.h, transform: `scale(${frame.scale})`, transformOrigin: 'top left' }} className="overflow-y-auto overflow-x-hidden">
            <LandingRenderer
              embedded
              slug={info.slug}
              info={info}
              landing={landing}
              design={config.design}
              theme={theme}
              isWedding={isWedding}
              defaultCover={event.cover_image_url ?? ''}
              selectedId={selected}
              onSelect={(id) => setSelected(id)}
            />
          </div>
        </div>
        <p className="text-[10px] text-zinc-500 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Click a section in the preview to edit it</p>
      </div>
    </div>
  );
}
