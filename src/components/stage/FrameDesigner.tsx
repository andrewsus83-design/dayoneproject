'use client';

import React, { useRef, useState } from 'react';
import { Check, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { deleteAsset, saveAsset, useAssetUrl, type StageFrame } from '@/lib/eventStore';
import { compressImage } from '@/lib/image';
import { FRAME_LIBRARY, FRAME_PRESETS, StageFrameShell } from './StageFrameShell';

type Slot = 'frame' | 'footer';

// PNGs keep their transparency; anything else is compressed.
async function readImage(file: File, maxW: number): Promise<{ dataUrl: string; isPng: boolean }> {
  const isPng = file.type === 'image/png';
  if (isPng && file.size < 900_000) {
    const dataUrl = await new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = () => rej(new Error('Could not read the image.'));
      fr.readAsDataURL(file);
    });
    return { dataUrl, isPng };
  }
  return { dataUrl: await compressImage(file, maxW, 0.85), isPng };
}

function UploadSlot({
  title, hint, refId, busy, onPick, onRemove,
}: { title: string; hint: string; refId?: string; busy: boolean; onPick: () => void; onRemove: () => void }) {
  const url = useAssetUrl(refId);
  return (
    <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark space-y-3">
      <div>
        <div className="text-xs font-bold text-white">{title}</div>
        <div className="text-[10px] text-zinc-500 mt-0.5">{hint}</div>
      </div>
      <div className="h-24 rounded-xl border border-dashed border-premium-borderDark bg-premium-black flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="" className="max-h-full max-w-full object-contain" /> : <ImageIcon className="w-6 h-6 text-zinc-700" />}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onPick} className="flex-1 px-3 py-2 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black text-xs font-bold scale-on-click flex items-center justify-center gap-1.5">
          <Upload className="w-3.5 h-3.5" /> {busy ? 'Uploading…' : url ? 'Replace' : 'Upload'}
        </button>
        {url && (
          <button type="button" onClick={onRemove} className="px-3 py-2 rounded-xl border border-premium-borderDark text-zinc-400 hover:text-premium-danger text-xs font-bold scale-on-click" aria-label={`Remove ${title}`}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function FrameDesigner({ value, onChange, logoRef }: { value: StageFrame; onChange: (patch: Partial<StageFrame>) => void; logoRef?: string }) {
  const frameRef = useRef<HTMLInputElement>(null);
  const footerRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (slot: Slot, file: File | undefined) => {
    if (!file) return;
    setBusy(slot);
    setError(null);
    try {
      const { dataUrl, isPng } = await readImage(file, 1920);
      const saved = saveAsset(dataUrl);
      if (!saved.ok || !saved.ref) return setError(saved.error ?? 'Could not save the image.');
      if (slot === 'frame') {
        if (value.imageUrl.startsWith('asset:')) deleteAsset(value.imageUrl);
        onChange({ preset: 'image', imageUrl: saved.ref, imageBlend: isPng ? 'normal' : 'screen' });
      } else {
        if (value.footerImageUrl?.startsWith('asset:')) deleteAsset(value.footerImageUrl);
        onChange({ footerOn: true, footerStyle: 'image', footerImageUrl: saved.ref });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(null);
      const el = slot === 'frame' ? frameRef.current : footerRef.current;
      if (el) el.value = '';
    }
  };

  const removeFrame = () => {
    if (value.imageUrl.startsWith('asset:')) deleteAsset(value.imageUrl);
    onChange({ imageUrl: '', preset: value.preset === 'image' ? 'none' : value.preset });
  };
  const removeFooter = () => {
    if (value.footerImageUrl?.startsWith('asset:')) deleteAsset(value.footerImageUrl);
    onChange({ footerImageUrl: '', footerStyle: value.footerStyle === 'image' ? 'dark' : value.footerStyle });
  };

  const input = 'w-full px-3 py-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-xs text-white outline-none focus:border-premium-gold/60';

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Bring your own design</p>
        <p className="text-[11px] text-zinc-500 mb-3">Upload artwork made in Canva, Photoshop or anywhere else. It sits on top of the screen.</p>
        <input ref={frameRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload('frame', e.target.files?.[0])} />
        <input ref={footerRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload('footer', e.target.files?.[0])} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UploadSlot
            title="Frame"
            hint="PNG, 1920×1080, with a see-through middle."
            refId={value.imageUrl.startsWith('asset:') ? value.imageUrl : undefined}
            busy={busy === 'frame'}
            onPick={() => frameRef.current?.click()}
            onRemove={removeFrame}
          />
          <UploadSlot
            title="Footer"
            hint="A wide banner, about 1920×160 (sponsors, hashtag, logos)."
            refId={value.footerImageUrl}
            busy={busy === 'footer'}
            onPick={() => footerRef.current?.click()}
            onRemove={removeFooter}
          />
        </div>
        {error && <p className="text-xs font-bold text-premium-danger mt-2">{error}</p>}
      </div>

      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Frame</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FRAME_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => (p.id === 'image' && !value.imageUrl ? frameRef.current?.click() : onChange({ preset: p.id }))}
              className={`rounded-2xl border text-left overflow-hidden scale-on-click transition-all ${value.preset === p.id ? 'border-premium-gold shadow-gold' : 'border-premium-borderDark hover:border-zinc-600'}`}
            >
              <div className="h-20 bg-premium-black">
                <StageFrameShell frame={{ ...value, preset: p.id, footerOn: false }} compact className="h-full">
                  <div className="h-full flex items-center justify-center text-[9px] font-mono text-zinc-600">STAGE</div>
                </StageFrameShell>
              </div>
              <div className="px-3 py-2 bg-premium-surfaceDark flex items-center justify-between">
                <span>
                  <span className="block text-xs font-bold text-white">{p.label}</span>
                  <span className="block text-[10px] text-zinc-500">{p.desc}</span>
                </span>
                {value.preset === p.id && <Check className="w-3.5 h-3.5 text-premium-gold" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {value.preset === 'image' && (
        <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark space-y-3">
          <div className="flex flex-wrap gap-2">
            {FRAME_LIBRARY.map((f) => (
              <button
                key={f.url}
                type="button"
                onClick={() => onChange({ imageUrl: f.url, imageBlend: 'screen' })}
                className={`px-3 py-2 rounded-xl border text-xs font-bold scale-on-click ${value.imageUrl === f.url ? 'border-premium-gold text-premium-gold' : 'border-premium-borderDark text-zinc-300 hover:text-white'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={value.imageBlend === 'screen'} onChange={(e) => onChange({ imageBlend: e.target.checked ? 'screen' : 'normal' })} className="accent-[#C5A059]" />
            Treat black areas as transparent (for frames on a black background)
          </label>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-white">Footer bar</p>
          <button
            type="button"
            onClick={() => onChange({ footerOn: !value.footerOn })}
            className={`w-11 h-6 rounded-full flex items-center transition-colors scale-on-click ${value.footerOn ? 'bg-premium-success justify-end pr-0.5' : 'bg-zinc-700 pl-0.5'}`}
            aria-label="Toggle footer"
          >
            <span className="w-5 h-5 rounded-full bg-white" />
          </button>
        </div>
        {value.footerOn && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {([
                ['dark', 'Dark'], ['gold', 'Gold'], ['glass', 'Glass'], ['image', 'Your image'],
              ] as const).map(([st, label]) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => (st === 'image' && !value.footerImageUrl ? footerRef.current?.click() : onChange({ footerStyle: st }))}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border scale-on-click ${value.footerStyle === st ? 'bg-premium-gold text-black border-premium-gold' : 'bg-premium-charcoal text-zinc-400 border-premium-borderDark hover:text-white'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {value.footerStyle !== 'image' && (
              <>
                <input value={value.footerText} onChange={(e) => onChange({ footerText: e.target.value })} placeholder="Footer text, e.g. sponsor or hashtag" className={input} />
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input type="checkbox" checked={value.footerLogo} onChange={(e) => onChange({ footerLogo: e.target.checked })} className="accent-[#C5A059]" />
                  Show event logo
                </label>
              </>
            )}
          </>
        )}
      </div>

      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Preview</p>
        <div className="aspect-video rounded-2xl overflow-hidden border border-premium-borderDark bg-premium-black">
          <StageFrameShell frame={value} logoRef={logoRef} className="h-full">
            <div className="flex-1 flex items-center justify-center">
              <span className="font-display font-bold text-2xl text-white/80">Your stage screen</span>
            </div>
          </StageFrameShell>
        </div>
      </div>
    </div>
  );
}
