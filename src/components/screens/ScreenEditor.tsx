'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowUp, Check, Copy, Eye, EyeOff, Frame as FrameIcon, ImagePlus, Layers, Loader2, PanelBottom, Play, Redo2,
  RotateCcw, Save, Send, Sparkles, Trash2, Type, Undo2, X,
} from 'lucide-react';
import { FRAME_PRESETS } from '@/components/stage/StageFrameShell';
import type { StageFrame } from '@/lib/eventStore';
import { commit, gestureEnd, gestureLive, gestureStart, newHistory, redo, undo, type History } from '@/lib/editHistory';
import {
  DEFAULT_SIZE, SCALE_RANGE, SIZE_RANGE, clampPercent, clampScale, clampSize, makeImage, makeLogo, makeText, MAX_ITEMS, MAX_TEXT, newItemId,
  normalizeLayout, serializeLayout, withLayout,
  type Enter, type Glow, type LayoutItem, type Loop, type MainLayout, type Shadow, type TextBg, type TextColor,
} from '@/lib/sceneLayout';
import { clearDraft, readDraft, writeDraft, type Draft } from '@/lib/sceneDraft';
import {
  SCENE_KIND_LABELS, imageForScreen, removeMediaFiles, saveSceneIfUnchanged, sceneFiles, sceneSource, sceneSteps, takeToScreen, uploadMedia,
  type Scene, type Screen,
} from '@/lib/screensApi';
import { DESIGN_HEIGHT, FitBox, SceneContent, designWidth, sceneFrame, useLoadState } from './ScreenView';
import { ScreenChromeView, type ChromeEvent } from './ScreenChromeView';
import { normalizeChrome } from '@/lib/screenChrome';
import { LoadBadge } from './LoadBadge';
import type { OverlayState } from './SceneLayoutView';

const input = 'w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2 rounded-xl text-sm outline-none focus:border-premium-gold placeholder:text-zinc-600';
const lbl = 'text-[10px] font-mono uppercase tracking-widest text-zinc-500';
const chip = (on: boolean) =>
  `px-2.5 py-1.5 rounded-xl text-[11px] font-bold scale-on-click transition-all ${on ? 'bg-premium-gold text-black shadow-gold' : 'bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 hover:text-white'}`;
const tool = 'p-2 rounded-xl border border-premium-borderDark bg-premium-surfaceDark text-zinc-300 hover:text-white hover:border-zinc-600 scale-on-click disabled:opacity-35 disabled:hover:text-zinc-300 disabled:hover:border-premium-borderDark flex items-center gap-1.5 text-[11px] font-bold';

const ENTERS: { id: Enter; label: string }[] = [{ id: 'none', label: 'None' }, { id: 'fade', label: 'Fade in' }, { id: 'rise', label: 'Rise up' }, { id: 'slide', label: 'Slide in' }, { id: 'zoom', label: 'Zoom in' }];
const LOOPS: { id: Loop; label: string }[] = [{ id: 'none', label: 'Still' }, { id: 'float', label: 'Float' }, { id: 'pulse', label: 'Pulse' }];
const SHADOWS: { id: Shadow; label: string }[] = [{ id: 'none', label: 'None' }, { id: 'soft', label: 'Soft' }, { id: 'strong', label: 'Strong' }];
const GLOWS: { id: Glow; label: string }[] = [{ id: 'none', label: 'None' }, { id: 'gold', label: 'Gold' }, { id: 'neon', label: 'Neon' }, { id: 'white', label: 'White' }];
const COLORS: { id: TextColor; label: string }[] = [{ id: 'white', label: 'White' }, { id: 'gold', label: 'Gold' }, { id: 'neon', label: 'Neon' }, { id: 'black', label: 'Black' }];
const BGS: { id: TextBg; label: string }[] = [{ id: 'none', label: 'None' }, { id: 'dark', label: 'Dark' }, { id: 'gold', label: 'Gold' }];
const FOOTER_STYLES = ['dark', 'gold', 'glass'] as const;

const MAIN = 'main';
const FRAME = 'frame';
const FOOTER = 'footer';
const itemSel = (id: string) => `item:${id}`;
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const round = (v: number) => Math.round(v * 100) / 100;

/** What a draft amounts to once saved: two drafts with the same key are the same screen. */
const draftKey = (d: Draft) => JSON.stringify({ layout: serializeLayout(d.layout) ?? null, frame: d.frame, media: d.media.map((m) => m.url) });

/* ───────────────────────── Small pieces ───────────────────────── */

function Chips<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} className={chip(value === o.id)} aria-pressed={value === o.id}>{o.label}</button>
      ))}
    </div>
  );
}

function Slider({ name, value, min, max, step, format, onChange }: { name: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center justify-between">
        <span className={lbl}>{name}</span>
        <span className="text-[10px] font-mono text-zinc-400">{format(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-premium-gold" aria-label={name} />
    </label>
  );
}

function Field({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className={lbl}>{name}</span>
      {children}
    </div>
  );
}

/* ───────────────────────── Selecting and dragging on the screen ───────────────────────── */

interface Box { x: number; y: number; w: number; h: number }

type Drag =
  | { mode: 'move'; main: true; sx: number; sy: number; x0: number; y0: number; s: number; pw: number; ph: number }
  | { mode: 'move'; main: false; id: string; sx: number; sy: number; x0: number; y0: number; s: number }
  | { mode: 'size'; id: string; type: LayoutItem['type']; size0: number; cx: number; cy: number; d0: number };

/** One added item's box on the screen: its outline, and the corner handles when it is selected. */
function ItemBox({ item, index, box, on, px, handle, onDown }: {
  item: LayoutItem;
  index: number;
  box: Box | undefined;
  on: boolean;
  px: number;
  handle: number;
  onDown: (e: React.PointerEvent<HTMLElement>, target: string, mode: 'move' | 'size') => void;
}) {
  if (!box) return null;
  const corners = [
    { k: 'nw', style: { left: -handle / 2, top: -handle / 2, cursor: 'nwse-resize' } },
    { k: 'ne', style: { right: -handle / 2, top: -handle / 2, cursor: 'nesw-resize' } },
    { k: 'sw', style: { left: -handle / 2, bottom: -handle / 2, cursor: 'nesw-resize' } },
    { k: 'se', style: { right: -handle / 2, bottom: -handle / 2, cursor: 'nwse-resize' } },
  ];
  return (
    <div
      data-testid={`hit-${item.id}`}
      className="absolute pointer-events-auto"
      style={{
        left: box.x, top: box.y, width: box.w, height: box.h, zIndex: index, cursor: 'move', touchAction: 'none',
        outline: `${(on ? 2 : 1) * px}px ${on ? 'solid var(--color-premium-gold)' : 'dashed rgba(255,255,255,0.35)'}`,
      }}
      onPointerDown={(e) => onDown(e, item.id, 'move')}
    >
      {on &&
        corners.map((c) => (
          <span
            key={c.k}
            data-testid={`handle-${c.k}`}
            className="absolute rounded-full bg-premium-gold pointer-events-auto"
            style={{ ...c.style, width: handle, height: handle, border: `${2 * px}px solid var(--color-premium-black)`, touchAction: 'none' }}
            onPointerDown={(e) => onDown(e, item.id, 'size')}
          />
        ))}
    </div>
  );
}

/**
 * Sits on top of the screen in the editor (never on air): finds where each added item really is, lets a click select
 * it, a drag move it and the corners resize it. It works in the screen's own 1080-high space, so it lines up at any size.
 */
function EditOverlay({ stageRef, dw, items, main, sel, onSelect, begin, liveItem, liveMain, end }: {
  stageRef: React.RefObject<HTMLDivElement | null>;
  dw: number;
  items: LayoutItem[];
  main: MainLayout;
  sel: string;
  onSelect: (sel: string) => void;
  begin: () => void;
  liveItem: (id: string, patch: Partial<LayoutItem>) => void;
  liveMain: (patch: Partial<MainLayout>) => void;
  end: () => void;
}) {
  const [view, setView] = useState<{ s: number; boxes: Record<string, Box> }>({ s: 1, boxes: {} });
  const [snap, setSnap] = useState({ x: false, y: false });
  const drag = useRef<Drag | null>(null);

  // The area the items sit in is the screen between its own header and footer (the whole screen when it has none).
  const contentHeight = () => stageRef.current?.offsetHeight || DESIGN_HEIGHT;

  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const o = stage.getBoundingClientRect();
    if (!o.width) return;
    const s = o.width / dw;
    const boxes: Record<string, Box> = {};
    const put = (key: string, el: Element) => {
      const r = el.getBoundingClientRect();
      boxes[key] = { x: round((r.left - o.left) / s), y: round((r.top - o.top) / s), w: round(r.width / s), h: round(r.height / s) };
    };
    stage.querySelectorAll<HTMLElement>('[data-layer]').forEach((el) => put(el.dataset.layer ?? '', el));
    const m = stage.querySelector('[data-layer-main]');
    if (m) put(MAIN, m);
    setView((v) => (Math.abs(v.s - s) < 0.0001 && sameJson(v.boxes, boxes) ? v : { s, boxes }));
  }, [stageRef, dw]);

  // After every render, and whenever something changes size (a picture finishing loading, a window resize).
  useLayoutEffect(() => {
    measure();
  });
  const ids = items.map((i) => i.id).join(',');
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    stage.querySelectorAll('[data-layer], [data-layer-main]').forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [ids, measure, stageRef]);

  const down = (e: React.PointerEvent<HTMLElement>, target: string, mode: 'move' | 'size') => {
    e.stopPropagation();
    e.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const o = stage.getBoundingClientRect();
    const s = o.width / dw;
    if (target === MAIN) {
      // The first click on the background only selects it, so a stray click never shifts the picture.
      if (sel !== MAIN) {
        onSelect(MAIN);
        return;
      }
      const el = stage.querySelector<HTMLElement>('[data-layer-main]');
      e.currentTarget.setPointerCapture(e.pointerId);
      begin();
      drag.current = { mode: 'move', main: true, sx: e.clientX, sy: e.clientY, x0: main.x, y0: main.y, s, pw: el?.offsetWidth || dw, ph: el?.offsetHeight || contentHeight() };
      return;
    }
    const item = items.find((i) => i.id === target);
    if (!item) return;
    onSelect(itemSel(item.id));
    e.currentTarget.setPointerCapture(e.pointerId);
    begin();
    if (mode === 'move') {
      drag.current = { mode: 'move', main: false, id: item.id, sx: e.clientX, sy: e.clientY, x0: item.x, y0: item.y, s };
    } else {
      const cx = o.left + ((item.x / 100) * dw) * s;
      const cy = o.top + ((item.y / 100) * contentHeight()) * s;
      drag.current = { mode: 'size', id: item.id, type: item.type, size0: item.size, cx, cy, d0: Math.max(10, Math.hypot(e.clientX - cx, e.clientY - cy)) };
    }
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.mode === 'size') {
      const range = SIZE_RANGE[d.type];
      const ratio = Math.hypot(e.clientX - d.cx, e.clientY - d.cy) / d.d0;
      liveItem(d.id, { size: round(Math.min(range.max, Math.max(range.min, d.size0 * ratio))) });
      return;
    }
    const dx = (e.clientX - d.sx) / d.s;
    const dy = (e.clientY - d.sy) / d.s;
    if (d.main) {
      liveMain({ x: round(Math.min(100, Math.max(-100, d.x0 + (dx / d.pw) * 100))), y: round(Math.min(100, Math.max(-100, d.y0 + (dy / d.ph) * 100))) });
      return;
    }
    let x = clampPercent(d.x0 + (dx / dw) * 100);
    let y = clampPercent(d.y0 + (dy / contentHeight()) * 100);
    // Easy to centre: close to the middle sticks to it.
    const sx = Math.abs(x - 50) < 0.8;
    const sy = Math.abs(y - 50) < 0.8;
    if (sx) x = 50;
    if (sy) y = 50;
    setSnap((p) => (p.x === sx && p.y === sy ? p : { x: sx, y: sy }));
    liveItem(d.id, { x: round(x), y: round(y) });
  };

  const up = () => {
    if (!drag.current) return;
    drag.current = null;
    setSnap({ x: false, y: false });
    end();
  };

  const px = 1 / view.s;
  const handle = 14 * px;
  const mainBox = view.boxes[MAIN];

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 200 }} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      {/* The background: selects the screen's own content, and moves it once selected. */}
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{ cursor: sel === MAIN ? 'move' : 'default', touchAction: 'none' }}
        onPointerDown={(e) => down(e, MAIN, 'move')}
        data-testid="edit-background"
      />
      {sel === MAIN && mainBox && (
        <div className="absolute pointer-events-none" style={{ left: mainBox.x, top: mainBox.y, width: mainBox.w, height: mainBox.h, outline: `${2 * px}px dashed var(--color-premium-gold)`, outlineOffset: -px }} />
      )}
      {items.map((it, i) => (
        <ItemBox key={it.id} item={it} index={i} box={view.boxes[it.id]} on={sel === itemSel(it.id)} px={px} handle={handle} onDown={down} />
      ))}
      {snap.x && <div className="absolute top-0 bottom-0 bg-premium-neon pointer-events-none" style={{ left: dw / 2 - px / 2, width: px }} />}
      {snap.y && <div className="absolute left-0 right-0 bg-premium-neon pointer-events-none" style={{ top: '50%', height: px, transform: 'translateY(-50%)' }} />}
    </div>
  );
}

/* ───────────────────────── The editor ───────────────────────── */

/**
 * The screen editor: a custom screen opened as a draft on the preview, at the chosen screen's shape. The manager can
 * delete things (added items, the frame, the footer, slides), make things bigger or smaller (drag the corners, the
 * sliders or + / −), move them, add text, pictures and the logo, and give them effects. Nothing reaches the big
 * screens until "Push": the draft is only in this browser, and the screens on air keep showing the saved version.
 * Push is possible once the draft has loaded in the preview, like Take in the switcher.
 */
export function ScreenEditor({ eventId, slug, wallKey = null, scene: openedScene, target, event = null, liveOn, logo, startSlide = 0, onPushed, onClose }: {
  eventId: string;
  /** The event's address and photo wall key: a stage module screen shows that module of the event. */
  slug: string;
  wallKey?: string | null;
  scene: Scene;
  /** The screen whose shape the preview has, and where Push goes. */
  target: Screen | null;
  /** The event, for the header of the target screen's own look. */
  event?: ChromeEvent | null;
  /** Names of the screens that already show this scene. */
  liveOn: string[];
  logo?: string | null;
  startSlide?: number;
  /** Called after a save or push; `screen` is the target when it was taken live, `takeError` when that step failed. */
  onPushed: (scene: Scene, screen: Screen | null, takeError?: string) => void;
  onClose: () => void;
}) {
  // The version this draft is based on. Saving checks nobody changed it meanwhile.
  const [scene] = useState(openedScene);
  const original = useMemo<Draft>(() => ({ layout: normalizeLayout(scene.options.layout), frame: scene.frame ?? {}, media: scene.media }), [scene]);
  const [boot] = useState(() => readDraft(scene));
  const [hist, setHist] = useState<History<Draft>>(() => newHistory<Draft>(boot ? { layout: boot.layout, frame: boot.frame, media: boot.media } : original));
  const [restored, setRestored] = useState(!!boot);
  const fresh = useRef<string[]>(boot?.fresh ?? []);
  const draft = hist.present;
  const dirty = useMemo(() => draftKey(draft) !== draftKey(original), [draft, original]);

  const [sel, setSel] = useState<string>(MAIN);
  const [guides, setGuides] = useState(true);
  const [replay, setReplay] = useState(0);
  const [slideIndex, setSlideIndex] = useState(startSlide);
  const [nonce, setNonce] = useState(0);
  const [overlays, setOverlays] = useState<OverlayState>({ pending: 0, failed: 0 });
  const [busy, setBusy] = useState<'save' | 'push' | 'upload' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const items = draft.layout.items;
  const main = draft.layout.main;
  const frame = sceneFrame(draft.frame);
  // A stage module draws its own header and ticker (or the screen's look does), so it has no scene frame or footer to edit.
  const isModule = scene.kind === 'module';
  const steps = sceneSteps({ kind: scene.kind, media: draft.media });
  const slide = Math.min(slideIndex, steps - 1);
  const selItem = sel.startsWith('item:') ? items.find((i) => i.id === sel.slice(5)) : undefined;
  const selection = sel.startsWith('item:') && !selItem ? MAIN : sel;

  const dw = target ? designWidth(target.width, target.height) : 1920;
  // A screen with its own header, frame and footer draws them around the scene, so the scene's own are not drawn.
  const look = useMemo(() => normalizeChrome(target?.chrome), [target?.chrome]);

  /* ── What the preview shows, and whether it has loaded ── */
  const loadKey = [scene.kind, draft.media.map((m) => m.url).join(','), draft.frame.imageUrl ?? '', draft.frame.footerImageUrl ?? '', nonce].join('|');
  const { load, onReady, onFail } = useLoadState(loadKey);
  const draftScene = useMemo(() => ({ kind: scene.kind, media: draft.media, options: { ...scene.options, layout: draft.layout }, frame: draft.frame }), [scene, draft]);
  const canPush = load.state === 'ready' && overlays.pending === 0 && overlays.failed === 0;

  /* ── Changing the draft ── */
  const change = useCallback((mut: (d: Draft) => Draft, key?: string) => setHist((h) => commit(h, mut(h.present), key ? { key, now: Date.now() } : undefined)), []);
  const patchMain = (p: Partial<MainLayout>, key?: string) => change((d) => ({ ...d, layout: { ...d.layout, main: { ...d.layout.main, ...p } } }), key ? `main:${key}` : undefined);
  const patchItem = (id: string, p: Partial<LayoutItem>, key?: string) =>
    change((d) => ({ ...d, layout: { ...d.layout, items: d.layout.items.map((i) => (i.id === id ? ({ ...i, ...p } as LayoutItem) : i)) } }), key ? `${id}:${key}` : undefined);
  const patchFrame = (p: Partial<StageFrame>, key?: string) => change((d) => ({ ...d, frame: { ...d.frame, ...p } }), key ? `frame:${key}` : undefined);

  const addItem = (item: LayoutItem) => {
    if (items.length >= MAX_ITEMS) {
      setError(`A screen can have up to ${MAX_ITEMS} added items.`);
      return;
    }
    change((d) => ({ ...d, layout: { ...d.layout, items: [...d.layout.items, item] } }));
    setSel(itemSel(item.id));
  };
  const removeItem = (id: string) => {
    change((d) => ({ ...d, layout: { ...d.layout, items: d.layout.items.filter((i) => i.id !== id) } }));
    setSel(MAIN);
  };
  const duplicate = (item: LayoutItem) => addItem({ ...item, id: newItemId(), x: clampPercent(item.x + 3), y: clampPercent(item.y + 3) });
  const reorder = (id: string, delta: -1 | 1) =>
    change((d) => {
      const list = [...d.layout.items];
      const i = list.findIndex((x) => x.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= list.length) return d;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...d, layout: { ...d.layout, items: list } };
    });
  const removeSlide = (index: number) => {
    if (draft.media.length < 2) return;
    change((d) => ({ ...d, media: d.media.filter((_, i) => i !== index) }));
    setSlideIndex((s) => Math.max(0, Math.min(s > index ? s - 1 : s, draft.media.length - 2)));
  };

  // Dragging is one undo step, however long it lasted.
  const begin = useCallback(() => setHist((h) => gestureStart(h)), []);
  const end = useCallback(() => setHist((h) => gestureEnd(h)), []);
  const liveItem = useCallback(
    (id: string, p: Partial<LayoutItem>) =>
      setHist((h) => gestureLive(h, { ...h.present, layout: { ...h.present.layout, items: h.present.layout.items.map((i) => (i.id === id ? ({ ...i, ...p } as LayoutItem) : i)) } })),
    [],
  );
  const liveMain = useCallback(
    (p: Partial<MainLayout>) => setHist((h) => gestureLive(h, { ...h.present, layout: { ...h.present.layout, main: { ...h.present.layout.main, ...p } } })),
    [],
  );

  const deleteSelected = () => {
    if (selItem) removeItem(selItem.id);
    else if (selection === FRAME) patchFrame({ preset: 'none' });
    else if (selection === FOOTER) patchFrame({ footerOn: false });
    else setError(isModule ? 'The stage module itself cannot be deleted here. Remove this custom version from its source card instead.' : 'The screen’s own picture, video or page cannot be deleted here. Add one with Edit on its source card.');
  };

  /** Moves or resizes the selection by a step (keyboard and the + / − buttons). */
  const nudge = (dx: number, dy: number) => {
    if (selItem) patchItem(selItem.id, { x: clampPercent(selItem.x + dx), y: clampPercent(selItem.y + dy) }, 'nudge');
    else if (selection === MAIN) patchMain({ x: round(Math.max(-100, Math.min(100, main.x + dx))), y: round(Math.max(-100, Math.min(100, main.y + dy))) }, 'nudge');
  };
  const resize = (factor: number) => {
    if (selItem) patchItem(selItem.id, { size: round(clampSize(selItem, selItem.size * factor)) }, 'size');
    else if (selection === MAIN) patchMain({ scale: round(clampScale(main.scale * factor)) }, 'scale');
  };

  /* ── The draft is kept in this browser while it differs from the saved screen ── */
  useEffect(() => {
    if (hist.base !== null) return;
    if (dirty) writeDraft(scene, draft, fresh.current);
    else clearDraft(scene.id);
  }, [hist.base, dirty, draft, scene]);

  const requestClose = () => {
    if (dirty) setLeaving(true);
    else onClose();
  };

  /* ── Keys: delete, arrows, size, undo/redo ── */
  const keys = useRef<(e: KeyboardEvent) => void>(() => undefined);
  useEffect(() => {
    keys.current = (e) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key;
      if (mod && k.toLowerCase() === 'z') {
        e.preventDefault();
        setHist((h) => (e.shiftKey ? redo(h) : undo(h)));
      } else if (mod && k.toLowerCase() === 'y') {
        e.preventDefault();
        setHist((h) => redo(h));
      } else if (mod && k.toLowerCase() === 'd' && selItem) {
        e.preventDefault();
        duplicate(selItem);
      } else if (k === 'Delete' || k === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      } else if (k.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 0.5;
        nudge(k === 'ArrowLeft' ? -step : k === 'ArrowRight' ? step : 0, k === 'ArrowUp' ? -step : k === 'ArrowDown' ? step : 0);
      } else if (k === '+' || k === '=') resize(1.08);
      else if (k === '-' || k === '_') resize(1 / 1.08);
      else if (k === 'Escape') {
        if (selection !== MAIN) setSel(MAIN);
        else requestClose();
      }
    };
  });
  useEffect(() => {
    const on = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  /* ── Adding a picture ── */
  const addPicture = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy('upload');
    try {
      const img = await imageForScreen(file, 2560, 1440);
      const m = await uploadMedia(eventId, img.blob, { w: img.w, h: img.h });
      fresh.current.push(m.path);
      addItem(makeImage(m.url, m.path));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add that picture.');
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  /* ── Discarding, saving, pushing ── */
  const discard = async () => {
    const files = fresh.current;
    fresh.current = [];
    clearDraft(scene.id);
    setHist(newHistory(original));
    setRestored(false);
    setSel(MAIN);
    setSlideIndex(startSlide);
    setReplay((n) => n + 1);
    await removeMediaFiles(files);
  };

  const finish = async (save: boolean, goLive: boolean) => {
    setError(null);
    if (!canPush) {
      setError('Wait until the draft has loaded in the preview.');
      return;
    }
    setBusy(goLive ? 'push' : 'save');
    try {
      let saved = scene;
      if (save && dirty) {
        saved = await saveSceneIfUnchanged({
          id: scene.id,
          base: scene.updated_at,
          title: scene.title,
          kind: scene.kind,
          media: draft.media,
          options: withLayout({ ...scene.options }, draft.layout),
          frame: draft.frame,
        });
        // Pictures the screen no longer uses (deleted slides, deleted items, drafts that were replaced).
        const used = new Set(sceneFiles(saved));
        await removeMediaFiles([...sceneFiles(scene), ...fresh.current].filter((p) => !used.has(p)));
        fresh.current = [];
        clearDraft(scene.id);
      }
      let screen: Screen | null = null;
      let takeError: string | undefined;
      if (goLive && target) {
        try {
          const same = target.program.source === sceneSource(saved.id);
          screen = await takeToScreen(target.id, { source: sceneSource(saved.id), slide: same ? target.program.slide : Math.min(slide, sceneSteps(saved) - 1) });
        } catch (e) {
          takeError = e instanceof Error ? e.message : 'The screen was saved but could not be put live.';
        }
      }
      onPushed(saved, screen, takeError);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const alreadyLiveOnTarget = !!target && target.program.source === sceneSource(scene.id);
  const kindLabel = SCENE_KIND_LABELS[scene.kind];

  const itemLabel = (i: LayoutItem) => (i.type === 'text' ? i.text.split('\n')[0].slice(0, 22) || 'Text' : i.type === 'image' ? 'Picture' : 'Logo');
  const ItemIcon = ({ item }: { item: LayoutItem }) => (item.type === 'text' ? <Type className="w-3.5 h-3.5" /> : item.type === 'image' ? <ImagePlus className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />);

  /* ───────── Inspector ───────── */

  const effectsFor = (look: Pick<MainLayout, 'enter' | 'delay'>, patch: (p: Partial<MainLayout & LayoutItem>, key?: string) => void) => (
    <>
      <Field name="Appears">
        <Chips value={look.enter} options={ENTERS} onChange={(enter) => { patch({ enter }); setReplay((n) => n + 1); }} />
      </Field>
      {look.enter !== 'none' && (
        <Slider name="Wait before it appears" value={look.delay} min={0} max={10} step={0.5} format={(v) => `${v}s`} onChange={(delay) => patch({ delay }, 'delay')} />
      )}
    </>
  );

  const inspector = (() => {
    if (selItem) {
      const it = selItem;
      const range = SIZE_RANGE[it.type];
      return (
        <div className="space-y-4">
          {it.type === 'text' && (
            <>
              <Field name="Text">
                <textarea
                  value={it.text}
                  rows={2}
                  maxLength={MAX_TEXT}
                  onChange={(e) => patchItem(it.id, { text: e.target.value }, 'text')}
                  className={`${input} resize-none font-display font-bold`}
                  aria-label="Text"
                />
              </Field>
              <Field name="Colour"><Chips<TextColor> value={it.color} options={COLORS} onChange={(color) => patchItem(it.id, { color })} /></Field>
              <Field name="Background"><Chips<TextBg> value={it.bg} options={BGS} onChange={(bg) => patchItem(it.id, { bg })} /></Field>
            </>
          )}
          <Slider
            name="Size"
            value={it.size}
            min={range.min}
            max={range.max}
            step={0.5}
            format={(v) => `${Math.round((v / DEFAULT_SIZE[it.type]) * 100)}%`}
            onChange={(size) => patchItem(it.id, { size }, 'size')}
          />
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => resize(1 / 1.15)} className={tool} aria-label="Smaller">Smaller</button>
            <button type="button" onClick={() => resize(1.15)} className={tool} aria-label="Bigger">Bigger</button>
            <button type="button" onClick={() => patchItem(it.id, { x: 50, y: 50 })} className={tool}>Centre</button>
          </div>
          <div className="space-y-3 pt-3 border-t border-premium-borderDark">
            <span className={lbl}>Effects</span>
            {effectsFor(it, (p, key) => patchItem(it.id, p as Partial<LayoutItem>, key))}
            <Field name="Keeps moving"><Chips<Loop> value={it.loop} options={LOOPS} onChange={(loop) => patchItem(it.id, { loop })} /></Field>
            <Field name="Shadow"><Chips<Shadow> value={it.shadow} options={SHADOWS} onChange={(shadow) => patchItem(it.id, { shadow })} /></Field>
            <Field name="Glow"><Chips<Glow> value={it.glow} options={GLOWS} onChange={(glow) => patchItem(it.id, { glow })} /></Field>
            <Slider name="Opacity" value={it.opacity} min={0.1} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(opacity) => patchItem(it.id, { opacity }, 'opacity')} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => duplicate(it)} className={tool}><Copy className="w-3.5 h-3.5" /> Duplicate</button>
            <button type="button" onClick={() => removeItem(it.id)} className={`${tool} hover:!text-premium-danger hover:!border-premium-danger/40`}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
          </div>
        </div>
      );
    }
    if (selection === FRAME) {
      return (
        <div className="space-y-4">
          <Field name="Frame">
            <div className="flex flex-wrap gap-1.5">
              {FRAME_PRESETS.filter((p) => p.id !== 'image' || !!draft.frame.imageUrl).map((p) => (
                <button key={p.id} type="button" onClick={() => patchFrame({ preset: p.id })} className={chip(frame.preset === p.id)} title={p.desc} aria-pressed={frame.preset === p.id}>
                  {p.id === 'image' ? 'Own frame' : p.label}
                </button>
              ))}
            </div>
          </Field>
          <button type="button" onClick={() => patchFrame({ preset: 'none' })} disabled={frame.preset === 'none'} className={`${tool} hover:!text-premium-danger hover:!border-premium-danger/40`}><Trash2 className="w-3.5 h-3.5" /> Delete the frame</button>
        </div>
      );
    }
    if (selection === FOOTER) {
      return (
        <div className="space-y-4">
          {frame.footerOn ? (
            <>
              {frame.footerStyle !== 'image' && (
                <>
                  <Field name="Footer text">
                    <input value={frame.footerText} maxLength={120} onChange={(e) => patchFrame({ footerText: e.target.value }, 'footer')} placeholder="e.g. #TechUnite2026" className={input} />
                  </Field>
                  <Field name="Style">
                    <Chips value={FOOTER_STYLES.includes(frame.footerStyle as (typeof FOOTER_STYLES)[number]) ? frame.footerStyle : 'dark'} options={FOOTER_STYLES.map((s) => ({ id: s, label: s[0].toUpperCase() + s.slice(1) }))} onChange={(footerStyle) => patchFrame({ footerStyle })} />
                  </Field>
                  <button type="button" onClick={() => patchFrame({ footerLogo: !frame.footerLogo })} className={chip(frame.footerLogo)} aria-pressed={frame.footerLogo}>Show logo</button>
                </>
              )}
              {frame.footerStyle === 'image' && <p className="text-[11px] text-zinc-400">This footer is your own banner. Change it with Edit on the source card.</p>}
              <button type="button" onClick={() => patchFrame({ footerOn: false })} className={`${tool} hover:!text-premium-danger hover:!border-premium-danger/40`}><Trash2 className="w-3.5 h-3.5" /> Delete the footer</button>
            </>
          ) : (
            <>
              <p className="text-[11px] text-zinc-400">The footer is deleted.</p>
              <button type="button" onClick={() => patchFrame({ footerOn: true })} className={tool}>Put the footer back</button>
            </>
          )}
        </div>
      );
    }
    // The screen's own content
    return (
      <div className="space-y-4">
        <Slider name="Size" value={main.scale} min={SCALE_RANGE.min} max={SCALE_RANGE.max} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(scale) => patchMain({ scale }, 'scale')} />
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => resize(1 / 1.15)} className={tool} aria-label="Smaller">Smaller</button>
          <button type="button" onClick={() => resize(1.15)} className={tool} aria-label="Bigger">Bigger</button>
          <button type="button" onClick={() => patchMain({ x: 0, y: 0, scale: 1 })} disabled={main.x === 0 && main.y === 0 && main.scale === 1} className={tool}><RotateCcw className="w-3.5 h-3.5" /> Reset size and place</button>
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed">Click the {isModule ? 'stage' : 'picture'} once to select it, then drag it to move it. Anything that leaves the screen is cut off.</p>
        <div className="space-y-3 pt-3 border-t border-premium-borderDark">
          <span className={lbl}>Effects</span>
          {effectsFor(main, (p, key) => patchMain(p as Partial<MainLayout>, key))}
          {(scene.kind === 'images' || scene.kind === 'slides') && (
            <Field name="Slow zoom (Ken Burns)">
              <button type="button" onClick={() => patchMain({ kenburns: !main.kenburns })} className={chip(main.kenburns)} aria-pressed={main.kenburns}>{main.kenburns ? 'On' : 'Off'}</button>
            </Field>
          )}
          <Slider name="Blur" value={main.blur} min={0} max={24} step={1} format={(v) => `${v}px`} onChange={(blur) => patchMain({ blur }, 'blur')} />
          {main.blur > 0 && (scene.kind === 'video' || scene.kind === 'web' || isModule) && (
            <p className="text-[11px] text-premium-gold leading-relaxed">
              Blur on {scene.kind === 'video' ? 'a video' : isModule ? 'a stage module' : 'a moving page'} is heavy for the graphics card and can make a big screen stutter, most on 4K. Check it on the real screen, or blur a picture instead.
            </p>
          )}
          <Slider name="Darken" value={main.dim} min={0} max={0.8} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(dim) => patchMain({ dim }, 'dim')} />
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          {isModule
            ? 'The stage module itself cannot be deleted here. To go back to the plain module, remove this custom version from its source card.'
            : `The ${kindLabel.toLowerCase()} itself cannot be deleted here. To replace it, use Edit on its source card.`}
        </p>
      </div>
    );
  })();

  const rows: { id: string; icon: React.ReactNode; name: string; sub?: string }[] = [
    ...[...items].reverse().map((i) => ({ id: itemSel(i.id), icon: <ItemIcon item={i} />, name: itemLabel(i), sub: i.type === 'text' ? 'Text' : i.type === 'image' ? 'Picture' : 'Logo' })),
    ...(look.on || isModule ? [] : [
      { id: FOOTER, icon: <PanelBottom className="w-3.5 h-3.5" />, name: 'Footer', sub: frame.footerOn ? frame.footerStyle === 'image' ? 'Own banner' : frame.footerText || 'On' : 'Deleted' },
      { id: FRAME, icon: <FrameIcon className="w-3.5 h-3.5" />, name: 'Frame', sub: frame.preset === 'none' ? 'None' : FRAME_PRESETS.find((p) => p.id === frame.preset)?.label },
    ]),
    { id: MAIN, icon: <Layers className="w-3.5 h-3.5" />, name: isModule ? scene.title : kindLabel, sub: isModule ? 'The stage module itself' : 'The screen itself' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Screen editor">
      <div className="w-full max-w-[1400px] rounded-[2rem] bg-premium-charcoal border border-premium-borderDark p-4 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl font-display font-bold text-white truncate">Edit screen · {scene.title}</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              A draft in this browser: the big screens keep showing the saved version until you push.
              {target ? <> Shown as <span className="font-mono text-zinc-300">{target.name} · {target.width} × {target.height}</span>.</> : null}
            </p>
          </div>
          <button type="button" onClick={requestClose} className="text-zinc-500 hover:text-white scale-on-click shrink-0" aria-label="Close the editor"><X className="w-5 h-5" /></button>
        </div>

        {restored && (
          <div className="p-2.5 rounded-xl bg-premium-gold/10 border border-premium-gold/30 text-[11px] text-premium-gold font-bold flex items-center justify-between gap-3">
            <span>Continuing the draft you left unsaved.</span>
            <button type="button" onClick={() => void discard()} className="underline underline-offset-2 scale-on-click">Start over</button>
          </div>
        )}
        {error && (
          <div role="alert" className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-xs font-bold flex items-start justify-between gap-3">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="scale-on-click shrink-0" aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {leaving && (
          <div role="alertdialog" className="p-3 rounded-xl bg-premium-surfaceDark border border-premium-gold/40 text-xs text-white flex flex-wrap items-center justify-between gap-3">
            <span className="font-bold">You have changes that are not pushed yet.</span>
            <span className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setLeaving(false)} className={chip(false)}>Keep editing</button>
              <button type="button" onClick={onClose} className={chip(true)}>Keep the draft and close</button>
              <button type="button" onClick={async () => { await discard(); onClose(); }} className={`${chip(false)} hover:!text-premium-danger`}>Discard and close</button>
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
          {/* Canvas */}
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setHist((h) => undo(h))} disabled={!hist.past.length} className={tool} aria-label="Undo" title="Undo (Ctrl/Cmd+Z)"><Undo2 className="w-4 h-4" /> Undo</button>
              <button type="button" onClick={() => setHist((h) => redo(h))} disabled={!hist.future.length} className={tool} aria-label="Redo" title="Redo (Shift+Ctrl/Cmd+Z)"><Redo2 className="w-4 h-4" /> Redo</button>
              <span className="w-px h-6 bg-premium-borderDark mx-1" />
              <button type="button" onClick={() => addItem(makeText())} className={tool}><Type className="w-4 h-4" /> Text</button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void addPicture(e.target.files?.[0])} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy === 'upload'} className={tool}>
                {busy === 'upload' ? <Loader2 className="w-4 h-4 animate-spin text-premium-gold" /> : <ImagePlus className="w-4 h-4" />} Picture
              </button>
              <button type="button" onClick={() => addItem(makeLogo())} className={tool}><Sparkles className="w-4 h-4" /> Logo</button>
              <span className="flex-1" />
              <button type="button" onClick={() => setReplay((n) => n + 1)} className={tool} title="Play the effects again"><Play className="w-4 h-4" /> Replay effects</button>
              <button type="button" onClick={() => setGuides((g) => !g)} className={tool} aria-pressed={!guides} title="Hide the selection outlines to see the screen as it will look">
                {guides ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {guides ? 'Clean view' : 'Show outlines'}
              </button>
            </div>

            <div className="w-full rounded-2xl border-2 border-premium-success/50 overflow-hidden bg-black" style={{ aspectRatio: `${dw} / ${DESIGN_HEIGHT}`, maxHeight: '64vh' }}>
              <FitBox width={dw} height={DESIGN_HEIGHT} className="w-full h-full">
                <ScreenChromeView chrome={look} event={event}>
                  <div ref={stageRef} className="absolute inset-0 select-none">
                    <SceneContent
                      key={loadKey}
                      scene={draftScene}
                      slide={slide}
                      playing
                      sound={false}
                      logo={logo}
                      slug={slug}
                      wallKey={wallKey}
                      replay={replay}
                      bare={look.on}
                      onReady={onReady}
                      onFail={onFail}
                      onOverlays={setOverlays}
                    />
                    {guides && (
                      <EditOverlay stageRef={stageRef} dw={dw} items={items} main={main} sel={selection} onSelect={setSel} begin={begin} liveItem={liveItem} liveMain={liveMain} end={end} />
                    )}
                  </div>
                </ScreenChromeView>
              </FitBox>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-h-[1.75rem]">
              <LoadBadge load={load} onRetry={() => setNonce((n) => n + 1)} />
              {overlays.pending > 0 &&<span role="status" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-300"><Loader2 className="w-3.5 h-3.5 animate-spin text-premium-gold" /> Loading added pictures…</span>}
              {overlays.failed > 0 && <span role="alert" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-premium-danger"><AlertTriangle className="w-3.5 h-3.5" /> A picture you added could not be loaded. Delete it or add it again.</span>}
              {steps > 1 && (
                <div className="flex items-center gap-2 text-xs text-zinc-400 ml-auto">
                  <button type="button" onClick={() => setSlideIndex(Math.max(0, slide - 1))} className={chip(false)}>Previous</button>
                  <span className="font-mono">{slide + 1} / {steps}</span>
                  <button type="button" onClick={() => setSlideIndex(Math.min(steps - 1, slide + 1))} className={chip(false)}>Next</button>
                </div>
              )}
            </div>

            {(scene.kind === 'slides' || scene.kind === 'images') && draft.media.length > 1 && (
              <div className="space-y-1.5">
                <span className={lbl}>{scene.kind === 'slides' ? 'Slides' : 'Pictures'} · delete the ones you do not want</span>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {draft.media.map((m, i) => (
                    <div key={`${m.url}-${i}`} className={`relative shrink-0 rounded-lg overflow-hidden border-2 ${i === slide ? 'border-premium-gold' : 'border-premium-borderDark'}`}>
                      <button type="button" onClick={() => setSlideIndex(i)} className="block scale-on-click" aria-label={`Show slide ${i + 1}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.url} alt="" className="w-24 h-14 object-cover" />
                      </button>
                      <button type="button" onClick={() => removeSlide(i)} className="absolute top-0.5 right-0.5 p-0.5 rounded-md bg-black/70 text-zinc-300 hover:text-premium-danger scale-on-click" aria-label={`Delete slide ${i + 1}`}><X className="w-3 h-3" /></button>
                      <span className="absolute bottom-0.5 left-1 text-[9px] font-mono text-white/80">{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Layers and the selected thing's settings */}
          <div className="space-y-4 xl:max-h-[78vh] xl:overflow-y-auto xl:pr-1">
            <div className="space-y-1.5">
              <span className={lbl}>Layers · top first</span>
              <div className="space-y-1">
                {rows.map((r) => {
                  const on = selection === r.id;
                  const item = r.id.startsWith('item:') ? items.find((i) => i.id === r.id.slice(5)) : undefined;
                  return (
                    <div key={r.id} className={`flex items-center gap-1 rounded-xl border pr-1 ${on ? 'border-premium-gold/60 bg-premium-goldDim' : 'border-premium-borderDark bg-premium-surfaceDark'}`}>
                      <button type="button" onClick={() => setSel(r.id)} className="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-2 text-left scale-on-click" aria-pressed={on}>
                        <span className={on ? 'text-premium-gold' : 'text-zinc-500'}>{r.icon}</span>
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-white truncate">{r.name}</span>
                          {r.sub && <span className="block text-[10px] text-zinc-500 truncate">{r.sub}</span>}
                        </span>
                      </button>
                      {item && (
                        <>
                          <button type="button" onClick={() => reorder(item.id, 1)} className="p-1 text-zinc-500 hover:text-white scale-on-click" aria-label="Bring forward"><ArrowUp className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => reorder(item.id, -1)} className="p-1 text-zinc-500 hover:text-white scale-on-click" aria-label="Send back"><ArrowDown className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => removeItem(item.id)} className="p-1 text-zinc-500 hover:text-premium-danger scale-on-click" aria-label={`Delete ${r.name}`}><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                      {r.id === FRAME && frame.preset !== 'none' && (
                        <button type="button" onClick={() => patchFrame({ preset: 'none' })} className="p-1 text-zinc-500 hover:text-premium-danger scale-on-click" aria-label="Delete the frame"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                      {r.id === FOOTER && frame.footerOn && (
                        <button type="button" onClick={() => patchFrame({ footerOn: false })} className="p-1 text-zinc-500 hover:text-premium-danger scale-on-click" aria-label="Delete the footer"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  );
                })}
              </div>
              {look.on && <p className="text-[11px] text-zinc-500 leading-relaxed">{target?.name} draws its own header, frame and footer around this screen, so they are not edited here. Change them with the palette button on the screen&apos;s card.</p>}
              {isModule && !look.on && <p className="text-[11px] text-zinc-500 leading-relaxed">A stage module draws its own header and ticker. To set one header, frame and footer for the whole screen, use the palette button on the screen&apos;s card.</p>}
            </div>
            <div className="pt-3 border-t border-premium-borderDark" data-testid="inspector">
              {inspector}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-premium-borderDark">
          <div className="min-w-0 space-y-1">
            <button type="button" onClick={() => void discard()} disabled={!dirty} className={`${tool} hover:!text-premium-danger hover:!border-premium-danger/40`}><RotateCcw className="w-3.5 h-3.5" /> Discard the draft</button>
            {liveOn.length > 0 && <p className="text-[10px] text-zinc-500">On air now: {liveOn.join(', ')}. Saving changes those screens too, once the new version has loaded there.</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={requestClose} className="px-4 py-2.5 rounded-xl border border-premium-borderDark text-zinc-300 hover:text-white text-xs font-bold scale-on-click">{dirty ? 'Close' : 'Done'}</button>
            <button
              type="button"
              onClick={() => void finish(true, false)}
              disabled={!dirty || !canPush || busy !== null}
              title={dirty ? (canPush ? undefined : 'Wait until the draft has loaded') : 'No changes to save'}
              className="px-4 py-2.5 rounded-xl border border-premium-gold/50 text-premium-gold hover:bg-premium-goldDim text-xs font-bold scale-on-click disabled:opacity-40 flex items-center gap-1.5"
            >
              {busy === 'save' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
            </button>
            {target && (
              <button
                type="button"
                onClick={() => void finish(true, true)}
                disabled={(!dirty && alreadyLiveOnTarget) || !canPush || busy !== null}
                title={!dirty && alreadyLiveOnTarget ? 'Nothing to push: this is already live there' : canPush ? undefined : 'Wait until the draft has loaded'}
                className="px-6 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click disabled:opacity-50 flex items-center gap-2"
              >
                {busy === 'push' ? <Loader2 className="w-4 h-4 animate-spin" /> : dirty ? <Send className="w-4 h-4" /> : <Check className="w-4 h-4" />} {dirty ? 'Push to' : 'Take to'} {target.name}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
