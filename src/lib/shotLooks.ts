import { PRISM_COLORS } from '@/lib/eventTheme';

/*
 * The looks of the guest app's Shot camera: filters, effects and frames, drawn on a 2D canvas so they are baked
 * into the photo or video that goes to the wall and to social media. Filters use blend modes, not ctx.filter
 * (Safari does not support it). The organizer picks which looks guests get (DesignConfig.shot).
 */

export interface LookOption {
  id: string;
  label: string;
}

/** Normal, no effect and no frame are always offered; these are the ones the organizer switches on or off. */
export const SHOT_FILTERS: LookOption[] = [
  { id: 'vivid', label: 'Vivid' },
  { id: 'warm', label: 'Warm' },
  { id: 'cool', label: 'Cool' },
  { id: 'mono', label: 'Mono' },
  { id: 'vintage', label: 'Vintage' },
  { id: 'drama', label: 'Drama' },
];

export const SHOT_EFFECTS: LookOption[] = [
  { id: 'vignette', label: 'Vignette' },
  { id: 'lightleak', label: 'Light leak' },
  { id: 'grain', label: 'Film grain' },
  { id: 'sparkle', label: 'Sparkle' },
  { id: 'prism', label: 'Prism glow' },
];

export const SHOT_FRAMES: LookOption[] = [
  { id: 'event', label: 'Event' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'neon', label: 'Neon' },
  { id: 'prism', label: 'Prism' },
];

/** Frames the organizer uploaded are stored with this prefix in DesignConfig.shot.frames. */
export const CUSTOM_FRAME_PREFIX = 'custom:';

export const SHOT_WIDTH = 720;
export const SHOT_HEIGHT = 1280;

/** What the frames write and draw: the event's name, date, colour and logo, and loaded custom frame images. */
export interface LookAssets {
  eventName: string;
  dateLabel: string;
  primary: string;
  fontFamily: string;
  logo: HTMLImageElement | null;
  customFrames: Record<string, HTMLImageElement | null>;
}

export interface Look {
  filter: string;
  effect: string;
  frame: string;
}

export const PLAIN_LOOK: Look = { filter: 'normal', effect: 'none', frame: 'none' };

/* ───────────────────────── Source ───────────────────────── */

/**
 * Draws the camera frame, photo or video into w×h. cover fills and crops (the camera); contain shows the whole
 * picture on a dimmed, enlarged copy of itself (photos and videos from the gallery).
 */
export function drawSource(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  sw: number,
  sh: number,
  w: number,
  h: number,
  opts: { mirror?: boolean; fit?: 'cover' | 'contain' } = {},
) {
  if (!sw || !sh) return;
  const cover = Math.max(w / sw, h / sh);
  const drawAt = (scale: number) => {
    const dw = sw * scale;
    const dh = sh * scale;
    ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
  };
  ctx.save();
  if (opts.mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  drawAt(cover);
  if (opts.fit === 'contain') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, h);
    drawAt(Math.min(w / sw, h / sh));
  }
  ctx.restore();
}

/* ───────────────────────── Filters ───────────────────────── */

function blendFill(ctx: CanvasRenderingContext2D, mode: GlobalCompositeOperation, color: string, alpha: number, w: number, h: number) {
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** `redraw` draws the source again with the current blend mode (used to add contrast). */
export function applyFilter(ctx: CanvasRenderingContext2D, id: string, w: number, h: number, redraw: () => void) {
  const again = (mode: GlobalCompositeOperation, alpha: number) => {
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = alpha;
    redraw();
    ctx.restore();
  };
  switch (id) {
    case 'vivid':
      again('overlay', 0.35);
      blendFill(ctx, 'saturation', 'hsl(0,100%,50%)', 0.22, w, h);
      break;
    case 'warm':
      blendFill(ctx, 'soft-light', '#FFB066', 0.55, w, h);
      blendFill(ctx, 'screen', '#2A1200', 0.18, w, h);
      break;
    case 'cool':
      blendFill(ctx, 'soft-light', '#5AA9FF', 0.5, w, h);
      blendFill(ctx, 'screen', '#001A33', 0.16, w, h);
      break;
    case 'mono':
      blendFill(ctx, 'saturation', '#808080', 1, w, h);
      blendFill(ctx, 'soft-light', '#000000', 0.18, w, h);
      break;
    case 'vintage':
      blendFill(ctx, 'saturation', '#808080', 0.45, w, h);
      blendFill(ctx, 'soft-light', '#E8B26A', 0.6, w, h);
      blendFill(ctx, 'screen', '#3B2A1A', 0.28, w, h);
      break;
    case 'drama':
      again('overlay', 0.55);
      blendFill(ctx, 'saturation', '#808080', 0.35, w, h);
      break;
  }
}

/* ───────────────────────── Effects ───────────────────────── */

let grainTile: HTMLCanvasElement | null = null;
function grain(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const g = c.getContext('2d')!;
  const img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

/** Fixed star positions (0..1), so the sparkle twinkles in place instead of jumping around. */
const STARS = Array.from({ length: 26 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { x: r(1), y: r(2), size: 0.008 + r(3) * 0.016, speed: 1.2 + r(4) * 2.4, phase: r(5) * Math.PI * 2, gold: r(6) > 0.5 };
});

function star(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill();
}

/** `t` is seconds since the camera opened, for the moving effects. */
export function applyEffect(ctx: CanvasRenderingContext2D, id: string, w: number, h: number, t: number) {
  ctx.save();
  switch (id) {
    case 'vignette': {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case 'lightleak': {
      ctx.globalCompositeOperation = 'screen';
      const x = w * (0.15 + 0.12 * Math.sin(t * 0.6));
      const y = h * (0.2 + 0.1 * Math.cos(t * 0.45));
      const a = ctx.createRadialGradient(x, y, 0, x, y, w * 0.9);
      a.addColorStop(0, 'rgba(255,140,60,0.55)');
      a.addColorStop(0.5, 'rgba(255,60,120,0.18)');
      a.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = a;
      ctx.fillRect(0, 0, w, h);
      const b = ctx.createRadialGradient(w, h * 0.85, 0, w, h * 0.85, w * 0.6);
      b.addColorStop(0, `rgba(255,200,90,${0.25 + 0.1 * Math.sin(t)})`);
      b.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = b;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case 'grain': {
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.22;
      const pattern = ctx.createPattern(grain(), 'repeat');
      if (pattern) {
        ctx.translate(Math.random() * 160, Math.random() * 160);
        ctx.fillStyle = pattern;
        ctx.fillRect(-160, -160, w + 320, h + 320);
      }
      break;
    }
    case 'sparkle': {
      ctx.globalCompositeOperation = 'screen';
      for (const s of STARS) {
        const tw = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
        ctx.globalAlpha = 0.25 + 0.75 * tw;
        ctx.fillStyle = s.gold ? '#FFE3A3' : '#FFFFFF';
        star(ctx, s.x * w, s.y * h, s.size * w * (0.6 + 0.6 * tw));
      }
      break;
    }
    case 'prism': {
      ctx.globalCompositeOperation = 'screen';
      const shift = (t * 0.08) % 1;
      // The event's prism colours down both edges, fading towards the middle and slowly drifting.
      const g = ctx.createLinearGradient(0, -h * shift, 0, h * (2 - shift));
      [...PRISM_COLORS, ...PRISM_COLORS].forEach((c, i, all) => g.addColorStop(i / (all.length - 1), c));
      ctx.fillStyle = g;
      const strips = 8;
      const strip = (w * 0.16) / strips;
      for (let k = 0; k < strips; k++) {
        ctx.globalAlpha = 0.5 * (1 - k / strips);
        ctx.fillRect(k * strip, 0, strip, h);
        ctx.fillRect(w - (k + 1) * strip, 0, strip, h);
      }
      break;
    }
  }
  ctx.restore();
}

/* ───────────────────────── Frames ───────────────────────── */

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number, family: string) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (s > 10 && ctx.measureText(text).width > maxWidth) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  return s;
}

function logoOrBadge(ctx: CanvasRenderingContext2D, a: LookAssets, x: number, y: number, size: number) {
  if (a.logo && a.logo.naturalWidth) {
    const ratio = a.logo.naturalWidth / a.logo.naturalHeight;
    const lw = Math.min(size * 3, size * ratio);
    ctx.drawImage(a.logo, x, y, lw, lw / ratio);
    return;
  }
  ctx.fillStyle = '#C5A059';
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#09090B';
  ctx.font = `700 ${size * 0.45}px ${a.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('D1', x + size / 2, y + size / 2 + size * 0.02);
}

export function applyFrame(ctx: CanvasRenderingContext2D, id: string, w: number, h: number, a: LookAssets) {
  if (id === 'none') return;
  ctx.save();
  const u = w / 100;
  if (id.startsWith(CUSTOM_FRAME_PREFIX)) {
    const img = a.customFrames[id.slice(CUSTOM_FRAME_PREFIX.length)];
    if (img && img.naturalWidth) ctx.drawImage(img, 0, 0, w, h);
  } else if (id === 'event') {
    const shade = ctx.createLinearGradient(0, h * 0.68, 0, h);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.78)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, h * 0.68, w, h * 0.32);
    ctx.strokeStyle = a.primary;
    ctx.lineWidth = u * 1.2;
    roundRect(ctx, u * 3, u * 3, w - u * 6, h - u * 6, u * 4);
    ctx.stroke();
    logoOrBadge(ctx, a, u * 7, u * 7, u * 11);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#FFFFFF';
    fitText(ctx, a.eventName, 700, u * 6.4, w - u * 16, a.fontFamily);
    ctx.fillText(a.eventName, u * 8, h - u * 14);
    ctx.fillStyle = a.primary;
    ctx.font = `600 ${u * 3.4}px ${a.fontFamily}`;
    ctx.fillText(a.dateLabel.toUpperCase(), u * 8, h - u * 8.5);
  } else if (id === 'polaroid') {
    const side = u * 4.5;
    const bottom = h * 0.14;
    ctx.fillStyle = '#FBF8F1';
    ctx.fillRect(0, 0, w, side);
    ctx.fillRect(0, 0, side, h);
    ctx.fillRect(w - side, 0, side, h);
    ctx.fillRect(0, h - bottom, w, bottom);
    ctx.fillStyle = '#18181B';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fitText(ctx, a.eventName, 700, u * 6, w - u * 14, a.fontFamily);
    ctx.fillText(a.eventName, w / 2, h - bottom * 0.58);
    ctx.fillStyle = '#71717A';
    ctx.font = `500 ${u * 3.2}px ${a.fontFamily}`;
    ctx.fillText(a.dateLabel, w / 2, h - bottom * 0.24);
  } else if (id === 'neon') {
    for (const [color, inset, width] of [['#00F0FF', 3, 1.1], ['#FF3366', 5.2, 0.6]] as const) {
      ctx.shadowColor = color;
      ctx.shadowBlur = u * 4;
      ctx.strokeStyle = color;
      ctx.lineWidth = u * width;
      roundRect(ctx, u * inset, u * inset, w - u * inset * 2, h - u * inset * 2, u * 5);
      ctx.stroke();
    }
    ctx.shadowColor = '#00F0FF';
    ctx.shadowBlur = u * 3;
    ctx.fillStyle = '#E6FDFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fitText(ctx, a.eventName, 700, u * 5.6, w - u * 20, a.fontFamily);
    ctx.fillText(a.eventName, w / 2, h - u * 11);
  } else if (id === 'prism') {
    const g = ctx.createLinearGradient(0, 0, w, h);
    PRISM_COLORS.forEach((c, i) => g.addColorStop(i / (PRISM_COLORS.length - 1), c));
    ctx.strokeStyle = g;
    ctx.lineWidth = u * 2.4;
    roundRect(ctx, u * 2.5, u * 2.5, w - u * 5, h - u * 5, u * 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const label = a.eventName;
    const size = fitText(ctx, label, 700, u * 4.4, w - u * 30, a.fontFamily);
    const tw = ctx.measureText(label).width + u * 8;
    roundRect(ctx, (w - tw) / 2, h - u * 15, tw, size + u * 4, u * 3);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, w / 2, h - u * 15 + (size + u * 4) / 2);
  }
  ctx.restore();
}

/** One frame of the Shot camera: source, then filter, effect and frame. */
export function renderLook(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  sw: number,
  sh: number,
  look: Look,
  assets: LookAssets,
  opts: { mirror?: boolean; fit?: 'cover' | 'contain'; t?: number } = {},
) {
  const { width: w, height: h } = ctx.canvas;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const draw = () => drawSource(ctx, src, sw, sh, w, h, opts);
  draw();
  applyFilter(ctx, look.filter, w, h, draw);
  applyEffect(ctx, look.effect, w, h, opts.t ?? 0);
  applyFrame(ctx, look.frame, w, h, assets);
  ctx.restore();
}

/** A made-up scene for the organizer's previews (no camera there). */
export function samplePicture(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 270;
  c.height = 480;
  const g = c.getContext('2d')!;
  const sky = g.createLinearGradient(0, 0, 0, 480);
  sky.addColorStop(0, '#3B6FD8');
  sky.addColorStop(0.55, '#F2A65A');
  sky.addColorStop(1, '#5B2A3C');
  g.fillStyle = sky;
  g.fillRect(0, 0, 270, 480);
  g.fillStyle = '#FFE7A8';
  g.beginPath();
  g.arc(190, 200, 46, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#2A1B2E';
  g.beginPath();
  g.moveTo(0, 360);
  g.quadraticCurveTo(80, 300, 150, 350);
  g.quadraticCurveTo(220, 395, 270, 340);
  g.lineTo(270, 480);
  g.lineTo(0, 480);
  g.fill();
  g.fillStyle = '#C93B5E';
  g.beginPath();
  g.arc(95, 330, 26, 0, Math.PI * 2);
  g.fill();
  g.fillRect(72, 352, 46, 90);
  return c;
}

/** Loads a picture for the canvas without tainting it (event assets are served with CORS). */
export function loadCanvasImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    if (!url.startsWith('data:') && !url.startsWith('blob:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
