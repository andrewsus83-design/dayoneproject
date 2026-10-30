'use client';

import React, { useRef, useState } from 'react';
import { Check, Upload } from 'lucide-react';
import { deleteAsset, saveAsset, type StageFrame } from '@/lib/eventStore';
import { compressImage } from '@/lib/image';
import { FRAME_LIBRARY, FRAME_PRESETS, StageFrameShell } from './StageFrameShell';

export function FrameDesigner({ value, onChange, logoRef }: { value: StageFrame; onChange: (patch: Partial<StageFrame>) => void; logoRef?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const isPng = file.type === 'image/png';
      const dataUrl = isPng && file.size < 900_000
        ? await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = () => rej(new Error('Could not read the image.')); fr.readAsDataURL(file); })
        : await compressImage(file, 1920, 0.85);
      const saved = saveAsset(dataUrl);
      if (!saved.ok || !saved.ref) return setError(saved.error ?? 'Could not save the frame.');
      if (value.imageUrl.startsWith('asset:')) deleteAsset(value.imageUrl);
      onChange({ preset: 'image', imageUrl: saved.ref, imageBlend: isPng ? 'normal' : 'screen' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const input = 'w-full px-3 py-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-xs text-white outline-none focus:border-premium-gold/60';

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Frame</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FRAME_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange({ preset: p.id })}
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
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-xl bg-premium-gold text-black text-xs font-bold scale-on-click flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> {busy ? 'Uploading…' : 'Upload frame (PNG)'}
            </button>
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
          {error && <p className="text-xs font-bold text-premium-danger">{error}</p>}
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
            <input value={value.footerText} onChange={(e) => onChange({ footerText: e.target.value })} placeholder="Footer text, e.g. sponsor or hashtag" className={input} />
            <div className="flex flex-wrap items-center gap-2">
              {(['dark', 'gold', 'glass'] as const).map((st) => (
                <button key={st} type="button" onClick={() => onChange({ footerStyle: st })} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border scale-on-click capitalize ${value.footerStyle === st ? 'bg-premium-gold text-black border-premium-gold' : 'bg-premium-charcoal text-zinc-400 border-premium-borderDark hover:text-white'}`}>
                  {st}
                </button>
              ))}
              <label className="flex items-center gap-2 text-xs text-zinc-300 ml-2 cursor-pointer">
                <input type="checkbox" checked={value.footerLogo} onChange={(e) => onChange({ footerLogo: e.target.checked })} className="accent-[#C5A059]" />
                Show event logo
              </label>
            </div>
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
