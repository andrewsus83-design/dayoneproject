'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Briefcase, Building2, Check, Copy, KeyRound, Loader2, LogIn, Plus, RefreshCw, ScanLine, UserMinus, Users, X } from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { teamApi, TEAM_ROLE_LABELS, type Team, type TeamMember } from '@/lib/teamApi';
import { generatePassword } from '@/lib/adminApi';
import { useSessionUser } from '@/lib/useSession';
import { APP_HOST } from '@/lib/domain';

const input =
  'w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-premium-gold placeholder:text-zinc-600';
const label = 'text-[10px] font-mono uppercase tracking-widest text-zinc-500';
const quietButton =
  'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-[11px] font-bold text-zinc-300 hover:text-white hover:border-zinc-600 scale-on-click disabled:opacity-50';

const LOGIN_URL = `${APP_HOST}/login`;

const ROLE_STYLE: Record<TeamMember['role'], string> = {
  owner: 'bg-premium-gold/15 text-premium-gold border-premium-gold/30',
  organizer: 'bg-premium-neon/10 text-premium-neon border-premium-neon/25',
  desk: 'bg-premium-success/10 text-premium-success border-premium-success/25',
};

function lastSeen(iso: string | null) {
  return iso
    ? `Last signed in ${new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
    : 'Has not signed in yet';
}

type NewPerson = { name: string; email: string; role: 'organizer' | 'desk'; code: string };
const blankPerson = (): NewPerson => ({ name: '', email: '', role: 'organizer', code: generatePassword(10) });

/** What to tell the new person (the access code is shown only once). */
type Handover = { email: string; role: 'organizer' | 'desk'; code: string | null; welcomeSent?: boolean };

export default function TeamSettingsPage() {
  const { user } = useSessionUser();
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [adding, setAdding] = useState(false);
  const [person, setPerson] = useState<NewPerson>(blankPerson);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [handover, setHandover] = useState<Handover | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await teamApi.get();
      setTeam(next);
      setOrgName(next.org.name);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your team.');
    }
  }, []);

  useEffect(() => {
    // Loads once on open; setState happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    }
  };

  const saveName = () =>
    run(async () => {
      setSavingName(true);
      try {
        await teamApi.rename(orgName.trim());
        await load();
      } finally {
        setSavingName(false);
      }
    });

  const addPerson = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      setSaving(true);
      try {
        const email = person.email.trim().toLowerCase();
        const desk = person.role === 'desk';
        const res = await teamApi.add({ email, name: person.name.trim(), role: person.role, code: desk ? person.code : undefined });
        setHandover({ email, role: person.role, code: desk ? person.code : null, welcomeSent: res.welcomeSent });
        setPerson(blankPerson());
        setAdding(false);
        await load();
      } finally {
        setSaving(false);
      }
    });
  };

  const remove = (m: TeamMember) => {
    if (!confirm(`Remove ${m.name || m.email} from your team? They will no longer see your events.`)) return;
    run(async () => {
      setBusyId(m.id);
      try {
        await teamApi.remove(m.id);
        await load();
      } finally {
        setBusyId(null);
      }
    });
  };

  const newCode = (m: TeamMember) => {
    if (!confirm(`Make a new access code for ${m.email}? The old code stops working.`)) return;
    run(async () => {
      setBusyId(m.id);
      try {
        const code = generatePassword(10);
        await teamApi.resetCode(m.id, code);
        setHandover({ email: m.email, role: 'desk', code });
        await load();
      } finally {
        setBusyId(null);
      }
    });
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const canManage = !!team?.canManage;
  /** Admin organizers can manage the register desk too. */
  const canManageDesk = canManage || !!team?.canManageDesk;

  return (
    <div className="flex-1 flex flex-col font-sans">
      <Header title="Settings" subtitle="Your organization and the people who run your events" />

      <div className="p-6 sm:p-8 space-y-6 max-w-4xl w-full">
        {error && (
          <div className="p-4 rounded-2xl bg-premium-danger/10 border border-premium-danger/40 text-premium-danger text-sm font-bold flex items-start justify-between gap-3">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="scale-on-click" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {!team && !error && (
          <div className="p-10 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark flex items-center justify-center gap-3 text-sm text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin text-premium-gold" /> Loading your team…
          </div>
        )}

        {team && (
          <>
            {/* Organization */}
            <section className="p-6 sm:p-8 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-premium-gold/15 text-premium-gold flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-bold text-white">Organization</h2>
                  <p className="text-xs text-zinc-500">Everyone on your team sees and runs this organization&apos;s events.</p>
                </div>
              </div>
              {canManage ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <input value={orgName} onChange={(e) => setOrgName(e.target.value)} maxLength={120} placeholder="Organization name" className={input} />
                  <button
                    type="button"
                    onClick={saveName}
                    disabled={savingName || !orgName.trim() || orgName.trim() === team.org.name}
                    className="px-6 py-3 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
                  </button>
                </div>
              ) : (
                <div className="px-4 py-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-sm text-white font-bold">{team.org.name}</div>
              )}
            </section>

            {/* Handover after adding someone */}
            {handover && (
              <section className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-gold/50 shadow-gold space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-base font-display font-bold text-white">
                      {handover.code ? 'Give this access code to the register desk' : `${handover.email} can sign in now`}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {handover.code ? (
                        <>
                          They open <span className="font-mono text-premium-neon">{LOGIN_URL}</span>, choose <strong className="text-white">Register desk</strong>, and enter{' '}
                          <span className="font-mono text-white">{handover.email}</span> with this code. It is shown only once.
                        </>
                      ) : (
                        <>
                          {handover.welcomeSent
                            ? 'We emailed them a welcome message with the sign-in link. '
                            : "We couldn't email them a welcome message, so let them know: "}
                          they open <span className="font-mono text-premium-neon">{LOGIN_URL}</span>, choose <strong className="text-white">Organizer</strong>, and enter their email.
                          A 6-digit sign-in code is emailed to them each time.
                        </>
                      )}
                    </p>
                  </div>
                  <button type="button" onClick={() => setHandover(null)} className="text-zinc-500 hover:text-white scale-on-click" aria-label="Close">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {handover.code && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 px-4 py-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark font-mono text-lg tracking-widest text-premium-gold text-center">
                      {handover.code}
                    </div>
                    <button type="button" onClick={() => copy(handover.code!)} className={quietButton}>
                      {copied ? <Check className="w-3.5 h-3.5 text-premium-success" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Team */}
            <section className="p-6 sm:p-8 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-premium-neon/10 text-premium-neon flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-white">Team</h2>
                    <p className="text-xs text-zinc-500">{team.members.length} {team.members.length === 1 ? 'person' : 'people'}</p>
                  </div>
                </div>
                {canManageDesk && !adding && (
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(true);
                      setHandover(null);
                      if (!canManage) setPerson((p) => ({ ...p, role: 'desk' }));
                    }}
                    className="px-5 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> {canManage ? 'Add person' : 'Add register desk'}
                  </button>
                )}
              </div>

              {!canManage && (
                <p className="text-xs text-zinc-500 px-4 py-3 rounded-xl bg-premium-surfaceDark border border-premium-borderDark">
                  {canManageDesk
                    ? 'You can add and remove register desk staff. Only the account owner can add or remove admin organizers.'
                    : 'Only the account owner can add or remove people.'}
                </p>
              )}

              {adding && (
                <form onSubmit={addPerson} className="p-5 rounded-2xl bg-premium-surfaceDark border border-premium-gold/40 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      { role: 'organizer', icon: Briefcase, title: 'Admin organizer', desc: 'Creates and runs events. Signs in with a code sent to their email.' },
                      { role: 'desk', icon: ScanLine, title: 'Register desk', desc: 'Checks guests in at the door. Signs in with email and an access code.' },
                    ] as const).filter(({ role }) => canManage || role === 'desk').map(({ role, icon: Icon, title, desc }) => {
                      const active = person.role === role;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setPerson((p) => ({ ...p, role }))}
                          className={`p-4 rounded-2xl border text-left scale-on-click transition-all ${active ? 'border-premium-gold bg-premium-charcoal shadow-gold' : 'border-premium-borderDark hover:border-zinc-600'}`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${active ? 'text-premium-gold' : 'text-zinc-500'}`} />
                            <span className={`text-sm font-display font-bold ${active ? 'text-white' : 'text-zinc-300'}`}>{title}</span>
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">{desc}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block space-y-1.5">
                      <span className={label}>Name</span>
                      <input value={person.name} onChange={(e) => setPerson((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" className={input} />
                    </label>
                    <label className="block space-y-1.5">
                      <span className={label}>Email</span>
                      <input
                        type="email"
                        required
                        value={person.email}
                        onChange={(e) => setPerson((p) => ({ ...p, email: e.target.value }))}
                        placeholder={person.role === 'desk' ? 'desk1@yourcompany.com' : 'name@yourcompany.com'}
                        className={input}
                      />
                    </label>
                  </div>

                  {person.role === 'desk' && (
                    <label className="block space-y-1.5">
                      <span className={label}>Access code</span>
                      <div className="flex gap-2">
                        <input
                          required
                          minLength={8}
                          value={person.code}
                          onChange={(e) => setPerson((p) => ({ ...p, code: e.target.value.trim() }))}
                          className={`${input} font-mono tracking-widest`}
                        />
                        <button type="button" onClick={() => setPerson((p) => ({ ...p, code: generatePassword(10) }))} className={quietButton} title="Make a new code">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-500">Use a separate email for each desk. You&apos;ll see this code once after saving.</p>
                    </label>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button type="button" onClick={() => { setAdding(false); setPerson(blankPerson()); }} className={quietButton}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-sm shadow-gold scale-on-click disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add to team
                    </button>
                  </div>
                </form>
              )}

              <div className="divide-y divide-premium-borderDark rounded-2xl border border-premium-borderDark overflow-hidden">
                {team.members.map((m) => {
                  const isMe = m.id === user?.id;
                  return (
                    <div key={m.id} className="flex flex-wrap items-center gap-3 p-4 bg-premium-surfaceDark/40">
                      <div className="w-9 h-9 rounded-full bg-premium-charcoal border border-premium-borderDark flex items-center justify-center text-xs font-bold text-zinc-300 flex-shrink-0">
                        {(m.name || m.email)[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-[180px]">
                        <div className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                          {m.name || m.email}
                          {isMe && <span className="text-[10px] font-mono text-zinc-500">(you)</span>}
                          {m.disabled && <span className="text-[10px] font-bold text-premium-danger">Switched off</span>}
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate">
                          {m.name ? <span className="font-mono">{m.email}</span> : null}
                          {m.name ? ' · ' : ''}
                          {lastSeen(m.lastSignInAt)}
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${ROLE_STYLE[m.role]}`}>
                        {TEAM_ROLE_LABELS[m.role]}
                      </span>
                      {m.role !== 'owner' && !isMe && (canManage || (canManageDesk && m.role === 'desk')) && (
                        <div className="flex items-center gap-2">
                          {m.role === 'desk' && (
                            <button type="button" onClick={() => newCode(m)} disabled={busyId === m.id} className={quietButton}>
                              <KeyRound className="w-3.5 h-3.5" /> New code
                            </button>
                          )}
                          <button type="button" onClick={() => remove(m)} disabled={busyId === m.id} className={`${quietButton} hover:text-premium-danger hover:border-premium-danger/40`}>
                            {busyId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />} Remove
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* How people sign in */}
            <section className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex gap-3">
                <LogIn className="w-4 h-4 text-premium-gold flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-white">Admin organizers</div>
                  <p className="text-zinc-400 leading-relaxed">
                    Sign in at <span className="font-mono text-premium-neon">{LOGIN_URL}</span> → Organizer, with a code emailed to them. They can create and run events.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <ScanLine className="w-4 h-4 text-premium-success flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-white">Register desk</div>
                  <p className="text-zinc-400 leading-relaxed">
                    Sign in at <span className="font-mono text-premium-neon">{LOGIN_URL}</span> → Register desk, with their email and access code. They only see check-in.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
