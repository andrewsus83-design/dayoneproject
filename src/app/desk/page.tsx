'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, LogOut, ScanLine } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSessionUser } from '@/lib/useSession';
import { displayName } from '@/lib/auth';

/** Landing page for register-desk staff: pick the event, then the desk opens unlocked. */
export default function DeskHome() {
  const router = useRouter();
  const { user } = useSessionUser();
  const [slug, setSlug] = useState('');

  const open = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = slug.trim().toLowerCase().replace(/^.*\/events\//, '').replace(/[^a-z0-9-].*$/, '');
    if (clean) router.push(`/events/${clean}/gate`);
  };

  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 font-sans flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-xl shadow-gold">D1</div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">Register desk</h1>
            <p className="text-xs text-zinc-500 mt-1">{user ? `Signed in as ${displayName(user)}` : 'Loading…'}</p>
          </div>
        </div>

        <form onSubmit={open} className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Event link</span>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. popverse" className="w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-4 py-3.5 rounded-xl text-sm outline-none focus:border-premium-gold placeholder:text-zinc-600 font-mono" />
          </label>
          <p className="text-[11px] text-zinc-500">Type the event name from its link (app.dayoneproject.xyz/events/<span className="text-premium-gold">name</span>) or paste the whole link.</p>
          <button type="submit" disabled={!slug.trim()} className="w-full py-3.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click flex items-center justify-center gap-2 disabled:opacity-60">
            <ScanLine className="w-4 h-4" /> Open the desk <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <button type="button" onClick={signOut} className="w-full text-xs font-bold text-zinc-500 hover:text-premium-danger flex items-center justify-center gap-1.5 scale-on-click">
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </div>
  );
}
