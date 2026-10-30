'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Briefcase, KeyRound, Loader2, Mail, ScanLine, ShieldCheck, Smartphone } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { appRole, assignedRole, canUseDashboard, homePath, isPlatformAdmin } from '@/lib/auth';
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

/** Authenticator apps and our emailed sign-in codes both use 6 digits. */
const CODE_DIGITS = 6;

const METHODS: { id: Method; label: string; icon: typeof Mail }[] = [
  { id: 'organizer', label: 'Organizer', icon: Briefcase },
  { id: 'desk', label: 'Staff', icon: ScanLine },
  { id: 'owner', label: 'Platform admin', icon: ShieldCheck },
];

const ERRORS: Record<string, string> = {
  no_access: 'This account does not have access yet. Ask your admin to add you.',
  authenticator: 'Platform admin access needs your authenticator. Sign in on the Platform admin tab with your email and the code from your authenticator app.',
};
const ADMIN_USES_AUTHENTICATOR = 'This account signs in on the Platform admin tab with its authenticator.';

/** Only same-site paths are allowed after sign-in (runs in the browser, after a sign-in). */
function safeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/')) return null;
  try {
    const target = new URL(raw, window.location.origin);
    return target.origin === window.location.origin ? target.pathname + target.search + target.hash : null;
  } catch {
    return null;
  }
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{children}</span>;
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const asParam = search.get('as');
  const [method, setMethod] = useState<Method>(
    asParam === 'desk' || asParam === 'screen' ? 'desk' : asParam === 'owner' ? 'owner' : 'organizer',
  );
  const [step, setStep] = useState<Step>('start');
  // The welcome email links here with the address filled in.
  const [email, setEmail] = useState(() => (search.get('email') ?? '').trim().slice(0, 254));
  const [code, setCode] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [enroll, setEnroll] = useState<{ secret: string; uri: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(ERRORS[search.get('error') ?? ''] ?? null);

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
    const next = safeNext(search.get('next'));
    if (!appRole(data.user)) {
      await supabase.auth.signOut();
      throw new Error(ERRORS.no_access);
    }
    // An account whose only access is the platform-admin email gets nothing from an emailed code or a password.
    if (method !== 'owner' && !assignedRole(data.user)) {
      await supabase.auth.signOut();
      throw new Error(ADMIN_USES_AUTHENTICATOR);
    }
    // The Platform admin sign-in opens the admin dashboard; the Organizer sign-in opens the events dashboard.
    if (method === 'owner' && isPlatformAdmin(data.user)) {
      router.replace(next?.startsWith('/admin') ? next : '/admin');
      router.refresh();
      return;
    }
    const home = homePath(data.user);
    // Desk staff may go back to the desk or to an event's register desk, screen managers to the screen switcher;
    // organizers anywhere on the site.
    const role = appRole(data.user);
    const staffPage = !!next && (
      role === 'screen'
        ? next.startsWith('/screen')
        : next.startsWith('/desk') || /^\/events\/[^/?#]+\/gate(?:[/?#]|$)/.test(next)
    );
    const allowed = next && (canUseDashboard(data.user) || staffPage) ? next : home;
    router.replace(allowed);
    router.refresh();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (method === 'organizer' && step === 'start') {
      run(async () => {
        const sent = await authApi.sendEmailCode(mail);
        setNotice(sent.message ?? 'If this email has an organizer account, a code is on its way.');
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
  const codeField = (label: string) => (
    <label className="block space-y-1.5">
      <Label>{label}</Label>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        required
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_DIGITS))}
        placeholder="123456"
        className={codeInput}
      />
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
              {codeField('6-digit code from your email')}
              <button type="submit" disabled={busy || code.length < CODE_DIGITS} className={primary}>
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
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />} Sign in
              </button>
              <p className="text-[11px] text-zinc-500 text-center">For the register desk and screen managers, with the access code from your organizer.</p>
            </>
          )}

          {method === 'owner' && step === 'start' && (
            <>
              {emailField}
              {codeField('Authenticator code')}
              <button type="submit" disabled={busy || code.length < CODE_DIGITS} className={primary}>
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
              {codeField('Code shown in the app')}
              <button type="submit" disabled={busy || code.length < CODE_DIGITS} className={primary}>
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
