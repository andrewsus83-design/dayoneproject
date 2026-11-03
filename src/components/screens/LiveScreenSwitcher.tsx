'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Camera, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Film, Gamepad2, Gift, ImageIcon, Link2, Loader2, Monitor, Pencil,
  Palette, Plus, Presentation, Radio, Send, Sparkles, Trash2, X,
} from 'lucide-react';
import { STAGE_MODULE_NAMES } from '@/lib/stageApi';
import type { StageModuleId } from '@/lib/types';
import {
  SCENE_KIND_LABELS, SCREEN_MODULES, SIZE_PRESETS, deleteScene, deleteScreen, fetchScreenFeed, fetchWallKey, listScenes, listScreens, moduleSource, outputPath,
  parseSource, saveScene, sceneModule, sceneSource, sceneSteps, saveScreen, sourceLabel, takeToScreen,
  type Scene, type Screen,
} from '@/lib/screensApi';
import { hostOf } from '@/lib/screenUrl';
import { DEFAULT_CHROME, chromeFiles, normalizeChrome, type ScreenChrome } from '@/lib/screenChrome';
import { removeMediaFiles } from '@/lib/screensApi';
import { hasDraft } from '@/lib/sceneDraft';
import { DESIGN_HEIGHT, FitBox, SourceView, designWidth, useLoadState } from './ScreenView';
import { LoadBadge } from './LoadBadge';
import { ScreenChromeView, type ChromeEvent } from './ScreenChromeView';
import { ScreenLookEditor, ScreenLookField } from './ScreenLookEditor';
import { SceneEditor } from './SceneEditor';
import { ScreenEditor } from './ScreenEditor';

const input = 'w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2.5 rounded-xl text-sm outline-none focus:border-premium-gold placeholder:text-zinc-600';
const label = 'text-[10px] font-mono uppercase tracking-widest text-zinc-500';
const quiet = 'p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 scale-on-click';

const MODULE_ICON: Partial<Record<StageModuleId, typeof Camera>> = { welcome: Sparkles, photowall: Camera, quiz: Gamepad2, raffle: Gift };
const SCENE_ICON = { slides: Presentation, images: ImageIcon, video: Film, web: Link2, module: Monitor };

/** `chrome` is the look chosen while adding a screen; an existing screen's look has its own button on its card. */
type ScreenForm = { id?: string; name: string; preset: string; width: number; height: number; chrome: ScreenChrome };
const CUSTOM = 'custom';
const blankScreen = (): ScreenForm => ({ name: '', preset: `${SIZE_PRESETS[0].width}x${SIZE_PRESETS[0].height}`, width: SIZE_PRESETS[0].width, height: SIZE_PRESETS[0].height, chrome: DEFAULT_CHROME });

/** A stage module's tile: its icon and name; `custom` marks a copy opened in the screen editor. */
function ModuleTile({ id, custom = false }: { id: StageModuleId; custom?: boolean }) {
  const Icon = MODULE_ICON[id] || Monitor;
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-premium-surfaceDark to-premium-black text-premium-gold">
      <Icon className="w-6 h-6" />
      <span className="text-[10px] font-bold text-zinc-300">{STAGE_MODULE_NAMES[id]}</span>
      {custom && <span className="text-[9px] font-mono uppercase tracking-widest text-premium-gold/80">Custom</span>}
    </div>
  );
}

/** A light picture of a source for cards: the first slide or image, or the module's icon. Never an iframe. */
function SourceThumb({ source, scenes }: { source: string; scenes: Scene[] }) {
  const parsed = parseSource(source);
  if (parsed?.kind === 'scene') {
    const scene = scenes.find((s) => s.id === parsed.id);
    const moduleId = sceneModule(scene);
    if (moduleId) return <ModuleTile id={moduleId} custom />;
    const Icon = scene ? SCENE_ICON[scene.kind] : Film;
    const first = scene && (scene.kind === 'slides' || scene.kind === 'images') ? scene.media[0]?.url : null;
    if (scene?.kind === 'web') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-premium-surfaceDark to-premium-black text-premium-neon px-2">
          <Icon className="w-6 h-6" />
          <span className="text-[10px] font-mono text-zinc-300 truncate max-w-full">{hostOf(scene.media[0]?.url ?? '')}</span>
        </div>
      );
    }
    return first ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={first} alt="" className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full flex items-center justify-center bg-premium-black text-zinc-500"><Icon className="w-6 h-6" /></div>
    );
  }
  if (parsed?.kind === 'module') return <ModuleTile id={parsed.id} />;
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-premium-surfaceDark to-premium-black text-premium-gold">
      <Monitor className="w-6 h-6" />
    </div>
  );
}

/**
 * The Live Screen switcher: the event's screens (outputs), the sources (stage modules and custom screens), a
 * Preview to check a source at the chosen screen's shape, and Take to put it live there. What is live on the
 * chosen screen shows next to the preview.
 */
export function LiveScreenSwitcher({ eventId, slug }: { eventId: string; slug: string }) {
  const [screens, setScreens] = useState<Screen[] | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [wallKey, setWallKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ source: string; slide: number }>({ source: moduleSource('welcome'), slide: 0 });
  const [taking, setTaking] = useState(false);
  const [screenForm, setScreenForm] = useState<ScreenForm | null>(null);
  const [savingScreen, setSavingScreen] = useState(false);
  const [editing, setEditing] = useState<Scene | 'new' | 'link' | null>(null);
  // The screen editor: a draft of the previewed custom screen.
  const [designing, setDesigning] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  // The event as the screens on air have it (name, date, place), for the header of a screen's own look.
  const [chromeEvent, setChromeEvent] = useState<ChromeEvent | null>(null);
  // The screen whose header, frame and footer are being set.
  const [looking, setLooking] = useState<Screen | null>(null);
  // The same editor while adding a screen: its look is only handed back to the form.
  const [lookDraft, setLookDraft] = useState(false);
  // The preview counts as loaded only when the source has really loaded here; Try again mounts it afresh.
  const [previewNonce, setPreviewNonce] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [sc, sn] = await Promise.all([listScreens(eventId), listScenes(eventId)]);
      setScreens(sc);
      setScenes(sn);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the screens.');
    }
  }, [eventId]);

  useEffect(() => {
    // Loads on open, then keeps up with takes from other operators.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    fetchWallKey(eventId).then(setWallKey);
    const t = window.setInterval(() => document.visibilityState === 'visible' && listScreens(eventId).then(setScreens).catch(() => undefined), 4000);
    return () => window.clearInterval(t);
  }, [eventId, load]);

  const target = screens?.find((s) => s.id === targetId) ?? screens?.[0] ?? null;
  const previewScene = (() => {
    const p = parseSource(preview.source);
    return p?.kind === 'scene' ? scenes.find((s) => s.id === p.id) ?? null : null;
  })();
  const previewSteps = sceneSteps(previewScene);
  const previewModule = (() => {
    const p = parseSource(preview.source);
    return p?.kind === 'module' ? p.id : null;
  })();
  const programScene = (() => {
    const p = target ? parseSource(target.program.source) : null;
    return p?.kind === 'scene' ? scenes.find((s) => s.id === p.id) ?? null : null;
  })();
  const dw = target ? designWidth(target.width, target.height) : 1920;
  // Sources are shown inside the chosen screen's own header, frame and footer, as on air.
  const targetChrome = useMemo(() => normalizeChrome(target?.chrome), [target?.chrome]);
  const previewKey = `${preview.source}|${previewScene?.updated_at ?? ''}|${previewNonce}|${targetChrome.on ? 'look' : ''}`;
  const { load: previewLoad, onReady: previewReady, onFail: previewFail } = useLoadState(previewKey);

  // The event's logo as the screens on air have it, so a footer logo or a Logo item looks the same here as on air.
  const targetId0 = target?.id;
  useEffect(() => {
    if (!targetId0) return;
    let alive = true;
    fetchScreenFeed(targetId0).then((f) => {
      if (!alive) return;
      setLogo(f?.event.logo ?? null);
      setChromeEvent(f?.event ?? null);
    }).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [targetId0]);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    }
  };

  const take = (screen: Screen, program = preview) =>
    run(async () => {
      setTaking(true);
      try {
        const updated = await takeToScreen(screen.id, program);
        setScreens((list) => list?.map((s) => (s.id === updated.id ? updated : s)) ?? list);
      } finally {
        setTaking(false);
      }
    });

  /**
   * Opens a stage module in the screen editor. The editor works on a scene, so the first time this makes a custom copy
   * of the module (a scene of kind 'module', listed under Sources); the plain module itself is never changed.
   */
  const customise = (moduleId: StageModuleId) =>
    run(async () => {
      let scene = scenes.find((s) => sceneModule(s) === moduleId);
      const onAir = scene ? liveOn(sceneSource(scene.id)) : [];
      if (onAir.length) {
        setError(`${STAGE_MODULE_NAMES[moduleId]} (custom) is on air on ${onAir.join(', ')}. Take another source live there first to edit it.`);
        return;
      }
      if (!scene) {
        const made = await saveScene({ eventId, title: `${STAGE_MODULE_NAMES[moduleId]} (custom)`, kind: 'module', media: [], options: { module: moduleId }, frame: {} });
        scene = made;
        setScenes((list) => [...list, made]);
      }
      setPreview({ source: sceneSource(scene.id), slide: 0 });
      setDesigning(true);
    });

  /** Removes a custom copy of a stage module; screens that showed it go back to the Welcome module (the database does that). */
  const removeCustomModule = (scene: Scene) => {
    if (!confirm(`Remove “${scene.title}”? The plain stage module stays as it is.`)) return;
    run(async () => {
      await deleteScene(scene);
      setScenes((list) => list.filter((s) => s.id !== scene.id));
      if (preview.source === sceneSource(scene.id)) setPreview({ source: moduleSource(sceneModule(scene) ?? 'welcome'), slide: 0 });
      load();
    });
  };

  /** Steps a presentation that is live on a screen. */
  const stepLive = (screen: Screen, delta: number, steps: number) => {
    const slide = Math.min(steps - 1, Math.max(0, screen.program.slide + delta));
    if (slide !== screen.program.slide) take(screen, { source: screen.program.source, slide });
  };

  /** The look chosen in the add-screen form; pictures the form's earlier choice uploaded and this one drops are deleted. */
  const setFormLook = (next: ScreenChrome) => {
    if (!screenForm) return;
    const kept = chromeFiles(next);
    void removeMediaFiles(chromeFiles(screenForm.chrome).filter((u) => !kept.includes(u)));
    setScreenForm({ ...screenForm, chrome: next });
  };

  const cancelScreenForm = () => {
    // A screen that was never added owns no pictures.
    if (screenForm && !screenForm.id) void removeMediaFiles(chromeFiles(screenForm.chrome));
    setLookDraft(false);
    setScreenForm(null);
  };

  const submitScreen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenForm) return;
    run(async () => {
      setSavingScreen(true);
      try {
        const chrome = !screenForm.id && screenForm.chrome.on ? screenForm.chrome : null;
        const saved = await saveScreen({ id: screenForm.id, eventId, name: screenForm.name, width: screenForm.width, height: screenForm.height, position: screens?.length ?? 0, chrome });
        // A look turned off before adding leaves pictures that nothing will use.
        if (!screenForm.id && !chrome) void removeMediaFiles(chromeFiles(screenForm.chrome));
        setScreens((list) => (screenForm.id ? (list ?? []).map((s) => (s.id === saved.id ? saved : s)) : [...(list ?? []), saved]));
        if (!screenForm.id) setTargetId(saved.id);
        setScreenForm(null);
      } finally {
        setSavingScreen(false);
      }
    });
  };

  const removeScreen = (s: Screen) => {
    if (!confirm(`Remove the screen “${s.name}”? Its link stops working.`)) return;
    run(async () => {
      await deleteScreen(s);
      setScreens((list) => list?.filter((x) => x.id !== s.id) ?? list);
    });
  };

  const copyLink = (s: Screen) => {
    navigator.clipboard?.writeText(`${window.location.origin}${outputPath(s.id)}`);
    setCopied(s.id);
    window.setTimeout(() => setCopied(null), 1500);
  };

  const liveOn = (source: string) => (screens ?? []).filter((s) => s.program.source === source).map((s) => s.name);
  // What is on air is not edited: a source is changed in Preview, before it is taken live. Only a screen's own header,
  // frame and footer (the palette button on its card) can change while it is on air.
  const previewOnAir = previewScene ? liveOn(sceneSource(previewScene.id)) : [];
  const onAirNote = (names: string[]) => `On air on ${names.join(', ')}. Take another source live there first to edit this one.`;

  if (!screens) {
    return (
      <div className="p-10 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark flex items-center justify-center gap-3 text-sm text-zinc-400">
        {error ? <span className="text-premium-danger font-bold">{error}</span> : <><Loader2 className="w-4 h-4 animate-spin text-premium-gold" /> Loading screens…</>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-display font-bold text-white flex items-center gap-2"><Radio className="w-5 h-5 text-premium-danger" /> Live Screens</h3>
        <p className="text-xs text-zinc-400 mt-1">Click a source to load it in Preview, then Take it live on a screen once it shows “Loaded”. Each screen has its own link: open it full screen on the computer that drives the display, and it follows what you take. A new source loads out of sight first, so the screen never goes blank. Edit a source before you take it live: once it is on air only the screen’s header, frame and footer can change.</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-xs font-bold flex items-start justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="scale-on-click" aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {screens.map((s) => {
          const isTarget = target?.id === s.id;
          const live = parseSource(s.program.source);
          const liveScene = live?.kind === 'scene' ? scenes.find((x) => x.id === live.id) ?? null : null;
          const steps = sceneSteps(liveScene);
          return (
            <div
              key={s.id}
              className={`rounded-2xl border bg-premium-charcoal overflow-hidden transition-all ${isTarget ? 'border-premium-gold/60 shadow-gold' : 'border-premium-borderDark'}`}
            >
              <button type="button" onClick={() => setTargetId(s.id)} className="block w-full text-left scale-on-click">
                <div className="relative aspect-video bg-black">
                  <SourceThumb source={s.program.source} scenes={scenes} />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-premium-danger text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
                  </span>
                  {isTarget && <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-premium-gold text-black text-[9px] font-bold uppercase">Selected</span>}
                </div>
                <div className="px-3 pt-2.5">
                  <div className="text-sm font-display font-bold text-white truncate">{s.name}</div>
                  <div className="text-[10px] font-mono text-zinc-500">
                    {s.width} × {s.height} · {sourceLabel(s.program.source, scenes)}
                    {steps > 1 ? ` · ${s.program.slide + 1}/${steps}` : ''}
                  </div>
                </div>
              </button>
              {/* Each screen has its own address: open it full screen on the computer that drives the display. */}
              <div className="px-3 pt-1 flex items-center gap-1.5 min-w-0">
                <Link2 className="w-3 h-3 text-premium-neon shrink-0" />
                <span className="text-[10px] font-mono text-premium-neon truncate select-all" title={`${window.location.origin}${outputPath(s.id)}`}>
                  {window.location.host}{outputPath(s.id)}
                </span>
              </div>
              <div className="flex items-center gap-0.5 px-1.5 pb-1.5 pt-1">
                {steps > 1 && (
                  <>
                    <button type="button" onClick={() => stepLive(s, -1, steps)} className={quiet} title="Previous slide on air"><ChevronLeft className="w-4 h-4" /></button>
                    <button type="button" onClick={() => stepLive(s, 1, steps)} className={quiet} title="Next slide on air"><ChevronRight className="w-4 h-4" /></button>
                  </>
                )}
                <span className="flex-1" />
                <a href={outputPath(s.id)} target="_blank" rel="noopener noreferrer" className={quiet} title="Open this screen"><ExternalLink className="w-4 h-4" /></a>
                <button type="button" onClick={() => copyLink(s)} className={quiet} title="Copy the screen link">
                  {copied === s.id ? <Check className="w-4 h-4 text-premium-success" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const preset = SIZE_PRESETS.find((p) => p.width === s.width && p.height === s.height);
                    setScreenForm({ id: s.id, name: s.name, width: s.width, height: s.height, preset: preset ? `${preset.width}x${preset.height}` : CUSTOM, chrome: normalizeChrome(s.chrome) });
                  }}
                  className={quiet}
                  title="Rename or resize"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setLooking(s)} className={`${quiet} ${normalizeChrome(s.chrome).on ? 'text-premium-gold' : ''}`} title="Header, frame and footer of this screen">
                  <Palette className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => removeScreen(s)} className={`${quiet} hover:text-premium-danger`} title="Remove"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          );
        })}

        {!screenForm && (
          <button
            type="button"
            onClick={() => setScreenForm(blankScreen())}
            className="rounded-2xl border-2 border-dashed border-premium-borderDark hover:border-premium-gold/50 min-h-[160px] flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-premium-gold scale-on-click"
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs font-bold">Add screen</span>
          </button>
        )}

        {screenForm && (
          <form onSubmit={submitScreen} className="rounded-2xl border border-premium-gold/40 bg-premium-charcoal p-4 space-y-3">
            <label className="block space-y-1">
              <span className={label}>Screen name</span>
              <input required autoFocus maxLength={60} value={screenForm.name} onChange={(e) => setScreenForm({ ...screenForm, name: e.target.value })} placeholder="e.g. Main LED" className={input} />
            </label>
            <label className="block space-y-1">
              <span className={label}>Size</span>
              <select
                value={screenForm.preset}
                onChange={(e) => {
                  const p = SIZE_PRESETS.find((x) => `${x.width}x${x.height}` === e.target.value);
                  setScreenForm(p ? { ...screenForm, preset: e.target.value, width: p.width, height: p.height } : { ...screenForm, preset: CUSTOM });
                }}
                className={input}
              >
                {SIZE_PRESETS.map((p) => <option key={p.label} value={`${p.width}x${p.height}`}>{p.label}</option>)}
                <option value={CUSTOM}>Custom size…</option>
              </select>
            </label>
            {screenForm.preset === CUSTOM && (
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min={320} max={7680} required value={screenForm.width} onChange={(e) => setScreenForm({ ...screenForm, width: Number(e.target.value) })} className={input} aria-label="Width in pixels" />
                <input type="number" min={240} max={4320} required value={screenForm.height} onChange={(e) => setScreenForm({ ...screenForm, height: Number(e.target.value) })} className={input} aria-label="Height in pixels" />
              </div>
            )}
            {!screenForm.id && (
              <div className="space-y-1">
                <span className={label}>Header, frame and footer</span>
                <ScreenLookField chrome={screenForm.chrome} onChange={setFormLook} onDesign={() => setLookDraft(true)} />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={cancelScreenForm} className="px-3 py-2 rounded-xl border border-premium-borderDark text-zinc-300 text-xs font-bold scale-on-click">Cancel</button>
              <button type="submit" disabled={savingScreen} className="px-4 py-2 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-xs shadow-gold scale-on-click disabled:opacity-50 flex items-center gap-1.5">
                {savingScreen ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} {screenForm.id ? 'Save' : 'Add'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Preview and program */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-premium-success font-bold">
              Preview · {sourceLabel(preview.source, scenes)}
              {previewScene && hasDraft(previewScene) && <span className="ml-2 px-1.5 py-0.5 rounded-md bg-premium-gold/15 text-premium-gold normal-case tracking-normal">unpushed draft</span>}
            </span>
            {target && <span className="text-[10px] font-mono text-zinc-500">as {target.name}</span>}
          </div>
          <FitBox width={dw} height={DESIGN_HEIGHT} className={`w-full aspect-video rounded-2xl border-2 ${previewLoad.state === 'failed' ? 'border-premium-danger/60' : 'border-premium-success/50'}`}>
            <ScreenChromeView chrome={targetChrome} event={chromeEvent}>
              <SourceView key={previewKey} source={preview.source} scene={previewScene} slug={slug} slide={preview.slide} wallKey={wallKey} logo={logo} playing sound={false} bare={targetChrome.on} onReady={previewReady} onFail={previewFail} />
            </ScreenChromeView>
          </FitBox>
          <LoadBadge load={previewLoad} onRetry={() => setPreviewNonce((n) => n + 1)} />
          <div className="flex flex-wrap items-center gap-2">
            {previewSteps > 1 && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <button type="button" onClick={() => setPreview((p) => ({ ...p, slide: Math.max(0, p.slide - 1) }))} className={quiet} aria-label="Previous slide"><ChevronLeft className="w-4 h-4" /></button>
                <span className="font-mono">{preview.slide + 1} / {previewSteps}</span>
                <button type="button" onClick={() => setPreview((p) => ({ ...p, slide: Math.min(previewSteps - 1, p.slide + 1) }))} className={quiet} aria-label="Next slide"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => (previewScene ? setDesigning(true) : previewModule && customise(previewModule))}
              disabled={(!previewScene && !previewModule) || previewOnAir.length > 0}
              title={
                previewOnAir.length > 0
                  ? onAirNote(previewOnAir)
                  : previewScene
                  ? 'Resize, delete, add text and effects on a draft. The big screens change only when you push.'
                  : previewModule
                    ? 'Move or zoom this stage module and add text, pictures and effects on a draft. The first time, this makes a custom copy under Sources; the plain module stays as it is.'
                    : 'Pick a source under Sources to edit it here.'
              }
              className="px-4 py-2.5 rounded-xl border border-premium-borderDark bg-premium-surfaceDark text-zinc-200 hover:text-white hover:border-premium-gold/50 text-sm font-display font-bold scale-on-click disabled:opacity-40 disabled:hover:border-premium-borderDark flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-premium-gold" /> Edit screen
            </button>
            {target ? (
              <button
                type="button"
                onClick={() => take(target)}
                disabled={taking || previewLoad.state !== 'ready'}
                title={previewLoad.state === 'ready' ? undefined : previewLoad.state === 'loading' ? 'Wait until the preview has loaded' : 'This could not load, so it cannot go live'}
                className="px-5 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click disabled:opacity-50 flex items-center gap-2"
              >
                {taking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Take to {target.name}
              </button>
            ) : (
              <span className="text-xs text-zinc-500">Add a screen to take this live.</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-premium-danger font-bold block">
            {target ? `Live on ${target.name} · ${sourceLabel(target.program.source, scenes)}` : 'Live'}
          </span>
          {target ? (
            <FitBox width={dw} height={DESIGN_HEIGHT} className="w-full aspect-video rounded-2xl border-2 border-premium-danger/50">
              <ScreenChromeView chrome={targetChrome} event={chromeEvent}>
                <SourceView
                  key={`${target.id}|${target.program.source}|${programScene?.updated_at ?? ''}|${targetChrome.on ? 'look' : ''}`}
                  source={target.program.source}
                  scene={programScene}
                  slug={slug}
                  slide={target.program.slide}
                  wallKey={wallKey}
                  logo={logo}
                  playing
                  sound={false}
                  bare={targetChrome.on}
                />
              </ScreenChromeView>
            </FitBox>
          ) : (
            <div className="w-full aspect-video rounded-2xl border-2 border-dashed border-premium-borderDark flex items-center justify-center text-xs text-zinc-500">No screens yet</div>
          )}
        </div>
      </div>

      {/* Sources */}
      <div className="space-y-3">
        <span className={label}>Sources</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {[...SCREEN_MODULES.map((m) => moduleSource(m)), ...scenes.map((s) => sceneSource(s.id))].map((source) => {
            const parsed = parseSource(source);
            const scene = parsed?.kind === 'scene' ? scenes.find((s) => s.id === parsed.id) : null;
            const onAir = liveOn(source);
            const inPreview = preview.source === source;
            return (
              <div key={source} className={`rounded-2xl border overflow-hidden bg-premium-charcoal transition-all ${inPreview ? 'border-premium-success/70' : 'border-premium-borderDark hover:border-zinc-600'}`}>
                <button type="button" onClick={() => setPreview({ source, slide: 0 })} className="block w-full text-left scale-on-click">
                  <div className="relative aspect-video">
                    <SourceThumb source={source} scenes={scenes} />
                    {onAir.length > 0 && (
                      <span className="absolute bottom-1.5 left-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-premium-danger/90 text-white text-[9px] font-bold truncate">LIVE · {onAir.join(', ')}</span>
                    )}
                  </div>
                  <div className="px-2.5 py-2">
                    <div className="text-xs font-bold text-white truncate">
                      {sourceLabel(source, scenes)}
                      {scene && hasDraft(scene) && <span className="ml-1.5 px-1 py-0.5 rounded bg-premium-gold/15 text-premium-gold text-[9px] font-bold align-middle">Draft</span>}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate">{scene ? (scene.kind === 'web' ? `Link · ${hostOf(scene.media[0]?.url ?? '')}` : scene.kind === 'module' ? 'Stage module · custom' : `${SCENE_KIND_LABELS[scene.kind]}${scene.kind === 'slides' || scene.kind === 'images' ? ` · ${scene.media.length}` : ''}`) : 'Stage module'}</div>
                  </div>
                </button>
                {parsed?.kind === 'module' && (
                  <button type="button" onClick={() => customise(parsed.id)} className="w-full px-2.5 pb-2 text-left text-[10px] font-bold text-zinc-500 hover:text-premium-gold flex items-center gap-1 scale-on-click" title="Move or zoom this module and add text, pictures and effects">
                    <Pencil className="w-3 h-3" /> Customise
                  </button>
                )}
                {scene && onAir.length > 0 && (
                  <p className="px-2.5 pb-2 text-[10px] text-zinc-600" title={onAirNote(onAir)}>On air: take another source to edit</p>
                )}
                {scene && onAir.length === 0 && scene.kind !== 'module' && (
                  <button type="button" onClick={() => setEditing(scene)} className="w-full px-2.5 pb-2 text-left text-[10px] font-bold text-zinc-500 hover:text-premium-gold flex items-center gap-1 scale-on-click">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                )}
                {scene?.kind === 'module' && onAir.length === 0 && (
                  <div className="flex items-center gap-3 px-2.5 pb-2">
                    <button type="button" onClick={() => { setPreview({ source, slide: 0 }); setDesigning(true); }} className="text-[10px] font-bold text-zinc-500 hover:text-premium-gold flex items-center gap-1 scale-on-click">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button type="button" onClick={() => removeCustomModule(scene)} className="text-[10px] font-bold text-zinc-500 hover:text-premium-danger flex items-center gap-1 scale-on-click">
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setEditing('link')}
            className="rounded-2xl border-2 border-dashed border-premium-borderDark hover:border-premium-neon/50 min-h-[120px] flex flex-col items-center justify-center gap-1.5 text-zinc-500 hover:text-premium-neon scale-on-click"
          >
            <Link2 className="w-5 h-5" />
            <span className="text-[11px] font-bold text-center px-2">Paste a link<br /><span className="font-normal text-zinc-600">Web page, YouTube, Slides, picture, video</span></span>
          </button>
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="rounded-2xl border-2 border-dashed border-premium-borderDark hover:border-premium-gold/50 min-h-[120px] flex flex-col items-center justify-center gap-1.5 text-zinc-500 hover:text-premium-gold scale-on-click"
          >
            <Plus className="w-5 h-5" />
            <span className="text-[11px] font-bold text-center px-2">Custom screen<br /><span className="font-normal text-zinc-600">Presentation, images, video</span></span>
          </button>
        </div>
      </div>

      {looking && (
        <ScreenLookEditor
          screen={looking}
          event={chromeEvent}
          eventId={eventId}
          logo={logo}
          onSaved={(saved) => {
            setScreens((list) => list?.map((x) => (x.id === saved.id ? saved : x)) ?? list);
            setLooking(null);
          }}
          onClose={() => setLooking(null)}
        />
      )}

      {lookDraft && screenForm && !screenForm.id && (
        <ScreenLookEditor
          screen={{ name: screenForm.name.trim() || 'New screen', width: screenForm.width || 1920, height: screenForm.height || 1080, chrome: { ...screenForm.chrome, on: true } }}
          event={chromeEvent}
          eventId={eventId}
          logo={logo}
          onApply={(chrome) => {
            setFormLook(chrome);
            setLookDraft(false);
          }}
          onClose={() => setLookDraft(false)}
        />
      )}

      {designing && previewScene && (
        <ScreenEditor
          eventId={eventId}
          slug={slug}
          wallKey={wallKey}
          scene={previewScene}
          target={target}
          event={chromeEvent}
          liveOn={liveOn(sceneSource(previewScene.id))}
          logo={logo}
          startSlide={preview.slide}
          onPushed={(saved, screen, takeError) => {
            setScenes((list) => list.map((s) => (s.id === saved.id ? saved : s)));
            if (screen) setScreens((list) => list?.map((s) => (s.id === screen.id ? screen : s)) ?? list);
            setPreview((p) => ({ source: sceneSource(saved.id), slide: p.slide }));
            setDesigning(false);
            if (takeError) setError(takeError);
          }}
          onClose={() => setDesigning(false)}
        />
      )}

      {editing && (
        <SceneEditor
          eventId={eventId}
          scene={editing === 'new' || editing === 'link' ? null : editing}
          startAs={editing === 'link' ? 'link' : undefined}
          onSaved={(saved) => {
            setScenes((list) => (list.some((s) => s.id === saved.id) ? list.map((s) => (s.id === saved.id ? saved : s)) : [...list, saved]));
            setPreview({ source: sceneSource(saved.id), slide: 0 });
            setEditing(null);
          }}
          onDeleted={(id) => {
            setScenes((list) => list.filter((s) => s.id !== id));
            if (preview.source === sceneSource(id)) setPreview({ source: moduleSource('welcome'), slide: 0 });
            setEditing(null);
            load();
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
