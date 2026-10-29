'use client';

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
  Zap,
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

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';

  const isInsideEvent =
    pathname.startsWith('/dashboard/events/') && pathname !== '/dashboard/events/new';
  const eventIdMatch = pathname.match(/\/dashboard\/events\/([^/?]+)/);
  const currentEventId = eventIdMatch ? eventIdMatch[1] : 'evt-techunite-2026';
  const isWedding =
    currentEventId.includes('wedding') || currentEventId.includes('aria-daniel');

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
                    {isWedding ? 'Aria & Daniel Wedding' : 'TechUnite APAC Summit'}
                  </div>
                  <div className="text-[11px] font-mono text-premium-neon mt-0.5 truncate">
                    {isWedding ? 'aria-daniel.all41.app' : 'techunite.all41.app'}
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
              {EVENT_MENU_ITEMS.map((item) => {
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
            {/* Active demo event card */}
            <div className="mx-4 mb-5 p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Active</span>
                <span className="w-2 h-2 rounded-full bg-premium-success shadow-[0_0_8px_#00E676] animate-pulse" />
              </div>
              <Link
                href="/dashboard/events/evt-techunite-2026?tab=overview"
                className="text-[13px] font-display font-bold text-white hover:text-premium-gold transition-colors block truncate"
              >
                TechUnite APAC Summit
              </Link>
              <div className="mt-2.5 flex items-center gap-3 text-[11px]">
                <Link
                  href="/dashboard/events/evt-techunite-2026?tab=overview"
                  className="text-premium-gold hover:underline font-medium"
                >
                  Manage
                </Link>
                <span className="text-zinc-700">·</span>
                <Link
                  href="/events/techunite"
                  target="_blank"
                  className="text-premium-neon hover:underline flex items-center gap-1 font-medium"
                >
                  Guest Portal
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

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

            {/* Live screens rail */}
            <div className="px-3 mt-6 space-y-0.5">
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-3 py-2 flex items-center justify-between">
                <span>Live Screens</span>
                <span className="w-1.5 h-1.5 rounded-full bg-premium-success animate-pulse" />
              </div>
              {[
                { href: '/events/techunite/stage', label: 'Stage LED', color: 'text-premium-gold' },
                { href: '/events/techunite/photowall/live', label: 'Live Photo Wall', color: 'text-premium-neon' },
                { href: '/events/techunite/raffle', label: '3D Raffle Stage', color: 'text-premium-gold' },
              ].map(({ href, label, color }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium text-zinc-400 hover:text-white hover:bg-premium-surfaceDark transition-all scale-on-click group"
                >
                  <div className="flex items-center gap-3">
                    <Zap className={cn('w-4 h-4 flex-shrink-0', color)} />
                    <span>{label}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </a>
              ))}
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
