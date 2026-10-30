'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSessionUser } from '@/lib/useSession';
import { appRole, displayName, isPlatformAdmin } from '@/lib/auth';

/** Signed-in account with sign-out; shown at the bottom of the dashboard and admin sidebars. */
export function UserMenu({ showAdminLink = true }: { showAdminLink?: boolean }) {
  const router = useRouter();
  const { user } = useSessionUser();
  const name = displayName(user);
  const role = appRole(user);
  const initials = name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'D1';

  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="px-4 py-3.5 border-t border-premium-borderDark flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-premium-charcoal border border-premium-gold/25 flex items-center justify-center font-display font-bold text-premium-gold text-xs flex-shrink-0">
        {initials}
      </div>
      <Link href="/dashboard/account" title="Account and password" className="flex-1 min-w-0 group">
        <div className="text-[12px] font-bold text-white truncate group-hover:text-premium-gold">{user ? name : 'Signing in…'}</div>
        <div className="text-[10px] font-mono text-zinc-600 truncate">
          {user?.email ?? ''}{role ? ` · ${role}` : ''}
        </div>
      </Link>
      {showAdminLink && isPlatformAdmin(user) && (
        <Link href="/admin" title="Admin dashboard" className="text-zinc-600 hover:text-premium-gold transition-colors flex-shrink-0 scale-on-click">
          <Shield className="w-3.5 h-3.5" />
        </Link>
      )}
      <button type="button" onClick={signOut} title="Sign out" aria-label="Sign out" className="text-zinc-600 hover:text-premium-danger transition-colors flex-shrink-0 scale-on-click">
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
