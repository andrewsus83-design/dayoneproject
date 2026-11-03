const STORED = '/storage/v1/object/public/';

/** Saves a photo or video to the phone. Supabase Storage sends a stored file as a download (not a new tab) when asked to. */
export function downloadMedia(href: string, id: string, ext: string) {
  const filename = `dayoneproject-${id}.${ext}`;
  const link = document.createElement('a');
  link.href = href.includes(STORED) ? `${href}?download=${encodeURIComponent(filename)}` : href;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

const FILE_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' };

async function copyLink(link: string): Promise<ShareOutcome> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return 'failed';
  try {
    await navigator.clipboard.writeText(link);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/**
 * Shares a photo or video through the phone's share sheet (the file itself where it can), else its link is copied.
 * Stored files are shared as the file or its own link, never the page address, which can carry the wall key.
 */
export async function shareMedia({ url, id, caption }: { url: string; id: string; caption: string | null }): Promise<ShareOutcome> {
  const stored = url.includes(STORED);
  const link = stored ? url : window.location.href;
  const text = caption || 'A moment from the event, on dayoneproject.xyz';
  if (!navigator.share) return copyLink(link);
  try {
    if (stored && navigator.canShare) {
      const blob = await fetch(url).then((r) => r.blob());
      const file = new File([blob], `dayoneproject-${id}.${FILE_EXT[blob.type] ?? 'webp'}`, { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return 'shared';
      }
    }
    await navigator.share({ title: 'Event photo wall • dayoneproject.xyz', text, url: link });
    return 'shared';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    return copyLink(link);
  }
}
