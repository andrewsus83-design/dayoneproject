'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, Lock, Save, Trash2 } from 'lucide-react';
import { adminApi, type AdminKey } from '@/lib/adminApi';

const PRESETS = [
  { name: 'RESEND_API_KEY', desc: 'Email sending (invitations, passes, reminders)' },
  { name: 'FONNTE_TOKEN', desc: 'WhatsApp sending through Fonnte' },
  { name: 'OPENAI_API_KEY', desc: 'AI features' },
  { name: 'ANTHROPIC_API_KEY', desc: 'AI features' },
  { name: 'R2_ACCESS_KEY_ID', desc: 'Cloudflare R2 photo storage' },
  { name: 'R2_SECRET_ACCESS_KEY', desc: 'Cloudflare R2 photo storage' },
];

const input = 'w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2.5 rounded-xl text-sm outline-none focus:border-premium-gold placeholder:text-zinc-600';

export default function AdminKeysPage() {
  const [keys, setKeys] = useState<AdminKey[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: 'RESEND_API_KEY', value: '', description: PRESETS[0].desc });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setKeys(await adminApi.listKeys());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load keys.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.setKey(form.name, form.value.trim(), form.description);
      setSaved(form.name.toUpperCase());
      setForm({ ...form, value: '' });
      await load();
      setTimeout(() => setSaved(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the key.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (name: string) => {
    if (!confirm(`Delete ${name}? Features that use it stop working until you add it again.`)) return;
    try {
      await adminApi.deleteKey(name);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the key.');
    }
  };

  return (
    <div className="p-6 sm:p-10 space-y-8 max-w-5xl w-full mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3"><KeyRound className="w-7 h-7 text-premium-gold" /> API Keys</h1>
        <p className="text-sm text-zinc-400 mt-1 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Stored encrypted in the database vault. After saving, only the last 4 characters are ever shown.</p>
      </div>

      {error && <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-sm font-bold">{error}</div>}

      <form onSubmit={save} className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
        <h2 className="font-display font-bold text-white text-lg">Add or replace a key</h2>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.name} type="button" onClick={() => setForm({ ...form, name: p.name, description: p.desc })} className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold scale-on-click ${form.name === p.name ? 'bg-premium-gold/15 text-premium-gold border border-premium-gold/40' : 'text-zinc-500 border border-premium-borderDark hover:text-white'}`}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Name</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })} className={`${input} font-mono`} />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Value</span>
            <input required type="password" autoComplete="off" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Paste the key" className={`${input} font-mono`} />
          </label>
          <label className="space-y-1.5 md:col-span-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">What it&apos;s for</span>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={input} />
          </label>
        </div>
        <button type="submit" disabled={saving || !form.value} className="px-5 py-3 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click flex items-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save key
        </button>
        {saved && <p className="text-xs font-bold text-premium-success">{saved} saved.</p>}
      </form>

      <div className="rounded-[2rem] bg-premium-charcoal border border-premium-borderDark overflow-hidden divide-y divide-premium-borderDark/60">
        {keys === null && !error && <div className="p-6 text-center text-zinc-500 text-sm"><Loader2 className="w-4 h-4 animate-spin inline" /> Loading…</div>}
        {keys?.length === 0 && <div className="p-6 text-center text-zinc-500 text-sm">No keys stored yet.</div>}
        {keys?.map((k) => (
          <div key={k.name} className="flex items-center gap-4 px-6 py-4">
            <KeyRound className="w-4 h-4 text-premium-gold shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-mono font-bold text-white text-sm">{k.name}</div>
              <div className="text-xs text-zinc-500 truncate">{k.description || '—'} · updated {new Date(k.updated_at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <span className="font-mono text-xs text-zinc-400">{k.hint}</span>
            <button type="button" onClick={() => setForm({ name: k.name, value: '', description: k.description })} className="px-3 py-1.5 rounded-lg border border-premium-borderDark text-xs font-bold text-zinc-300 hover:text-white scale-on-click">Replace</button>
            <button type="button" onClick={() => remove(k.name)} className="p-2 rounded-lg border border-premium-borderDark text-zinc-500 hover:text-premium-danger scale-on-click" aria-label={`Delete ${k.name}`}><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
