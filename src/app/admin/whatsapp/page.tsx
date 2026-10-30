'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Building2, CheckCircle2, Clock, KeyRound, Loader2, Mail, MessageSquare, RefreshCw, Save, Send, Smartphone, XCircle } from 'lucide-react';
import { whatsappApi, WA_PER_MINUTE, type WaDevice, type WaOverview, type WaRecent } from '@/lib/whatsappApi';
import { EMAIL_PER_MINUTE, sendAdminApi, type ChannelUsage, type OrgUsage, type SendOverview } from '@/lib/emailApi';

const input = 'w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-3 py-2.5 rounded-xl text-sm outline-none focus:border-premium-gold placeholder:text-zinc-600';

function when(iso: string | null) {
  return iso ? new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
}

const STATUS: Record<WaRecent['status'], { label: string; className: string; icon: typeof Clock }> = {
  queued: { label: 'Waiting', className: 'text-premium-gold border-premium-gold/30 bg-premium-gold/10', icon: Clock },
  sending: { label: 'Sending', className: 'text-premium-neon border-premium-neon/30 bg-premium-neon/10', icon: Loader2 },
  sent: { label: 'Sent', className: 'text-premium-success border-premium-success/30 bg-premium-success/10', icon: CheckCircle2 },
  failed: { label: 'Failed', className: 'text-premium-danger border-premium-danger/30 bg-premium-danger/10', icon: XCircle },
  cancelled: { label: 'Stopped', className: 'text-zinc-400 border-premium-borderDark bg-premium-surfaceDark', icon: XCircle },
};

function Usage({ u }: { u: ChannelUsage }) {
  const share = u.limit > 0 ? u.used / u.limit : 1;
  return (
    <div className="min-w-[120px]">
      <div className="font-mono text-white">
        {u.used.toLocaleString()} <span className="text-zinc-500">/ {u.limit.toLocaleString()}</span>
      </div>
      <div className="mt-1 h-1 rounded-full bg-premium-black overflow-hidden">
        <div className={`h-full ${share >= 0.9 ? 'bg-premium-danger' : 'bg-premium-gold'}`} style={{ width: `${Math.min(100, share * 100)}%` }} />
      </div>
      <div className="text-[10px] text-zinc-500 mt-1">
        {u.sent} sent · {u.waiting} waiting{u.failed ? <span className="text-premium-danger"> · {u.failed} failed</span> : null}
      </div>
    </div>
  );
}

/** One organization's use today, with its daily limits (platform admin can raise or lower them). */
function OrgRow({ org, onSaved }: { org: OrgUsage; onSaved: () => void }) {
  const [wa, setWa] = useState(String(org.whatsapp.limit));
  const [email, setEmail] = useState(String(org.email.limit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = Number(wa) !== org.whatsapp.limit || Number(email) !== org.email.limit;
  const limitInput = 'w-24 bg-premium-surfaceDark border border-premium-borderDark text-white px-2 py-1.5 rounded-lg text-xs font-mono outline-none focus:border-premium-gold';

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await sendAdminApi.setLimits(org.id, { whatsapp: Number(wa), email: Number(email) });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td className="px-6 py-3">
        <div className="text-white font-bold">{org.name}</div>
        <div className="text-[10px] text-zinc-500">{org.owner ?? '—'}</div>
      </td>
      <td className="px-6 py-3"><Usage u={org.whatsapp} /></td>
      <td className="px-6 py-3"><Usage u={org.email} /></td>
      <td className="px-6 py-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="flex items-center gap-1 text-[10px] text-zinc-500">
            <MessageSquare className="w-3 h-3" />
            <input value={wa} onChange={(e) => setWa(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" aria-label={`WhatsApp messages a day for ${org.name}`} className={limitInput} />
          </label>
          <label className="flex items-center gap-1 text-[10px] text-zinc-500">
            <Mail className="w-3 h-3" />
            <input value={email} onChange={(e) => setEmail(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" aria-label={`Emails a day for ${org.name}`} className={limitInput} />
          </label>
          <button
            type="button"
            onClick={save}
            disabled={!changed || saving || wa === '' || email === ''}
            className="px-3 py-1.5 rounded-lg bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-[11px] shadow-gold scale-on-click disabled:opacity-40 flex items-center gap-1"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
          </button>
        </div>
        {error && <div className="text-[10px] text-premium-danger text-right mt-1">{error}</div>}
      </td>
    </tr>
  );
}

export default function AdminWhatsAppPage() {
  const [data, setData] = useState<{ configured: boolean; device: WaDevice | null; overview: WaOverview } | null>(null);
  const [sending, setSending] = useState<SendOverview | null>(null);
  const [sendingError, setSendingError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [nudging, setNudging] = useState(false);

  /** Organizations' use and the email queue come straight from the database. */
  const loadSending = useCallback(async () => {
    try {
      setSending(await sendAdminApi.overview());
      setSendingError(null);
    } catch (e) {
      setSendingError(e instanceof Error ? e.message : 'Could not load usage.');
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const usage = loadSending();
    try {
      setData(await whatsappApi.device());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load WhatsApp status.');
    } finally {
      await usage;
      setLoading(false);
    }
  }, [loadSending]);

  useEffect(() => {
    // Loads once on open; setState happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const sendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);
    try {
      await whatsappApi.test(phone.trim());
      setTestResult({ ok: true, text: 'Test message sent. Check that phone’s WhatsApp.' });
    } catch (err) {
      setTestResult({ ok: false, text: err instanceof Error ? err.message : 'Could not send the test.' });
    } finally {
      setTesting(false);
    }
  };

  /** Starts a sending run now instead of waiting for the next minute. */
  const nudge = async () => {
    setNudging(true);
    try {
      const r = await whatsappApi.runNow();
      if (r.halted === 'not_configured') setError('Add FONNTE_TOKEN in API keys first.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start sending.');
    } finally {
      setNudging(false);
    }
  };

  const ov = data?.overview;
  const device = data?.device;
  const paused = !!ov?.pausedUntil;

  return (
    <div className="p-6 sm:p-10 space-y-8 max-w-6xl w-full mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
            <MessageSquare className="w-7 h-7 text-premium-gold" /> WhatsApp &amp; email
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Organizers’ WhatsApp broadcasts go out from this number one at a time, 5–15 seconds apart (about {WA_PER_MINUTE} a minute), to keep it safe from bans; emails go out through Resend at about {EMAIL_PER_MINUTE} a minute.
            Organizations take turns, and each has a daily limit. Organizers never see these settings.
          </p>
        </div>
        <button type="button" onClick={load} className="px-4 py-2.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-300 hover:text-white text-xs font-bold scale-on-click flex items-center gap-1.5">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-sm font-bold">{error}</div>}

      {!data && !error && (
        <div className="p-10 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark flex items-center justify-center gap-3 text-sm text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin text-premium-gold" /> Checking the WhatsApp number…
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Number */}
            <section className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
              <h2 className="font-display font-bold text-white text-lg flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-premium-gold" /> Sending number
              </h2>
              {!data.configured ? (
                <div className="space-y-3 text-sm text-zinc-300">
                  <p>No Fonnte token yet, so nothing can be sent. Organizers see “WhatsApp sending is not switched on yet”.</p>
                  <Link href="/admin/keys" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-xs shadow-gold scale-on-click">
                    <KeyRound className="w-3.5 h-3.5" /> Add FONNTE_TOKEN in API keys
                  </Link>
                </div>
              ) : device?.ok ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    ['Number', device.number || '—'],
                    ['Status', device.connected ? 'Connected' : 'Disconnected'],
                    ['Quota left', String(device.quota ?? '—')],
                    ['Package', device.package || '—'],
                    ['Name', device.name || '—'],
                    ['Expires', device.expires || '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="p-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{k}</div>
                      <div className={`mt-1 font-bold ${k === 'Status' ? (device.connected ? 'text-premium-success' : 'text-premium-danger') : 'text-white'} ${k === 'Number' ? 'font-mono' : ''}`}>{v}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-premium-danger font-bold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> Fonnte refused the token: {device?.reason ?? 'unknown reason'}. Check FONNTE_TOKEN in API keys.
                </p>
              )}

              {data.configured && (
                <form onSubmit={sendTest} className="pt-3 border-t border-premium-borderDark space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Send a test message</span>
                  <div className="flex gap-2">
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" placeholder="0812 3456 7890" className={`${input} font-mono`} />
                    <button type="submit" disabled={testing} className="px-4 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-xs shadow-gold scale-on-click disabled:opacity-60 flex items-center gap-1.5">
                      {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send
                    </button>
                  </div>
                  {testResult && <p className={`text-xs font-bold ${testResult.ok ? 'text-premium-success' : 'text-premium-danger'}`}>{testResult.text}</p>}
                </form>
              )}
            </section>

            {/* Queue */}
            <section className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display font-bold text-white text-lg flex items-center gap-2">
                  <Clock className="w-4 h-4 text-premium-gold" /> Queue
                </h2>
                {ov && ov.waiting > 0 && !paused && (
                  <button type="button" onClick={nudge} disabled={nudging} className="px-3 py-1.5 rounded-lg bg-premium-surfaceDark border border-premium-borderDark text-zinc-300 hover:text-white text-[11px] font-bold scale-on-click flex items-center gap-1.5">
                    {nudging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Send now
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['Waiting', ov?.waiting ?? 0, 'text-white'],
                  ['Sent (24 h)', ov?.sentToday ?? 0, 'text-premium-success'],
                  ['Failed (24 h)', ov?.failedToday ?? 0, (ov?.failedToday ?? 0) > 0 ? 'text-premium-danger' : 'text-white'],
                ].map(([label, value, color]) => (
                  <div key={label as string} className="p-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-center">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</div>
                    <div className={`text-2xl font-display font-bold mt-1 ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
              {ov && ov.waiting > 0 && !paused && (
                <p className="text-xs text-zinc-400">At about {WA_PER_MINUTE} a minute, the queue is empty in about {Math.max(1, Math.ceil(ov.waiting / WA_PER_MINUTE))} min.</p>
              )}
              {paused && (
                <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-xs text-premium-danger space-y-1">
                  <div className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Sending paused until {when(ov!.pausedUntil)}</div>
                  <div>Fonnte said: {ov!.note}. Fix the number or token; waiting messages are kept and go out after the pause.</div>
                </div>
              )}
              <p className="text-[11px] text-zinc-500">Last message sent: {when(ov?.lastSentAt ?? null)}</p>
            </section>
          </div>

          {/* Recent */}
          <section className="rounded-[2rem] bg-premium-charcoal border border-premium-borderDark overflow-hidden">
            <div className="px-6 py-4 border-b border-premium-borderDark flex items-center justify-between">
              <h2 className="font-display font-bold text-white text-lg">Recent messages</h2>
              <span className="text-[11px] font-mono text-zinc-500">Last 30</span>
            </div>
            {ov && ov.recent.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-premium-black text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                    <tr>
                      <th className="px-6 py-3">Event</th>
                      <th className="px-6 py-3">Guest</th>
                      <th className="px-6 py-3">Message</th>
                      <th className="px-6 py-3">Queued</th>
                      <th className="px-6 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-premium-borderDark">
                    {ov.recent.map((m) => {
                      const s = STATUS[m.status];
                      return (
                        <tr key={m.id}>
                          <td className="px-6 py-3 text-white font-bold">{m.event}</td>
                          <td className="px-6 py-3">
                            <div className="text-white">{m.to_name || '—'}</div>
                            <div className="text-[10px] font-mono text-zinc-500">…{m.phone_end}</div>
                          </td>
                          <td className="px-6 py-3 text-zinc-400">{m.label || '—'}</td>
                          <td className="px-6 py-3 text-zinc-500 font-mono">{when(m.created_at)}</td>
                          <td className="px-6 py-3 text-right">
                            <span title={m.error ?? undefined} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${s.className}`}>
                              <s.icon className={`w-3 h-3 ${m.status === 'sending' ? 'animate-spin' : ''}`} /> {s.label}
                            </span>
                            {m.status === 'failed' && m.error && <div className="text-[10px] text-zinc-500 mt-1">{m.error}</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-6 py-8 text-sm text-zinc-500">No WhatsApp messages yet. They appear here when an organizer uses “Send to everyone” in Broadcast.</p>
            )}
          </section>
        </>
      )}

      {sendingError && <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-sm font-bold">{sendingError}</div>}

      {sending && (
        <>
          {/* Organizations */}
          <section className="rounded-[2rem] bg-premium-charcoal border border-premium-borderDark overflow-hidden">
            <div className="px-6 py-4 border-b border-premium-borderDark flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display font-bold text-white text-lg flex items-center gap-2">
                <Building2 className="w-4 h-4 text-premium-gold" /> Organizations, last 24 hours
              </h2>
              <span className="text-[11px] text-zinc-500">Daily limit per organization, counted in messages. Default {sending.defaultLimit.toLocaleString()} each.</span>
            </div>
            {sending.orgs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-premium-black text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                    <tr>
                      <th className="px-6 py-3">Organization</th>
                      <th className="px-6 py-3">WhatsApp</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3 text-right">Daily limits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-premium-borderDark">
                    {sending.orgs.map((o) => (
                      <OrgRow key={`${o.id}:${o.whatsapp.limit}:${o.email.limit}`} org={o} onSaved={loadSending} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-6 py-8 text-sm text-zinc-500">No organizations yet.</p>
            )}
          </section>

          {/* Email */}
          <section className="rounded-[2rem] bg-premium-charcoal border border-premium-borderDark overflow-hidden">
            <div className="px-6 py-4 border-b border-premium-borderDark flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display font-bold text-white text-lg flex items-center gap-2">
                <Mail className="w-4 h-4 text-premium-gold" /> Email queue
              </h2>
              <span className="text-[11px] text-zinc-500">Last sent: {when(sending.email.lastSentAt)}</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['Waiting', sending.email.waiting, 'text-white'],
                  ['Sent (24 h)', sending.email.sentToday, 'text-premium-success'],
                  ['Failed (24 h)', sending.email.failedToday, sending.email.failedToday > 0 ? 'text-premium-danger' : 'text-white'],
                ].map(([label, value, color]) => (
                  <div key={label as string} className="p-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-center">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</div>
                    <div className={`text-2xl font-display font-bold mt-1 ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
              {sending.email.pausedUntil && (
                <div className="p-3 rounded-xl bg-premium-danger/10 border border-premium-danger/40 text-xs text-premium-danger space-y-1">
                  <div className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Email sending paused until {when(sending.email.pausedUntil)}</div>
                  <div>Resend said: {sending.email.note}. Check RESEND_API_KEY / RESEND_FROM in API keys; waiting emails are kept and go out after the pause.</div>
                </div>
              )}
            </div>
            {sending.email.recent.length > 0 ? (
              <div className="overflow-x-auto border-t border-premium-borderDark">
                <table className="w-full text-left text-xs">
                  <thead className="bg-premium-black text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                    <tr>
                      <th className="px-6 py-3">Event</th>
                      <th className="px-6 py-3">Guest</th>
                      <th className="px-6 py-3">Message</th>
                      <th className="px-6 py-3">Queued</th>
                      <th className="px-6 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-premium-borderDark">
                    {sending.email.recent.map((m) => {
                      const s = STATUS[m.status];
                      return (
                        <tr key={m.id}>
                          <td className="px-6 py-3 text-white font-bold">{m.event}</td>
                          <td className="px-6 py-3">
                            <div className="text-white">{m.to_name || '—'}</div>
                            <div className="text-[10px] font-mono text-zinc-500">{m.email_hint}</div>
                          </td>
                          <td className="px-6 py-3 text-zinc-400">{m.label || '—'}</td>
                          <td className="px-6 py-3 text-zinc-500 font-mono">{when(m.created_at)}</td>
                          <td className="px-6 py-3 text-right">
                            <span title={m.error ?? undefined} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${s.className}`}>
                              <s.icon className={`w-3 h-3 ${m.status === 'sending' ? 'animate-spin' : ''}`} /> {s.label}
                            </span>
                            {m.status === 'failed' && m.error && <div className="text-[10px] text-zinc-500 mt-1">{m.error}</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-6 py-8 text-sm text-zinc-500 border-t border-premium-borderDark">No emails yet. They appear here when an organizer uses “Send to everyone by email” in Broadcast.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
