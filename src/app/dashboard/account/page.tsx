'use client';

import React, { useState } from 'react';
import { Check, KeyRound, Loader2, UserCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSessionUser } from '@/lib/useSession';
import { appRole, displayName } from '@/lib/auth';

const input = 'w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-premium-gold';

export default function AccountPage() {
  const { user } = useSessionUser();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== again) return setError('The two passwords do not match.');
    setBusy(true);
    const { error: err } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    setPassword('');
    setAgain('');
    setDone(true);
  };

  return (
    <div className="p-6 sm:p-10 max-w-xl w-full mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3"><UserCircle className="w-7 h-7 text-premium-gold" /> Account</h1>
        <p className="text-sm text-zinc-400 mt-1">{user ? `${displayName(user)} · ${user.email}${appRole(user) ? ` · ${appRole(user)}` : ''}` : 'Loading…'}</p>
      </div>

      <form onSubmit={save} className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
        <h2 className="font-display font-bold text-white text-lg flex items-center gap-2"><KeyRound className="w-4 h-4 text-premium-gold" /> Set a new password</h2>
        <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className={input} />
        <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} placeholder="Type it again" className={input} />
        {error && <p className="text-sm font-bold text-premium-danger">{error}</p>}
        {done && <p className="text-sm font-bold text-premium-success flex items-center gap-1.5"><Check className="w-4 h-4" /> Password saved. Use it next time you sign in.</p>}
        <button type="submit" disabled={busy} className="px-5 py-3 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click flex items-center gap-2 disabled:opacity-60">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save password
        </button>
      </form>
    </div>
  );
}
