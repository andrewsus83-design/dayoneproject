'use client';

import React, { useEffect, useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { DEFAULT_ACCESS, useEventConfigBySlug } from '@/lib/eventStore';

const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 30_000;

function fingerprint(username: string, passcode: string) {
  let h = 5381;
  for (const c of `${username.toLowerCase()}\u0000${passcode}`) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return String(h >>> 0);
}

export function RegisterDeskLock({ slug, children }: { slug: string; children: (lock: () => void) => React.ReactNode }) {
  const { eventId, hydrated, config } = useEventConfigBySlug(slug);
  const expectedUser = config.access.username || DEFAULT_ACCESS.username;
  const expectedPass = config.access.passcode.length >= 4 ? config.access.passcode : DEFAULT_ACCESS.passcode;
  const sessionKey = `all41-desk-${eventId}`;
  const currentPrint = fingerprint(expectedUser, expectedPass);

  const [unlocked, setUnlocked] = useState(false);
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    try {
      setUnlocked(sessionStorage.getItem(sessionKey) === currentPrint);
    } catch {
      setUnlocked(false);
    }
  }, [hydrated, sessionKey, currentPrint]);

  useEffect(() => {
    if (!lockedUntil) return;
    setNow(Date.now());
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= lockedUntil) {
        setLockedUntil(0);
        setAttempts(0);
        setError(null);
      }
    }, 500);
    return () => clearInterval(t);
  }, [lockedUntil]);

  const lock = () => {
    try {
      sessionStorage.removeItem(sessionKey);
    } catch {}
    setUnlocked(false);
    setPasscode('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedUntil) return;
    if (username.trim().toLowerCase() === expectedUser.toLowerCase() && passcode === expectedPass) {
      try {
        sessionStorage.setItem(sessionKey, currentPrint);
      } catch {}
      setUnlocked(true);
      setError(null);
      setAttempts(0);
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    setPasscode('');
    if (next >= MAX_ATTEMPTS) {
      setLockedUntil(Date.now() + COOLDOWN_MS);
      setError('Too many wrong tries. Please wait 30 seconds.');
    } else {
      setError(`Wrong username or passcode. ${MAX_ATTEMPTS - next} ${MAX_ATTEMPTS - next === 1 ? 'try' : 'tries'} left.`);
    }
  };

  if (!hydrated) return <div className="min-h-screen bg-premium-black" />;
  if (unlocked) return <>{children(lock)}</>;

  const waitSeconds = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 font-sans flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-2xl shadow-gold">D1</div>
          <div>
            <p className="text-[10px] font-mono font-bold text-premium-gold uppercase tracking-[0.25em]">Register Desk</p>
            <h1 className="text-xl font-display font-bold text-white mt-1">{config.info.name}</h1>
            <p className="text-xs text-zinc-500 mt-1.5 flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3" /> Staff only — sign in to open check-in
            </p>
          </div>
        </div>

        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
          <div>
            <label htmlFor="desk-user" className="text-xs font-bold text-zinc-400 block mb-1.5">Username</label>
            <input
              id="desk-user"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(null); }}
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
              disabled={!!lockedUntil}
              className="w-full px-4 py-3.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white text-sm outline-none focus:border-premium-gold disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="desk-pass" className="text-xs font-bold text-zinc-400 block mb-1.5">Passcode</label>
            <div className="relative">
              <input
                id="desk-pass"
                type={showPass ? 'text' : 'password'}
                value={passcode}
                onChange={(e) => { setPasscode(e.target.value); setError(null); }}
                autoComplete="current-password"
                inputMode="text"
                disabled={!!lockedUntil}
                className="w-full px-4 py-3.5 pr-11 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white text-sm font-mono tracking-widest outline-none focus:border-premium-gold disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white scale-on-click"
                aria-label={showPass ? 'Hide passcode' : 'Show passcode'}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-xs font-bold text-premium-danger">
              {error}{waitSeconds > 0 ? ` (${waitSeconds}s)` : ''}
            </p>
          )}
          <button
            type="submit"
            disabled={!username.trim() || !passcode || !!lockedUntil}
            className="w-full py-3.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" /> Unlock Register Desk
          </button>
        </div>
        <p className="text-[11px] text-zinc-600 text-center">The organizer sets this login in Dashboard → Settings → Register Desk Access.</p>
      </form>
    </div>
  );
}
