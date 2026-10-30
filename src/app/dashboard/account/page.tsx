'use client';

import React, { useEffect, useState } from 'react';
import { Check, Loader2, ShieldCheck, Smartphone, UserCircle } from 'lucide-react';
import { useSessionUser } from '@/lib/useSession';
import { createClient } from '@/lib/supabase/client';
import { appRole, displayName, isPlatformAdmin, ROLE_LABELS } from '@/lib/auth';
import { authApi } from '@/lib/authApi';
import { AuthenticatorQr } from '@/components/auth/AuthenticatorQr';

export default function AccountPage() {
  const { user } = useSessionUser();
  const owner = isPlatformAdmin(user);
  const role = appRole(user);
  // The authenticator can only be changed from a session that was opened with it (the database decides).
  const [verified, setVerified] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [enroll, setEnroll] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!owner) return;
    let alive = true;
    createClient().rpc('a41_whoami').then(({ data }) => {
      if (!alive) return;
      const isAdmin = !!(data as { isAdmin?: boolean } | null)?.isAdmin;
      setVerified(isAdmin);
      if (isAdmin) authApi.authenticatorStatus().then((r) => alive && setEnabled(r.enabled)).catch(() => alive && setEnabled(null));
    });
    return () => {
      alive = false;
    };
  }, [owner]);

  const start = async () => {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      setEnroll(await authApi.authenticatorSetup());
      setCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the setup.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authApi.authenticatorConfirm(code);
      setEnroll(null);
      setEnabled(true);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code does not match.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-xl w-full mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3"><UserCircle className="w-7 h-7 text-premium-gold" /> Account</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {user ? `${displayName(user)} · ${user.email}${role ? ` · ${owner ? 'Platform admin' : ROLE_LABELS[role]}` : ''}` : 'Loading…'}
        </p>
      </div>

      <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3 text-sm text-zinc-300">
        <h2 className="font-display font-bold text-white text-lg">How you sign in</h2>
        <p>
          {owner
            ? 'With your email and the 6-digit code from your authenticator app.'
            : role === 'desk'
              ? 'With your email and the access code from your account owner. Ask them for a new code if you lose it.'
              : 'With a one-time code sent to your email. There is no password to remember.'}
        </p>
      </div>

      {owner && verified === false && (
        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-2 text-sm text-zinc-300">
          <h2 className="font-display font-bold text-white text-lg flex items-center gap-2"><Smartphone className="w-4 h-4 text-premium-gold" /> Authenticator app</h2>
          <p>To change your authenticator, sign out and sign in again on the Platform admin tab with your current authenticator code.</p>
        </div>
      )}

      {owner && verified && (
        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display font-bold text-white text-lg flex items-center gap-2"><Smartphone className="w-4 h-4 text-premium-gold" /> Authenticator app</h2>
            {enabled !== null && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${enabled ? 'bg-premium-success/15 text-premium-success border-premium-success/30' : 'bg-premium-danger/15 text-premium-danger border-premium-danger/30'}`}>
                {enabled ? 'On' : 'Not set up'}
              </span>
            )}
          </div>
          {done && <p className="text-sm font-bold text-premium-success flex items-center gap-1.5"><Check className="w-4 h-4" /> Authenticator saved. Use it next time you sign in.</p>}
          {error && <p className="text-sm font-bold text-premium-danger">{error}</p>}

          {!enroll ? (
            <button type="button" onClick={start} disabled={busy} className="px-5 py-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-white font-bold text-sm scale-on-click flex items-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} {enabled ? 'Move to a new phone' : 'Set up authenticator'}
            </button>
          ) : (
            <form onSubmit={confirm} className="space-y-4">
              <AuthenticatorQr uri={enroll.uri} secret={enroll.secret} />
              <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Code shown in the app" className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-4 py-3 rounded-xl text-lg font-mono tracking-[0.4em] text-center outline-none focus:border-premium-gold" />
              <p className="text-[11px] text-zinc-500">Your current authenticator keeps working until you confirm the new one.</p>
              <button type="submit" disabled={busy || code.length < 6} className="px-5 py-3 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click flex items-center gap-2 disabled:opacity-60">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Confirm
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
