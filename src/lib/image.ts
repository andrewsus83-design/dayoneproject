const MAX_INPUT_BYTES = 20 * 1024 * 1024;

// Downscale + re-encode so uploads fit in browser storage (a 4K photo becomes ~150–350 KB).
export async function compressImage(file: File, maxSize = 1600, quality = 0.8): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file (JPG, PNG or WebP).');
  if (file.size > MAX_INPUT_BYTES) throw new Error('That image is over 20 MB. Please choose a smaller one.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('That file could not be read as an image.'));
      el.src = url;
    });
    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not process this image.');
    ctx.drawImage(img, 0, 0, w, h);
    const webp = canvas.toDataURL('image/webp', quality);
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          let s = String(cell ?? '');
          // Guests type these values: a leading = + - @ (or tab / CR) would run as a formula in Excel or Sheets.
          // Plain numbers and phone numbers (+62 812-…) can't call anything, so they stay as they are.
          if (typeof cell === 'string' && /^[=+\-@\t\r]/.test(s) && !/^[+-][\d\s().-]*$/.test(s)) s = `'${s}`;
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\n');
}
