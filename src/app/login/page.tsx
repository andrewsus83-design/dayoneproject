'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Briefcase, KeyRound, Loader2, Mail, ScanLine, ShieldCheck, Smartphone } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { appRole, canUseDashboard } from '@/lib/auth';
import { authApi } from '@/lib/authApi';
import { AuthenticatorQr } from '@/components/auth/AuthenticatorQr';

type Method = 'organizer' | 'desk' | 'owner';
type Step = 'start' | 'code' | 'setup' | 'setup-scan';

const input =
  'w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-4 py-3.5 rounded-xl text-sm outline-none focus:border-premium-gold placeholder:text-zinc-600';
const codeInput = `${input} font-mono tracking-[0.4em] text-center text-lg`;
const primary =
  'w-full py-3.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click flex items-center justify-center gap-2 disabled:opacity-60';
const quiet = 'w-full text-xs font-bold text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 pt-1';

const METHODS: { id: Method; label: string; icon: typeof Mail }[] = [
  { id: 'organizer', label: 'Organizer', icon: Briefcase },
  { id: 'desk', label: 'Register desk', icon: ScanLine },
  { id: 'owner', label: 'Platform admin', icon: ShieldCheck },
];

/** Only same-site paths are allowed after sign-in. */
function safeNext(raw: string | null): string | null {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{children}</span>;
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = safeNext(search.get('next'));
  const asParam = search.get('as');
  const [method, setMethod] = useState<Method>(asParam === 'desk' || asParam === 'owner' ? asParam : 'organizer');
  const [step, setStep] = useState<Step>('start');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [enroll, setEnroll] = useState<{ secret: string; uri: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    search.get('error') === 'no_access' ? 'This account does not have access yet. Ask your admin to add you.' : null,
  );

  const mail = email.trim().toLowerCase();

  const choose = (m: Method) => {
    setMethod(m);
    setStep('start');
    setCode('');
    setError(null);
    setNotice(null);
  };

  /** Runs a sign-in step with a spinner and a readable error. */
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!appRole(data.user)) {
      await supabase.auth.signOut();
      throw new Error('This account does not have access yet. Ask your admin to add you.');
    }
    const home = canUseDashboard(data.user) ? '/dashboard' : '/desk';
    const allowed = next && (canUseDashboard(data.user) || next.startsWith('/desk')) ? next : home;
    router.replace(allowed);
    router.refresh();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (method === 'organizer' && step === 'start') {
      run(async () => {
        await authApi.sendEmailCode(mail);
        setNotice(`We sent a 6-digit code to ${mail}.`);
        setStep('code');
      });
    } else if (method === 'organizer') {
      run(async () => {
        await authApi.verifyEmailCode(mail, code.trim());
        await finish();
      });
    } else if (method === 'desk') {
      run(async () => {
        await authApi.deskSignIn(mail, code.trim());
        await finish();
      });
    } else if (step === 'start') {
      run(async () => {
        await authApi.authenticatorSignIn(mail, code.trim());
        await finish();
      });
    } else if (step === 'setup') {
      run(async () => {
        setEnroll(await authApi.bootstrapStart(mail, setupCode));
        setCode('');
        setStep('setup-scan');
      });
    } else {
      run(async () => {
        await authApi.bootstrapFinish(mail, setupCode, code.trim());
        await finish();
      });
    }
  };

  const emailField = (
    <label className="block space-y-1.5">
      <Label>Email</Label>
      <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className={input} />
    </label>
  );
  const sixDigits = (label: string) => (
    <label className="block space-y-1.5">
      <Label>{label}</Label>
      <input inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" className={codeInput} />
    </label>
  );

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 font-sans flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-xl shadow-gold">D1</div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">Sign in</h1>
            <p className="text-xs text-zinc-500 mt-1">dayoneproject<span className="text-premium-gold">.xyz</span></p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 bg-premium-charcoal p-1 rounded-2xl border border-premium-borderDark">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => choose(m.id)}
              className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[11px] font-bold scale-on-click transition-all ${method === m.id ? 'bg-premium-gold text-black shadow-gold' : 'text-zinc-400 hover:text-white'}`}
            >
              <m.icon className="w-4 h-4" /> {m.label}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
          {error && <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-xs font-bold">{error}</div>}
          {notice && !error && <div className="p-3 rounded-xl bg-premium-success/10 border border-premium-success/30 text-premium-success text-xs font-bold">{notice}</div>}

          {method === 'organizer' && step === 'start' && (
            <>
              {emailField}
              <button type="submit" disabled={busy} className={primary}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Email me a code
              </button>
              <p className="text-[11px] text-zinc-500 text-center">We send a one-time code to the email your account owner added.</p>
            </>
          )}

          {method === 'organizer' && step === 'code' && (
            <>
              {sixDigits('Code from your email')}
              <button type="submit" disabled={busy || code.length < 6} className={primary}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Sign in
              </button>
              <button type="button" onClick={() => { setStep('start'); setCode(''); setNotice(null); }} className={quiet}>
                <ArrowLeft className="w-3.5 h-3.5" /> Use another email or send a new code
              </button>
            </>
          )}

          {method === 'desk' && (
            <>
              {emailField}
              <label className="block space-y-1.5">
                <Label>Access code</Label>
                <input required autoComplete="current-password" type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code from your admin" className={`${input} font-mono`} />
              </label>
              <button type="submit" disabled={busy} className={primary}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />} Open the register desk
              </button>
            </>
          )}

          {method === 'owner' && step === 'start' && (
            <>
              {emailField}
              {sixDigits('Authenticator code')}
              <button type="submit" disabled={busy || code.length < 6} className={primary}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />} Sign in
              </button>
              <button type="button" onClick={() => { setStep('setup'); setCode(''); setError(null); }} className={quiet}>
                First time? Set up your authenticator
              </button>
            </>
          )}

          {method === 'owner' && step === 'setup' && (
            <>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Enter the one-time setup code you saved in Supabase Vault as <code className="text-premium-gold">a41auth_setup_code</code>.
              </p>
              {emailField}
              <label className="block space-y-1.5">
                <Label>Setup code</Label>
                <input required value={setupCode} onChange={(e) => setSetupCode(e.target.value)} className={`${input} font-mono uppercase`} />
              </label>
              <button type="submit" disabled={busy} className={primary}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Continue
              </button>
              <button type="button" onClick={() => { setStep('start'); setError(null); }} className={quiet}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </button>
            </>
          )}

          {method === 'owner' && step === 'setup-scan' && enroll && (
            <>
              <AuthenticatorQr uri={enroll.uri} secret={enroll.secret} />
              {sixDigits('Code shown in the app')}
              <button type="submit" disabled={busy || code.length < 6} className={primary}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Confirm and sign in
              </button>
            </>
          )}
        </form>

        <p className="text-[11px] text-zinc-600 text-center">No account yet? Ask your account owner to add you in Settings.</p>
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
