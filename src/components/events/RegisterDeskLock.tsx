'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, LogIn, ShieldAlert } from 'lucide-react';
import { useEventConfigBySlug } from '@/lib/eventStore';
import { isSampleSlug } from '@/lib/events';
import { createClient } from '@/lib/supabase/client';
import { useSessionUser } from '@/lib/useSession';
import { appRole } from '@/lib/auth';

/**
 * The register desk opens only for a signed-in desk, organizer or admin account. For a real (server) event the
 * account must also be on the team that runs it: the event row is only readable by its organization's members.
 * Built-in sample events open for any signed-in account with an app role.
 */
export function RegisterDeskLock({ slug, children }: { slug: string; children: (lock: () => void) => React.ReactNode }) {
  const router = useRouter();
  const { hydrated, config } = useEventConfigBySlug(slug);
  const { user, ready } = useSessionUser();
  const hasRole = !!appRole(user);
  const sample = isSampleSlug(slug);
  const accessKey = `${slug}:${user?.id ?? ''}`;
  const [access, setAccess] = useState<{ key: string; member: boolean } | null>(null);
  const loginHref = `/login?as=desk&next=${encodeURIComponent(`/events/${slug}/gate`)}`;

  useEffect(() => {
    if (!ready || !hasRole || sample) return;
    let alive = true;
    createClient()
      .from('a41_events')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (alive) setAccess({ key: accessKey, member: !error && !!data });
      });
    return () => {
      alive = false;
    };
  }, [ready, hasRole, sample, slug, accessKey]);

  const signOut = async () => {
    await createClient().auth.signOut();
  };
  const switchAccount = async () => {
    await signOut();
    router.push(loginHref);
  };

  if (!hydrated || !ready) return <div className="min-h-screen bg-premium-black" />;
  const member = sample ? true : access?.key === accessKey ? access.member : null;
  if (hasRole && member === null) return <div className="min-h-screen bg-premium-black" />;
  if (hasRole && member) return <>{children(signOut)}</>;

  const signedIn = !!user;

  return (
    <div className="min-h-screen bg-premium-black text-zinc-100 font-sans flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
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

        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4 text-center">
          {signedIn ? (
            <>
              <p className="text-sm font-bold text-white flex items-center justify-center gap-2">
                <ShieldAlert className="w-4 h-4 text-premium-danger" /> This account can&apos;t open this desk
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {user?.email} is not on the team that runs this event. Ask the event&apos;s account owner to add you in Settings, then sign in again.
              </p>
              <button
                type="button"
                onClick={switchAccount}
                className="w-full py-3.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" /> Sign in with another account
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Desk staff sign in with the email and access code from the event&apos;s account owner. Organizers use their emailed code.
              </p>
              <Link
                href={loginHref}
                className="w-full py-3.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" /> Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
