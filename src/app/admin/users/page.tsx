'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Loader2, Plus, RefreshCw, ShieldCheck, UserMinus, UserX, Users } from 'lucide-react';
import { adminApi, generatePassword, type AdminUser } from '@/lib/adminApi';
import { ROLE_LABELS, type AppRole } from '@/lib/auth';

const input = 'w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2.5 rounded-xl text-sm outline-none focus:border-premium-gold placeholder:text-zinc-600';

function when(iso: string | null) {
  return iso ? new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never';
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'organizer' as AppRole, password: generatePassword(10) });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ email: string; role: AppRole; code: string | null; existing: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [resetFor, setResetFor] = useState<{ id: string; password: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await adminApi.listUsers());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load users.');
    }
  }, []);

  useEffect(() => {
    // Loads once on open; setState happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const desk = form.role === 'desk';
      const res = await adminApi.createUser({ ...form, email: form.email.trim().toLowerCase(), password: desk ? form.password : '' });
      setCreated({ email: res.user.email, role: form.role, code: desk && !res.existing ? form.password : null, existing: res.existing });
      setForm({ name: '', email: '', role: 'organizer', password: generatePassword(10) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the user.');
    } finally {
      setCreating(false);
    }
  };

  const act = async (id: string, patch: Parameters<typeof adminApi.updateUser>[1], confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    setBusyId(id);
    setError(null);
    try {
      await adminApi.updateUser(id, patch);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the user.');
    } finally {
      setBusyId(null);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="p-6 sm:p-10 space-y-8 max-w-6xl w-full mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3"><Users className="w-7 h-7 text-premium-gold" /> Users</h1>
          <p className="text-sm text-zinc-400 mt-1">Organizers and admins sign in with a code sent to their email. Register desk staff sign in with their email and an access code you generate here.</p>
        </div>
        <button type="button" onClick={load} className="px-4 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-300 hover:text-white text-xs font-bold scale-on-click flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-sm font-bold">{error}</div>}

      <form onSubmit={create} className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
        <h2 className="font-display font-bold text-white text-lg">Add a user</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Name</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Organizer" className={input} />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Email (their username)</span>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@company.com" className={input} />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Role</span>
            <div className="flex gap-1 bg-premium-surfaceDark p-1 rounded-xl border border-premium-borderDark">
              {(['organizer', 'admin', 'desk'] as const).map((r) => (
                <button key={r} type="button" onClick={() => setForm({ ...form, role: r })} className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold scale-on-click ${form.role === r ? 'bg-premium-gold text-black shadow-gold' : 'text-zinc-400 hover:text-white'}`}>
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </label>
          {form.role === 'desk' ? (
            <label className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Access code (generated)</span>
              <div className="flex gap-2">
                <input required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={`${input} font-mono`} />
                <button type="button" onClick={() => setForm({ ...form, password: generatePassword(10) })} title="New code" className="px-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 hover:text-white scale-on-click">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </label>
          ) : (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Sign-in</span>
              <p className="text-xs text-zinc-400 bg-premium-surfaceDark border border-premium-borderDark rounded-xl px-3 py-2.5">A one-time code is emailed each time they sign in. No password.</p>
            </div>
          )}
        </div>
        <p className="text-[11px] text-zinc-500">Organizers and admins create and run events; register desk staff only open the check-in desk. Only you can open this admin area. An email that already has a Day One Project account simply gets access.</p>
        <button type="submit" disabled={creating} className="px-5 py-3 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click flex items-center gap-2 disabled:opacity-60">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create account
        </button>

        {created && (
          <div className="p-4 rounded-2xl bg-premium-success/10 border border-premium-success/30 text-sm space-y-2">
            <div className="font-bold text-premium-success flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Account ready</div>
            {created.code ? (
              <>
                <p className="text-zinc-300">Send these to the desk staff privately. The access code is shown only once.</p>
                <div className="font-mono text-white bg-premium-black/60 rounded-xl px-3 py-2">app.dayoneproject.xyz/login · Register desk · {created.email} · {created.code}</div>
                <button type="button" onClick={() => copy(`Register desk sign-in: https://app.dayoneproject.xyz/login?as=desk\nEmail: ${created.email}\nAccess code: ${created.code}`)} className="text-xs font-bold text-premium-gold flex items-center gap-1.5">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy sign-in details'}
                </button>
              </>
            ) : (
              <>
                <p className="text-zinc-300">{created.existing ? `${created.email} already had a Day One Project account and now has access.` : `${created.email} is ready.`} They sign in at app.dayoneproject.xyz/login with a code sent to their email.</p>
                <button type="button" onClick={() => copy(`Sign in at https://app.dayoneproject.xyz/login with your email (${created.email}). We'll email you a one-time code.`)} className="text-xs font-bold text-premium-gold flex items-center gap-1.5">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy invite message'}
                </button>
              </>
            )}
          </div>
        )}
      </form>

      <div className="rounded-[2rem] bg-premium-charcoal border border-premium-borderDark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-premium-black text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="text-left p-4 pl-6">User</th>
                <th className="text-left p-4">Role</th>
                <th className="text-left p-4">Last sign-in</th>
                <th className="text-left p-4">Status</th>
                <th className="text-right p-4 pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-premium-borderDark/60">
              {users === null && !error && (
                <tr><td colSpan={5} className="p-6 text-center text-zinc-500"><Loader2 className="w-4 h-4 animate-spin inline" /> Loading…</td></tr>
              )}
              {users?.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-zinc-500">No users yet.</td></tr>}
              {users?.map((u) => (
                <React.Fragment key={u.id}>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-4 pl-6">
                      <div className="font-bold text-white">{u.name || u.email.split('@')[0]}</div>
                      <div className="text-xs text-zinc-500 font-mono">{u.email}</div>
                    </td>
                    <td className="p-4">
                      {u.role === 'desk' ? (
                        <span className="px-2 py-1 rounded-lg text-xs font-bold text-premium-neon border border-premium-neon/30">{ROLE_LABELS.desk}</span>
                      ) : (
                        <select
                          value={u.role ?? ''}
                          disabled={busyId === u.id}
                          onChange={(e) => act(u.id, { role: (e.target.value || null) as AppRole | null })}
                          className="bg-premium-surfaceDark border border-premium-borderDark text-white px-2 py-1.5 rounded-lg text-xs outline-none"
                        >
                          <option value="organizer">Organizer</option>
                          <option value="admin">Admin</option>
                          {!u.role && <option value="">No access</option>}
                        </select>
                      )}
                    </td>
                    <td className="p-4 text-xs text-zinc-400">{when(u.lastSignInAt)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${u.disabled ? 'bg-premium-danger/15 text-premium-danger border-premium-danger/30' : 'bg-premium-success/15 text-premium-success border-premium-success/30'}`}>
                        {u.disabled ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4 pr-6">
                      <div className="flex items-center justify-end gap-2">
                        {busyId === u.id && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
                        {u.role === 'desk' && (
                          <button type="button" title="New access code" onClick={() => setResetFor({ id: u.id, password: generatePassword(10) })} className="p-2 rounded-lg border border-premium-borderDark text-zinc-400 hover:text-white scale-on-click"><KeyRound className="w-3.5 h-3.5" /></button>
                        )}
                        <button type="button" title={u.disabled ? 'Enable account' : 'Disable account'} onClick={() => act(u.id, { disabled: !u.disabled }, u.disabled ? undefined : `Disable ${u.email}? They will be signed out of everything.`)} className="p-2 rounded-lg border border-premium-borderDark text-zinc-400 hover:text-premium-danger scale-on-click"><UserX className="w-3.5 h-3.5" /></button>
                        <button type="button" title="Remove event-platform access (keeps the account)" onClick={() => act(u.id, { role: null }, `Remove ${u.email}'s access to the event dashboard? Their account is kept.`)} className="p-2 rounded-lg border border-premium-borderDark text-zinc-400 hover:text-premium-danger scale-on-click"><UserMinus className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                  {resetFor?.id === u.id && (
                    <tr className="bg-premium-surfaceDark/60">
                      <td colSpan={5} className="p-4 pl-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-zinc-400">New access code for {u.email}:</span>
                          <input value={resetFor.password} onChange={(e) => setResetFor({ ...resetFor, password: e.target.value })} className={`${input} font-mono max-w-xs`} />
                          <button type="button" onClick={async () => { await act(u.id, { password: resetFor.password }); copy(resetFor.password); setResetFor(null); }} className="px-4 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black text-xs font-bold scale-on-click">Save & copy</button>
                          <button type="button" onClick={() => setResetFor(null)} className="px-3 py-2.5 rounded-xl text-zinc-500 hover:text-white text-xs font-bold">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
