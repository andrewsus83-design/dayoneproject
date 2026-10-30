'use client';

import React, { useCallback, useState } from 'react';
import { Building2, Check, Loader2, X } from 'lucide-react';
import { Header } from '@/components/dashboard/Header';
import { TeamMembers } from '@/components/dashboard/TeamMembers';
import { teamApi, type Team } from '@/lib/teamApi';

const input =
  'w-full bg-premium-surfaceDark border border-premium-borderDark text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-premium-gold placeholder:text-zinc-600';

export default function TeamSettingsPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const onTeam = useCallback((next: Team) => {
    setTeam(next);
    setOrgName(next.org.name);
  }, []);

  const saveName = async () => {
    if (!team) return;
    setError(null);
    setSavingName(true);
    try {
      const name = orgName.trim();
      await teamApi.rename(name);
      setTeam({ ...team, org: { ...team.org, name } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setSavingName(false);
    }
  };

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

        {/* Organization */}
        {team && (
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
            {team.canManage ? (
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
        )}

        <TeamMembers roles={['organizer', 'screen', 'desk']} onTeam={onTeam} />
      </div>
    </div>
  );
}
