'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Calendar,
  Users,
  Gift,
  Camera,
  Gamepad2,
  Settings,
  Palette,
  ExternalLink,
  Layers,
  LayoutDashboard,
  ClipboardCheck,
  Radio,
  BarChart3,
  Play,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const WORKSPACE_NAV_ITEMS = [
  { label: 'My Events', href: '/dashboard', icon: Calendar, exact: true },
  { label: 'Create Event', href: '/dashboard/events/new', icon: Layers, badge: 'NEW' },
  { label: 'Theme Presets', href: '/dashboard/themes', icon: Palette },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const EVENT_MENU_ITEMS = [
  { label: 'Overview', tab: 'overview', icon: LayoutDashboard },
  { label: 'Guests', tab: 'guests', icon: Users },
  { label: 'Registrations', tab: 'registrations', icon: ClipboardCheck },
  { label: 'Broadcast', tab: 'broadcast', icon: Radio },
  { label: 'Games', tab: 'games', icon: Gamepad2 },
  { label: 'Door Prize', tab: 'doorprize', icon: Gift },
  { label: 'Photos', tab: 'photos', icon: Camera },
  { label: 'Insights', tab: 'insights', icon: BarChart3 },
  { label: 'LIVE', tab: 'live', icon: Play, isLive: true },
  { label: 'Setting', tab: 'setting', icon: Settings },
];

const ALL_EVENT_TABS = EVENT_MENU_ITEMS.map((i) => i.tab);
const ALWAYS_ON = new Set(['overview', 'setting']);
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
  const isWedding = currentEventId.includes('wedding');

  const [enabledTabs, setEnabledTabs] = useState<string[]>(ALL_EVENT_TABS);

  useEffect(() => {
    if (!isInsideEvent || !currentEventId) return;
    setEnabledTabs(readEnabledTabs(currentEventId));
    const handler = () => setEnabledTabs(readEnabledTabs(currentEventId));
    window.addEventListener('all41-modules-changed', handler);
    return () => window.removeEventListener('all41-modules-changed', handler);
  }, [isInsideEvent, currentEventId]);

  const visibleEventItems = EVENT_MENU_ITEMS.filter(
    (item) => ALWAYS_ON.has(item.tab) || enabledTabs.includes(item.tab)
  );

  return (
    <aside className="w-72 flex-shrink-0 bg-premium-black border-r border-premium-borderDark flex flex-col justify-between hidden md:flex min-h-screen select-none font-sans">
      <div className="flex-1 overflow-y-auto">
        {/* Brand */}
        <div className="h-20 flex items-center px-6 border-b border-premium-borderDark">
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="w-9 h-9 bg-premium-gold rounded-full flex items-center justify-center text-premium-black font-display font-bold text-lg shadow-gold scale-on-click transition-transform group-hover:scale-105">
              41
            </div>
            <div>
              <div className="font-display font-bold text-xl text-white tracking-tight leading-none">
                all41
              </div>
              <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.18em] mt-0.5">
                Event Platform
              </div>
            </div>
          </Link>
        </div>

        {isInsideEvent ? (
          /* ── Event Command Navigation ── */
          <div className="py-4">
            {/* Active event context */}
            <div className="mx-4 mb-4 p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 font-mono uppercase tracking-wider mb-2.5 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                All Events
              </Link>

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-display font-bold text-white truncate">
                    {currentEventId || 'Event'}
                  </div>
                  <div className="text-[11px] font-mono text-premium-neon mt-0.5 truncate">
                    {currentEventId ? `${currentEventId}.all41.app` : 'all41.app'}
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-premium-success shadow-[0_0_8px_#00E676] animate-pulse flex-shrink-0 mt-1" />
              </div>
            </div>

            {/* 10-menu command items */}
            <div className="px-3 space-y-0.5">
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-3 py-2">
                Event Command
              </div>
              {visibleEventItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === `/dashboard/events/${currentEventId}` &&
                  currentTab === item.tab;

                return (
                  <Link
                    key={item.tab}
                    href={`/dashboard/events/${currentEventId}?tab=${item.tab}`}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all scale-on-click',
                      isActive
                        ? 'bg-premium-gold/10 text-white border border-premium-gold/25'
                        : 'text-zinc-400 hover:text-white hover:bg-premium-surfaceDark'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          'w-4 h-4 flex-shrink-0 transition-colors',
                          isActive ? 'text-premium-gold' : item.isLive ? 'text-premium-neon' : 'text-zinc-500'
                        )}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.isLive && (
                      <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-premium-success/15 text-premium-success font-bold font-mono border border-premium-success/25">
                        <span className="w-1 h-1 rounded-full bg-premium-success animate-ping" />
                        ON
                      </span>
                    )}
                    {isActive && !item.isLive && (
                      <ChevronRight className="w-3.5 h-3.5 text-premium-gold" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Workspace Navigation ── */
          <div className="py-4">
            {/* Main workspace nav */}
            <div className="px-3 space-y-0.5">
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-3 py-2">
                Workspace
              </div>
              {WORKSPACE_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all scale-on-click',
                      isActive
                        ? 'bg-premium-gold/10 text-white border border-premium-gold/25'
                        : 'text-zinc-400 hover:text-white hover:bg-premium-surfaceDark'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          'w-4 h-4 flex-shrink-0 transition-colors',
                          isActive ? 'text-premium-gold' : 'text-zinc-500'
                        )}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-premium-gold/15 text-premium-gold font-bold border border-premium-gold/25">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Empty state prompt */}
            <div className="mx-4 mt-6 p-4 rounded-2xl border border-dashed border-premium-borderDark text-center">
              <p className="text-[11px] text-zinc-600 font-light">No active events yet.</p>
              <Link
                href="/dashboard/events/new"
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-premium-gold hover:underline font-medium"
              >
                Create your first event
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Profile footer */}
      <div className="p-4 border-t border-premium-borderDark">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-premium-charcoal border border-premium-gold/30 flex items-center justify-center font-display font-bold text-premium-gold text-xs flex-shrink-0">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-white leading-tight">Admin Organizer</div>
            <div className="text-[10px] font-mono text-zinc-500 truncate">andrewsus83@all41.app</div>
          </div>
          <Link href="/dashboard/settings" className="text-zinc-500 hover:text-zinc-300 scale-on-click transition-colors flex-shrink-0">
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
