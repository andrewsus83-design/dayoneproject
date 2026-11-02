/**
 * Links for Live Screens: what an organizer pastes (a web page, a YouTube or Vimeo video, Google Slides, Canva, an
 * image or a video file) becomes a scene the big screen can load. Pure functions, no network: the server-side check
 * (/api/screen-probe) decides whether a page allows framing, this only decides what a link is and how to show it.
 */

/** How a pasted link is stored: pictures and video files use the normal scene players, everything else is a page. */
export type LinkKind = 'images' | 'video' | 'web';

export interface ClassifiedLink {
  kind: LinkKind;
  /** What the big screen loads: the file itself, or the page / embed address. */
  url: string;
  /** 'youtube' | 'vimeo' | 'google-slides' | 'google-drive' | 'canva' | 'loom' | 'image' | 'video' | 'page'. */
  provider: string;
  /** Short words for the editor, e.g. "YouTube video". */
  label: string;
  /** A tip shown under the link, e.g. that a Google Slides deck must be shared. */
  note?: string;
  /** Pages and embeds may refuse to be framed or be unavailable: those get the server-side check. Files do not. */
  needsCheck: boolean;
}

export type LinkResult = ({ ok: true } & ClassifiedLink) | { ok: false; error: string };

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|svg)$/i;
const VIDEO_EXT = /\.(mp4|webm|ogv|m4v)$/i;
const STREAM_EXT = /\.(m3u8|mpd)$/i;

export function isHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password;
  } catch {
    return false;
  }
}

/** The domain without "www.", for names and cards. */
export function hostOf(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

const hostIs = (host: string, ...domains: string[]) => domains.some((d) => host === d || host.endsWith(`.${d}`));

function youtubeId(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = u.pathname.split('/')[1] || null;
  else if (hostIs(host, 'youtube.com', 'youtube-nocookie.com')) {
    const parts = u.pathname.split('/').filter(Boolean);
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0] ?? '')) id = parts[1] ?? null;
  }
  return id && /^[\w-]{6,20}$/.test(id) ? id : null;
}

/**
 * Turns pasted text into something the big screen can show.
 * - Adds https:// to a bare address and upgrades http:// (an http page cannot load inside our https app).
 * - Refuses anything that is not a public https address.
 * - Knows the usual embed providers; any other page is shown as a page.
 */
export function classifyLink(raw: string, opts: { seconds?: number } = {}): LinkResult {
  let text = raw.trim();
  if (!text) return { ok: false, error: 'Paste a link first.' };
  if (/\s/.test(text)) return { ok: false, error: 'A link has no spaces. Paste just the address.' };
  if (/^[a-z][a-z0-9+.-]*:/i.test(text) && !/^https?:\/\//i.test(text)) {
    return { ok: false, error: 'Only web links (https://…) can be shown on a screen.' };
  }
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`;

  let u: URL;
  try {
    u = new URL(text);
  } catch {
    return { ok: false, error: 'That does not look like a web address.' };
  }
  const upgraded = u.protocol === 'http:';
  if (upgraded) u.protocol = 'https:';
  if (u.username || u.password) return { ok: false, error: 'Remove the user name and password from the link.' };
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  if (!host.includes('.') || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.startsWith('[')) {
    return { ok: false, error: 'Use a public web address, for example https://example.com/page.' };
  }
  if (u.port && u.port !== '443') return { ok: false, error: 'Links with a custom port cannot be shown on a screen.' };

  const page = (extra: Partial<ClassifiedLink> = {}): LinkResult => ({
    ok: true, kind: 'web', url: u.toString(), provider: 'page', label: 'Web page', needsCheck: true, ...extra,
  });
  const embed = (provider: string, label: string, url: string, note?: string): LinkResult => ({
    ok: true, kind: 'web', url, provider, label, note, needsCheck: true,
  });

  const yt = youtubeId(u);
  if (yt) {
    return embed(
      'youtube', 'YouTube video',
      `https://www.youtube.com/embed/${yt}?autoplay=1&mute=1&loop=1&playlist=${yt}&controls=0&rel=0&playsinline=1&modestbranding=1&iv_load_policy=3`,
      'Plays without sound. For sound, upload the video file instead.',
    );
  }

  if (hostIs(host, 'vimeo.com')) {
    const id = (u.hostname === 'player.vimeo.com' ? u.pathname.match(/\/video\/(\d+)/) : u.pathname.match(/\/(\d{6,})/))?.[1];
    if (id) {
      return embed('vimeo', 'Vimeo video', `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&loop=1&title=0&byline=0&portrait=0`, 'Plays without sound. For sound, upload the video file instead.');
    }
  }

  if (host === 'docs.google.com') {
    const pub = u.pathname.match(/^\/presentation\/d\/e\/([\w-]+)/);
    const own = u.pathname.match(/^\/presentation\/d\/([\w-]+)/);
    const delay = Math.max(2, Math.round(opts.seconds ?? 8)) * 1000;
    if (pub || own) {
      const base = pub ? `https://docs.google.com/presentation/d/e/${pub[1]}` : `https://docs.google.com/presentation/d/${own![1]}`;
      return embed(
        'google-slides', 'Google Slides',
        `${base}/embed?start=true&loop=true&delayms=${delay}&rm=minimal`,
        'The deck must be shared as “Anyone with the link” (or published to the web) or the screen shows a sign-in page. Slides advance by themselves.',
      );
    }
  }

  if (host === 'drive.google.com') {
    const id = u.pathname.match(/^\/file\/d\/([\w-]+)/)?.[1];
    if (id) {
      return embed('google-drive', 'Google Drive file', `https://drive.google.com/file/d/${id}/preview`, 'The file must be shared as “Anyone with the link”.');
    }
  }

  if (host === 'canva.com' || host.endsWith('.canva.com')) {
    const m = u.pathname.match(/^\/design\/([\w-]+)\/([\w-]+)/);
    if (m) {
      return embed('canva', 'Canva design', `https://www.canva.com/design/${m[1]}/${m[2]}/view?embed`, 'The design must be shared with a view link.');
    }
  }

  if (hostIs(host, 'loom.com')) {
    const id = u.pathname.match(/^\/(?:share|embed)\/([\w]+)/)?.[1];
    if (id) return embed('loom', 'Loom video', `https://www.loom.com/embed/${id}?autoplay=1&hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`);
  }

  if (STREAM_EXT.test(u.pathname)) {
    return { ok: false, error: 'Live streams (.m3u8 / .mpd) are not supported. Use a YouTube or Vimeo link, or an MP4 file.' };
  }
  if (IMAGE_EXT.test(u.pathname)) {
    return { ok: true, kind: 'images', url: u.toString(), provider: 'image', label: 'Picture', needsCheck: false, note: upgraded ? 'Using https:// instead of http://.' : undefined };
  }
  if (VIDEO_EXT.test(u.pathname)) {
    return { ok: true, kind: 'video', url: u.toString(), provider: 'video', label: 'Video file', needsCheck: false, note: upgraded ? 'Using https:// instead of http://.' : undefined };
  }
  return page({ note: upgraded ? 'Using https:// instead of http://.' : undefined });
}

/** What the server-side check (/api/screen-probe) says about a link. */
export interface ProbeResult {
  /** False when the link cannot be shown; `problem` says why. */
  ok: boolean;
  category?: 'page' | 'image' | 'video' | 'other';
  contentType?: string;
  problem?: {
    code: 'blocked_framing' | 'not_found' | 'server_error' | 'unreachable' | 'not_embeddable' | 'protected' | 'unsupported' | 'invalid';
    message: string;
    /** A hard problem always stops going live; a soft one is a warning (the site may still load in the browser). */
    hard: boolean;
  };
}
