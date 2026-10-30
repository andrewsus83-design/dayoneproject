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

/** The server opens authenticator sessions itself (so it can mark them as platform-admin sessions). */
type ServerSession = { accessToken: string; refreshToken: string } | { tokenHash: string };

/** Adopts a session the server already opened. (`tokenHash` is the older a41-auth reply, kept for the deploy window.) */
async function openSession(session: ServerSession) {
  const supabase = createClient();
  const { error } = 'accessToken' in session
    ? await supabase.auth.setSession({ access_token: session.accessToken, refresh_token: session.refreshToken })
    : await supabase.auth.verifyOtp({ token_hash: session.tokenHash, type: 'magiclink' });
  if (error) throw new Error('Could not start your session. Try again.');
}

export const authApi = {
  /** Organizers/admins: email our own 6-digit code (sent through Resend). The reply is the same whether or not the email has an account. */
  sendEmailCode: (email: string) => call<{ ok: true; message?: string }>({ action: 'email-code', email }),
  /** The server checks the code and opens the session. */
  verifyEmailCode: async (email: string, code: string) => {
    await openSession(await call<ServerSession>({ action: 'email-verify', email, code }));
  },

  /** Register desk: email + access code (the desk account's password). */
  deskSignIn: async (email: string, accessCode: string) => {
    const { error } = await createClient().auth.signInWithPassword({ email, password: accessCode });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Wrong email or access code.' : error.message);
  },

  /** Platform owner: email + authenticator app code. */
  authenticatorSignIn: async (email: string, code: string) => {
    await openSession(await call<ServerSession>({ action: 'totp-login', email, code }));
  },
  /** First authenticator, proven with the one-time setup code kept in Supabase Vault. */
  bootstrapStart: (email: string, setupCode: string) => call<{ secret: string; uri: string }>({ action: 'totp-bootstrap-start', email, setupCode }),
  bootstrapFinish: async (email: string, setupCode: string, code: string) => {
    await openSession(await call<ServerSession>({ action: 'totp-bootstrap-finish', email, setupCode, code }));
  },

  /** Owner signed in with their authenticator: replace the authenticator. */
  authenticatorStatus: () => call<{ enabled: boolean }>({ action: 'totp-status' }),
  authenticatorSetup: () => call<{ secret: string; uri: string }>({ action: 'totp-setup' }),
  authenticatorConfirm: (code: string) => call<{ ok: true }>({ action: 'totp-confirm', code }),
};
