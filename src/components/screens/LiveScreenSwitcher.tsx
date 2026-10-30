'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Camera, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Film, Gamepad2, Gift, ImageIcon, Loader2, Monitor, Pencil,
  Plus, Presentation, Radio, Send, Sparkles, Trash2, X,
} from 'lucide-react';
import { STAGE_MODULE_NAMES } from '@/lib/stageApi';
import type { StageModuleId } from '@/lib/types';
import {
  SCENE_KIND_LABELS, SCREEN_MODULES, SIZE_PRESETS, deleteScreen, fetchWallKey, listScenes, listScreens, moduleSource, outputPath,
  parseSource, sceneSource, sceneSteps, saveScreen, sourceLabel, takeToScreen,
  type Scene, type Screen,
} from '@/lib/screensApi';
import { DESIGN_HEIGHT, FitBox, SourceView, designWidth } from './ScreenView';
import { SceneEditor } from './SceneEditor';

const input = 'w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2.5 rounded-xl text-sm outline-none focus:border-premium-gold placeholder:text-zinc-600';
const label = 'text-[10px] font-mono uppercase tracking-widest text-zinc-500';
const quiet = 'p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 scale-on-click';

const MODULE_ICON: Partial<Record<StageModuleId, typeof Camera>> = { welcome: Sparkles, photowall: Camera, quiz: Gamepad2, raffle: Gift };
const SCENE_ICON = { slides: Presentation, images: ImageIcon, video: Film };

type ScreenForm = { id?: string; name: string; preset: string; width: number; height: number };
const CUSTOM = 'custom';
const blankScreen = (): ScreenForm => ({ name: '', preset: `${SIZE_PRESETS[0].width}x${SIZE_PRESETS[0].height}`, width: SIZE_PRESETS[0].width, height: SIZE_PRESETS[0].height });

/** A light picture of a source for cards: the first slide or image, or the module's icon. Never an iframe. */
function SourceThumb({ source, scenes }: { source: string; scenes: Scene[] }) {
  const parsed = parseSource(source);
  if (parsed?.kind === 'scene') {
    const scene = scenes.find((s) => s.id === parsed.id);
    const Icon = scene ? SCENE_ICON[scene.kind] : Film;
    const first = scene && scene.kind !== 'video' ? scene.media[0]?.url : null;
    return first ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={first} alt="" className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full flex items-center justify-center bg-premium-black text-zinc-500"><Icon className="w-6 h-6" /></div>
    );
  }
  const Icon = (parsed?.kind === 'module' && MODULE_ICON[parsed.id]) || Monitor;
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-premium-surfaceDark to-premium-black text-premium-gold">
      <Icon className="w-6 h-6" />
      <span className="text-[10px] font-bold text-zinc-300">{parsed?.kind === 'module' ? STAGE_MODULE_NAMES[parsed.id] : ''}</span>
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
  const [editing, setEditing] = useState<Scene | 'new' | null>(null);
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
  const programScene = (() => {
    const p = target ? parseSource(target.program.source) : null;
    return p?.kind === 'scene' ? scenes.find((s) => s.id === p.id) ?? null : null;
  })();
  const dw = target ? designWidth(target.width, target.height) : 1920;

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

  /** Steps a presentation that is live on a screen. */
  const stepLive = (screen: Screen, delta: number, steps: number) => {
    const slide = Math.min(steps - 1, Math.max(0, screen.program.slide + delta));
    if (slide !== screen.program.slide) take(screen, { source: screen.program.source, slide });
  };

  const submitScreen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenForm) return;
    run(async () => {
      setSavingScreen(true);
      try {
        const saved = await saveScreen({ id: screenForm.id, eventId, name: screenForm.name, width: screenForm.width, height: screenForm.height, position: screens?.length ?? 0 });
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
      await deleteScreen(s.id);
      setScreens((list) => list?.filter((x) => x.id !== s.id) ?? list);
    });
  };

  const copyLink = (s: Screen) => {
    navigator.clipboard?.writeText(`${window.location.origin}${outputPath(s.id)}`);
    setCopied(s.id);
    window.setTimeout(() => setCopied(null), 1500);
  };

  const liveOn = (source: string) => (screens ?? []).filter((s) => s.program.source === source).map((s) => s.name);

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
        <p className="text-xs text-zinc-400 mt-1">Click a source to see it in Preview, then Take it live on a screen. Open each screen&apos;s link full screen on the computer that drives it.</p>
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
                    setScreenForm({ id: s.id, name: s.name, width: s.width, height: s.height, preset: preset ? `${preset.width}x${preset.height}` : CUSTOM });
                  }}
                  className={quiet}
                  title="Rename or resize"
                >
                  <Pencil className="w-4 h-4" />
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
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setScreenForm(null)} className="px-3 py-2 rounded-xl border border-premium-borderDark text-zinc-300 text-xs font-bold scale-on-click">Cancel</button>
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
            <span className="text-[10px] font-mono uppercase tracking-widest text-premium-success font-bold">Preview · {sourceLabel(preview.source, scenes)}</span>
            {target && <span className="text-[10px] font-mono text-zinc-500">as {target.name}</span>}
          </div>
          <FitBox width={dw} height={DESIGN_HEIGHT} className="w-full aspect-video rounded-2xl border-2 border-premium-success/50">
            <SourceView key={`${preview.source}|${previewScene?.updated_at ?? ''}`} source={preview.source} scene={previewScene} slug={slug} slide={preview.slide} wallKey={wallKey} playing sound={false} />
          </FitBox>
          <div className="flex flex-wrap items-center gap-2">
            {previewSteps > 1 && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <button type="button" onClick={() => setPreview((p) => ({ ...p, slide: Math.max(0, p.slide - 1) }))} className={quiet} aria-label="Previous slide"><ChevronLeft className="w-4 h-4" /></button>
                <span className="font-mono">{preview.slide + 1} / {previewSteps}</span>
                <button type="button" onClick={() => setPreview((p) => ({ ...p, slide: Math.min(previewSteps - 1, p.slide + 1) }))} className={quiet} aria-label="Next slide"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
            <span className="flex-1" />
            {target ? (
              <button
                type="button"
                onClick={() => take(target)}
                disabled={taking}
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
              <SourceView
                key={`${target.id}|${target.program.source}|${programScene?.updated_at ?? ''}`}
                source={target.program.source}
                scene={programScene}
                slug={slug}
                slide={target.program.slide}
                wallKey={wallKey}
                playing
                sound={false}
              />
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
                    <div className="text-xs font-bold text-white truncate">{sourceLabel(source, scenes)}</div>
                    <div className="text-[10px] text-zinc-500">{scene ? `${SCENE_KIND_LABELS[scene.kind]}${scene.kind !== 'video' ? ` · ${scene.media.length}` : ''}` : 'Stage module'}</div>
                  </div>
                </button>
                {scene && (
                  <button type="button" onClick={() => setEditing(scene)} className="w-full px-2.5 pb-2 text-left text-[10px] font-bold text-zinc-500 hover:text-premium-gold flex items-center gap-1 scale-on-click">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                )}
              </div>
            );
          })}
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

      {editing && (
        <SceneEditor
          eventId={eventId}
          scene={editing === 'new' ? null : editing}
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
