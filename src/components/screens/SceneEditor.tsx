'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Check, Film, ImageIcon, Link2, Loader2, Presentation, RotateCw, Trash2, Upload, X } from 'lucide-react';
import type { StageFrame } from '@/lib/eventStore';
import {
  SCENE_KIND_LABELS, deleteScene, imageForScreen, isExternalMedia, pdfToSlides, probeLink, removeMediaFiles, saveScene, sceneFiles, uploadMedia,
  type Scene, type SceneKind, type SceneMedia, type SceneOptions,
} from '@/lib/screensApi';
import { classifyLink, hostOf, type LinkKind, type ProbeResult } from '@/lib/screenUrl';
import { FitBox, SceneContent, sceneFrame, useLoadState } from './ScreenView';
import { LoadBadge } from './LoadBadge';

const input = 'w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2.5 rounded-xl text-sm outline-none focus:border-premium-gold placeholder:text-zinc-600';
const label = 'text-[10px] font-mono uppercase tracking-widest text-zinc-500';
const pill = (on: boolean) =>
  `px-3 py-2 rounded-xl text-xs font-bold scale-on-click transition-all ${on ? 'bg-premium-gold text-black shadow-gold' : 'bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 hover:text-white'}`;

/** What the editor offers: three uploads, and a link. A link is saved as a picture, a video or a page, whichever it turns out to be. */
type Mode = Exclude<SceneKind, 'web' | 'module'> | 'link';
const MODES: Mode[] = ['slides', 'images', 'video', 'link'];
const MODE_LABEL: Record<Mode, string> = { slides: SCENE_KIND_LABELS.slides, images: SCENE_KIND_LABELS.images, video: SCENE_KIND_LABELS.video, link: 'Link' };
const MODE_ICON: Record<Mode, typeof Film> = { slides: Presentation, images: ImageIcon, video: Film, link: Link2 };
const ACCEPT: Record<Exclude<Mode, 'link'>, string> = {
  slides: 'application/pdf',
  images: 'image/jpeg,image/png,image/webp',
  video: 'video/mp4,video/webm',
};
const HINT: Record<Mode, string> = {
  slides: 'Upload a PDF. From PowerPoint, Keynote or Google Slides choose File → Save/Download as PDF. Each page becomes a slide you step through live.',
  images: 'Upload JPG, PNG or WebP images. They play as a slideshow, or step through them live.',
  video: 'Upload an MP4 or WebM video up to 50 MB (1080p, a few minutes). It plays smoothly from the screen itself.',
  link: 'Paste a web address: a web page, a YouTube or Vimeo video, a Google Slides or Canva link, or a link to a picture or video file. It is checked and loaded here first; it only goes live once it has loaded.',
};

/** A scene that shows something from the internet instead of our own uploads. */
const isLinkScene = (scene: Scene | null) => !!scene && (scene.kind === 'web' || (scene.media.length > 0 && scene.media.every(isExternalMedia)));

/**
 * Creates or edits a custom screen: slides from a PDF, an image slideshow, a video, or a link (a web page, YouTube,
 * Google Slides, a picture or video file elsewhere), with its own frame and footer. A link is checked on the server
 * and loaded in the preview before it can be saved.
 */
export function SceneEditor({ eventId, scene, startAs, logo, onSaved, onDeleted, onClose }: {
  eventId: string;
  scene: Scene | null;
  /** A new screen can open straight on its Link type. */
  startAs?: 'link';
  logo?: string | null;
  onSaved: (scene: Scene) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(scene?.title ?? '');
  const [mode, setMode] = useState<Mode>(scene ? (isLinkScene(scene) ? 'link' : (scene.kind as Exclude<SceneKind, 'web' | 'module'>)) : (startAs ?? 'slides'));
  // Uploaded files only: a link keeps its address in the box below.
  const [media, setMedia] = useState<SceneMedia[]>(isLinkScene(scene) ? [] : (scene?.media ?? []));
  const [linkText, setLinkText] = useState(scene && isLinkScene(scene) ? (scene.options.page ?? scene.media[0]?.url ?? '') : '');
  const [probe, setProbe] = useState<{ key: string; result?: ProbeResult; error?: string } | null>(null);
  const [nonce, setNonce] = useState(0);
  const [options, setOptions] = useState<SceneOptions>(scene?.options ?? { seconds: 8, loop: true, sound: false, fit: 'contain' });
  // What the scene was saved with. It is not edited here any more (the header, frame and footer are set on the screen),
  // but it is kept, and it is still drawn on a screen that has no look of its own.
  const [frame] = useState<Partial<StageFrame>>(scene?.frame ?? {});
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewSlide, setPreviewSlide] = useState(0);
  // Files uploaded in this session; removed again if the editor is closed without saving.
  const fresh = useRef<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Links: what the address is, what the server says about it, and whether it has loaded here ── */
  const link = useMemo(() => (mode === 'link' ? classifyLink(linkText, { seconds: options.seconds }) : null), [mode, linkText, options.seconds]);
  const linkUrl = link?.ok ? link.url : null;
  const needsCheck = !!(link?.ok && link.needsCheck);
  const probeKey = `${linkUrl}#${nonce}`;
  useEffect(() => {
    if (!linkUrl || !needsCheck) return;
    const controller = new AbortController();
    const t = window.setTimeout(() => {
      probeLink(linkUrl, controller.signal)
        .then((result) => setProbe({ key: probeKey, result }))
        .catch((e) => {
          if (!controller.signal.aborted) setProbe({ key: probeKey, error: e instanceof Error ? e.message : 'The link check failed. Try again.' });
        });
    }, 500);
    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [linkUrl, needsCheck, probeKey]);
  const checked = probe && probe.key === probeKey ? probe : null;
  const checking = needsCheck && !checked;
  const problem = checked?.result?.problem;
  const hardProblem = !!problem?.hard || !!checked?.error;
  // The check can tell that an ambiguous address is really a picture or a video file.
  const category = checked?.result?.ok ? checked.result.category : undefined;
  const linkKind: LinkKind | null = !link?.ok ? null : link.kind === 'web' && category === 'image' ? 'images' : link.kind === 'web' && category === 'video' ? 'video' : link.kind;
  const kind: SceneKind = mode === 'link' ? (linkKind ?? 'web') : mode;
  // Nothing is loaded until the server has said the address is usable (a blocked page would only show an error).
  const canPreview = !!linkUrl && !checking && !hardProblem;
  const linkMedia: SceneMedia[] = canPreview ? [{ url: linkUrl, path: '' }] : [];
  const draftMedia = mode === 'link' ? linkMedia : media;
  const previewKey = mode === 'link' ? `${kind}|${canPreview ? linkUrl : ''}|${nonce}` : 'files';
  const { load, onReady, onFail } = useLoadState(previewKey);
  const linkReady = canPreview && load.state === 'ready';
  const autoTitle = link?.ok ? (link.provider === 'page' || link.provider === 'image' || link.provider === 'video' ? hostOf(link.url) : link.label) : '';
  const retryLink = () => {
    setProbe(null);
    setNonce((n) => n + 1);
  };
  // What is saved with the scene: a link remembers what was pasted; uploads carry no link details.
  const savedOptions: SceneOptions = (() => {
    const o = { ...options };
    delete o.provider;
    delete o.page;
    return mode === 'link' && link?.ok ? { ...o, provider: link.provider, page: linkText.trim() } : o;
  })();

  const f = sceneFrame(frame);

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
      if (mode === 'slides') {
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
      } else if (mode === 'images') {
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

  const chooseMode = (m: Mode) => {
    if (m === mode) return;
    if (media.length && !confirm('Changing the type removes the files you uploaded. Continue?')) return;
    setMode(m);
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
      const name = title.trim() || autoTitle;
      if (!name) throw new Error('Give this screen a name.');
      if (mode === 'link' && !linkReady) {
        throw new Error(hardProblem ? 'This link cannot go on a screen. Fix the problem shown under the link first.' : 'Wait until the link has loaded in the preview.');
      }
      setSaving(true);
      try {
        const saved = await saveScene({ id: scene?.id, eventId, title: name, kind, media: draftMedia, options: savedOptions, frame: f });
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

  const draft = { kind, media: draftMedia, options, frame: f };
  const steps = kind === 'slides' || kind === 'images' ? Math.max(1, draftMedia.length) : 1;

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
              <SceneContent key={previewKey} scene={draft} slide={Math.min(previewSlide, steps - 1)} playing sound={false} logo={logo} onReady={onReady} onFail={onFail} />
            </FitBox>
            {mode === 'link' && (
              <div className="min-h-[1.75rem] flex flex-wrap items-center gap-2">
                {!link ? null : !link.ok ? (
                  linkText.trim() ? <span role="alert" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-premium-danger"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {link.error}</span> : <span className="text-[11px] text-zinc-500">Paste a link on the right to see it here.</span>
                ) : checking ? (
                  <span role="status" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-300"><Loader2 className="w-3.5 h-3.5 animate-spin text-premium-gold" /> Checking that the link can be shown…</span>
                ) : hardProblem ? (
                  <span role="alert" className="inline-flex items-start gap-1.5 text-[11px] font-bold text-premium-danger">
                    <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
                    <span>{checked?.error ?? problem?.message}</span>
                    <button type="button" onClick={retryLink} className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-premium-danger/50 hover:bg-premium-danger/10 scale-on-click shrink-0"><RotateCw className="w-3 h-3" /> Check again</button>
                  </span>
                ) : (
                  <LoadBadge load={load} onRetry={retryLink} />
                )}
              </div>
            )}
            {mode === 'link' && link?.ok && !checking && problem && !problem.hard && (
              <p className="text-[11px] text-premium-gold leading-relaxed flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" /> {problem.message}</p>
            )}
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MODES.map((m) => {
                  const Icon = MODE_ICON[m];
                  return (
                    <button key={m} type="button" onClick={() => chooseMode(m)} className={`${pill(mode === m)} flex flex-col items-center gap-1`}>
                      <Icon className="w-4 h-4" /> {MODE_LABEL[m]}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{HINT[mode]}</p>
            </div>

            {mode === 'link' && (
              <div className="space-y-2">
                <label className="block space-y-1.5">
                  <span className={label}>Link</span>
                  <input
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    inputMode="url"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    autoFocus={!scene}
                    placeholder="https://…"
                    className={`${input} font-mono`}
                  />
                </label>
                {link?.ok && (
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    <span className="font-bold text-premium-neon">{kind === 'images' ? 'Picture' : kind === 'video' && link.provider !== 'page' ? 'Video file' : link.label}</span>
                    {link.note ? ` · ${link.note}` : ''}
                  </p>
                )}
                {link?.ok && link.provider === 'google-slides' && (
                  <label className="block space-y-1.5">
                    <span className={label}>Seconds per slide</span>
                    <input type="number" min={2} max={600} value={options.seconds ?? 8} onChange={(e) => setOptions((o) => ({ ...o, seconds: Math.max(2, Number(e.target.value) || 8) }))} className={input} />
                  </label>
                )}
              </div>
            )}

            {mode !== 'link' && (
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept={ACCEPT[mode]} multiple={mode === 'images'} className="hidden" onChange={(e) => upload(e.target.files)} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={!!progress}
                className="w-full py-3 rounded-xl border-2 border-dashed border-premium-borderDark hover:border-premium-gold/60 text-sm font-bold text-zinc-300 hover:text-white scale-on-click flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {progress ? <Loader2 className="w-4 h-4 animate-spin text-premium-gold" /> : <Upload className="w-4 h-4" />}
                {progress ?? (media.length ? (mode === 'images' ? 'Add more images' : 'Replace the file') : 'Upload')}
              </button>
              {mode === 'images' && media.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {media.map((m, i) => (
                    <div key={m.path || m.url} className="flex items-center gap-2 p-1.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark">
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
              {mode === 'slides' && media.length > 0 && <p className="text-[11px] text-premium-success font-bold">{media.length} slides ready.</p>}
            </div>
            )}

            {kind !== 'web' && (
              <div className="flex flex-wrap gap-2">
                {(['contain', 'cover'] as const).map((fit) => (
                  <button key={fit} type="button" onClick={() => setOptions((o) => ({ ...o, fit }))} className={pill((options.fit ?? 'contain') === fit)}>
                    {fit === 'contain' ? 'Fit whole picture' : 'Fill the screen'}
                  </button>
                ))}
              </div>
            )}

            {mode === 'images' && (
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

            <p className="pt-2 border-t border-premium-borderDark text-[11px] text-zinc-500 leading-relaxed">
              The header, frame and footer are set on each live screen (the palette button on its card), not on every custom screen.
            </p>
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
              disabled={saving || !!progress || (mode === 'link' && !linkReady)}
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
