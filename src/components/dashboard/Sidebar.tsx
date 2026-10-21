'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  Users,
  QrCode,
  Gift,
  Camera,
  Gamepad2,
  Percent,
  Settings,
  Palette,
  ExternalLink,
  ChevronRight,
  LogOut,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  {
    label: 'Events Overview',
    href: '/dashboard',
    icon: Calendar,
    exact: true,
  },
  {
    label: 'Event Creation',
    href: '/dashboard/events/new',
    icon: Layers,
  },
  {
    label: 'EO/WO Referrals',
    href: '/dashboard/referrals',
    icon: Percent,
    badge: '18% Cashback',
  },
  {
    label: 'Theme Presets',
    href: '/dashboard/themes',
    icon: Palette,
  },
  {
    label: 'Integrations & Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0d101a] border-r border-[#1e263d] flex flex-col justify-between hidden md:flex min-h-screen">
      <div>
        {/* Top Brand Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[#1e263d]">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00f0ff] via-[#dfb76c] to-[#ff007f] p-[2px]">
              <div className="w-full h-full bg-[#0b0d13] rounded-[6px] flex items-center justify-center font-black text-sm text-white">
                <span className="text-[#00f0ff]">4</span>
                <span className="text-[#dfb76c]">1</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-white tracking-tight leading-none">
                all<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] via-[#dfb76c] to-[#ff007f]">41</span>
              </span>
              <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest mt-0.5">Control Center</span>
            </div>
          </Link>
        </div>

        {/* Live Active Event Switcher Badge */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-[#141928] border border-[#232c44]">
          <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1 flex items-center justify-between">
            <span>Active Demo Event</span>
            <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
          </div>
          <div className="text-xs font-bold text-white truncate">TechUnite APAC Summit</div>
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <Link
              href="/events/techunite"
              target="_blank"
              className="text-[#00f0ff] hover:underline flex items-center gap-1"
            >
              <span>View Portal</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <span className="text-gray-600">|</span>
            <Link
              href="/dashboard/events/evt-techunite-2026/checkin"
              className="text-[#dfb76c] hover:underline"
            >
              QR Scanner
            </Link>
          </div>
        </div>

        {/* Main Nav Navigation */}
        <div className="px-3 py-2 space-y-1">
          <div className="text-[10px] font-mono uppercase text-gray-500 px-3 py-1 font-semibold">
            Workspace
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group',
                  isActive
                    ? 'bg-[#182035] text-white border border-[#2a375a] shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-[#131826]'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-colors',
                      isActive ? 'text-[#00f0ff]' : 'text-gray-400 group-hover:text-white'
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ff007f]/15 text-[#ff007f] font-mono border border-[#ff007f]/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Event Quick Modules Nav */}
        <div className="px-3 py-2 mt-4 space-y-1">
          <div className="text-[10px] font-mono uppercase text-gray-500 px-3 py-1 font-semibold">
            TechUnite Live Launchers
          </div>
          <Link
            href="/events/techunite/photowall/live"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#131826] transition-colors"
          >
            <Camera className="w-4 h-4 text-[#00f0ff]" />
            <span>Live Photo Wall</span>
            <ExternalLink className="w-3 h-3 ml-auto text-gray-600" />
          </Link>
          <Link
            href="/events/techunite/raffle"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#131826] transition-colors"
          >
            <Gift className="w-4 h-4 text-[#dfb76c]" />
            <span>Raffle Wheels & Claw</span>
            <ExternalLink className="w-3 h-3 ml-auto text-gray-600" />
          </Link>
          <Link
            href="/events/techunite/games"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#131826] transition-colors"
          >
            <Gamepad2 className="w-4 h-4 text-[#9d00ff]" />
            <span>Interactive Kahoot Quiz</span>
            <ExternalLink className="w-3 h-3 ml-auto text-gray-600" />
          </Link>
          <Link
            href="/dashboard/events/evt-techunite-2026/guests"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#131826] transition-colors"
          >
            <Users className="w-4 h-4 text-[#00ff88]" />
            <span>Guest List & Passports</span>
          </Link>
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-[#1e263d] bg-[#0c0e17]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#dfb76c] to-[#00f0ff] p-[1.5px] flex-shrink-0">
              <div className="w-full h-full bg-[#121624] rounded-full flex items-center justify-center font-bold text-xs text-white">
                JS
              </div>
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-white truncate">Nexus SEA Org</div>
              <div className="text-[10px] text-gray-400 truncate">Pro Organizer</div>
            </div>
          </div>
          <Link href="/" title="Exit Dashboard" className="text-gray-400 hover:text-white transition-colors p-1">
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
