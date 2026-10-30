import type { User } from '@supabase/supabase-js';

/** Who may open /admin. Mirrors public.a41_platform_admins, which the database checks on every admin call. */
export const PLATFORM_ADMINS = ['andrewsus83@gmail.com'];

/**
 * organizer / admin: run events, sign in with a code sent to their email.
 * desk: register-desk staff, sign in with email + an access code from the admin.
 */
export type AppRole = 'organizer' | 'admin' | 'desk';

export const ROLE_LABELS: Record<AppRole, string> = {
  organizer: 'Organizer',
  admin: 'Admin',
  desk: 'Register desk',
};

export function isPlatformAdmin(user: Pick<User, 'email'> | null | undefined): boolean {
  return !!user?.email && PLATFORM_ADMINS.includes(user.email.toLowerCase());
}

/** Accounts are shared with other Day One Project apps; only those given a role (or platform admins) use this app. */
export function appRole(user: Pick<User, 'email' | 'app_metadata'> | null | undefined): AppRole | null {
  if (!user) return null;
  const role = user.app_metadata?.a41_role;
  if (role === 'organizer' || role === 'admin' || role === 'desk') return role;
  return isPlatformAdmin(user) ? 'admin' : null;
}

/** Organizers and admins run events in the dashboard; desk staff only use the register desk. */
export function canUseDashboard(user: Pick<User, 'email' | 'app_metadata'> | null | undefined): boolean {
  const role = appRole(user);
  return role === 'organizer' || role === 'admin';
}

export function displayName(user: Pick<User, 'email' | 'user_metadata'> | null | undefined): string {
  const name = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : '';
  return name || user?.email?.split('@')[0] || 'Organizer';
}
