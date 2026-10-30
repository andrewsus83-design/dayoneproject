'use client';

import React, { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Film, ImageIcon, Loader2, Presentation, Trash2, Upload, X } from 'lucide-react';
import { FRAME_PRESETS } from '@/components/stage/StageFrameShell';
import type { StageFrame } from '@/lib/eventStore';
import {
  SCENE_KIND_LABELS, deleteScene, imageForScreen, pdfToSlides, removeMediaFiles, saveScene, sceneFiles, uploadMedia,
  type Scene, type SceneKind, type SceneMedia, type SceneOptions,
} from '@/lib/screensApi';
import { FitBox, SceneContent, sceneFrame } from './ScreenView';

const input = 'w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2.5 rounded-xl text-sm outline-none focus:border-premium-gold placeholder:text-zinc-600';
const label = 'text-[10px] font-mono uppercase tracking-widest text-zinc-500';
const pill = (on: boolean) =>
  `px-3 py-2 rounded-xl text-xs font-bold scale-on-click transition-all ${on ? 'bg-premium-gold text-black shadow-gold' : 'bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 hover:text-white'}`;

const KIND_ICON: Record<SceneKind, typeof Film> = { slides: Presentation, images: ImageIcon, video: Film };
const ACCEPT: Record<SceneKind, string> = {
  slides: 'application/pdf',
  images: 'image/jpeg,image/png,image/webp',
  video: 'video/mp4,video/webm',
};
const HINT: Record<SceneKind, string> = {
  slides: 'Upload a PDF. From PowerPoint, Keynote or Google Slides choose File → Save/Download as PDF. Each page becomes a slide you step through live.',
  images: 'Upload JPG, PNG or WebP images. They play as a slideshow, or step through them live.',
  video: 'Upload an MP4 or WebM video up to 50 MB (1080p, a few minutes). It plays smoothly from the screen itself.',
};

/** Creates or edits a custom screen: slides from a PDF, an image slideshow, or a video, with its own frame and footer. */
export function SceneEditor({ eventId, scene, logo, onSaved, onDeleted, onClose }: {
  eventId: string;
  scene: Scene | null;
  logo?: string | null;
  onSaved: (scene: Scene) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(scene?.title ?? '');
  const [kind, setKind] = useState<SceneKind>(scene?.kind ?? 'slides');
  const [media, setMedia] = useState<SceneMedia[]>(scene?.media ?? []);
  const [options, setOptions] = useState<SceneOptions>(scene?.options ?? { seconds: 8, loop: true, sound: false, fit: 'contain' });
  const [frame, setFrame] = useState<Partial<StageFrame>>(scene?.frame ?? {});
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewSlide, setPreviewSlide] = useState(0);
  // Files uploaded in this session; removed again if the editor is closed without saving.
  const fresh = useRef<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLInputElement>(null);
  const footerRef = useRef<HTMLInputElement>(null);

  const f = sceneFrame(frame);
  const setF = (patch: Partial<StageFrame>) => setFrame((x) => ({ ...x, ...patch }));

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setProgress(null);
    }
  };

  const remember = (m: SceneMedia) => {
    fresh.current.push(m.path);
    return m;
  };

  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    run(async () => {
      if (kind === 'slides') {
        const pdf = list[0];
        setProgress('Reading the presentation…');
        const slides = await pdfToSlides(pdf, (done, total) => setProgress(`Preparing slide ${done} of ${total}…`));
        const out: SceneMedia[] = [];
        for (let i = 0; i < slides.length; i++) {
          setProgress(`Uploading slide ${i + 1} of ${slides.length}…`);
          out.push(remember(await uploadMedia(eventId, slides[i].blob, { w: slides[i].w, h: slides[i].h })));
        }
        // A new presentation replaces the old one.
        setMedia(out);
        setPreviewSlide(0);
        if (!title.trim()) setTitle(pdf.name.replace(/\.pdf$/i, '').slice(0, 80));
      } else if (kind === 'images') {
        const out: SceneMedia[] = [];
        for (let i = 0; i < list.length; i++) {
          setProgress(`Uploading image ${i + 1} of ${list.length}…`);
          const img = await imageForScreen(list[i]);
          out.push(remember(await uploadMedia(eventId, img.blob, { w: img.w, h: img.h })));
        }
        setMedia((m) => [...m, ...out].slice(0, 300));
        if (!title.trim()) setTitle(list[0].name.replace(/\.[a-z0-9]+$/i, '').slice(0, 80));
      } else {
        const video = list[0];
        setProgress('Uploading the video…');
        setMedia([remember(await uploadMedia(eventId, video))]);
        if (!title.trim()) setTitle(video.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 80));
      }
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const uploadFrameImage = (slot: 'frame' | 'footer', file: File | undefined) => {
    if (!file) return;
    run(async () => {
      setProgress('Uploading…');
      const img = await imageForScreen(file);
      const m = remember(await uploadMedia(eventId, img.blob, { w: img.w, h: img.h }));
      if (slot === 'frame') setF({ preset: 'image', imageUrl: m.url, imageBlend: 'normal' });
      else setF({ footerOn: true, footerStyle: 'image', footerImageUrl: m.url });
    });
  };

  const chooseKind = (k: SceneKind) => {
    if (k === kind) return;
    if (media.length && !confirm('Changing the type removes the files you uploaded. Continue?')) return;
    setKind(k);
    setMedia([]);
    setPreviewSlide(0);
  };

  const move = (i: number, d: -1 | 1) =>
    setMedia((m) => {
      const j = i + d;
      if (j < 0 || j >= m.length) return m;
      const next = [...m];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const removeAt = (i: number) => setMedia((m) => m.filter((_, k) => k !== i));

  // Cancel: nothing uploaded here was saved, so all of it goes.
  const close = async () => {
    await removeMediaFiles(fresh.current);
    fresh.current = [];
    onClose();
  };

  const save = () =>
    run(async () => {
      if (!title.trim()) throw new Error('Give this screen a name.');
      setSaving(true);
      try {
        const saved = await saveScene({ id: scene?.id, eventId, title, kind, media, options, frame: f });
        // Files the scene no longer uses: uploads that were replaced or removed, now and before.
        const used = new Set(sceneFiles(saved));
        await removeMediaFiles([...(scene ? sceneFiles(scene) : []), ...fresh.current].filter((p) => !used.has(p)));
        fresh.current = [];
        onSaved(saved);
      } finally {
        setSaving(false);
      }
    });

  const remove = () => {
    if (!scene || !confirm(`Delete “${scene.title}”? Screens showing it go back to the welcome screen.`)) return;
    run(async () => {
      await deleteScene(scene);
      await removeMediaFiles(fresh.current);
      fresh.current = [];
      onDeleted(scene.id);
    });
  };

  const draft = { kind, media, options, frame: f };
  const steps = kind === 'video' ? 1 : Math.max(1, media.length);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="w-full max-w-5xl rounded-[2rem] bg-premium-charcoal border border-premium-borderDark p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-display font-bold text-white">{scene ? 'Edit custom screen' : 'New custom screen'}</h3>
          <button type="button" onClick={close} className="text-zinc-500 hover:text-white scale-on-click" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-xs font-bold">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Live preview */}
          <div className="space-y-2">
            <FitBox width={1920} height={1080} className="w-full aspect-video rounded-2xl border border-premium-borderDark">
              <SceneContent scene={draft} slide={Math.min(previewSlide, steps - 1)} playing sound={false} logo={logo} />
            </FitBox>
            {steps > 1 && (
              <div className="flex items-center justify-center gap-3 text-xs text-zinc-400">
                <button type="button" onClick={() => setPreviewSlide((s) => Math.max(0, s - 1))} className={pill(false)}>Previous</button>
                <span className="font-mono">{Math.min(previewSlide, steps - 1) + 1} / {steps}</span>
                <button type="button" onClick={() => setPreviewSlide((s) => Math.min(steps - 1, s + 1))} className={pill(false)}>Next</button>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-5">
            <label className="block space-y-1.5">
              <span className={label}>Name</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. CEO keynote" className={input} />
            </label>

            <div className="space-y-1.5">
              <span className={label}>Type</span>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(SCENE_KIND_LABELS) as SceneKind[]).map((k) => {
                  const Icon = KIND_ICON[k];
                  return (
                    <button key={k} type="button" onClick={() => chooseKind(k)} className={`${pill(kind === k)} flex flex-col items-center gap-1`}>
                      <Icon className="w-4 h-4" /> {SCENE_KIND_LABELS[k]}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{HINT[kind]}</p>
            </div>

            <div className="space-y-2">
              <input ref={fileRef} type="file" accept={ACCEPT[kind]} multiple={kind === 'images'} className="hidden" onChange={(e) => upload(e.target.files)} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={!!progress}
                className="w-full py-3 rounded-xl border-2 border-dashed border-premium-borderDark hover:border-premium-gold/60 text-sm font-bold text-zinc-300 hover:text-white scale-on-click flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {progress ? <Loader2 className="w-4 h-4 animate-spin text-premium-gold" /> : <Upload className="w-4 h-4" />}
                {progress ?? (media.length ? (kind === 'images' ? 'Add more images' : 'Replace the file') : 'Upload')}
              </button>
              {kind === 'images' && media.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {media.map((m, i) => (
                    <div key={m.path} className="flex items-center gap-2 p-1.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt="" className="w-14 h-8 object-cover rounded-md" />
                      <span className="flex-1 text-[11px] font-mono text-zinc-500">Image {i + 1}</span>
                      <button type="button" onClick={() => move(i, -1)} className="text-zinc-500 hover:text-white scale-on-click" aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => move(i, 1)} className="text-zinc-500 hover:text-white scale-on-click" aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => removeAt(i)} className="text-zinc-500 hover:text-premium-danger scale-on-click" aria-label="Remove"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
              {kind === 'slides' && media.length > 0 && <p className="text-[11px] text-premium-success font-bold">{media.length} slides ready.</p>}
            </div>

            <div className="flex flex-wrap gap-2">
              {(['contain', 'cover'] as const).map((fit) => (
                <button key={fit} type="button" onClick={() => setOptions((o) => ({ ...o, fit }))} className={pill((options.fit ?? 'contain') === fit)}>
                  {fit === 'contain' ? 'Fit whole picture' : 'Fill the screen'}
                </button>
              ))}
            </div>

            {kind === 'images' && (
              <label className="block space-y-1.5">
                <span className={label}>Seconds per image</span>
                <input type="number" min={2} max={600} value={options.seconds ?? 8} onChange={(e) => setOptions((o) => ({ ...o, seconds: Math.max(2, Number(e.target.value) || 8) }))} className={input} />
              </label>
            )}
            {kind === 'video' && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setOptions((o) => ({ ...o, loop: o.loop === false }))} className={pill(options.loop !== false)}>Loop</button>
                <button type="button" onClick={() => setOptions((o) => ({ ...o, sound: !o.sound }))} className={pill(!!options.sound)}>Play sound</button>
              </div>
            )}

            {/* Frame and footer */}
            <div className="space-y-2 pt-2 border-t border-premium-borderDark">
              <span className={label}>Frame</span>
              <input ref={frameRef} type="file" accept="image/png,image/webp,image/jpeg" className="hidden" onChange={(e) => uploadFrameImage('frame', e.target.files?.[0])} />
              <div className="flex flex-wrap gap-1.5">
                {FRAME_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => (p.id === 'image' ? frameRef.current?.click() : setF({ preset: p.id }))}
                    className={pill(f.preset === p.id)}
                    title={p.desc}
                  >
                    {p.id === 'image' ? 'Upload frame' : p.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500">An uploaded frame should be a PNG with a transparent middle.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={label}>Footer</span>
                <button type="button" onClick={() => setF({ footerOn: !f.footerOn })} className={pill(f.footerOn)}>{f.footerOn ? 'On' : 'Off'}</button>
              </div>
              {f.footerOn && (
                <>
                  <input ref={footerRef} type="file" accept="image/png,image/webp,image/jpeg" className="hidden" onChange={(e) => uploadFrameImage('footer', e.target.files?.[0])} />
                  <div className="flex flex-wrap gap-1.5">
                    {(['dark', 'gold', 'glass', 'image'] as const).map((s) => (
                      <button key={s} type="button" onClick={() => (s === 'image' && !f.footerImageUrl ? footerRef.current?.click() : setF({ footerStyle: s }))} className={pill(f.footerStyle === s)}>
                        {s === 'image' ? 'Own banner' : s[0].toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                  {f.footerStyle === 'image' ? (
                    <button type="button" onClick={() => footerRef.current?.click()} className={pill(false)}>Upload another banner</button>
                  ) : (
                    <>
                      <input value={f.footerText} onChange={(e) => setF({ footerText: e.target.value.slice(0, 120) })} placeholder="Footer text, e.g. #TechUnite2026" className={input} />
                      <button type="button" onClick={() => setF({ footerLogo: !f.footerLogo })} className={pill(f.footerLogo)}>Show logo</button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-premium-borderDark">
          {scene ? (
            <button type="button" onClick={remove} className="px-4 py-2.5 rounded-xl border border-premium-borderDark text-zinc-400 hover:text-premium-danger hover:border-premium-danger/40 text-xs font-bold scale-on-click flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={close} className="px-4 py-2.5 rounded-xl border border-premium-borderDark text-zinc-300 hover:text-white text-xs font-bold scale-on-click">Cancel</button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !!progress}
              className="px-6 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
