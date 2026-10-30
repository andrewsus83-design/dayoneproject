'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** QR for an authenticator app, plus the key for typing it in by hand. */
export function AuthenticatorQr({ uri, secret }: { uri: string; secret: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(uri, { width: 220, margin: 1, color: { dark: '#09090B', light: '#FFFFFF' } }).then(setSrc).catch(() => setSrc(''));
  }, [uri]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-48 h-48 bg-white rounded-2xl p-2 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt="Authenticator QR code" className="w-full h-full" /> : <div className="w-full h-full animate-pulse bg-zinc-200 rounded-xl" />}
      </div>
      <p className="text-[11px] text-zinc-500 text-center">Scan with Google Authenticator, Authy or 1Password. Can&apos;t scan? Enter this key:</p>
      <code className="font-mono text-xs text-premium-gold bg-premium-black/60 rounded-lg px-3 py-1.5 break-all text-center select-all">{secret.match(/.{1,4}/g)?.join(' ')}</code>
    </div>
  );
}
