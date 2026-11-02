'use client';

import React, { useRef, useState } from 'react';
import { Check, Loader2, Trash2, X } from 'lucide-react';
import { FRAME_PRESETS } from '@/components/stage/StageFrameShell';
import { imageForScreen, removeMediaFiles, saveScreenChrome, uploadMedia, type Screen } from '@/lib/screensApi';
import { chromeFiles, normalizeChrome, type ChromeFooter, type ScreenChrome } from '@/lib/screenChrome';
import { DESIGN_HEIGHT, FitBox, designWidth } from './ScreenView';
import { ScreenChromeView, type ChromeEvent } from './ScreenChromeView';

const input = 'w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2.5 rounded-xl text-sm outline-none focus:border-premium-gold placeholder:text-zinc-600';
const label = 'text-[10px] font-mono uppercase tracking-widest text-zinc-500';
const pill = (on: boolean) =>
  `px-3 py-2 rounded-xl text-xs font-bold scale-on-click transition-all ${on ? 'bg-premium-gold text-black shadow-gold' : 'bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 hover:text-white'}`;

const FOOTERS: { id: ChromeFooter; label: string; hint: string }[] = [
  { id: 'off', label: 'None', hint: 'No footer.' },
  { id: 'ticker', label: 'Scrolling line', hint: 'A line of text that scrolls along the bottom.' },
  { id: 'bar', label: 'Bar', hint: 'A still bar with a line of text and the logo.' },
  { id: 'image', label: 'Own banner', hint: 'Your own picture along the bottom, about 1920 × 160 (sponsors, hashtag, logos).' },
];

const SAMPLE_EVENT: ChromeEvent = { slug: 'your-event', name: 'Your event', logo: null, starts_at: null, venue_name: null };

/**
 * The header, frame and footer of one live screen, set here once instead of in every stage module, game and custom
 * screen. They stay up while the sources change, and each source leaves out its own. Off, the screen is drawn as before.
 */
export function ScreenLookEditor({ screen, event, eventId, logo, onSaved, onClose }: {
  screen: Screen;
  event: ChromeEvent | null;
  eventId: string;
  logo?: string | null;
  onSaved: (screen: Screen) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ScreenChrome>(() => normalizeChrome(screen.chrome));
  const [busy, setBusy] = useState<'save' | 'upload' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const frameRef = useRef<HTMLInputElement>(null);
  const footerRef = useRef<HTMLInputElement>(null);
  // Pictures uploaded in this session: deleted again if the look is not saved with them.
  const fresh = useRef<string[]>([]);

  const patch = (p: Partial<ScreenChrome>) => setDraft((d) => ({ ...d, ...p }));
  const dw = designWidth(screen.width, screen.height);
  const shownEvent: ChromeEvent = event ? { ...event, logo: event.logo ?? logo ?? null } : { ...SAMPLE_EVENT, logo: logo ?? null };

  const upload = async (slot: 'frame' | 'footer', file: File | undefined) => {
    if (!file) return;
    setBusy('upload');
    setError(null);
    try {
      const img = await imageForScreen(file);
      const media = await uploadMedia(eventId, img.blob, { w: img.w, h: img.h });
      fresh.current.push(media.url);
      if (slot === 'frame') setDraft((d) => ({ ...d, frame: { preset: 'image', imageUrl: media.url, imageBlend: 'normal' } }));
      else setDraft((d) => ({ ...d, footer: 'image', footerImageUrl: media.url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Try again.');
    } finally {
      setBusy(null);
      if (frameRef.current) frameRef.current.value = '';
      if (footerRef.current) footerRef.current.value = '';
    }
  };

  const close = () => {
    void removeMediaFiles(fresh.current);
    onClose();
  };

  const save = async () => {
    setBusy('save');
    setError(null);
    try {
      const saved = await saveScreenChrome(screen, draft);
      const kept = chromeFiles(draft);
      await removeMediaFiles(fresh.current.filter((u) => !kept.includes(u)));
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      setBusy(null);
    }
  };

  const f = draft.footer;
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Header, frame and footer">
      <div className="w-full max-w-6xl rounded-[2rem] bg-premium-charcoal border border-premium-borderDark p-4 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl font-display font-bold text-white truncate">Header, frame and footer · {screen.name}</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Set once here, drawn around everything this screen shows, and kept up while the sources change. Stage modules, games and custom screens leave out their own.</p>
          </div>
          <button type="button" onClick={close} className="text-zinc-500 hover:text-white scale-on-click shrink-0" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        {error && <div role="alert" className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-xs font-bold">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-2">
            <span className={label}>Preview · {screen.width} × {screen.height}</span>
            <FitBox width={dw} height={DESIGN_HEIGHT} className="w-full aspect-video rounded-2xl border border-premium-borderDark" >
              <ScreenChromeView chrome={draft} event={shownEvent}>
                <div className="absolute inset-0 flex items-center justify-center bg-premium-black">
                  <span className="font-display font-bold text-5xl text-white/70">What is on this screen</span>
                </div>
              </ScreenChromeView>
            </FitBox>
            {!draft.on && <p className="text-[11px] text-zinc-500">The look is off: each stage module draws its own header and ticker, and each custom screen its own frame and footer, as before.</p>}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className={label}>Use one look on this screen</span>
              <button type="button" onClick={() => patch({ on: !draft.on })} className={pill(draft.on)} aria-pressed={draft.on}>{draft.on ? 'On' : 'Off'}</button>
            </div>

            <div className={`space-y-4 ${draft.on ? '' : 'opacity-40 pointer-events-none'}`} aria-disabled={!draft.on}>
              <div className="flex items-center justify-between gap-3">
                <span className={label}>Header</span>
                <button type="button" onClick={() => patch({ header: !draft.header })} className={pill(draft.header)} aria-pressed={draft.header}>{draft.header ? 'On' : 'Off'}</button>
              </div>
              <p className="text-[11px] text-zinc-500 -mt-2">The event&apos;s logo, name, guest address, date and place along the top.</p>

              <div className="space-y-2 pt-3 border-t border-premium-borderDark">
                <span className={label}>Frame</span>
                <input ref={frameRef} type="file" accept="image/png,image/webp,image/jpeg" className="hidden" onChange={(e) => void upload('frame', e.target.files?.[0])} />
                <div className="flex flex-wrap gap-1.5">
                  {FRAME_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => (p.id === 'image' ? frameRef.current?.click() : patch({ frame: { ...draft.frame, preset: p.id } }))}
                      className={pill(draft.frame.preset === p.id)}
                      title={p.desc}
                    >
                      {p.id === 'image' ? (draft.frame.imageUrl ? 'Replace own frame' : 'Upload frame') : p.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-zinc-500">An uploaded frame should be a PNG with a transparent middle.</p>
              </div>

              <div className="space-y-2 pt-3 border-t border-premium-borderDark">
                <span className={label}>Footer</span>
                <input ref={footerRef} type="file" accept="image/png,image/webp,image/jpeg" className="hidden" onChange={(e) => void upload('footer', e.target.files?.[0])} />
                <div className="flex flex-wrap gap-1.5">
                  {FOOTERS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => (o.id === 'image' && !draft.footerImageUrl ? footerRef.current?.click() : patch({ footer: o.id }))}
                      className={pill(f === o.id)}
                      title={o.hint}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-zinc-500">{FOOTERS.find((o) => o.id === f)?.hint}</p>
                {(f === 'ticker' || f === 'bar') && (
                  <input
                    value={draft.footerText}
                    maxLength={200}
                    onChange={(e) => patch({ footerText: e.target.value })}
                    placeholder={f === 'ticker' ? 'Leave empty for the event’s own line' : 'e.g. #TechUnite2026'}
                    className={input}
                    aria-label={f === 'ticker' ? 'Scrolling line' : 'Footer text'}
                  />
                )}
                {f === 'bar' && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['dark', 'gold', 'glass'] as const).map((s) => (
                      <button key={s} type="button" onClick={() => patch({ footerStyle: s })} className={pill(draft.footerStyle === s)}>{s[0].toUpperCase() + s.slice(1)}</button>
                    ))}
                    <button type="button" onClick={() => patch({ footerLogo: !draft.footerLogo })} className={pill(draft.footerLogo)} aria-pressed={draft.footerLogo}>Show logo</button>
                  </div>
                )}
                {f === 'image' && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button type="button" onClick={() => footerRef.current?.click()} className={pill(false)}>{draft.footerImageUrl ? 'Upload another banner' : 'Upload banner'}</button>
                    {draft.footerImageUrl && (
                      <button type="button" onClick={() => patch({ footerImageUrl: '', footer: 'off' })} className={`${pill(false)} hover:!text-premium-danger`}><Trash2 className="w-3.5 h-3.5 inline -mt-0.5" /> Remove banner</button>
                    )}
                  </div>
                )}
              </div>
            </div>
            {busy === 'upload' && <p role="status" className="text-xs font-bold text-zinc-300 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin text-premium-gold" /> Uploading…</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-premium-borderDark">
          <button type="button" onClick={close} className="px-4 py-2.5 rounded-xl border border-premium-borderDark text-zinc-300 hover:text-white text-xs font-bold scale-on-click">Cancel</button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy !== null}
            className="px-5 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click disabled:opacity-50 flex items-center gap-2"
          >
            {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}
