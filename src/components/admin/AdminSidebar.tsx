'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield,
  BarChart3,
  Wallet,
  MessageSquare,
  HardDrive,
  Calendar,
  Layers,
  ArrowLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ADMIN_NAV = [
  {
    label: 'Platform Overview',
    href: '/admin',
    icon: BarChart3,
    exact: true,
  },
  {
    label: 'Referral Payouts',
    href: '/admin/payouts',
    icon: Wallet,
    badge: '3 Pending',
  },
  {
    label: 'WhatsApp Queue & Pacing',
    href: '/admin/whatsapp',
    icon: MessageSquare,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 bg-[#090b12] border-r border-[#241a38] flex flex-col justify-between hidden md:flex min-h-screen">
      <div>
        {/* Top Header */}
        <div className="h-16 flex items-center px-6 border-b border-[#241a38]">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9d00ff] via-[#dfb76c] to-[#00f0ff] p-[2px]">
              <div className="w-full h-full bg-[#0b0d13] rounded-[6px] flex items-center justify-center font-black text-sm text-[#dfb76c]">
                <Shield className="w-4 h-4 text-[#dfb76c]" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-white tracking-tight leading-none">
                all<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#dfb76c] to-[#9d00ff]">41</span>
              </span>
              <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest mt-0.5">Platform Superadmin</span>
            </div>
          </Link>
        </div>

        {/* System Health Badge */}
        <div className="p-3.5 mx-3 my-3 rounded-xl bg-[#161224] border border-[#2d1f47]">
          <div className="text-[10px] font-mono uppercase tracking-wider text-purple-300 mb-1 flex items-center justify-between">
            <span>Core Edge Services</span>
            <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
          </div>
          <div className="text-xs font-bold text-white">All Systems Operational</div>
          <div className="text-[10px] text-gray-400 mt-1 font-mono">
            Vercel • Supabase • Cloudflare R2
          </div>
        </div>

        {/* Navigation Items */}
        <div className="px-3 py-2 space-y-1">
          <div className="text-[10px] font-mono uppercase text-gray-500 px-3 py-1 font-semibold">
            Superadmin Controls
          </div>
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group',
                  isActive
                    ? 'bg-[#201538] text-white border border-[#40286b] shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-[#140e24]'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-colors',
                      isActive ? 'text-[#dfb76c]' : 'text-gray-400 group-hover:text-white'
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#dfb76c]/15 text-[#dfb76c] font-mono border border-[#dfb76c]/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Back to Client Dashboard */}
        <div className="px-3 py-4 mt-4 border-t border-[#1e1530]">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#140e24] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Client Organizer Portal</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#140e24] transition-colors"
          >
            <Layers className="w-4 h-4" />
            <span>Marketing Website</span>
          </Link>
        </div>
      </div>

      {/* Admin User Footer */}
      <div className="p-4 border-t border-[#241a38] bg-[#07080f]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#dfb76c] to-[#9d00ff] p-[1.5px] flex-shrink-0">
              <div className="w-full h-full bg-[#120e20] rounded-full flex items-center justify-center font-bold text-xs text-[#dfb76c]">
                SA
              </div>
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-white truncate">Platform Root</div>
              <div className="text-[10px] text-purple-400 font-mono">admin@all41.app</div>
            </div>
          </div>
          <Link href="/dashboard" title="Exit Superadmin" className="text-gray-400 hover:text-white p-1">
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
