import type { User } from '@supabase/supabase-js';

/** Who may open /admin. Mirrors public.a41_platform_admins, which the database checks on every admin call. */
export const PLATFORM_ADMINS = ['andrewsus83@gmail.com'];

export type AppRole = 'organizer' | 'admin';

export function isPlatformAdmin(user: Pick<User, 'email'> | null | undefined): boolean {
  return !!user?.email && PLATFORM_ADMINS.includes(user.email.toLowerCase());
}

/** Accounts are shared with other Day One Project apps; only those given a role (or platform admins) use this dashboard. */
export function appRole(user: Pick<User, 'email' | 'app_metadata'> | null | undefined): AppRole | null {
  if (!user) return null;
  const role = user.app_metadata?.a41_role;
  if (role === 'organizer' || role === 'admin') return role;
  return isPlatformAdmin(user) ? 'admin' : null;
}

export function displayName(user: Pick<User, 'email' | 'user_metadata'> | null | undefined): string {
  const name = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : '';
  return name || user?.email?.split('@')[0] || 'Organizer';
}
