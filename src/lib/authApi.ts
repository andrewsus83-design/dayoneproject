'use client';

import { createClient } from '@/lib/supabase/client';

/** Calls the a41-auth edge function; throws its readable error message. */
async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await createClient().functions.invoke('a41-auth', { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const detail = ctx ? await ctx.json().catch(() => null) : null;
    throw new Error(detail?.error ?? error.message);
  }
  return data as T;
}

/** Finishes a sign-in that the server already approved. */
async function openSession(tokenHash: string) {
  const { error } = await createClient().auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  if (error) throw new Error('Could not start your session. Try again.');
}

export const authApi = {
  /** Organizers/admins: email a 6-digit code (sent through Resend). */
  sendEmailCode: (email: string) => call<{ ok: true }>({ action: 'email-code', email }),
  verifyEmailCode: async (email: string, code: string) => {
    const { error } = await createClient().auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) throw new Error('That code is wrong or has expired.');
  },

  /** Register desk: email + access code (the desk account's password). */
  deskSignIn: async (email: string, accessCode: string) => {
    const { error } = await createClient().auth.signInWithPassword({ email, password: accessCode });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Wrong email or access code.' : error.message);
  },

  /** Platform owner: email + authenticator app code. */
  authenticatorSignIn: async (email: string, code: string) => {
    const { tokenHash } = await call<{ tokenHash: string }>({ action: 'totp-login', email, code });
    await openSession(tokenHash);
  },
  /** First authenticator, proven with the one-time setup code kept in Supabase Vault. */
  bootstrapStart: (email: string, setupCode: string) => call<{ secret: string; uri: string }>({ action: 'totp-bootstrap-start', email, setupCode }),
  bootstrapFinish: async (email: string, setupCode: string, code: string) => {
    const { tokenHash } = await call<{ tokenHash: string }>({ action: 'totp-bootstrap-finish', email, setupCode, code });
    await openSession(tokenHash);
  },

  /** Signed-in owner: replace the authenticator. */
  authenticatorStatus: () => call<{ enabled: boolean }>({ action: 'totp-status' }),
  authenticatorSetup: () => call<{ secret: string; uri: string }>({ action: 'totp-setup' }),
  authenticatorConfirm: (code: string) => call<{ ok: true }>({ action: 'totp-confirm', code }),
};
