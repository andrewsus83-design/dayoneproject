'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, KeyRound, Loader2, Lock, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { appRole } from '@/lib/auth';

type Mode = 'password' | 'code-request' | 'code-verify';

const input =
  'w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-4 py-3.5 rounded-xl text-sm outline-none focus:border-premium-gold placeholder:text-zinc-600';

/** Only same-site paths are allowed after sign-in. */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = safeNext(search.get('next'));
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    search.get('error') === 'no_access' ? 'This account does not have access to the event dashboard yet. Ask your admin to add you.'
      : search.get('error') === 'link' ? 'That sign-in link has expired or was already used. Request a new one.' : null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  const finish = async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!appRole(data.user)) {
      await supabase.auth.signOut();
      setError('This account does not have access to the event dashboard yet. Ask your admin to add you.');
      return;
    }
    router.replace(next);
    router.refresh();
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await createClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (err) {
      setError(err.message === 'Invalid login credentials' ? 'Wrong email or password.' : err.message);
      setBusy(false);
      return;
    }
    await finish();
    setBusy(false);
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await createClient().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    if (err) {
      setError(err.message.includes('Signups not allowed') ? 'No account with this email. Ask your admin to add you.' : err.message);
      return;
    }
    setNotice(`Check ${email.trim().toLowerCase()}: tap the sign-in link, or type the code below if the email shows one.`);
    setMode('code-verify');
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await createClient().auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
    if (err) {
      setError('That code is wrong or has expired.');
      setBusy(false);
      return;
    }
    await finish();
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 font-sans flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-xl shadow-gold">D1</div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">Sign in</h1>
            <p className="text-xs text-zinc-500 mt-1">dayoneproject<span className="text-premium-gold">.xyz</span> · organizers and admins</p>
          </div>
        </div>

        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
          {error && <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-xs font-bold">{error}</div>}
          {notice && mode === 'code-verify' && <div className="p-3 rounded-xl bg-premium-success/10 border border-premium-success/30 text-premium-success text-xs font-bold">{notice}</div>}

          {mode === 'password' && (
            <form onSubmit={signIn} className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Email</span>
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className={input} />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Password</span>
                <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={input} />
              </label>
              <button type="submit" disabled={busy} className="w-full py-3.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click flex items-center justify-center gap-2 disabled:opacity-60">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Sign in
              </button>
              <button type="button" onClick={() => { setMode('code-request'); setError(null); }} className="w-full text-xs font-bold text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 pt-1">
                <Mail className="w-3.5 h-3.5" /> No password? Email me a sign-in code
              </button>
            </form>
          )}

          {mode === 'code-request' && (
            <form onSubmit={sendCode} className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Email</span>
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className={input} />
              </label>
              <button type="submit" disabled={busy} className="w-full py-3.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click flex items-center justify-center gap-2 disabled:opacity-60">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Email me a code
              </button>
              <button type="button" onClick={() => { setMode('password'); setError(null); }} className="w-full text-xs font-bold text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 pt-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Use my password
              </button>
            </form>
          )}

          {mode === 'code-verify' && (
            <form onSubmit={verifyCode} className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Sign-in code</span>
                <input inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="123456" className={`${input} font-mono tracking-[0.4em] text-center text-lg`} />
              </label>
              <button type="submit" disabled={busy || code.length < 6} className="w-full py-3.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click flex items-center justify-center gap-2 disabled:opacity-60">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Sign in
              </button>
              <button type="button" onClick={() => { setMode('code-request'); setCode(''); setNotice(null); }} className="w-full text-xs font-bold text-zinc-400 hover:text-white pt-1">
                Send a new code
              </button>
            </form>
          )}
        </div>

        <p className="text-[11px] text-zinc-600 text-center">Accounts are created by your dayoneproject.xyz admin.</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-premium-black" />}>
      <LoginForm />
    </Suspense>
  );
}
