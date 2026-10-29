'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Calendar,
  Settings,
  Palette,
  Layers,
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Radio,
  Gamepad2,
  Gift,
  Camera,
  BarChart3,
  Play,
  ArrowLeft,
  MessageSquare,
  ChevronRight,
  Heart,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const EVENT_NAME_MAP: Record<string, { name: string; type: 'corporate' | 'wedding' }> = {
  'evt-techunite-2026': { name: 'TechUnite APAC Summit', type: 'corporate' },
  'evt-nexus-innovation-2026': { name: 'Nexus Innovation Forum', type: 'corporate' },
  'evt-popverse-converge-2026': { name: 'POPVERSE: One Beat', type: 'corporate' },
  'evt-aria-daniel-2026': { name: 'Aria & Daniel', type: 'wedding' },
  'evt-sophia-marco-2026': { name: 'Sophia & Marco · Bali', type: 'wedding' },
};

const WORKSPACE_NAV = [
  { label: 'My Events', href: '/dashboard', icon: Calendar, exact: true },
  { label: 'New Event', href: '/dashboard/events/new', icon: Layers, badge: '+' },
  { label: 'Theme Studio', href: '/dashboard/themes', icon: Palette },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const EVENT_NAV_GROUPS = [
  {
    label: 'Build',
    items: [
      { label: 'Overview', tab: 'overview', icon: LayoutDashboard },
      { label: 'Design Studio', tab: 'design', icon: Palette },
    ],
  },
  {
    label: 'Audience',
    items: [
      { label: 'Guests', tab: 'guests', icon: Users },
      { label: 'Registrations', tab: 'registrations', icon: ClipboardCheck, badge: '2' },
      { label: 'Broadcast', tab: 'broadcast', icon: Radio },
    ],
  },
  {
    label: 'Day Of',
    items: [
      { label: 'Games', tab: 'games', icon: Gamepad2 },
      { label: 'Door Prize', tab: 'doorprize', icon: Gift },
      { label: 'Photo Wall', tab: 'photos', icon: Camera },
      { label: 'Comments', tab: 'comments', icon: MessageSquare },
    ],
  },
  {
    label: 'Results',
    items: [
      { label: 'Insights', tab: 'insights', icon: BarChart3 },
    ],
  },
];

const ALL_EVENT_TABS = EVENT_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.tab));
const STORAGE_KEY = (id: string) => `all41-mods-${id}`;

function readEnabledTabs(eventId: string): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(eventId));
    if (raw) return JSON.parse(raw) as string[];
  } catch {}
  return ALL_EVENT_TABS;
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';

  const isInsideEvent =
    pathname.startsWith('/dashboard/events/') && pathname !== '/dashboard/events/new';
  const eventIdMatch = pathname.match(/\/dashboard\/events\/([^/?]+)/);
  const currentEventId = eventIdMatch ? eventIdMatch[1] : '';

  const eventMeta = EVENT_NAME_MAP[currentEventId];
  const isWedding = eventMeta?.type === 'wedding' || currentEventId.includes('wedding');

  const [enabledTabs, setEnabledTabs] = useState<string[]>(ALL_EVENT_TABS);

  useEffect(() => {
    if (!isInsideEvent || !currentEventId) return;
    setEnabledTabs(readEnabledTabs(currentEventId));
    const handler = () => setEnabledTabs(readEnabledTabs(currentEventId));
    window.addEventListener('all41-modules-changed', handler);
    return () => window.removeEventListener('all41-modules-changed', handler);
  }, [isInsideEvent, currentEventId]);

  return (
    <aside className="w-64 flex-shrink-0 bg-premium-black border-r border-premium-borderDark flex flex-col hidden md:flex min-h-screen select-none font-sans">
      {/* Brand */}
      <Link
        href="/"
        className="flex items-center gap-3 px-5 h-16 border-b border-premium-borderDark flex-shrink-0 group"
      >
        <div className="w-8 h-8 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-base shadow-gold group-hover:scale-105 transition-transform">
          41
        </div>
        <div>
          <div className="font-display font-bold text-[17px] text-white tracking-tight leading-none">all41</div>
          <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mt-0.5">Event Platform</div>
        </div>
      </Link>

      <div className="flex-1 overflow-y-auto py-4">
        {isInsideEvent ? (
          <div className="space-y-1">
            {/* Event context pill */}
            <div className="px-3 mb-5">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-400 font-mono mb-3 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                All Events
              </Link>
              <div className="p-3.5 rounded-2xl bg-premium-charcoal border border-premium-borderDark">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isWedding ? 'bg-premium-danger/15' : 'bg-premium-neon/15'}`}>
                    {isWedding
                      ? <Heart className="w-3 h-3 text-premium-danger" />
                      : <Building2 className="w-3 h-3 text-premium-neon" />
                    }
                  </div>
                  <span className="w-2 h-2 rounded-full bg-premium-success shadow-[0_0_6px_#00E676] animate-pulse flex-shrink-0 mt-1" />
                </div>
                <div className="text-[13px] font-display font-bold text-white leading-tight">
                  {eventMeta?.name || currentEventId}
                </div>
                <div className="text-[10px] font-mono text-premium-neon mt-1 truncate">
                  {currentEventId.replace('evt-', '').replace('-2026', '')}.all41.app
                </div>
              </div>
            </div>

            {/* Grouped navigation */}
            {EVENT_NAV_GROUPS.map((group) => {
              const visibleItems = group.items.filter(
                (item) => enabledTabs.includes(item.tab) || item.tab === 'overview'
              );
              if (visibleItems.length === 0) return null;
              return (
                <div key={group.label} className="px-3 mb-1">
                  <div className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.22em] px-2 py-2">
                    {group.label}
                  </div>
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.tab;
                      return (
                        <Link
                          key={item.tab}
                          href={`/dashboard/events/${currentEventId}?tab=${item.tab}`}
                          className={cn(
                            'flex items-center justify-between px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all',
                            isActive
                              ? 'bg-white/[0.06] text-white'
                              : 'text-zinc-500 hover:text-white hover:bg-white/[0.03]'
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', isActive ? 'text-premium-gold' : 'text-zinc-600')} />
                            <span>{item.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {'badge' in item && item.badge && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-premium-danger/20 text-premium-danger font-bold border border-premium-danger/20">
                                {item.badge}
                              </span>
                            )}
                            {isActive && <ChevronRight className="w-3 h-3 text-zinc-600" />}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* LIVE + Settings at the bottom */}
            <div className="px-3 pt-2 mt-2 border-t border-premium-borderDark/60">
              <div className="space-y-0.5">
                <Link
                  href={`/dashboard/events/${currentEventId}?tab=live`}
                  className={cn(
                    'flex items-center justify-between px-2.5 py-2.5 rounded-xl text-[13px] font-medium transition-all',
                    currentTab === 'live'
                      ? 'bg-premium-neon/10 text-white border border-premium-neon/20'
                      : 'text-zinc-500 hover:text-white hover:bg-white/[0.03]'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Play className={cn('w-3.5 h-3.5', currentTab === 'live' ? 'text-premium-neon' : 'text-zinc-600')} />
                    <span>LIVE Launchers</span>
                  </div>
                  <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-premium-success/15 text-premium-success font-bold border border-premium-success/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-premium-success animate-pulse" />
                    ON
                  </span>
                </Link>
                <Link
                  href={`/dashboard/events/${currentEventId}?tab=setting`}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all',
                    currentTab === 'setting'
                      ? 'bg-white/[0.06] text-white'
                      : 'text-zinc-500 hover:text-white hover:bg-white/[0.03]'
                  )}
                >
                  <Settings className={cn('w-3.5 h-3.5', currentTab === 'setting' ? 'text-premium-gold' : 'text-zinc-600')} />
                  <span>Settings</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Workspace nav */
          <div className="px-3 space-y-0.5">
            <div className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.22em] px-2 py-2">
              Workspace
            </div>
            {WORKSPACE_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-between px-2.5 py-2.5 rounded-xl text-[13px] font-medium transition-all',
                    isActive
                      ? 'bg-white/[0.06] text-white'
                      : 'text-zinc-500 hover:text-white hover:bg-white/[0.03]'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-premium-gold' : 'text-zinc-600')} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] w-5 h-5 flex items-center justify-center rounded-full bg-premium-gold text-black font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* User footer */}
      <div className="px-4 py-3.5 border-t border-premium-borderDark flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-premium-charcoal border border-premium-gold/25 flex items-center justify-center font-display font-bold text-premium-gold text-xs flex-shrink-0">
          AD
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-bold text-white truncate">Admin Organizer</div>
          <div className="text-[10px] font-mono text-zinc-600 truncate">andrewsus83@all41.app</div>
        </div>
        <Link href="/dashboard/settings" className="text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0">
          <Settings className="w-3.5 h-3.5" />
        </Link>
      </div>
    </aside>
  );
}
