import type { User } from '@supabase/supabase-js';

/**
 * The platform admin's email, for labels and menus only. Real platform-admin rights come from the database
 * (public.a41_whoami().isAdmin): the email must be in public.a41_platform_admins AND the session must have been
 * opened with the authenticator. The proxy, /admin and the edge functions all check that, never this list.
 */
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

/** Cosmetic only (labels, menus): see PLATFORM_ADMINS. */
export function isPlatformAdmin(user: Pick<User, 'email'> | null | undefined): boolean {
  return !!user?.email && PLATFORM_ADMINS.includes(user.email.toLowerCase());
}

/** The role granted in app_metadata, without the platform-admin fallback. */
export function assignedRole(user: Pick<User, 'app_metadata'> | null | undefined): AppRole | null {
  const role = user?.app_metadata?.a41_role;
  return role === 'organizer' || role === 'admin' || role === 'desk' ? role : null;
}

/** Accounts are shared with other Day One Project apps; only those given a role (or platform admins) use this app. */
export function appRole(user: Pick<User, 'email' | 'app_metadata'> | null | undefined): AppRole | null {
  if (!user) return null;
  return assignedRole(user) ?? (isPlatformAdmin(user) ? 'admin' : null);
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
