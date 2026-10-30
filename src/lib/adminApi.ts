'use client';

import { createClient } from '@/lib/supabase/client';
import type { AppRole } from '@/lib/auth';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AppRole | null;
  createdAt: string;
  lastSignInAt: string | null;
  disabled: boolean;
}

export interface AdminEvent {
  id: string;
  name: string;
  slug: string;
  type: 'corporate' | 'wedding';
  status: 'draft' | 'published' | 'archived';
  package: string;
  starts_at: string;
  ends_at: string;
  org_name: string;
  owner_email: string | null;
  guests: number;
  created_at: string;
}

export interface AdminKey {
  name: string;
  hint: string;
  description: string;
  updated_at: string;
}

/** Calls the a41-admin edge function as the signed-in admin. */
async function usersFn<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await createClient().functions.invoke('a41-admin', { body });
  if (error) {
    // Edge function errors carry a JSON body with a readable message.
    const ctx = (error as { context?: Response }).context;
    const detail = ctx ? await ctx.json().catch(() => null) : null;
    throw new Error(detail?.error ?? error.message);
  }
  return data as T;
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await createClient().rpc(fn, args);
  if (error) throw new Error(error.details || error.message);
  return data as T;
}

export const adminApi = {
  listUsers: () => usersFn<{ users: AdminUser[] }>({ action: 'list' }).then((r) => r.users),
  /** password is the access code for register-desk accounts; leave empty for organizers and admins. */
  createUser: (input: { email: string; name: string; role: AppRole; password: string }) =>
    usersFn<{ user: AdminUser; existing: boolean; welcomeSent?: boolean }>({ action: 'create', ...input }),
  updateUser: (id: string, patch: { role?: AppRole | null; name?: string; password?: string; disabled?: boolean }) =>
    usersFn<{ user: AdminUser }>({ action: 'update', id, ...patch }).then((r) => r.user),

  listEvents: () => rpc<AdminEvent[]>('a41_admin_events'),
  updateEvent: (id: string, patch: { package?: string; status?: string }) =>
    rpc<void>('a41_admin_update_event', { p_event: id, p_package: patch.package ?? null, p_status: patch.status ?? null }),

  listKeys: () => rpc<AdminKey[]>('a41_admin_list_keys'),
  setKey: (name: string, value: string, description = '') => rpc<void>('a41_admin_set_key', { p_name: name, p_value: value, p_description: description }),
  deleteKey: (name: string) => rpc<void>('a41_admin_delete_key', { p_name: name }),
};

/** A readable random password for new accounts (no look-alike characters). */
export function generatePassword(length = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}
