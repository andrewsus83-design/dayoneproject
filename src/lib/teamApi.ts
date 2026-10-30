'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * owner = the account owner (created the organization); organizer = admin organizer; screen = screen manager
 * (only switches the stage screen); desk = register desk.
 */
export type TeamRole = 'owner' | 'organizer' | 'screen' | 'desk';

/** The roles an admin organizer can give. Screen managers and the register desk sign in with an access code. */
export type NewTeamRole = 'organizer' | 'screen' | 'desk';

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: TeamRole;
  lastSignInAt: string | null;
  disabled: boolean;
}

export interface Team {
  org: { id: string; name: string };
  /** Only the account owner can remove admin organizers and rename the organization. */
  canManage: boolean;
  /** Every admin organizer can add all three roles and remove or re-code screen managers and the register desk. */
  canManageStaff?: boolean;
  members: TeamMember[];
}

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Account owner',
  organizer: 'Admin organizer',
  screen: 'Screen manager',
  desk: 'Register desk',
};

/** Screen managers and the register desk sign in with an access code instead of an emailed code. */
export const usesAccessCode = (role: TeamRole) => role === 'screen' || role === 'desk';

/** Calls the a41-team edge function as the signed-in organizer. */
async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await createClient().functions.invoke('a41-team', { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const detail = ctx ? await ctx.json().catch(() => null) : null;
    throw new Error(detail?.error ?? error.message);
  }
  return data as T;
}

export const teamApi = {
  get: () => call<Team>({ action: 'list' }),
  rename: (name: string) => call<{ ok: true }>({ action: 'rename', name }),
  /**
   * code is the access code for a screen manager or the register desk; admin organizers sign in with an emailed
   * code instead. welcomeSent: an admin organizer was emailed a welcome message with the sign-in link.
   */
  add: (input: { email: string; name: string; role: NewTeamRole; code?: string }) =>
    call<{ ok: true; welcomeSent?: boolean }>({ action: 'add', ...input }),
  remove: (id: string) => call<{ ok: true }>({ action: 'remove', id }),
  resetCode: (id: string, code: string) => call<{ ok: true }>({ action: 'reset-code', id, code }),
};
